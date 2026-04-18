import { useEffect, useRef, useState } from 'react';
import * as Blockly from 'blockly/core';
import 'blockly/blocks';
import * as PtBr from 'blockly/msg/pt-br';
import { ProjectService }  from '../services/projectService';
import { HardwareService } from '../services/hardwareService';
import { BoardSelectionModal } from '../components/modals/BoardSelectionModal';
import { UploadModal, UploadStage } from '../components/modals/UploadModal';
import { OrphanModal }     from '../components/modals/OrphanModal';
import { SerialMonitor, SerialMessage } from '../components/modals/SerialMonitor';
import { ErrorModal, FriendlyError, getFriendlyError } from '../components/modals/ErrorModal';
import { FlashModal }      from '../components/modals/FlashModal';
import LZString from 'lz-string';

import { BoardKey, BOARD_UNSET, BOARDS } from '../blockly/blocks';
import { BLOCK_NAMES, toolboxConfig }    from '../blockly/toolbox';

// Logo: referenciar asset copiado
// import logoSimples from '../assets/LogoSimples.png';

Blockly.setLocale(PtBr as unknown as Record<string, string>);

function BoardBadge({ boardKey }: { boardKey: BoardKey }) {
  const colorMap: Record<BoardKey, string> = { uno: '#0984e3', nano: '#ff00d0', esp32: '#e17055' };
  const color = colorMap[boardKey];
  return (
    <div className="board-badge" style={{ background: `${color}15`, border: `2px solid ${color}55`, color }}>
      <span className="board-badge-dot" style={{ background: color }} />
      {BOARDS[boardKey].name}
    </div>
  );
}

interface IdeScreenProps {
  role: 'student' | 'teacher' | 'visitor';
  readOnly?: boolean;
  onBack: () => void;
  projectId?: string;
}

type BoardLoadState = 'resolving' | 'selecting' | 'ready' | 'error';

const TOP_LEVEL_BLOCK_TYPES = new Set([
  'bloco_setup', 'bloco_loop', 'declarar_variavel_global', 'definir_funcao', 'definir_funcao_retorno',
]);

export function IdeScreen({ role, readOnly = false, onBack, projectId }: IdeScreenProps) {
  const blocklyDiv = useRef<HTMLDivElement>(null);
  const workspace  = useRef<Blockly.WorkspaceSvg | null>(null);
  const codeGeneratorRef = useRef<((ws: Blockly.WorkspaceSvg) => string) | null>(null);

  const [board, setBoard]                   = useState<BoardKey | null>(null);
  const [boardLoadState, setBoardLoadState] = useState<BoardLoadState>(projectId ? 'resolving' : 'selecting');
  const pendingWorkspaceData = useRef<unknown>(null);

  const [port, setPort]               = useState('');
  const [availablePorts, setAvailablePorts] = useState<string[]>([]);
  const [generatedCode, setGeneratedCode]   = useState('// O código C++ aparecerá aqui...');
  const [isSaving, setIsSaving]             = useState(false);
  const [projectName, setProjectName]       = useState('Projeto');
  const [saveStatus, setSaveStatus]         = useState<'success' | 'error' | null>(null);
  const [isSerialOpen, setIsSerialOpen]     = useState(false);
  const [serialMessages, setSerialMessages] = useState<SerialMessage[]>([]);
  const [isDirty, setIsDirty]               = useState(false);
  const [showExitConfirm, setShowExitConfirm] = useState(false);
  const trackChanges = useRef(false);
  const [isCodeVisible, setIsCodeVisible]   = useState(false);
  const [isFullscreenCode, setIsFullscreenCode] = useState(false);
  const [uploadStage, setUploadStage]       = useState<UploadStage | null>(null);
  const [orphanWarning, setOrphanWarning]   = useState<string[]>([]);
  const isUploadingRef = useRef(false);
  const [friendlyError, setFriendlyError]   = useState<FriendlyError | null>(null);
  const [showFlashModal, setShowFlashModal] = useState(false);

  // ── Tema Blockly (idêntico ao desktop) ──────────────────────────────────
  const bloquinTheme = Blockly.Theme.defineTheme('bloquinTheme', {
    name: 'bloquinTheme', base: Blockly.Themes.Classic,
    blockStyles: {
      colour_blocks:   { colourPrimary: '#ef9f4b', colourSecondary: '#d4891f', colourTertiary: '#b87219' },
      list_blocks:     { colourPrimary: '#4cd137', colourSecondary: '#3bac29', colourTertiary: '#2e8a1f' },
      logic_blocks:    { colourPrimary: '#6c5ce7', colourSecondary: '#5a4ed4', colourTertiary: '#473dbf' },
      loop_blocks:     { colourPrimary: '#00b894', colourSecondary: '#00a381', colourTertiary: '#008068' },
      math_blocks:     { colourPrimary: '#0984e3', colourSecondary: '#0773c9', colourTertiary: '#0562af' },
      procedure_blocks:{ colourPrimary: '#fd79a8', colourSecondary: '#e46d96', colourTertiary: '#cc6284' },
      text_blocks:     { colourPrimary: '#fdcb6e', colourSecondary: '#e4b55b', colourTertiary: '#cb9e48' },
      variable_blocks: { colourPrimary: '#e17055', colourSecondary: '#c85f42', colourTertiary: '#b04e30' },
      variable_dynamic_blocks: { colourPrimary: '#e17055', colourSecondary: '#c85f42', colourTertiary: '#b04e30' },
      hat_blocks:      { colourPrimary: '#a29bfe', colourSecondary: '#9085e3', colourTertiary: '#7e71c8' },
    },
    componentStyles: {
      workspaceBackgroundColour: '#eef2f7',
      toolboxBackgroundColour:   '#1a2035',
      toolboxForegroundColour:   '#ffffff',
      flyoutBackgroundColour:    '#242c42',
      flyoutForegroundColour:    '#ffffff',
      flyoutOpacity:             0.98,
      scrollbarColour:           '#00a8ff',
      scrollbarOpacity:          0.5,
    },
  });

  // ── Portas ────────────────────────────────────────────────────────────────
  const fetchPorts = async () => {
    try {
      const ports = await HardwareService.getAvailablePorts();
      setAvailablePorts(ports);
      if (ports.length > 0) setPort(ports[0]);
    } catch (err) { console.error('Erro ao buscar portas:', err); }
  };

  const getOrphanedBlocks = (): string[] => {
    if (!workspace.current) return [];
    return workspace.current.getTopBlocks(false)
      .filter(b => !TOP_LEVEL_BLOCK_TYPES.has(b.type))
      .map(b => BLOCK_NAMES[b.type] ?? b.type);
  };

  const delay = (ms: number) => new Promise(res => setTimeout(res, ms));

  const initializeBlocklyModules = async () => {
    const { initBlocks }      = await import('../blockly/blocks');
    const { initGenerators, generateCode } = await import('../blockly/generators');
    initBlocks();
    initGenerators();
    codeGeneratorRef.current = generateCode;
  };

  // ── Carregar dados do projeto ─────────────────────────────────────────────
  useEffect(() => {
    if (!projectId) return;
    let cancelled = false;

    (async () => {
      const { data, error } = await ProjectService.getProjectData(projectId);
      if (cancelled) return;
      if (error || !data) { setBoardLoadState('selecting'); return; }

      setProjectName(data.nome);
      pendingWorkspaceData.current = data.workspace_data ?? null;

      const raw = data.target_board as string | null | undefined;

      // MVP web: apenas ESP32. Se não tiver placa definida, define automaticamente.
      if (!raw || raw === BOARD_UNSET) {
        // Auto-seleccionar ESP32 sem mostrar o modal
        const { syncBoardPins } = await import('../blockly/blocks');
        syncBoardPins('esp32');
        setBoard('esp32');
        await initializeBlocklyModules();
        setBoardLoadState('ready');
        return;
      }

      if (raw in BOARDS) {
        const key = raw as BoardKey;
        const { syncBoardPins } = await import('../blockly/blocks');
        syncBoardPins(key);
        setBoard(key);
        await initializeBlocklyModules();
        setBoardLoadState('ready');
      } else {
        setBoardLoadState('error');
        setFriendlyError({
          emoji: '⚠️', title: 'Placa desconhecida!',
          message: `A placa "${raw}" não é reconhecida.`,
          tip: 'Contate o professor.',
          rawError: `target_board="${raw}" não existe em BOARDS.`,
        });
      }
    })();

    return () => { cancelled = true; };
  }, [projectId]);

  const handleBoardSelected = async (selected: BoardKey) => {
    const { syncBoardPins } = await import('../blockly/blocks');
    syncBoardPins(selected);
    setBoard(selected);
    if (projectId) await ProjectService.updateBoard(projectId, selected);
    await initializeBlocklyModules();
    setBoardLoadState('ready');
  };

  // ── Upload result listener ────────────────────────────────────────────────
  useEffect(() => {
    let unlisten: (() => void) | undefined;
    HardwareService.listenUploadResult((payload) => {
      if (payload === 'ok') { setUploadStage('success'); }
      else if (payload.startsWith('err:')) {
        setUploadStage(null);
        setFriendlyError(getFriendlyError(payload.slice(4)));
      }
      isUploadingRef.current = false;
    }).then(fn => { unlisten = fn; });
    return () => { unlisten?.(); };
  }, []);

  // ── Inicializar Blockly ───────────────────────────────────────────────────
  useEffect(() => {
    if (boardLoadState !== 'ready' || !blocklyDiv.current || workspace.current) return;

    workspace.current = Blockly.inject(blocklyDiv.current, {
      toolbox: toolboxConfig,
      grid: { spacing: 24, length: 4, colour: '#d8e0ec', snap: true },
      readOnly,
      move: { scrollbars: true, drag: true, wheel: true },
      theme: bloquinTheme,
      zoom: { controls: true, wheel: true, startScale: 1.0, maxScale: 3, minScale: 0.3, scaleSpeed: 1.2 },
      trashcan: true,
      sounds: false,
    });

    workspace.current.addChangeListener((event) => {
      if (event.isUiEvent) return;
      if (trackChanges.current) setIsDirty(true);
      try {
        if (codeGeneratorRef.current) {
          setGeneratedCode(codeGeneratorRef.current(workspace.current!) || '// Arraste blocos para PREPARAR e AGIR!');
        }
      } catch (e) { console.error('Erro ao gerar código:', e); }
    });

    const ensureRootBlocks = () => {
      if (!workspace.current) return;
      let s = workspace.current.getTopBlocks(false).find(b => b.type === 'bloco_setup');
      if (!s) { s = workspace.current.newBlock('bloco_setup'); s.moveBy(50, 50); s.initSvg(); s.render(); }
      s.setDeletable(false);
      let l = workspace.current.getTopBlocks(false).find(b => b.type === 'bloco_loop');
      if (!l) { l = workspace.current.newBlock('bloco_loop'); l.moveBy(450, 50); l.initSvg(); l.render(); }
      l.setDeletable(false);
    };

    const savedData = pendingWorkspaceData.current;
    if (savedData && typeof savedData === 'string' && savedData.trim() !== '') {
      try {
        // Tenta descomprimir LZ (formato desktop) — se falhar trata como XML puro
        const decompressed = LZString.decompressFromBase64(savedData);
        const raw = decompressed ? JSON.parse(decompressed) : JSON.parse(savedData);
        if (raw && Object.keys(raw).length > 0) {
          Blockly.serialization.workspaces.load(raw, workspace.current);
        } else {
          ensureRootBlocks();
        }
      } catch {
        // Pode ser XML direto (formato web)
        try {
          const xml = Blockly.utils.xml.textToDom(savedData as string);
          Blockly.Xml.domToWorkspace(xml, workspace.current);
        } catch { ensureRootBlocks(); }
      }
    } else {
      ensureRootBlocks();
    }

    const trackTimer = setTimeout(() => { trackChanges.current = true; }, 300);

    return () => {
      clearTimeout(trackTimer);
      trackChanges.current = false;
      workspace.current?.dispose();
      workspace.current = null;
    };
  }, [boardLoadState]);

  useEffect(() => {
    fetchPorts();
  }, []);

  useEffect(() => {
    if (workspace.current) Blockly.svgResize(workspace.current);
  }, [role, isCodeVisible, isFullscreenCode, boardLoadState]);

  // ── Serial ────────────────────────────────────────────────────────────────
  useEffect(() => {
    let unlisten: (() => void) | undefined;
    HardwareService.listenSerialMessages((payload) => {
      setSerialMessages(prev => {
        const next = [...prev, { text: payload, ts: Date.now() }];
        return next.length > 50 ? next.slice(-50) : next;
      });
    }).then(fn => { unlisten = fn; });
    return () => { unlisten?.(); };
  }, []);

  const handleToggleSerial = async () => {
    try {
      if (isSerialOpen) { await HardwareService.stopSerial(); setIsSerialOpen(false); }
      else { setSerialMessages([]); await HardwareService.startSerial(port); setIsSerialOpen(true); }
    } catch (error) { setFriendlyError(getFriendlyError(String(error))); }
  };

  // ── Salvar projeto ────────────────────────────────────────────────────────
  const handleSaveProject = async () => {
    if (!projectId || !workspace.current || !board) return;
    setIsSaving(true);

    // Web: salvar como XML Blockly (sem compressão LZ — mais simples de debugar)
    const xml = Blockly.Xml.domToText(Blockly.Xml.workspaceToDom(workspace.current));

    const { error } = await ProjectService.saveProject(projectId, board, xml);
    setIsSaving(false);
    if (!error) { setSaveStatus('success'); setIsDirty(false); }
    else {
      setFriendlyError({
        emoji: '☁️', title: 'Não consegui salvar!',
        message: String(error),
        tip: 'Verifique a conexão com o servidor.',
        rawError: String(error),
      });
    }
  };

  // ── Upload / Compilação ───────────────────────────────────────────────────
  const handleUploadCode = async (ignoreOrphans = false) => {
    if (isUploadingRef.current || !board) return;
    if (!ignoreOrphans) {
      const orphans = getOrphanedBlocks();
      if (orphans.length > 0) { setOrphanWarning(orphans); return; }
    }
    if (!generatedCode.includes('void setup()') || !generatedCode.includes('void loop()')) {
      setFriendlyError({
        emoji: '🧩', title: 'Faltam peças importantes!',
        message: 'Os blocos PREPARAR e AGIR são obrigatórios.',
        tip: 'Mexa em uma peça e tente de novo.',
        rawError: 'Missing setup() or loop().',
      });
      return;
    }

    if (isSerialOpen) { await HardwareService.stopSerial(); }
    isUploadingRef.current = true;
    setUploadStage('validating');
    await delay(500);
    if (!isUploadingRef.current) return;

    setUploadStage('compiling');
    await HardwareService.uploadCode(generatedCode, board, port);
    // O resultado chega via listenUploadResult — que seta 'sending' / 'success' / error
    await delay(1000);
    if (!isUploadingRef.current) return;
    setUploadStage('sending');
  };

  const handleAttemptBack = () => {
    if (readOnly || !projectId) { onBack(); return; }
    if (isDirty) setShowExitConfirm(true);
    else onBack();
  };

  return (
    <div className="app-container">
      {boardLoadState === 'selecting' && <BoardSelectionModal onSelect={handleBoardSelected} />}
      {boardLoadState === 'resolving' && (
        <div className="modal-overlay" style={{ zIndex: 999998 }}>
          <div className="loading-overlay-text">Carregando projeto…</div>
        </div>
      )}

      {/* TOPBAR */}
      <div className="topbar">
        <div className="topbar-left">
          {/* <img src={logoSimples} alt="bloquin" style={{ height: '34px' }} /> */}
          <span style={{ fontWeight: 900, fontSize: '1.2rem', color: 'var(--primary)' }}>Bloquin</span>
          {projectName && (
            <span className="project-title-badge">{projectName}</span>
          )}
        </div>

        <div className="topbar-center">
          <div className="hardware-controls">
            {boardLoadState === 'ready' && board && <BoardBadge boardKey={board} />}
            <div className="control-divider" />
            <div className="control-group">
              <select value={port} onChange={e => setPort(e.target.value)}>
                {availablePorts.length === 0
                  ? <option value="">Selecione uma porta</option>
                  : availablePorts.map(p => <option key={p} value={p}>{p}</option>)
                }
              </select>
              <button onClick={fetchPorts} className="btn-icon" title="Atualizar porta">↻</button>
            </div>
            <div className="control-divider" />
            {!readOnly && (
              <>
                <button
                  onClick={() => handleUploadCode()}
                  className="btn-action btn-send"
                  disabled={isUploadingRef.current || boardLoadState !== 'ready'}
                >
                  Compilar
                </button>
                <button
                  className={`btn-action ${isSerialOpen ? 'btn-chat-active' : 'btn-chat'}`}
                  onClick={handleToggleSerial}
                >
                  {isSerialOpen ? '🛑 Parar' : 'Chat'}
                </button>
              </>
            )}
            {readOnly && (
              <button
                className={`btn-action ${isSerialOpen ? 'btn-chat-active' : 'btn-chat'}`}
                onClick={handleToggleSerial}
              >
                {isSerialOpen ? '🛑 Parar' : '💬 Monitorar'}
              </button>
            )}
          </div>
        </div>

        <div className="topbar-right">
          {role !== 'student' && (
            <button className="btn-secondary topbar-btn" onClick={() => setIsCodeVisible(!isCodeVisible)}>
              {isCodeVisible ? '🙈 Ocultar Código' : 'Ver Código'}
            </button>
          )}
          {(role === 'student' || (role === 'teacher' && !readOnly)) && projectId && (
            <button className="btn-primary topbar-btn" onClick={handleSaveProject} disabled={isSaving}>
              {isSaving ? '⏳ Salvando…' : '💾 Salvar'}
            </button>
          )}
          <button
            className={`${isDirty && !readOnly && projectId ? 'btn-danger' : 'btn-secondary'} topbar-btn`}
            onClick={handleAttemptBack}
          >
            Sair
          </button>
        </div>
      </div>

      {readOnly && (
        <div className="readonly-banner">
          <span>Modo Visualização</span>
          <span>Você está vendo o projeto de um aluno. Edição desativada.</span>
        </div>
      )}

      {/* WORKSPACE */}
      <div className="workspace-area">
        <div ref={blocklyDiv} id="blocklyDiv" />
        {isCodeVisible && (
          <div className={`code-panel ${isFullscreenCode ? 'fullscreen' : ''}`}>
            <div className="code-panel-header">
              <h3 className="code-panel-title">Código C++</h3>
              <button onClick={() => setIsFullscreenCode(!isFullscreenCode)} className="code-fullscreen-btn">
                {isFullscreenCode ? '↙️ Reduzir' : '⛶ Tela Cheia'}
              </button>
            </div>
            <pre>{generatedCode}</pre>
          </div>
        )}
      </div>

      {/* MODAIS */}
      {uploadStage && (
        <UploadModal
          stage={uploadStage}
          onClose={() => {
            if (uploadStage === 'success') {
              // Ao clicar "Gravar no ESP32" no modal de sucesso
              setUploadStage(null);
              setShowFlashModal(true);
            } else {
              setUploadStage(null);
            }
          }}
        />
      )}

      {showFlashModal && (() => {
        const jobId = sessionStorage.getItem('blq_last_job') ?? '';
        return (
          <FlashModal
            jobId={jobId}
            onClose={() => setShowFlashModal(false)}
          />
        );
      })()}

      {orphanWarning.length > 0 && (
        <OrphanModal
          orphanBlocks={orphanWarning}
          onFix={() => setOrphanWarning([])}
          onSendAnyway={() => { setOrphanWarning([]); handleUploadCode(true); }}
        />
      )}

      {saveStatus === 'success' && (
        <div className="modal-overlay">
          <div className="save-success-modal">
            <div className="save-success-icon">☁️</div>
            <h2>Projeto Salvo!</h2>
            <p>Suas peças foram guardadas com segurança no servidor.</p>
            <button className="btn-primary" style={{ width: '100%', padding: '14px' }} onClick={() => setSaveStatus(null)}>
              Continuar
            </button>
          </div>
        </div>
      )}

      <SerialMonitor
        isOpen={isSerialOpen}
        messages={serialMessages}
        onClose={handleToggleSerial}
        onClear={() => setSerialMessages([])}
        isCodeOpen={isCodeVisible}
      />

      {friendlyError && <ErrorModal error={friendlyError} onClose={() => setFriendlyError(null)} />}

      {showExitConfirm && (
        <div className="modal-overlay">
          <div className="friendly-error-modal" style={{ borderTopColor: 'var(--warning)' }}>
            <div className="friendly-error-icon">⚠️</div>
            <h2>Mudanças não salvas!</h2>
            <p className="friendly-error-message">Se sair agora, seu progresso será perdido.</p>
            <div style={{ display: 'flex', gap: '10px', width: '100%', marginTop: '10px' }}>
              <button className="btn-secondary" style={{ flex: 1 }} onClick={() => setShowExitConfirm(false)}>
                Continuar editando
              </button>
              <button className="btn-primary" style={{ flex: 1 }} onClick={async () => {
                setShowExitConfirm(false); await handleSaveProject(); onBack();
              }}>
                💾 Salvar e Sair
              </button>
              <button className="btn-danger" style={{ flex: 1 }} onClick={() => { setShowExitConfirm(false); onBack(); }}>
                Sair sem salvar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

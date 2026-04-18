import { useState, useRef } from 'react';
import { flashESP32 } from '../../services/serialService';
import { downloadBinary } from '../../services/api';

// Mapeamento de erros reais para mensagens amigáveis (conforme tabela do PDD)
function getFlashErrorMessage(err: unknown): { title: string; tip: string } {
  const msg = err instanceof Error ? err.message.toLowerCase() : String(err).toLowerCase();

  if (msg.includes('não selecionada') || msg.includes('not allowed') || msg.includes('notallowed')) {
    return {
      title: 'Porta não selecionada.',
      tip:   'Selecione a porta do ESP32 para continuar.',
    };
  }
  if (msg.includes('failed to connect') || msg.includes('falha') || msg.includes('could not connect')) {
    return {
      title: 'Não foi possível conectar ao ESP32.',
      tip:   'Verifique se o ESP32 está conectado e tente novamente.',
    };
  }
  if (msg.includes('md5') || msg.includes('hash') || msg.includes('mismatch')) {
    return {
      title: 'Erro na verificação do firmware (MD5).',
      tip:   'Transferência corrompida. Tente novamente.',
    };
  }
  if (msg.includes('permission') || msg.includes('permissão') || msg.includes('access denied')) {
    return {
      title: 'Permissão negada à porta serial.',
      tip:   'Permissão negada. Contate o professor.',
    };
  }
  if (msg.includes('timeout') || msg.includes('timed out')) {
    return {
      title: 'Tempo esgotado durante a gravação.',
      tip:   'Verifique o cabo USB e tente novamente.',
    };
  }
  return {
    title: err instanceof Error ? err.message : 'Erro inesperado na gravação.',
    tip:   'Tente novamente. Se persistir, verifique o cabo USB e o ESP32.',
  };
}

interface FlashModalProps {
  jobId:   string;
  onClose: () => void;
}

type FlashState = 'idle' | 'downloading' | 'flashing' | 'done' | 'error';

export function FlashModal({ jobId, onClose }: FlashModalProps) {
  const [state,    setState]    = useState<FlashState>('idle');
  const [percent,  setPercent]  = useState(0);
  const [logs,     setLogs]     = useState<string[]>([]);
  const [errInfo,  setErrInfo]  = useState<{ title: string; tip: string } | null>(null);
  const logsEndRef = useRef<HTMLDivElement>(null);

  function appendLog(line: string) {
    setLogs(prev => {
      const next = [...prev, line];
      // scroll automático
      setTimeout(() => logsEndRef.current?.scrollIntoView({ behavior: 'smooth' }), 30);
      return next;
    });
  }

  async function startFlash() {
    setState('downloading');
    setPercent(0);
    setLogs([]);
    setErrInfo(null);

    try {
      // 1. Baixar binário do servidor
      appendLog('Baixando firmware do servidor…');
      const blob     = await downloadBinary(jobId);
      const firmware = await blob.arrayBuffer();
      appendLog(`Firmware recebido: ${(firmware.byteLength / 1024).toFixed(1)} KB`);

      // 2. Gravar no ESP32 via Web Serial + esptool-js
      setState('flashing');
      await flashESP32(
        firmware,
        (line)  => appendLog(line),
        ({ percent: p }) => setPercent(p),
      );

      setState('done');
    } catch (err: unknown) {
      setState('error');
      setErrInfo(getFlashErrorMessage(err));
      appendLog(`✗ ${err instanceof Error ? err.message : String(err)}`);
    }
  }

  // ── Labels e ícones por estado ─────────────────────────────────────────────
  const icons: Record<FlashState, string> = {
    idle:        '📡',
    downloading: '⬇️',
    flashing:    '⚡',
    done:        '✅',
    error:       '❌',
  };
  const titles: Record<FlashState, string> = {
    idle:        'Gravar no ESP32',
    downloading: 'Baixando firmware…',
    flashing:    'Gravando…',
    done:        'Gravação concluída!',
    error:       'Erro na gravação',
  };
  const subtitles: Record<FlashState, string> = {
    idle:        'Conecte o ESP32 via USB e clique em Gravar.',
    downloading: 'Aguarde…',
    flashing:    'Não desconecte o cabo USB.',
    done:        'O ESP32 reiniciou e está executando o novo código.',
    error:       'Verifique o cabo e tente novamente.',
  };

  return (
    <div className="modal-overlay">
      <div style={{
        background:    'var(--white)',
        borderRadius:  '24px',
        padding:       '32px',
        width:         '90%',
        maxWidth:      '480px',
        display:       'flex',
        flexDirection: 'column',
        gap:           '18px',
        boxShadow:     'var(--shadow-xl)',
        borderTop:     '6px solid var(--secondary)',
        animation:     'popIn .4s cubic-bezier(.175,.885,.32,1.275)',
      }}>

        {/* Cabeçalho */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
          <span style={{ fontSize: '2.2rem', lineHeight: 1 }}>{icons[state]}</span>
          <div>
            <h2 style={{ fontWeight: 900, color: 'var(--dark)', fontSize: '1.25rem', margin: 0 }}>
              {titles[state]}
            </h2>
            <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem', margin: '3px 0 0' }}>
              {subtitles[state]}
            </p>
          </div>
        </div>

        {/* Barra de progresso — visível durante a gravação */}
        {(state === 'flashing' || state === 'done') && (
          <div>
            <div style={{
              height:       '10px',
              background:   'var(--border)',
              borderRadius: '100px',
              overflow:     'hidden',
            }}>
              <div style={{
                height:     '100%',
                borderRadius: '100px',
                transition: 'width .3s ease',
                background: state === 'done'
                  ? 'var(--secondary)'
                  : 'linear-gradient(90deg, var(--primary), var(--secondary))',
                width: `${state === 'done' ? 100 : percent}%`,
              }} />
            </div>
            <p style={{
              textAlign: 'right',
              fontSize:  '0.8rem',
              color:     'var(--text-muted)',
              margin:    '4px 0 0',
            }}>
              {state === 'done' ? '100%' : `${percent}%`}
            </p>
          </div>
        )}

        {/* Log de saída em tempo real */}
        {logs.length > 0 && (
          <div style={{
            background:   '#1e272e',
            borderRadius: '10px',
            padding:      '12px 14px',
            fontFamily:   "'JetBrains Mono', 'Courier New', monospace",
            fontSize:     '0.77rem',
            maxHeight:    '170px',
            overflowY:    'auto',
            lineHeight:   1.7,
          }}>
            {logs.map((line, i) => (
              <div key={i} style={{
                color: line.startsWith('✗') ? '#ff7675'
                     : line.startsWith('Gravação concluída') ? '#55efc4'
                     : '#a8e6cf',
              }}>
                {line}
              </div>
            ))}
            <div ref={logsEndRef} />
          </div>
        )}

        {/* Dica de erro amigável */}
        {errInfo && (
          <div className="friendly-error-tip">
            <span>💡</span>
            <span>{errInfo.tip}</span>
          </div>
        )}

        {/* Botões de ação por estado */}
        <div style={{ display: 'flex', gap: '10px' }}>
          {state === 'idle' && (
            <>
              <button className="btn-text"    style={{ flex: 1 }} onClick={onClose}>
                Cancelar
              </button>
              <button className="btn-primary" style={{ flex: 2 }} onClick={startFlash}>
                ⚡ Gravar no ESP32
              </button>
            </>
          )}

          {(state === 'downloading' || state === 'flashing') && (
            <button className="btn-secondary" style={{ flex: 1 }} disabled>
              {state === 'downloading' ? 'Baixando…' : 'Gravando…'}
            </button>
          )}

          {state === 'done' && (
            <button className="btn-primary" style={{ flex: 1 }} onClick={onClose}>
              🎉 Concluído!
            </button>
          )}

          {state === 'error' && (
            <>
              <button className="btn-text"    style={{ flex: 1 }} onClick={onClose}>
                Fechar
              </button>
              <button className="btn-outline" style={{ flex: 2 }} onClick={startFlash}>
                ↺ Tentar novamente
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

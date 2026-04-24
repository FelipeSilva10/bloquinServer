import { useState, useRef } from 'react';
import { flashESP32, isWebSerialSupported } from '../../services/serialService';
import { downloadBinary } from '../../services/api';

function getFlashErrorMessage(err: unknown): { title: string; tip: string } {
  const msg = err instanceof Error ? err.message.toLowerCase() : String(err).toLowerCase();

  if (msg.includes('web serial api não disponível') || msg.includes('serial api')) {
    return {
      title: 'Web Serial não disponível neste dispositivo.',
      tip:   'Seu Chromebook pode precisar ativar esta funcionalidade. Veja as instruções na mensagem de erro acima.',
    };
  }
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
  if (msg.includes('bloqueado') || msg.includes('policy') || msg.includes('security')) {
    return {
      title: 'Acesso bloqueado pela política do sistema.',
      tip:   'O Chromebook pode estar bloqueando o acesso à porta USB. Contate o professor.',
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
    title: err instanceof Error ? err.message.split('\n')[0] : 'Erro inesperado na gravação.',
    tip:   'Tente novamente. Se persistir, verifique o cabo USB e o ESP32.',
  };
}

interface FlashModalProps {
  jobId:   string;
  onClose: () => void;
}

type FlashState = 'idle' | 'downloading' | 'flashing' | 'done' | 'error' | 'no-serial';

export function FlashModal({ jobId, onClose }: FlashModalProps) {
  // FIX Chromebook: detectar Web Serial na abertura do modal
  const [state,    setState]    = useState<FlashState>(
    isWebSerialSupported() ? 'idle' : 'no-serial'
  );
  const [percent,  setPercent]  = useState(0);
  const [logs,     setLogs]     = useState<string[]>([]);
  const [errInfo,  setErrInfo]  = useState<{ title: string; tip: string } | null>(null);
  const logsEndRef = useRef<HTMLDivElement>(null);

  function appendLog(line: string) {
    setLogs(prev => {
      const next = [...prev, line];
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
      appendLog('Baixando firmware do servidor…');
      const blob     = await downloadBinary(jobId);
      const firmware = await blob.arrayBuffer();
      appendLog(`Firmware recebido: ${(firmware.byteLength / 1024).toFixed(1)} KB`);

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
      appendLog(`✗ ${err instanceof Error ? err.message.split('\n')[0] : String(err)}`);
    }
  }

  const icons: Record<FlashState, string> = {
    idle:        '📡',
    downloading: '⬇️',
    flashing:    '⚡',
    done:        '✅',
    error:       '❌',
    'no-serial': '🔌',
  };
  const titles: Record<FlashState, string> = {
    idle:        'Gravar no ESP32',
    downloading: 'Baixando firmware…',
    flashing:    'Gravando…',
    done:        'Gravação concluída!',
    error:       'Erro na gravação',
    'no-serial': 'Web Serial indisponível',
  };
  const subtitles: Record<FlashState, string> = {
    idle:        'Conecte o ESP32 via USB e clique em Gravar.',
    downloading: 'Aguarde…',
    flashing:    'Não desconecte o cabo USB.',
    done:        'O ESP32 reiniciou e está executando o novo código.',
    error:       'Verifique o cabo e tente novamente.',
    'no-serial': 'Este dispositivo não suporta gravação direta pelo navegador.',
  };

  return (
    <div className="modal-overlay">
      <div style={{
        background:    'var(--white)',
        borderRadius:  '24px',
        padding:       '32px',
        width:         '90%',
        maxWidth:      '500px',
        display:       'flex',
        flexDirection: 'column',
        gap:           '18px',
        boxShadow:     'var(--shadow-xl)',
        borderTop:     `6px solid ${state === 'no-serial' ? 'var(--warning)' : state === 'error' ? 'var(--danger)' : 'var(--secondary)'}`,
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

        {/* Aviso quando Web Serial não está disponível */}
        {state === 'no-serial' && (
          <div style={{
            background:   '#fff8e1',
            border:       '2px solid var(--warning)',
            borderRadius: '12px',
            padding:      '14px 16px',
            fontSize:     '0.9rem',
            lineHeight:   1.6,
            color:        '#5d4037',
          }}>
            <strong>Para ativar a gravação direta no Chromebook:</strong>
            <ol style={{ margin: '8px 0 0 16px', paddingLeft: 0 }}>
              <li>Acesse <code style={{ background: '#f5f5f5', padding: '1px 4px', borderRadius: '4px' }}>chrome://flags</code></li>
              <li>Busque por <strong>"Web Serial"</strong></li>
              <li>Habilite <strong>Experimental Web Platform Features</strong></li>
              <li>Reinicie o Chrome</li>
            </ol>
            <p style={{ marginTop: '10px', marginBottom: 0 }}>
              <strong>Alternativa:</strong> O firmware já foi compilado e está disponível para download.
            </p>
          </div>
        )}

        {/* Barra de progresso */}
        {(state === 'flashing' || state === 'done') && (
          <div>
            <div style={{ height: '10px', background: 'var(--border)', borderRadius: '100px', overflow: 'hidden' }}>
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
            <p style={{ textAlign: 'right', fontSize: '0.8rem', color: 'var(--text-muted)', margin: '4px 0 0' }}>
              {state === 'done' ? '100%' : `${percent}%`}
            </p>
          </div>
        )}

        {/* Log de saída */}
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

        {/* Dica de erro */}
        {errInfo && (
          <div className="friendly-error-tip">
            <span>💡</span>
            <span>{errInfo.tip}</span>
          </div>
        )}

        {/* Botões por estado */}
        <div style={{ display: 'flex', gap: '10px' }}>
          {state === 'idle' && (
            <>
              <button className="btn-text"    style={{ flex: 1 }} onClick={onClose}>Cancelar</button>
              <button className="btn-primary" style={{ flex: 2 }} onClick={startFlash}>⚡ Gravar no ESP32</button>
            </>
          )}

          {state === 'no-serial' && (
            <>
              <button className="btn-secondary" style={{ flex: 1 }} onClick={onClose}>Fechar</button>
              <button
                className="btn-primary"
                style={{ flex: 2 }}
                onClick={async () => {
                  // Tentar baixar o binário para o usuário salvar manualmente
                  try {
                    const blob = await downloadBinary(jobId);
                    const url  = URL.createObjectURL(blob);
                    const a    = document.createElement('a');
                    a.href     = url;
                    a.download = `firmware-${jobId.slice(0, 8)}.bin`;
                    a.click();
                    URL.revokeObjectURL(url);
                  } catch {
                    alert('Erro ao baixar o firmware.');
                  }
                }}
              >
                ⬇️ Baixar firmware (.bin)
              </button>
            </>
          )}

          {(state === 'downloading' || state === 'flashing') && (
            <button className="btn-secondary" style={{ flex: 1 }} disabled>
              {state === 'downloading' ? 'Baixando…' : 'Gravando…'}
            </button>
          )}

          {state === 'done' && (
            <button className="btn-primary" style={{ flex: 1 }} onClick={onClose}>🎉 Concluído!</button>
          )}

          {state === 'error' && (
            <>
              <button className="btn-text"    style={{ flex: 1 }} onClick={onClose}>Fechar</button>
              <button className="btn-outline" style={{ flex: 2 }} onClick={startFlash}>↺ Tentar novamente</button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
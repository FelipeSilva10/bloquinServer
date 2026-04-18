import { useEffect, useRef } from 'react';

export interface SerialMessage {
  text: string;
  ts: number;
}

interface SerialMonitorProps {
  isOpen: boolean;
  messages: SerialMessage[];
  onClose: () => void;
  onClear: () => void;
  isCodeOpen: boolean;
}

export function SerialMonitor({ isOpen, messages, onClose, onClear, isCodeOpen }: SerialMonitorProps) {
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (isOpen) messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isOpen]);

  if (!isOpen) return null;

  return (
    <div className={`serial-monitor ${isCodeOpen ? 'shifted' : ''}`}>
      <div className="serial-monitor-header">
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <div className="serial-status-dot" />
          <span>Robô conectado</span>
        </div>
        <button className="serial-close-btn" onClick={onClose}>✕</button>
      </div>
      <div className="serial-monitor-body">
        {messages.length === 0 ? (
          <div className="serial-empty">
            <span>📡</span>
            <p>Aguardando o robô falar…</p>
            <small>As mensagens do robô aparecerão aqui!</small>
          </div>
        ) : (
          messages.map((msg, idx) => (
            <div key={idx} className="serial-message">
              <span className="serial-timestamp">
                {new Date(msg.ts).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
              </span>
              <span className="serial-text">{msg.text}</span>
            </div>
          ))
        )}
        <div ref={messagesEndRef} />
      </div>
      <div className="serial-monitor-footer">
        <button className="serial-clear-btn" onClick={onClear}>Limpar</button>
        <span>{messages.length} mensagens</span>
      </div>
    </div>
  );
}

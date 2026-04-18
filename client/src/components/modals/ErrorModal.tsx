import { useState } from 'react';

export type FriendlyError = { emoji: string; title: string; message: string; tip: string; rawError: string };

export function getFriendlyError(raw: string): FriendlyError {
  const e = raw.toLowerCase();
  const base = { rawError: raw };
  if (e.includes('falha ao baixar') || e.includes('curl') || e.includes('plano b')) return { ...base, emoji: '🌐', title: 'Problema na Internet!', message: 'Não consegui baixar as ferramentas necessárias.', tip: 'Dica: Verifique a conexão com a internet e tente novamente.' };
  if (e.includes('update-index') || e.includes('erro ao instalar core')) return { ...base, emoji: '📦', title: 'Faltam os pacotes da placa!', message: 'O servidor precisa baixar informações da placa, mas a internet falhou.', tip: 'Dica: Verifique a conexão do servidor. Essa etapa só acontece uma vez!' };
  if (e.includes('esp32') || e.includes('espressif')) return { ...base, emoji: '🛠️', title: 'Erro ao configurar a placa ESP32!', message: 'Ocorreu um problema ao adicionar as configurações da placa ESP32.', tip: 'Dica: Chame o professor!' };
  if (e.includes('sessão expirada') || e.includes('token')) return { ...base, emoji: '🔒', title: 'Sessão expirada!', message: 'Sua sessão expirou. Faça login novamente.', tip: 'Dica: Recarregue a página e entre com suas credenciais.' };
  if (e.includes('erro no código') || e.includes('error:') || e.includes('syntax error')) return { ...base, emoji: '🧩', title: 'Hmm… algo está errado nas peças!', message: 'O código gerado pelos blocos tem um probleminha.', tip: 'Dica: Tente remover a última peça que você colocou e montar de novo.' };
  if (e.includes('timeout') || e.includes('timed out')) return { ...base, emoji: '⏰', title: 'Demorou demais…', message: 'O servidor não respondeu a tempo.', tip: 'Dica: O servidor pode estar ocupado. Tente novamente em alguns segundos.' };
  return { ...base, emoji: '😕', title: 'Algo deu errado por aqui...', message: 'Ocorreu um erro inesperado.', tip: 'Dica: Tente de novo. Se continuar, chame o professor!' };
}

interface ErrorModalProps {
  error: FriendlyError;
  onClose: () => void;
}

export function ErrorModal({ error, onClose }: ErrorModalProps) {
  const [showTechDetails, setShowTechDetails] = useState(false);

  return (
    <div className="modal-overlay">
      <div className="friendly-error-modal">
        <div className="friendly-error-icon">{error.emoji}</div>
        <h2>{error.title}</h2>
        <p className="friendly-error-message">{error.message}</p>
        <div className="friendly-error-tip"><span>💡</span><span>{error.tip}</span></div>
        <div style={{ display: 'flex', gap: '10px', width: '100%', marginTop: '10px' }}>
          <button className="btn-primary" style={{ flex: 1 }} onClick={onClose}>Entendi, vou tentar!</button>
        </div>
        <div className="tech-details-wrap">
          <button className="tech-details-btn" onClick={() => setShowTechDetails(!showTechDetails)}>
            {showTechDetails ? 'Ocultar detalhes técnicos' : '🛠️ Ver detalhes técnicos (Professor)'}
          </button>
          {showTechDetails && <pre className="tech-details-pre">{error.rawError}</pre>}
        </div>
      </div>
    </div>
  );
}

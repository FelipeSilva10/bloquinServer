export type UploadStage = 'validating' | 'compiling' | 'sending' | 'success';

export const UPLOAD_STAGES: { id: UploadStage; label: string; emoji: string; tip: string }[] = [
  { id: 'validating', label: 'Verificando as peças…',  emoji: '🔍', tip: 'Checando se tudo está no lugar certo!' },
  { id: 'compiling',  label: 'Compilando o código…',   emoji: '⚙️', tip: 'Transformando os blocos em linguagem de robô!' },
  { id: 'sending',    label: 'Enviando para o robô…',  emoji: '📡', tip: 'O código está sendo processado no servidor!' },
  { id: 'success',    label: 'Pronto para gravar!',    emoji: '🤖', tip: 'Binário compilado! Clique em Gravar no ESP32.' },
];

interface UploadModalProps {
  stage: UploadStage;
  onClose: () => void;
}

export function UploadModal({ stage, onClose }: UploadModalProps) {
  const stageIndex = UPLOAD_STAGES.findIndex(s => s.id === stage);
  const currentStageData = UPLOAD_STAGES.find(s => s.id === stage);

  return (
    <div className="modal-overlay">
      <div className="upload-modal">
        {stage === 'success' ? (
          <div className="upload-success-content">
            <div className="success-robot">🤖</div>
            <h2>Compilação pronta!</h2>
            <p>O código foi compilado com sucesso. Conecte o ESP32 e clique em Gravar para enviar o firmware.</p>
            <button className="btn-primary upload-close-btn" onClick={onClose}>⚡ Gravar no ESP32</button>
          </div>
        ) : (
          <>
            <div className="upload-rocket-wrap"><span>{currentStageData?.emoji}</span></div>
            <h2 className="upload-stage-label">{currentStageData?.label}</h2>
            <p className="upload-stage-tip">{currentStageData?.tip}</p>
            <div className="upload-progress-bar-track">
              <div className="upload-progress-bar-fill" style={{ width: `${((stageIndex + 1) / (UPLOAD_STAGES.length - 1)) * 100}%` }} />
            </div>
            <div className="upload-steps">
              {UPLOAD_STAGES.filter(s => s.id !== 'success').map((s, i) => (
                <div key={s.id} className={`upload-step ${i <= stageIndex ? 'active' : ''} ${i === stageIndex ? 'current' : ''}`}>
                  <div className="upload-step-dot" />
                  <span className="upload-step-label">{s.label.replace('…', '').replace(' o código', '').replace(' as peças', '').replace(' para o robô', '')}</span>
                </div>
              ))}
            </div>
          </>
        )}
      </div>
    </div>
  );
}

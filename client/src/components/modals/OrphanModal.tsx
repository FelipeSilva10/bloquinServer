interface OrphanModalProps {
  orphanBlocks: string[];
  onFix: () => void;
  onSendAnyway: () => void;
}

export function OrphanModal({ orphanBlocks, onFix, onSendAnyway }: OrphanModalProps) {
  return (
    <div className="modal-overlay">
      <div className="orphan-modal">
        <div className="orphan-icon">🧩</div>
        <h2>Tem peças soltas!</h2>
        <p>As peças abaixo estão flutuando no espaço. Para compilar, <strong>todas as peças precisam estar dentro de PREPARAR ou AGIR</strong> (ou dentro de uma Função).</p>
        <div className="orphan-blocks-list">
          {[...new Set(orphanBlocks)].map((name, i) => <div key={i} className="orphan-block-chip"><span>🔷</span> {name}</div>)}
        </div>
        <div className="orphan-diagram">
          <div className="orphan-diagram-bad"><span>❌</span><div className="mini-block floating">Peça Solta</div></div>
          <div className="orphan-diagram-arrow">→</div>
          <div className="orphan-diagram-good"><span>✅</span><div className="mini-block-container"><div className="mini-block header">PREPARAR / AGIR</div><div className="mini-block child">Peça encaixada</div></div></div>
        </div>
        <div style={{ display: 'flex', gap: '10px', width: '100%' }}>
          <button className="btn-outline" style={{ flex: 1 }} onClick={onFix}>Vou corrigir</button>
          <button className="btn-secondary" style={{ flex: 1 }} onClick={onSendAnyway}>Compilar assim mesmo</button>
        </div>
      </div>
    </div>
  );
}

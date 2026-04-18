import { useState } from 'react';
import { BoardKey } from '../../blockly/blocks';

interface BoardSelectionModalProps {
  onSelect: (board: BoardKey) => void;
}

export function BoardSelectionModal({ onSelect }: BoardSelectionModalProps) {
  const [hovered, setHovered] = useState<BoardKey | null>(null);

  const boards: { key: BoardKey; title: string; color: string; emoji: string }[] = [
    { key: 'uno',   title: 'Arduino Uno',  color: '#0984e3', emoji: '🔵' },
    { key: 'nano',  title: 'Arduino Nano', color: '#ff00d0', emoji: '🟣' },
    { key: 'esp32', title: 'ESP32 DevKit', color: '#e17055', emoji: '🟠' },
  ];

  return (
    <div className="modal-overlay" style={{ zIndex: 999999 }}>
      <div className="board-modal-card">
        <div>
          <h2 className="board-modal-title">Qual placa vamos usar?</h2>
          <p className="board-modal-subtitle">
            Escolha antes de começar. Os pinos disponíveis vão mudar dependendo da placa.
            <br /><strong>Essa escolha não pode ser alterada depois de salvar.</strong>
          </p>
        </div>
        <div className="board-list">
          {boards.map(({ key, title, color, emoji }) => (
            <button
              key={key}
              onMouseEnter={() => setHovered(key)}
              onMouseLeave={() => setHovered(null)}
              onClick={() => onSelect(key)}
              className="board-card"
              style={{ boxShadow: hovered === key ? `0 8px 24px ${color}44` : '' }}
            >
              <div className="board-img-wrap" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', background: `${color}15`, fontSize: '3rem' }}>
                {emoji}
              </div>
              <span className="board-card-title" style={{ color: hovered === key ? color : '#2f3542' }}>
                {title}
              </span>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

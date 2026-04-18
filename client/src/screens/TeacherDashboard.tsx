import { useEffect, useState } from 'react';
import { blqProjects, blqAuth } from '../services/api';

interface TeacherDashboardProps {
  onLogout: () => void;
  onOpenOwnProject: (projectId: string) => void;
  onInspectStudentProject: (projectId: string) => void;
}

interface Projeto { id: string; nome: string; updated_at: string; }

export function TeacherDashboard({ onLogout, onOpenOwnProject }: TeacherDashboardProps) {
  const [ownProjects, setOwnProjects] = useState<Projeto[]>([]);
  const [loading, setLoading]         = useState(true);
  const [showModal, setShowModal]     = useState(false);
  const [newName, setNewName]         = useState('');
  const [isCreating, setIsCreating]   = useState(false);
  const [createError, setCreateError] = useState('');
  const [projectToDelete, setProjectToDelete] = useState<Projeto | null>(null);
  const [isDeleting, setIsDeleting]   = useState(false);

  const fetchProjects = async () => {
    const { data } = await blqProjects.list();
    setLoading(false);
    if (data) setOwnProjects(data as Projeto[]);
  };

  useEffect(() => { fetchProjects(); }, []);

  const handleCreate = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!newName.trim() || isCreating) return;
    setIsCreating(true);
    setCreateError('');
    const { data, error } = await blqProjects.create(newName.trim());
    setIsCreating(false);
    if (!error && data) {
      setOwnProjects(prev => [data as Projeto, ...prev]);
      setShowModal(false);
      setNewName('');
      onOpenOwnProject(data.id);
    } else {
      setCreateError(error?.message ?? 'Erro ao criar projeto.');
    }
  };

  const confirmDelete = async () => {
    if (!projectToDelete || isDeleting) return;
    setIsDeleting(true);
    await blqProjects.delete(projectToDelete.id);
    setOwnProjects(prev => prev.filter(p => p.id !== projectToDelete.id));
    setProjectToDelete(null);
    setIsDeleting(false);
  };

  return (
    <div style={{ minHeight: '100vh', backgroundColor: 'var(--background)', padding: '20px' }}>
      <header style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px', backgroundColor: 'var(--white)', padding: '15px 25px', borderRadius: '16px', boxShadow: 'var(--shadow-sm)' }}>
        <h1 style={{ color: 'var(--dark)', fontSize: '1.5rem', fontWeight: 900 }}>Painel do Professor</h1>
        <button className="btn-outline" onClick={async () => { await blqAuth.signOut(); onLogout(); }} style={{ padding: '10px 20px' }}>Sair</button>
      </header>

      <div style={{ marginBottom: '20px' }}>
        <button className="btn-primary" style={{ padding: '12px 25px', fontSize: '1.1rem' }} onClick={() => setShowModal(true)}>
          + Novo Projeto
        </button>
      </div>

      {loading ? (
        <p style={{ color: 'var(--text-muted)', fontWeight: 700 }}>Carregando projetos...</p>
      ) : ownProjects.length === 0 ? (
        <div style={{ backgroundColor: 'var(--white)', padding: '40px', borderRadius: '16px', textAlign: 'center' }}>
          <p style={{ color: 'var(--text-muted)', fontSize: '1.2rem', fontWeight: 700 }}>Nenhum projeto ainda. Crie um para começar!</p>
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: '20px' }}>
          {ownProjects.map(proj => (
            <div key={proj.id} style={{ backgroundColor: 'var(--white)', padding: '25px', borderRadius: '16px', boxShadow: 'var(--shadow-sm)', borderTop: '5px solid var(--primary)', display: 'flex', flexDirection: 'column' }}>
              <h3 style={{ color: 'var(--dark)', marginBottom: '10px', fontSize: '1.4rem', fontWeight: 800 }}>{proj.nome}</h3>
              <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem', marginBottom: '20px', fontWeight: 600 }}>
                Salvo em: {new Date(proj.updated_at).toLocaleDateString('pt-BR')}
              </p>
              <div style={{ display: 'flex', gap: '10px', marginTop: 'auto' }}>
                <button className="btn-secondary" style={{ flex: 1, padding: '10px' }} onClick={() => onOpenOwnProject(proj.id)}>Abrir</button>
                <button className="btn-outline"   style={{ padding: '10px 15px' }}    onClick={() => setProjectToDelete(proj)}>Excluir</button>
              </div>
            </div>
          ))}
        </div>
      )}

      {showModal && (
        <div className="modal-overlay">
          <form onSubmit={handleCreate} style={{ backgroundColor: 'var(--white)', padding: '30px', borderRadius: '24px', width: '90%', maxWidth: '400px', textAlign: 'center', boxShadow: 'var(--shadow-xl)' }}>
            <h2 style={{ marginBottom: '10px', fontWeight: 900 }}>Novo Projeto</h2>
            <input type="text" placeholder="Ex: Demo Sensor" value={newName}
              onChange={e => setNewName(e.target.value)} disabled={isCreating} autoFocus
              style={{ width: '100%', padding: '15px', borderRadius: '12px', border: '2px solid var(--border)', fontSize: '1.1rem', marginBottom: '12px', fontWeight: 700 }} />
            {createError && <p style={{ color: 'var(--danger)', fontWeight: 700, marginBottom: '12px' }}>{createError}</p>}
            <div style={{ display: 'flex', gap: '10px' }}>
              <button type="button" className="btn-text" style={{ flex: 1 }} onClick={() => { setShowModal(false); setNewName(''); }} disabled={isCreating}>Cancelar</button>
              <button type="submit" className="btn-primary" style={{ flex: 1 }} disabled={isCreating || !newName.trim()}>
                {isCreating ? 'Criando...' : 'Criar e Abrir'}
              </button>
            </div>
          </form>
        </div>
      )}

      {projectToDelete && (
        <div className="modal-overlay">
          <div style={{ backgroundColor: 'var(--white)', padding: '35px', borderRadius: '24px', width: '90%', maxWidth: '400px', textAlign: 'center', boxShadow: 'var(--shadow-xl)' }}>
            <h2 style={{ marginBottom: '10px', fontWeight: 900 }}>Atenção!</h2>
            <p style={{ color: 'var(--text-muted)', marginBottom: '25px', fontWeight: 600 }}>
              Apagar <b style={{ color: 'var(--dark)' }}>{projectToDelete.nome}</b>?
            </p>
            <div style={{ display: 'flex', gap: '10px' }}>
              <button className="btn-text"   style={{ flex: 1 }} onClick={() => setProjectToDelete(null)} disabled={isDeleting}>Cancelar</button>
              <button className="btn-danger" style={{ flex: 1 }} onClick={confirmDelete} disabled={isDeleting}>
                {isDeleting ? 'Apagando...' : 'Sim, Apagar'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

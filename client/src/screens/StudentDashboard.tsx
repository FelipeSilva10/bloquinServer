import { useEffect, useState } from 'react';
import { blqProjects, blqAuth } from '../services/api';

interface StudentDashboardProps {
  onLogout: () => void;
  onOpenIde: (projectId: string) => void;
}

interface Projeto { id: string; nome: string; updated_at: string; }

export function StudentDashboard({ onLogout, onOpenIde }: StudentDashboardProps) {
  const [projects, setProjects] = useState<Projeto[]>([]);
  const [loading, setLoading]   = useState(true);
  const [showModal, setShowModal]         = useState(false);
  const [newProjectName, setNewProjectName] = useState('');
  const [createError, setCreateError]     = useState('');
  const [isCreating, setIsCreating]       = useState(false);
  const [projectToDelete, setProjectToDelete] = useState<Projeto | null>(null);
  const [isDeleting, setIsDeleting]       = useState(false);

  const fetchProjects = async () => {
    const { data } = await blqProjects.list();
    setLoading(false);
    if (data) setProjects(data as Projeto[]);
  };

  useEffect(() => { fetchProjects(); }, []);

  const handleCreateProject = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!newProjectName.trim() || isCreating) return;
    setIsCreating(true);
    setCreateError('');

    const { data, error } = await blqProjects.create(newProjectName.trim());
    setIsCreating(false);

    if (!error && data) {
      setProjects(prev => [data as Projeto, ...prev]);
      setShowModal(false);
      setNewProjectName('');
      onOpenIde(data.id);
    } else {
      setCreateError(error?.message ?? 'Erro ao criar projeto.');
    }
  };

  const confirmDelete = async () => {
    if (!projectToDelete || isDeleting) return;
    setIsDeleting(true);
    await blqProjects.delete(projectToDelete.id);
    setProjects(prev => prev.filter(p => p.id !== projectToDelete.id));
    setProjectToDelete(null);
    setIsDeleting(false);
  };

  return (
    <div style={{ minHeight: '100vh', backgroundColor: 'var(--background)', padding: '20px' }}>
      <header style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '30px', backgroundColor: 'var(--white)', padding: '15px 25px', borderRadius: '16px', boxShadow: 'var(--shadow-sm)' }}>
        <h1 style={{ color: 'var(--dark)', fontSize: '1.5rem', fontWeight: 900 }}>Meus Projetos</h1>
        <button className="btn-outline" onClick={async () => { await blqAuth.signOut(); onLogout(); }} style={{ padding: '10px 20px' }}>Sair</button>
      </header>

      <div style={{ marginBottom: '20px' }}>
        <button className="btn-primary" style={{ padding: '12px 25px', fontSize: '1.1rem' }} onClick={() => setShowModal(true)}>
          + Novo Projeto
        </button>
      </div>

      {loading ? (
        <p style={{ color: 'var(--text-muted)', fontWeight: 700 }}>Carregando projetos...</p>
      ) : projects.length === 0 ? (
        <div style={{ backgroundColor: 'var(--white)', padding: '40px', borderRadius: '16px', textAlign: 'center' }}>
          <p style={{ color: 'var(--text-muted)', fontSize: '1.2rem', fontWeight: 700 }}>
            Você ainda não tem projetos. Clique em Novo Projeto para começar!
          </p>
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: '20px' }}>
          {projects.map(proj => (
            <div key={proj.id} style={{ backgroundColor: 'var(--white)', padding: '25px', borderRadius: '16px', boxShadow: 'var(--shadow-sm)', borderTop: '5px solid var(--secondary)', display: 'flex', flexDirection: 'column' }}>
              <h3 style={{ color: 'var(--dark)', marginBottom: '10px', fontSize: '1.4rem', fontWeight: 800 }}>{proj.nome}</h3>
              <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem', marginBottom: '20px', fontWeight: 600 }}>
                Salvo em: {new Date(proj.updated_at).toLocaleDateString('pt-BR')}
              </p>
              <div style={{ display: 'flex', gap: '10px', marginTop: 'auto' }}>
                <button className="btn-secondary" style={{ flex: 1, padding: '10px' }} onClick={() => onOpenIde(proj.id)}>Abrir</button>
                <button className="btn-outline"   style={{ padding: '10px 15px' }}    onClick={() => setProjectToDelete(proj)}>Excluir</button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Modal: Novo Projeto */}
      {showModal && (
        <div className="modal-overlay">
          <form onSubmit={handleCreateProject} style={{ backgroundColor: 'var(--white)', padding: '30px', borderRadius: '24px', width: '90%', maxWidth: '400px', textAlign: 'center', boxShadow: 'var(--shadow-xl)' }}>
            <h2 style={{ marginBottom: '10px', fontWeight: 900 }}>Novo Projeto</h2>
            <input type="text" placeholder="Ex: Robô Dançarino" value={newProjectName}
              onChange={e => setNewProjectName(e.target.value)} disabled={isCreating} autoFocus
              style={{ width: '100%', padding: '15px', borderRadius: '12px', border: '2px solid var(--border)', fontSize: '1.1rem', marginBottom: '12px', fontWeight: 700 }} />
            {createError && <p style={{ color: 'var(--danger)', fontWeight: 700, marginBottom: '12px' }}>{createError}</p>}
            <div style={{ display: 'flex', gap: '10px' }}>
              <button type="button" className="btn-text" style={{ flex: 1 }} onClick={() => { setShowModal(false); setNewProjectName(''); }} disabled={isCreating}>Cancelar</button>
              <button type="submit" className="btn-primary" style={{ flex: 1 }} disabled={isCreating || !newProjectName.trim()}>
                {isCreating ? 'Criando...' : 'Criar!'}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Modal: Confirmar exclusão */}
      {projectToDelete && (
        <div className="modal-overlay">
          <div style={{ backgroundColor: 'var(--white)', padding: '35px', borderRadius: '24px', width: '90%', maxWidth: '400px', textAlign: 'center', boxShadow: 'var(--shadow-xl)' }}>
            <h2 style={{ marginBottom: '10px', fontWeight: 900 }}>Atenção!</h2>
            <p style={{ color: 'var(--text-muted)', marginBottom: '25px', fontWeight: 600 }}>
              Apagar <b style={{ color: 'var(--dark)' }}>{projectToDelete.nome}</b>? Isso não pode ser desfeito.
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

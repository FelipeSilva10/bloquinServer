import { useState } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate, useNavigate, useParams, useLocation } from 'react-router-dom';
import { LoginScreen }      from './screens/LoginScreen';
import { IdeScreen }        from './screens/IdeScreen';
import { StudentDashboard } from './screens/StudentDashboard';
import { TeacherDashboard } from './screens/TeacherDashboard';
import { blqWs }            from './services/wsClient';
import './App.css';

export type UserRole = 'guest' | 'student' | 'teacher' | 'visitor';

function AppRoutes() {
  const [role, setRole] = useState<UserRole>('guest');
  const navigate = useNavigate();

  const handleLogin = (loggedRole: 'student' | 'teacher' | 'visitor') => {
    setRole(loggedRole);
    blqWs.connect();  // inicia WebSocket após login
    if (loggedRole === 'visitor') navigate('/ide');
    else navigate('/dashboard');
  };

  const handleLogout = () => {
    blqWs.disconnect();
    setRole('guest');
    navigate('/');
  };

  const handleBackToDashboard = () => {
    if (role === 'visitor') { setRole('guest'); navigate('/'); }
    else navigate('/dashboard');
  };

  const openIde = (projectId: string | undefined, viewOnly: boolean) => {
    const path = projectId ? `/ide/${projectId}` : '/ide';
    navigate(path, { state: { readOnly: viewOnly } });
  };

  return (
    <Routes>
      <Route path="/" element={
        role === 'guest'
          ? <LoginScreen onLogin={handleLogin} />
          : <Navigate to={role === 'visitor' ? '/ide' : '/dashboard'} replace />
      } />

      <Route path="/dashboard" element={
        role === 'teacher' ? (
          <TeacherDashboard
            onLogout={handleLogout}
            onOpenOwnProject={(id) => openIde(id, false)}
            onInspectStudentProject={(id) => openIde(id, true)}
          />
        ) : role === 'student' ? (
          <StudentDashboard
            onLogout={handleLogout}
            onOpenIde={(id) => openIde(id, false)}
          />
        ) : (
          <Navigate to="/" replace />
        )
      } />

      <Route path="/ide/:projectId?" element={
        role !== 'guest'
          ? <IdeScreenWrapper role={role} onBack={handleBackToDashboard} />
          : <Navigate to="/" replace />
      } />
    </Routes>
  );
}

function IdeScreenWrapper({ role, onBack }: { role: Exclude<UserRole, 'guest'>; onBack: () => void }) {
  const { projectId } = useParams();
  const location = useLocation();
  const readOnly = location.state?.readOnly ?? false;

  return <IdeScreen role={role} readOnly={readOnly} onBack={onBack} projectId={projectId} />;
}

export default function App() {
  return (
    <Router>
      <AppRoutes />
    </Router>
  );
}

import { useState } from 'react';
import { blqAuth, getStoredUser } from '../services/api';
// Logo: copiar de assets/ do desktop ou referenciar pelo caminho público
// import logoCompleta from '../assets/LogoCompleta.png';

interface LoginScreenProps {
  onLogin: (role: 'student' | 'teacher' | 'visitor') => void;
}

export function LoginScreen({ onLogin }: LoginScreenProps) {
  const [email, setEmail]         = useState('');
  const [password, setPassword]   = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError]         = useState('');
  const [loading, setLoading]     = useState(false);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) { setError('Por favor, preencha email e senha.'); return; }

    setLoading(true);
    setError('');

    const { data, error: authError } = await blqAuth.signInWithPassword({
      email: email.trim(),
      password,
    });

    if (authError || !data?.user) {
      setError('Email ou senha incorretos.');
      setLoading(false);
      return;
    }

    // Papel vem do token armazenado pela blqAuth.signInWithPassword
    const user = getStoredUser();
    const role = user?.role;

    setLoading(false);

    if (role === 'teacher')  onLogin('teacher');
    else if (role === 'student') onLogin('student');
    else onLogin('visitor');
  };

  return (
    <div className="login-container">
      <div className="login-card">
        {/* <img src={logoCompleta} alt="bloquin" style={{ height: '50px', marginBottom: '24px' }} /> */}
        <h2 style={{ marginBottom: '8px', fontWeight: 900, color: 'var(--dark)' }}>Bloquin</h2>
        <p style={{ color: 'var(--text-muted)', marginBottom: '24px', fontWeight: 700 }}>
          Programação visual para ESP32
        </p>

        <form className="login-form" onSubmit={handleLogin}>
          <input
            type="text"
            placeholder="Usuário ou email"
            value={email}
            onChange={e => setEmail(e.target.value)}
            disabled={loading}
          />

          <div className="password-wrapper">
            <input
              type={showPassword ? 'text' : 'password'}
              placeholder="Senha"
              value={password}
              onChange={e => setPassword(e.target.value)}
              disabled={loading}
            />
            <button
              type="button"
              className="btn-toggle-password"
              onClick={() => setShowPassword(v => !v)}
              disabled={loading}
            >
              {showPassword ? '🙈' : '👀'}
            </button>
          </div>

          {error && <p style={{ color: 'var(--danger)', fontWeight: 700, margin: '8px 0' }}>{error}</p>}

          <button type="submit" className="btn-primary" disabled={loading} style={{ marginTop: '16px' }}>
            {loading ? 'Entrando...' : 'Entrar'}
          </button>
        </form>

        <div className="login-divider" />

        <button
          type="button"
          className="btn-text"
          onClick={() => onLogin('visitor')}
          disabled={loading}
        >
          Entrar como Visitante
        </button>
      </div>
    </div>
  );
}

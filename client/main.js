/**
 * main.js — Ponto de entrada da SPA.
 * Decide se mostra login ou editor baseado no token em sessão.
 */

import api          from './services/api.js';
import { initLogin  } from './pages/login.js';
import { initEditor } from './pages/editor.js';

// Handler de sessão expirada — volta para login sem recarregar tudo
window.addEventListener('blq:session-expired', () => {
  document.getElementById('page-editor').classList.add('hidden');
  login.show();
});

const login = initLogin((user) => {
  initEditor(user);
});

// Verificar sessão existente ao carregar
if (api.isLoggedIn()) {
  // Valida token no servidor antes de abrir editor
  api.get('/api/auth/me')
    .then(({ user }) => {
      // Token ainda válido — ir direto para o editor
      document.getElementById('page-login').classList.add('hidden');
      initEditor(user);
    })
    .catch(() => {
      // Token expirado ou inválido — mostrar login
      api.clearSession();
      login.show();
    });
} else {
  login.show();
}

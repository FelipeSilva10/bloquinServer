/**
 * pages/login.js
 * Controla a tela de login.
 */

import api from '../services/api.js';

export function initLogin(onSuccess) {
  const page     = document.getElementById('page-login');
  const usernameInput = document.getElementById('login-username');
  const passwordInput = document.getElementById('login-password');
  const errorDiv  = document.getElementById('login-error');
  const loginBtn  = document.getElementById('login-btn');

  function showError(msg) {
    errorDiv.textContent = msg;
    errorDiv.classList.remove('hidden');
  }
  function clearError() {
    errorDiv.classList.add('hidden');
  }

  async function doLogin() {
    clearError();
    const username = usernameInput.value.trim();
    const password = passwordInput.value;

    if (!username || !password) {
      showError('Preencha usuário e senha.');
      return;
    }

    loginBtn.disabled = true;
    loginBtn.textContent = 'Entrando...';

    try {
      const user = await api.login(username, password);
      page.classList.add('hidden');
      onSuccess(user);
    } catch (err) {
      showError(err.message || 'Erro ao fazer login.');
      passwordInput.value = '';
      passwordInput.focus();
    } finally {
      loginBtn.disabled = false;
      loginBtn.textContent = 'Entrar';
    }
  }

  loginBtn.addEventListener('click', doLogin);
  passwordInput.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') doLogin();
  });

  return {
    show() {
      page.classList.remove('hidden');
      usernameInput.focus();
    },
    hide() {
      page.classList.add('hidden');
    }
  };
}

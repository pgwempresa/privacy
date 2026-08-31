(function () {
  'use strict';

  fetch('/api/auth/me', { credentials: 'same-origin' })
    .then(r => r.json())
    .then(d => { if (d && d.authenticated) location.replace('/admin'); })
    .catch(() => {});

  const form = document.getElementById('loginForm');
  const btn = document.getElementById('loginBtn');
  const errBox = document.getElementById('loginError');

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    errBox.hidden = true;
    errBox.textContent = '';
    btn.disabled = true;
    btn.querySelector('.btn-label').textContent = 'Entrando...';

    const username = document.getElementById('username').value.trim();
    const password = document.getElementById('password').value;

    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'same-origin',
        body: JSON.stringify({ username, password })
      });
      if (res.ok) {
        location.replace('/admin');
        return;
      }
      const data = await res.json().catch(() => ({}));
      errBox.textContent = data.error === 'invalid credentials'
        ? 'Usuário ou senha incorretos.'
        : (data.message || data.error || 'Falha ao entrar.');
      errBox.hidden = false;
    } catch {
      errBox.textContent = 'Erro de conexão. Tente novamente.';
      errBox.hidden = false;
    } finally {
      btn.disabled = false;
      btn.querySelector('.btn-label').textContent = 'Entrar';
    }
  });
})();

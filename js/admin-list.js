(function () {
  'use strict';

  const listEl = document.getElementById('modelsList');
  const userEl = document.getElementById('adminUser');
  const toast = document.getElementById('saveToast');

  init();

  async function init() {
    const me = await fetch('/api/auth/me', { credentials: 'same-origin' })
      .then(r => r.json()).catch(() => ({ authenticated: false }));
    if (!me.authenticated) {
      location.replace('/login');
      return;
    }
    userEl.textContent = me.username || '';
    bindUI();
    await loadModels();
  }

  function bindUI() {
    document.getElementById('logoutBtn').addEventListener('click', async () => {
      await fetch('/api/auth/logout', { method: 'POST', credentials: 'same-origin' });
      location.replace('/login');
    });

    const modal = document.getElementById('newModelModal');
    const newBtn = document.getElementById('newModelBtn');
    const closeBtn = document.getElementById('modalCloseBtn');
    const cancelBtn = document.getElementById('modalCancelBtn');
    const form = document.getElementById('newModelForm');
    const errBox = document.getElementById('newModelError');

    function openModal() {
      errBox.hidden = true;
      form.reset();
      modal.hidden = false;
      setTimeout(() => document.getElementById('newSlug').focus(), 50);
    }
    function closeModal() { modal.hidden = true; }

    newBtn.addEventListener('click', openModal);
    closeBtn.addEventListener('click', closeModal);
    cancelBtn.addEventListener('click', closeModal);
    modal.addEventListener('click', (e) => { if (e.target === modal) closeModal(); });

    form.addEventListener('submit', async (e) => {
      e.preventDefault();
      const slug = document.getElementById('newSlug').value.trim().toLowerCase();
      const locale = document.getElementById('newLocale').value;
      errBox.hidden = true;

      const submitBtn = document.getElementById('modalSubmitBtn');
      submitBtn.disabled = true;
      submitBtn.textContent = 'Criando...';

      try {
        const res = await fetch('/api/models', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'same-origin',
          body: JSON.stringify({ slug, locale })
        });
        const data = await res.json().catch(() => ({}));
        if (!res.ok) {
          errBox.textContent = data.message || data.error || 'Falha ao criar modelo.';
          errBox.hidden = false;
          return;
        }
        closeModal();
        showToast('✓ Modelo criado');
        location.href = '/admin/edit/' + slug;
      } catch {
        errBox.textContent = 'Erro de conexão.';
        errBox.hidden = false;
      } finally {
        submitBtn.disabled = false;
        submitBtn.textContent = 'Criar';
      }
    });
  }

  async function loadModels() {
    try {
      const res = await fetch('/api/models', { credentials: 'same-origin' });
      if (res.status === 401) { location.replace('/login'); return; }
      const data = await res.json();
      renderModels(data.models || []);
    } catch {
      listEl.innerHTML = '<div class="models-empty">Erro ao carregar modelos.</div>';
    }
  }

  function renderModels(models) {
    if (!models.length) {
      listEl.innerHTML = `
        <div class="models-empty">
          <div class="models-empty-icon">📭</div>
          <p><strong>Nenhum modelo ainda.</strong></p>
          <p>Clique em "+ Novo modelo" para criar a primeira página.</p>
        </div>
      `;
      return;
    }
    listEl.innerHTML = '';
    models.forEach(m => {
      const card = document.createElement('div');
      card.className = 'model-card';
      const flag = m.locale === 'pt-PT' ? '🇵🇹' : (m.locale === 'es-MX' ? '🇲🇽' : '🇧🇷');
      const cur = m.currency === 'EUR' ? '€' : (m.currency === 'MXN' ? '$ MXN' : 'R$');
      card.innerHTML = `
        <div class="model-card-head">
          <img class="model-avatar" src="${esc(m.avatar || '')}" alt="" onerror="this.style.visibility='hidden'" />
          <div class="model-meta">
            <div class="model-name">${esc(m.name || m.slug)}</div>
            <div class="model-username">@${esc(m.username || m.slug)}</div>
          </div>
          <div class="model-flag" title="${m.locale}">${flag} <span class="model-currency">${cur}</span></div>
        </div>
        <div class="model-slug">/m/${esc(m.slug)}</div>
        <div class="model-card-actions">
          <a class="btn-ghost" href="/m/${encodeURIComponent(m.slug)}" target="_blank">Ver ↗</a>
          <a class="btn-primary" href="/admin/edit/${encodeURIComponent(m.slug)}">Editar</a>
          <button class="btn-danger" data-slug="${esc(m.slug)}" type="button">Excluir</button>
        </div>
      `;
      card.querySelector('.btn-danger').addEventListener('click', () => deleteModel(m.slug, m.name || m.slug));
      listEl.appendChild(card);
    });
  }

  async function deleteModel(slug, label) {
    if (!confirm(`Excluir o modelo "${label}"? Esta ação não pode ser desfeita.`)) return;
    try {
      const res = await fetch('/api/models/' + encodeURIComponent(slug), {
        method: 'DELETE', credentials: 'same-origin'
      });
      if (res.ok) {
        showToast('✓ Modelo excluído');
        loadModels();
      } else {
        showToast('Falha ao excluir', true);
      }
    } catch {
      showToast('Erro de conexão', true);
    }
  }

  function showToast(msg, isError) {
    toast.textContent = msg;
    toast.style.background = isError ? '#e5484d' : '#2dc26b';
    toast.hidden = false;
    clearTimeout(showToast._t);
    showToast._t = setTimeout(() => { toast.hidden = true; }, 2200);
  }

  function esc(s) {
    return String(s == null ? '' : s).replace(/[&<>"']/g, ch => ({
      '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'
    }[ch]));
  }
})();

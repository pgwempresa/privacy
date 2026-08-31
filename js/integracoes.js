(function () {
  'use strict';

  const toast = document.getElementById('saveToast');

  // In-memory state for pixel arrays. UI is dynamic — we render rows from these.
  const PIXELS = { meta: [], tiktok: [] };

  const els = {
    waymb: {
      client_id:     document.getElementById('waymbClientId'),
      account_email: document.getElementById('waymbAccountEmail'),
      client_secret: document.getElementById('waymbClientSecret'),
      notify_created: document.getElementById('notifyCreated'),
      notify_paid:    document.getElementById('notifyPaid'),
      status:         document.querySelector('[data-status="waymb"]'),
      saveBtn:        document.querySelector('[data-save="waymb"]'),
      form:           document.querySelector('[data-form="waymb"]')
    },
    nexuspag: {
      api_key: document.getElementById('nexuspagApiKey'),
      status:  document.querySelector('[data-status="nexuspag"]'),
      saveBtn: document.querySelector('[data-save="nexuspag"]'),
      form:    document.querySelector('[data-form="nexuspag"]')
    },
    xpag: {
      client_id:     document.getElementById('xpagClientId'),
      client_secret: document.getElementById('xpagClientSecret'),
      status:        document.querySelector('[data-status="xpag"]'),
      saveBtn:       document.querySelector('[data-save="xpag"]'),
      form:          document.querySelector('[data-form="xpag"]')
    },
    utmfy: {
      api_token: document.getElementById('utmfyApiToken'),
      status:    document.querySelector('[data-status="utmfy"]'),
      saveBtn:   document.querySelector('[data-save="utmfy"]'),
      form:      document.querySelector('[data-form="utmfy"]')
    },
    meta: {
      list:    document.querySelector('[data-pixel-list="meta"]'),
      addBtn:  document.querySelector('[data-add-pixel="meta"]'),
      status:  document.querySelector('[data-status="meta"]'),
      saveBtn: document.querySelector('[data-save="meta"]'),
      form:    document.querySelector('[data-form="meta"]')
    },
    tiktok: {
      list:    document.querySelector('[data-pixel-list="tiktok"]'),
      addBtn:  document.querySelector('[data-add-pixel="tiktok"]'),
      status:  document.querySelector('[data-status="tiktok"]'),
      saveBtn: document.querySelector('[data-save="tiktok"]'),
      form:    document.querySelector('[data-form="tiktok"]')
    },
    custom: {
      script:  document.getElementById('customHeadScript'),
      status:  document.querySelector('[data-status="custom"]'),
      saveBtn: document.querySelector('[data-save="custom"]'),
      form:    document.querySelector('[data-form="custom"]')
    }
  };

  init();

  async function init() {
    const me = await fetch('/api/auth/me', { credentials: 'same-origin' })
      .then(r => r.json()).catch(() => ({ authenticated: false }));
    if (!me.authenticated) {
      location.replace('/login');
      return;
    }

    const base = location.origin;
    document.getElementById('waymbWebhookUrl').value = base + '/api/webhooks/waymb';
    document.getElementById('createDepositUrl').value = base + '/api/deposits';
    const nxUrl = document.getElementById('nexuspagWebhookUrl');
    if (nxUrl) nxUrl.value = base + '/api/webhooks/nexuspag';
    const xpagUrl = document.getElementById('xpagWebhookUrl');
    if (xpagUrl) xpagUrl.value = base + '/api/webhooks/xpag';

    document.getElementById('logoutBtn').addEventListener('click', async () => {
      await fetch('/api/auth/logout', { method: 'POST', credentials: 'same-origin' });
      location.replace('/login');
    });

    document.querySelectorAll('[data-copy]').forEach(btn => {
      btn.addEventListener('click', () => copy(btn.dataset.copy, btn));
    });

    // Collapse / expand: clicking the header toggles the card. Submitting an
    // expanded card is the only way to save.
    document.querySelectorAll('[data-toggle]').forEach(head => {
      head.addEventListener('click', () => toggleCard(head));
    });

    els.waymb.form.addEventListener('submit', (e) => { e.preventDefault(); saveWaymb(); });
    if (els.nexuspag.form) {
      els.nexuspag.form.addEventListener('submit', (e) => { e.preventDefault(); saveNexuspag(); });
    }
    if (els.xpag.form) {
      els.xpag.form.addEventListener('submit', (e) => { e.preventDefault(); saveXpag(); });
    }
    els.utmfy.form.addEventListener('submit', (e) => { e.preventDefault(); saveUtmfy(); });
    els.meta.form.addEventListener('submit', (e) => { e.preventDefault(); savePixels('meta', 'Meta Pixel salvo'); });
    els.tiktok.form.addEventListener('submit', (e) => { e.preventDefault(); savePixels('tiktok', 'TikTok Pixel salvo'); });
    els.custom.form.addEventListener('submit', (e) => { e.preventDefault(); saveCustomScript(); });

    els.meta.addBtn.addEventListener('click', () => { addPixelRow('meta', ''); });
    els.tiktok.addBtn.addEventListener('click', () => { addPixelRow('tiktok', ''); });

    await load();
  }

  function toggleCard(head) {
    const card = head.closest('.integration-card');
    if (!card) return;
    const expanded = !card.classList.contains('is-collapsed');
    if (expanded) {
      card.classList.add('is-collapsed');
      head.setAttribute('aria-expanded', 'false');
    } else {
      card.classList.remove('is-collapsed');
      head.setAttribute('aria-expanded', 'true');
    }
  }

  async function load() {
    try {
      const res = await fetch('/api/gateways', { credentials: 'same-origin' });
      if (res.status === 401) { location.replace('/login'); return; }
      const data = await res.json();
      const w = (data && data.waymb) || {};
      const n = (data && data.nexuspag) || {};
      const x = (data && data.xpag) || {};
      const u = (data && data.utmfy) || {};
      const p = (data && data.pixels) || {};

      els.waymb.client_id.value     = w.client_id || '';
      els.waymb.account_email.value = w.account_email || '';
      els.waymb.notify_created.value = data.notify_url_created || '';
      els.waymb.notify_paid.value    = data.notify_url_paid || '';

      applySecret(els.waymb.client_secret, w.client_secret_masked, w.client_secret_set);
      applySecret(els.nexuspag.api_key,    n.api_key_masked,       n.api_key_set);
      els.xpag.client_id.value = x.client_id || '';
      applySecret(els.xpag.client_secret, x.client_secret_masked, x.client_secret_set);
      applySecret(els.utmfy.api_token,     u.api_token_masked,     u.api_token_set);

      // Render pixel rows from the server's source of truth.
      PIXELS.meta   = Array.isArray(p.meta)   ? p.meta.slice()   : [];
      PIXELS.tiktok = Array.isArray(p.tiktok) ? p.tiktok.slice() : [];
      renderPixelList('meta');
      renderPixelList('tiktok');

      els.custom.script.value = data.custom_head_script || '';

      refreshAllStatuses(data);
    } catch {
      showToast('Erro ao carregar configurações', true);
    }
  }

  function refreshAllStatuses(data) {
    const w = (data && data.waymb) || {};
    const n = (data && data.nexuspag) || {};
    const x = (data && data.xpag) || {};
    const u = (data && data.utmfy) || {};
    const p = (data && data.pixels) || {};
    setStatus(els.waymb.status,    !!(w.client_id && w.client_secret_set && w.account_email));
    setStatus(els.nexuspag.status, !!n.api_key_set);
    setStatus(els.xpag.status,     !!(x.client_id && x.client_secret_set));
    setStatus(els.utmfy.status,    !!u.api_token_set);
    setStatusCount(els.meta.status,   (p.meta   || []).length);
    setStatusCount(els.tiktok.status, (p.tiktok || []).length);
    setStatus(els.custom.status, !!(data && data.custom_head_script && data.custom_head_script.trim()));
  }

  function applySecret(input, masked, isSet) {
    if (!input) return;
    input.value = '';
    if (isSet) {
      input.placeholder = `Atual: ${masked} — deixe em branco para manter`;
    } else {
      input.placeholder = 'Cole a chave';
    }
  }

  function setStatus(el, configured) {
    el.textContent = configured ? 'configurado' : 'não configurado';
    el.classList.toggle('is-on', configured);
    el.classList.toggle('is-off', !configured);
  }

  function setStatusCount(el, n) {
    if (n > 0) {
      el.textContent = n === 1 ? '1 pixel' : `${n} pixels`;
      el.classList.add('is-on');
      el.classList.remove('is-off');
    } else {
      setStatus(el, false);
    }
  }

  // ---- Multi-pixel rows ----

  function renderPixelList(kind) {
    const container = els[kind].list;
    container.innerHTML = '';
    if (!PIXELS[kind].length) {
      addPixelRow(kind, '');
      return;
    }
    PIXELS[kind].forEach((id, idx) => buildPixelRow(kind, id, idx));
  }

  function addPixelRow(kind, value) {
    PIXELS[kind].push(value || '');
    buildPixelRow(kind, value || '', PIXELS[kind].length - 1);
  }

  function buildPixelRow(kind, value, idx) {
    const row = document.createElement('div');
    row.className = 'pixel-row';
    row.dataset.kind = kind;
    row.dataset.idx = String(idx);

    const input = document.createElement('input');
    input.type = 'text';
    input.value = value || '';
    input.placeholder = kind === 'meta' ? 'ex: 1234567890123456' : 'ex: C12345ABCD6789EFG';
    input.maxLength = 80;
    input.addEventListener('input', () => {
      PIXELS[kind][idx] = input.value.trim();
    });

    const remove = document.createElement('button');
    remove.type = 'button';
    remove.className = 'btn-ghost pixel-row-remove';
    remove.setAttribute('aria-label', 'Remover Pixel ID');
    remove.textContent = '×';
    remove.addEventListener('click', () => {
      PIXELS[kind].splice(idx, 1);
      renderPixelList(kind);
    });

    row.appendChild(input);
    row.appendChild(remove);
    els[kind].list.appendChild(row);
  }

  // ---- Save handlers ----

  async function saveWaymb() {
    const waymb = {
      client_id:     els.waymb.client_id.value.trim(),
      account_email: els.waymb.account_email.value.trim()
    };
    const secret = els.waymb.client_secret.value.trim();
    if (secret) waymb.client_secret = secret;
    await save(els.waymb.saveBtn, {
      waymb,
      notify_url_created: els.waymb.notify_created.value.trim(),
      notify_url_paid:    els.waymb.notify_paid.value.trim()
    }, 'WayMB salvo');
  }

  async function saveNexuspag() {
    const apiKey = els.nexuspag.api_key.value.trim();
    const nexuspag = {};
    if (apiKey) nexuspag.api_key = apiKey;
    await save(els.nexuspag.saveBtn, { nexuspag }, 'NexusPag salvo');
  }

  async function saveXpag() {
    const xpag = { client_id: els.xpag.client_id.value.trim() };
    const secret = els.xpag.client_secret.value.trim();
    if (secret) xpag.client_secret = secret;
    await save(els.xpag.saveBtn, { xpag }, 'XPag salva');
  }

  async function saveUtmfy() {
    const token = els.utmfy.api_token.value.trim();
    const utmfy = {};
    if (token) utmfy.api_token = token;
    await save(els.utmfy.saveBtn, { utmfy }, 'UTMfy salvo');
  }

  async function savePixels(kind, successMsg) {
    // Server dedupes + caps + drops empties — we send the full list as the user
    // sees it. Leaving all rows blank effectively clears that pixel network.
    const list = PIXELS[kind].map(s => String(s || '').trim()).filter(Boolean);
    const body = { pixels: { [kind]: list } };
    await save(els[kind].saveBtn, body, successMsg);
  }

  async function saveCustomScript() {
    await save(els.custom.saveBtn, { custom_head_script: els.custom.script.value }, 'Script salvo');
  }

  async function save(btn, body, successMsg) {
    btn.disabled = true;
    const orig = btn.textContent;
    btn.textContent = 'Salvando...';
    try {
      const res = await fetch('/api/gateways', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'same-origin',
        body: JSON.stringify(body)
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        showToast(data.message || data.error || 'Falha ao salvar', true);
        return;
      }
      showToast('✓ ' + successMsg);
      // Refresh masked placeholders + statuses + pixel arrays from the response.
      const w = (data && data.waymb) || {};
      const n = (data && data.nexuspag) || {};
      const x = (data && data.xpag) || {};
      const u = (data && data.utmfy) || {};
      const p = (data && data.pixels) || {};
      applySecret(els.waymb.client_secret, w.client_secret_masked, w.client_secret_set);
      applySecret(els.nexuspag.api_key,    n.api_key_masked,       n.api_key_set);
      els.xpag.client_id.value = x.client_id || '';
      applySecret(els.xpag.client_secret, x.client_secret_masked, x.client_secret_set);
      applySecret(els.utmfy.api_token,     u.api_token_masked,     u.api_token_set);
      PIXELS.meta   = Array.isArray(p.meta)   ? p.meta.slice()   : [];
      PIXELS.tiktok = Array.isArray(p.tiktok) ? p.tiktok.slice() : [];
      renderPixelList('meta');
      renderPixelList('tiktok');
      els.custom.script.value = data.custom_head_script || '';
      refreshAllStatuses(data);
    } catch {
      showToast('Erro de conexão', true);
    } finally {
      btn.disabled = false;
      btn.textContent = orig;
    }
  }

  function copy(id, btn) {
    const el = document.getElementById(id);
    if (!el) return;
    el.select();
    try {
      navigator.clipboard.writeText(el.value);
      const orig = btn.textContent;
      btn.textContent = 'Copiado ✓';
      setTimeout(() => { btn.textContent = orig; }, 1400);
    } catch {
      document.execCommand('copy');
    }
  }

  function showToast(msg, isError) {
    toast.textContent = msg;
    toast.style.background = isError ? '#e5484d' : '#2dc26b';
    toast.hidden = false;
    clearTimeout(showToast._t);
    showToast._t = setTimeout(() => { toast.hidden = true; }, 2200);
  }
})();

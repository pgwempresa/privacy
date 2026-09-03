(function () {
  'use strict';

  // Vercel rewrite serves edit.html for /admin/edit/<slug> but the browser URL
  // keeps the path; the ?slug= query is server-side only. Fall back to path.
  const slug = new URLSearchParams(location.search).get('slug')
    || (location.pathname.match(/^\/admin\/edit\/([^\/?#]+)/) || [])[1];
  if (!slug) { location.replace('/admin'); return; }

  const $ = id => document.getElementById(id);
  const toast = $('saveToast');

  let model = null;
  let dirty = false;

  init();

  async function init() {
    const me = await fetch('/api/auth/me', { credentials: 'same-origin' })
      .then(r => r.json()).catch(() => ({ authenticated: false }));
    if (!me.authenticated) { location.replace('/login'); return; }

    try {
      const res = await fetch('/api/models/' + encodeURIComponent(slug), { credentials: 'same-origin' });
      if (res.status === 404) { alert('Modelo não encontrado.'); location.replace('/admin'); return; }
      const data = await res.json();
      model = data.model;
      $('editTitle').textContent = (model.name || slug);
      $('editSubtitle').innerHTML = `URL pública: <a href="/m/${encodeURIComponent(slug)}" target="_blank">/m/${escHtml(slug)}</a>`;
      $('viewPublicLink').href = '/m/' + encodeURIComponent(slug);
      fillForm();
      bindForm();
    } catch (e) {
      alert('Erro ao carregar modelo.');
    }
  }

  function fillForm() {
    // Migration: older models predate `delivery`.
    if (!model.delivery || typeof model.delivery !== 'object') {
      model.delivery = { mode: 'inline', url: '', message: '' };
    }
    const dMode = model.delivery.mode === 'redirect' ? 'redirect' : 'inline';
    $('deliveryModeInline').checked = dMode === 'inline';
    $('deliveryModeRedirect').checked = dMode === 'redirect';
    $('deliveryUrlInput').value = model.delivery.url || '';
    $('deliveryMessageInput').value = model.delivery.message || '';

    // Migration: older models predate `cloaker`.
    if (!model.cloaker || typeof model.cloaker !== 'object') {
      model.cloaker = { enabled: false, redirect_url: 'https://google.com' };
    }
    $('cloakerEnabledInput').checked = !!model.cloaker.enabled;
    $('cloakerUrlInput').value = model.cloaker.redirect_url || '';

    // Migration: older models predate `tsl`.
    if (!model.tsl || typeof model.tsl !== 'object') {
      model.tsl = { enabled: false, amount: 0 };
    }
    $('tslEnabledInput').checked = !!model.tsl.enabled;
    $('tslAmountInput').value = model.tsl.amount ? String(model.tsl.amount) : '';

    $('localeInput').value = model.locale || 'pt-BR';
    $('currencyInput').value = model.currency || 'BRL';
    $('gatewayInput').value = model.gateway
      || (model.currency === 'EUR' ? 'waymb' : (model.currency === 'MXN' ? 'xpag' : 'nexuspag'));
    model.spei_mode = model.spei_mode === 'fixed' ? 'fixed' : 'api';
    $('speiModeInput').value = model.spei_mode;
    updateSpeiModeVisibility();

    $('avatarPreview').src = model.avatar || '';
    $('coverPreview').src = model.cover || '';
    $('avatarUrl').value = isHttpUrl(model.avatar) ? model.avatar : '';
    $('coverUrl').value = isHttpUrl(model.cover) ? model.cover : '';

    // Migration: old models stored a single `lockedPreview`; convert to posts.
    if (!Array.isArray(model.posts) || !model.posts.length) {
      if (model.lockedPreview) {
        const s = model.stats || {};
        model.posts = [{
          image: model.lockedPreview,
          photos: s.photos || 0,
          videos: s.videos || 0,
          likes:  s.likes  || 0,
          comments: 0
        }];
      } else {
        model.posts = [];
      }
    }
    delete model.lockedPreview;

    $('nameInput').value = model.name || '';
    $('usernameInput').value = model.username || '';
    $('bioInput').value = model.bio || '';
    $('bioCount').textContent = (model.bio || '').length;
    $('locationInput').value = model.location || '';

    const stats = model.stats || {};
    $('photosInput').value = stats.photos || 0;
    $('videosInput').value = stats.videos || 0;
    $('lockedInput').value = stats.locked || 0;
    $('likesInput').value = stats.likes || 0;
    $('postCountInput').value = model.postCount || 0;
    $('mediaCountInput').value = model.mediaCount || 0;

    const social = model.social || {};
    $('instagramInput').value = social.instagram || '';
    $('twitterInput').value = social.twitter || '';
    $('tiktokInput').value = social.tiktok || '';

    renderList('plansEditor', 'plans');
    renderList('promosEditor', 'promotions');
    renderPostsEditor();
  }

  function bindForm() {
    function bindText(id, setter) {
      $(id).addEventListener('input', () => { setter($(id).value); markDirty(); });
    }
    bindText('nameInput', v => model.name = v);
    bindText('bioInput', v => { model.bio = v; $('bioCount').textContent = v.length; });
    bindText('locationInput', v => model.location = v);

    $('usernameInput').addEventListener('input', () => {
      const cleaned = $('usernameInput').value.replace(/^@+/, '').replace(/\s+/g, '');
      $('usernameInput').value = cleaned;
      model.username = cleaned;
      markDirty();
    });

    bindText('photosInput', v => model.stats.photos = v);
    bindText('videosInput', v => model.stats.videos = v);
    bindText('lockedInput', v => model.stats.locked = v);
    bindText('likesInput', v => model.stats.likes = v);
    bindText('postCountInput', v => model.postCount = v);
    bindText('mediaCountInput', v => model.mediaCount = v);

    $('instagramInput').addEventListener('input', () => { model.social.instagram = $('instagramInput').value.trim(); markDirty(); });
    $('twitterInput').addEventListener('input', () => { model.social.twitter = $('twitterInput').value.trim(); markDirty(); });
    $('tiktokInput').addEventListener('input', () => { model.social.tiktok = $('tiktokInput').value.trim(); markDirty(); });

    $('localeInput').addEventListener('change', changeLocaleAndCountry);
    $('currencyInput').addEventListener('change', () => {
      model.currency = $('currencyInput').value;
      renderList('plansEditor', 'plans');
      renderList('promosEditor', 'promotions');
      markDirty();
    });
    $('gatewayInput').addEventListener('change', () => {
      model.gateway = $('gatewayInput').value;
      updateSpeiModeVisibility();
      markDirty();
    });
    $('speiModeInput').addEventListener('change', () => {
      model.spei_mode = $('speiModeInput').value === 'fixed' ? 'fixed' : 'api';
      updateSpeiModeVisibility();
      markDirty();
    });

    document.querySelectorAll('input[name="deliveryMode"]').forEach(r => {
      r.addEventListener('change', () => {
        model.delivery = model.delivery || { mode: 'inline', url: '', message: '' };
        model.delivery.mode = r.value;
        markDirty();
      });
    });
    $('deliveryUrlInput').addEventListener('input', () => {
      model.delivery = model.delivery || { mode: 'inline', url: '', message: '' };
      model.delivery.url = $('deliveryUrlInput').value.trim();
      markDirty();
    });
    $('deliveryMessageInput').addEventListener('input', () => {
      model.delivery = model.delivery || { mode: 'inline', url: '', message: '' };
      model.delivery.message = $('deliveryMessageInput').value;
      markDirty();
    });

    $('cloakerEnabledInput').addEventListener('change', () => {
      model.cloaker = model.cloaker || { enabled: false, redirect_url: 'https://google.com' };
      model.cloaker.enabled = $('cloakerEnabledInput').checked;
      markDirty();
    });
    $('cloakerUrlInput').addEventListener('input', () => {
      model.cloaker = model.cloaker || { enabled: false, redirect_url: 'https://google.com' };
      model.cloaker.redirect_url = $('cloakerUrlInput').value.trim();
      markDirty();
    });

    $('tslEnabledInput').addEventListener('change', () => {
      model.tsl = model.tsl || { enabled: false, amount: 0 };
      model.tsl.enabled = $('tslEnabledInput').checked;
      markDirty();
    });
    $('tslAmountInput').addEventListener('input', () => {
      model.tsl = model.tsl || { enabled: false, amount: 0 };
      const raw = $('tslAmountInput').value.replace(',', '.');
      const n = Number(raw);
      model.tsl.amount = isFinite(n) && n > 0 ? Math.round(n * 100) / 100 : 0;
      markDirty();
    });

    $('testPaymentBtn').addEventListener('click', async () => {
      // If there are unsaved delivery edits, save first so the preview reflects them.
      if (dirty) {
        if (!confirm('Você tem alterações não salvas. Salvar antes de testar?')) return;
        await save();
        if (dirty) return; // save failed
      }
      const btn = $('testPaymentBtn');
      const orig = btn.textContent;
      btn.disabled = true;
      btn.textContent = 'Criando depósito de teste…';
      try {
        const res = await fetch('/api/admin/test-deposit', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'same-origin',
          body: JSON.stringify({ slug })
        });
        const data = await res.json().catch(() => ({}));
        if (!res.ok) {
          showToast(data.message || data.error || 'Falha ao criar teste', true);
          return;
        }
        window.open(data.view_url, '_blank', 'noopener');
        showToast('✓ Depósito de teste criado');
      } catch {
        showToast('Erro de conexão', true);
      } finally {
        btn.disabled = false;
        btn.textContent = orig;
      }
    });

    document.querySelectorAll('input[type="file"][data-target]').forEach(inp => {
      inp.addEventListener('change', async e => {
        const file = e.target.files[0];
        if (!file) return;
        if (!(file.type || '').startsWith('image/')) {
          alert('Selecione um arquivo de imagem.');
          inp.value = '';
          return;
        }
        try {
          const target = inp.dataset.target;
          const publicUrl = await uploadMedia(file, target, 20_000_000);
          if (inp.dataset.target === 'avatar') {
            model.avatar = publicUrl;
            $('avatarPreview').src = publicUrl;
            $('avatarUrl').value = '';
          } else {
            model.cover = publicUrl;
            $('coverPreview').src = publicUrl;
            $('coverUrl').value = '';
          }
          markDirty();
          showToast('✓ Imagem enviada');
        } catch (err) {
          showToast('Falha no upload: ' + err.message, true);
        } finally {
          inp.value = '';
        }
      });
    });

    $('avatarUrl').addEventListener('input', () => {
      const v = $('avatarUrl').value.trim();
      if (v) { model.avatar = v; $('avatarPreview').src = v; markDirty(); }
    });
    $('coverUrl').addEventListener('input', () => {
      const v = $('coverUrl').value.trim();
      if (v) { model.cover = v; $('coverPreview').src = v; markDirty(); }
    });
    document.querySelectorAll('button[data-clear]').forEach(btn => {
      btn.addEventListener('click', () => {
        const t = btn.dataset.clear;
        if (t === 'avatar') {
          model.avatar = '';
          $('avatarPreview').removeAttribute('src');
          $('avatarUrl').value = '';
        } else {
          model.cover = '';
          $('coverPreview').removeAttribute('src');
          $('coverUrl').value = '';
        }
        markDirty();
      });
    });

    $('addPlanBtn').addEventListener('click', () => {
      model.plans = model.plans || [];
      model.plans.push({ duration: model.locale === 'pt-PT' ? 'Novo plano' : 'Novo plano', price: 0 });
      renderList('plansEditor', 'plans');
      markDirty();
    });
    $('addPromoBtn').addEventListener('click', () => {
      model.promotions = model.promotions || [];
      model.promotions.push({ duration: 'Nova promoção', price: 0 });
      renderList('promosEditor', 'promotions');
      markDirty();
    });
    $('addPostBtn').addEventListener('click', () => {
      model.posts = model.posts || [];
      model.posts.push({ image: '', video: '', photos: 0, videos: 0, likes: 0, comments: 0, blur: 100 });
      renderPostsEditor();
      markDirty();
    });

    $('editForm').addEventListener('submit', e => { e.preventDefault(); save(); });
    $('saveBtn').addEventListener('click', save);
    $('saveBtnBottom').addEventListener('click', save);
    $('logoutBtn').addEventListener('click', async () => {
      await fetch('/api/auth/logout', { method: 'POST', credentials: 'same-origin' });
      location.replace('/login');
    });

    window.addEventListener('beforeunload', e => {
      if (dirty) { e.preventDefault(); e.returnValue = ''; }
    });
  }

  function renderPostsEditor() {
    const container = $('postsEditor');
    container.innerHTML = '';
    const arr = model.posts = model.posts || [];
    arr.forEach((post, idx) => {
      const card = document.createElement('div');
      card.className = 'post-edit-card';
      const hasVideo = !!post.video;
      const currentMedia = hasVideo ? post.video : post.image;
      const urlForInput = isHttpUrl(currentMedia) ? currentMedia : '';
      card.innerHTML = `
        <div class="post-edit-head">
          <strong>Publicação ${idx + 1}</strong>
          <button type="button" class="remove-btn" title="Remover" aria-label="Remover">×</button>
        </div>
        <div class="post-edit-body">
          <div class="image-edit-col">
            <label>Mídia (imagem ou vídeo · aparece desfocada)</label>
            <div class="image-preview cover-preview post-media-preview">
              <img class="post-img-preview" src="${hasVideo ? '' : escAttr(post.image)}" alt="" ${hasVideo ? 'hidden' : ''} />
              <video class="post-vid-preview" src="${hasVideo ? escAttr(post.video) : ''}" ${hasVideo ? '' : 'hidden'} muted loop playsinline autoplay></video>
            </div>
            <div class="image-actions">
              <label class="btn-ghost file-btn">
                Enviar arquivo
                <input type="file" accept="image/*,video/*" class="post-img-file" hidden />
              </label>
              <button type="button" class="btn-ghost post-img-clear">Limpar</button>
            </div>
            <input type="url" class="post-img-url" placeholder="ou cole uma URL https://… (imagem ou vídeo)" value="${escAttr(urlForInput)}" />
            <small class="hint">Vídeos: máx. ~15 MB, formato MP4/WebM. Vão tocar em looping mudo.</small>
          </div>
          <div class="post-right-col">
            <div class="post-stats-grid">
              <div class="form-field">
                <label>📷 Fotos</label>
                <input type="text" class="post-stat" data-stat="photos" inputmode="numeric" value="${escAttr(post.photos)}" />
              </div>
              <div class="form-field">
                <label>🎬 Vídeos</label>
                <input type="text" class="post-stat" data-stat="videos" inputmode="numeric" value="${escAttr(post.videos)}" />
              </div>
              <div class="form-field">
                <label>❤ Curtidas</label>
                <input type="text" class="post-stat" data-stat="likes" inputmode="numeric" value="${escAttr(post.likes)}" />
              </div>
              <div class="form-field">
                <label>💬 Comentários</label>
                <input type="text" class="post-stat" data-stat="comments" inputmode="numeric" value="${escAttr(post.comments)}" />
              </div>
            </div>
            <div class="form-field blur-field">
              <label>
                <input type="checkbox" class="post-blur-toggle" ${(post.blur ?? 100) > 0 ? 'checked' : ''} />
                Aplicar blur na imagem
              </label>
              <div class="blur-slider-row">
                <input type="range" class="post-blur-range" min="0" max="100" step="5" value="${escAttr(post.blur ?? 100)}" />
                <span class="post-blur-value">${escAttr(post.blur ?? 100)}%</span>
              </div>
            </div>
          </div>
        </div>
      `;

      card.querySelector('.remove-btn').addEventListener('click', () => {
        arr.splice(idx, 1);
        renderPostsEditor();
        markDirty();
      });

      const imgPreview = card.querySelector('.post-img-preview');
      const vidPreview = card.querySelector('.post-vid-preview');
      const urlInput = card.querySelector('.post-img-url');

      function showMedia(kind, src) {
        if (kind === 'video') {
          vidPreview.src = src;
          vidPreview.hidden = false;
          imgPreview.hidden = true;
          imgPreview.removeAttribute('src');
        } else if (kind === 'image') {
          imgPreview.src = src;
          imgPreview.hidden = false;
          vidPreview.hidden = true;
          vidPreview.removeAttribute('src');
        } else {
          imgPreview.removeAttribute('src');
          vidPreview.removeAttribute('src');
          imgPreview.hidden = true;
          vidPreview.hidden = true;
        }
      }

      card.querySelector('.post-img-file').addEventListener('change', async e => {
        const file = e.target.files[0];
        if (!file) return;
        const isVideo = (file.type || '').startsWith('video/');
        // Files upload directly to Supabase via signed URL, bypassing the
        // Vercel Function request-body limit.
        const max = isVideo ? 50_000_000 : 20_000_000;
        if (file.size > max) {
          const limit = isVideo ? '~50 MB' : '~20 MB';
          alert(`Arquivo muito grande. Máximo ${limit}.`);
          e.target.value = '';
          return;
        }

        if (isVideo) {
          const fileLabel = e.target.closest('label');
          if (fileLabel) fileLabel.style.opacity = '0.5';
          e.target.disabled = true;
          showToast('Enviando vídeo…');
          // Keep the toast visible for the whole upload (default auto-hides after 1.8s).
          clearTimeout(showToast._t);
          try {
            const publicUrl = await uploadMedia(file, `post-${idx}-video`, max);

            arr[idx].video = publicUrl;
            arr[idx].image = '';
            showMedia('video', publicUrl);
            urlInput.value = '';
            markDirty();
            showToast('✓ Vídeo enviado');
          } catch (err) {
            showToast('Falha no upload: ' + err.message, true);
          } finally {
            e.target.value = '';
            e.target.disabled = false;
            if (fileLabel) fileLabel.style.opacity = '';
          }
          return;
        }

        try {
          const publicUrl = await uploadMedia(file, `post-${idx}`, max);
          arr[idx].image = publicUrl;
          arr[idx].video = '';
          showMedia('image', publicUrl);
          urlInput.value = '';
          markDirty();
          showToast('✓ Imagem enviada');
        } catch (err) {
          showToast('Falha no upload: ' + err.message, true);
        } finally {
          e.target.value = '';
        }
      });

      urlInput.addEventListener('input', () => {
        const v = urlInput.value.trim();
        if (!v) return;
        // Heuristic: if URL ends with a video extension, treat as video.
        const isVideo = /\.(mp4|webm|mov|m4v|ogv)(\?.*)?$/i.test(v);
        if (isVideo) {
          arr[idx].video = v;
          arr[idx].image = '';
          showMedia('video', v);
        } else {
          arr[idx].image = v;
          arr[idx].video = '';
          showMedia('image', v);
        }
        markDirty();
      });

      card.querySelector('.post-img-clear').addEventListener('click', () => {
        arr[idx].image = '';
        arr[idx].video = '';
        urlInput.value = '';
        showMedia(null);
        markDirty();
      });

      card.querySelectorAll('.post-stat').forEach(inp => {
        inp.addEventListener('input', () => {
          const k = inp.dataset.stat;
          const n = Number(String(inp.value).replace(/[^\d]/g, ''));
          arr[idx][k] = isFinite(n) ? n : 0;
          markDirty();
        });
      });

      const blurToggle = card.querySelector('.post-blur-toggle');
      const blurRange  = card.querySelector('.post-blur-range');
      const blurValue  = card.querySelector('.post-blur-value');
      blurToggle.addEventListener('change', () => {
        if (blurToggle.checked) {
          const v = Number(blurRange.value) || 100;
          const next = v > 0 ? v : 100;
          arr[idx].blur = next;
          blurRange.value = next;
          blurValue.textContent = next + '%';
          blurRange.disabled = false;
        } else {
          arr[idx].blur = 0;
          blurValue.textContent = '0%';
          blurRange.disabled = true;
        }
        markDirty();
      });
      blurRange.addEventListener('input', () => {
        const v = Number(blurRange.value) || 0;
        arr[idx].blur = v;
        blurValue.textContent = v + '%';
        blurToggle.checked = v > 0;
        markDirty();
      });
      // Initial disabled state mirrors the toggle.
      if (!blurToggle.checked) blurRange.disabled = true;

      container.appendChild(card);
    });
  }

  async function changeLocaleAndCountry() {
    const configs = {
      'pt-BR': { currency: 'BRL', gateway: 'nexuspag', country: 'Brasil' },
      'pt-PT': { currency: 'EUR', gateway: 'waymb', country: 'Portugal' },
      'es-MX': { currency: 'MXN', gateway: 'xpag', country: 'México' }
    };
    const nextLocale = $('localeInput').value;
    const next = configs[nextLocale] || configs['pt-BR'];
    const previous = {
      locale: model.locale || 'pt-BR',
      currency: model.currency || 'BRL',
      gateway: model.gateway || 'none'
    };

    if (previous.locale === nextLocale) return;

    let rate = 1;
    if (previous.currency !== next.currency && hasPricesToConvert()) {
      const proceed = confirm(
        `Converter todos os valores de ${previous.currency} para ${next.currency} usando a cotação atual?`
      );
      if (!proceed) {
        $('localeInput').value = previous.locale;
        return;
      }

      $('localeInput').disabled = true;
      try {
        rate = await fetchConversionRate(previous.currency, next.currency);
      } catch (error) {
        const manual = prompt(
          `Não foi possível obter a cotação automática (${error.message}).\n` +
          `Informe quantos ${next.currency} equivalem a 1 ${previous.currency}:`,
          ''
        );
        rate = Number(String(manual || '').replace(',', '.'));
        if (!Number.isFinite(rate) || rate <= 0) {
          $('localeInput').value = previous.locale;
          alert('Conversão cancelada. O país e os valores foram mantidos.');
          return;
        }
      } finally {
        $('localeInput').disabled = false;
      }
      convertAllPrices(rate);
    }

    model.locale = nextLocale;
    model.currency = next.currency;
    model.gateway = next.gateway;
    $('currencyInput').value = next.currency;
    $('gatewayInput').value = next.gateway;
    updateSpeiModeVisibility();

    const genericCountries = ['', 'Brasil', 'Portugal', 'México', 'Mexico'];
    if (genericCountries.includes(String(model.location || '').trim())) {
      model.location = next.country;
      $('locationInput').value = next.country;
    }

    renderList('plansEditor', 'plans');
    renderList('promosEditor', 'promotions');
    markDirty();
    showToast(`✓ País alterado para ${next.country}${rate !== 1 ? ` · cotação ${rate.toFixed(4)}` : ''}`);
  }

  function updateSpeiModeVisibility() {
    const isXpag = $('gatewayInput').value === 'xpag';
    $('speiModeField').hidden = !isXpag;
    $('fixedSpeiPreview').hidden = !isXpag || $('speiModeInput').value !== 'fixed';
  }

  function hasPricesToConvert() {
    const planPrices = [...(model.plans || []), ...(model.promotions || [])]
      .some(item => Number(item && item.price) > 0);
    return planPrices || Number(model.tsl && model.tsl.amount) > 0;
  }

  async function fetchConversionRate(from, to) {
    const res = await fetch('/api/admin/conversion-quote', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'same-origin',
      body: JSON.stringify({ from, to })
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(data.message || data.error || `HTTP ${res.status}`);
    const rate = Number(data.rate);
    if (!Number.isFinite(rate) || rate <= 0) throw new Error('cotação inválida');
    return rate;
  }

  function convertAllPrices(rate) {
    const convert = value => Math.round((Number(value) || 0) * rate * 100) / 100;
    for (const item of [...(model.plans || []), ...(model.promotions || [])]) {
      item.price = convert(item.price);
    }
    if (model.tsl && Number(model.tsl.amount) > 0) {
      model.tsl.amount = convert(model.tsl.amount);
      $('tslAmountInput').value = String(model.tsl.amount);
    }
  }

  function renderList(containerId, listKey) {
    const container = $(containerId);
    container.innerHTML = '';
    const arr = model[listKey] = model[listKey] || [];
    const cur = model.currency === 'EUR' ? '€' : (model.currency === 'MXN' ? '$ MXN' : 'R$');
    arr.forEach((plan, idx) => {
      const card = document.createElement('div');
      card.className = 'plan-edit-card';
      card.innerHTML = `
        <div class="form-field">
          <label>Duração / título</label>
          <input type="text" value="${escAttr(plan.duration)}" data-field="duration" maxlength="80" />
        </div>
        <div class="form-field">
          <label>Preço (${cur})</label>
          <input type="text" value="${escAttr(plan.price)}" data-field="price" inputmode="decimal" placeholder="0,00" />
        </div>
        <button type="button" class="remove-btn" title="Remover" aria-label="Remover">×</button>
      `;
      card.querySelectorAll('input[data-field]').forEach(inp => {
        inp.addEventListener('input', () => {
          const f = inp.dataset.field;
          if (f === 'price') {
            const n = Number(String(inp.value).replace(',', '.').replace(/[^\d.-]/g, ''));
            arr[idx].price = isFinite(n) ? n : 0;
          } else {
            arr[idx][f] = inp.value;
          }
          markDirty();
        });
      });
      card.querySelector('.remove-btn').addEventListener('click', () => {
        arr.splice(idx, 1);
        renderList(containerId, listKey);
        markDirty();
      });
      container.appendChild(card);
    });
  }

  function markDirty() {
    dirty = true;
    $('saveBtn').classList.add('btn-dirty');
    $('saveBtnBottom').classList.add('btn-dirty');
  }

  async function uploadMedia(file, kind, maxBytes) {
    if (!file || file.size > maxBytes) {
      throw new Error(`arquivo maior que ${Math.round(maxBytes / 1_000_000)} MB`);
    }
    const fallback = (file.type || '').startsWith('video/') ? 'mp4' : 'jpg';
    const ext = (file.name.split('.').pop() || fallback)
      .toLowerCase().replace(/[^a-z0-9]/g, '').slice(0, 10) || fallback;
    const r = await fetch('/api/admin/upload-url', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'same-origin',
      body: JSON.stringify({ slug, kind, ext })
    });
    if (!r.ok) {
      const errorBody = await r.json().catch(() => ({}));
      throw new Error(errorBody.message || errorBody.error || ('upload-url ' + r.status));
    }
    const { signedUrl, publicUrl } = await r.json();
    if (!signedUrl || !publicUrl) throw new Error('resposta de upload inválida');

    const up = await fetch(signedUrl, {
      method: 'PUT',
      headers: { 'Content-Type': file.type || 'application/octet-stream' },
      body: file
    });
    if (!up.ok) throw new Error('storage PUT ' + up.status);
    return publicUrl;
  }

  async function save() {
    if (!model) return;
    $('saveBtn').disabled = true;
    $('saveBtnBottom').disabled = true;
    try {
      const res = await fetch('/api/models/' + encodeURIComponent(slug), {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'same-origin',
        body: JSON.stringify(model)
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        showToast(data.error || data.message || 'Erro ao salvar', true);
        return;
      }
      model = data.model;
      dirty = false;
      $('saveBtn').classList.remove('btn-dirty');
      $('saveBtnBottom').classList.remove('btn-dirty');
      $('editTitle').textContent = (model.name || slug);
      fillForm();
      showToast('✓ Salvo');
    } catch {
      showToast('Erro de conexão', true);
    } finally {
      $('saveBtn').disabled = false;
      $('saveBtnBottom').disabled = false;
    }
  }

  function showToast(msg, isError) {
    toast.textContent = msg;
    toast.style.background = isError ? '#e5484d' : '#2dc26b';
    toast.hidden = false;
    clearTimeout(showToast._t);
    showToast._t = setTimeout(() => { toast.hidden = true; }, 1800);
  }

  function isHttpUrl(s) { return typeof s === 'string' && /^https?:\/\//i.test(s); }
  function escHtml(s) {
    return String(s == null ? '' : s).replace(/[&<>"']/g, ch => ({ '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;' }[ch]));
  }
  function escAttr(s) { return escHtml(s); }
})();

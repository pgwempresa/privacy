(function () {
  'use strict';

  const ICONS = {
    image: '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="3" width="18" height="18" rx="2" ry="2"/><circle cx="8.5" cy="8.5" r="1.5"/><polyline points="21 15 16 10 5 21"/></svg>',
    film:  '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><rect x="2" y="2" width="20" height="20" rx="2.18" ry="2.18"/><line x1="7" y1="2" x2="7" y2="22"/><line x1="17" y1="2" x2="17" y2="22"/><line x1="2" y1="12" x2="22" y2="12"/><line x1="2" y1="7" x2="7" y2="7"/><line x1="2" y1="17" x2="7" y2="17"/><line x1="17" y1="17" x2="22" y2="17"/><line x1="17" y1="7" x2="22" y2="7"/></svg>',
    lock:  '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>',
    heart: '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/></svg>',
    instagram: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><rect x="2" y="2" width="20" height="20" rx="5" ry="5"/><path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z"/><line x1="17.5" y1="6.5" x2="17.51" y2="6.5"/></svg>',
    x:         '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/></svg>',
    tiktok:    '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M19.59 6.69a4.83 4.83 0 0 1-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 0 1-5.2 1.74 2.89 2.89 0 0 1 2.31-4.64 2.93 2.93 0 0 1 .88.13V9.4a6.84 6.84 0 0 0-1-.05A6.33 6.33 0 0 0 5.8 20.1a6.34 6.34 0 0 0 10.86-4.43V8.85a8.16 8.16 0 0 0 4.77 1.52V6.93a4.85 4.85 0 0 1-1.84-.24z"/></svg>',
    comment: '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>'
  };

  // Opening m.html directly is useful for quick visual work without Vercel or
  // the serverless API. In that case, render a self-contained demo profile.
  const IS_STANDALONE_PREVIEW = /^(localhost|127\.0\.0\.1)$/.test(location.hostname)
    && /\/m\.html$/.test(location.pathname);
  const slug = new URLSearchParams(location.search).get('slug')
    || (location.pathname.match(/^\/m\/([^\/?#]+)/) && location.pathname.match(/^\/m\/([^\/?#]+)/)[1])
    || (IS_STANDALONE_PREVIEW ? 'demo' : '');

  if (!slug) { showNotFound(window.t('pt-BR', 'pageNotFound')); return; }

  let MODEL = null;
  let LOCALE = 'pt-BR';
  let CURRENCY = 'BRL';

  const TRACKING = captureTracking(slug);

  // Read UTM/click ids from the URL on entry, persist for 30 days so a user who
  // arrives via a campaign and converts on a later visit still attributes correctly.
  // Stored per-slug because the same browser may visit multiple models.
  function captureTracking(slug) {
    const KEY = 'privacy_utm_' + slug;
    const TTL_MS = 30 * 24 * 60 * 60 * 1000;
    const FIELDS = ['utm_source', 'utm_medium', 'utm_campaign', 'utm_content', 'utm_term', 'src', 'sck'];

    let stored = null;
    try {
      const raw = localStorage.getItem(KEY);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (parsed && parsed.savedAt && (Date.now() - parsed.savedAt) < TTL_MS) {
          stored = parsed.data || null;
        }
      }
    } catch {}

    const params = new URLSearchParams(location.search);
    const fromUrl = {};
    let hasAny = false;
    FIELDS.forEach(f => {
      const v = params.get(f);
      if (v != null && v !== '') { fromUrl[f] = String(v).slice(0, 200); hasAny = true; }
    });

    if (hasAny) {
      // Last-touch attribution: a fresh campaign click overwrites old data.
      try { localStorage.setItem(KEY, JSON.stringify({ savedAt: Date.now(), data: fromUrl })); } catch {}
      return fromUrl;
    }
    return stored || {};
  }

  const modelRequest = IS_STANDALONE_PREVIEW
    ? Promise.resolve({ model: standaloneDemoModel(), tracking: {} })
    : fetch('/api/models/' + encodeURIComponent(slug)).then(r => {
        if (r.status === 404) throw new Error('not-found');
        if (!r.ok) throw new Error('fetch');
        return r.json();
      });

  modelRequest
    .then(r => {
      const d = r;
      // Cloaker: bounce desktop visitors before rendering anything. Skip when
      // ?test_paid=1 so admins can preview the delivery flow from desktop.
      const isPreview = new URLSearchParams(location.search).get('test_paid') === '1';
      if (d.model.cloaker && d.model.cloaker.enabled && !isMobile() && !isPreview) {
        location.replace(d.model.cloaker.redirect_url || 'https://google.com');
        return;
      }
      MODEL = d.model;
      LOCALE = d.model.locale || 'pt-BR';
      CURRENCY = d.model.currency || 'BRL';
      // Initialize pixels + inject custom head script BEFORE render so the
      // first PageView is fired ASAP and any GTM tag has a chance to load.
      initTracking(d.tracking || {}, d.model);
      render(d.model);
      if (isPreview) previewDeliverySuccess();
    })
    .catch(err => {
      // We may not have a locale yet (model fetch failed). Fall back to pt-BR.
      const key = err.message === 'not-found' ? 'modelNotFound' : 'loadError';
      showNotFound(window.t(LOCALE, key));
    });

  function standaloneDemoModel() {
    const svgData = (svg) => 'data:image/svg+xml;charset=UTF-8,' + encodeURIComponent(svg);
    const cover = svgData(`
      <svg xmlns="http://www.w3.org/2000/svg" width="1200" height="390" viewBox="0 0 1200 390">
        <defs><linearGradient id="g" x1="0" y1="0" x2="1" y2="1"><stop stop-color="#66C8FF"/><stop offset=".52" stop-color="#0091EA"/><stop offset="1" stop-color="#005B99"/></linearGradient></defs>
        <rect width="1200" height="390" fill="url(#g)"/><circle cx="1020" cy="70" r="230" fill="#fff" opacity=".12"/><circle cx="180" cy="420" r="300" fill="#fff" opacity=".09"/>
      </svg>`);
    const avatar = svgData(`
      <svg xmlns="http://www.w3.org/2000/svg" width="300" height="300" viewBox="0 0 300 300">
        <defs><linearGradient id="a" x1="0" y1="0" x2="1" y2="1"><stop stop-color="#8AD7FF"/><stop offset="1" stop-color="#0091EA"/></linearGradient></defs>
        <rect width="300" height="300" rx="150" fill="url(#a)"/><text x="150" y="177" text-anchor="middle" font-family="Arial,sans-serif" font-size="92" font-weight="700" fill="#fff">AM</text>
      </svg>`);
    const post = svgData(`
      <svg xmlns="http://www.w3.org/2000/svg" width="900" height="900" viewBox="0 0 900 900">
        <defs><linearGradient id="p" x1="0" y1="1" x2="1" y2="0"><stop stop-color="#003F69"/><stop offset=".45" stop-color="#0091EA"/><stop offset="1" stop-color="#8AD7FF"/></linearGradient></defs>
        <rect width="900" height="900" fill="url(#p)"/><circle cx="690" cy="230" r="250" fill="#fff" opacity=".16"/><circle cx="210" cy="760" r="320" fill="#fff" opacity=".1"/>
      </svg>`);

    return {
      name: 'Ana Martins',
      username: 'anamartins',
      bio: 'Bem-vindo ao meu perfil! Conteúdo exclusivo e novidades todos os dias para você 🔥',
      avatar,
      cover,
      location: 'São Paulo, Brasil',
      locale: 'pt-BR',
      currency: 'BRL',
      gateway: 'none',
      delivery: { mode: 'inline', url: '', message: '' },
      cloaker: { enabled: false, redirect_url: '' },
      tsl: { enabled: false, amount: 0 },
      social: { instagram: '#', twitter: '#', tiktok: '#' },
      stats: { photos: 148, videos: 32, locked: 180, likes: '12,8 mil' },
      postCount: 24,
      mediaCount: 180,
      posts: [{ image: post, photos: 8, videos: 2, likes: 846, comments: 37, blur: 18 }],
      plans: [{ duration: '1 mês', price: 29.90 }],
      promotions: [
        { duration: '3 meses (15% off)', price: 76.20 },
        { duration: '6 meses (30% off)', price: 125.58 }
      ]
    };
  }

  function isMobile() {
    const ua = (navigator.userAgent || '').toLowerCase();
    if (/android|iphone|ipod|windows phone|iemobile|opera mini|mobile/i.test(ua)) return true;
    // iPadOS 13+ identifies as Macintosh; check touch + screen size.
    if (/ipad/.test(ua)) return true;
    if (navigator.maxTouchPoints > 1 && /macintosh/.test(ua)) return true;
    // Fallback: small viewport width is a strong mobile signal.
    if (window.matchMedia && window.matchMedia('(max-width: 820px)').matches && 'ontouchstart' in window) return true;
    return false;
  }

  // ===================== Tracking (Meta + TikTok pixels + custom script) =====================

  const TRACKING_STATE = { metaIds: [], tiktokIds: [] };

  // Called once after the model loads. Loads the Meta + TikTok SDKs (just one
  // <script> per network even with multiple pixel IDs), then fires PageView +
  // ViewContent. Custom head script is appended as raw HTML — admin-only field.
  function initTracking(tracking, model) {
    const metaIds   = (tracking.meta_pixel_ids   || []).filter(Boolean);
    const tiktokIds = (tracking.tiktok_pixel_ids || []).filter(Boolean);
    TRACKING_STATE.metaIds = metaIds;
    TRACKING_STATE.tiktokIds = tiktokIds;

    if (metaIds.length) loadMetaPixel(metaIds);
    if (tiktokIds.length) loadTikTokPixel(tiktokIds);

    // Custom head script: inject as raw HTML so any <script> inside executes.
    const custom = String(tracking.custom_head_script || '').trim();
    if (custom) injectCustomHead(custom);

    // Fire PageView + ViewContent right away. Both networks treat ViewContent
    // as a product-detail view; we treat the public page as the product page.
    const baseProps = viewContentProps(model);
    metaTrack('PageView');
    metaTrack('ViewContent', baseProps);
    tiktokTrack('Browse');
    tiktokTrack('ViewContent', baseProps);
  }

  function loadMetaPixel(ids) {
    if (window.fbq) {
      // SDK already present — just init each new pixel.
      ids.forEach(id => window.fbq('init', id));
      return;
    }
    /* eslint-disable */
    !function(f,b,e,v,n,t,s){if(f.fbq)return;n=f.fbq=function(){n.callMethod?
    n.callMethod.apply(n,arguments):n.queue.push(arguments)};if(!f._fbq)f._fbq=n;
    n.push=n;n.loaded=!0;n.version='2.0';n.queue=[];t=b.createElement(e);t.async=!0;
    t.src=v;s=b.getElementsByTagName(e)[0];s.parentNode.insertBefore(t,s)}(window,
    document,'script','https://connect.facebook.net/en_US/fbevents.js');
    /* eslint-enable */
    ids.forEach(id => window.fbq('init', id));
  }

  function loadTikTokPixel(ids) {
    if (window.ttq) {
      ids.forEach(id => window.ttq.load(id));
      return;
    }
    /* eslint-disable */
    !function (w, d, t) {
      w.TiktokAnalyticsObject = t; var ttq = w[t] = w[t] || []; ttq.methods = ["page","track","identify","instances","debug","on","off","once","ready","alias","group","enableCookie","disableCookie"];
      ttq.setAndDefer = function (t, e) { t[e] = function () { t.push([e].concat(Array.prototype.slice.call(arguments, 0))) } };
      for (var i = 0; i < ttq.methods.length; i++) ttq.setAndDefer(ttq, ttq.methods[i]);
      ttq.instance = function (t) { for (var e = ttq._i[t] || [], n = 0; n < ttq.methods.length; n++) ttq.setAndDefer(e, ttq.methods[n]); return e };
      ttq.load = function (e, n) {
        var i = "https://analytics.tiktok.com/i18n/pixel/events.js"; ttq._i = ttq._i || {}; ttq._i[e] = []; ttq._i[e]._u = i; ttq._t = ttq._t || {}; ttq._t[e] = +new Date; ttq._o = ttq._o || {}; ttq._o[e] = n || {};
        var o = document.createElement("script"); o.type = "text/javascript"; o.async = !0; o.src = i + "?sdkid=" + e + "&lib=" + t;
        var a = document.getElementsByTagName("script")[0]; a.parentNode.insertBefore(o, a)
      };
    }(window, document, 'ttq');
    /* eslint-enable */
    ids.forEach(id => { window.ttq.load(id); window.ttq.page(); });
  }

  function injectCustomHead(html) {
    // We intentionally inject as raw HTML so <script> tags execute. The content
    // is admin-supplied through /admin/integracoes (auth-gated PATCH).
    const tpl = document.createElement('template');
    tpl.innerHTML = html;
    const head = document.head;
    // Use a fresh <script> element when the snippet contains scripts so the
    // browser actually executes them (template parsing leaves them inert).
    Array.from(tpl.content.childNodes).forEach(node => {
      if (node.nodeType === 1 && node.tagName === 'SCRIPT') {
        const s = document.createElement('script');
        for (const attr of node.attributes) s.setAttribute(attr.name, attr.value);
        s.text = node.textContent;
        head.appendChild(s);
      } else {
        head.appendChild(node.cloneNode(true));
      }
    });
  }

  function viewContentProps(model) {
    const cheapest = (model && model.plans && model.plans[0]) || (model && model.promotions && model.promotions[0]) || null;
    const props = {
      content_type: 'product',
      content_ids: [slug],
      content_name: (model && model.name) || slug,
      content_category: 'subscription'
    };
    if (cheapest && Number.isFinite(Number(cheapest.price))) {
      props.value = Number(cheapest.price);
      props.currency = CURRENCY;
    }
    return props;
  }

  function checkoutProps(plan) {
    return {
      content_type: 'product',
      content_ids: [slug + ':' + (plan.duration || '')],
      content_name: (MODEL && MODEL.name) || slug,
      contents: [{ id: plan.duration || '', quantity: 1, item_price: Number(plan.price) || 0 }],
      num_items: 1,
      value: Number(plan.price) || 0,
      currency: CURRENCY
    };
  }

  function metaTrack(event, props) {
    if (!window.fbq || !TRACKING_STATE.metaIds.length) return;
    try { props ? window.fbq('track', event, props) : window.fbq('track', event); } catch {}
  }

  // TikTok event name map: Meta-style → TikTok-style. We pass the Meta name in
  // and translate per call so the rest of the code stays single-vocabulary.
  const TIKTOK_EVENTS = {
    PageView: 'Browse',          // already fired separately on init
    ViewContent: 'ViewContent',
    InitiateCheckout: 'InitiateCheckout',
    AddPaymentInfo: 'AddPaymentInfo',
    Purchase: 'CompletePayment'
  };
  function tiktokTrack(event, props) {
    if (!window.ttq || !TRACKING_STATE.tiktokIds.length) return;
    const name = TIKTOK_EVENTS[event] || event;
    try { props ? window.ttq.track(name, props) : window.ttq.track(name); } catch {}
  }

  function showNotFound(msg) {
    const loading = document.getElementById('pageLoading');
    if (loading) {
      loading.textContent = msg;
      loading.classList.add('page-error');
    }
  }

  function applyStaticTranslations(locale) {
    document.querySelectorAll('[data-i18n]').forEach(el => {
      el.textContent = window.t(locale, el.getAttribute('data-i18n'));
    });
    document.querySelectorAll('[data-i18n-placeholder]').forEach(el => {
      el.setAttribute('placeholder', window.t(locale, el.getAttribute('data-i18n-placeholder')));
    });
    ['socialGateCloseBtn', 'checkoutCloseBtn'].forEach(id => {
      const button = document.getElementById(id);
      if (button) button.setAttribute('aria-label', window.t(locale, 'closeBtn'));
    });
    const oxxoBarcode = document.getElementById('oxxoBarcode');
    if (oxxoBarcode) oxxoBarcode.alt = window.t(locale, 'oxxoBarcodeAlt');
  }

  function render(data) {
    const locale = data.locale || 'pt-BR';
    const currency = data.currency || 'BRL';
    LOCALE = locale;
    CURRENCY = currency;
    const t = key => window.t(locale, key);
    const formatPrice = amt => window.formatPrice(amt, currency);

    document.documentElement.lang = window.I18N[locale] ? window.I18N[locale].htmlLang : 'pt-BR';

    // Translate every static element tagged with data-i18n / data-i18n-placeholder.
    // Drives the checkout modal, page loading text, error states — anything we
    // didn't render dynamically below.
    applyStaticTranslations(locale);

    document.getElementById('pageLoading').remove();
    document.getElementById('profileCard').hidden = false;
    document.getElementById('tabsCard').hidden = false;

    document.getElementById('profileName').textContent = data.name || '';
    document.getElementById('profileUsername').textContent = data.username || '';
    document.getElementById('profileBio').textContent = data.bio || '';
    document.title = (data.name ? data.name + ' · ' : '') + 'OnlyFans';

    if (data.avatar) document.getElementById('profileAvatar').src = data.avatar;
    if (data.cover)  document.getElementById('profileCover').src = data.cover;

    const stats = data.stats || {};
    const headerStats = document.getElementById('headerStats');
    headerStats.innerHTML = `
      <span class="hstat" title="${t('photos')}">${ICONS.image}<span>${esc(stats.photos)}</span></span>
      <span class="hstat" title="${t('videos')}">${ICONS.film}<span>${esc(stats.videos)}</span></span>
      <span class="hstat" title="${t('locked')}">${ICONS.lock}<span>${esc(stats.locked)}</span></span>
      <span class="hstat" title="${t('likes')}">${ICONS.heart}<span>${esc(stats.likes)}</span></span>
    `;

    renderPosts(data);

    const lerMaisBtn = document.getElementById('lerMaisBtn');
    lerMaisBtn.textContent = t('readMore');
    setTimeout(() => {
      const bio = document.getElementById('profileBio');
      if (bio.scrollHeight - bio.clientHeight > 2) {
        lerMaisBtn.hidden = false;
        lerMaisBtn.addEventListener('click', () => {
          const expanded = bio.classList.toggle('expanded');
          lerMaisBtn.textContent = expanded ? t('readLess') : t('readMore');
        });
      }
    }, 0);

    if (data.location) {
      document.getElementById('locationText').textContent = data.location;
    } else {
      document.getElementById('profileLocation').style.display = 'none';
    }

    // Social icons are gated: clicking them opens the paywall instead of the URL.
    // We still only render the ones the admin configured, so the URL acts as a
    // "model has this social" flag.
    const socialRow = document.getElementById('socialRow');
    socialRow.innerHTML = '';
    [
      { key: 'instagram', icon: ICONS.instagram, label: 'Instagram' },
      { key: 'twitter',   icon: ICONS.x,         label: 'X' },
      { key: 'tiktok',    icon: ICONS.tiktok,    label: 'TikTok' }
    ].forEach(s => {
      const url = data.social && data.social[s.key];
      if (!url) return;
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'social-btn';
      btn.setAttribute('aria-label', s.label);
      btn.innerHTML = s.icon;
      btn.addEventListener('click', openSocialGate);
      socialRow.appendChild(btn);
    });
    if (!socialRow.children.length) socialRow.style.display = 'none';

    document.getElementById('subsTitle').textContent = t('subscriptions');
    document.getElementById('promoTitle').textContent = t('promotions');

    renderPills('plansList', data.plans, formatPrice, t);
    renderPills('promosList', data.promotions, formatPrice, t);
    if (!data.promotions || !data.promotions.length) {
      document.getElementById('promoBlock').style.display = 'none';
    }
    document.getElementById('promoToggle').addEventListener('click', () => {
      document.getElementById('promoBlock').classList.toggle('collapsed');
    });

    document.getElementById('tabPosts').textContent = data.postCount;
    document.getElementById('tabMedia').textContent = data.mediaCount;
    document.getElementById('tabPostsLabel').textContent = t('posts');
    document.getElementById('tabMediaLabel').textContent = t('media');
    document.querySelectorAll('.tab').forEach(tab => {
      tab.addEventListener('click', () => {
        document.querySelectorAll('.tab').forEach(x => {
          x.classList.remove('tab-active');
          x.setAttribute('aria-selected', 'false');
        });
        tab.classList.add('tab-active');
        tab.setAttribute('aria-selected', 'true');
      });
    });
  }

  function renderPosts(data) {
    const container = document.getElementById('postsList');
    container.innerHTML = '';

    // Migration: old single-image model → one post.
    let posts = Array.isArray(data.posts) ? data.posts : null;
    if (!posts && data.lockedPreview) {
      const s = data.stats || {};
      posts = [{ image: data.lockedPreview, photos: s.photos, videos: s.videos, likes: s.likes, comments: 0 }];
    }
    if (!posts || !posts.length) return;

    posts.forEach(post => {
      const card = document.createElement('article');
      card.className = 'post-card';
      const blurPct = post.blur == null ? 100 : Math.max(0, Math.min(100, Number(post.blur) || 0));
      const blurPx  = (blurPct / 100) * 60; // 0–60px
      const mediaStyle = blurPx > 0
        ? `filter: blur(${blurPx}px) saturate(1.1); transform: scale(1.15);`
        : `filter: none; transform: none;`;
      // Video takes precedence over image when both are set. Loop muted so it
      // can autoplay on mobile without user interaction.
      const mediaHtml = post.video
        ? `<video class="locked-preview-vid" src="${esc(post.video)}" style="${mediaStyle}" autoplay loop muted playsinline preload="metadata"></video>`
        : (post.image ? `<img class="locked-preview-img" src="${esc(post.image)}" alt="" style="${mediaStyle}" />` : '');
      const stats = `
        <span class="lstat">${ICONS.image}<span>${esc(post.photos || 0)}</span></span>
        <span class="lstat">${ICONS.film}<span>${esc(post.videos || 0)}</span></span>
        <span class="lstat">${ICONS.heart}<span>${esc(post.likes || 0)}</span></span>
        <span class="lstat">${ICONS.comment}<span>${esc(post.comments || 0)}</span></span>
      `;
      card.innerHTML = `
        <header class="post-head">
          <img class="post-avatar" src="${esc(data.avatar || '')}" alt="" onerror="this.style.visibility='hidden'" />
          <div class="post-meta">
            <div class="post-name">${esc(data.name || '')}</div>
            <div class="post-username">@${esc(data.username || '')}</div>
          </div>
          <button class="post-more" type="button" aria-label="•••">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor"><circle cx="12" cy="5" r="2"/><circle cx="12" cy="12" r="2"/><circle cx="12" cy="19" r="2"/></svg>
          </button>
        </header>

        <div class="post-locked">
          ${mediaHtml}
          <svg class="lock-icon" width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"></rect><path d="M7 11V7a5 5 0 0 1 10 0v4"></path></svg>
          <div class="locked-stats">${stats}</div>
        </div>

        <footer class="post-actions">
          <button class="post-action" type="button" aria-label="Like">
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"></path></svg>
          </button>
          <button class="post-action" type="button" aria-label="Comment">
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"></path></svg>
          </button>
          <button class="post-action post-action-right" type="button" aria-label="Save">
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z"></path></svg>
          </button>
        </footer>
      `;
      container.appendChild(card);
    });
  }

  function renderPills(containerId, items, formatPrice, t) {
    const container = document.getElementById(containerId);
    container.innerHTML = '';
    (items || []).forEach(p => {
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'plan-pill';
      btn.innerHTML = `
        <span class="pill-label">${esc(p.duration || '')}</span>
        <span class="pill-price">${esc(formatPrice(p.price))}</span>
      `;
      btn.addEventListener('click', () => onPlanClick(p));
      container.appendChild(btn);
    });
  }

  function onPlanClick(plan) {
    const gw = currentGateway();
    if (gw !== 'waymb' && gw !== 'nexuspag' && gw !== 'xpag') {
      alert(window.t(LOCALE, 'paymentsUnavailable'));
      return;
    }
    openCheckout(plan);
  }

  function currentGateway() {
    if (!MODEL) return 'none';
    if (MODEL.gateway) return MODEL.gateway;
    return MODEL.currency === 'EUR' ? 'waymb' : (MODEL.currency === 'MXN' ? 'xpag' : 'nexuspag');
  }

  function usesFixedSpei() {
    return currentGateway() === 'xpag' && MODEL && MODEL.spei_mode === 'fixed';
  }

  // ===================== Checkout =====================

  const FIXED_SPEI = Object.freeze({
    clabe: '684180330082508714',
    bank_name: 'Finco Pay',
    beneficiary: 'Beatriz Romano'
  });

  let CHECKOUT = null; // { plan, method, depositId, pollTimer }

  function openCheckout(plan) {
    const gw = currentGateway();
    const defaultMethod = gw === 'nexuspag' ? 'pix' : (gw === 'xpag' ? 'spei' : 'mbway');
    CHECKOUT = {
      plan,
      method: defaultMethod,
      depositId: null,
      pollTimer: null,
      gateway: gw,
      accessEmail: '',
      purchaseTracked: false
    };

    // Funnel event: user committed to a plan and opened checkout.
    const props = checkoutProps(plan);
    metaTrack('InitiateCheckout', props);
    tiktokTrack('InitiateCheckout', props);
    const formatPrice = amt => window.formatPrice(amt, CURRENCY);

    document.getElementById('checkoutPlanName').textContent = plan.duration || '';
    document.getElementById('checkoutPlanPrice').textContent = formatPrice(plan.price);
    document.getElementById('checkoutError').hidden = true;
    document.getElementById('checkoutForm').reset();
    document.getElementById('accessForm').reset();
    document.getElementById('accessNextBtn').disabled = true;

    const accessCover = document.getElementById('accessCover');
    const accessAvatar = document.getElementById('accessAvatar');
    accessCover.src = (MODEL && MODEL.cover) || '';
    accessAvatar.src = (MODEL && MODEL.avatar) || '';
    document.getElementById('accessName').textContent = (MODEL && MODEL.name) || '';
    document.getElementById('accessUsername').textContent = (MODEL && MODEL.username) || '';

    // Show only the method tabs supported by this gateway.
    const tabs = document.querySelectorAll('#methodTabs .method-tab');
    const supported = gw === 'nexuspag'
      ? ['pix']
      : (gw === 'xpag' ? ['spei', 'oxxo'] : ['mbway', 'multibanco']);
    tabs.forEach(t => {
      t.hidden = !supported.includes(t.dataset.method);
    });

    setMethod(defaultMethod);
    document.getElementById('speiMeta').textContent = window.t(
      LOCALE,
      usesFixedSpei() ? 'fixedSpeiMeta' : 'speiMeta'
    );

    const modal = document.getElementById('checkoutModal');
    modal.hidden = false;
    document.body.style.overflow = 'hidden';
    bindCheckoutOnce();

    showStep('access');
    setTimeout(() => document.getElementById('accessEmail').focus(), 80);
  }

  // ===================== Social gate =====================

  // Picks the "1 month" plan when the admin tagged it that way, otherwise the
  // first plan in the list. Falls back to first promotion, then null.
  function defaultPaywallPlan() {
    const plans = (MODEL && MODEL.plans) || [];
    if (plans.length) {
      const oneMonth = plans.find(p => /1\s*(m[êe]s|mes|month|mensal)/i.test(String(p.duration || '')));
      return oneMonth || plans[0];
    }
    const promos = (MODEL && MODEL.promotions) || [];
    return promos[0] || null;
  }

  function openSocialGate() {
    const plan = defaultPaywallPlan();
    const modal = document.getElementById('socialGateModal');
    const payBtn = document.getElementById('socialGatePayBtn');
    const seeBtn = document.getElementById('socialGateSeePlansBtn');
    if (!modal || !payBtn) return;

    if (plan) {
      const label = `${window.t(LOCALE, 'socialGatePayPrefix')} ${plan.duration || ''} — ${window.formatPrice(plan.price, CURRENCY)}`;
      payBtn.textContent = label.trim();
      payBtn.hidden = false;
    } else {
      // No plans configured yet — hide the pay button, leave only "see plans".
      payBtn.hidden = true;
    }

    modal.hidden = false;
    document.body.style.overflow = 'hidden';
    bindSocialGateOnce();
  }

  function closeSocialGate() {
    const modal = document.getElementById('socialGateModal');
    if (!modal) return;
    modal.hidden = true;
    if (!CHECKOUT) document.body.style.overflow = '';
  }

  let _socialGateBound = false;
  function bindSocialGateOnce() {
    if (_socialGateBound) return;
    _socialGateBound = true;

    document.getElementById('socialGateCloseBtn').addEventListener('click', closeSocialGate);
    document.getElementById('socialGateModal').addEventListener('click', e => {
      if (e.target.id === 'socialGateModal') closeSocialGate();
    });
    document.addEventListener('keydown', e => {
      if (e.key === 'Escape' && !document.getElementById('socialGateModal').hidden) {
        closeSocialGate();
      }
    });

    document.getElementById('socialGatePayBtn').addEventListener('click', () => {
      const plan = defaultPaywallPlan();
      if (!plan) return;
      closeSocialGate();
      onPlanClick(plan);
    });

    document.getElementById('socialGateSeePlansBtn').addEventListener('click', () => {
      closeSocialGate();
      const plansBlock = document.querySelector('.subs-block');
      if (plansBlock) plansBlock.scrollIntoView({ behavior: 'smooth', block: 'center' });
    });
  }

  function closeCheckout() {
    const modal = document.getElementById('checkoutModal');
    modal.hidden = true;
    document.body.style.overflow = '';
    if (CHECKOUT && CHECKOUT.pollTimer) clearTimeout(CHECKOUT.pollTimer);
    CHECKOUT = null;
  }

  function setMethod(method) {
    if (!CHECKOUT) return;
    CHECKOUT.method = method;
    document.querySelectorAll('.method-tab').forEach(t => {
      t.classList.toggle('method-tab-active', t.dataset.method === method);
      t.setAttribute('aria-selected', t.dataset.method === method ? 'true' : 'false');
    });
    const phoneField = document.getElementById('payerPhoneField');
    const phoneInput = document.getElementById('payerPhone');
    const nameField = document.getElementById('payerNameField');
    const nameInput = document.getElementById('payerName');
    const emailField = document.getElementById('payerEmailField');
    const emailInput = document.getElementById('payerEmail');
    const documentField = document.getElementById('payerDocumentField');
    const documentInput = document.getElementById('payerDocument');
    const isFixedSpei = method === 'spei' && usesFixedSpei();
    nameField.hidden = isFixedSpei;
    emailField.hidden = isFixedSpei;
    nameInput.required = !isFixedSpei;
    emailInput.required = !isFixedSpei;
    // Phone is only required for MB Way; pix/multibanco hide it entirely.
    if (method === 'mbway') {
      phoneField.style.display = '';
      phoneInput.required = true;
    } else {
      phoneField.style.display = 'none';
      phoneInput.required = false;
    }
    if (method === 'spei' && !isFixedSpei) {
      documentField.hidden = false;
      documentInput.required = true;
    } else {
      documentField.hidden = true;
      documentInput.required = false;
    }

    const fineprint = document.getElementById('checkoutFineprint');
    if (fineprint) {
      const key = isFixedSpei
        ? 'fixedSpeiMeta'
        : (method === 'oxxo'
        ? 'fineprintOxxo'
        : (CHECKOUT.gateway === 'nexuspag'
          ? 'fineprintNexuspag'
          : (CHECKOUT.gateway === 'xpag' ? 'fineprintXpag' : 'fineprint')));
      fineprint.textContent = window.t(LOCALE, key);
    }
  }

  function showStep(name) {
    document.querySelectorAll('.checkout-step').forEach(s => {
      s.hidden = s.dataset.step !== name;
    });
    const isAccess = name === 'access';
    const summary = document.getElementById('checkoutSummary');
    const sheet = document.querySelector('#checkoutModal .checkout-sheet');
    if (summary) summary.hidden = isAccess;
    if (sheet) sheet.classList.toggle('access-active', isAccess);
  }

  let _checkoutBound = false;
  function bindCheckoutOnce() {
    if (_checkoutBound) return;
    _checkoutBound = true;

    document.getElementById('checkoutCloseBtn').addEventListener('click', closeCheckout);
    document.getElementById('checkoutModal').addEventListener('click', e => {
      if (e.target.id === 'checkoutModal') closeCheckout();
    });
    document.addEventListener('keydown', e => {
      if (e.key === 'Escape' && CHECKOUT) closeCheckout();
    });

    document.querySelectorAll('.method-tab').forEach(t => {
      t.addEventListener('click', () => setMethod(t.dataset.method));
    });

    const accessForm = document.getElementById('accessForm');
    const accessEmail = document.getElementById('accessEmail');
    const accessNextBtn = document.getElementById('accessNextBtn');
    const updateAccessButton = () => {
      accessNextBtn.disabled = !accessEmail.value.trim();
    };
    accessEmail.addEventListener('input', updateAccessButton);
    accessForm.addEventListener('submit', e => {
      e.preventDefault();
      if (!CHECKOUT || accessNextBtn.disabled) return;

      CHECKOUT.accessEmail = accessEmail.value.trim();
      updateAccessButton();

      if (CHECKOUT.gateway === 'nexuspag') {
        showStep('pix-loading');
        sendDeposit({ name: '', email: CHECKOUT.accessEmail, phone: '' });
        return;
      }

      document.getElementById('payerEmail').value = CHECKOUT.accessEmail;
      showStep('form');
      setTimeout(() => document.getElementById('payerName').focus(), 80);
    });

    document.getElementById('checkoutForm').addEventListener('submit', submitCheckout);

    document.getElementById('checkoutDoneBtn').addEventListener('click', closeCheckout);
    document.getElementById('checkoutRetryBtn').addEventListener('click', () => {
      if (CHECKOUT && CHECKOUT.pollTimer) clearTimeout(CHECKOUT.pollTimer);
      document.getElementById('checkoutError').hidden = true;
      if (CHECKOUT && CHECKOUT.gateway === 'nexuspag') {
        showStep('pix-loading');
        sendDeposit({ name: '', email: '', phone: '' });
      } else {
        showStep('form');
      }
    });

    document.querySelectorAll('[data-copy-target]').forEach(btn => {
      btn.addEventListener('click', () => {
        const tgt = document.getElementById(btn.dataset.copyTarget);
        if (!tgt) return;
        const text = tgt.textContent || '';
        try {
          navigator.clipboard.writeText(text);
          const orig = btn.textContent;
          btn.textContent = '✓';
          setTimeout(() => { btn.textContent = orig; }, 1200);
        } catch {}
      });
    });

    const pixCopyBtn = document.getElementById('pixCopyBtn');
    if (pixCopyBtn) {
      pixCopyBtn.addEventListener('click', () => {
        const ta = document.getElementById('pixCopyCola');
        if (!ta) return;
        const text = ta.value || '';
        try {
          navigator.clipboard.writeText(text);
        } catch {
          ta.select();
          try { document.execCommand('copy'); } catch {}
        }
        const orig = pixCopyBtn.textContent;
        pixCopyBtn.textContent = window.t(LOCALE, 'copiedBtn');
        setTimeout(() => { pixCopyBtn.textContent = orig; }, 1400);
      });
    }
  }

  async function submitCheckout(e) {
    e.preventDefault();
    if (!CHECKOUT) return;
    const errBox = document.getElementById('checkoutError');
    errBox.hidden = true;

    if (CHECKOUT.method === 'spei' && usesFixedSpei()) {
      showFixedSpei();
      return;
    }

    const name  = document.getElementById('payerName').value.trim();
    const email = document.getElementById('payerEmail').value.trim();
    const phone = document.getElementById('payerPhone').value.trim();
    const documentId = document.getElementById('payerDocument').value.trim().toUpperCase();

    if (CHECKOUT.method === 'mbway' && !phone) {
      errBox.textContent = window.t(LOCALE, 'mbwayPhoneRequired');
      errBox.hidden = false;
      return;
    }

    if (CHECKOUT.method === 'spei' && !documentId) {
      errBox.textContent = window.t(LOCALE, 'speiDocumentRequired');
      errBox.hidden = false;
      return;
    }

    if (CHECKOUT.method === 'oxxo') {
      const amount = Number(CHECKOUT.plan && CHECKOUT.plan.price);
      if (!Number.isFinite(amount) || amount < 10 || amount > 10000) {
        errBox.textContent = window.t(LOCALE, 'oxxoRangeError');
        errBox.hidden = false;
        return;
      }
    }

    await sendDeposit({ name, email, phone, document: documentId });
  }

  // The fixed SPEI option is display-only: it never creates a deposit or
  // contacts XPag. The selected plan still determines the amount shown.
  function showFixedSpei() {
    if (!CHECKOUT) return;
    CHECKOUT.method = 'spei';
    CHECKOUT.depositId = null;

    document.getElementById('speiClabe').textContent = FIXED_SPEI.clabe;
    document.getElementById('speiBank').textContent = FIXED_SPEI.bank_name;
    document.getElementById('speiBeneficiary').textContent = FIXED_SPEI.beneficiary;
    document.getElementById('speiAmount').textContent = window.formatPrice(CHECKOUT.plan.price, CURRENCY);
    document.getElementById('speiMeta').textContent = window.t(LOCALE, 'fixedSpeiMeta');

    const props = checkoutProps(CHECKOUT.plan);
    props.payment_method = 'spei';
    metaTrack('AddPaymentInfo', props);
    tiktokTrack('AddPaymentInfo', props);
    showStep('spei-pending');
    trackMetaPurchaseOnGeneration('spei');
  }

  // Posts /api/deposits and routes to the right pending step. Called from the
  // form submit (mbway/multibanco) and directly on plan click for Pix
  // (NexusPag) since Pix needs no payer info up front.
  async function sendDeposit(payer) {
    if (!CHECKOUT) return;
    const errBox = document.getElementById('checkoutError');
    const submitBtn = document.getElementById('checkoutSubmit');
    const isPix = CHECKOUT.method === 'pix';
    errBox.hidden = true;

    let origLabel = '';
    if (!isPix && submitBtn) {
      submitBtn.disabled = true;
      origLabel = submitBtn.textContent;
      submitBtn.textContent = window.t(LOCALE, 'processing');
    }

    try {
      const res = await fetch('/api/deposits', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          amount: CHECKOUT.plan.price,
          method: CHECKOUT.method,
          currency: CURRENCY,
          model_slug: slug,
          reference: CHECKOUT.plan.duration,
          payer,
          tracking: TRACKING,
          locale: LOCALE
        })
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        showCheckoutError(checkoutErrorMessage(data, res.status));
        return;
      }

      CHECKOUT.depositId = data.deposit && data.deposit.id;

      // Funnel event: payment instrument generated (Pix QR / MB Way push /
      // Multibanco reference). User has everything they need to pay.
      const apiProps = checkoutProps(CHECKOUT.plan);
      metaTrack('AddPaymentInfo', apiProps);
      tiktokTrack('AddPaymentInfo', apiProps);

      if (CHECKOUT.method === 'mbway') {
        const target = payer.phone || window.t(LOCALE, 'mbwayMetaPhoneFallback');
        document.getElementById('mbwayMeta').textContent =
          window.t(LOCALE, 'mbwayMetaTo') + target + '.';
        showStep('mbway-pending');
      } else if (isPix) {
        const gw = data.gateway || {};
        const qr = gw.qr_code_base64 || '';
        const cola = gw.pix_copia_cola || '';
        if (!qr || !cola) {
          showCheckoutError(window.t(LOCALE, 'pixError'));
          return;
        }
        // qr_code_base64 already comes prefixed with `data:image/png;base64,`.
        document.getElementById('pixQrImg').src = qr;
        document.getElementById('pixCopyCola').value = cola;
        showStep('pix-pending');
      } else if (CHECKOUT.method === 'spei') {
        const gw = data.gateway || {};
        const clabe = String(gw.clabe || '').replace(/\s+/g, '');
        if (!/^\d{18}$/.test(clabe)) {
          showCheckoutError(window.t(LOCALE, 'genericPayError'));
          return;
        }
        document.getElementById('speiClabe').textContent = clabe;
        document.getElementById('speiBank').textContent = gw.bank_name || '—';
        document.getElementById('speiBeneficiary').textContent = gw.beneficiary || '—';
        document.getElementById('speiAmount').textContent = window.formatPrice(CHECKOUT.plan.price, CURRENCY);
        showStep('spei-pending');
        trackMetaPurchaseOnGeneration('spei');
      } else if (CHECKOUT.method === 'oxxo') {
        const gw = data.gateway || {};
        const reference = String(gw.reference || '').trim();
        if (!reference) {
          showCheckoutError(window.t(LOCALE, 'oxxoError'));
          return;
        }
        const barcode = isHttpUrl(gw.barcode) ? gw.barcode.trim() : '';
        const barcodeImg = document.getElementById('oxxoBarcode');
        if (barcode) {
          barcodeImg.src = barcode;
          barcodeImg.hidden = false;
        } else {
          barcodeImg.removeAttribute('src');
          barcodeImg.hidden = true;
        }
        document.getElementById('oxxoReference').textContent = reference;
        document.getElementById('oxxoAmount').textContent = window.formatPrice(CHECKOUT.plan.price, CURRENCY);
        showStep('oxxo-pending');
        trackMetaPurchaseOnGeneration('oxxo');
      } else {
        const gw = data.gateway || {};
        document.getElementById('mbEntity').textContent    = gw.entity || gw.entidade || '—';
        document.getElementById('mbReference').textContent = gw.reference || gw.referencia || '—';
        document.getElementById('mbAmount').textContent    = window.formatPrice(CHECKOUT.plan.price, CURRENCY);
        showStep('multibanco-pending');
      }

      pollDeposit();
    } catch {
      showCheckoutError(window.t(LOCALE, 'connError'));
    } finally {
      if (!isPix && submitBtn) {
        submitBtn.disabled = false;
        submitBtn.textContent = origLabel;
      }
    }
  }

  // The business funnel treats a generated SPEI/CLABE or OXXO voucher as the
  // Meta conversion. Guard per checkout so retries/polling never duplicate it.
  function trackMetaPurchaseOnGeneration(method) {
    if (!CHECKOUT || CHECKOUT.purchaseTracked || !['spei', 'oxxo'].includes(method)) return;
    const props = checkoutProps(CHECKOUT.plan);
    if (CHECKOUT.depositId) props.order_id = CHECKOUT.depositId;
    props.payment_method = method;
    metaTrack('Purchase', props);
    CHECKOUT.purchaseTracked = true;
  }

  // For form-based methods we surface errors inline above the submit button.
  // For Pix there's no form visible — show the declined step with a retry.
  function showCheckoutError(message) {
    if (CHECKOUT && CHECKOUT.method === 'pix') {
      const declinedDesc = document.querySelector('[data-step="declined"] .checkout-p');
      if (declinedDesc) declinedDesc.textContent = message;
      showStep('declined');
      return;
    }
    const errBox = document.getElementById('checkoutError');
    errBox.textContent = message;
    errBox.hidden = false;
  }

  function checkoutErrorMessage(data, status) {
    if (status === 503) return window.t(LOCALE, 'gatewayNotConfigured');
    if (status === 409 && data.error === 'gateway not available') {
      return window.t(LOCALE, 'pageNotAcceptingPayments');
    }
    // 502 = our wrapper around a non-2xx from the gateway. Surface the gateway's
    // own error so the admin can debug instead of seeing a generic message.
    if (status === 502 && data) {
      const gw = data.body || {};
      const gwMsg = gw.message || gw.error || gw.detail
        || (typeof gw === 'string' ? gw : null);
      if (data.status === 401) {
        return window.t(LOCALE, 'gatewayAuthError');
      }
      if (gwMsg) return `${data.error || 'gateway error'}: ${gwMsg}`;
      if (data.status) return `${data.error || 'gateway error'} (HTTP ${data.status})`;
    }
    if (data && data.message) return data.message;
    if (data && data.error) return data.error;
    return window.t(LOCALE, 'genericPayError');
  }

  async function pollDeposit() {
    if (!CHECKOUT || !CHECKOUT.depositId) return;
    try {
      const res = await fetch('/api/deposits/' + encodeURIComponent(CHECKOUT.depositId));
      if (res.ok) {
        const d = await res.json();
        if (d.status === 'COMPLETED') { onPaymentConfirmed(); return; }
        if (d.status === 'DECLINED')  { showStep('declined'); return; }
      }
    } catch {}
    CHECKOUT.pollTimer = setTimeout(pollDeposit, 4000);
  }

  function onPaymentConfirmed(opts) {
    const isPreview = !!(opts && opts.preview);

    // Meta Purchase for SPEI/OXXO is intentionally emitted when the payment
    // instrument is generated, not here. TikTok CompletePayment remains tied
    // to the confirmed payment.
    if (!isPreview && CHECKOUT && CHECKOUT.plan) {
      const buyProps = checkoutProps(CHECKOUT.plan);
      if (CHECKOUT.depositId) buyProps.order_id = CHECKOUT.depositId;
      tiktokTrack('Purchase', buyProps);
    }

    // TSL gate: if the model has TSL enabled and this confirmation is for the
    // PLAN (not the TSL itself), show the TSL prompt instead of delivery. The
    // TSL deposit reuses the same checkout flow with a synthetic plan; when it
    // confirms, CHECKOUT.isTsl is true and we fall through to delivery.
    const tsl = MODEL && MODEL.tsl;
    const isTslConfirmation = !!(CHECKOUT && CHECKOUT.isTsl);
    if (!isPreview && tsl && tsl.enabled && Number(tsl.amount) > 0 && !isTslConfirmation) {
      showTslPrompt(Number(tsl.amount));
      return;
    }

    const delivery = (MODEL && MODEL.delivery) || { mode: 'inline', url: '', message: '' };
    const link = document.getElementById('deliveryLink');
    const msg  = document.getElementById('successMessage');
    const note = document.getElementById('redirectNotice');

    link.hidden = true;
    note.hidden = true;
    link.removeAttribute('href');
    link.textContent = window.t(LOCALE, 'accessContent');

    const safeUrl = isHttpUrl(delivery.url) ? delivery.url : '';

    if (delivery.mode === 'redirect' && safeUrl) {
      if (isPreview) {
        // Don't redirect in preview — show what would happen and let the admin
        // click through to verify the URL.
        msg.textContent = window.t(LOCALE, 'previewRedirect');
        link.href = safeUrl;
        link.textContent = window.t(LOCALE, 'previewOpenUrl');
        link.hidden = false;
      } else {
        msg.textContent = window.t(LOCALE, 'successRedirecting');
        note.hidden = false;
        setTimeout(() => { window.location.href = safeUrl; }, 1500);
      }
      showStep('success');
      return;
    }

    if (safeUrl) {
      msg.textContent = (delivery.message && delivery.message.trim())
        || window.t(LOCALE, 'successWithLink');
      link.href = safeUrl;
      link.hidden = false;
    } else {
      msg.textContent = isPreview
        ? window.t(LOCALE, 'previewNoUrl')
        : window.t(LOCALE, 'successWithoutLink');
    }
    showStep('success');
  }

  function isHttpUrl(s) {
    return typeof s === 'string' && /^https?:\/\//i.test(s.trim());
  }

  // Triggered by ?test_paid=1 from the editor. Opens the checkout modal
  // straight in the success step so the admin can see what the customer sees
  // when delivery.mode = inline | redirect.
  function previewDeliverySuccess() {
    const firstPlan = (MODEL.plans && MODEL.plans[0]) || { duration: 'Teste', price: 0 };
    CHECKOUT = { plan: firstPlan, method: 'mbway', depositId: null, pollTimer: null };

    document.getElementById('checkoutPlanName').textContent = firstPlan.duration || 'Teste';
    document.getElementById('checkoutPlanPrice').textContent =
      window.formatPrice(firstPlan.price || 0, CURRENCY);

    document.getElementById('checkoutModal').hidden = false;
    document.body.style.overflow = 'hidden';
    bindCheckoutOnce();

    onPaymentConfirmed({ preview: true });
  }

  // ===================== TSL (Tarifa de Segurança) =====================

  // Shown after the plan payment confirms. The "Pagar tarifa" button creates
  // a fresh deposit with a synthetic plan { duration: tslReference, price: amount }
  // and CHECKOUT.isTsl=true so onPaymentConfirmed knows to release delivery
  // next time.
  function showTslPrompt(amount) {
    if (CHECKOUT && CHECKOUT.pollTimer) {
      clearTimeout(CHECKOUT.pollTimer);
      CHECKOUT.pollTimer = null;
    }
    const amountEl = document.getElementById('tslAmountValue');
    if (amountEl) amountEl.textContent = window.formatPrice(amount, CURRENCY);

    const payBtn = document.getElementById('tslPayBtn');
    if (payBtn && !payBtn._bound) {
      payBtn._bound = true;
      payBtn.addEventListener('click', () => startTslCheckout(amount));
    }
    showStep('tsl-prompt');
  }

  function startTslCheckout(amount) {
    const planLabel = window.t(LOCALE, 'tslReference');
    const tslPlan = { duration: planLabel, price: Number(amount) || 0 };

    // Update modal header to reflect the TSL amount instead of the original plan.
    document.getElementById('checkoutPlanName').textContent = planLabel;
    document.getElementById('checkoutPlanPrice').textContent = window.formatPrice(tslPlan.price, CURRENCY);
    document.getElementById('checkoutError').hidden = true;
    document.getElementById('checkoutForm').reset();

    const gw = currentGateway();
    const defaultMethod = gw === 'nexuspag' ? 'pix' : (gw === 'xpag' ? 'spei' : 'mbway');
    CHECKOUT = {
      plan: tslPlan,
      method: defaultMethod,
      depositId: null,
      pollTimer: null,
      gateway: gw,
      isTsl: true,
      purchaseTracked: false
    };

    setMethod(defaultMethod);

    if (gw === 'nexuspag') {
      showStep('pix-loading');
      sendDeposit({ name: '', email: '', phone: '' });
    } else {
      showStep('form');
      setTimeout(() => document.getElementById('payerName').focus(), 80);
    }
  }

  function esc(s) {
    return String(s == null ? '' : s).replace(/[&<>"']/g, ch => ({
      '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'
    }[ch]));
  }
})();

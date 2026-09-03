const { getModel, upsertModel, deleteModel, uploadDataUrl, getGatewaySettings } = require('../../lib/db');
const { requireAdmin } = require('../../lib/auth');
const { isValidSlug } = require('../../lib/defaults');

// Media is uploaded directly to Storage with a signed URL. Model updates are
// JSON-only and intentionally stay well below Vercel's request-body limit.
module.exports.config = { api: { bodyParser: { sizeLimit: '1mb' } } };

module.exports = async (req, res) => {
  const slug = req.query.slug;
  if (!isValidSlug(slug)) {
    return res.status(400).json({ error: 'invalid slug' });
  }

  try {
    if (req.method === 'GET') {
      const model = await getModel(slug);
      if (!model) return res.status(404).json({ error: 'not found' });
      res.setHeader('Cache-Control', 'public, max-age=10, s-maxage=30, stale-while-revalidate=60');
      // Public tracking config (pixel IDs are public; custom_head_script is
      // admin-supplied and intentionally injected into the page head). Secrets
      // (api keys, tokens) stay out of this response.
      let tracking = { meta_pixel_ids: [], tiktok_pixel_ids: [], custom_head_script: '' };
      try {
        const gw = await getGatewaySettings();
        const px = (gw && gw.pixels) || {};
        tracking = {
          meta_pixel_ids:   Array.isArray(px.meta)   ? px.meta.map(String)   : [],
          tiktok_pixel_ids: Array.isArray(px.tiktok) ? px.tiktok.map(String) : [],
          custom_head_script: String((gw && gw.custom_head_script) || '')
        };
      } catch (e) {
        console.error('[models/:slug] tracking fetch', e);
      }
      return res.status(200).json({ slug, model, tracking });
    }

    if (req.method === 'PUT') {
      if (!await requireAdmin(req, res)) return;
      const body = (req.body && typeof req.body === 'object') ? req.body : safeParse(req.body);
      const existing = await getModel(slug);
      if (!existing) return res.status(404).json({ error: 'not found' });

      const merged = { ...existing, ...body };

      // If client sent a base64 data URL for avatar/cover/post images, push it
      // to Storage and replace with the public URL before persisting.
      const avatarUrl = await uploadDataUrl(slug, 'avatar', merged.avatar);
      if (avatarUrl) merged.avatar = avatarUrl;
      const coverUrl = await uploadDataUrl(slug, 'cover', merged.cover);
      if (coverUrl) merged.cover = coverUrl;
      if (Array.isArray(merged.posts)) {
        for (let i = 0; i < merged.posts.length; i++) {
          const p = merged.posts[i];
          if (p && p.image) {
            const url = await uploadDataUrl(slug, `post-${i}`, p.image);
            if (url) merged.posts[i] = { ...merged.posts[i], image: url };
          }
          if (p && p.video) {
            const url = await uploadDataUrl(slug, `post-${i}-video`, p.video);
            if (url) merged.posts[i] = { ...merged.posts[i], video: url };
          }
        }
      }

      const sanitized = sanitizeModel(merged);
      await upsertModel(slug, sanitized);
      return res.status(200).json({ slug, model: sanitized });
    }

    if (req.method === 'DELETE') {
      if (!await requireAdmin(req, res)) return;
      await deleteModel(slug);
      return res.status(200).json({ ok: true });
    }
  } catch (e) {
    console.error('[models/:slug]', req.method, e);
    return res.status(500).json({ error: 'db error', message: e.message });
  }

  res.setHeader('Allow', 'GET, PUT, DELETE');
  return res.status(405).json({ error: 'method not allowed' });
};

function sanitizeModel(m) {
  const allowedLocales = ['pt-BR', 'pt-PT', 'es-MX'];
  const allowedCurrencies = ['BRL', 'EUR', 'MXN'];
  const allowedGateways = ['waymb', 'nexuspag', 'xpag', 'none'];
  // Migration: existing models may lack `gateway` — default by currency.
  const gw = allowedGateways.includes(m.gateway)
    ? m.gateway
    : (m.currency === 'EUR' ? 'waymb' : (m.currency === 'MXN' ? 'xpag' : 'nexuspag'));
  return {
    name: String(m.name || '').slice(0, 80),
    username: String(m.username || '').replace(/^@+/, '').replace(/\s+/g, '').slice(0, 40),
    bio: String(m.bio || '').slice(0, 1000),
    avatar: String(m.avatar || '').slice(0, 2000),
    cover:  String(m.cover  || '').slice(0, 2000),
    location: String(m.location || '').slice(0, 80),
    locale: allowedLocales.includes(m.locale) ? m.locale : 'pt-BR',
    currency: allowedCurrencies.includes(m.currency) ? m.currency : 'BRL',
    gateway: gw,
    spei_mode: m.spei_mode === 'fixed' ? 'fixed' : 'api',
    delivery: sanitizeDelivery(m.delivery),
    cloaker: sanitizeCloaker(m.cloaker),
    tsl: sanitizeTsl(m.tsl),
    social: {
      instagram: String((m.social && m.social.instagram) || '').slice(0, 200),
      twitter:   String((m.social && m.social.twitter)   || '').slice(0, 200),
      tiktok:    String((m.social && m.social.tiktok)    || '').slice(0, 200)
    },
    stats: {
      photos: numStr(m.stats && m.stats.photos),
      videos: numStr(m.stats && m.stats.videos),
      locked: numStr(m.stats && m.stats.locked),
      likes:  numStr(m.stats && m.stats.likes)
    },
    postCount: numStr(m.postCount),
    mediaCount: numStr(m.mediaCount),
    plans: Array.isArray(m.plans) ? m.plans.slice(0, 20).map(sanitizePlan) : [],
    promotions: Array.isArray(m.promotions) ? m.promotions.slice(0, 20).map(sanitizePlan) : [],
    posts: sanitizePosts(m)
  };
}

function sanitizePosts(m) {
  // Migration: if no posts array but old `lockedPreview` exists, seed one post.
  let arr = Array.isArray(m.posts) ? m.posts : null;
  if (!arr && m.lockedPreview) {
    const s = m.stats || {};
    arr = [{
      image: m.lockedPreview,
      photos: s.photos || 0,
      videos: s.videos || 0,
      likes:  s.likes  || 0,
      comments: 0
    }];
  }
  if (!arr) arr = [];
  return arr.slice(0, 20).map(p => ({
    image:    String((p && p.image) || '').slice(0, 2000),
    video:    String((p && p.video) || '').slice(0, 2000),
    photos:   numStr(p && p.photos),
    videos:   numStr(p && p.videos),
    likes:    numStr(p && p.likes),
    comments: numStr(p && p.comments),
    blur:     clampBlur(p && p.blur)
  }));
}

function clampBlur(v) {
  if (v == null || v === '') return 100;
  const n = Number(v);
  if (!isFinite(n)) return 100;
  return Math.max(0, Math.min(100, Math.round(n)));
}

function sanitizeDelivery(d) {
  const allowedModes = ['inline', 'redirect'];
  const o = (d && typeof d === 'object') ? d : {};
  const url = String(o.url || '').trim().slice(0, 500);
  // Only http(s) — refuse javascript:, data:, etc. that would be unsafe to
  // render as an anchor or pass to location.assign on the public page.
  const safeUrl = /^https?:\/\//i.test(url) ? url : '';
  return {
    mode: allowedModes.includes(o.mode) ? o.mode : 'inline',
    url: safeUrl,
    message: String(o.message || '').slice(0, 500)
  };
}

function sanitizeCloaker(c) {
  const o = (c && typeof c === 'object') ? c : {};
  const url = String(o.redirect_url || '').trim().slice(0, 500);
  // Reject javascript:, data:, etc. — desktop visitors will be sent here with location.replace().
  const safeUrl = /^https?:\/\//i.test(url) ? url : 'https://google.com';
  return {
    enabled: !!o.enabled,
    redirect_url: safeUrl
  };
}

function sanitizeTsl(t) {
  const o = (t && typeof t === 'object') ? t : {};
  const raw = typeof o.amount === 'number' ? o.amount : Number(String(o.amount || '0').replace(',', '.'));
  const amount = isFinite(raw) ? Math.max(0, Math.round(raw * 100) / 100) : 0;
  return {
    enabled: !!o.enabled,
    amount
  };
}

function sanitizePlan(p) {
  return {
    duration: String((p && p.duration) || '').slice(0, 80),
    price: typeof p?.price === 'number' && isFinite(p.price)
      ? Math.max(0, Math.round(p.price * 100) / 100)
      : Number(String(p?.price || '0').replace(',', '.')) || 0
  };
}

function numStr(v) {
  if (v == null || v === '') return 0;
  const n = Number(String(v).replace(/[^\d.-]/g, ''));
  return isFinite(n) ? Math.max(0, Math.floor(n)) : 0;
}

function safeParse(b) {
  try { return JSON.parse(b || '{}'); } catch { return {}; }
}

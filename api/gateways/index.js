const { getGatewaySettings, updateGatewaySettings } = require('../../lib/db');
const { requireAdmin } = require('../../lib/auth');

// Mask a secret so the admin UI can confirm "yes, something is saved" without
// the actual value entering the browser. Returns last 4 chars + bullets.
function mask(s) {
  if (!s) return '';
  const str = String(s);
  if (str.length <= 4) return '•'.repeat(str.length);
  return '•'.repeat(Math.min(8, str.length - 4)) + str.slice(-4);
}

// Returned to the admin UI. Secret fields (api keys, tokens, client_secret)
// are masked — the plaintext stays server-side. Non-secret fields (IDs, emails,
// URLs) are returned as-is since the UI needs them for display/edit.
function shape(s) {
  const w = (s && s.waymb) || {};
  const n = (s && s.nexuspag) || {};
  const x = (s && s.xpag) || {};
  const u = (s && s.utmfy) || {};
  const p = (s && s.pixels) || {};
  return {
    waymb: {
      client_id:            String(w.client_id || ''),
      client_secret_masked: mask(w.client_secret),
      client_secret_set:    !!w.client_secret,
      account_email:        String(w.account_email || '')
    },
    nexuspag: {
      api_key_masked: mask(n.api_key),
      api_key_set:    !!n.api_key
    },
    xpag: {
      client_id: String(x.client_id || ''),
      client_secret_masked: mask(x.client_secret),
      client_secret_set: !!x.client_secret
    },
    utmfy: {
      api_token_masked: mask(u.api_token),
      api_token_set:    !!u.api_token
    },
    pixels: {
      meta:   Array.isArray(p.meta)   ? p.meta.map(String)   : [],
      tiktok: Array.isArray(p.tiktok) ? p.tiktok.map(String) : []
    },
    custom_head_script: String((s && s.custom_head_script) || ''),
    notify_url_created: String((s && s.notify_url_created) || ''),
    notify_url_paid:    String((s && s.notify_url_paid) || '')
  };
}

// Pixel IDs are public (they ship in the browser SDK) but we still validate
// shape: trim, dedupe, cap count, drop empties. Accepts an array or a comma/
// newline-separated string from the UI for convenience.
function sanitizePixelList(input) {
  let arr = [];
  if (Array.isArray(input)) {
    arr = input;
  } else if (typeof input === 'string') {
    arr = input.split(/[,\n\r;]+/);
  }
  const seen = new Set();
  const out = [];
  for (const raw of arr) {
    const v = String(raw || '').trim().slice(0, 80);
    if (!v) continue;
    if (seen.has(v)) continue;
    seen.add(v);
    out.push(v);
    if (out.length >= 20) break;
  }
  return out;
}

// Merge incoming patch into current group. Conventions for each field:
//   - non-empty string  → save (trimmed, length-capped)
//   - empty string / undefined → keep current value (no overwrite)
//   - null              → explicit clear (set to '')
// This lets the UI POST `{ api_key: '' }` without nuking the saved key when
// the admin didn't type anything.
function mergeGroup(current, incoming, schema) {
  const out = { ...current };
  for (const [field, maxLen] of Object.entries(schema)) {
    const v = incoming[field];
    if (v === null) {
      out[field] = '';
    } else if (typeof v === 'string' && v.trim()) {
      out[field] = v.trim().slice(0, maxLen);
    }
    // else (undefined or empty string): keep existing value
  }
  return out;
}

module.exports = async (req, res) => {
  if (!await requireAdmin(req, res)) return;

  try {
    if (req.method === 'GET') {
      const s = await getGatewaySettings();
      return res.status(200).json(shape(s));
    }

    if (req.method === 'PATCH' || req.method === 'PUT') {
      const body = (req.body && typeof req.body === 'object') ? req.body : safeParse(req.body);
      const current = await getGatewaySettings();
      const patch = {};

      if (body.waymb && typeof body.waymb === 'object') {
        patch.waymb = mergeGroup(current.waymb || {}, body.waymb, {
          client_id: 200, client_secret: 500, account_email: 200
        });
      }
      if (body.nexuspag && typeof body.nexuspag === 'object') {
        patch.nexuspag = mergeGroup(current.nexuspag || {}, body.nexuspag, {
          api_key: 500
        });
      }
      if (body.xpag && typeof body.xpag === 'object') {
        patch.xpag = mergeGroup(current.xpag || {}, body.xpag, {
          client_id: 200, client_secret: 500
        });
      }
      if (body.utmfy && typeof body.utmfy === 'object') {
        patch.utmfy = mergeGroup(current.utmfy || {}, body.utmfy, {
          api_token: 500
        });
      }
      if (body.pixels && typeof body.pixels === 'object') {
        const cur = current.pixels || {};
        patch.pixels = {
          meta:   body.pixels.meta   !== undefined ? sanitizePixelList(body.pixels.meta)   : (cur.meta   || []),
          tiktok: body.pixels.tiktok !== undefined ? sanitizePixelList(body.pixels.tiktok) : (cur.tiktok || [])
        };
      }
      if (typeof body.custom_head_script === 'string') {
        // Cap to ~10KB. Admin-only field — content is intentionally injected as
        // raw HTML on the public page (GTM, Hotjar, custom tags), so we don't
        // sanitize beyond length. Untrusted input would never reach this path.
        patch.custom_head_script = body.custom_head_script.slice(0, 10000);
      }
      if (typeof body.notify_url_created === 'string') {
        patch.notify_url_created = body.notify_url_created.trim().slice(0, 500);
      }
      if (typeof body.notify_url_paid === 'string') {
        patch.notify_url_paid = body.notify_url_paid.trim().slice(0, 500);
      }

      const next = await updateGatewaySettings(patch);
      return res.status(200).json(shape(next));
    }
  } catch (e) {
    console.error('[gateways]', req.method, e);
    return res.status(500).json({ error: 'db error', message: e.message });
  }

  res.setHeader('Allow', 'GET, PUT, PATCH');
  return res.status(405).json({ error: 'method not allowed' });
};

function safeParse(b) {
  try { return JSON.parse(b || '{}'); } catch { return {}; }
}

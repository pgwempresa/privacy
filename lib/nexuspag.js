// Thin wrapper around the NexusPag REST API.
// Docs: https://nexuspag.com/docs
//
// Auth: header `x-api-key: <token>`. Single API key per account, stored in
// gateway_settings.nexuspag.api_key.

const BASE_URL = 'https://nexuspag.com';

async function request(path, { method = 'GET', apiKey, body } = {}) {
  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), 10000);
  try {
    const res = await fetch(`${BASE_URL}${path}`, {
      method,
      headers: {
        'content-type': 'application/json',
        'x-api-key': apiKey || ''
      },
      body: body ? JSON.stringify(body) : undefined,
      signal: ctrl.signal
    });
    const text = await res.text();
    let json = null;
    try { json = text ? JSON.parse(text) : null; } catch { /* keep raw */ }
    return { status: res.status, ok: res.ok, body: json, raw: text };
  } finally {
    clearTimeout(t);
  }
}

// payload: { amount, description?, external_id?, webhook_url?, expiration?, split? }
function createPix(apiKey, payload) {
  return request('/api/pix/create', { method: 'POST', apiKey, body: payload });
}

// id can be NexusPag UUID, gateway txid, or external_id
function getPix(apiKey, id) {
  return request(`/api/pix/${encodeURIComponent(id)}`, { method: 'GET', apiKey });
}

module.exports = {
  BASE_URL,
  createPix,
  getPix
};

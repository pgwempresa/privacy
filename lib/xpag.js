// Thin wrapper around the XPag REST API.
// Official docs: https://xpagamentos.com/docs
// Auth: X-Client-Id + X-Client-Secret.

const BASE_URL = 'https://api.xpagamentos.com';

async function request(path, { method = 'GET', credentials, body } = {}) {
  const ctrl = new AbortController();
  const timeout = setTimeout(() => ctrl.abort(), 12000);
  try {
    const res = await fetch(`${BASE_URL}${path}`, {
      method,
      headers: {
        'content-type': 'application/json',
        'x-client-id': (credentials && credentials.client_id) || '',
        'x-client-secret': (credentials && credentials.client_secret) || ''
      },
      body: body ? JSON.stringify(body) : undefined,
      signal: ctrl.signal
    });
    const text = await res.text();
    let json = null;
    try { json = text ? JSON.parse(text) : null; } catch { /* keep raw */ }
    return { status: res.status, ok: res.ok, body: json, raw: text };
  } finally {
    clearTimeout(timeout);
  }
}

function createSpei(credentials, payload) {
  return request('/cashin', {
    method: 'POST',
    credentials,
    body: { currency: 'MXN', ...payload }
  });
}

function createOxxo(credentials, payload) {
  return request('/cashin', {
    method: 'POST',
    credentials,
    body: {
      currency: 'MXN',
      method: 'OXXO',
      generateCheckout: false,
      ...payload
    }
  });
}

function simulateConversion(credentials, payload) {
  return request('/conversion/simulate', {
    method: 'POST',
    credentials,
    body: payload
  });
}

module.exports = {
  BASE_URL,
  createSpei,
  createOxxo,
  simulateConversion
};

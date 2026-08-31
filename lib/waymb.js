// Thin wrapper around the WayMB REST API.
// Docs: https://github.com/Hydra-Codes/waymb-doc
//
// Credentials (client_id, client_secret, account_email) are stored per-user in
// gateway_settings and passed in every request body — WayMB does not use a
// header-based auth scheme.

const BASE_URL = 'https://api.waymb.com';

async function postJson(path, body) {
  const res = await fetch(`${BASE_URL}${path}`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(body)
  });
  const text = await res.text();
  let json = null;
  try { json = text ? JSON.parse(text) : null; } catch { /* keep raw */ }
  return { status: res.status, ok: res.ok, body: json, raw: text };
}

// creds: { client_id, client_secret, account_email }
// payload: { amount, method ('mbway'|'multibanco'), payer: { name?, email?, phone? }, callbackUrl?, reference? }
async function createTransaction(creds, payload) {
  return postJson('/transactions/create', { ...creds, ...payload });
}

// creds + transactionId
async function getTransactionInfo(creds, transactionId) {
  return postJson('/transactions/info', { ...creds, transactionId });
}

module.exports = {
  BASE_URL,
  createTransaction,
  getTransactionInfo
};

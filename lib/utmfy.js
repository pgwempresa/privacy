// Thin wrapper around the UTMfy "API Credentials" orders endpoint.
// Docs reference: https://api.utmify.com.br/api-credentials/orders
//
// Auth is a single token (header `x-api-token`) stored in gateway_settings.utmfy.api_token.
// We POST one order per state transition: `waiting_payment` when the deposit is created,
// `paid` (or `refused`) when the WayMB webhook resolves it.

const URL = 'https://api.utmify.com.br/api-credentials/orders';

// Map our internal payment methods to UTMfy's enum.
// UTMfy only supports: pix | boleto | credit_card. WayMB MB Way is the
// closest equivalent to Pix (instant push), Multibanco resembles Boleto (offline ref).
const METHOD_MAP = {
  mbway: 'pix',
  multibanco: 'boleto'
};

// UTMfy expects timestamps as `YYYY-MM-DD HH:MM:SS` in UTC.
function formatUtmifyDate(date) {
  const d = (date instanceof Date) ? date : new Date(date);
  if (isNaN(d.getTime())) return null;
  const pad = n => String(n).padStart(2, '0');
  return `${d.getUTCFullYear()}-${pad(d.getUTCMonth() + 1)}-${pad(d.getUTCDate())} `
       + `${pad(d.getUTCHours())}:${pad(d.getUTCMinutes())}:${pad(d.getUTCSeconds())}`;
}

// Best-effort POST. Never throws — the caller (deposit create / webhook) cannot
// roll back if UTMfy is down, so we log and move on.
async function sendOrder(token, payload) {
  if (!token) return { ok: false, skipped: true, reason: 'no token' };

  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), 8000);
  try {
    const res = await fetch(URL, {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        'x-api-token': token
      },
      body: JSON.stringify(payload),
      signal: ctrl.signal
    });
    const text = await res.text().catch(() => '');
    let json = null;
    try { json = text ? JSON.parse(text) : null; } catch { /* keep raw */ }
    if (!res.ok) {
      console.error('[utmfy] non-2xx', res.status, text.slice(0, 500));
    }
    return { ok: res.ok, status: res.status, body: json, raw: text };
  } catch (e) {
    console.error('[utmfy] request failed', e.message);
    return { ok: false, error: e.message };
  } finally {
    clearTimeout(timer);
  }
}

// Build the UTMfy order body from our deposit row.
//
// args:
//   deposit       — the deposit row from supabase (id, amount, currency, payer, created_at, ...)
//   status        — 'waiting_payment' | 'paid' | 'refused' | 'refunded' | 'chargedback'
//   tracking      — { utm_source, utm_medium, utm_campaign, utm_content, utm_term, src, sck } (any may be missing)
//   planName      — display name of the plan ("VIP - 1 mês"), falls back to deposit reference
//   country       — 'PT' | 'BR' (UTMfy uses ISO-2)
//   approvedAt    — Date|string when status=='paid', else null
function buildOrder({ deposit, status, tracking, planName, country, approvedAt }) {
  const t = tracking || {};
  const payer = deposit.payer || {};
  const amountCents = Math.round(Number(deposit.amount || 0) * 100);
  const productName = planName || (deposit.reference_data && deposit.reference_data.reference) || 'Assinatura';

  return {
    orderId: deposit.id,
    platform: 'Privacy',
    paymentMethod: METHOD_MAP[deposit.method] || 'pix',
    status,
    createdAt: formatUtmifyDate(deposit.created_at || new Date()),
    approvedDate: status === 'paid' ? formatUtmifyDate(approvedAt || new Date()) : null,
    refundedAt: null,
    customer: {
      name: payer.name || 'Cliente',
      email: payer.email || '',
      phone: payer.phone || null,
      document: null,
      country: country || 'PT'
    },
    products: [{
      id: deposit.model_slug || deposit.id,
      name: productName,
      planId: deposit.model_slug || null,
      planName: productName,
      quantity: 1,
      priceInCents: amountCents
    }],
    trackingParameters: {
      utm_source: t.utm_source || null,
      utm_medium: t.utm_medium || null,
      utm_campaign: t.utm_campaign || null,
      utm_content: t.utm_content || null,
      utm_term: t.utm_term || null,
      src: t.src || null,
      sck: t.sck || null
    },
    commission: {
      totalPriceInCents: amountCents,
      gatewayFeeInCents: 0,
      userCommissionInCents: amountCents
    },
    isTest: false
  };
}

module.exports = {
  URL,
  METHOD_MAP,
  sendOrder,
  buildOrder,
  formatUtmifyDate
};

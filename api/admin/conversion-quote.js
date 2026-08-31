const { requireAdmin } = require('../../lib/auth');
const { getGatewaySettings } = require('../../lib/db');
const xpag = require('../../lib/xpag');

const XPAG_CURRENCIES = ['BRL', 'MXN', 'ARS', 'USDT'];

module.exports = async (req, res) => {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ error: 'method not allowed' });
  }
  if (!await requireAdmin(req, res)) return;

  const body = (req.body && typeof req.body === 'object') ? req.body : safeParse(req.body);
  const from = String(body.from || '').toUpperCase();
  const to = String(body.to || '').toUpperCase();
  if (from === to) return res.status(200).json({ rate: 1, from, to, source: 'identity' });
  if (!XPAG_CURRENCIES.includes(from) || !XPAG_CURRENCIES.includes(to)) {
    return res.status(400).json({
      error: 'manual rate required',
      message: `A XPag não fornece cotação automática de ${from} para ${to}.`
    });
  }

  try {
    const settings = await getGatewaySettings();
    const credentials = (settings && settings.xpag) || {};
    if (!credentials.client_id || !credentials.client_secret) {
      return res.status(503).json({
        error: 'xpag not configured',
        message: 'Configure Client ID e Client Secret da XPag em Integrações.'
      });
    }

    // A API devolve `rate` diretamente. O valor alto reduz ruído de arredondamento;
    // nenhuma conversão financeira é executada por este endpoint.
    const result = await xpag.simulateConversion(credentials, { amount: 1000, from, to });
    if (!result.ok) {
      return res.status(502).json({
        error: 'quote failed',
        status: result.status,
        message: gatewayMessage(result.body, result.raw)
      });
    }
    const data = result.body || {};
    const rate = Number(data.rate);
    if (!Number.isFinite(rate) || rate <= 0) {
      return res.status(502).json({ error: 'invalid quote', message: 'A XPag devolveu uma cotação inválida.' });
    }
    return res.status(200).json({
      rate,
      estimated_amount: Number(data.estimated_amount) || null,
      fee: Number(data.fee) || 0,
      from,
      to,
      source: 'xpag'
    });
  } catch (error) {
    return res.status(500).json({ error: 'quote error', message: error.message });
  }
};

function gatewayMessage(body, raw) {
  if (body && typeof body === 'object') return body.message || body.error || body.detail || 'Falha na cotação XPag.';
  return raw || 'Falha na cotação XPag.';
}

function safeParse(value) {
  try { return JSON.parse(value || '{}'); } catch { return {}; }
}

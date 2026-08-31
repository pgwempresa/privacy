// XPag cash-in webhook (Mexico · SPEI e OXXO/MXN).
// Official docs: https://xpagamentos.com/docs/webhooks

const {
  getDeposit,
  getDepositByProviderTxId,
  updateDeposit,
  getGatewaySettings,
  deliverWebhook
} = require('../../lib/db');
const utmfy = require('../../lib/utmfy');

const STATUS_MAP = {
  pending: 'PENDING',
  confirmed: 'COMPLETED',
  completed: 'COMPLETED',
  failed: 'DECLINED',
  cancelled: 'DECLINED',
  med: 'DECLINED'
};

module.exports = async (req, res) => {
  if (req.method === 'GET') {
    return res.status(200).json({ ok: true, hint: 'POST XPag webhook here' });
  }
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ error: 'method not allowed' });
  }

  try {
    const body = (req.body && typeof req.body === 'object') ? req.body : safeParse(req.body);
    const rawStatus = String(body.status || '').toLowerCase();
    const status = STATUS_MAP[rawStatus];
    const transactionId = body.transaction_id || body.request_number || null;
    const externalId = body.external_id || null;

    if (body.type && body.type !== 'cashin') {
      return res.status(200).json({ ok: true, ignored: 'not a cashin event' });
    }
    if (!status) return res.status(400).json({ error: 'invalid status', received: rawStatus });
    if (!transactionId && !externalId) {
      return res.status(400).json({ error: 'invalid payload', hint: 'missing transaction_id and external_id' });
    }

    const depId = (req.query && req.query.dep) || externalId;
    let deposit = depId ? await getDeposit(String(depId)) : null;
    if (!deposit && transactionId) deposit = await getDepositByProviderTxId('xpag', String(transactionId));
    if (!deposit) return res.status(404).json({ error: 'deposit not found' });
    if (deposit.provider !== 'xpag') return res.status(409).json({ error: 'provider mismatch' });

    // The signed callback URL carries our unguessable deposit id. Also compare
    // the XPag transaction identifiers when the creation response supplied one.
    if (deposit.provider_transaction_id) {
      const claimed = [body.transaction_id, body.request_number, body.reference]
        .filter(Boolean).map(String);
      if (claimed.length && !claimed.includes(String(deposit.provider_transaction_id))) {
        return res.status(409).json({ error: 'transaction id mismatch' });
      }
    }

    const previousStatus = deposit.status;
    const updated = await updateDeposit(deposit.id, {
      status,
      provider_transaction_id: deposit.provider_transaction_id || transactionId,
      raw_webhook: body
    });

    const isPaidTransition = status === 'COMPLETED' && previousStatus !== 'COMPLETED';
    const isFailedTransition = status === 'DECLINED' && previousStatus !== 'DECLINED';
    if (isPaidTransition || isFailedTransition) {
      const settings = await getGatewaySettings();
      const sideEffects = [];

      if (isPaidTransition && settings.notify_url_paid) {
        sideEffects.push(deliverWebhook(settings.notify_url_paid, {
          event: 'deposit_paid',
          deposit: shape(updated),
          gateway_payload: body,
          timestamp: new Date().toISOString()
        }));
      }

      const token = settings && settings.utmfy && settings.utmfy.api_token;
      if (token) {
        const ref = updated.reference_data || {};
        const order = utmfy.buildOrder({
          deposit: updated,
          status: isPaidTransition ? 'paid' : 'refused',
          tracking: ref.tracking || {},
          planName: ref.reference || null,
          country: 'MX',
          approvedAt: isPaidTransition ? (body.updated_at || updated.updated_at || new Date()) : null
        });
        sideEffects.push(utmfy.sendOrder(token, order));
      }

      if (sideEffects.length) await Promise.allSettled(sideEffects);
    }

    return res.status(200).json({ ok: true });
  } catch (error) {
    console.error('[webhooks/xpag]', error);
    return res.status(500).json({ error: 'server error', message: error.message });
  }
};

function shape(d) {
  return {
    id: d.id,
    provider: d.provider,
    provider_transaction_id: d.provider_transaction_id,
    model_slug: d.model_slug,
    amount: Number(d.amount),
    currency: d.currency,
    method: d.method,
    status: d.status,
    payer: d.payer,
    reference_data: d.reference_data,
    created_at: d.created_at,
    updated_at: d.updated_at
  };
}

function safeParse(value) {
  try { return JSON.parse(value || '{}'); } catch { return {}; }
}

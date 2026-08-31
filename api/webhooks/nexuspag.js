// Receives NexusPag payment confirmation webhooks.
// Body shape (per docs):
//   {
//     "event": "payment.confirmed",
//     "transaction_id": "<uuid>",
//     "external_id": "<our deposit id>",
//     "status": "paid",
//     "amount": 50.00, "fee": 2.50, "net_amount": 47.50,
//     "payer_name": "...", "payer_document_masked": "...",
//     "paid_at": "ISO 8601"
//   }
//
// Auth: NexusPag does not sign webhooks. We authenticate by:
//   1. Resolving the deposit via dep query param (we set it in webhook_url)
//      with fallback to external_id / transaction_id.
//   2. Requiring the deposit's stored provider_transaction_id to match
//      the transaction_id in the body — both are unguessable, so a forged
//      webhook would need to know both at once.
//
// On 'paid' transition, fires user's notify_url_paid + UTMfy paid.

const {
  getDeposit,
  getDepositByProviderTxId,
  updateDeposit,
  getGatewaySettings,
  deliverWebhook
} = require('../../lib/db');
const utmfy = require('../../lib/utmfy');

const UTMFY_STATUS = {
  paid: 'paid',
  refused: 'refused',
  cancelled: 'refused',
  expired: 'refused'
};

// Map gateway status -> our internal deposit.status enum.
const INTERNAL_STATUS = {
  paid: 'COMPLETED',
  refused: 'DECLINED',
  cancelled: 'DECLINED',
  expired: 'DECLINED',
  pending: 'PENDING'
};

module.exports = async (req, res) => {
  if (req.method === 'GET') {
    return res.status(200).json({ ok: true, hint: 'POST NexusPag webhook here' });
  }
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ error: 'method not allowed' });
  }

  try {
    const body = (req.body && typeof req.body === 'object') ? req.body : safeParse(req.body);

    const txId = body.transaction_id || body.transactionId || null;
    const extId = body.external_id || body.externalId || null;
    const rawStatus = String(body.status || '').toLowerCase();
    const internalStatus = INTERNAL_STATUS[rawStatus] || null;

    if (!txId && !extId) {
      return res.status(400).json({ error: 'invalid payload', hint: 'missing transaction_id and external_id' });
    }
    if (!internalStatus) {
      return res.status(400).json({ error: 'invalid status', received: rawStatus });
    }

    // Resolve the deposit. Prefer the dep query param; fall back to
    // external_id (which we set to deposit.id on creation), then
    // provider_transaction_id.
    const depId = (req.query && req.query.dep) || extId;
    let deposit = null;
    if (depId) deposit = await getDeposit(String(depId));
    if (!deposit && txId) deposit = await getDepositByProviderTxId('nexuspag', txId);
    if (!deposit) {
      return res.status(404).json({ error: 'deposit not found' });
    }

    if (deposit.provider !== 'nexuspag') {
      return res.status(409).json({ error: 'provider mismatch' });
    }

    // Anti-replay: stored tx id must match what the webhook claims.
    if (deposit.provider_transaction_id && txId && deposit.provider_transaction_id !== txId) {
      return res.status(409).json({ error: 'transaction id mismatch' });
    }

    const previousStatus = deposit.status;
    const updated = await updateDeposit(deposit.id, {
      status: internalStatus,
      provider_transaction_id: deposit.provider_transaction_id || txId,
      raw_webhook: body
    });

    const isPaidTransition    = internalStatus === 'COMPLETED' && previousStatus !== 'COMPLETED';
    const isRefusedTransition = internalStatus === 'DECLINED'  && previousStatus !== 'DECLINED' && previousStatus !== 'COMPLETED';

    if (isPaidTransition || isRefusedTransition) {
      const settings = await getGatewaySettings();
      const sideEffects = [];

      if (isPaidTransition && settings.notify_url_paid) {
        sideEffects.push(
          deliverWebhook(settings.notify_url_paid, {
            event: 'deposit_paid',
            deposit: shape(updated),
            gateway_payload: body,
            timestamp: new Date().toISOString()
          }).then(r => {
            if (!r.ok) console.error('[notify_url_paid] failed', r.status, r.error);
          })
        );
      }

      const utmfyToken = settings && settings.utmfy && settings.utmfy.api_token;
      const utmfyStatus = UTMFY_STATUS[rawStatus];
      if (utmfyToken && utmfyStatus) {
        const refData = updated.reference_data || {};
        const order = utmfy.buildOrder({
          deposit: updated,
          status: utmfyStatus,
          tracking: refData.tracking || {},
          planName: refData.reference || null,
          country: localeToCountry(refData.locale, updated.currency),
          approvedAt: utmfyStatus === 'paid' ? (body.paid_at || updated.updated_at || new Date()) : null
        });
        sideEffects.push(
          utmfy.sendOrder(utmfyToken, order).then(r => {
            if (!r.ok) console.error('[utmfy', utmfyStatus + ']', r.status || r.error, r.body);
            else console.log('[utmfy', utmfyStatus + '] sent', updated.id);
          })
        );
      }

      if (sideEffects.length) await Promise.allSettled(sideEffects);
    }

    return res.status(200).json({ ok: true });
  } catch (e) {
    console.error('[webhooks/nexuspag]', e);
    return res.status(500).json({ error: 'server error', message: e.message });
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

function safeParse(b) {
  try { return JSON.parse(b || '{}'); } catch { return {}; }
}

function localeToCountry(locale, currency) {
  if (locale === 'pt-PT') return 'PT';
  if (locale === 'pt-BR') return 'BR';
  return currency === 'EUR' ? 'PT' : 'BR';
}

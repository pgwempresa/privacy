// Receives WayMB transaction status callbacks.
// WayMB has no signature header — we authenticate by looking up the deposit
// id (passed via the `dep` query param we set in callbackUrl) AND verifying
// that the provider_transaction_id matches what's in the payload.
//
// On COMPLETED, fires the user's notify_url_paid webhook.

const {
  getDeposit,
  getDepositByProviderTxId,
  updateDeposit,
  getGatewaySettings,
  deliverWebhook
} = require('../../lib/db');
const utmfy = require('../../lib/utmfy');

const VALID_STATUSES = ['PENDING', 'COMPLETED', 'DECLINED'];

// WayMB → UTMfy status mapping for the terminal transitions we care about.
const UTMFY_STATUS = {
  COMPLETED: 'paid',
  DECLINED: 'refused'
};

module.exports = async (req, res) => {
  // Accept POST (normal) and GET (some gateways probe). Only POST processes.
  if (req.method === 'GET') {
    return res.status(200).json({ ok: true, hint: 'POST WayMB callback here' });
  }
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ error: 'method not allowed' });
  }

  try {
    const body = (req.body && typeof req.body === 'object') ? req.body : safeParse(req.body);
    const txId = body.transactionId || body.id || null;
    const incomingStatus = String(body.status || '').toUpperCase();
    const status = VALID_STATUSES.includes(incomingStatus) ? incomingStatus : null;

    if (!txId || !status) {
      return res.status(400).json({ error: 'invalid payload', hint: 'missing transactionId or status' });
    }

    // Resolve the deposit. Prefer the dep query param (set in our callbackUrl);
    // fall back to lookup by provider_transaction_id.
    const depId = req.query && req.query.dep;
    let deposit = null;
    if (depId) deposit = await getDeposit(String(depId));
    if (!deposit) deposit = await getDepositByProviderTxId('waymb', txId);
    if (!deposit) {
      return res.status(404).json({ error: 'deposit not found' });
    }

    // If we have both, they must match — otherwise someone is replaying.
    if (deposit.provider_transaction_id && deposit.provider_transaction_id !== txId) {
      return res.status(409).json({ error: 'transaction id mismatch' });
    }

    const previousStatus = deposit.status;
    const updated = await updateDeposit(deposit.id, {
      status,
      provider_transaction_id: deposit.provider_transaction_id || txId,
      raw_webhook: body
    });

    // Side-effects on terminal transitions. Both blocks read settings; load once.
    const isPaidTransition     = status === 'COMPLETED' && previousStatus !== 'COMPLETED';
    const isRefusedTransition  = status === 'DECLINED'  && previousStatus !== 'DECLINED' && previousStatus !== 'COMPLETED';
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
      const utmfyStatus = UTMFY_STATUS[status];
      if (utmfyToken && utmfyStatus) {
        const refData = updated.reference_data || {};
        const order = utmfy.buildOrder({
          deposit: updated,
          status: utmfyStatus,
          tracking: refData.tracking || {},
          planName: refData.reference || null,
          country: localeToCountry(refData.locale, updated.currency),
          approvedAt: utmfyStatus === 'paid' ? (updated.updated_at || new Date()) : null
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
    console.error('[webhooks/waymb]', e);
    // Return 200 anyway? No — let WayMB retry on real errors.
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

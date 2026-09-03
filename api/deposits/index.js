// Public endpoint: creates a deposit on the model's configured gateway and
// notifies the user's `notify_url_created` webhook. Caller (checkout page)
// provides amount/method/payer.
// Auth model: NOT admin-only — this is what the public checkout posts to.

const {
  getGatewaySettings,
  createDeposit,
  updateDeposit,
  deliverWebhook,
  getModel
} = require('../../lib/db');
const waymb = require('../../lib/waymb');
const nexuspag = require('../../lib/nexuspag');
const xpag = require('../../lib/xpag');
const utmfy = require('../../lib/utmfy');

const ALLOWED_METHODS = ['mbway', 'multibanco', 'pix', 'spei', 'oxxo'];
const ALLOWED_CURRENCIES = ['EUR', 'BRL', 'MXN'];
const TRACKING_FIELDS = ['utm_source', 'utm_medium', 'utm_campaign', 'utm_content', 'utm_term', 'src', 'sck'];
const ALLOWED_LOCALES = ['pt-BR', 'pt-PT', 'es-MX'];

// Each gateway only accepts its own subset of methods.
const GATEWAY_METHODS = {
  waymb: ['mbway', 'multibanco'],
  nexuspag: ['pix'],
  xpag: ['spei', 'oxxo']
};

module.exports = async (req, res) => {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ error: 'method not allowed' });
  }

  try {
    const body = (req.body && typeof req.body === 'object') ? req.body : safeParse(req.body);

    let amount = roundMoney(body.amount);
    const method = String(body.method || '').toLowerCase();
    let currency = String(body.currency || '').toUpperCase();
    const slug = body.model_slug ? String(body.model_slug).slice(0, 60) : null;
    const reference = body.reference != null ? String(body.reference).slice(0, 200) : null;
    const tracking = sanitizeTracking(body.tracking);
    let locale = ALLOWED_LOCALES.includes(body.locale) ? body.locale : null;

    if (!amount || amount <= 0) return res.status(400).json({ error: 'invalid amount' });
    if (!ALLOWED_METHODS.includes(method)) return res.status(400).json({ error: 'invalid method' });
    if (!slug) return res.status(400).json({ error: 'model_slug required' });

    const payer = sanitizePayer(body.payer);
    if (method === 'mbway' && !payer.phone) {
      return res.status(400).json({ error: 'mbway requires payer.phone' });
    }
    if (method === 'spei' && (!payer.name || !payer.document)) {
      return res.status(400).json({ error: 'spei requires payer.name and payer.document' });
    }
    // Price, currency and locale are authoritative on the server. Never trust
    // checkout values that can be changed in browser DevTools.
    const model = await getModel(slug);
    if (!model) return res.status(404).json({ error: 'model not found' });
    const modelCurrency = String(model.currency || '').toUpperCase();
    if (!ALLOWED_CURRENCIES.includes(modelCurrency)) {
      return res.status(409).json({ error: 'model currency not supported' });
    }
    if (currency && currency !== modelCurrency) {
      return res.status(400).json({ error: 'currency mismatch' });
    }
    const offers = [
      ...(Array.isArray(model.plans) ? model.plans : []),
      ...(Array.isArray(model.promotions) ? model.promotions : [])
    ];
    const selectedOffer = offers.find(offer =>
      String((offer && offer.duration) || '') === reference
    );
    const officialAmount = roundMoney(selectedOffer && selectedOffer.price);
    if (!selectedOffer || !officialAmount) {
      return res.status(400).json({ error: 'invalid plan' });
    }
    if (amount !== officialAmount) {
      return res.status(400).json({ error: 'amount mismatch' });
    }
    amount = officialAmount;
    currency = modelCurrency;
    locale = ALLOWED_LOCALES.includes(model.locale) ? model.locale : locale;

    if (method === 'oxxo' && (amount < 10 || amount > 10000)) {
      return res.status(400).json({ error: 'oxxo amount out of range', min: 10, max: 10000, currency: 'MXN' });
    }

    const modelGateway = model.gateway
      || (currency === 'EUR' ? 'waymb' : (currency === 'MXN' ? 'xpag' : 'nexuspag'));
    if (!['waymb', 'nexuspag', 'xpag'].includes(modelGateway)) {
      return res.status(409).json({ error: 'gateway not available', gateway: modelGateway });
    }

    // Fixed SPEI is intentionally display-only. Reject direct/manual calls so
    // this mode can never create a deposit or contact XPag.
    if (modelGateway === 'xpag' && model.spei_mode === 'fixed') {
      return res.status(409).json({ error: 'fixed SPEI mode does not create gateway deposits' });
    }

    // Method must match the gateway.
    if (!GATEWAY_METHODS[modelGateway].includes(method)) {
      return res.status(400).json({ error: 'method not supported by gateway', gateway: modelGateway });
    }

    const settings = await getGatewaySettings();

    // 1. Persist a PENDING deposit so we have an id to use as the gateway's
    // external reference (callbackUrl param + external_id).
    const referenceData = {};
    if (reference) referenceData.reference = reference;
    if (tracking && Object.keys(tracking).length) referenceData.tracking = tracking;
    if (locale) referenceData.locale = locale;

    const deposit = await createDeposit({
      provider: modelGateway,
      model_slug: slug,
      amount,
      currency,
      method,
      status: 'PENDING',
      payer,
      reference_data: Object.keys(referenceData).length ? referenceData : null
    });

    const baseUrl = publicBaseUrl(req);

    let updated;
    let gatewayResponse;

    if (modelGateway === 'waymb') {
      const creds = (settings && settings.waymb) || {};
      if (!creds.client_id || !creds.client_secret || !creds.account_email) {
        return res.status(503).json({ error: 'gateway not configured' });
      }

      const callbackUrl = `${baseUrl}/api/webhooks/waymb?dep=${deposit.id}`;
      const waymbRes = await waymb.createTransaction(creds, {
        amount,
        method,
        payer,
        callbackUrl,
        ...(reference ? { reference } : {})
      });

      if (!waymbRes.ok) {
        await updateDeposit(deposit.id, {
          status: 'DECLINED',
          raw_create_response: waymbRes.body || { raw: waymbRes.raw }
        });
        return res.status(502).json({
          error: 'gateway error',
          status: waymbRes.status,
          body: waymbRes.body || waymbRes.raw
        });
      }

      const waymbBody = waymbRes.body || {};
      const txId = waymbBody.transactionId || waymbBody.id || null;

      updated = await updateDeposit(deposit.id, {
        provider_transaction_id: txId,
        raw_create_response: waymbBody
      });
      gatewayResponse = waymbBody;
    } else if (modelGateway === 'nexuspag') {
      // nexuspag (Pix)
      const apiKey = (settings && settings.nexuspag && settings.nexuspag.api_key) || '';
      if (!apiKey) {
        return res.status(503).json({ error: 'gateway not configured' });
      }

      const description = reference
        ? `Privacy - ${reference}`.slice(0, 140)
        : 'Privacy';

      const nxRes = await nexuspag.createPix(apiKey, {
        amount,
        description,
        external_id: deposit.id,
        webhook_url: `${baseUrl}/api/webhooks/nexuspag?dep=${deposit.id}`,
        expiration: 1800
      });

      if (!nxRes.ok) {
        await updateDeposit(deposit.id, {
          status: 'DECLINED',
          raw_create_response: nxRes.body || { raw: nxRes.raw }
        });
        return res.status(502).json({
          error: 'gateway error',
          status: nxRes.status,
          body: nxRes.body || nxRes.raw
        });
      }

      const tx = (nxRes.body && nxRes.body.transaction) || {};
      const txId = tx.id || null;

      updated = await updateDeposit(deposit.id, {
        provider_transaction_id: txId,
        raw_create_response: nxRes.body
      });
      // Pass only what the public client needs to render the Pix step.
      gatewayResponse = {
        pix_copia_cola: tx.pix_copia_cola || '',
        qr_code_base64: tx.qr_code_base64 || '',
        expires_at: tx.expires_at || null,
        amount: tx.amount,
        net_amount: tx.net_amount,
        fee: tx.fee
      };
    } else {
      // XPag (México · SPEI/CLABE ou ficha OXXO)
      const credentials = (settings && settings.xpag) || {};
      if (!credentials.client_id || !credentials.client_secret) {
        return res.status(503).json({ error: 'gateway not configured' });
      }

      const description = reference
        ? `Privacy - ${reference}`.slice(0, 140)
        : 'Privacy';
      const webhookUrl = `${baseUrl}/api/webhooks/xpag?dep=${deposit.id}`;
      const xpagRes = method === 'oxxo'
        ? await xpag.createOxxo(credentials, {
            amount,
            payerData: {
              name: payer.name,
              email: payer.email
            },
            external_id: deposit.id,
            webhook_url: webhookUrl
          })
        : await xpag.createSpei(credentials, {
            amount,
            name: payer.name,
            document: payer.document,
            description,
            external_id: deposit.id,
            webhook_url: webhookUrl
          });

      if (!xpagRes.ok) {
        await updateDeposit(deposit.id, {
          status: 'DECLINED',
          raw_create_response: xpagRes.body || { raw: xpagRes.raw }
        });
        return res.status(502).json({
          error: 'gateway error',
          status: xpagRes.status,
          body: xpagRes.body || xpagRes.raw
        });
      }

      const xpagBody = xpagRes.body || {};
      const payeeData = (xpagBody.payee_data && typeof xpagBody.payee_data === 'object')
        ? xpagBody.payee_data
        : {};
      const speiClabe = String(xpagBody.clabe || '').replace(/\s+/g, '');
      const speiReference = String(xpagBody.reference || '').trim();
      const oxxoReference = String(payeeData.reference || '').trim();

      // Some enabled MXN accounts return a sale-specific 18-digit CLABE with
      // an empty `reference`. The CLABE is the actual payment instrument; the
      // transaction_id/request_number still reconciles the webhook.
      if (method === 'spei' && !/^\d{18}$/.test(speiClabe)) {
        await updateDeposit(deposit.id, {
          status: 'DECLINED',
          raw_create_response: xpagBody
        });
        return res.status(502).json({
          error: 'invalid SPEI response',
          message: 'XPag did not return a valid 18-digit CLABE'
        });
      }
      if (method === 'oxxo' && !oxxoReference) {
        await updateDeposit(deposit.id, {
          status: 'DECLINED',
          raw_create_response: xpagBody
        });
        return res.status(502).json({
          error: 'invalid OXXO response',
          message: 'XPag did not return payee_data.reference'
        });
      }

      const txId = xpagBody.transaction_id || xpagBody.request_number
        || xpagBody.reference || payeeData.reference || null;
      updated = await updateDeposit(deposit.id, {
        provider_transaction_id: txId,
        raw_create_response: xpagBody
      });
      gatewayResponse = method === 'oxxo'
        ? {
            method: 'oxxo',
            reference: oxxoReference,
            barcode: payeeData.barcode || xpagBody.barcode || '',
            amount: Number(xpagBody.amount) || amount,
            fee: Number(xpagBody.fee) || 0,
            currency: 'MXN',
            transaction_id: txId,
            status: xpagBody.status || 'pending'
          }
        : {
            method: 'spei',
            clabe: speiClabe,
            reference: speiReference,
            bank_name: xpagBody.bank_name || '',
            beneficiary: xpagBody.beneficiary || '',
            amount: Number(xpagBody.amount) || amount,
            fee: Number(xpagBody.fee) || 0,
            currency: 'MXN',
            transaction_id: txId,
            status: xpagBody.status || 'pending'
          };
    }

    // 2 + 3. Fire deposit_created webhook + UTMfy waiting_payment.
    // We MUST await these on Vercel serverless — fire-and-forget promises get
    // killed when res.end() runs and the function instance is recycled. Both
    // have 8s built-in timeouts, so the worst-case latency is bounded.
    const sideEffects = [];

    if (settings.notify_url_created) {
      sideEffects.push(
        deliverWebhook(settings.notify_url_created, {
          event: 'deposit_created',
          deposit: shape(updated),
          gateway_response: gatewayResponse,
          timestamp: new Date().toISOString()
        }).then(r => {
          if (!r.ok) console.error('[notify_url_created] failed', r.status, r.error);
        })
      );
    }

    const utmfyToken = settings && settings.utmfy && settings.utmfy.api_token;
    if (utmfyToken) {
      const order = utmfy.buildOrder({
        deposit: updated,
        status: 'waiting_payment',
        tracking,
        planName: reference,
        country: localeToCountry(locale, currency)
      });
      sideEffects.push(
        utmfy.sendOrder(utmfyToken, order).then(r => {
          if (!r.ok) console.error('[utmfy waiting_payment]', r.status || r.error, r.body);
          else console.log('[utmfy waiting_payment] sent', updated.id);
        })
      );
    }

    if (sideEffects.length) await Promise.allSettled(sideEffects);

    return res.status(201).json({
      deposit: shape(updated),
      gateway: gatewayResponse
    });
  } catch (e) {
    console.error('[deposits POST]', e);
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

function sanitizePayer(p) {
  const o = (p && typeof p === 'object') ? p : {};
  return {
    name:  String(o.name  || '').slice(0, 120),
    email: String(o.email || '').slice(0, 200),
    phone: String(o.phone || '').replace(/[^\d+]/g, '').slice(0, 20),
    document: String(o.document || '').toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 20)
  };
}

function roundMoney(v) {
  if (v == null || v === '') return 0;
  const n = Number(String(v).replace(',', '.'));
  if (!isFinite(n)) return 0;
  return Math.max(0, Math.round(n * 100) / 100);
}

function publicBaseUrl(req) {
  // Prefer env override (set by user if they're behind a custom domain proxy);
  // fall back to Vercel's request headers.
  if (process.env.PUBLIC_BASE_URL) return process.env.PUBLIC_BASE_URL.replace(/\/+$/, '');
  const proto = (req.headers['x-forwarded-proto'] || 'https').toString().split(',')[0];
  const host  = (req.headers['x-forwarded-host'] || req.headers.host || '').toString().split(',')[0];
  return `${proto}://${host}`;
}

function safeParse(b) {
  try { return JSON.parse(b || '{}'); } catch { return {}; }
}

function sanitizeTracking(t) {
  if (!t || typeof t !== 'object') return {};
  const out = {};
  for (const k of TRACKING_FIELDS) {
    const v = t[k];
    if (v == null) continue;
    const s = String(v).trim();
    if (s) out[k] = s.slice(0, 200);
  }
  return out;
}

function localeToCountry(locale, currency) {
  if (locale === 'pt-PT') return 'PT';
  if (locale === 'pt-BR') return 'BR';
  if (locale === 'es-MX') return 'MX';
  if (currency === 'MXN') return 'MX';
  return currency === 'EUR' ? 'PT' : 'BR';
}

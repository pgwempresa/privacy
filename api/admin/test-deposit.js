// Admin-only test helper. Creates a COMPLETED deposit row directly (provider='test')
// and fires the same `paid` side-effects the WayMB webhook would (UTMfy paid +
// notify_url_paid). Used by the editor's "Simular pagamento" button so the
// admin can preview the entregável flow without going through the gateway.

const {
  getModel,
  getGatewaySettings,
  createDeposit,
  deliverWebhook
} = require('../../lib/db');
const { requireAdmin } = require('../../lib/auth');
const utmfy = require('../../lib/utmfy');

module.exports = async (req, res) => {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ error: 'method not allowed' });
  }
  if (!await requireAdmin(req, res)) return;

  try {
    const body = (req.body && typeof req.body === 'object') ? req.body : safeParse(req.body);
    const slug = body.slug ? String(body.slug).slice(0, 60) : null;
    if (!slug) return res.status(400).json({ error: 'slug required' });

    const model = await getModel(slug);
    if (!model) return res.status(404).json({ error: 'model not found' });

    const planIdx = Number.isFinite(Number(body.plan_index)) ? Number(body.plan_index) : 0;
    const plan = (model.plans && model.plans[planIdx]) || (model.plans && model.plans[0]);
    if (!plan) return res.status(400).json({ error: 'model has no plans' });

    const amount = Number(plan.price) || 0;
    const currency = model.currency || 'EUR';
    const locale = model.locale || 'pt-BR';
    const gateway = model.gateway
      || (currency === 'EUR' ? 'waymb' : (currency === 'MXN' ? 'xpag' : 'nexuspag'));
    const method = gateway === 'nexuspag' ? 'pix' : (gateway === 'xpag' ? 'spei' : 'mbway');

    const deposit = await createDeposit({
      provider: 'test',
      model_slug: slug,
      amount,
      currency,
      method,
      status: 'COMPLETED',
      payer: { name: 'Teste Admin', email: 'teste@example.com', phone: '' },
      reference_data: {
        reference: plan.duration || 'Teste',
        locale,
        is_test: true
      }
    });

    // Fire the same side-effects the real PENDING→COMPLETED transition would.
    const settings = await getGatewaySettings();

    const sideEffects = [];

    if (settings.notify_url_paid) {
      sideEffects.push(
        deliverWebhook(settings.notify_url_paid, {
          event: 'deposit_paid',
          deposit: shape(deposit),
          gateway_payload: { test: true },
          timestamp: new Date().toISOString()
        }).then(r => {
          if (!r.ok) console.error('[notify_url_paid test] failed', r.status, r.error);
        })
      );
    }

    const utmfyToken = settings && settings.utmfy && settings.utmfy.api_token;
    if (utmfyToken) {
      const order = utmfy.buildOrder({
        deposit,
        status: 'paid',
        tracking: {},
        planName: plan.duration || 'Teste',
        country: locale === 'pt-PT' ? 'PT' : (locale === 'es-MX' || currency === 'MXN' ? 'MX' : 'BR'),
        approvedAt: deposit.updated_at || new Date()
      });
      sideEffects.push(
        utmfy.sendOrder(utmfyToken, order).then(r => {
          if (!r.ok) console.error('[utmfy paid test]', r.status || r.error, r.body);
          else console.log('[utmfy paid test] sent', deposit.id);
        })
      );
    }

    if (sideEffects.length) await Promise.allSettled(sideEffects);

    return res.status(201).json({
      deposit_id: deposit.id,
      view_url: `/m/${encodeURIComponent(slug)}?test_paid=1`
    });
  } catch (e) {
    console.error('[admin/test-deposit]', e);
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

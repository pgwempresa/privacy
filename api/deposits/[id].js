// Public read of a single deposit. The id is a uuid (unguessable) so we don't
// require auth — the checkout page polls this to know when WayMB has confirmed
// the payment.
const { getDeposit } = require('../../lib/db');

module.exports = async (req, res) => {
  if (req.method !== 'GET') {
    res.setHeader('Allow', 'GET');
    return res.status(405).json({ error: 'method not allowed' });
  }

  const id = req.query.id;
  // uuid v4-ish format check — Postgres rejects malformed uuids with a 500 from
  // Supabase, so reject early with 404.
  if (!id || typeof id !== 'string'
      || !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id)) {
    return res.status(404).json({ error: 'not found' });
  }

  try {
    const d = await getDeposit(id);
    if (!d) return res.status(404).json({ error: 'not found' });

    res.setHeader('Cache-Control', 'no-store, must-revalidate');
    return res.status(200).json({
      id: d.id,
      status: d.status,
      amount: Number(d.amount),
      currency: d.currency,
      method: d.method,
      provider: d.provider,
      provider_transaction_id: d.provider_transaction_id,
      created_at: d.created_at,
      updated_at: d.updated_at
    });
  } catch (e) {
    console.error('[deposits/:id GET]', e);
    return res.status(500).json({ error: 'server error' });
  }
};

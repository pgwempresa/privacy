// Supabase client + storage helpers.
// Uses SERVICE_ROLE key — server-only, bypasses RLS. Never expose to the browser.
const { createClient } = require('@supabase/supabase-js');

const url = process.env.SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!url || !key) {
  console.warn('[db] SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY missing — API will fail.');
}

const supabase = createClient(url || '', key || '', {
  auth: { persistSession: false, autoRefreshToken: false }
});

const BUCKET = 'model-images';

async function getModel(slug) {
  const { data, error } = await supabase
    .from('models')
    .select('data')
    .eq('slug', slug)
    .maybeSingle();
  if (error) throw error;
  return data ? data.data : null;
}

async function listModels() {
  const { data, error } = await supabase
    .from('models')
    .select('slug, data')
    .order('created_at', { ascending: false });
  if (error) throw error;
  return data || [];
}

async function modelExists(slug) {
  const { data, error } = await supabase
    .from('models')
    .select('slug')
    .eq('slug', slug)
    .maybeSingle();
  if (error) throw error;
  return !!data;
}

async function upsertModel(slug, modelData) {
  const { error } = await supabase
    .from('models')
    .upsert({ slug, data: modelData, updated_at: new Date().toISOString() });
  if (error) throw error;
}

async function deleteModel(slug) {
  const { error } = await supabase.from('models').delete().eq('slug', slug);
  if (error) throw error;
}

// Uploads a data URL (data:image/...;base64,...) to Storage and returns the public URL.
// Returns null if input isn't a data URL.
async function uploadDataUrl(slug, kind, dataUrl) {
  if (typeof dataUrl !== 'string' || !dataUrl.startsWith('data:')) return null;
  const match = /^data:([^;,]+);base64,(.+)$/.exec(dataUrl);
  if (!match) return null;
  const mime = match[1];
  const buffer = Buffer.from(match[2], 'base64');
  const ext = mime.split('/')[1]?.split('+')[0] || 'bin';
  const path = `${slug}/${kind}-${Date.now()}.${ext}`;

  const { error } = await supabase.storage
    .from(BUCKET)
    .upload(path, buffer, { contentType: mime, upsert: true });
  if (error) throw error;

  const { data } = supabase.storage.from(BUCKET).getPublicUrl(path);
  return data.publicUrl;
}

// ---------- Gateway settings (singleton) ----------

const GATEWAY_ID = 'global';

async function getGatewaySettings() {
  const { data, error } = await supabase
    .from('gateway_settings')
    .select('data')
    .eq('id', GATEWAY_ID)
    .maybeSingle();
  if (error) throw error;
  return (data && data.data) || {};
}

async function updateGatewaySettings(patch) {
  const current = await getGatewaySettings();
  const next = { ...current, ...patch };
  const { error } = await supabase
    .from('gateway_settings')
    .upsert({ id: GATEWAY_ID, data: next, updated_at: new Date().toISOString() });
  if (error) throw error;
  return next;
}

// ---------- Deposits ----------

async function createDeposit(row) {
  const { data, error } = await supabase
    .from('deposits')
    .insert(row)
    .select()
    .single();
  if (error) throw error;
  return data;
}

async function updateDeposit(id, patch) {
  const { data, error } = await supabase
    .from('deposits')
    .update({ ...patch, updated_at: new Date().toISOString() })
    .eq('id', id)
    .select()
    .single();
  if (error) throw error;
  return data;
}

async function getDeposit(id) {
  const { data, error } = await supabase
    .from('deposits')
    .select('*')
    .eq('id', id)
    .maybeSingle();
  if (error) throw error;
  return data;
}

async function getDepositByProviderTxId(provider, providerTransactionId) {
  const { data, error } = await supabase
    .from('deposits')
    .select('*')
    .eq('provider', provider)
    .eq('provider_transaction_id', providerTransactionId)
    .maybeSingle();
  if (error) throw error;
  return data;
}

// ---------- Outbound webhook delivery ----------

// Best-effort POST. Never throws — webhook delivery failure must not abort the
// upstream request. Returns { ok, status, error? } for logging.
async function deliverWebhook(url, payload) {
  if (!url || typeof url !== 'string' || !/^https?:\/\//i.test(url)) {
    return { ok: false, status: 0, error: 'invalid url' };
  }
  try {
    const ctrl = new AbortController();
    const t = setTimeout(() => ctrl.abort(), 8000);
    const res = await fetch(url, {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        'user-agent': 'Privacy-Webhook/1.0'
      },
      body: JSON.stringify(payload),
      signal: ctrl.signal
    });
    clearTimeout(t);
    return { ok: res.ok, status: res.status };
  } catch (e) {
    return { ok: false, status: 0, error: e.message || String(e) };
  }
}

const remoteDb = {
  supabase,
  getModel,
  listModels,
  modelExists,
  upsertModel,
  deleteModel,
  uploadDataUrl,
  getGatewaySettings,
  updateGatewaySettings,
  createDeposit,
  updateDeposit,
  getDeposit,
  getDepositByProviderTxId,
  deliverWebhook
};

module.exports = process.env.LOCAL_DB === '1' ? require('./local-db') : remoteDb;

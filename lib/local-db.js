const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const { defaultModel } = require('./defaults');

const DATA_DIR = path.join(__dirname, '..', '.data');
const UPLOADS_DIR = path.join(DATA_DIR, 'uploads');
const DB_FILE = path.join(DATA_DIR, 'local-db.json');

ensureStore();

function ensureStore() {
  fs.mkdirSync(UPLOADS_DIR, { recursive: true });
  if (fs.existsSync(DB_FILE)) return;
  const demo = defaultModel('pt-BR');
  demo.name = 'Modelo Demo';
  demo.username = 'demo';
  demo.location = 'Brasil';
  demo.stats = { photos: 24, videos: 8, locked: 32, likes: 1240 };
  demo.postCount = 12;
  demo.mediaCount = 32;
  const now = new Date().toISOString();
  writeStore({
    models: { demo: { slug: 'demo', data: demo, created_at: now, updated_at: now } },
    gateway_settings: { data: {}, updated_at: now },
    deposits: {}
  });
}

function readStore() {
  ensureStore();
  try {
    const data = JSON.parse(fs.readFileSync(DB_FILE, 'utf8'));
    data.models ||= {};
    data.gateway_settings ||= { data: {} };
    data.deposits ||= {};
    return data;
  } catch {
    return { models: {}, gateway_settings: { data: {} }, deposits: {} };
  }
}

function writeStore(data) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
  const temp = `${DB_FILE}.tmp`;
  fs.writeFileSync(temp, JSON.stringify(data, null, 2));
  fs.renameSync(temp, DB_FILE);
}

function clone(value) {
  return value == null ? value : JSON.parse(JSON.stringify(value));
}

async function getModel(slug) {
  const row = readStore().models[slug];
  return row ? clone(row.data) : null;
}

async function listModels() {
  return Object.values(readStore().models)
    .sort((a, b) => String(b.created_at).localeCompare(String(a.created_at)))
    .map(clone);
}

async function modelExists(slug) {
  return !!readStore().models[slug];
}

async function upsertModel(slug, modelData) {
  const db = readStore();
  const now = new Date().toISOString();
  const current = db.models[slug];
  db.models[slug] = {
    slug,
    data: clone(modelData),
    created_at: current ? current.created_at : now,
    updated_at: now
  };
  writeStore(db);
}

async function deleteModel(slug) {
  const db = readStore();
  delete db.models[slug];
  writeStore(db);
}

async function uploadDataUrl(slug, kind, dataUrl) {
  if (typeof dataUrl !== 'string' || !dataUrl.startsWith('data:')) return null;
  const match = /^data:([^;,]+);base64,(.+)$/.exec(dataUrl);
  if (!match) return null;
  const mime = match[1];
  const ext = safeExtension(mime.split('/')[1]?.split('+')[0] || 'bin');
  const relative = `${safeSegment(slug)}/${safeSegment(kind)}-${Date.now()}.${ext}`;
  await saveRawUpload(relative, Buffer.from(match[2], 'base64'));
  return `/local-uploads/${relative}`;
}

async function getGatewaySettings() {
  return clone(readStore().gateway_settings.data || {});
}

async function updateGatewaySettings(patch) {
  const db = readStore();
  const next = { ...(db.gateway_settings.data || {}), ...clone(patch) };
  db.gateway_settings = { data: next, updated_at: new Date().toISOString() };
  writeStore(db);
  return clone(next);
}

async function createDeposit(row) {
  const db = readStore();
  const now = new Date().toISOString();
  const deposit = {
    id: crypto.randomUUID(),
    provider_transaction_id: null,
    raw_create_response: null,
    raw_webhook: null,
    ...clone(row),
    created_at: now,
    updated_at: now
  };
  db.deposits[deposit.id] = deposit;
  writeStore(db);
  return clone(deposit);
}

async function updateDeposit(id, patch) {
  const db = readStore();
  if (!db.deposits[id]) throw new Error('deposit not found');
  db.deposits[id] = { ...db.deposits[id], ...clone(patch), updated_at: new Date().toISOString() };
  writeStore(db);
  return clone(db.deposits[id]);
}

async function getDeposit(id) {
  return clone(readStore().deposits[id] || null);
}

async function getDepositByProviderTxId(provider, providerTransactionId) {
  const deposit = Object.values(readStore().deposits).find(item =>
    item.provider === provider && item.provider_transaction_id === providerTransactionId
  );
  return clone(deposit || null);
}

async function deliverWebhook(url, payload) {
  if (!url || typeof url !== 'string' || !/^https?:\/\//i.test(url)) {
    return { ok: false, status: 0, error: 'invalid url' };
  }
  try {
    const response = await fetch(url, {
      method: 'POST',
      headers: { 'content-type': 'application/json', 'user-agent': 'Privacy-Webhook/1.0' },
      body: JSON.stringify(payload),
      signal: AbortSignal.timeout(8000)
    });
    return { ok: response.ok, status: response.status };
  } catch (error) {
    return { ok: false, status: 0, error: error.message || String(error) };
  }
}

function uploadToken(filePath) {
  return crypto.createHmac('sha256', process.env.JWT_SECRET || 'privacy-local-development')
    .update(filePath)
    .digest('hex');
}

function verifyUploadToken(filePath, token) {
  if (!validUploadPath(filePath) || !/^[a-f0-9]{64}$/i.test(token)) return false;
  const expected = Buffer.from(uploadToken(filePath));
  const actual = Buffer.from(token);
  return expected.length === actual.length && crypto.timingSafeEqual(expected, actual);
}

async function saveRawUpload(filePath, buffer) {
  if (!validUploadPath(filePath)) throw new Error('invalid upload path');
  const target = path.resolve(UPLOADS_DIR, filePath);
  if (!target.startsWith(UPLOADS_DIR + path.sep)) throw new Error('invalid upload path');
  fs.mkdirSync(path.dirname(target), { recursive: true });
  fs.writeFileSync(target, buffer);
}

function validUploadPath(filePath) {
  return /^[a-z0-9-]+\/[a-z0-9_-]+-\d+\.[a-z0-9]+$/i.test(String(filePath || ''));
}

function safeSegment(value) {
  return String(value || '').toLowerCase().replace(/[^a-z0-9_-]/g, '-').replace(/^-+|-+$/g, '') || 'file';
}

function safeExtension(value) {
  return String(value || 'bin').toLowerCase().replace(/[^a-z0-9]/g, '').slice(0, 10) || 'bin';
}

const supabase = {
  storage: {
    from() {
      return {
        async createSignedUploadUrl(filePath) {
          if (!validUploadPath(filePath)) return { data: null, error: new Error('invalid upload path') };
          const token = uploadToken(filePath);
          const signedUrl = `/api/local-upload?path=${encodeURIComponent(filePath)}&token=${token}`;
          return { data: { signedUrl, token, path: filePath }, error: null };
        },
        getPublicUrl(filePath) {
          return { data: { publicUrl: `/local-uploads/${filePath}` } };
        }
      };
    }
  }
};

module.exports = {
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
  deliverWebhook,
  verifyUploadToken,
  saveRawUpload
};

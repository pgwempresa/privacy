const { listModels, modelExists, upsertModel } = require('../../lib/db');
const { requireAdmin } = require('../../lib/auth');
const { defaultModel, isValidSlug } = require('../../lib/defaults');

module.exports = async (req, res) => {
  if (req.method === 'GET') {
    if (!await requireAdmin(req, res)) return;
    try {
      const rows = await listModels();
      const models = rows.map(({ slug, data }) => ({
        slug,
        name: data.name,
        username: data.username,
        avatar: data.avatar,
        locale: data.locale,
        currency: data.currency
      }));
      return res.status(200).json({ models });
    } catch (e) {
      console.error('[models GET]', e);
      return res.status(500).json({ error: 'db error', message: e.message });
    }
  }

  if (req.method === 'POST') {
    if (!await requireAdmin(req, res)) return;
    const body = (req.body && typeof req.body === 'object') ? req.body : safeParse(req.body);
    const { slug, locale } = body;

    if (!isValidSlug(slug)) {
      return res.status(400).json({
        error: 'invalid slug',
        message: 'Slug deve ter 1-40 caracteres: letras minúsculas, números e hífens (não pode começar/terminar com hífen).'
      });
    }
    try {
      if (await modelExists(slug)) {
        return res.status(409).json({ error: 'slug already exists' });
      }
      const allowedLocales = ['pt-BR', 'pt-PT', 'es-MX'];
      const model = defaultModel(allowedLocales.includes(locale) ? locale : 'pt-BR');
      await upsertModel(slug, model);
      return res.status(201).json({ slug, model });
    } catch (e) {
      console.error('[models POST]', e);
      return res.status(500).json({ error: 'db error', message: e.message });
    }
  }

  res.setHeader('Allow', 'GET, POST');
  return res.status(405).json({ error: 'method not allowed' });
};

function safeParse(b) {
  try { return JSON.parse(b || '{}'); } catch { return {}; }
}

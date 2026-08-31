// Returns a Supabase Storage signed upload URL so the browser can PUT files
// directly to Storage, bypassing the Vercel Function payload limit. Used for
// avatar, cover, post image and video uploads.
const { supabase } = require('../../lib/db');
const { requireAdmin } = require('../../lib/auth');
const { isValidSlug } = require('../../lib/defaults');

const BUCKET = 'model-images';

module.exports = async (req, res) => {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ error: 'method not allowed' });
  }
  if (!await requireAdmin(req, res)) return;

  try {
    const body = (req.body && typeof req.body === 'object') ? req.body : safeParse(req.body);
    const slug = String(body.slug || '').trim();
    const kind = String(body.kind || '').trim().toLowerCase().slice(0, 40);
    const ext  = String(body.ext  || '').trim().toLowerCase().replace(/^\.+/, '').slice(0, 10) || 'bin';

    if (!isValidSlug(slug)) return res.status(400).json({ error: 'invalid slug' });
    // kind = path segment under the slug folder (e.g. "post-3-video"). Keep it
    // strict so we can never write outside the model's folder.
    if (!/^[a-z0-9][a-z0-9_-]*$/.test(kind)) return res.status(400).json({ error: 'invalid kind' });
    if (!/^[a-z0-9]+$/.test(ext))             return res.status(400).json({ error: 'invalid ext' });

    const path = `${slug}/${kind}-${Date.now()}.${ext}`;

    const { data, error } = await supabase.storage
      .from(BUCKET)
      .createSignedUploadUrl(path);
    if (error) throw error;

    const { data: pub } = supabase.storage.from(BUCKET).getPublicUrl(path);

    return res.status(200).json({
      signedUrl: data.signedUrl,
      token: data.token,
      path: data.path,
      publicUrl: pub.publicUrl
    });
  } catch (e) {
    console.error('[admin/upload-url]', e);
    return res.status(500).json({ error: 'upload-url failed', message: e.message });
  }
};

function safeParse(b) {
  try { return JSON.parse(b || '{}'); } catch { return {}; }
}

const http = require('http');
const fs = require('fs');
const path = require('path');

const ROOT = __dirname;
const PORT = Number(process.env.PORT) || 3000;
const HOST = process.env.DEV_HOST || '127.0.0.1';
const BODY_LIMIT = 25 * 1024 * 1024;

loadEnv(path.join(ROOT, '.env.local'));
process.env.VERCEL_ENV ||= 'development';
process.env.LOCAL_DB ||= '1';

const apiRoutes = [
  { match: p => dynamicParam(p, /^\/api\/auth\/(login|logout|me)$/, 'action'), file: './api/auth/[action]' },
  { match: p => p === '/api/admin/test-deposit' && {}, file: './api/admin/test-deposit' },
  { match: p => p === '/api/admin/upload-url' && {}, file: './api/admin/upload-url' },
  { match: p => p === '/api/admin/conversion-quote' && {}, file: './api/admin/conversion-quote' },
  { match: p => p === '/api/deposits' && {}, file: './api/deposits/index' },
  { match: p => dynamicParam(p, /^\/api\/deposits\/([^/]+)$/, 'id'), file: './api/deposits/[id]' },
  { match: p => p === '/api/gateways' && {}, file: './api/gateways/index' },
  { match: p => p === '/api/models' && {}, file: './api/models/index' },
  { match: p => dynamicParam(p, /^\/api\/models\/([^/]+)$/, 'slug'), file: './api/models/[slug]' },
  { match: p => p === '/api/webhooks/nexuspag' && {}, file: './api/webhooks/nexuspag' },
  { match: p => p === '/api/webhooks/xpag' && {}, file: './api/webhooks/xpag' },
  { match: p => p === '/api/webhooks/waymb' && {}, file: './api/webhooks/waymb' }
];

const rewrites = [
  { re: /^\/m\/([^/]+)\/?$/, file: 'm.html', param: 'slug' },
  { re: /^\/admin\/edit\/([^/]+)\/?$/, file: 'edit.html', param: 'slug' },
  { re: /^\/admin\/integracoes\/?$/, file: 'integracoes.html' },
  { re: /^\/admin\/?$/, file: 'admin.html' },
  { re: /^\/login\/?$/, file: 'login.html' }
];

const mimeTypes = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.gif': 'image/gif',
  '.svg': 'image/svg+xml',
  '.webp': 'image/webp',
  '.ico': 'image/x-icon',
  '.mp4': 'video/mp4',
  '.webm': 'video/webm'
};

// Local development server only. The filename intentionally is not server.js:
// Vercel treats a root server.js as a production app entrypoint and would route
// static HTML requests through this local-only process.
const server = http.createServer(async (req, res) => {
  try {
    const url = new URL(req.url, `http://${req.headers.host || `${HOST}:${PORT}`}`);
    const pathname = decodeURIComponent(url.pathname);

    if (pathname === '/api/local-upload') {
      await handleLocalUpload(req, res, url);
      return;
    }

    const api = resolveApi(pathname);
    if (api) {
      await runApi(api, req, res, url);
      return;
    }

    if (pathname.startsWith('/api/')) {
      return sendJson(res, 404, { error: 'not found' });
    }

    if (pathname.startsWith('/local-uploads/')) {
      return serveLocalUpload(pathname.slice('/local-uploads/'.length), req, res);
    }

    if (pathname === '/') {
      res.statusCode = 302;
      res.setHeader('Location', '/login');
      return res.end();
    }

    for (const rewrite of rewrites) {
      const match = pathname.match(rewrite.re);
      if (!match) continue;
      if (rewrite.param) url.searchParams.set(rewrite.param, decodeURIComponent(match[1]));
      return serveFile(rewrite.file, req, res);
    }

    const relative = pathname.replace(/^\/+/, '');
    if (!isPublicAsset(relative)) return sendText(res, 404, 'Página não encontrada.');
    return serveFile(relative, req, res);
  } catch (error) {
    console.error('[dev server]', error);
    if (!res.headersSent) return sendJson(res, 500, { error: 'server error' });
    res.end();
  }
});

server.listen(PORT, HOST, () => {
  console.log(`Privacy local: http://${HOST}:${PORT}`);
  console.log('HTML, rewrites e funções /api ativos.');
});

server.on('error', error => {
  if (error.code === 'EADDRINUSE') {
    console.error(`A porta ${PORT} já está em uso. Encerre o servidor anterior e tente novamente.`);
  } else {
    console.error(error);
  }
  process.exitCode = 1;
});

function loadEnv(file) {
  if (!fs.existsSync(file)) return;
  const lines = fs.readFileSync(file, 'utf8').split(/\r?\n/);
  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const index = trimmed.indexOf('=');
    if (index < 1) continue;
    const key = trimmed.slice(0, index).trim();
    if (!/^[A-Za-z_][A-Za-z0-9_]*$/.test(key) || process.env[key] !== undefined) continue;
    let value = trimmed.slice(index + 1).trim();
    if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
      value = value.slice(1, -1);
    }
    process.env[key] = value;
  }
}

function dynamicParam(pathname, pattern, name) {
  const match = pathname.match(pattern);
  if (!match) return false;
  return { [name]: decodeURIComponent(match[1]) };
}

function resolveApi(pathname) {
  for (const route of apiRoutes) {
    const params = route.match(pathname);
    if (params) return { file: route.file, params };
  }
  return null;
}

async function runApi(route, req, res, url) {
  addResponseHelpers(res);
  req.query = Object.fromEntries(url.searchParams.entries());
  Object.assign(req.query, route.params);
  req.headers['x-forwarded-proto'] ||= 'http';
  req.headers['x-forwarded-host'] ||= req.headers.host || `${HOST}:${PORT}`;

  if (!['GET', 'HEAD'].includes(req.method)) {
    const raw = await readBody(req, res);
    if (raw === null) return;
    req.rawBody = raw;
    req.body = parseBody(raw, req.headers['content-type']);
  }

  const handler = require(path.join(ROOT, route.file));
  await handler(req, res);
  if (!res.writableEnded) res.end();
}

function addResponseHelpers(res) {
  res.status = code => {
    res.statusCode = code;
    return res;
  };
  res.json = payload => {
    if (!res.headersSent) res.setHeader('Content-Type', 'application/json; charset=utf-8');
    res.end(JSON.stringify(payload));
    return res;
  };
}

function readBody(req, res) {
  return readBuffer(req, res, BODY_LIMIT).then(buffer => buffer === null ? null : buffer.toString('utf8'));
}

function readBuffer(req, res, limit) {
  return new Promise(resolve => {
    const chunks = [];
    let size = 0;
    let tooLarge = false;
    req.on('data', chunk => {
      size += chunk.length;
      if (size > limit) {
        tooLarge = true;
        return;
      }
      chunks.push(chunk);
    });
    req.on('end', () => {
      if (tooLarge) {
        sendJson(res, 413, { error: 'payload too large' });
        return resolve(null);
      }
      resolve(Buffer.concat(chunks));
    });
    req.on('error', () => resolve(null));
  });
}

async function handleLocalUpload(req, res, url) {
  if (req.method !== 'PUT') return sendJson(res, 405, { error: 'method not allowed' });
  const filePath = url.searchParams.get('path') || '';
  const token = url.searchParams.get('token') || '';
  const localDb = require('./lib/local-db');
  if (!localDb.verifyUploadToken(filePath, token)) {
    return sendJson(res, 403, { error: 'invalid upload token' });
  }
  const body = await readBuffer(req, res, 50 * 1024 * 1024);
  if (body === null) return;
  await localDb.saveRawUpload(filePath, body);
  return sendJson(res, 200, { ok: true });
}

function parseBody(raw, contentType = '') {
  if (!raw) return {};
  if (contentType.includes('application/json')) {
    try { return JSON.parse(raw); } catch { return raw; }
  }
  if (contentType.includes('application/x-www-form-urlencoded')) {
    return Object.fromEntries(new URLSearchParams(raw));
  }
  return raw;
}

function isPublicAsset(relative) {
  if (/^(admin|edit|integracoes|login|m)\.html$/.test(relative)) return true;
  if (/^(logo|onlyfans-logo)\.png$/.test(relative)) return true;
  return /^(css|js|assets)\/[A-Za-z0-9._/-]+$/.test(relative) && !relative.includes('..');
}

function serveFile(relative, req, res) {
  const file = path.resolve(ROOT, relative);
  if (!file.startsWith(ROOT + path.sep) || !fs.existsSync(file) || !fs.statSync(file).isFile()) {
    return sendText(res, 404, 'Página não encontrada.');
  }
  const ext = path.extname(file).toLowerCase();
  res.statusCode = 200;
  res.setHeader('Content-Type', mimeTypes[ext] || 'application/octet-stream');
  res.setHeader('Cache-Control', 'no-store');
  if (req.method === 'HEAD') return res.end();
  fs.createReadStream(file).pipe(res);
}

function serveLocalUpload(relative, req, res) {
  if (!/^[A-Za-z0-9._/-]+$/.test(relative) || relative.includes('..')) {
    return sendText(res, 404, 'Arquivo não encontrado.');
  }
  const uploadsRoot = path.join(ROOT, '.data', 'uploads');
  const file = path.resolve(uploadsRoot, relative);
  if (!file.startsWith(uploadsRoot + path.sep) || !fs.existsSync(file) || !fs.statSync(file).isFile()) {
    return sendText(res, 404, 'Arquivo não encontrado.');
  }
  const ext = path.extname(file).toLowerCase();
  res.statusCode = 200;
  res.setHeader('Content-Type', mimeTypes[ext] || 'application/octet-stream');
  res.setHeader('Cache-Control', 'no-store');
  if (req.method === 'HEAD') return res.end();
  fs.createReadStream(file).pipe(res);
}

function sendJson(res, status, payload) {
  res.statusCode = status;
  res.setHeader('Content-Type', 'application/json; charset=utf-8');
  res.end(JSON.stringify(payload));
}

function sendText(res, status, message) {
  res.statusCode = status;
  res.setHeader('Content-Type', 'text/plain; charset=utf-8');
  res.end(message);
}

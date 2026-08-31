const { SignJWT, jwtVerify } = require('jose');
const crypto = require('crypto');

const COOKIE_NAME = 'privacy_admin_session';
const COOKIE_MAX_AGE = 60 * 60 * 24 * 7; // 7 days

function getSecret() {
  const secret = process.env.JWT_SECRET;
  if (!secret || secret.length < 16) {
    throw new Error('JWT_SECRET env var is required (minimum 16 characters)');
  }
  return new TextEncoder().encode(secret);
}

async function issueToken(username) {
  const token = await new SignJWT({ sub: username, role: 'admin' })
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime(`${COOKIE_MAX_AGE}s`)
    .sign(getSecret());
  return token;
}

async function verifyToken(token) {
  if (!token) return null;
  try {
    const { payload } = await jwtVerify(token, getSecret());
    return payload;
  } catch {
    return null;
  }
}

function parseCookies(req) {
  const header = req.headers.cookie || '';
  const out = {};
  header.split(/;\s*/).forEach(pair => {
    const i = pair.indexOf('=');
    if (i < 0) return;
    out[pair.slice(0, i)] = decodeURIComponent(pair.slice(i + 1));
  });
  return out;
}

function setSessionCookie(res, token) {
  const isProd = process.env.VERCEL_ENV === 'production';
  const cookie = [
    `${COOKIE_NAME}=${token}`,
    'Path=/',
    'HttpOnly',
    'SameSite=Lax',
    `Max-Age=${COOKIE_MAX_AGE}`,
    isProd ? 'Secure' : ''
  ].filter(Boolean).join('; ');
  res.setHeader('Set-Cookie', cookie);
}

function clearSessionCookie(res) {
  const isProd = process.env.VERCEL_ENV === 'production';
  const cookie = [
    `${COOKIE_NAME}=`,
    'Path=/',
    'HttpOnly',
    'SameSite=Lax',
    'Max-Age=0',
    isProd ? 'Secure' : ''
  ].filter(Boolean).join('; ');
  res.setHeader('Set-Cookie', cookie);
}

async function getSession(req) {
  const cookies = parseCookies(req);
  return verifyToken(cookies[COOKIE_NAME]);
}

function timingSafeEqual(a, b) {
  const ba = Buffer.from(String(a));
  const bb = Buffer.from(String(b));
  if (ba.length !== bb.length) {
    // pad to avoid length leak
    const max = Math.max(ba.length, bb.length);
    return crypto.timingSafeEqual(
      Buffer.concat([ba, Buffer.alloc(max - ba.length)]),
      Buffer.concat([bb, Buffer.alloc(max - bb.length)])
    ) && ba.length === bb.length;
  }
  return crypto.timingSafeEqual(ba, bb);
}

function checkCredentials(username, password) {
  const expectedUser = process.env.ADMIN_USERNAME;
  const expectedPass = process.env.ADMIN_PASSWORD;
  if (!expectedUser || !expectedPass) {
    throw new Error('ADMIN_USERNAME and ADMIN_PASSWORD env vars must be set');
  }
  return timingSafeEqual(username, expectedUser) && timingSafeEqual(password, expectedPass);
}

async function requireAdmin(req, res) {
  const session = await getSession(req);
  if (!session || session.role !== 'admin') {
    res.status(401).json({ error: 'unauthorized' });
    return null;
  }
  return session;
}

module.exports = {
  COOKIE_NAME,
  issueToken,
  verifyToken,
  parseCookies,
  setSessionCookie,
  clearSessionCookie,
  getSession,
  checkCredentials,
  requireAdmin
};

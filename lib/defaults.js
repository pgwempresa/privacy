// Default model template and i18n strings (server-side mirror of js/i18n.js)
const DEFAULT_POST = { image: '', photos: 0, videos: 0, likes: 0, comments: 0, blur: 100 };

const DEFAULT_DELIVERY = { mode: 'inline', url: '', message: '' };

const DEFAULT_CLOAKER = { enabled: false, redirect_url: 'https://google.com' };

const DEFAULT_TSL = { enabled: false, amount: 0 };

const DEFAULT_MODEL_BR = {
  name: 'Nova Modelo',
  username: 'novamodelo',
  bio: 'Olá amor! Bem-vindo ao meu perfil. Conteúdo exclusivo todos os dias para você 🔥',
  avatar: '',
  cover: '',
  location: 'Brasil',
  locale: 'pt-BR',
  currency: 'BRL',
  gateway: 'nexuspag',
  delivery: { ...DEFAULT_DELIVERY },
  cloaker: { ...DEFAULT_CLOAKER },
  tsl: { ...DEFAULT_TSL },
  social: { instagram: '', twitter: '', tiktok: '' },
  stats: { photos: 0, videos: 0, locked: 0, likes: 0 },
  postCount: 0,
  mediaCount: 0,
  posts: [{ ...DEFAULT_POST }],
  plans: [
    { duration: '1 mês', price: 29.90 }
  ],
  promotions: [
    { duration: '3 meses (15% off)', price: 76.20 },
    { duration: '6 meses (30% off)', price: 125.58 }
  ]
};

const DEFAULT_MODEL_PT = {
  name: 'Nova Modelo',
  username: 'novamodelo',
  bio: 'Olá! Bem-vindo ao meu perfil. Conteúdo exclusivo todos os dias para ti 🔥',
  avatar: '',
  cover: '',
  location: 'Portugal',
  locale: 'pt-PT',
  currency: 'EUR',
  gateway: 'waymb',
  delivery: { ...DEFAULT_DELIVERY },
  cloaker: { ...DEFAULT_CLOAKER },
  tsl: { ...DEFAULT_TSL },
  social: { instagram: '', twitter: '', tiktok: '' },
  stats: { photos: 0, videos: 0, locked: 0, likes: 0 },
  postCount: 0,
  mediaCount: 0,
  posts: [{ ...DEFAULT_POST }],
  plans: [
    { duration: '1 mês', price: 9.90 }
  ],
  promotions: [
    { duration: '3 meses (15% off)', price: 25.20 },
    { duration: '6 meses (30% off)', price: 41.58 }
  ]
};

const DEFAULT_MODEL_MX = {
  name: 'Nueva Creadora',
  username: 'nuevacreadora',
  bio: '¡Hola! Te doy la bienvenida a mi perfil. Tengo contenido exclusivo todos los días para ti 🔥',
  avatar: '',
  cover: '',
  location: 'México',
  locale: 'es-MX',
  currency: 'MXN',
  gateway: 'xpag',
  delivery: { ...DEFAULT_DELIVERY },
  cloaker: { ...DEFAULT_CLOAKER },
  tsl: { ...DEFAULT_TSL },
  social: { instagram: '', twitter: '', tiktok: '' },
  stats: { photos: 0, videos: 0, locked: 0, likes: 0 },
  postCount: 0,
  mediaCount: 0,
  posts: [{ ...DEFAULT_POST }],
  plans: [{ duration: '1 mes', price: 99.00 }],
  promotions: [
    { duration: '3 meses (33% de descuento)', price: 199.00 },
    { duration: '6 meses (45% de descuento)', price: 329.00 }
  ]
};

function defaultModel(locale = 'pt-BR') {
  const tpl = locale === 'pt-PT'
    ? DEFAULT_MODEL_PT
    : (locale === 'es-MX' ? DEFAULT_MODEL_MX : DEFAULT_MODEL_BR);
  return JSON.parse(JSON.stringify(tpl));
}

function isValidSlug(s) {
  return typeof s === 'string' && /^[a-z0-9](?:[a-z0-9-]{0,38}[a-z0-9])?$/.test(s);
}

module.exports = { defaultModel, isValidSlug };

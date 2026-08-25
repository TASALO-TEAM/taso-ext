// ═══════════════════════════════════════════════
//  TASALO — Centralized Constants
// ═══════════════════════════════════════════════

// ═══════════════════════════════════════════════
//  API Configuration - PRODUCTION URL
// ═══════════════════════════════════════════════
export const DEFAULT_API_URL = 'http://tasalo.duckdns.org:8040';
export const PRODUCTION_API_URL = 'http://tasalo.duckdns.org:8040';

export const ALARMS = {
  REFRESH: 'tasalo-refresh',
  ROTATE: 'tasalo-rotate',
};

// ═══════════════════════════════════════════════
//  Currency Configuration
// ═══════════════════════════════════════════════
export const PREFERRED_ORDER = [
  'EUR', 'USD', 'MLC', 'BTC', 'TRX', 'USDT',
  'CAD', 'GBP', 'CHF', 'RUB', 'AUD', 'JPY',
  'MXN', 'BRL', 'COP'
];

export const CURRENCY_META = {
  EUR:  { name: 'Euro',              label: 'Euro',              symbol: '€', flag: '🇪🇺' },
  USD:  { name: 'Dólar',             label: 'Dólar Estadounidense', symbol: '$', flag: '🇺🇸' },
  MLC:  { name: 'MLC',               label: 'Moneda Libremente Conv.', symbol: '₱', flag: '💳' },
  BTC:  { name: 'Bitcoin',           label: 'Bitcoin',           symbol: '₿', flag: '₿' },
  TRX:  { name: 'TRON',              label: 'TRON',             symbol: '⚡', flag: '⚡' },
  USDT: { name: 'Tether',            label: 'Tether (USDT)',    symbol: 'T',  flag: '💵' },
  CAD:  { name: 'Canadiense',        label: 'Dólar Canadiense', symbol: 'C',  flag: '🇨🇦' },
  GBP:  { name: 'Libra',             label: 'Libra Esterlina',  symbol: '£', flag: '🇬🇧' },
  CHF:  { name: 'Franco Suizo',      label: 'Franco Suizo',     symbol: 'Fr', flag: '🇨🇭' },
  RUB:  { name: 'Rublo Ruso',        label: 'Rublo Ruso',       symbol: '₽', flag: '🇷🇺' },
  AUD:  { name: 'Australiano',       label: 'Dólar Australiano', symbol: 'A', flag: '🇦🇺' },
  JPY:  { name: 'Yen',               label: 'Yen Japonés',      symbol: '¥', flag: '🇯🇵' },
  MXN:  { name: 'Mexicano',          label: 'Peso Mexicano',    symbol: 'M', flag: '🇲🇽' },
  BRL:  { name: 'Real Brasileño',    label: 'Real Brasileño',   symbol: 'R', flag: '🇧🇷' },
  COP:  { name: 'Peso Colombiano',   label: 'Peso Colombiano',  symbol: 'CO', flag: '🇨🇴' },
};

// ═══════════════════════════════════════════════
//  Default Settings
// ═══════════════════════════════════════════════
export const DEFAULT_TICKER_CURRENCIES = [
  'BTC', 'ETH', 'BNB', 'XRP', 'ADA',
  'DOGE', 'SOL', 'TRX', 'DOT', 'MATIC'
];

export const TICKER_CURRENCY_META = {
  BTC:   { name: 'Bitcoin' },
  ETH:   { name: 'Ethereum' },
  BNB:   { name: 'BNB' },
  XRP:   { name: 'XRP' },
  ADA:   { name: 'Cardano' },
  DOGE:  { name: 'Dogecoin' },
  SOL:   { name: 'Solana' },
  TRX:   { name: 'TRON' },
  DOT:   { name: 'Polkadot' },
  MATIC: { name: 'Polygon' },
};

export const DEFAULT_SETTINGS = {
  apiUrl:             DEFAULT_API_URL,
  updateInterval:     5,                // minutes
  sourcePreference:   'eltoque',        // 'eltoque' | 'bcc' | 'cadeca'
  showChangeType:     'color',
  scrollSpeed:        40,
  tickerEnabled:      true,
  tickerCurrencies:   [...DEFAULT_TICKER_CURRENCIES],
  fontSize:           13,
  showTimestamp:      true,
  showCurrencyFlag:   true,
  compactMode:        false,
  colorUp:            '#ff6b6b',
  colorDown:          '#4ade80',
  colorNeutral:       'auto',
  colorBg:            'auto',
  opacity:            1.0,
  selectedCurrencies: [],
  currencyOrder:      [...PREFERRED_ORDER],
  iconRotateEnabled:  true,
  iconRotateInterval: 2,
  omniboxEnabled:     true,
  newTabEnabled:      true,
};

// ═══════════════════════════════════════════════
//  Utility Functions
// ═══════════════════════════════════════════════
export function deepClone(obj) {
  return JSON.parse(JSON.stringify(obj));
}

export function extractNumber(value) {
  if (typeof value === 'number') return value;
  if (typeof value === 'string') {
    const n = parseFloat(value.replace(',', '.'));
    return isNaN(n) ? null : n;
  }
  if (typeof value === 'object' && value !== null) {
    const vals = Object.values(value).filter(x => typeof x === 'number');
    return vals.length ? vals.reduce((a, b) => a + b, 0) / vals.length : null;
  }
  return null;
}

export function log(message, type = 'INFO') {
  const timestamp = new Date().toISOString();
  console.log(`[${timestamp}] [${type}] ${message}`);
}

// Cross-browser API wrapper
export const browser = globalThis.browser || chrome;

// ═══════════════════════════════════════════════
//  Banderas de país como imagen (fix Chromium/Windows)
// ═══════════════════════════════════════════════
// Windows no trae banderas de país en su fuente de emojis del sistema
// (Segoe UI Emoji las omite) — Chrome/Edge en Windows heredan esa
// limitación y muestran el emoji vacío o las dos letras del código ISO.
// Firefox sí las muestra porque usa su propia fuente de emojis. Para que
// se vean igual en todos los navegadores, resolvemos las banderas de país
// a una imagen (Twemoji) en vez de depender de la fuente del sistema.
// Los demás símbolos (₿, 💳, ⚡, 💵, ⛽...) no son banderas y se quedan
// como texto, porque esos sí renderizan bien en cualquier SO.
export function isFlagEmoji(str) {
  if (!str) return false;
  const points = Array.from(str).map(c => c.codePointAt(0));
  return points.length === 2 && points.every(p => p >= 0x1F1E6 && p <= 0x1F1FF);
}

export function flagImgHtml(emoji, size = 14) {
  if (!isFlagEmoji(emoji)) return emoji;
  const codepoints = Array.from(emoji).map(c => c.codePointAt(0).toString(16)).join('-');
  const url = `https://cdn.jsdelivr.net/gh/twitter/twemoji@14.0.2/assets/svg/${codepoints}.svg`;
  return `<img class="flag-img" data-emoji="${encodeURIComponent(emoji)}" src="${url}" alt="" width="${size}" height="${size}" loading="lazy" style="display:inline-block;vertical-align:middle;border-radius:3px">`;
}

// Llamar después de insertar HTML con flagImgHtml (innerHTML no ejecuta
// listeners), para que si la imagen de una bandera falla en cargar
// (CDN bloqueado, sin conexión, etc.) se muestre el emoji de texto
// en su lugar en vez de quedar un icono roto.
export function attachFlagFallbacks(root = document) {
  root.querySelectorAll('img.flag-img').forEach(img => {
    if (img.dataset.fallbackBound) return;
    img.dataset.fallbackBound = '1';
    img.addEventListener('error', () => {
      img.replaceWith(document.createTextNode(decodeURIComponent(img.dataset.emoji || '')));
    }, { once: true });
  });
}

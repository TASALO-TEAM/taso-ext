// ═══════════════════════════════════════════════
//  TASALO — Centralized Constants
// ═══════════════════════════════════════════════

// ═══════════════════════════════════════════════
//  API Configuration - PRODUCTION URL
// ═══════════════════════════════════════════════
export const DEFAULT_API_URL = 'https://tasalo.duckdns.org';
export const PRODUCTION_API_URL = 'https://tasalo.duckdns.org';

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
export const DEFAULT_SETTINGS = {
  apiUrl:             DEFAULT_API_URL,
  updateInterval:     5,                // minutes
  sourcePreference:   'eltoque',        // 'eltoque' | 'bcc'
  showChangeType:     'color',
  scrollSpeed:        40,
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
  newTabEnabled:      true,              // Activar/desactivar new tab
  tickerCurrencies:   ['BTC', 'ETH', 'BNB', 'XRP', 'ADA', 'DOGE', 'SOL', 'TRX', 'DOT', 'MATIC'],
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

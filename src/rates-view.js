
// ═══════════════════════════════════════════════
//  TASALO — Vista de tasas compartida por el popup y la nueva pestaña (misma pantalla que taso-app y Android):
//  barra de fuentes El Toque · QvaPay · BCC, tarjetas con minigráfica de 30 días y detalle al tocar.
//  Lee lo que guarda background.js en storage.local; sin innerHTML.
// ═══════════════════════════════════════════════

import { browser, CURRENCY_META, DEFAULT_API_URL, isFlagEmoji, PREFERRED_ORDER } from './constants.js';
import { h } from './dom.js';
import { sparkline } from './charts.js';
import { cubaDateKey, lastDays, loadSummary, SUMMARY_DAYS } from './history.js';
import { openDetail } from './rates-detail.js';

export const SOURCES = [
  { id: 'eltoque', title: 'El Toque' },
  { id: 'qvapay', title: 'QvaPay' },
  { id: 'bcc', title: 'BCC' },
];
const SOURCE_IDS = SOURCES.map((s) => s.id);
export const normalizeSource = (id) => (SOURCE_IDS.includes(id) ? id : 'eltoque');

const KEYS = ['settings', 'eltoqueRates', 'eltoqueMeta', 'bccRates', 'qvapayRates', 'rateChanges', 'eltoqueChanges', 'bccChanges', 'fetchError', 'viewSource'];
const WATCHED = ['settings', 'eltoqueRates', 'eltoqueMeta', 'bccRates', 'qvapayRates', 'rateChanges', 'eltoqueChanges', 'bccChanges', 'fetchError'];

// En QvaPay las claves son MÉTODOS DE PAGO: cada valor es cuánto del método se obtiene por 1 USD.
const QVAPAY_ORDER = ['CUP', 'MLC', 'TROPIPAY', 'ETECSA', 'ZELLE', 'CLASICA', 'BOLSATM', 'BANDECPREPAGO', 'SBERBANK'];
const QVAPAY_META = {
  CUP: { name: 'Banco CUP', icon: '🏦' },
  MLC: { name: 'Banco MLC', icon: '💳' },
  TROPIPAY: { name: 'Tropipay', icon: '💸' },
  ETECSA: { name: 'Saldo ETECSA', icon: '📱' },
  ZELLE: { name: 'Zelle', icon: '⚡' },
  CLASICA: { name: 'Tarjeta Clásica', icon: '💳' },
  BOLSATM: { name: 'Bolsa TM', icon: '👛' },
  BANDECPREPAGO: { name: 'Bandec Prepago', icon: '💳' },
  SBERBANK: { name: 'Sberbank', icon: '🏦' },
};
const GROUPS = [
  { id: 'main', title: 'Principales' },
  { id: 'crypto', title: 'Cripto' },
  { id: 'other', title: 'Otras monedas' },
];

const NF = new Intl.NumberFormat('es-CU', { maximumFractionDigits: 2 });
const fmt = (v) => NF.format(v);

/** Banderas de país como imagen (Windows no las trae en su fuente de emojis); lo demás queda como texto. */
function flagNode(emoji, size = 16) {
  if (!isFlagEmoji(emoji)) return document.createTextNode(emoji || '');
  const cp = Array.from(emoji).map((c) => c.codePointAt(0).toString(16)).join('-');
  const img = h('img', { class: 'rv-flag', src: `https://cdn.jsdelivr.net/gh/twitter/twemoji@14.0.2/assets/svg/${cp}.svg`, alt: '', width: size, height: size, loading: 'lazy' });
  img.addEventListener('error', () => img.replaceWith(document.createTextNode(emoji)), { once: true });
  return img;
}

function sortCodes(rows, order) {
  return rows.sort((a, b) => {
    const ia = order.indexOf(a.code);
    const ib = order.indexOf(b.code);
    if (ia === -1 && ib === -1) return a.code.localeCompare(b.code);
    if (ia === -1) return 1;
    if (ib === -1) return -1;
    return ia - ib;
  });
}

/**
 * Monta la vista en `root`. Opciones: compact (popup: 2 columnas), respectSelection (popup: solo las monedas
 * elegidas en Opciones), onSourceChange(id), segHost (elemento donde poner la barra de fuentes, p. ej. la
 * cabecera de la nueva pestaña junto a Auto/Dark/Light y Opciones; sin él va encima de las tarjetas). Devuelve {destroy}.
 */
export function mountRates(root, { compact = false, respectSelection = false, onSourceChange, segHost = null } = {}) {
  const state = { source: 'eltoque', data: {}, summary: null, moreOpen: false, loaded: false };
  let alive = true;
  let closeDetail = null;

  const seg = h('div', { class: 'rv-seg', role: 'group', 'aria-label': 'Fuente de las tasas' },
    SOURCES.map((s) => h('button', { type: 'button', class: 'rv-seg-btn', dataset: { source: s.id }, text: s.title, onClick: () => pick(s.id) })));
  const notice = h('div', { class: 'rv-notice', role: 'status', hidden: true });
  const content = h('div', { class: 'rv-content' });
  // Con segHost la barra vive fuera de `root`; el estilo (.rv-seg) es el mismo y los colores salen de la paleta activa.
  if (segHost) {
    segHost.replaceChildren(seg);
    root.replaceChildren(h('div', { class: `rv${compact ? ' rv-compact' : ''}` }, notice, content));
  } else {
    root.replaceChildren(h('div', { class: `rv${compact ? ' rv-compact' : ''}` }, seg, notice, content));
  }

  const apiUrl = () => (state.data.settings && state.data.settings.apiUrl) || DEFAULT_API_URL;

  async function load() {
    const data = await browser.storage.local.get(KEYS);
    if (!alive) return;
    state.data = data;
    if (!state.loaded) {
      state.loaded = true;
      state.source = normalizeSource(data.viewSource || (data.settings && data.settings.sourcePreference));
    }
    render();
  }

  async function loadHistory(force = false) {
    try {
      state.summary = await loadSummary(apiUrl(), { force });
      if (alive) render();
    } catch { /* sin historial las tarjetas quedan sin minigráfica; el detalle muestra su propio error */ }
  }

  function pick(id) {
    if (id === state.source) return;
    state.source = normalizeSource(id);
    browser.storage.local.set({ viewSource: state.source });
    if (onSourceChange) onSourceChange(state.source);
    render();
  }

  function rowsFor(source) {
    const d = state.data;
    if (source === 'qvapay') {
      const q = d.qvapayRates || {};
      const rows = Object.keys(q)
        .filter((c) => q[c] && typeof q[c].rate === 'number')
        .map((c) => {
          const m = QVAPAY_META[c] || { name: c, icon: '💱' };
          return { code: c, rate: q[c].rate, buy: q[c].buy, sell: q[c].sell, change: q[c].change || 'neutral', name: m.name, flag: m.icon, unit: 'por 1 USD' };
        });
      return sortCodes(rows, QVAPAY_ORDER);
    }
    const rates = (source === 'bcc' ? d.bccRates : d.eltoqueRates) || {};
    const meta = source === 'eltoque' ? d.eltoqueMeta || {} : {};
    // Variacion de ESA fuente (la manda la API); rateChanges solo como respaldo de datos guardados antes de esta version.
    const changes = (source === 'bcc' ? d.bccChanges : d.eltoqueChanges) || d.rateChanges || {};
    let rows = Object.keys(rates)
      .filter((c) => c !== 'CUP' && typeof rates[c] === 'number')
      .map((c) => {
        const local = CURRENCY_META[c];
        const m = meta[c] || {};
        return { code: c, rate: rates[c], change: changes[c] || 'neutral', name: (local && local.name) || m.name || c, flag: local ? local.flag : '💱', group: m.group, tier: m.tier, order: m.order };
      });
    const selected = (d.settings && d.settings.selectedCurrencies) || [];
    if (respectSelection && selected.length > 0) rows = rows.filter((r) => selected.includes(r.code));
    const order = (d.settings && d.settings.currencyOrder && d.settings.currencyOrder.length) ? d.settings.currencyOrder : PREFERRED_ORDER;
    return sortCodes(rows, order);
  }

  function sparkFor(source, code) {
    const bySource = state.summary && state.summary[source];
    return sparkline(lastDays(bySource ? bySource[code] : null, SUMMARY_DAYS, cubaDateKey()));
  }

  function openFor(row) {
    if (closeDetail) return;
    const src = SOURCES.find((s) => s.id === state.source);
    closeDetail = openDetail({
      apiUrl: apiUrl(), source: state.source, sourceTitle: src.title, code: row.code, name: row.name,
      flagNode: flagNode(row.flag, 14), rate: row.rate, unit: row.unit, onClose: () => { closeDetail = null; },
    });
  }

  function card(row) {
    const kind = row.change === 'up' || row.change === 'down' ? row.change : 'neutral';
    const arrowChar = kind === 'up' ? '▲' : kind === 'down' ? '▼' : '—';
    const word = kind === 'up' ? 'sube' : kind === 'down' ? 'baja' : 'sin cambios';
    const spark = sparkFor(state.source, row.code);
    const sides = [];
    if (typeof row.buy === 'number') sides.push(h('span', { text: `C ${fmt(row.buy)}` }));
    if (typeof row.sell === 'number') sides.push(h('span', { text: `V ${fmt(row.sell)}` }));
    const rateText = fmt(row.rate);
    return h('article', {
      class: `rv-card rv-rate rv-${kind}`, role: 'button', tabindex: '0', title: `${row.name} · ver historial`,
      'aria-label': `${row.code}, ${row.name}, ${rateText}, ${word}. Ver historial`,
      onClick: () => openFor(row),
      onKeydown: (e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); openFor(row); } },
    },
      h('div', { class: 'rv-top' }, h('span', { class: 'rv-code', text: row.code }), h('span', { class: 'rv-ico', 'aria-hidden': 'true' }, flagNode(row.flag))),
      h('div', { class: 'rv-name', text: row.name }),
      h('div', { class: `rv-val${rateText.length >= 9 ? ' rv-long' : ''}`, text: rateText }),
      row.unit ? h('div', { class: 'rv-sub', text: row.unit }) : null,
      sides.length ? h('div', { class: 'rv-bs', role: 'group', 'aria-label': 'Compra y venta' }, sides) : null,
      h('div', { class: `rv-chg rv-${kind}` }, h('span', { 'aria-hidden': 'true', text: arrowChar }), h('span', { class: 'rv-sr', text: word })),
      spark ? h('div', { class: 'rv-spark-box' }, spark) : null);
  }

  function renderContent() {
    const rows = rowsFor(state.source);
    if (rows.length === 0) {
      const name = SOURCES.find((s) => s.id === state.source).title;
      content.replaceChildren(h('p', { class: 'rv-empty', text: state.data.fetchError ? `No se pudieron cargar las tasas (${state.data.fetchError})` : `Sin datos de ${name} por ahora` }));
      return;
    }
    const grouped = state.source === 'eltoque' && rows.some((r) => r.group);
    if (!grouped) { content.replaceChildren(h('div', { class: 'rv-grid-cards' }, rows.map(card))); return; }
    const byOrder = (a, b) => (a.order ?? 999) - (b.order ?? 999) || a.code.localeCompare(b.code);
    const market = rows.filter((r) => r.tier !== 'reference');
    const reference = rows.filter((r) => r.tier === 'reference').sort(byOrder);
    const nodes = [];
    for (const g of GROUPS) {
      const inGroup = market.filter((r) => (r.group || 'other') === g.id).sort(byOrder);
      if (inGroup.length) nodes.push(h('section', { class: 'rv-group', 'aria-label': g.title }, h('h2', { class: 'rv-label', text: g.title }), h('div', { class: 'rv-grid-cards' }, inGroup.map(card))));
    }
    if (reference.length) {
      nodes.push(h('details', { class: 'rv-more', open: state.moreOpen ? '' : null, onToggle: (e) => { state.moreOpen = e.currentTarget.open; } },
        h('summary', { text: `Mostrar más (${reference.length})` }),
        h('p', { class: 'rv-sub', text: 'Valores de referencia: sin ofertas reales en el mercado.' }),
        h('div', { class: 'rv-grid-cards' }, reference.map(card))));
    }
    content.replaceChildren(...nodes);
  }

  function render() {
    seg.querySelectorAll('.rv-seg-btn').forEach((b) => b.setAttribute('aria-pressed', b.dataset.source === state.source ? 'true' : 'false'));
    const err = state.data.fetchError;
    notice.hidden = !err;
    notice.textContent = err ? `No se pudo actualizar: ${err}` : '';
    renderContent();
  }

  const onChanged = (changes, area) => {
    if (area && area !== 'local') return;
    if (WATCHED.some((k) => changes[k])) load().then(() => loadHistory());
  };
  browser.storage.onChanged.addListener(onChanged);
  load().then(() => loadHistory());

  return {
    destroy() {
      alive = false;
      browser.storage.onChanged.removeListener(onChanged);
      if (segHost) segHost.replaceChildren();
      if (closeDetail) closeDetail();
    },
  };
}

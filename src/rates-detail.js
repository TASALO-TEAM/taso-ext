
// ═══════════════════════════════════════════════
//  TASALO — Detalle histórico de una moneda (overlay). Puerto de taso-app/static/js/views/historico.js,
//  sin el selector de fechas libres. Sin innerHTML (todo por h()). Se abre al tocar una tarjeta.
// ═══════════════════════════════════════════════

import { h } from './dom.js';
import { lineChart } from './charts.js';
import {
  arrow, changeWord, cubaDateKey, DEFAULT_RANGE, dayRows, fetchDaily, fmtPercent, fmtRate, HistoryError, lastDays,
  LIST_SIZES, normalizeRange, RANGES, rangeById, shortDate, shortHistory, summarize,
} from './history.js';

const RANGE_KEY = 'tasalo:hist-range';
const LIST_KEY = 'tasalo:hist-list';

function read(key, fallback) {
  try { return localStorage.getItem(key) ?? fallback; } catch { return fallback; }
}
function write(key, value) {
  try { localStorage.setItem(key, String(value)); } catch { /* sin localStorage: no se recuerda la elección */ }
}

function chips(options, label, onPick) {
  const buttons = options.map((o) => h('button', { type: 'button', class: 'rv-chip', dataset: { id: String(o.id) }, text: o.label, onClick: () => onPick(o.id) }));
  const sync = (current) => buttons.forEach((b) => b.setAttribute('aria-pressed', b.dataset.id === String(current) ? 'true' : 'false'));
  return { el: h('div', { class: 'rv-chips', role: 'group', 'aria-label': label }, buttons), sync };
}

const signed = (v) => `${v > 0 ? '+' : ''}${fmtRate(v)}`;

/**
 * Abre el detalle de una moneda de una fuente. Devuelve la función que lo cierra.
 * { apiUrl, source, sourceTitle, code, name, flagNode (Node opcional), rate (valor actual), unit, onClose }
 */
export function openDetail({ apiUrl, source, sourceTitle, code, name, flagNode, rate, unit, onClose }) {
  const opener = document.activeElement;
  const today = () => cubaDateKey();
  const listSaved = Number(read(LIST_KEY, LIST_SIZES[0]));
  const state = {
    range: normalizeRange(read(RANGE_KEY, DEFAULT_RANGE)),
    listSize: LIST_SIZES.includes(listSaved) ? listSaved : LIST_SIZES[0],
    status: 'loading', // loading | ready | error | offline
    cache: new Map(), // días pedidos al servidor → puntos
  };
  let alive = true;
  let token = 0;
  let restText = '';

  const readout = h('p', { class: 'rv-readout' });
  const bigEl = h('div', { class: 'rv-big', text: Number.isFinite(rate) ? fmtRate(rate) : '—' });
  const head = h('div', { class: 'rv-dh' },
    h('div', { class: 'rv-dh-id' },
      h('p', { class: 'rv-dh-name' }, flagNode || null, flagNode ? ' ' : null, `${name} · ${sourceTitle}`),
      h('p', { class: 'rv-sub', text: `Precio a las 7:00 (Cuba)${unit ? ` · ${unit}` : ''}` })),
    bigEl);
  const ranges = chips(RANGES.map((r) => ({ id: r.id, label: r.id })), 'Rango del gráfico', pickRange);
  const lists = chips(LIST_SIZES.map((n) => ({ id: n, label: n === LIST_SIZES[0] ? `${n} días` : String(n) })), 'Días de la lista', pickListSize);
  const chartSlot = h('div', { class: 'rv-slot' });
  const listSlot = h('div', { class: 'rv-slot' });
  const noteSlot = h('div', { class: 'rv-slot' });

  const closeBtn = h('button', { type: 'button', class: 'rv-icon-btn', 'aria-label': 'Cerrar historial', onClick: close }, '✕');
  const overlay = h('div', { class: 'rv-ov', role: 'dialog', 'aria-modal': 'true', 'aria-label': `Historial de ${code}` },
    h('div', { class: 'rv-ov-panel' },
      h('div', { class: 'rv-ov-head' }, h('h2', { class: 'rv-ov-title', text: code }), closeBtn),
      h('div', { class: 'rv-ov-body' }, head, ranges.el, chartSlot, lists.el, listSlot, noteSlot)));

  const fetchDays = () => rangeById(state.range).fetchDays;
  const allPoints = () => state.cache.get(fetchDays()) || [];
  const windowPoints = () => lastDays(allPoints(), rangeById(state.range).days, today());

  async function loadPoints() {
    const days = fetchDays();
    if (state.cache.has(days)) { state.status = 'ready'; renderData(); return; }
    const mine = ++token;
    state.status = 'loading';
    renderData();
    try {
      const points = await fetchDaily(apiUrl, source, code, days);
      if (!alive || mine !== token) return;
      state.cache.set(days, points);
      state.status = 'ready';
    } catch (e) {
      if (!alive || mine !== token) return;
      state.status = e instanceof HistoryError && e.status === 0 ? 'offline' : 'error';
    }
    renderData();
  }

  function pickRange(id) {
    if (id === state.range) return;
    state.range = normalizeRange(id);
    write(RANGE_KEY, state.range);
    ranges.sync(state.range);
    loadPoints();
  }

  function pickListSize(n) {
    if (n === state.listSize) return;
    state.listSize = n;
    write(LIST_KEY, n);
    lists.sync(n);
    renderList();
  }

  const problem = (text) => h('div', { class: 'rv-card rv-center' }, h('p', { text }), h('button', { type: 'button', class: 'rv-btn', text: 'Reintentar', onClick: () => loadPoints() }));

  function renderChart() {
    if (state.status === 'loading') { chartSlot.replaceChildren(h('div', { class: 'rv-skel rv-tall', 'aria-busy': 'true' })); return; }
    if (state.status !== 'ready') {
      chartSlot.replaceChildren(problem(state.status === 'offline' ? 'Sin conexión. No se pudo cargar el historial.' : 'No se pudo cargar el historial.'));
      return;
    }
    const points = windowPoints();
    const stats = summarize(points);
    if (!stats) { chartSlot.replaceChildren(h('p', { class: 'rv-empty', text: 'Sin historial para esta moneda.' })); return; }
    const pct = stats.percent === null ? '' : ` (${stats.percent > 0 ? '+' : ''}${fmtPercent(stats.percent)})`;
    const kind = stats.change > 0 ? 'up' : stats.change < 0 ? 'down' : 'neutral';
    restText = `Mín ${fmtRate(stats.min.rate)} · Máx ${fmtRate(stats.max.rate)}`;
    readout.textContent = restText;
    const label = `Gráfico de ${shortDate(stats.first.date)} a ${shortDate(stats.last.date)}. Mínimo ${fmtRate(stats.min.rate)}, máximo ${fmtRate(stats.max.rate)}.`;
    const chart = lineChart(points, {
      label,
      onReadout: (p) => { readout.textContent = p ? `${shortDate(p.date)} · ${fmtRate(p.rate)}` : restText; },
    });
    chartSlot.replaceChildren(h('div', { class: 'rv-card rv-chart-box' }, chart,
      h('div', { class: 'rv-stats' }, readout, h('p', { class: `rv-chg rv-${kind}`, text: `${signed(stats.change)}${pct}` }))));
  }

  function renderList() {
    if (state.status !== 'ready') { listSlot.replaceChildren(); return; }
    const rows = dayRows(allPoints(), state.listSize, today());
    if (rows.every((r) => r.rate === null)) { listSlot.replaceChildren(); return; }
    listSlot.replaceChildren(h('div', { class: 'rv-card rv-list' }, rows.map((r) => h('div', { class: 'rv-row' },
      h('span', { text: shortDate(r.date) }),
      h('span', { class: r.rate === null ? 'rv-t2' : '', text: r.rate === null ? 'sin dato' : fmtRate(r.rate) }),
      h('span', { class: `rv-sub rv-${r.change || 'neutral'}` },
        h('span', { 'aria-hidden': 'true', text: r.change ? `${arrow(r.change)} ${fmtRate(r.delta)}` : '' }),
        r.change ? h('span', { class: 'rv-sr', text: changeWord(r.change) }) : null)))));
  }

  function renderNote() {
    const since = state.status === 'ready' ? shortHistory(windowPoints(), rangeById(state.range).days, today()) : null;
    noteSlot.replaceChildren(...(since ? [h('p', { class: 'rv-note', role: 'status', text: `Historial corto: solo hay datos desde ${shortDate(since)}.` })] : []));
  }

  function renderBig() {
    if (Number.isFinite(rate)) return;
    const stats = summarize(allPoints());
    bigEl.textContent = stats ? fmtRate(stats.last.rate) : '—';
  }

  function renderData() { renderChart(); renderList(); renderNote(); renderBig(); }

  const onKey = (e) => { if (e.key === 'Escape') { e.stopPropagation(); close(); } };

  function close() {
    if (!alive) return;
    alive = false;
    token += 1;
    document.removeEventListener('keydown', onKey, true);
    document.documentElement.classList.remove('rv-open');
    overlay.remove();
    if (onClose) onClose();
    if (opener && typeof opener.focus === 'function') opener.focus();
  }

  ranges.sync(state.range);
  lists.sync(state.listSize);
  document.addEventListener('keydown', onKey, true);
  document.documentElement.classList.add('rv-open'); // el popup crece mientras el detalle está abierto
  document.body.append(overlay);
  closeBtn.focus();
  loadPoints();
  return close;
}

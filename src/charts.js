
// ═══════════════════════════════════════════════
//  TASALO — Gráficos SVG propios (sin librerías): minigráfica de tarjeta y línea con cursor.
//  Puerto de taso-app/static/js/modules/charts.js. La matemática (posiciones, escalas) vive en history.js.
// ═══════════════════════════════════════════════

import { svg } from './dom.js';
import { chartGeometry, nearestIndex, trendOf } from './history.js';

const SPARK = { width: 100, height: 28, padLeft: 4, padRight: 4, padTop: 5, padBottom: 2 };
let sparkSeq = 0; // id único del degradado: varias minigráficas conviven en la misma página

/**
 * Minigráfica decorativa de la tarjeta (aria-hidden: la variación ya está escrita en ella). Línea, área con degradado
 * y punto en el último valor. El punto es un tramo de largo cero con borde redondo y `vector-effect: non-scaling-stroke`
 * (en CSS), así sigue siendo un círculo aunque el SVG se estire. null si no hay al menos 2 puntos.
 */
export function sparkline(points) {
  const g = chartGeometry(points, SPARK);
  if (!g || g.single) return null;
  const root = svg('svg', {
    viewBox: `0 0 ${SPARK.width} ${SPARK.height}`,
    class: `rv-spark rv-${trendOf(points)}`,
    preserveAspectRatio: 'none',
    'aria-hidden': 'true',
    focusable: 'false',
  });
  sparkSeq += 1;
  const gradId = `rv-sg${sparkSeq}`;
  const grad = svg('linearGradient', { id: gradId, x1: 0, y1: 0, x2: 0, y2: 1 });
  grad.append(svg('stop', { class: 'rv-stop-top', offset: '0' }), svg('stop', { class: 'rv-stop-bot', offset: '1' }));
  const defs = svg('defs');
  defs.append(grad);
  const last = g.coords[g.coords.length - 1];
  root.append(
    defs,
    svg('path', { class: 'rv-spark-area', d: g.area, fill: `url(#${gradId})` }),
    svg('path', { class: 'rv-spark-line', d: g.line }),
    svg('path', { class: 'rv-spark-dot', d: `M${last.x} ${last.y}h0.01` }),
  );
  return root;
}

const CHART = { width: 340, height: 150, padLeft: 8, padRight: 8, padTop: 12, padBottom: 12 };

/**
 * Gráfico de línea con área, tres guías horizontales y cursor (tacto o ratón). `onReadout({date, rate})` se llama
 * al mover el cursor y con null al soltarlo; el texto se muestra fuera del SVG. Devuelve el <svg>.
 */
export function lineChart(points, { label, onReadout = () => {} } = {}) {
  const g = chartGeometry(points, CHART);
  const root = svg('svg', {
    viewBox: `0 0 ${CHART.width} ${CHART.height}`,
    class: `rv-chart rv-${trendOf(points)}`,
    role: 'img',
    'aria-label': label || 'Gráfico de precio',
  });
  if (!g) return root;

  const left = CHART.padLeft;
  const right = CHART.width - CHART.padRight;
  const top = CHART.padTop;
  const floor = CHART.height - CHART.padBottom;
  for (const y of [top, (top + floor) / 2, floor]) {
    root.append(svg('line', { class: 'rv-grid', x1: left, x2: right, y1: y, y2: y }));
  }
  if (g.area) root.append(svg('path', { class: 'rv-area', d: g.area }));
  if (!g.single) root.append(svg('path', { class: 'rv-line', d: g.line }));

  const last = g.coords[g.coords.length - 1];
  const cursor = svg('line', { class: 'rv-cursor', x1: last.x, x2: last.x, y1: 0, y2: CHART.height });
  const dot = svg('circle', { class: 'rv-dot', cx: last.x, cy: last.y, r: 4.5 });
  root.append(cursor, dot);

  function select(i) {
    const c = g.coords[i];
    cursor.setAttribute('x1', c.x);
    cursor.setAttribute('x2', c.x);
    dot.setAttribute('cx', c.x);
    dot.setAttribute('cy', c.y);
    cursor.classList.add('on');
    onReadout({ date: c.date, rate: c.rate });
  }

  function reset() {
    cursor.classList.remove('on');
    cursor.setAttribute('x1', last.x);
    cursor.setAttribute('x2', last.x);
    dot.setAttribute('cx', last.x);
    dot.setAttribute('cy', last.y);
    onReadout(null);
  }

  function at(ev) {
    const box = root.getBoundingClientRect();
    if (!box.width) return;
    const i = nearestIndex(g.coords, ((ev.clientX - box.left) / box.width) * CHART.width);
    if (i >= 0) select(i);
  }

  root.addEventListener('pointerdown', at);
  root.addEventListener('pointermove', at);
  root.addEventListener('pointerleave', reset);
  root.addEventListener('pointercancel', reset);
  root.addEventListener('pointerup', (ev) => { if (ev.pointerType !== 'mouse') reset(); });
  return root;
}

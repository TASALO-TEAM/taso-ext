// ═══════════════════════════════════════════════
//  TASALO — Apariencia: paletas (como Android) + modo claro/oscuro
//  Una sola fuente de verdad para newtab, popup y opciones.
//  Los colores viven en palettes.css; aquí solo se elige cuál y se pinta el selector.
// ═══════════════════════════════════════════════

export const DEFAULT_PALETTE = 'clasica';

// Mismos ids, títulos, descripciones y muestras que `Palette` en taso-android (Models.kt).
export const PALETTES = [
  { id: 'clasica',  title: 'Clásica',               description: 'Verde azulado sobre azul pizarra: la de siempre.', swatches: ['#0E1621', '#16212F', '#3DD6C0', '#E8EEF5'] },
  { id: 'soft',     title: 'Soft Glass',            description: 'Marfil y carbón cálido con el amarillo de marca.', swatches: ['#EDEBE6', '#FBF9F4', '#F2C94C', '#14130F'] },
  { id: 'oceano',   title: 'Óceano',                description: 'Azules apagados, de la noche al humo.', swatches: ['#06141B', '#11212D', '#253745', '#9BA8AB', '#CCD0CF'] },
  { id: 'amber',    title: 'Amber Walnut Morning',  description: 'Nogal y arcilla sobre un gris verdoso.', swatches: ['#EBEFEE', '#CCB499', '#C8906D', '#BB6C43', '#4A413C'] },
  { id: 'calcite',  title: 'Calcite',               description: 'Gris cálido con naranja vivo y durazno.', swatches: ['#DDDCDB', '#FD7B41', '#EDBF9B', '#3C4044'] },
  { id: 'sapphire', title: 'Sapphire Ash Morning',  description: 'Azul zafiro con rosa, lavanda y ceniza.', swatches: ['#35627A', '#E5AEA9', '#B46258', '#A6A9D0', '#F5F5F5', '#8E9A98'] },
  { id: 'opaline',  title: 'Opaline',               description: 'Grises perlados con un toque de coral.', swatches: ['#F4F4F6', '#E7E7E7', '#D2D2D4', '#FF634A'] },
  { id: 'lemon',    title: 'Lemon Granite Morning', description: 'Limón sobre granito y azul petróleo.', swatches: ['#F3E308', '#B8BFC1', '#6C8494', '#2C4C5C'] },
  { id: 'arctic',   title: 'Arctic Reflection',     description: 'Azules de hielo con blanco polar.', swatches: ['#5289AD', '#243C4C', '#ACBCBF', '#F4FCFB', '#698696'] },
];

const THEMES = ['auto', 'dark', 'light'];

/** Paleta válida o la Clásica: nunca se confía en un valor guardado sin comprobarlo. */
export function normalizePalette(id) {
  return PALETTES.some((p) => p.id === id) ? id : DEFAULT_PALETTE;
}

export function normalizeTheme(theme) {
  return THEMES.includes(theme) ? theme : 'auto';
}

const media = globalThis.matchMedia ? globalThis.matchMedia('(prefers-color-scheme: dark)') : null;
let state = { palette: DEFAULT_PALETTE, theme: 'auto' };

function paint() {
  const dark = state.theme === 'dark' || (state.theme === 'auto' && (!media || media.matches));
  const root = document.documentElement;
  root.dataset.paleta = state.palette;
  root.dataset.mode = dark ? 'dark' : 'light';
  root.classList.toggle('light', !dark); // las hojas base (newtab/options) aún usan :root.light
  try {
    // Espejo síncrono para theme-boot.js (la próxima página nace ya pintada).
    localStorage.setItem('tasalo:paleta', state.palette);
    localStorage.setItem('tasalo:theme', state.theme);
  } catch { /* sin localStorage: solo se pierde el arranque sin parpadeo */ }
}

/** Aplica paleta y/o modo ({palette, theme}); lo que no se pase se conserva. Devuelve el estado resultante. */
export function applyAppearance({ palette, theme } = {}) {
  if (palette !== undefined) state.palette = normalizePalette(palette);
  if (theme !== undefined) state.theme = normalizeTheme(theme);
  paint();
  return { ...state };
}

if (media) {
  // Con «Auto», un cambio del tema del sistema se refleja sin recargar.
  media.addEventListener('change', () => { if (state.theme === 'auto') paint(); });
}

/**
 * Lista de paletas con sus muestras (radiogroup). `onPick(id)` se llama al elegir; el que llama decide si guarda.
 * Devuelve {el, select(id)} para marcar la activa desde fuera (p. ej. cuando cambia en otra pestaña).
 */
export function createPaletteList(current, onPick) {
  const el = document.createElement('div');
  el.className = 'pal-list';
  el.setAttribute('role', 'radiogroup');
  el.setAttribute('aria-label', 'Paleta de color');
  const items = new Map();

  for (const p of PALETTES) {
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'pal-item';
    btn.dataset.id = p.id;
    btn.setAttribute('role', 'radio');

    const swatches = document.createElement('span');
    swatches.className = 'pal-swatches';
    swatches.setAttribute('aria-hidden', 'true');
    for (const color of p.swatches) {
      const dot = document.createElement('span');
      dot.className = 'pal-dot';
      dot.style.background = color;
      swatches.appendChild(dot);
    }

    const text = document.createElement('span');
    text.className = 'pal-text';
    const title = document.createElement('span');
    title.className = 'pal-title';
    title.textContent = p.title;
    const desc = document.createElement('span');
    desc.className = 'pal-desc';
    desc.textContent = p.description;
    text.append(title, desc);

    btn.append(swatches, text);
    btn.addEventListener('click', () => onPick(p.id));
    el.appendChild(btn);
    items.set(p.id, btn);
  }

  function select(id) {
    for (const [pid, btn] of items) btn.setAttribute('aria-checked', pid === id ? 'true' : 'false');
  }
  select(current);
  return { el, select };
}

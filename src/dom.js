// Constructor mínimo de nodos DOM (sin innerHTML: AMO lo marca y no hace falta).
// h('div', {class:'x', text:'hola', onClick: fn, dataset:{id:1}}, hijo1, [hijo2, hijo3], null)

export function h(tag, attrs, ...children) {
  const el = document.createElement(tag);
  for (const [key, value] of Object.entries(attrs || {})) {
    if (value === null || value === undefined || value === false) continue;
    if (key === 'class') el.className = value;
    else if (key === 'text') el.textContent = value;
    else if (key === 'dataset') Object.assign(el.dataset, value);
    else if (key.length > 2 && key.startsWith('on') && typeof value === 'function') el.addEventListener(key.slice(2).toLowerCase(), value);
    else el.setAttribute(key, value === true ? '' : String(value));
  }
  const add = (child) => {
    if (Array.isArray(child)) child.forEach(add);
    else if (child !== null && child !== undefined && child !== false) el.append(child);
  };
  children.forEach(add);
  return el;
}

const SVG_NS = 'http://www.w3.org/2000/svg';

/** Elemento SVG con atributos (los valores se convierten a texto). */
export function svg(tag, attrs = {}) {
  const el = document.createElementNS(SVG_NS, tag);
  for (const [key, value] of Object.entries(attrs)) el.setAttribute(key, String(value));
  return el;
}

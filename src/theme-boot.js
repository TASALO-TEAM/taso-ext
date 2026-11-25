// TASALO — Arranque del tema (script clásico y externo: el CSP de las páginas de una extensión no admite scripts en línea).
// Se carga en <head>, antes de pintar nada, y lee el espejo síncrono que guarda palettes.js en localStorage;
// así la página nace con su paleta y su modo, sin el parpadeo que habría esperando a browser.storage (asíncrono).
(function () {
  try {
    var palette = localStorage.getItem('tasalo:paleta') || 'clasica';
    var theme = localStorage.getItem('tasalo:theme') || 'auto';
    var dark = theme === 'dark' || (theme !== 'light' && matchMedia('(prefers-color-scheme: dark)').matches);
    var root = document.documentElement;
    root.dataset.paleta = palette;
    root.dataset.mode = dark ? 'dark' : 'light';
    root.classList.toggle('light', !dark);
  } catch (e) { /* sin localStorage: queda el tema base de cada hoja */ }
})();

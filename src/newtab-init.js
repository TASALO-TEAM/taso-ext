// TASALO - Arranque de la nueva pestana (script externo: el CSP de las paginas de una extension no admite scripts en linea).
// Si el usuario desactivo la nueva pestana en Opciones, esta pestana pasa a la nueva pestana propia del navegador.
// No se puede quitar el override en caliente, asi que se navega a la pagina nativa; no se abre Google ni ninguna web.
(function () {
  var api = globalThis.browser || globalThis.chrome;
  var root = document.documentElement;
  var firefox = /Firefox\//.test(navigator.userAgent);
  // Chromium: la NTP nativa. Firefox no deja abrir about:newtab ni about:home por API, asi que queda about:blank.
  var targets = firefox ? ['about:blank'] : ['chrome://new-tab-page/', 'about:blank'];

  // La pagina queda oculta hasta saber si se usa: asi, con la opcion apagada, no parpadea la interfaz antes de irse.
  root.style.visibility = 'hidden';
  function show() { root.style.visibility = ''; }

  function leave(tabId, i) {
    if (i >= targets.length) return;
    api.tabs.update(tabId, { url: targets[i] }).catch(function () { leave(tabId, i + 1); });
  }

  api.storage.local.get('settings').then(function (data) {
    var settings = (data && data.settings) || {};
    if (settings.newTabEnabled !== false) { show(); return null; }
    return api.tabs.getCurrent().then(function (tab) { if (tab) leave(tab.id, 0); else show(); });
  }).catch(function (error) { show(); console.error('[NewTab] init:', error); });
})();

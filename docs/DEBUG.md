# TASALO Extension — Debug Guide

## 🔍 Diagnosticar Problemas

### 1. Extensión no muestra datos

**Síntoma:** Popup o new tab muestran "Obteniendo tasas..." o vacío

**Causas posibles:**
- Background script no está corriendo
- API no está accesible
- CORS error
- Storage vacío

**Pasos para diagnosticar:**

#### Chrome:
```
1. chrome://extensions/
2. TASALO → "Service Worker"
3. Click "Inspect"
4. Ver Console tab
```

#### Firefox:
```
1. about:debugging
2. TASALO → "Inspect"
3. Ver Console tab
```

**Logs esperados:**
```
[TASALO Background] fetchRates: API URL: https://tasalo.duckdns.org
[TASALO Background] fetchRates: Response status: 200
[TASALO Background] fetchRates: Response data: {ok: true, data: {...}}
✅ Fetched 6 rates, 10 binance
```

**Si ves error:**
- `Failed to fetch` → API no accesible (verifica internet)
- `HTTP 404/500` → API endpoint incorrecto o caído
- `CORS error` → API no tiene CORS habilitado

---

### 2. New Tab no redirige aunque esté desactivado

**Síntoma:** Desactivas "Activar Nueva Pestaña" en Options pero sigue mostrando el dashboard

**Causa:** Manifest V3 no permite deshabilitar `chrome_url_overrides` dinámicamente

**Solución:**
```
1. Ir a Options
2. Desmarcar "Activar Nueva Pestaña"
3. Guardar cambios
4. Cerrar TODAS las pestañas
5. Abrir nueva pestaña → debería ir a Google

Si persiste:
1. chrome://extensions/
2. TASALO → Remove
3. Volver a cargar extensión
4. Verificar que newTabEnabled esté false en storage
```

**Verificar en Console:**
```javascript
// En Console de new tab (F12)
chrome.storage.local.get('settings', (data) => {
  console.log('newTabEnabled:', data.settings.newTabEnabled);
});
```

**Logs esperados:**
```
[TASALO NewTab] DOMContentLoaded
[TASALO NewTab] New tab is disabled, redirecting to Google
```

---

### 3. Firefox no carga la extensión

**Síntoma:** Error al cargar en about:debugging

**Causas posibles:**
- manifest.json inválido
- Icons no encontrados
- background.js con errores de sintaxis

**Verificar:**
```
1. about:debugging → Este Firefox
2. Ver mensaje de error
3. Click "Inspect" en la extensión (si carga)
4. Ver Console
```

**Errores comunes:**
- `manifest.json is not valid` → Revisar sintaxis JSON
- `Icon not found` → Verificar rutas de iconos
- `module not found` → background.js no encuentra imports

---

### 4. Popup muestra "Error al conectar"

**Síntoma:** Banner rojo en popup con mensaje de error

**Causas:**
- API caída
- Sin conexión a internet
- URL incorrecta

**Diagnosticar:**
```
1. Click en popup
2. F12 → Console
3. Ver error específico
```

**Verificar API manualmente:**
```bash
curl https://tasalo.duckdns.org/api/v1/tasas/latest
```

**Respuesta esperada:**
```json
{
  "ok": true,
  "data": {
    "eltoque": {...},
    "bcc": {...},
    "binance": {...}
  }
}
```

---

### 5. Binance ticker no muestra datos

**Síntoma:** Ticker dice "Sin datos de Binance"

**Causas:**
- binanceRates vacío en storage
- Background script no extrajo datos de Binance
- API no retorna datos de Binance

**Verificar:**
```javascript
// En Console de popup o new tab
chrome.storage.local.get(['binanceRates'], (data) => {
  console.log('Binance rates:', data.binanceRates);
});
```

**Esperado:**
```
Binance rates: {BTC: 95000, ETH: 3500, ...}
```

**Si está vacío:**
- Background script no está extrayendo Binance correctamente
- Ver logs del background script

---

## 🛠️ Comandos Útiles

### Ver storage completo:
```javascript
chrome.storage.local.get(null, (data) => {
  console.log('All storage:', data);
});
```

### Resetear storage:
```javascript
chrome.storage.local.clear(() => {
  console.log('Storage cleared');
  location.reload();
});
```

### Forzar fetch manual:
```javascript
chrome.runtime.sendMessage({type: 'FETCH_NOW'}, (response) => {
  console.log('Fetch response:', response);
});
```

### Ver estado del service worker:
```
chrome://extensions/
→ TASALO
→ Ver "Service Worker" status
→ Si dice "Inactive", click para activar
```

---

## 📊 Estado Normal

**Background script corriendo:**
```
✅ Service Worker: Active
✅ Last fetch: < 5 min ago
✅ Alarms: refresh, rotate
```

**Storage con datos:**
```
✅ currentRates: {EUR: 580, USD: 515, ...}
✅ rateChanges: {EUR: 'up', USD: 'up', ...}
✅ binanceRates: {BTC: 95000, ETH: 3500, ...}
✅ lastUpdated: "2026-03-29T23:00:00Z"
✅ settings: {newTabEnabled: true, ...}
```

**Popup cargando:**
```
✅ Header: "TASALO / Tasas"
✅ Update dot: Green (ok)
✅ Update time: "23:00"
✅ Rates grid: 6 cards (EUR, USD, MLC, BTC, TRX, USDT)
✅ Ticker: Binance crypto scrolling
```

**New Tab cargando:**
```
✅ Ticker: Binance crypto at top
✅ Left panel: ElToque (6 cards)
✅ Right panel: BCC (6 cards)
✅ Clock: Current time
✅ Search: Google search bar
✅ Year Progress: Widget visible
```

---

## 🐛 Reportar Bugs

**Incluir:**
1. Navegador y versión (Chrome 120, Firefox 115)
2. Versión de extensión (v0.4.1)
3. Pasos para reproducir
4. Logs de Console (background + popup + newtab)
5. Screenshots si aplica

**Ejemplo:**
```markdown
**Browser:** Chrome 120
**Extension:** v0.4.1

**Issue:** New Tab no redirige aunque esté desactivado

**Steps:**
1. Options → Desmarcar "Activar Nueva Pestaña"
2. Guardar
3. Ctrl+T → Sigue mostrando dashboard

**Console logs:**
[TASALO NewTab] DOMContentLoaded
[TASALO NewTab] New tab is enabled, initializing...

**Expected:** Debería redirigir a Google
```

---

## ✅ Checklist Post-Install

**Chrome:**
- [ ] chrome://extensions/ → TASALO visible
- [ ] Service Worker: Active
- [ ] Popup abre y muestra tasas
- [ ] New Tab muestra dashboard
- [ ] Omnibox `tsl` funciona
- [ ] Options guarda cambios

**Firefox:**
- [ ] about:debugging → TASALO visible
- [ ] No errors en Console
- [ ] Popup abre y muestra tasas
- [ ] New Tab muestra dashboard
- [ ] Options guarda cambios

---

**Última actualización:** 2026-03-29 (v0.4.1)

# TASALO Browser Extension

> Cuban exchange rates in your browser — Liquid Glass design

[![Version](https://img.shields.io/badge/version-0.2.0-blue.svg)](https://github.com/TASALO-TEAM/taso-ext)
[![Manifest](https://img.shields.io/badge/manifest-v3-green.svg)](https://developer.chrome.com/docs/extensions/mv3/intro/)
[![License](https://img.shields.io/badge/license-MIT-yellow.svg)](LICENSE)

## 🌟 Features

- 💱 **Tasas en tiempo real** — El Toque, BCC, CADECA y Binance
- 🎨 **Liquid Glass design** — Hermoso diseño glassmorphism (dark/light)
- ⚡ **Auto-refresh** — Actualización cada 5 minutos (configurable)
- 🔍 **Omnibox** — Búsqueda rápida (`tsl` + moneda)
- 🗂 **New Tab Dashboard** — Panel completo al abrir nueva pestaña
- ⚙️ **Plug & play** — Funciona al instalar, sin configuración

## 📦 Installation

### Development

#### Chrome/Edge/Brave

1. Abre `chrome://extensions/` (o `edge://extensions/`)
2. Activa **"Developer mode"** (arriba a la derecha)
3. Click en **"Load unpacked"**
4. Selecciona la carpeta `taso-ext/`
5. ✅ ¡Listo! El ícono de TASALO aparecerá en tu barra

#### Firefox

1. Abre `about:debugging#/runtime/this-firefox`
2. Click en **"Load Temporary Add-on"**
3. Navega a `taso-ext/` y selecciona `manifest.json`
4. ✅ ¡Listo! (Nota: temporal, se borra al cerrar Firefox)

### Production

Próximamente en:
- [Chrome Web Store](#) (en desarrollo)
- [Firefox Add-ons](#) (en desarrollo)

## 🚀 Usage

### Popup (Click en el ícono)

- Muestra tasas principales en tarjetas glassmorphism
- Ticker deslizable con todas las monedas
- Botón 🔄 para actualizar manualmente
- Botón ⚙️ para configuración

### New Tab (Nueva pestaña)

- **Ticker Binance** — Criptomonedas en la parte superior
- **Panel ElToque** (izquierda) — Mercado informal
- **Panel BCC** (derecha) — Mercado oficial
- **Buscador Google** — Búsqueda rápida
- **Year Progress** — Progreso del año en curso
- **Reloj** — Hora y fecha actual

### Omnibox (Barra de direcciones)

Escribe en la barra de Chrome:

```
tsl          → Ver todas las tasas
tsl USD      → Ver tasa del Dólar
tsl EUR      → Ver tasa del Euro
tsl BTC      → Ver precio de Bitcoin
```

### Options Page (Configuración)

Click derecho en el ícono → **"Options"** o **"Opciones"**

Configurable:
- ⏱️ Intervalo de actualización (1-60 minutos)
- 🎨 Tema (Auto / Oscuro / Claro)
- 💱 Monedas visibles
- 🎨 Colores de indicadores (sube/baja)
- 📏 Tamaño de fuente
- 🏴 Mostrar/ocultar banderas
- 🔄 Rotación de ícono

## 🏗️ Architecture

```
┌─────────────────────────┐
│  taso-api               │
│  FastAPI (Port 8040)    │
│  Production:            │
│  tasalo.duckdns.org     │
└───────────┬─────────────┘
            │
            │ REST API
            │ GET /api/v1/tasas/latest
            │
            ▼
┌─────────────────────────┐
│  taso-ext               │
│  Service Worker         │
│  (background.js)        │
│                         │
│  - Auto refresh 5min    │
│  - Cache local          │
│  - Icon rotation        │
│  - Omnibox              │
└───────────┬─────────────┘
            │
            │ chrome.storage.local
            │
            ▼
┌─────────────────────────┐
│  UI Pages               │
│  - Popup (Glass cards)  │
│  - New Tab (Dashboard)  │
│  - Options (Settings)   │
└─────────────────────────┘
```

## 📁 Project Structure

```
taso-ext/
├── manifest.json          # Extension manifest (V3)
├── icons/
│   ├── icon16.png        # 16x16px
│   ├── icon32.png        # 32x32px
│   ├── icon48.png        # 48x48px
│   └── icon128.png       # 128x128px
├── src/
│   ├── background.js      # Service worker
│   ├── constants.js       # Shared constants
│   ├── popup.html         # Popup UI
│   ├── popup.css          # Popup styles
│   ├── popup.js           # Popup logic
│   ├── newtab.html        # New tab page
│   ├── newtab.css         # New tab styles
│   ├── newtab.js          # New tab logic
│   ├── options.html       # Options page
│   ├── options.css        # Options styles
│   └── options.js         # Options logic
├── README.md
└── AGENTS.md
```

## 🛠️ Development

### Prerequisites

- Node.js 18+ (para desarrollo)
- Chrome 88+ o Firefox 109+
- taso-api corriendo (local o producción)

### Setup

```bash
cd taso-ext

# No build needed - vanilla JS
# Just load in browser as unpacked extension
```

### API Configuration

La extensión usa por defecto:

- **Desarrollo:** `http://localhost:8040`
- **Producción:** `https://tasalo.duckdns.org`

**No requiere configuración del usuario** - funciona automáticamente.

### Testing Checklist

#### Functional Tests

- [ ] **Popup loads** con tasas de la API
- [ ] **New Tab** muestra 2 paneles (ElToque + BCC)
- [ ] **Ticker Binance** muestra criptomonedas
- [ ] **Omnibox** sugiere monedas al escribir `tsl`
- [ ] **Auto-refresh** funciona (esperar 5 min)
- [ ] **Manual refresh** (botón 🔄) actualiza tasas
- [ ] **Options save** correctamente
- [ ] **Theme toggle** cambia entre dark/light/auto

#### Visual Tests

- [ ] **Glassmorphism** se ve en todos los componentes
- [ ] **Blobs animados** en el fondo
- [ ] **Indicadores** 🔺/🔻/― muestran cambios
- [ ] **Responsive** en móvil (1 columna)
- [ ] **Skeleton loaders** mientras carga

#### Browser Tests

- [ ] **Chrome** - Funciona correctamente
- [ ] **Edge** - Compatible (Chromium)
- [ ] **Brave** - Compatible (Chromium)
- [ ] **Firefox** - Compatible (manifest V3)

### Debugging

#### Service Worker

1. `chrome://extensions/` → TASALO → **"Service Worker"**
2. Ver console logs de `background.js`

#### Popup

1. Click derecho en popup → **"Inspect"**
2. Ver console logs

#### New Tab

1. Abrir nueva pestaña
2. Click derecho → **"Inspect"**
3. Ver console logs

### Logs

La extensión usa logging estructurado:

```
[2026-03-28T21:00:00.000Z] [INFO] Extension installed
[2026-03-28T21:00:00.000Z] [FETCH] Fetching from http://localhost:8040
[2026-03-28T21:00:01.000Z] [SUCCESS] ✅ Fetched 15 rates
[2026-03-28T21:00:01.000Z] [ALARM] Alarm triggered: refresh
```

## 📊 Data Sources

| Fuente | Tipo | Monedas | Update |
|--------|------|---------|--------|
| **El Toque** | Informal | USD, EUR, MLC, BTC, TRX, USDT | 5 min |
| **BCC** | Oficial | EUR, USD, CAD, GBP, CHF, MXN | 5 min |
| **CADECA** | Oficial | EUR, USD, MLC, etc. | 5 min |
| **Binance** | Crypto | 20+ criptomonedas | 5 min |

## 🎨 Design System

### Liquid Glass

El diseño usa glassmorphism avanzado:

- **Backdrop blur** — Efecto vidrio esmerilado
- **Bordes brillantes** — Bordes sutiles con gradientes
- **Sombras suaves** — Profundidad y elevación
- **Fondos semitransparentes** — Capas de vidrio
- **Blobs animados** — Fondos de colores en movimiento

### Color Palette

```css
/* Dark Theme */
--bg: #09091e;
--accent: #5b8aff;
--up: #ff6b6b;      /* Rojo - sube */
--down: #4ade80;    /* Verde - baja */

/* Light Theme */
--bg: #e8eaf3;
--accent: #3b6ee8;
--up: #dc2626;
--down: #16a34a;
```

### Typography

- **UI:** Space Grotesk
- **Rates:** JetBrains Mono (monospace)

## 🔧 Configuration

### Default Settings

```javascript
{
  apiUrl: 'http://localhost:8040',  // Hardcoded
  updateInterval: 5,                 // minutes
  colorBg: 'auto',                   // auto/dark/light
  fontSize: 13,                      // pixels
  showCurrencyFlag: true,
  showTimestamp: true,
  iconRotateEnabled: true,
  iconRotateInterval: 2,             // seconds
  selectedCurrencies: [],            // all
}
```

### Reset Settings

Para restaurar configuración de fábrica:

1. Abrir Options Page
2. Click en **"Restaurar defaults"**
3. Confirmar

O desde la consola del service worker:

```javascript
await chrome.storage.local.clear();
location.reload();
```

## 🐛 Troubleshooting

### "No data" / "Error al conectar"

**Causa:** taso-api no está corriendo o CORS no está habilitado

**Solución:**
1. Verificar taso-api: `curl http://localhost:8040/api/v1/tasas/latest`
2. Verificar CORS en taso-api
3. Revisar logs del service worker

### Icon not showing

**Causa:** Iconos no se cargaron

**Solución:**
1. Recargar extensión (`chrome://extensions/` → reload)
2. Verificar que `icons/` tiene los 4 PNGs

### Styles not loading

**Causa:** Rutas CSS incorrectas

**Solución:**
1. Verificar que los archivos `.css` existen en `src/`
2. Recargar extensión

### Omnibox not working

**Causa:** Keyword `tsl` no está registrada

**Solución:**
1. Verificar `manifest.json` → `omnibox.keyword`
2. Recargar extensión

## 📝 Changelog

### 0.2.0 (2026-03-29)

**Nuevas Funcionalidades:**
- ✨ New Tab Page con dual panel (ElToque + BCC)
- ✨ Ticker Binance en nueva pestaña
- ✨ Buscador Google integrado
- ✨ Year Progress Widget
- ✨ Options Page completa
- ✨ Theme toggle (Auto/Dark/Light)
- ✨ Selección de monedas
- ✨ Colores personalizables

**Mejoras:**
- 🎨 Diseño Liquid Glass consistente
- ⚡ Plug & play (sin configuración)
- 📱 Responsive en móvil

### 0.1.0 (2026-03-28)

**Initial Release:**
- 🎉 Manifest V3 scaffold
- 🎉 Service worker con auto-refresh
- 🎉 Popup con Liquid Glass design
- 🎉 Omnibox support
- 🎉 Iconos personalizados

## 📄 License

MIT License - ver [LICENSE](LICENSE) para detalles.

## 🙏 Credits

- **Design:** Liquid Glass style from legacy BBAlert extension
- **API:** taso-api (FastAPI backend)
- **Icons:** Custom design from IMG_0973.png
- **Fonts:** Google Fonts (Space Grotesk, JetBrains Mono)

## 📞 Support

- **GitHub:** https://github.com/TASALO-TEAM/taso-ext
- **API Docs:** https://tasalo.duckdns.org/docs
- **Issues:** https://github.com/TASALO-TEAM/taso-ext/issues

---

**Nota:** Las tasas mostradas son referenciales y pueden variar. Siempre verifica con la fuente oficial.

**Disclaimer:** TASALO no es una aplicación oficial. Los datos se obtienen de fuentes públicas.

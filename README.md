# TASALO — Tasas de Cambio Cuba 💱

> Tasas de cambio del dólar en Cuba en tu navegador — Diseño Liquid Glass

[![Version](https://img.shields.io/badge/version-0.4.5-blue.svg)](https://github.com/TASALO-TEAM/taso-ext)
[![Manifest](https://img.shields.io/badge/manifest-v3-green.svg)](https://developer.chrome.com/docs/extensions/mv3/intro/)
[![License](https://img.shields.io/badge/license-MIT-yellow.svg)](LICENSE)

## 🌟 ¿Qué es TASALO?

TASALO te muestra las tasas de cambio del **dólar en Cuba** en tiempo real, directamente en tu navegador. Consulta precios del mercado informal (El Toque), oficial (BCC) y criptomonedas (Binance) sin abrir ninguna página web.

## ✨ Características

- 💱 **Tasas en tiempo real** — El Toque, BCC y Binance
- 🎨 **Liquid Glass design** — Diseño glassmorphism elegante (dark/light)
- ⚡ **Auto-refresh** — Actualización automática cada 5 minutos
- 🔀 **Switch de fuente** — Cambia entre El Toque y BCC con un clic
- 🔍 **Omnibox** — Búsqueda rápida (`tsl` + moneda)
- 🗂 **New Tab Dashboard** — Panel completo al abrir nueva pestaña
- ⚙️ **Plug & play** — Funciona al instalar, sin configuración

## 📦 Instalación

### Chrome, Edge, Brave y derivados (Chromium)

> **Compatible con:** Google Chrome, Microsoft Edge, Brave, Opera, Arc y cualquier navegador basado en Chromium.

#### Paso 1: Descargar la extensión

1. Ve a https://github.com/TASALO-TEAM/taso-ext
2. Click en el botón verde **Code** → **Download ZIP**
3. Extrae el ZIP en una carpeta de tu computadora (ej: `tasalo-ext/`)

#### Paso 2: Cargar en tu navegador

**Google Chrome:**
1. Abre `chrome://extensions/` en la barra de direcciones
2. Activa **"Modo desarrollador"** (interruptor arriba a la derecha)
3. Click en **"Cargada"** (o "Load unpacked" en inglés)
4. Selecciona la carpeta `tasalo-ext/` que extrajiste
5. ✅ ¡Listo! Verás el ícono de TASALO en tu barra de extensiones

**Microsoft Edge:**
1. Abre `edge://extensions/`
2. Activa **"Modo desarrollador"** (panel izquierdo, abajo)
3. Click en **"Cargar descomprimida"**
4. Selecciona la carpeta `tasalo-ext/`
5. ✅ ¡Listo!

**Brave:**
1. Abre `brave://extensions/`
2. Activa **"Modo desarrollador"** (arriba a la derecha)
3. Click en **"Cargar sin empaquetar"**
4. Selecciona la carpeta `tasalo-ext/`
5. ✅ ¡Listo!

#### Paso 3: Verificar que funciona

1. Click en el ícono de TASALO (azul con "T") en tu barra de extensiones
2. Deberías ver las tasas actuales con diseño glassmorphism
3. Si no ves datos, verifica que taso-api esté corriendo en `http://tasalo.duckdns.org:8040`

> **Nota:** La extensión se actualiza automáticamente cada 5 minutos. Puedes forzar una actualización con el botón 🔄 en el popup.

### Firefox

> **Importante:** Esta es la versión para Chromium. Para Firefox, usa [taso-extmf](https://github.com/TASALO-TEAM/taso-extmf).

- 🔗 **Firefox Desktop:** https://github.com/TASALO-TEAM/taso-extmf
- 🔗 **Firefox Android:** https://addons.mozilla.org/es-ES/firefox/addon/tasalo-cambio-cuba-android/

## 🚀 Uso

### Popup (Click en el ícono)

- Muestra tasas de **El Toque** o **BCC** (cambia con los switches)
- **Ticker Binance** deslizable con criptomonedas
- Botón 🔄 para actualizar manualmente
- Botón ⚙️ para configuración

### New Tab (Nueva pestaña)

- **Ticker Binance** — Criptomonedas en la parte superior
- **Panel ElToque** (izquierda) — Mercado informal
- **Panel BCC** (derecha) — Mercado oficial
- **Buscador Google** — Búsqueda rápida
- **Reloj** — Hora y fecha actual

> **Nota:** Puedes desactivar el New Tab Dashboard desde Options si prefieres tu página de nueva pestaña actual.

### Omnibox (Barra de direcciones)

Escribe en la barra de tu navegador:

```
tsl          → Ver todas las tasas
tsl USD      → Ver tasa del Dólar
tsl EUR      → Ver tasa del Euro
tsl BTC      → Ver precio de Bitcoin
```

### Options (Configuración)

Click derecho en el ícono → **"Options"** o **"Opciones"**

Configurable:
- ⏱️ Intervalo de actualización (1-60 minutos)
- 🎨 Tema (Auto / Oscuro / Claro)
- 💱 Monedas visibles
- 🔀 Switch de fuente (El Toque / BCC)
- 🎨 Colores de indicadores (sube/baja)
- 📏 Tamaño de fuente
- 🗂 New Tab activado/desactivado

## 🏗️ Arquitectura

```
┌─────────────────────────┐
│  taso-api               │
│  FastAPI (Port 8040)    │
│  Production:            │
│  tasalo.duckdns.org:8040│
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
│  - Badge rotation       │
│  - State restoration    │
│  - Omnibox              │
│  - Broadcast a tabs     │
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

## 📁 Estructura del Proyecto

```
taso-ext/
├── manifest.json          # Extension manifest (V3)
├── RELEASE_NOTES.md       # Notas de versión
├── icons/
│   ├── icon16.png        # 16x16px
│   ├── icon48.png        # 48x48px
│   └── icon128.png       # 128x128px
├── src/
│   ├── background.js      # Service worker
│   ├── constants.js       # Constantes compartidas
│   ├── popup.html         # Popup UI
│   ├── popup.css          # Popup styles
│   ├── popup.js           # Popup logic
│   ├── newtab.html        # New tab page
│   ├── newtab.js          # New tab logic
│   ├── options.html       # Options page
│   ├── options.css        # Options styles
│   └── options.js         # Options logic
└── README.md
```

## 🛠️ Desarrollo

### Requisitos

- Chromium 88+ o Firefox 109+ (para desarrollo)
- taso-api corriendo (local o producción)
- **No requiere build** — JavaScript vanilla, sin dependencias

### Setup

```bash
cd taso-ext

# No build needed - vanilla JS
# Solo carga como extensión sin empaquetar
```

### Configuración de API

La extensión usa por defecto:

- **Producción:** `http://tasalo.duckdns.org:8040`
- **No requiere configuración** — funciona al instalar

### Testing Checklist

#### Funcional

- [ ] **Popup carga** con tasas de la API
- [ ] **Switch de fuente** cambia entre ElToque/BCC
- [ ] **New Tab** muestra dashboard completo
- [ ] **Ticker Binance** muestra criptomonedas
- [ ] **Omnibox** sugiere monedas al escribir `tsl`
- [ ] **Auto-refresh** funciona (esperar 5 min)
- [ ] **Manual refresh** (botón 🔄) actualiza
- [ ] **Options save** correctamente

#### Visual

- [ ] **Glassmorphism** se ve en todos los componentes
- [ ] **Blobs animados** en el fondo
- [ ] **Indicadores** 🔺/🔻/― muestran cambios
- [ ] **Responsive** en móvil (1 columna)

#### Navegadores

- [ ] **Chrome** — Funciona correctamente
- [ ] **Edge** — Compatible (Chromium)
- [ ] **Brave** — Compatible (Chromium)
- [ ] **Firefox** — Usa [taso-extmf](https://github.com/TASALO-TEAM/taso-extmf)

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

## 📊 Fuentes de Datos

| Fuente | Tipo | Monedas | Update |
|--------|------|---------|--------|
| **El Toque** | Informal | USD, EUR, MLC, BTC, TRX, USDT | 5 min |
| **BCC** | Oficial | EUR, USD, CAD, GBP, CHF, MXN | 5 min |
| **Binance** | Crypto | 20+ criptomonedas | 5 min |

## 🎨 Design System

### Liquid Glass

Diseño glassmorphism avanzado:

- **Backdrop blur** — Efecto vidrio esmerilado
- **Bordes brillantes** — Bordes sutiles con gradientes
- **Sombras suaves** — Profundidad y elevación
- **Fondos semitransparentes** — Capas de vidrio
- **Blobs animados** — Fondos de colores en movimiento

### Paleta de Colores

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

### Tipografía

- **UI:** Space Grotesk
- **Tasas:** JetBrains Mono (monospace)

## 📝 Changelog

### 0.4.5 (2026-04-02)

- ✅ **Rotación en logo**: ahora muestra solo USD de la fuente seleccionada
- ✅ **Switches de fuente**: botones para cambiar entre ElToque/BCC
- ✅ **Mejoras visuales**: dimensión de popup reajugada

### 0.4.4 (2026-04-02)

- ✅ **URL de API corregida**: puerto 8040 (no 443)
- ✅ **Permisos de host actualizados**: `http://tasalo.duckdns.org:8040/*`
- ✅ **Primera actualización más rápida**: 6 segundos vs 5 minutos

### 0.4.3 (2026-03-30)

- ✅ Restauración de estado del Service Worker desde storage
- ✅ Rotación del badge con alarma de 1 minuto (MV3)
- ✅ Broadcast de tasas a todas las pestañas abiertas
- ✅ Soporte de omnibox con keyword `tsl`

### 0.4.2 (2026-03-29)

- ✅ New Tab sin loading screen (verificación invisible)

### 0.4.1 (2026-03-29)

- ✅ New Tab opcional (redirige a Google si está desactivado)

### 0.4.0 (2026-03-29)

- ✅ Ticker Binance en popup
- ✅ Toggle New Tab en Options

### 0.3.0 (2026-03-29)

- ✅ Popup con fuente seleccionable (ElToque o BCC)
- ✅ Binance desde taso-api (no directa)

### 0.2.0 (2026-03-29)

- ✅ New Tab Dashboard con dual panel
- ✅ Options page completa

### 0.1.0 (2026-03-28)

- ✅ Initial scaffold con Manifest V3

## 📄 Licencia

MIT License - ver [LICENSE](LICENSE) para detalles.

## 🙏 Créditos

- **Design:** Liquid Glass style from legacy BBAlert extension
- **API:** taso-api (FastAPI backend)
- **Icons:** Custom design
- **Fonts:** Google Fonts (Space Grotesk, JetBrains Mono)

## 📞 Soporte

- **GitHub:** https://github.com/TASALO-TEAM/taso-ext
- **API Docs:** https://tasalo.duckdns.org/docs
- **Issues:** https://github.com/TASALO-TEAM/taso-ext/issues
- **Firefox:** https://github.com/TASALO-TEAM/taso-extmf

---

**Nota:** Las tasas mostradas son referenciales y pueden variar. Siempre verifica con la fuente oficial.

**Disclaimer:** TASALO no es una aplicación oficial. Los datos se obtienen de fuentes públicas.

# TASALO Chrome — Notas de versión

## v0.4.5 (2026-04-02)

### Correcciones
- **Rotación en logo**: se corrige el valor de rotación en el logo de la extensión, ahora solo se muestra el valor de **USD** de la fuente seleccionada. 
- **Switsh**: se añaden botones para cambiar rápidamente entre fuentes en el popup
- **Mejoras visuales**: se reajusta la dimensión de la ventana del popup para hacerlo consistente con el rediseño de los botones 

## v0.4.4 (2026-04-02)

### Correcciones
- **URL de API corregida**: el servidor corre en `http://tasalo.duckdns.org:8040`,
  no en el puerto 443. Las tasas ahora se actualizan correctamente.
- **Permisos de host actualizados**: `host_permissions` ahora apunta a
  `http://tasalo.duckdns.org:8040/*` para permitir la conexión al puerto correcto.
- **Primera actualización más rápida**: el alarm de REFRESH ahora usa
  `delayInMinutes: 0.1` (6 segundos) en lugar de esperar el intervalo completo
  de 5 minutos antes del primer fetch.

## v0.4.3 (2026-03-30)
- Restauración de estado del Service Worker desde storage en cada alarm.
- Rotación del badge con alarma de 1 minuto (compatible con MV3).
- Broadcast de tasas a todas las pestañas abiertas al actualizar.
- Soporte de omnibox con keyword `tsl`.

## v0.4.0 — v0.4.2
- Migración a Manifest V3 / Service Worker.
- Integración de Binance para criptomonedas.
- Página de nueva pestaña con ticker de precios.

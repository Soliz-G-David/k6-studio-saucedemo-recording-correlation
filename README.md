# Práctica 4 - k6 Studio: Grabación, Limpieza, Parametrización y Correlación

Prueba de performance sobre **https://www.saucedemo.com** usando **Grafana k6 Studio** y **k6**.

## Flujo grabado

1. Abrir la página de inicio
2. Login con `standard_user` / `secret_sauce`
3. Agregar productos al carrito (Sauce Labs Backpack y Bolt T-Shirt)
4. Ir al carrito
5. Checkout con mis datos (David / Soliz Garcia / 1234)
6. Revisar el resumen y presionar **Finish**
7. "Thank you for your order!" y **Generate PDF order**

## Estructura del proyecto

```
data/
  users.json                         → usuarios y datos del checkout
results/                             → evidencia de cada ejecución
scripts/
  01-recorded.js                     → script generado por k6 Studio
  02-cleaned.js                      → script limpio (solo endpoints del sitio)
  03-parameterized-correlated.js     → script parametrizado y correlacionado
```

## Puntos del enunciado

### 1 y 2. Grabación y ejecución

- Se grabó el flujo con el **Recorder** de k6 Studio (40 peticiones).
- Se generó el script con el asistente de k6 Studio → `01-recorded.js`.
- Al ejecutarlo hace solo **1 petición** (`GET /`) porque saucedemo es una SPA: el login, el carrito y el checkout se resuelven en el navegador, sin llamar al servidor.

### 3. Limpieza

De las 40 peticiones grabadas se dejaron solo las **14 de `www.saucedemo.com`**:

| Se conserva | Se elimina |
|---|---|
| Página `/`, CSS y JS de la app | Tráfico de Chrome/Google (autofill, update, passwords, beacons) |
| `manifest.json` y `favicon.ico` | Telemetría de terceros (`events.backtrace.io`) |
| 6 imágenes de productos | Fuentes externas (`fonts.googleapis.com`, `fonts.gstatic.com`) |
| Imagen `checkmark` y módulos del PDF | Variables sin uso del script generado |

### 4. Parametrización y correlación

**Parametrización**
- `BASE_URL` se puede cambiar desde la terminal con `-e BASE_URL=...`.
- Los usuarios y datos del checkout se leen de `data/users.json`, y cada usuario virtual usa uno distinto.

**Correlación**
Los nombres de los archivos llevan un código (hash) que cambia en cada versión del sitio, por ejemplo `index-DnLqFcJI.js`. El script los extrae de las respuestas en lugar de tenerlos fijos:

| Valor | Se extrae de |
|---|---|
| CSS y JS de la app (`index-*.css`, `index-*.js`) | HTML de la página `/` |
| 6 imágenes de productos (`*-1200x1500-*.jpg`) | Código JS de la app |
| `checkmark-*.png` | Código JS de la app |
| `OrderReceipt-*.js` | Código JS de la app |
| `react-pdf.browser-*.js` | Código JS de la app o del recibo |

## Resultados (1 usuario, 1 iteración)

| Script | Peticiones | Datos | p(95) | Checks |
|---|---|---|---|---|
| 01-recorded | 1 | 7.6 kB | 75 ms | 1/1 ✓ |
| 02-cleaned | 14 | 2.2 MB | 378 ms | 14/14 ✓ |
| 03-parameterized-correlated | 14 | 2.2 MB | 372 ms | 20/20 ✓ |

Con 3 usuarios (David, Ana y Luis): **42 peticiones, 60/60 checks, 0% errores**.

## Cómo ejecutar

```
k6 run --vus 1 --iterations 1 scripts/01-recorded.js
k6 run --vus 1 --iterations 1 scripts/02-cleaned.js
k6 run --vus 1 --iterations 1 scripts/03-parameterized-correlated.js
k6 run --vus 3 --iterations 3 scripts/03-parameterized-correlated.js
```

Sin `--vus` ni `--iterations` se usa la carga definida en el script: 20 usuarios durante 5.5 minutos.

## Herramientas

- Grafana k6 Studio 2.1.3
- k6
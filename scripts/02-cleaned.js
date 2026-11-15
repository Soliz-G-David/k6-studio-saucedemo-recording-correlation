//Punto 3: Limpieza del script
// Solo dejamos las peticiones a www.saucedemo.com (las que generan carga en el sitio).
// Quitamos: peticiones de Google/Chrome, telemetria (backtrace) y fuentes externas.

import { group, sleep, check } from "k6";
import http from "k6/http";

const BASE_URL = "https://www.saucedemo.com";

// Configuracion de carga (la misma que genero k6 Studio)
export const options = {
  stages: [
    { target: 20, duration: "1m" },
    { target: 20, duration: "3m30s" },
    { target: 0, duration: "1m" },
  ],
  thresholds: {
    http_req_duration: ["p(95)<800", "p(99)<1000"],
    http_req_failed: [{ threshold: "rate<0.01", abortOnFail: true }],
  },
};

// Descarga una lista de archivos y revisa que cada uno responda 200
function descargar(archivos) {
  for (const archivo of archivos) {
    const res = http.get(BASE_URL + archivo);
    check(res, { [archivo + " status 200"]: (r) => r.status === 200 });
  }
}

export default function () {
  // Paso 1: abrir la pagina de inicio
  group("01_Home", function () {
    const res = http.get(BASE_URL + "/");
    check(res, { "home status 200": (r) => r.status === 200 });

    // Archivos de la pagina: estilos, codigo y logo
    descargar([
      "/assets/index-aSZoiKGF.css",
      "/assets/index-DnLqFcJI.js",
      "/manifest.json",
      "/favicon.ico",
    ]);
  });
  sleep(1);

  // Paso 2: despues del login se ven los productos (se cargan sus imagenes)
  group("02_Productos", function () {
    descargar([
      "/assets/sauce-backpack-1200x1500-CjRW-Djj.jpg",
      "/assets/bike-light-1200x1500-DxcZRFOA.jpg",
      "/assets/bolt-shirt-1200x1500-mR0ldpVS.jpg",
      "/assets/sauce-pullover-1200x1500-BfbI-PSd.jpg",
      "/assets/red-onesie-1200x1500-BrSuq0ic.jpg",
      "/assets/red-tatt-1200x1500-E-qp6aYf.jpg",
    ]);
  });
  sleep(1);

  // Carrito y checkout: no llaman al servidor (todo pasa en el navegador)

  // Paso 3: compra terminada (imagen del check verde)
  group("03_Compra_Completa", function () {
    descargar(["/assets/checkmark-VLWQafip.png"]); /*  */
  });
  sleep(1);

  // Paso 4: boton "Generate PDF order" (descarga el codigo que crea el PDF)
  group("04_Generar_PDF", function () {
    descargar([
      "/assets/OrderReceipt-DkepNh28.js",
      "/assets/react-pdf.browser-DvoXys0j.js",
    ]);
  });
  sleep(1);
}

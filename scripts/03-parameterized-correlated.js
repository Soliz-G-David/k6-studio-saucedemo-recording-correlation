// Punto 4: Parametrizacion y correlacion
// Parametrizacion: la URL y los usuarios no estan fijos en el codigo.
// Correlacion: los nombres de los archivos se sacan de las respuestas del servidor.

import { group, sleep, check } from "k6";
import http from "k6/http";
import { SharedArray } from "k6/data";

// URL del sitio (se puede cambiar con: -e BASE_URL=...)
const BASE_URL = __ENV.BASE_URL || "https://www.saucedemo.com";

// Lista de usuarios desde data/users.json
const usuarios = new SharedArray("usuarios", function () {
  return JSON.parse(open("../data/users.json"));
});

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

// Busca un nombre de archivo dentro de un texto
function buscar(texto, regla) {
  const encontrado = texto.match(regla);
  if (encontrado) {
    return "/assets/" + encontrado[0];
  }
  return null;
}

// Pide un archivo y revisa que responda 200
function descargar(archivo) {
  const res = http.get(BASE_URL + archivo);
  check(res, { [archivo + " status 200"]: (r) => r.status === 200 });
  return res;
}

export default function () {
  // Cada usuario virtual usa un usuario del archivo
  const usuario = usuarios[(__VU - 1) % usuarios.length];
  console.log("Usuario: " + usuario.username + " - " + usuario.firstName);

  let codigoApp = "";

  // Paso 1: pagina de inicio
  group("01_Home", function () {
    const home = descargar("/");

    // Correlacion: sacamos el nombre del CSS y del JS desde la pagina
    const css = buscar(home.body, /index-[\w-]+\.css/);
    const js = buscar(home.body, /index-[\w-]+\.js/);
    check(css, { "CSS encontrado": (v) => v !== null });
    check(js, { "JS encontrado": (v) => v !== null });

    descargar(css);
    descargar("/manifest.json");
    descargar("/favicon.ico");

    // Guardamos el codigo de la app para buscar los demas archivos
    codigoApp = descargar(js).body;
  });
  sleep(1);

  // Paso 2: login y productos (el login no llama al servidor)
  group("02_Productos", function () {
    // Correlacion: sacamos las imagenes de los productos desde el codigo de la app
    const imagenes = codigoApp.match(/[\w-]+-1200x1500-[\w-]+\.jpg/g) || [];
    check(imagenes, { "Imagenes encontradas": (v) => v.length > 0 });

    // Quitamos repetidos y descargamos cada imagen
    for (const imagen of new Set(imagenes)) {
      descargar("/assets/" + imagen);
    }
  });
  sleep(1);

  // Carrito y checkout: no llaman al servidor

  // Paso 3: compra completa
  group("03_Compra_Completa", function () {
    // Correlacion: imagen del check verde
    const checkmark = buscar(codigoApp, /checkmark-[\w-]+\.png/);
    check(checkmark, { "Checkmark encontrado": (v) => v !== null });
    descargar(checkmark);
  });
  sleep(1);

  // Paso 4: boton "Generate PDF order"
  group("04_Generar_PDF", function () {
    // Correlacion: codigo del recibo PDF
    const recibo = buscar(codigoApp, /OrderReceipt-[\w-]+\.js/);
    check(recibo, { "Recibo encontrado": (v) => v !== null });
    const codigoRecibo = descargar(recibo).body;

    // Correlacion: libreria del PDF (puede estar en la app o en el recibo)
    const libreriaPdf =
      buscar(codigoApp, /react-pdf\.browser-[\w-]+\.js/) ||
      buscar(codigoRecibo, /react-pdf\.browser-[\w-]+\.js/);
    check(libreriaPdf, { "Libreria PDF encontrada": (v) => v !== null });
    descargar(libreriaPdf);
  });
  sleep(1);
}

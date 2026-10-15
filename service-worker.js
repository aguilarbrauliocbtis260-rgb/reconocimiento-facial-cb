/**
 * @file service-worker.js
 * @description Service Worker para la PWA "IdentificaIA". 
 * Permite el funcionamiento offline y la gestión de caché de los archivos principales.
 * CBTis 260 - 2026
 */

// Nombre y versión de la caché actual. Modificar la versión (ej. v2) actualiza los recursos guardados.
const CACHE_NAME = "identificaia-v1";

// Lista de archivos estáticos esenciales que se guardarán en caché durante la instalación
const ARCHIVOS = [
    "./",
    "./index.html",
    "./aplicacion.html",
    "./css/estilos.css",
    "./img/logo.png"
];

/**
 * 1. FASE DE INSTALACIÓN
 * Se ejecuta cuando el navegador instala por primera vez el Service Worker.
 * Aquí se descargan y almacenan en caché los archivos principales.
 */
self.addEventListener("install", event => {
    event.waitUntil(
        caches.open(CACHE_NAME).then(cache => {
            // El método addAll() descarga y guarda todos los archivos listados en el arreglo ARCHIVOS
            return cache.addAll(ARCHIVOS);
        })
    );

    // skipWaiting fuerza al Service Worker a activarse inmediatamente sin esperar a cerrar pestañas
    self.skipWaiting();
});

/**
 * 2. FASE DE ACTIVACIÓN
 * Se ejecuta cuando el Service Worker toma el control de la aplicación.
 * Su objetivo principal es limpiar cachés antiguas para liberar espacio.
 */
self.addEventListener("activate", event => {
    event.waitUntil(
        caches.keys().then(nombres => {
            return Promise.all(
                nombres
                    .filter(nombre => nombre !== CACHE_NAME) // Filtra las cachés que no coincidan con la versión actual
                    .map(nombre => {
                        // El método delete() elimina las cachés obsoletas o de versiones pasadas
                        return caches.delete(nombre);
                    })
            );
        })
    );

    // clients.claim permite que el Service Worker controle las páginas abiertas desde el primer momento
    self.clients.claim();
});

/**
 * 3. FASE DE INTERCEPTACIÓN DE SOLICITUDES (FETCH)
 * Intercepta cada petición de red realizada por la aplicación web.
 * Utiliza una estrategia híbrida: busca primero en caché y, si no está, va a la red.
 */
self.addEventListener("fetch", event => {
    // Solo procesamos solicitudes de tipo GET (lectura de archivos/páginas)
    if (event.request.method !== "GET") {
        return;
    }

    event.respondWith(
        caches.match(event.request).then(respuesta => {
            // Si el archivo se encuentra en la caché, se devuelve directamente (permite el modo offline)
            if (respuesta) {
                return respuesta;
            }

            // Si el archivo no está en caché, se solicita a la red de internet de manera normal
            return fetch(event.request).then(respuestaRed => {
                // Verificamos que la respuesta de la red sea válida y pertenezca a nuestro propio dominio
                if (
                    respuestaRed &&
                    respuestaRed.ok &&
                    new URL(event.request.url).origin === self.location.origin
                ) {
                    return caches.open(CACHE_NAME).then(cache => {
                        // Guardamos una copia del nuevo recurso descargado en la caché para futuras consultas
                        cache.put(
                            event.request,
                            respuestaRed.clone()
                        );

                        return respuestaRed;
                    });
                }

                return respuestaRed;
            });
        })
    );
});

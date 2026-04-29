// Service Worker for caching Pyodide and CDN resources
const PYODIDE_BASE = "https://cdn.jsdelivr.net/pyodide/v0.24.1/full/";
const PYODIDE_FILES = [
    "pyodide.js",
    "pyodide.asm.js",
    "pyodide.asm.wasm",
    "packages.json",
    "pyodide-lock.json",
    "python_stdlib.zip",
    // Core packages
    "numpy.js",
    "pandas.js",
    "matplotlib.js",
    "scipy.js",
    "scikit-learn.js",
    // Package data files
    "numpy.data",
    "pandas.data",
    "matplotlib.data",
    "scipy.data",
    "scikit-learn.data",
    "micropip.js",
];

const CACHE_NAME = "pyodide-cache-v1";

self.addEventListener("install", (event) => {
    event.waitUntil(
        caches.open(CACHE_NAME).then((cache) => {
            // Cache Pyodide files in background
            const urls = PYODIDE_FILES.map((f) => PYODIDE_BASE + f);
            return cache.addAll(urls).catch(() => {
                // Silently fail for files that don't exist
            });
        })
    );
    self.skipWaiting();
});

self.addEventListener("activate", (event) => {
    event.waitUntil(
        caches.keys().then((keys) => {
            return Promise.all(
                keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k))
            );
        })
    );
    self.clients.claim();
});

self.addEventListener("fetch", (event) => {
    const url = new URL(event.request.url);

    // Only intercept Pyodide CDN requests
    if (url.origin === "https://cdn.jsdelivr.net" && url.pathname.startsWith("/pyodide/")) {
        event.respondWith(
            caches.open(CACHE_NAME).then((cache) => {
                return cache.match(event.request).then((cached) => {
                    if (cached) {
                        // Return cached version, update in background
                        fetch(event.request).then((response) => {
                            if (response.ok) cache.put(event.request, response);
                        }).catch(() => {});
                        return cached;
                    }
                    // Not cached, fetch and cache
                    return fetch(event.request).then((response) => {
                        if (response.ok) {
                            cache.put(event.request, response.clone());
                        }
                        return response;
                    });
                });
            })
        );
    }
});

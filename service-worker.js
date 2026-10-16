const CACHE_NAME = "xiohu-works-v8";
const APP_SHELL = [
    "./admin.html",
    "./css/admin.css",
    "./js/admin.js",
    "./data/works.json",
    "./manifest.webmanifest",
    "./couple-space.html",
    "./confession.html",
    "./confession-success.html",
    "./wake.html",
    "./memories.html",
    "./games.html",
    "./css/love.css",
    "./js/love.js",
    "./love-app.webmanifest",
    "./icons/love-app-icon.svg",
    "./icons/love-app-icon-180.png",
    "./icons/love-app-icon-192.png",
    "./icons/love-app-icon-512.png",
    "./icons/app-icon-192.png",
    "./icons/app-icon-512.png",
    "./icons/apple-touch-icon.png"
];
const LOVE_PAGES = [
    "./couple-space.html",
    "./confession.html",
    "./confession-success.html",
    "./wake.html",
    "./memories.html",
    "./games.html"
].map(path => new URL(path, self.location.href).href);

self.addEventListener("install", event => {
    event.waitUntil(
        caches.open(CACHE_NAME)
            .then(cache => cache.addAll(APP_SHELL))
            .then(() => self.skipWaiting())
    );
});

self.addEventListener("activate", event => {
    event.waitUntil(
        caches.keys()
            .then(keys => Promise.all(
                keys.filter(key => key.startsWith("xiohu-works-") && key !== CACHE_NAME)
                    .map(key => caches.delete(key))
            ))
            .then(() => self.clients.claim())
    );
});

self.addEventListener("fetch", event => {
    const request = event.request;
    if (request.method !== "GET") return;

    const url = new URL(request.url);
    if (url.origin !== self.location.origin) return;
    if (request.headers.has("range") || /\.(?:mp4|webm|mov|m4v)$/i.test(url.pathname)) return;

    if (url.pathname.endsWith("/data/works.json")) {
        event.respondWith((async () => {
            const cache = await caches.open(CACHE_NAME);
            try {
                const response = await fetch(request, { cache: "no-store" });
                if (response.ok) await cache.put(request, response.clone());
                return response;
            } catch (error) {
                const cached = await cache.match(request);
                if (cached) return cached;
                throw error;
            }
        })());
        return;
    }

    if (/\.(?:js|css|webmanifest)$/.test(url.pathname)) {
        event.respondWith((async () => {
            const cache = await caches.open(CACHE_NAME);
            try {
                const response = await fetch(request, { cache: "no-cache" });
                if (response.ok && response.type === "basic") await cache.put(request, response.clone());
                return response;
            } catch (error) {
                const cached = await cache.match(request);
                if (cached) return cached;
                throw error;
            }
        })());
        return;
    }

    if (request.mode === "navigate") {
        event.respondWith((async () => {
            try {
                return await fetch(request);
            } catch (error) {
                const cache = await caches.open(CACHE_NAME);
                const cached = await cache.match(request);
                if (cached) return cached;
                if (LOVE_PAGES.includes(url.href)) {
                    const coupleHome = await cache.match("./couple-space.html");
                    if (coupleHome) return coupleHome;
                }
                const appPage = await cache.match("./admin.html");
                if (appPage) return appPage;
                throw error;
            }
        })());
        return;
    }

    event.respondWith((async () => {
        const cache = await caches.open(CACHE_NAME);
        const cached = await cache.match(request);
        if (cached) return cached;

        const response = await fetch(request);
        if (response.ok && response.type === "basic") await cache.put(request, response.clone());
        return response;
    })());
});

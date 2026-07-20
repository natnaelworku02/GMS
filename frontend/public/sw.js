var CACHE_NAME = "gms-cache-v1";
var STATIC_ASSETS = [
  "/",
  "/en/dashboard",
  "/en/login",
  "/offline",
];
var API_CACHE = "gms-api-cache-v1";

self.addEventListener("install", function (event) {
  event.waitUntil(
    Promise.resolve()
      .then(async function () {
        var cache = await caches.open(CACHE_NAME);
        await cache.addAll(STATIC_ASSETS);
        await self.skipWaiting();
      })
      .catch(function () {})
  );
});

self.addEventListener("activate", function (event) {
  event.waitUntil(
    Promise.resolve()
      .then(async function () {
        var keys = await caches.keys();
        await Promise.all(
          keys
            .filter(function (k) {
              return k !== CACHE_NAME && k !== API_CACHE;
            })
            .map(function (k) {
              return caches.delete(k);
            })
        );
        await self.clients.claim();
      })
      .catch(function () {})
  );
});

self.addEventListener("fetch", function (event) {
  var request = event.request;
  var url = new URL(request.url);

  if (request.method !== "GET") return;

  if (url.pathname.startsWith("/api/")) {
    event.respondWith(networkFirstWithCache(request));
    return;
  }

  if (
    url.origin === self.location.origin &&
    (request.destination === "document" ||
      request.destination === "style" ||
      request.destination === "script" ||
      request.destination === "font" ||
      request.destination === "image")
  ) {
    event.respondWith(cacheFirst(request));
    return;
  }
});

async function cacheFirst(request) {
  try {
    var cached = await caches.match(request);
    if (cached) return cached;
    var response = await fetch(request);
    if (response.ok) {
      var cache = await caches.open(CACHE_NAME);
      cache.put(request, response.clone());
    }
    return response;
  } catch (e) {
    return new Response("Offline", { status: 503 });
  }
}

async function networkFirstWithCache(request) {
  try {
    var response = await fetch(request);
    if (response.ok) {
      var cache = await caches.open(API_CACHE);
      cache.put(request, response.clone());
    }
    return response;
  } catch (e) {
    try {
      var cached = await caches.match(request);
      if (cached) return cached;
    } catch (e2) {}
    return new Response(JSON.stringify({ detail: "You are offline" }), {
      status: 503,
      headers: { "Content-Type": "application/json" },
    });
  }
}

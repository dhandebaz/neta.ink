const CACHE_NAME = "neta-shell-v1";
const SHELL_URLS = [
  "/",
  "/complaints",
  "/rti",
  "/rankings/delhi"
];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(SHELL_URLS);
    })
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(
        keys.map((key) => {
          if (key !== CACHE_NAME) {
            return caches.delete(key);
          }
          return undefined;
        })
      )
    )
  );
});

self.addEventListener("fetch", (event) => {
  // Guard clause: Do not cache non-http requests (e.g. chrome-extension://)
  if (!event.request.url.startsWith("http")) return;

  const req = event.request;

  if (req.method !== "GET") {
    return;
  }

  event.respondWith(
    caches.match(req).then((cached) => {
      const networkFetch = fetch(req)
        .then((res) => {
          if (!res || res.status !== 200 || res.type !== "basic") {
            return res;
          }

          const resClone = res.clone();
          caches.open(CACHE_NAME).then((cache) => {
            cache.put(req, resClone);
          });

          return res;
        })
        .catch(() => cached || Response.error());

      return cached || networkFetch;
    })
  );
});

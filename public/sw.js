// Service worker mínimo — existe principalmente para o navegador permitir
// "instalar" o sistema como app (isso é exigido pelos critérios de PWA).
// Estratégia: network-first. Sempre tenta buscar da rede (dados são dinâmicos
// e vêm do Supabase), e só cai num fallback simples se a rede falhar.
const CACHE = "elta-shell-v1";
const SHELL = ["/manifest.json", "/icon-192.png", "/icon-512.png"];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE).then((cache) => cache.addAll(SHELL)).catch(() => {})
  );
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k)))
    )
  );
  self.clients.claim();
});

self.addEventListener("fetch", (event) => {
  const { request } = event;
  if (request.method !== "GET") return;

  event.respondWith(
    fetch(request)
      .then((res) => {
        // Guarda só assets estáticos simples no cache (não as chamadas de API/Supabase)
        if (res.ok && SHELL.some((p) => request.url.endsWith(p))) {
          const clone = res.clone();
          caches.open(CACHE).then((cache) => cache.put(request, clone));
        }
        return res;
      })
      .catch(() => caches.match(request))
  );
});

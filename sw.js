// Vellora — service worker do aplicativo instalável (PWA).
// Guarda SOMENTE os arquivos do próprio site (telas, estilos, ícones) para abrir rápido e mostrar a tela
// mesmo sem internet. Nunca guarda respostas do banco (Supabase) nem de outros sites: dados de clientes
// não ficam no aparelho. Estratégia "rede primeiro": com internet, sempre a versão mais nova.
const CACHE = 'vellora-v1';

self.addEventListener('install', () => self.skipWaiting());
self.addEventListener('activate', (e) => {
  e.waitUntil((async () => {
    for (const k of await caches.keys()) if (k !== CACHE) await caches.delete(k);
    await self.clients.claim();
  })());
});

self.addEventListener('fetch', (e) => {
  const req = e.request;
  const url = new URL(req.url);
  if (req.method !== 'GET' || url.origin !== self.location.origin) return; // banco, fontes e APIs: direto na rede
  e.respondWith((async () => {
    try {
      const resp = await fetch(req);
      if (resp.ok && resp.type === 'basic') {
        const copia = resp.clone();
        caches.open(CACHE).then((c) => c.put(req, copia)).catch(() => undefined);
      }
      return resp;
    } catch {
      const salvo = await caches.match(req, { ignoreSearch: true });
      if (salvo) return salvo;
      if (req.mode === 'navigate') {
        const inicio = await caches.match(new URL('./', self.location.href).href);
        if (inicio) return inicio;
      }
      return new Response('Sem conexão com a internet.', { status: 503, headers: { 'content-type': 'text/plain; charset=utf-8' } });
    }
  })());
});

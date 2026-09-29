/// <reference lib="webworker" />
import { cleanupOutdatedCaches, precacheAndRoute } from "workbox-precaching";
import { registerRoute } from "workbox-routing";

declare const self: ServiceWorkerGlobalScope;

precacheAndRoute(self.__WB_MANIFEST);
cleanupOutdatedCaches();

// API nunca cacheada (regra que existia no generateSW; no modo
// injectManifest ela precisa ser explícita): só documentos do portal.
registerRoute(
  ({ url }) => url.pathname.includes("/api/"),
  async ({ request }) => fetch(request)
);

self.addEventListener("push", (event) => {
  const data = event.data?.json() ?? {};
  event.waitUntil(
    self.registration.showNotification(data.title ?? "Hora do almoço 🍽️", {
      body: data.body ?? "Marque se você pegou ou não pegou o almoço de hoje.",
      icon: "pwa-192.png",
      badge: "pwa-192.png",
      vibrate: [200, 100, 200],
      tag: "lunch-reminder",
      renotify: true,
      data: { url: data.url ?? "/colaborador/" }
    } as NotificationOptions)
  );
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const url = (event.notification.data as { url?: string } | undefined)?.url ?? "/colaborador/";
  event.waitUntil(
    (async () => {
      const windows = await self.clients.matchAll({ type: "window", includeUncontrolled: true });
      for (const client of windows) {
        if ("focus" in client) {
          await client.focus();
          if ("navigate" in client) await (client as WindowClient).navigate(url);
          return;
        }
      }
      await self.clients.openWindow(url);
    })()
  );
});

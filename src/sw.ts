/// <reference lib="webworker" />
// Service worker de Bolsillo: cachea la app para que funcione sin internet y recibe notificaciones push.
import { clientsClaim } from 'workbox-core';
import { cleanupOutdatedCaches, createHandlerBoundToURL, precacheAndRoute } from 'workbox-precaching';
import { NavigationRoute, registerRoute } from 'workbox-routing';

declare const self: ServiceWorkerGlobalScope;

// ---- Caché de la app -------------------------------------------------------------
cleanupOutdatedCaches();
precacheAndRoute(self.__WB_MANIFEST);
registerRoute(new NavigationRoute(createHandlerBoundToURL('index.html')));

self.skipWaiting();
clientsClaim();

// ---- Notificaciones push ----------------------------------------------------------
interface PushPayload {
  title?: string;
  body?: string;
  url?: string; // a dónde llevar al tocar la notificación
  tag?: string; // mismo tag = reemplaza en vez de apilar
}

self.addEventListener('push', (event) => {
  let data: PushPayload = {};
  try {
    data = event.data?.json() ?? {};
  } catch {
    data = { body: event.data?.text() };
  }
  const icon = new URL('icons/icon-192.png', self.registration.scope).href;
  event.waitUntil(
    self.registration.showNotification(data.title || 'Bolsillo', {
      body: data.body || '',
      icon,
      badge: icon,
      tag: data.tag,
      data: { url: data.url || self.registration.scope },
    }),
  );
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const target = new URL((event.notification.data as { url?: string })?.url || '/', self.registration.scope).href;
  event.waitUntil(
    (async () => {
      const all = await self.clients.matchAll({ type: 'window', includeUncontrolled: true });
      // Si la app ya está abierta, se enfoca y se lleva a la pantalla; si no, se abre
      for (const c of all) {
        if (new URL(c.url).origin === new URL(target).origin) {
          await c.focus();
          if ('navigate' in c) await (c as WindowClient).navigate(target);
          return;
        }
      }
      await self.clients.openWindow(target);
    })(),
  );
});

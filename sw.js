const CACHE_NAME = 'agoge-v1';
const ASSETS = ['./index.html', './manifest.json', './icon.png'];

self.addEventListener('install', e => {
  e.waitUntil(caches.open(CACHE_NAME).then(c => c.addAll(ASSETS).catch(() => {})));
  self.skipWaiting();
});

self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys.filter(k => k !== CACHE_NAME).map(k => caches.delete(k)))
    )
  );
  self.clients.claim();
});

self.addEventListener('fetch', e => {
  if (e.request.method !== 'GET') return;
  e.respondWith(
    fetch(e.request)
      .then(res => {
        if (e.request.url.includes(self.location.origin)) {
          const clone = res.clone();
          caches.open(CACHE_NAME).then(c => c.put(e.request, clone));
        }
        return res;
      })
      .catch(() =>
        caches.match(e.request).then(cached => {
          if (cached) return cached;
          if (e.request.mode === 'navigate') return caches.match('./index.html');
        })
      )
  );
});

self.addEventListener('push', e => {
  const d = e.data ? e.data.json() : {};
  e.waitUntil(
    self.registration.showNotification(d.title || '⚔ ΑΓΩΓΗ', {
      body: d.body || 'Долг ждёт исполнения.',
      icon: 'icon.png',
      badge: 'icon.png',
      vibrate: [200, 100, 200, 100, 200],
      tag: 'agoge',
      renotify: true
    })
  );
});

self.addEventListener('notificationclick', e => {
  e.notification.close();
  e.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then(list => {
      if (list.length > 0) return list[0].focus();
      return clients.openWindow('./index.html');
    })
  );
});

// Полуночное напоминание
let midnightTimer = null;
function scheduleMidnight() {
  if (midnightTimer) clearTimeout(midnightTimer);
  const now = new Date();
  const mid = new Date();
  mid.setHours(24, 0, 5, 0);
  midnightTimer = setTimeout(() => {
    self.registration.showNotification('⚔ ΑΓΩΓΗ — новый день', {
      body: 'Долг обновлён. Неисполненное вчера будет искуплено карой.',
      icon: 'icon.png',
      badge: 'icon.png',
      vibrate: [300, 100, 300],
      tag: 'agoge-midnight',
      requireInteraction: true
    });
    scheduleMidnight();
  }, mid - now);
}

self.addEventListener('message', e => {
  if (e.data && e.data.type === 'SCHEDULE_MIDNIGHT') scheduleMidnight();
});

scheduleMidnight();

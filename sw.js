const CACHE_NAME = 'friends-snek-cache-v1';
const OFFLINE_URL = 'index.html';

const FILES_TO_CACHE = [
  '/',
  '/index.html',
  '/style.css',
  '/app.js',
  '/manifest.json',
  '/icons/icon-192.png',
  '/icons/icon-512.png'
];

self.addEventListener('install', (evt) => {
  self.skipWaiting();
  evt.waitUntil(caches.open(CACHE_NAME).then((cache) => cache.addAll(FILES_TO_CACHE)));
});

self.addEventListener('activate', (evt) => {
  evt.waitUntil(clients.claim());
});

self.addEventListener('fetch', (evt) => {
  if (evt.request.mode === 'navigate') {
    evt.respondWith(fetch(evt.request).catch(() => caches.match(OFFLINE_URL)));
    return;
  }
  evt.respondWith(caches.match(evt.request).then((r) => r || fetch(evt.request)));
});

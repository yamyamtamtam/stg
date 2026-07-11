// PWAオフラインキャッシュ(手書き。自動生成ではない)
// キャッシュ対象を変えたら CACHE のバージョン番号を上げて古いキャッシュを破棄させること
const CACHE = 'it-stg-v2';
const ASSETS = [
  './',
  './index.html',
  './manifest.json',
  './css/style.css',
  './js/engine.js',
  './js/main.js',
  './js/gen/sprites.js',
  './js/gen/audio.js',
  './js/scenarios/scenario1_homogaki.js',
  './js/scenarios/scenario2_otasa.js',
  './js/scenarios/scenario3_salon.js',
  './js/scenarios/scenario4_singularity.js',
];

self.addEventListener('install', e => {
  e.waitUntil(caches.open(CACHE).then(c => c.addAll(ASSETS)));
  self.skipWaiting();
});

self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys().then(keys => Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k))))
  );
  self.clients.claim();
});

// キャッシュ優先: あればそれを返し、裏で最新を取得してキャッシュを更新する(次回起動時に反映)
self.addEventListener('fetch', e => {
  if (e.request.method !== 'GET') return;
  e.respondWith(
    caches.match(e.request).then(cached => {
      const fetchPromise = fetch(e.request).then(res => {
        if (res.ok) caches.open(CACHE).then(c => c.put(e.request, res.clone()));
        return res;
      }).catch(() => cached);
      return cached || fetchPromise;
    })
  );
});

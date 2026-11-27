// 앱 껍데기만 캐시 (데이터는 Firebase가 처리). 새 버전은 다음 실행 때 반영.
const C = "psb-v1.3.0-account-delete";
const SHELL = ["./", "index.html", "css/app.css", "css/shell.css", "js/app.js", "js/backend.js", "js/account-deletion.js", "js/config.js", "js/faq.js", "js/legal.js", "js/councils.js", "privacy.html", "terms.html", "img/symbol.png", "img/puac-signature-ko.jpg", "img/icon-192.png", "manifest.webmanifest"];
self.addEventListener("install", e => { e.waitUntil(caches.open(C).then(c => c.addAll(SHELL)).then(() => self.skipWaiting())); });
self.addEventListener("activate", e => { e.waitUntil(caches.keys().then(ks => Promise.all(ks.filter(k => k !== C).map(k => caches.delete(k)))).then(() => self.clients.claim())); });
self.addEventListener("fetch", e => {
  const u = new URL(e.request.url);
  if (e.request.method !== "GET" || u.origin !== location.origin) return;
  // 네트워크 우선, 실패하면 캐시
  e.respondWith(fetch(e.request).then(r => { const cp = r.clone(); caches.open(C).then(c => c.put(e.request, cp)); return r; }).catch(() => caches.match(e.request)));
});

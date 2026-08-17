// const CACHE = "workers-v2";
// const ASSETS = [
//   "./",
//   "./index.html",
//   "./workers.html",
//   "./attendance.html",
//   "./reports.html",
//   "./settings.html",
//   "./css/app.css",
//   "./js/common.js",
// ];
// self.addEventListener("install", (e) =>
//   e.waitUntil(caches.open(CACHE).then((c) => c.addAll(ASSETS))),
// );
// self.addEventListener("fetch", (e) =>
//   e.respondWith(caches.match(e.request).then((r) => r || fetch(e.request))),
// );

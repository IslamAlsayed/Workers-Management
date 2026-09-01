const CACHE_NAME = "ommal-v1.5.0";

const ASSETS = [
  "./",
  "./index.html",
  "./login.html",
  "./workers.html",
  "./attendance.html",
  "./reports.html",
  "./settings.html",
  "./worker.html",

  "./css/app.css",
  "./css/login.css",
  "./css/toast.css",
  "./css/worker.css",

  "./js/auth.js",
  "./js/common.js",
  "./js/dashboard.js",
  "./js/workers.js",
  "./js/attendance.js",
  "./js/reports.js",
  "./js/settings.js",
  "./js/worker.js",

  "./favicon.ico",
  "./manifest.json",
];

// ================================
// Install
// ================================

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches
      .open(CACHE_NAME)
      .then((cache) => cache.addAll(ASSETS))
      .then(() => self.skipWaiting()),
  );
});

// ================================
// Activate
// ================================

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(
          keys.map((key) => {
            if (key !== CACHE_NAME) {
              return caches.delete(key);
            }

            return null;
          }),
        ),
      )
      .then(() => self.clients.claim()),
  );
});

// ================================
// Fetch
// ================================

self.addEventListener("fetch", (event) => {
  const request = event.request;

  if (request.method !== "GET") return;

  const url = new URL(request.url);
  if (url.protocol !== "http:" && url.protocol !== "https:") return;

  event.respondWith(
    fetch(request)
      .then((networkResponse) => {
        if (networkResponse && networkResponse.status === 200) {
          const responseToCache = networkResponse.clone();

          caches
            .open(CACHE_NAME)
            .then((cache) => cache.put(request, responseToCache))
            .catch(() => {
              // لا يمكن حفظ الاستجابة في ذاكرة التخزين المؤقت
              toast(
                "لا يمكن حفظ الاستجابة في ذاكرة التخزين المؤقت",
                true,
                "#ff8e8e",
                "#000",
              );
            });
        }

        return networkResponse;
      })

      .catch(() => {
        // الإنترنت غير متوفر
        return caches.match(request).then((cachedResponse) => {
          if (cachedResponse) return cachedResponse;

          // لو المستخدم طلب صفحة HTML
          if (request.headers.get("accept")?.includes("text/html")) {
            return caches.match("./index.html");
          }

          return new Response("", {
            status: 503,
            statusText: "Offline",
          });
        });
      }),
  );
});

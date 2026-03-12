/* ============================================================
   NOVA — Service Worker v1.0
   Stratégie : Cache-first pour les assets, Network-first pour l'API
   ============================================================ */

const CACHE_NAME = "nova-v1";
const STATIC_CACHE = "nova-static-v1";
const API_ORIGIN = "https://nova-agent-production-8bcc.up.railway.app";

// Assets à précacher au moment de l'installation
const PRECACHE_ASSETS = [
  "/",
  "/index.html",
  "/manifest.json",
  "/icons/icon-192x192.png",
  "/icons/icon-512x512.png",
];

// ─── Installation ────────────────────────────────────────────
self.addEventListener("install", (event) => {
  console.log("[SW] Installation NOVA...");
  event.waitUntil(
    caches.open(STATIC_CACHE).then((cache) => {
      return cache.addAll(PRECACHE_ASSETS).catch((err) => {
        console.warn("[SW] Précache partiel :", err);
      });
    })
  );
  self.skipWaiting();
});

// ─── Activation & nettoyage des anciens caches ───────────────
self.addEventListener("activate", (event) => {
  console.log("[SW] Activation NOVA...");
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(
        keys
          .filter((key) => key !== CACHE_NAME && key !== STATIC_CACHE)
          .map((key) => {
            console.log("[SW] Suppression ancien cache :", key);
            return caches.delete(key);
          })
      )
    )
  );
  self.clients.claim();
});

// ─── Interception des requêtes ───────────────────────────────
self.addEventListener("fetch", (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // Ignorer les requêtes non-GET et les extensions navigateur
  if (request.method !== "GET") return;
  if (url.protocol === "chrome-extension:") return;

  // Requêtes API → Network-first (toujours fraîches)
  if (url.origin === API_ORIGIN || url.hostname.includes("supabase.co")) {
    event.respondWith(networkFirst(request));
    return;
  }

  // Assets statiques → Cache-first
  if (
    url.pathname.startsWith("/icons/") ||
    url.pathname.match(/\.(js|css|woff2?|ttf|png|jpg|svg|ico)$/)
  ) {
    event.respondWith(cacheFirst(request));
    return;
  }

  // Navigation (HTML) → Network-first avec fallback offline
  if (request.mode === "navigate") {
    event.respondWith(navigationHandler(request));
    return;
  }

  // Défaut → Network-first
  event.respondWith(networkFirst(request));
});

// ─── Stratégies de cache ─────────────────────────────────────

async function cacheFirst(request) {
  const cached = await caches.match(request);
  if (cached) return cached;
  try {
    const response = await fetch(request);
    if (response.ok) {
      const cache = await caches.open(CACHE_NAME);
      cache.put(request, response.clone());
    }
    return response;
  } catch {
    return new Response("Ressource non disponible hors ligne.", { status: 503 });
  }
}

async function networkFirst(request) {
  try {
    const response = await fetch(request);
    if (response.ok) {
      const cache = await caches.open(CACHE_NAME);
      cache.put(request, response.clone());
    }
    return response;
  } catch {
    const cached = await caches.match(request);
    return cached || new Response(JSON.stringify({ error: "Hors ligne" }), {
      status: 503,
      headers: { "Content-Type": "application/json" },
    });
  }
}

async function navigationHandler(request) {
  try {
    const response = await fetch(request);
    return response;
  } catch {
    // Fallback : retourner la page index en cache (SPA)
    const cached = await caches.match("/index.html");
    if (cached) return cached;
    return new Response(offlinePage(), {
      headers: { "Content-Type": "text/html; charset=utf-8" },
    });
  }
}

// ─── Page hors-ligne ─────────────────────────────────────────
function offlinePage() {
  return `<!DOCTYPE html>
<html lang="fr">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>NOVA — Hors ligne</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body {
      min-height: 100vh;
      background: radial-gradient(ellipse at center, #0a0510 0%, #050208 60%, #000 100%);
      display: flex; flex-direction: column; align-items: center; justify-content: center;
      font-family: 'Palatino Linotype', serif; color: #f0e8d8; text-align: center; padding: 24px;
    }
    .symbol { font-size: 48px; color: #d4a84b; margin-bottom: 24px; animation: pulse 3s ease-in-out infinite; }
    @keyframes pulse { 0%, 100% { opacity: 0.6; } 50% { opacity: 1; } }
    h1 { font-size: 28px; letter-spacing: 8px; color: #d4a84b; margin-bottom: 16px; }
    p { color: #a09080; line-height: 1.8; max-width: 340px; }
    button {
      margin-top: 32px; background: linear-gradient(135deg, #b8860b, #d4a84b);
      border: none; border-radius: 24px; padding: 14px 32px; color: #0a0800;
      font-size: 14px; font-weight: 700; cursor: pointer; letter-spacing: 1px;
    }
  </style>
</head>
<body>
  <div class="symbol">☽✦☾</div>
  <h1>NOVA</h1>
  <p>Tu sembles être hors connexion. NOVA sera de retour dès que la connexion sera rétablie.</p>
  <p style="margin-top:12px; font-size:13px; color:#706050;">Prends ce moment pour respirer et revenir à toi.</p>
  <button onclick="location.reload()">Réessayer</button>
</body>
</html>`;
}

// ─── Push Notifications (prêt pour usage futur) ──────────────
self.addEventListener("push", (event) => {
  if (!event.data) return;
  const data = event.data.json();
  event.waitUntil(
    self.registration.showNotification(data.title || "NOVA", {
      body: data.body || "Un message de NOVA t'attend.",
      icon: "/icons/icon-192x192.png",
      badge: "/icons/icon-96x96.png",
      tag: "nova-notification",
      data: { url: data.url || "/" },
      actions: [
        { action: "open", title: "Ouvrir NOVA" },
        { action: "dismiss", title: "Ignorer" },
      ],
    })
  );
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  if (event.action === "dismiss") return;
  const url = event.notification.data?.url || "/";
  event.waitUntil(
    clients.matchAll({ type: "window" }).then((clientList) => {
      for (const client of clientList) {
        if (client.url === url && "focus" in client) return client.focus();
      }
      if (clients.openWindow) return clients.openWindow(url);
    })
  );
});

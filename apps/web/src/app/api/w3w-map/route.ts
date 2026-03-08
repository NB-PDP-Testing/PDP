import type { NextRequest } from "next/server";

// Escape user-supplied strings for safe HTML interpolation
function esc(str: string): string {
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

export function GET(request: NextRequest) {
  const { searchParams } = request.nextUrl;
  const lat = searchParams.get("lat") ?? "";
  const lng = searchParams.get("lng") ?? "";
  const label = searchParams.get("label") ?? "Player Location";
  const apiKey = process.env.NEXT_PUBLIC_WHAT3WORDS_API_KEY ?? "";

  if (!(lat && lng) || Number.isNaN(Number(lat)) || Number.isNaN(Number(lng))) {
    return new Response("Missing or invalid lat/lng parameters", {
      status: 400,
    });
  }

  const mock = searchParams.get("mock") === "1";

  const safeLabel = esc(label);
  const safeLat = Number(lat).toString();
  const safeLng = Number(lng).toString();
  const displayLat = Number(lat).toFixed(5);
  const displayLng = Number(lng).toFixed(5);

  const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>${safeLabel} — what3words</title>
  <link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css" />
  <script src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js"></script>
  <style>
    *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
    html, body { height: 100%; font-family: system-ui, -apple-system, sans-serif; background: #f9fafb; }
    body { display: flex; flex-direction: column; }

    #header {
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: 10px 16px;
      background: #fff;
      border-bottom: 1px solid #e5e7eb;
      flex-shrink: 0;
      gap: 12px;
    }
    #header .name { font-weight: 600; font-size: 14px; color: #111827; }
    #header .coords { font-family: monospace; font-size: 11px; color: #9ca3af; white-space: nowrap; }

    #w3w-bar {
      display: none;
      align-items: center;
      justify-content: center;
      gap: 8px;
      padding: 8px 16px;
      background: #fff1f2;
      border-bottom: 1px solid #fecdd3;
      flex-shrink: 0;
    }
    #w3w-bar .prefix { font-size: 13px; color: #9ca3af; }
    #w3w-bar .words { font-family: monospace; font-size: 18px; font-weight: 700; color: #e11d48; letter-spacing: 0.02em; }
    #w3w-bar .copy-btn {
      padding: 2px 8px; font-size: 11px; border: 1px solid #fca5a5;
      border-radius: 4px; background: #fff; color: #e11d48; cursor: pointer;
    }
    #w3w-bar .copy-btn:hover { background: #fff1f2; }

    #w3w-error {
      display: none;
      padding: 6px 16px;
      background: #fffbeb;
      border-bottom: 1px solid #fde68a;
      font-size: 12px;
      color: #92400e;
      text-align: center;
    }

    #map { flex: 1; }
    #mock-bar {
      display: ${mock ? "block" : "none"};
      padding: 4px 16px;
      background: #fef9c3;
      border-bottom: 1px solid #fde047;
      font-size: 11px;
      color: #854d0e;
      text-align: center;
    }
  </style>
</head>
<body>
  <div id="header">
    <span class="name">${safeLabel}</span>
    <span class="coords">${displayLat}, ${displayLng}</span>
  </div>
  <div id="mock-bar">&#9888; Mock mode — what3words data is simulated, not live</div>
  <div id="w3w-bar">
    <span class="prefix">///</span>
    <span id="words" class="words"></span>
    <button class="copy-btn" onclick="copyWords()">Copy</button>
  </div>
  <div id="w3w-error"></div>
  <div id="map"></div>

  <script>
    const LAT = ${safeLat};
    const LNG = ${safeLng};
    const LABEL = ${JSON.stringify(label)};
    const API_KEY = ${JSON.stringify(apiKey)};
    const MOCK = ${mock ? "true" : "false"};

    // Initialise Leaflet map
    const map = L.map('map').setView([LAT, LNG], 18);
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      maxZoom: 20,
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
    }).addTo(map);

    const marker = L.marker([LAT, LNG]).addTo(map);
    marker.bindPopup('<strong>' + LABEL + '</strong>').openPopup();

    function showWords(words, nearestPlace) {
      document.getElementById('words').textContent = words;
      document.getElementById('w3w-bar').style.display = 'flex';
      marker.setPopupContent(
        '<strong>' + LABEL + '</strong><br>' +
        '<span style="color:#e11d48;font-family:monospace;font-size:15px">/// ' + words + '</span>' +
        (nearestPlace ? '<br><span style="font-size:11px;color:#6b7280">Near ' + nearestPlace + '</span>' : '')
      );
      marker.openPopup();
    }

    if (MOCK) {
      // Mock mode — demonstrate the UI without a live API call
      setTimeout(() => showWords('filled.count.soap', 'Demo Location (mock)'), 400);
    } else if (API_KEY) {
      // Try what3words (best-effort — shows if API plan allows)
      fetch(
        'https://api.what3words.com/v3/convert-to-3wa?coordinates=' + LAT + '%2C' + LNG + '&format=json',
        { headers: { 'X-Api-Key': API_KEY, 'Accept': 'application/json' } }
      )
      .then(r => r.json())
      .then(data => {
        if (data.words) {
          showWords(data.words, data.nearestPlace);
        } else if (data.error) {
          const el = document.getElementById('w3w-error');
          el.textContent = 'what3words: ' + (data.error.message || data.error.code);
          el.style.display = 'block';
        }
      })
      .catch(() => {});  // Map still works without it
    }

    function copyWords() {
      const words = document.getElementById('words').textContent;
      navigator.clipboard.writeText('///' + words).then(() => {
        const btn = document.querySelector('.copy-btn');
        btn.textContent = 'Copied!';
        setTimeout(() => { btn.textContent = 'Copy'; }, 1500);
      });
    }
  </script>
</body>
</html>`;

  return new Response(html, {
    headers: { "Content-Type": "text/html; charset=utf-8" },
  });
}

# Familjen – Steg 1 (visuell prototyp)

Mobil-först PWA för familjens kalender. **Endast påhittad mockdata** – ingen backend,
inga API-nycklar, ingen riktig kalender.

## Flikar
- **Idag** – dagens plan + "Tänk på" (det som kräver koll idag/imorgon).
- **Vecka** – översiktsrutnät barn × dagar + kompakt lista per dag.
- **Highlights** – bara prov, deadlines, packlistor och krockar.
- **Barn** – välj Harry 🔴 / Albert 🟢 / Georg 🟡 för en personlig vy.

Tryck på en aktivitet med `›` för detaljer (anteckningar, packlista, länkar).

## Förhandsgranska lokalt
```bash
cd /workspace/familjen-pwa
python3 -m http.server 8000
```
Öppna http://localhost:8000. (Service worker kräver http://localhost eller HTTPS –
öppna inte filen direkt via `file://`.)

## Testa på iPhone
Service worker och "Lägg till på hemskärmen" som riktig app kräver HTTPS. Servera mappen
via valfri statisk HTTPS-värd (t.ex. GitHub Pages/Netlify) eller en tunnel, öppna i Safari →
Dela → **Lägg till på hemskärmen**. Appen heter "Familjen" och fungerar offline efter första laddningen.

## Filer
| Fil | Innehåll |
|---|---|
| `index.html` | Skal, meta-taggar för iOS, flikmeny |
| `styles.css` | All styling (ljust/mörkt läge) |
| `data.js` | **Mockdata** + `MOCK_TODAY` (fast "idag") |
| `app.js` | Rendering av de fyra vyerna |
| `sw.js` | Service worker (offline-cache). Höj `CACHE`-versionen vid ändringar. |
| `manifest.webmanifest` | PWA-manifest |
| `icons/` | Appikoner (SVG + PNG 32/180/192/512 + maskable) |
| `make_icons.py` | Genererar PNG-ikonerna (Pillow) |

## Mockdata
`MOCK_TODAY = '2026-10-05'` (måndag) i `data.js`. Alla händelser anges som dagsförskjutning
från detta datum, så demon är stabil. Ändra konstanten för att flytta veckan.

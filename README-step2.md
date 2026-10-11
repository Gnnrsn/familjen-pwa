# Familjen – Steg 2: riktig kalender via Cloudflare (gratis)

Arkitektur (gratis, ingen egen domän behövs):

```
Webbläsare ──► Cloudflare Access (inloggning, Zero Trust Free)
                 └─ <projekt>.pages.dev  (+ *.<projekt>.pages.dev för förhandsversioner)
                      ├─ /         → statiska filer från dist/
                      └─ /api/*    → Pages Function functions/api/[[path]].js → Google Calendar (läsrätt)
```

* All API-logik finns på ett ställe: `lib/api.js` (JWT-kontroll, roller, Google-token, hämtning) och
  `lib/mapping.js` (mappning/filtrering). Pages Function **och** den valfria Workern anropar samma kod.
* Appen anropar `/api/events` på **samma domän** (ingen CORS). Vid fel visas mockdata + **Demo**-pillen.
* Service workern cachar **aldrig** `/api/*`.
* `_routes.json` gör att Functions bara körs för `/api/*`. `build.sh` kopierar **endast** app-filerna till
  `dist/` – `worker/`, `lib/`, `test/`, README och liknande publiceras aldrig som statiska filer.
* Befintliga GitHub Pages-sidan förblir **publik och mock-only** (ingen `/api/`, visar alltid Demo).
* Inga kalender-ID:n, konto-ID:n eller nycklar i repot (det är publikt).

> ⚠️ **Säkerhet:** Service account-nyckeln (JSON) är ett lösenord. Klistra **aldrig** in den i en chatt,
> ett mejl, en issue eller i repot – bara i Cloudflare som *secret*. Radera den lokala filen efteråt.

---

## 1) Google Cloud – nyckel för service account

1. <https://console.cloud.google.com/> → välj projektet **<ditt projekt>**.
2. ☰ → **IAM och administratör** → **Tjänstkonton**.
3. Klicka på **<tjänstekonto>@<projekt>.iam.gserviceaccount.com**.
4. Fliken **Nycklar** → **Lägg till nyckel** → **Skapa ny nyckel** → **JSON** → **Skapa**. Filen laddas ner – dela den med ingen.
5. ☰ → **API:er och tjänster** → **Aktiverade API:er**: finns inte *Google Calendar API*, klicka **+ Aktivera API:er** → sök → **Aktivera**.
6. I Google Kalender (<https://calendar.google.com/>), för **var och en** av Familjen, Harry och Albert:
   ⚙️ → **Inställningar** → välj kalendern → **Dela med specifika personer** → service account-adressen ska ha
   **Se all händelseinformation** (läsrätt, *inte* "Gör ändringar").
7. Samma sida, **Integrera kalender** → kopiera **Kalender-ID** (behövs i steg 2.4 – klistra in direkt i Cloudflare).

## 2) Cloudflare Pages (huvudspår, `<projekt>.pages.dev`)

### 2.1 Skapa projektet – välj A eller B
**A. Koppla GitHub-repot (rekommenderas)**
1. <https://dash.cloudflare.com/> → **Workers & Pages** → **Create** → fliken **Pages** → **Connect to Git**.
2. Välj repot → Production branch: `main` (eller `step2-worker` när den är publicerad på GitHub).
3. Framework preset: **None**. Build command: `sh build.sh`. Build output directory: `dist`. Root directory: *tomt*.
4. **Save and Deploy**. Projektnamnet (t.ex. `familjen`) ger adressen `familjen.pages.dev`.
   (Mappen `functions/` i repo-roten byggs automatiskt till Pages Functions.)

**B. Direktuppladdning med wrangler** (dashboardens dra-och-släpp stödjer **inte** Functions – använd kommandoraden):
```bash
cd familjen-pwa
sh build.sh
npx wrangler login
npx wrangler pages project create familjen --production-branch main
npx wrangler pages deploy dist --project-name familjen --branch main
```
Kör från repo-roten så att `functions/` kommer med. (wrangler 4 kräver Node 22+; med Node 20 använd `npx wrangler@3`.)

### 2.2 (vänta med secrets tills steg 3 är klart om du vill – men lägg in dem innan du testar)

### 2.3 Gå till projektet → **Settings** → **Variables and Secrets** → miljö **Production** → **+ Add**

| Namn | Typ | Värde |
|---|---|---|
| `GOOGLE_SA_KEY` | **Secret** | hela innehållet i JSON-filen från steg 1.4 |
| `ROLE_MAP` | **Secret** | t.ex. `{"anders@…":"parent","partner@…":"parent","harry@…":"harry","albert@…":"albert"}` |
| `CAL_FAMILY` | Secret eller Text | klistra in kalender-ID från Google Kalender-inställningarna (Familjen) |
| `CAL_HARRY` | Secret eller Text | klistra in kalender-ID från Google Kalender-inställningarna (Harry) |
| `CAL_ALBERT` | Secret eller Text | klistra in kalender-ID från Google Kalender-inställningarna (Albert) |
| `ACCESS_AUD` | Text | AUD-taggen från steg 3.6 |

Team-domänen (`https://plain-snow-7fd1.cloudflareaccess.com`) är inbyggd; den kan överskridas med variabeln `ACCESS_TEAM_DOMAIN`.
Vill du att förhandsversioner också ska fungera: lägg in samma värden under miljön **Preview** (annars visar de mock + Demo).
Med wrangler går det även: `npx wrangler pages secret put GOOGLE_SA_KEY --project-name familjen` (värdet klistras in i terminalen).

### 2.4 Deploya om
Variabler gäller först efter en ny deploy: **Deployments** → senaste production-deployen → **⋯** → **Retry deployment**
(eller pusha en commit / kör `wrangler pages deploy` igen).

Radera sedan JSON-nyckelfilen från datorn (och papperskorgen).

## 3) Zero Trust – Access-applikation för pages.dev

1. <https://one.dash.cloudflare.com/> → kontot (team `plain-snow-7fd1`), plan **Zero Trust Free** (≤ 50 användare).
2. **Access** → **Applications** → **Add an application** → **Self-hosted**.
3. Namn `Familjen`, Session duration t.ex. 1 månad.
4. **Public hostnames** – lägg till **två**, båda med *tom* path (täcker allt, **inklusive `/api/*`**):
   * `familjen.pages.dev`
   * `*.familjen.pages.dev` (förhandsversioner och deploy-specifika adresser som `abc123.familjen.pages.dev`)
5. **Policy**: namn `Familjen`, Action **Allow**, Include → **Emails** → samma adresser som i `ROLE_MAP`.
   Inloggning: **One-time PIN** (e-postkod) eller Google.
6. Spara → öppna appen igen → kopiera **Application Audience (AUD) Tag** → in som `ACCESS_AUD` (steg 2.3) → **deploya om** (steg 2.4).

Obs: Pages-inställningen *Settings → General → Access policy* skyddar bara förhandsversioner – använd den självhostade appen ovan som täcker båda.

## 4) Testchecklista

- [ ] Öppna `https://familjen.pages.dev` i inkognito → Access-inloggning visas (inte appen).
- [ ] Logga in som förälder → riktiga händelser från **endast Familjen-kalendern** (system of record; prefix 🔴/🟢/🟡 avgör barn), **ingen Demo-pill**.
- [ ] Barn: event som finns både i Familjen (med prefix) och i barnets egen kalender (samma tid, liknande titel) visas bara en gång.
- [ ] Albert handboll: rader under `Resa:` i beskrivningen (`- ...`) visas som lista under 🚌 Resa.
- [ ] `https://familjen.pages.dev/api/me` → `{"role":"parent",…}`.
- [ ] Logga in som Harry → bara Familjen + Harry; Barn-vyn visar endast Harry; inga Albert-händelser.
- [ ] Logga in som Albert → bara Familjen + Albert; Albert-handboll visar plats (om platsen finns i kalendern), ingen resetext.
- [ ] En e-post som finns i Access-policyn men **inte** i `ROLE_MAP` → `/api/me` ger **403**, appen visar mock + Demo.
- [ ] En e-post som inte finns i policyn → stoppas redan av Access.
- [ ] `curl -i https://familjen.pages.dev/api/events -H "Cf-Access-Authenticated-User-Email: anders@…"` utan inloggning → stoppas av Access (och Workern svarar 401 utan giltig JWT).
- [ ] Svarshuvud på `/api/events`: `Cache-Control: private, no-store`.
- [ ] En förhandsadress `https://<hash>.familjen.pages.dev` kräver också inloggning.
- [ ] `https://familjen.pages.dev/worker/src/index.js`, `/lib/api.js`, `/README-step2.md` → 404 (inte publicerade).
- [ ] Flygplansläge → appen öppnas från cache och visar mock + Demo (inget `/api/` i Cache Storage: DevTools → Application → Cache Storage `familjen-v13`).
- [ ] GitHub Pages-sidan visar fortfarande bara mock + Demo.

Lokalt test (inget nätverk): `node test/mapping.test.js` (Node 20+) från repo-roten.

## Gratisnivå (kontrollerat)

| Tjänst | Gratis | Vår användning |
|---|---|---|
| Cloudflare Pages | obegränsade förfrågningar för statiska filer, 500 byggen/mån | några få deploys |
| Pages Functions (räknas som Workers Free) | 100 000 förfrågningar/dag, 10 ms CPU/förfrågan | några hundra/dag; JWKS och Google-token cachas |
| Zero Trust Free | upp till 50 användare | ~4–5 |
| Google Calendar API | gratis (kvot ~1 000 000 anrop/dag) | 1–3 anrop per sidvisning |
| Google service account | gratis | – |

Ingen betalmetod och ingen egen domän behövs.

## Valfritt: fristående Worker (kräver egen domän)
`worker/` innehåller en tunn Worker (`worker/src/index.js`) som anropar samma `lib/api.js`. Den behövs **inte** för
pages.dev-spåret. Använd den bara om du senare skaffar en domän i Cloudflare: `cd worker && npx wrangler deploy`,
lägg route `familjen.<domän>/api/*`, samma secrets/variabler på Workern, och Access-appen på den domänen.

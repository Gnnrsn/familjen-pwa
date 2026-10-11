/* Familjen API – delad logik (EN källa) för Pages Functions (huvudspår) och valfri Worker.
   Endast GET /api/events och GET /api/me. */
import { stockholmDate, stockholmOffset, addDays, roleFor, calendarsForRole, childrenForRole, buildEvents, TZ } from './mapping.js';

const JSON_HEADERS = { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'private, no-store', 'X-Content-Type-Options': 'nosniff' };
const json = (body, status = 200) => new Response(JSON.stringify(body), { status, headers: JSON_HEADERS });

/* ---------- base64url / PEM ---------- */
const b64urlToBytes = (s) => {
  s = s.replace(/-/g, '+').replace(/_/g, '/'); while (s.length % 4) s += '=';
  const bin = atob(s); const out = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
  return out;
};
const bytesToB64url = (buf) => {
  const b = new Uint8Array(buf); let s = '';
  for (let i = 0; i < b.length; i++) s += String.fromCharCode(b[i]);
  return btoa(s).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
};
const strToB64url = (str) => bytesToB64url(new TextEncoder().encode(str));

/* ---------- Cloudflare Access JWT ---------- */
let jwksCache = { keys: null, exp: 0 };
async function getJwks(team, force = false) {
  const now = Date.now();
  if (!force && jwksCache.keys && now < jwksCache.exp) return jwksCache.keys;
  const r = await fetch(`${team}/cdn-cgi/access/certs`, { cf: { cacheTtl: 3600 } });
  if (!r.ok) throw new Error('jwks fetch failed');
  const { keys } = await r.json();
  jwksCache = { keys: keys || [], exp: now + 60 * 60 * 1000 };
  return jwksCache.keys;
}

export async function verifyAccessJwt(token, env) {
  const team = (env.ACCESS_TEAM_DOMAIN || '').replace(/\/+$/, '');
  if (!token || !team || !env.ACCESS_AUD) return null;
  const parts = token.split('.');
  if (parts.length !== 3) return null;
  let header, payload;
  try {
    header = JSON.parse(new TextDecoder().decode(b64urlToBytes(parts[0])));
    payload = JSON.parse(new TextDecoder().decode(b64urlToBytes(parts[1])));
  } catch { return null; }
  if (header.alg !== 'RS256' || !header.kid) return null;
  let keys = await getJwks(team);
  let jwk = keys.find((k) => k.kid === header.kid);
  if (!jwk) { keys = await getJwks(team, true); jwk = keys.find((k) => k.kid === header.kid); }
  if (!jwk) return null;
  const key = await crypto.subtle.importKey('jwk', { kty: jwk.kty, n: jwk.n, e: jwk.e, alg: 'RS256', ext: true },
    { name: 'RSASSA-PKCS1-v1_5', hash: 'SHA-256' }, false, ['verify']);
  const ok = await crypto.subtle.verify('RSASSA-PKCS1-v1_5', key, b64urlToBytes(parts[2]),
    new TextEncoder().encode(`${parts[0]}.${parts[1]}`));
  if (!ok) return null;
  const now = Math.floor(Date.now() / 1000), skew = 60;
  if (payload.iss !== team) return null;
  const aud = Array.isArray(payload.aud) ? payload.aud : [payload.aud];
  if (!aud.includes(env.ACCESS_AUD)) return null;
  if (typeof payload.exp !== 'number' || payload.exp + skew < now) return null;
  if (typeof payload.nbf === 'number' && payload.nbf - skew > now) return null;
  if (!payload.email) return null;
  return payload;
}

/* ---------- Google service account ---------- */
let tokenCache = { token: null, exp: 0 };
async function googleToken(env) {
  const now = Math.floor(Date.now() / 1000);
  if (tokenCache.token && now < tokenCache.exp - 60) return tokenCache.token;
  const sa = JSON.parse(env.GOOGLE_SA_KEY);
  const pem = sa.private_key.replace(/-----BEGIN PRIVATE KEY-----|-----END PRIVATE KEY-----|\s/g, '');
  const key = await crypto.subtle.importKey('pkcs8', b64urlToBytes(pem.replace(/\+/g, '-').replace(/\//g, '_')),
    { name: 'RSASSA-PKCS1-v1_5', hash: 'SHA-256' }, false, ['sign']);
  const head = strToB64url(JSON.stringify({ alg: 'RS256', typ: 'JWT' }));
  const claim = strToB64url(JSON.stringify({
    iss: sa.client_email, scope: 'https://www.googleapis.com/auth/calendar.readonly',
    aud: 'https://oauth2.googleapis.com/token', iat: now, exp: now + 3600
  }));
  const sig = await crypto.subtle.sign('RSASSA-PKCS1-v1_5', key, new TextEncoder().encode(`${head}.${claim}`));
  const r = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST', headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({ grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer', assertion: `${head}.${claim}.${bytesToB64url(sig)}` })
  });
  if (!r.ok) throw new Error('google token failed ' + r.status);
  const t = await r.json();
  tokenCache = { token: t.access_token, exp: now + (t.expires_in || 3600) };
  return tokenCache.token;
}

async function fetchCalendar(calId, token, todayYmd) {
  const end = addDays(todayYmd, 14);
  const p = new URLSearchParams({
    timeMin: `${todayYmd}T00:00:00${stockholmOffset(todayYmd)}`,
    timeMax: `${end}T23:59:59${stockholmOffset(end)}`,
    timeZone: TZ, singleEvents: 'true', orderBy: 'startTime', maxResults: '250'
  });
  const r = await fetch(`https://www.googleapis.com/calendar/v3/calendars/${encodeURIComponent(calId)}/events?${p}`,
    { headers: { Authorization: `Bearer ${token}` } });
  if (!r.ok) throw new Error('calendar fetch failed ' + r.status);
  return (await r.json()).items || [];
}

/* ---------- Router ---------- */
export async function handleApi(request, env) {
    const url = new URL(request.url);
    if (!url.pathname.startsWith('/api/')) return json({ error: 'not_found' }, 404);
    if (request.method !== 'GET') return json({ error: 'method_not_allowed' }, 405);

    let claims = null;
    try { claims = await verifyAccessJwt(request.headers.get('Cf-Access-Jwt-Assertion'), env); } catch { claims = null; }
    if (!claims) return json({ error: 'unauthorized' }, 401);

    const role = roleFor(env.ROLE_MAP, claims.email);
    if (!role) return json({ error: 'forbidden' }, 403);

    if (url.pathname === '/api/me') {
      return json({ email: claims.email, role, children: childrenForRole(role), calendars: calendarsForRole(role) });
    }
    if (url.pathname === '/api/events') {
      try {
        const ids = { family: env.CAL_FAMILY, harry: env.CAL_HARRY, albert: env.CAL_ALBERT };
        const today = stockholmDate();
        const token = await googleToken(env);
        const itemsByCal = {};
        await Promise.all(calendarsForRole(role).map(async (k) => {
          if (!ids[k]) throw new Error('missing CAL_' + k.toUpperCase());
          itemsByCal[k] = await fetchCalendar(ids[k], token, today);
        }));
        return json(buildEvents(itemsByCal, role, today));
      } catch (e) {
        console.log('events error', e && e.message);
        return json({ error: 'upstream_error' }, 502);
      }
    }
    return json({ error: 'not_found' }, 404);
}

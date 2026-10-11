/* Lokala tester – inget nätverk. Kör: node test/mapping.test.js */
import assert from 'node:assert/strict';
import { weekWindow, isoWeek, isoWeekday, parseTransit, htmlToText, cleanTitle, mapEvent, parseTitle, buildEvents, roleFor, calendarsForRole, stockholmOffset, dayDiff } from '../lib/mapping.js';
import worker from '../worker/src/index.js';
import { verifyAccessJwt } from '../lib/api.js';
import { onRequest as pagesApi } from '../functions/api/[[path]].js';

let n = 0; const t = async (name, fn) => { await fn(); n++; console.log('ok -', name); };
const TODAY = '2026-10-12';

await t('titelprefix', () => {
  assert.deepEqual(parseTitle('🔴 Harry | Fotboll'), { who: 'harry', title: 'Fotboll' });
  assert.deepEqual(parseTitle('🟢 Albert | Handboll'), { who: 'albert', title: 'Handboll' });
  assert.deepEqual(parseTitle('🟡 Georg | Piano'), { who: 'georg', title: 'Piano' });
  assert.deepEqual(parseTitle('Föräldramöte'), { who: 'family', title: 'Föräldramöte' });
});
await t('tidsatt event, Stockholm-tid och dag-offset', () => {
  const e = mapEvent({ id: 'a1', summary: '🔴 Harry | Fotboll', start: { dateTime: '2026-10-13T15:00:00Z' }, end: { dateTime: '2026-10-13T16:30:00Z' }, location: 'Planen' }, TODAY);
  assert.equal(e.day, 1); assert.equal(e.start, '17:00'); assert.equal(e.end, '18:30');
  assert.equal(e.who, 'harry'); assert.equal(e.type, 'routine');
  assert.equal(e.place, undefined); assert.equal(e.soloTransit, undefined); // ingen plats för andra än Albert handboll
});
await t('heldag -> start null', () => {
  const e = mapEvent({ id: 'a2', summary: 'Studiedag', start: { date: '2026-10-15' }, end: { date: '2026-10-16' } }, TODAY);
  assert.equal(e.start, null); assert.equal(e.day, 3); assert.equal(e.who, 'family');
});
await t('Albert handboll: plats från location, ingen påhittad resa', () => {
  const a = mapEvent({ id: 'h', summary: '🟢 Albert | Handboll', start: { dateTime: '2026-10-12T15:30:00Z' }, location: 'Hallen' }, TODAY);
  assert.equal(a.soloTransit, true); assert.equal(a.place, 'Hallen'); assert.equal(a.transit, '');
  const b = mapEvent({ id: 'h2', summary: '🟢 Albert | Handboll', start: { dateTime: '2026-10-12T15:30:00Z' } }, TODAY);
  assert.equal(b.place, ''); assert.equal(b.transit, '');
  const c = mapEvent({ id: 'h3', summary: '🟢 Albert | Glosor', start: { dateTime: '2026-10-12T15:30:00Z' }, location: 'Skolan' }, TODAY);
  assert.equal(c.place, undefined);
});
await t('sommartid/vintertid offset', () => {
  assert.equal(stockholmOffset('2026-07-01'), '+02:00'); assert.equal(stockholmOffset('2026-12-01'), '+01:00');
  assert.equal(dayDiff('2026-10-24', '2026-10-26'), 2); // över DST-skifte
});
const items = {
  family: [{ id: 'f1', summary: 'Middag hos mormor', start: { dateTime: '2026-10-12T16:00:00Z' } },
           { id: 'f2', summary: '🔴 Harry | Tandläkare', start: { dateTime: '2026-10-12T08:00:00Z' } },
           { id: 'fx', status: 'cancelled', summary: 'Inställt', start: { date: '2026-10-12' } }],
  harry: [{ id: 'h1', summary: '🔴 Harry | Innebandy', start: { dateTime: '2026-10-13T16:00:00Z' } }],
  albert: [{ id: 'b1', summary: '🟢 Albert | Handboll', start: { dateTime: '2026-10-12T15:00:00Z' }, location: 'Hallen' }]
};
await t('rollfiltrering', () => {
  assert.deepEqual(calendarsForRole('parent'), ['family']);
  assert.equal(calendarsForRole('okänd'), null);
  const p = buildEvents(items, 'parent', TODAY);
  assert.deepEqual(p.events.map((e) => e.id).sort(), ['gf1', 'gf2']); assert.deepEqual(p.highlights, []); // endast CAL_FAMILY
  const h = buildEvents(items, 'harry', TODAY);
  assert.ok(h.events.every((e) => e.who === 'harry' || e.who === 'family'));
  assert.deepEqual(h.events.map((e) => e.id).sort(), ['gf1', 'gf2']); assert.deepEqual(h.children, ['harry']);
  const a = buildEvents(items, 'albert', TODAY);
  assert.deepEqual(a.events.map((e) => e.id).sort(), ['gf1']); // Harrys tandläkare i familjekalendern döljs
  assert.ok(!a.events.some((e) => e.who === 'harry'));
});
await t('who från källkalender; prefix bara i familjekalendern; emojis bort ur titel', () => {
  const ev = { id: 'x', summary: '⚽ Fotboll', start: { dateTime: '2026-10-12T15:00:00Z' } };
  assert.equal(mapEvent(ev, TODAY, 0, 'harry').who, 'harry');
  assert.equal(mapEvent(ev, TODAY, 0, 'albert').who, 'albert');
  assert.equal(mapEvent(ev, TODAY, 0, 'family').who, 'family');
  assert.equal(mapEvent(ev, TODAY, 0, 'harry').title, 'Fotboll');
  // Prefix i barnkalender ändrar inte who
  assert.equal(mapEvent({ ...ev, summary: '🟢 Albert | Handboll' }, TODAY, 0, 'harry').who, 'harry');
  assert.equal(mapEvent({ ...ev, summary: '🔴 Harry | Fotboll' }, TODAY, 0, 'family').who, 'harry');
  assert.equal(cleanTitle('🔴 Harry | ⚽ Match'), 'Match');
});
await t('type-heuristik', () => {
  assert.equal(mapEvent({ id: 'a', summary: 'Matteprov', start: { dateTime: '2026-10-12T08:00:00Z' } }, TODAY).type, 'special');
  assert.equal(mapEvent({ id: 'b', summary: 'Lov', start: { date: '2026-10-12' } }, TODAY).type, 'special');
  assert.equal(mapEvent({ id: 'c', summary: 'Gymnastik', start: { dateTime: '2026-10-12T08:00:00Z' } }, TODAY).type, 'routine');
});
await t('barn: barn ser bara familjekalendern (sig själv + familj), syskon bort', () => {
  const S = '2026-10-13T15:00:00Z';
  const it = {
    family: [{ id: 'f1', summary: '🔴 Harry | Fotbollsträning', start: { dateTime: S } },
             { id: 'f2', summary: '🟢 Albert | Handboll', start: { dateTime: S } },
             { id: 'f3', summary: 'Studiedag', start: { date: '2026-10-14' } },
             { id: 'f4', summary: '🔴 Harry | Lov', start: { date: '2026-10-15' } }],
    harry: [{ id: 'h1', summary: '⚽ fotbollsträning ', start: { dateTime: S } },          // dubblett (lika)
            { id: 'h2', summary: 'Fotboll', start: { dateTime: S } },                       // dubblett (innehåller)
            { id: 'h3', summary: 'Fotbollsträning', start: { dateTime: '2026-10-13T16:00:00Z' } }, // annan tid – behålls
            { id: 'h4', summary: 'Innebandy', start: { dateTime: S } },                     // annan titel – behålls
            { id: 'h5', summary: 'LOV', start: { date: '2026-10-15' } },                    // heldag dubblett
            { id: 'h6', summary: 'Lov', start: { date: '2026-10-16' } }],                   // annat datum – behålls
    albert: [{ id: 'a1', summary: 'Handboll', start: { dateTime: S } }]
  };
  const h = buildEvents(it, 'harry', TODAY);
  assert.deepEqual(h.events.map((e) => e.id).sort(), ['gf1', 'gf3', 'gf4']); // barnkalendrar läses inte
  assert.ok(h.events.every((e) => e.who === 'harry' || e.who === 'family'));
  const p = buildEvents(it, 'parent', TODAY);
  assert.deepEqual(p.events.map((e) => e.id).sort(), ['gf1', 'gf2', 'gf3', 'gf4']);
  const a = buildEvents(it, 'albert', TODAY);
  assert.deepEqual(a.events.map((e) => e.id).sort(), ['gf2', 'gf3']); // a1 dubblett av f2
});
await t('Resa-parsning: text', () => {
  const d = 'Ta med vattenflaska.\nResa:\n- Gå till busshållplatsen 17:00\n- Buss 4 mot Centrum\n- Kliv av vid Hallen\n\n- inte med\nÖvrigt';
  assert.equal(parseTransit(d), 'Gå till busshållplatsen 17:00\nBuss 4 mot Centrum\nKliv av vid Hallen');
  assert.equal(parseTransit('Resa:\n- Buss 4\nPlanerade tider: 17:05\n- inte med'), 'Buss 4');
  assert.equal(parseTransit('Resa:\n- Buss 4\nUtrustning:\n- skor'), 'Buss 4');
  assert.equal(parseTransit('resa: \r\n- A\r\n- B'), 'A\nB');
  assert.equal(parseTransit('Ingen resa här'), ''); assert.equal(parseTransit(undefined), '');
});
await t('Resa-parsning: Google-HTML', () => {
  const h = '<p>Info</p><p>Resa:<br>- Buss 4 &amp; 6<br>- Kliv&nbsp;av vid Hallen</p><p>Planerade tider<br>- 17:05</p>';
  assert.equal(parseTransit(h), 'Buss 4 & 6\nKliv av vid Hallen');
  const l = '<b>Resa:</b><ul><li>Buss 4</li><li>Byte till 6</li></ul><br><br>- slut';
  assert.equal(parseTransit(l), 'Buss 4\nByte till 6');
  assert.equal(htmlToText('a<br/>b&lt;c'), 'a\nb<c');
  const ev = mapEvent({ id: 'z', summary: '🟢 Albert | Handboll', location: 'Hallen', description: h, start: { dateTime: '2026-10-12T15:00:00Z' } }, TODAY, 0, 'albert');
  assert.equal(ev.soloTransit, true); assert.equal(ev.place, 'Hallen'); assert.equal(ev.transit, 'Buss 4 & 6\nKliv av vid Hallen');
  const g = mapEvent({ id: 'y', summary: '🔴 Harry | Fotboll', location: 'Planen', description: h, start: { dateTime: '2026-10-12T15:00:00Z' } }, TODAY);
  assert.equal(g.transit, undefined); assert.equal(g.place, undefined);
});
await t('API-fönster: mån denna vecka – sön nästa vecka', () => {
  let w = weekWindow('2026-10-14'); // onsdag
  assert.equal(w.startYmd, '2026-10-12'); assert.equal(w.endYmd, '2026-10-25');
  assert.equal(w.timeMin, '2026-10-12T00:00:00+02:00');
  assert.equal(w.timeMax, '2026-10-26T00:00:00+01:00'); // DST slutar 25 okt
  w = weekWindow('2026-10-12'); assert.equal(w.startYmd, '2026-10-12'); assert.equal(w.endYmd, '2026-10-25'); // måndag
  w = weekWindow('2026-10-11'); assert.equal(w.startYmd, '2026-10-05'); assert.equal(w.endYmd, '2026-10-18'); // söndag
  assert.equal(isoWeekday('2026-10-11'), 7);
  w = weekWindow('2026-03-25'); // vecka med sommartidsstart 29 mars
  assert.equal(w.timeMin, '2026-03-23T00:00:00+01:00'); assert.equal(w.timeMax, '2026-04-06T00:00:00+02:00');
  assert.equal(dayDiff('2026-03-25', w.endYmd), 11);
  // negativ dag-offset för passerad dag denna vecka
  assert.equal(mapEvent({ id: 'p', summary: 'X', start: { dateTime: '2026-10-12T08:00:00Z' } }, '2026-10-14').day, -2);
  assert.equal(mapEvent({ id: 'q', summary: 'Y', start: { dateTime: '2026-10-25T22:30:00Z' } }, '2026-10-14').day, 11); // 23:30 sön 25/10 (CET) = sista dagen i fönstret
});
await t('ISO-veckonummer inkl. årsskifte', () => {
  assert.equal(isoWeek('2026-10-05'), 41); assert.equal(isoWeek('2026-10-12'), 42);
  assert.equal(isoWeek('2026-01-01'), 1); assert.equal(isoWeek('2025-12-29'), 1);
  assert.equal(isoWeek('2027-01-01'), 53); assert.equal(isoWeek('2026-12-31'), 53); assert.equal(isoWeek('2027-01-04'), 1);
  assert.equal(isoWeek('2021-01-03'), 53); assert.equal(isoWeek('2024-12-30'), 1);
});
await t('ROLE_MAP', () => {
  const m = JSON.stringify({ 'Anders@Example.com': 'parent', 'h@example.com': 'harry', 'x@example.com': 'admin' });
  assert.equal(roleFor(m, 'anders@example.com'), 'parent'); assert.equal(roleFor(m, 'h@example.com'), 'harry');
  assert.equal(roleFor(m, 'x@example.com'), null); assert.equal(roleFor(m, 'z@example.com'), null);
  assert.equal(roleFor('inte json', 'h@example.com'), null);
});

/* ---- JWT-verifiering med lokalt genererad nyckel och mockad JWKS (ingen nätverk) ---- */
const TEAM = 'https://plain-snow-7fd1.cloudflareaccess.com', AUD = 'test-aud';
const kp = await crypto.subtle.generateKey({ name: 'RSASSA-PKCS1-v1_5', modulusLength: 2048, publicExponent: new Uint8Array([1, 0, 1]), hash: 'SHA-256' }, true, ['sign', 'verify']);
const jwk = { ...(await crypto.subtle.exportKey('jwk', kp.publicKey)), kid: 'k1' };
globalThis.fetch = async (u) => {
  if (String(u) === `${TEAM}/cdn-cgi/access/certs`) return new Response(JSON.stringify({ keys: [jwk] }));
  throw new Error('nätverk ej tillåtet i test: ' + u);
};
const b64 = (o) => Buffer.from(JSON.stringify(o)).toString('base64url');
async function mk(payload, kid = 'k1', key = kp.privateKey) {
  const si = `${b64({ alg: 'RS256', kid })}.${b64(payload)}`;
  const sig = await crypto.subtle.sign('RSASSA-PKCS1-v1_5', key, new TextEncoder().encode(si));
  return `${si}.${Buffer.from(sig).toString('base64url')}`;
}
const now = Math.floor(Date.now() / 1000);
const good = { iss: TEAM, aud: [AUD], email: 'h@example.com', exp: now + 600, nbf: now - 10 };
const env = { ACCESS_TEAM_DOMAIN: TEAM, ACCESS_AUD: AUD, ROLE_MAP: JSON.stringify({ 'h@example.com': 'harry' }) };
await t('JWT: giltig accepteras, fel iss/aud/exp/nbf/signatur avvisas', async () => {
  assert.ok(await verifyAccessJwt(await mk(good), env));
  assert.equal(await verifyAccessJwt(await mk({ ...good, iss: 'https://evil.example' }), env), null);
  assert.equal(await verifyAccessJwt(await mk({ ...good, aud: ['other'] }), env), null);
  assert.equal(await verifyAccessJwt(await mk({ ...good, exp: now - 3600 }), env), null);
  assert.equal(await verifyAccessJwt(await mk({ ...good, nbf: now + 3600 }), env), null);
  const other = await crypto.subtle.generateKey({ name: 'RSASSA-PKCS1-v1_5', modulusLength: 2048, publicExponent: new Uint8Array([1, 0, 1]), hash: 'SHA-256' }, true, ['sign']);
  assert.equal(await verifyAccessJwt(await mk(good, 'k1', other.privateKey), env), null);
  assert.equal(await verifyAccessJwt('a.b.c', env), null);
});
await t('Worker: 401 utan/fel JWT (e-postheader ensam räcker inte), 403 okänd, /api/me ok, no-store', async () => {
  const req = (h) => new Request('https://f.example/api/me', { headers: h });
  let r = await worker.fetch(req({ 'Cf-Access-Authenticated-User-Email': 'h@example.com' }), env);
  assert.equal(r.status, 401);
  r = await worker.fetch(req({ 'Cf-Access-Jwt-Assertion': await mk({ ...good, email: 'okand@example.com' }) }), env);
  assert.equal(r.status, 403);
  r = await worker.fetch(req({ 'Cf-Access-Jwt-Assertion': await mk(good) }), env);
  assert.equal(r.status, 200); assert.equal(r.headers.get('cache-control'), 'private, no-store');
  assert.equal((await r.json()).role, 'harry');
  r = await worker.fetch(new Request('https://f.example/api/events', { method: 'POST', headers: { 'Cf-Access-Jwt-Assertion': await mk(good) } }), env);
  assert.equal(r.status, 405);
});

/* ---- Pages Functions-handlern (fake context, ingen nätverk) ---- */
const ctx = (path, headers = {}, method = 'GET', e = {}) => ({
  request: new Request('https://familjen.pages.dev' + path, { method, headers }),
  env: { ACCESS_AUD: AUD, ROLE_MAP: env.ROLE_MAP, ...e }, params: {}, waitUntil() {}, next() {}
});
await t('Pages Function: 401/403/405/404, /api/me 200 no-store, team-domän default', async () => {
  let r = await pagesApi(ctx('/api/me', { 'Cf-Access-Authenticated-User-Email': 'h@example.com' }));
  assert.equal(r.status, 401); assert.equal(r.headers.get('cache-control'), 'private, no-store');
  r = await pagesApi(ctx('/api/events', { 'Cf-Access-Jwt-Assertion': await mk({ ...good, email: 'okand@example.com' }) }));
  assert.equal(r.status, 403);
  r = await pagesApi(ctx('/api/me', { 'Cf-Access-Jwt-Assertion': await mk(good) }, 'POST'));
  assert.equal(r.status, 405);
  r = await pagesApi(ctx('/api/annat', { 'Cf-Access-Jwt-Assertion': await mk(good) }));
  assert.equal(r.status, 404);
  r = await pagesApi(ctx('/api/me', { 'Cf-Access-Jwt-Assertion': await mk(good) }));
  assert.equal(r.status, 200); assert.equal(r.headers.get('cache-control'), 'private, no-store');
  assert.deepEqual(await r.json(), { email: 'h@example.com', role: 'harry', children: ['harry'], calendars: ['family'] });
  r = await pagesApi(ctx('/api/me', { 'Cf-Access-Jwt-Assertion': await mk({ ...good, email: 'p@example.com' }) }, 'GET', { ROLE_MAP: JSON.stringify({ 'p@example.com': 'parent' }) }));
  assert.deepEqual((await r.json()).calendars, ['family']);
  r = await pagesApi(ctx('/api/me', { 'Cf-Access-Jwt-Assertion': await mk(good) }, 'GET', { ACCESS_AUD: undefined }));
  assert.equal(r.status, 401); // saknad ACCESS_AUD => neka
});
await t('Pages Function: /api/events med fejkad Google (token + kalender), Harry ser bara sitt', async () => {
  const { privateKey } = await crypto.subtle.generateKey({ name: 'RSASSA-PKCS1-v1_5', modulusLength: 2048, publicExponent: new Uint8Array([1, 0, 1]), hash: 'SHA-256' }, true, ['sign']);
  const pkcs8 = Buffer.from(await crypto.subtle.exportKey('pkcs8', privateKey)).toString('base64');
  const pem = `-----BEGIN PRIVATE KEY-----\n${pkcs8.match(/.{1,64}/g).join('\n')}\n-----END PRIVATE KEY-----\n`;
  const calls = [];
  const prev = globalThis.fetch;
  globalThis.fetch = async (u, init) => {
    u = String(u); calls.push(u);
    if (u.startsWith(TEAM)) return prev(u, init);
    if (u === 'https://oauth2.googleapis.com/token') {
      const a = new URLSearchParams(init.body).get('assertion');
      const claim = JSON.parse(Buffer.from(a.split('.')[1], 'base64url'));
      assert.equal(claim.scope, 'https://www.googleapis.com/auth/calendar.readonly');
      return new Response(JSON.stringify({ access_token: 'tok', expires_in: 3600 }));
    }
    const m = u.match(/calendars\/([^/]+)\/events\?(.*)$/);
    if (m) {
      const q = new URLSearchParams(m[2]);
      assert.equal(q.get('singleEvents'), 'true'); assert.equal(q.get('orderBy'), 'startTime'); assert.equal(q.get('timeZone'), 'Europe/Stockholm');
      const id = decodeURIComponent(m[1]);
      const now = new Date().toISOString();
      const data = { 'fam-id': [{ id: 'f', summary: 'Familjegrej', start: { dateTime: now } }, { id: 'fa', summary: '🟢 Albert | Glosor', start: { dateTime: now } }],
                     'harry-id': [{ id: 'h', summary: '🔴 Harry | Innebandy', start: { dateTime: now } }] }[id];
      if (!data) return new Response('nej', { status: 404 }); // Albert-kalendern får inte anropas
      return new Response(JSON.stringify({ items: data }));
    }
    throw new Error('oväntat nätverk: ' + u);
  };
  const e = { GOOGLE_SA_KEY: JSON.stringify({ client_email: 'sa@x.iam.gserviceaccount.com', private_key: pem }), CAL_FAMILY: 'fam-id', CAL_HARRY: 'harry-id', CAL_ALBERT: 'albert-id' };
  const r = await pagesApi(ctx('/api/events', { 'Cf-Access-Jwt-Assertion': await mk(good) }, 'GET', e));
  globalThis.fetch = prev;
  assert.equal(r.status, 200); assert.equal(r.headers.get('cache-control'), 'private, no-store');
  const body = await r.json();
  assert.deepEqual(body.events.map((x) => x.id).sort(), ['gf']);
  assert.ok(!calls.some((u) => u.includes('albert-id') || u.includes('harry-id')));
  assert.deepEqual(body.highlights, []);
});
await t('Pages Function: förälder hämtar ENDAST CAL_FAMILY', async () => {
  const { privateKey } = await crypto.subtle.generateKey({ name: 'RSASSA-PKCS1-v1_5', modulusLength: 2048, publicExponent: new Uint8Array([1, 0, 1]), hash: 'SHA-256' }, true, ['sign']);
  const pkcs8 = Buffer.from(await crypto.subtle.exportKey('pkcs8', privateKey)).toString('base64');
  const cals = [], prev = globalThis.fetch;
  globalThis.fetch = async (u, init) => {
    u = String(u);
    if (u.startsWith(TEAM)) return prev(u, init);
    if (u.includes('oauth2')) return new Response(JSON.stringify({ access_token: 't2', expires_in: 3600 }));
    const m = u.match(/calendars\/([^/]+)\/events/); if (m) { cals.push(decodeURIComponent(m[1])); return new Response('{"items":[]}'); }
    throw new Error('oväntat: ' + u);
  };
  const e = { ROLE_MAP: JSON.stringify({ 'p@example.com': 'parent' }), GOOGLE_SA_KEY: JSON.stringify({ client_email: 's@x', private_key: `-----BEGIN PRIVATE KEY-----\n${pkcs8}\n-----END PRIVATE KEY-----` }), CAL_FAMILY: 'fam-id', CAL_HARRY: 'harry-id', CAL_ALBERT: 'albert-id' };
  const r = await pagesApi(ctx('/api/events', { 'Cf-Access-Jwt-Assertion': await mk({ ...good, email: 'p@example.com' }) }, 'GET', e));
  globalThis.fetch = prev;
  assert.equal(r.status, 200); assert.deepEqual(cals, ['fam-id']);
});
console.log(`\n${n} tester OK`);

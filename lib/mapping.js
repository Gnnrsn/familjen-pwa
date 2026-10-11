/* Ren logik (ingen nätverk) – testbar med node. */
export const TZ = 'Europe/Stockholm';
export const ROLES = ['parent', 'harry', 'albert'];

const PREFIXES = [
  { re: /^\s*🔴\s*Harry\s*\|\s*/u, who: 'harry' },
  { re: /^\s*🟢\s*Albert\s*\|\s*/u, who: 'albert' },
  { re: /^\s*🟡\s*Georg\s*\|\s*/u, who: 'georg' }
];

/** Datum (YYYY-MM-DD) i Stockholm för given tidpunkt. */
export function stockholmDate(d = new Date()) {
  return new Intl.DateTimeFormat('en-CA', { timeZone: TZ, year: 'numeric', month: '2-digit', day: '2-digit' }).format(d);
}
/** HH:MM i Stockholm. */
export function stockholmTime(d) {
  return new Intl.DateTimeFormat('sv-SE', { timeZone: TZ, hour: '2-digit', minute: '2-digit', hourCycle: 'h23' }).format(d);
}
/** Antal dagar mellan två YYYY-MM-DD (kalenderdagar, ingen DST-påverkan). */
export function dayDiff(fromYmd, toYmd) {
  const u = (s) => { const [y, m, d] = s.split('-').map(Number); return Date.UTC(y, m - 1, d); };
  return Math.round((u(toYmd) - u(fromYmd)) / 86400000);
}
/** Offset i timmar/minuter för Stockholm vid ett datum, t.ex. "+02:00". */
export function stockholmOffset(ymd) {
  const [y, m, d] = ymd.split('-').map(Number);
  const probe = new Date(Date.UTC(y, m - 1, d, 12));
  const name = new Intl.DateTimeFormat('en-US', { timeZone: TZ, timeZoneName: 'longOffset' })
    .formatToParts(probe).find((p) => p.type === 'timeZoneName').value; // "GMT+02:00"
  const off = name.replace('GMT', '');
  return off === '' ? '+00:00' : off;
}
export function addDays(ymd, n) {
  const [y, m, d] = ymd.split('-').map(Number);
  return new Date(Date.UTC(y, m - 1, d + n)).toISOString().slice(0, 10);
}

/** Ta bort inledande emojis + "Namn |"-prefix ur visad titel. */
export function cleanTitle(s) {
  let t = String(s || '');
  for (const p of PREFIXES) t = t.replace(p.re, '');
  t = t.replace(/^[\s\p{Extended_Pictographic}\u200d\ufe0f]*(Harry|Albert|Georg)\s*\|\s*/iu, '');
  t = t.replace(/^[\s\p{Extended_Pictographic}\p{Emoji_Modifier}\u200d\ufe0f]+/u, '');
  return t.trim() || '(utan titel)';
}
/** Veckodag 1=mån … 7=sön för YYYY-MM-DD. */
export function isoWeekday(ymd) {
  const [y, m, d] = ymd.split('-').map(Number);
  return new Date(Date.UTC(y, m - 1, d)).getUTCDay() || 7;
}
/** ISO-veckonummer för YYYY-MM-DD. */
export function isoWeek(ymd) {
  const [y, m, d] = ymd.split('-').map(Number);
  const t = new Date(Date.UTC(y, m - 1, d));
  t.setUTCDate(t.getUTCDate() + 4 - (t.getUTCDay() || 7)); // torsdagen i veckan
  const y0 = Date.UTC(t.getUTCFullYear(), 0, 1);
  return Math.ceil(((t - y0) / 86400000 + 1) / 7);
}
/** API-fönster: måndag denna ISO-vecka t.o.m. söndag nästa vecka (14 dagar), som Stockholm-tider med rätt offset. */
export function weekWindow(todayYmd) {
  const startYmd = addDays(todayYmd, 1 - isoWeekday(todayYmd));
  const endYmd = addDays(startYmd, 13);
  return {
    startYmd, endYmd,
    timeMin: `${startYmd}T00:00:00${stockholmOffset(startYmd)}`,
    timeMax: `${addDays(endYmd, 1)}T00:00:00${stockholmOffset(addDays(endYmd, 1))}` // exklusiv
  };
}

export function parseTitle(summary) {
  const s = String(summary || '');
  for (const p of PREFIXES) if (p.re.test(s)) return { who: p.who, title: cleanTitle(s) };
  return { who: 'family', title: cleanTitle(s) };
}
/** Normaliserad titel för dubblettjämförelse. */
export function normTitle(s) {
  return cleanTitle(s).toLowerCase().replace(/[\p{Extended_Pictographic}\u200d\ufe0f]/gu, '').replace(/\s+/g, ' ').trim();
}

/** Google-beskrivning (ev. HTML) -> ren text med radbrytningar. */
export function htmlToText(s) {
  return String(s || '')
    .replace(/\r\n?/g, '\n')
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<\/li>/gi, '').replace(/<\/(p|div|ul|ol|h\d)>/gi, '\n')
    .replace(/<li[^>]*>/gi, '\n- ')
    .replace(/<[^>]+>/g, '')
    .replace(/&nbsp;/g, ' ').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"')
    .replace(/&#39;|&apos;/g, "'").replace(/&#(\d+);/g, (_, n) => String.fromCodePoint(+n)).replace(/&amp;/g, '&')
    .replace(/\n- *\n/g, '\n- ');
}
/** Hitta "Resa:"-blocket: följande "- "-rader tills tomrad / "Planerade tider" / ny "Rubrik:".
    Returnerar { start, end (exklusiv), items } eller null. */
function findResaBlock(lines) {
  const start = lines.findIndex((l) => /^\s*Resa:\s*/i.test(l));
  if (start < 0) return null;
  const items = [];
  const inline = lines[start].replace(/^\s*Resa:\s*/i, '').trim();
  if (inline) items.push(inline.replace(/^-\s+/, ''));
  let end = start + 1;
  for (; end < lines.length; end++) {
    const l = lines[end].trim();
    if (!l || /^planerade tider/i.test(l) || /^[^\s-][^:]{0,40}:\s*$/.test(l) || /^[A-ZÅÄÖ][\wåäö ]{0,30}:\s/.test(l)) break;
    if (/^-\s+/.test(l)) items.push(l.replace(/^-\s+/, ''));
  }
  return { start, end, items };
}
export function parseTransit(description) {
  const r = findResaBlock(htmlToText(description).split('\n'));
  return r ? r.items.join('\n') : '';
}
/** Beskrivning -> anteckningar: utan Källa-rader, utan Resa-block, utan Plats/Adress (om inte soloTransit). */
export function parseNotes(description, soloTransit = false) {
  let lines = htmlToText(description).split('\n');
  const r = findResaBlock(lines);
  if (r) lines = [...lines.slice(0, r.start), ...lines.slice(r.end)];
  lines = lines.filter((l) => !/^\s*Käll(a|or|orna)\s*:/i.test(l) && (soloTransit || !/^\s*(Plats|Adress)\s*:/i.test(l)));
  return lines.map((l) => l.replace(/\s+$/, '')).join('\n').replace(/\n{3,}/g, '\n\n').trim();
}

const SPECIAL_RE = /(prov|förhör|utflykt|match|cup|möte)/i;

/** Google Calendar-event -> app-modellen i data.js.
    source: 'family' | 'harry' | 'albert' – barnkalendrar bestämmer who; bara familjekalendern använder prefix. */
export function mapEvent(ev, todayYmd, idx = 0, source = 'family') {
  const parsed = parseTitle(ev.summary);
  const who = source === 'harry' || source === 'albert' ? source : parsed.who;
  const title = parsed.title;
  const allDay = !!(ev.start && ev.start.date && !ev.start.dateTime);
  let day, start = null, end = null;
  if (allDay) {
    day = dayDiff(todayYmd, ev.start.date);
  } else {
    const s = new Date(ev.start.dateTime);
    day = dayDiff(todayYmd, stockholmDate(s));
    start = stockholmTime(s);
    if (ev.end && ev.end.dateTime) end = stockholmTime(new Date(ev.end.dateTime));
  }
  const type = allDay || SPECIAL_RE.test(title) ? 'special' : 'routine';
  const out = { id: 'g' + (ev.id ? String(ev.id).replace(/[^A-Za-z0-9_-]/g, '').slice(0, 64) : idx), day, start, end, who, type, title };
  if (who === 'albert' && /handboll/i.test(title)) {
    out.soloTransit = true;
    out.place = ev.location ? String(ev.location).trim() : '';
    out.transit = parseTransit(ev.description); // bara från beskrivningen, aldrig påhittat
  }
  const notes = parseNotes(ev.description, !!out.soloTransit);
  if (notes) out.details = { notes };
  return out;
}

/** Vilka kalendernycklar en roll får se. */
export function calendarsForRole(role) {
  if (role === 'parent') return ['family']; // familjekalendern är system of record
  if (role === 'harry') return ['family']; // barnkalendrar speglar familjekalendern
  if (role === 'albert') return ['family'];
  return null;
}
export function childrenForRole(role) {
  if (role === 'parent') return ['harry', 'albert', 'georg'];
  if (role === 'harry' || role === 'albert') return [role];
  return [];
}

/** ROLE_MAP (JSON-sträng) + e-post -> roll eller null. Skiftlägesokänslig e-post. */
export function roleFor(roleMapJson, email) {
  if (!email) return null;
  let map;
  try { map = JSON.parse(roleMapJson || '{}'); } catch { return null; }
  const want = String(email).trim().toLowerCase();
  for (const [k, v] of Object.entries(map)) {
    if (k.trim().toLowerCase() === want && ROLES.includes(v)) return v;
  }
  return null;
}

const startKey = (ev) => (ev.start && (ev.start.dateTime ? new Date(ev.start.dateTime).getTime() : ev.start.date)) ?? '';
function similar(a, b) {
  const x = normTitle(a), y = normTitle(b);
  return !!x && !!y && (x === y || x.includes(y) || y.includes(x));
}

/** Bygg svar: items per kalendernyckel -> sorterade app-events. */
export function buildEvents(itemsByCal, role, todayYmd) {
  const cals = calendarsForRole(role) || [];
  const events = [];
  const seen = new Set();
  const famRaw = []; // familjeevent för barnet (för dedup)
  for (const cal of cals) {
    for (const [i, ev] of (itemsByCal[cal] || []).entries()) {
      if (ev.status === 'cancelled') continue;
      const m = mapEvent(ev, todayYmd, `${cal}${i}`, cal);
      // Barn ser aldrig syskons event, även om de skulle ligga i familjekalendern med prefix.
      if (role !== 'parent' && m.who !== 'family' && m.who !== role) continue;
      if (cal === 'family') {
        if (m.who === role) famRaw.push(ev);
      } else if (famRaw.some((f) => startKey(f) === startKey(ev) && similar(f.summary, ev.summary))) {
        continue; // dubblett av familjekalenderns event
      }
      if (seen.has(m.id)) continue;
      seen.add(m.id);
      events.push(m);
    }
  }
  events.sort((a, b) => a.day - b.day || (a.start || '00:00').localeCompare(b.start || '00:00'));
  return { today: todayYmd, role, children: childrenForRole(role), events, highlights: [] };
}

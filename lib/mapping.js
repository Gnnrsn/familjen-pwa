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

export function parseTitle(summary) {
  const s = String(summary || '');
  for (const p of PREFIXES) if (p.re.test(s)) return { who: p.who, title: s.replace(p.re, '').trim() || '(utan titel)' };
  return { who: 'family', title: s.trim() || '(utan titel)' };
}

/** Google Calendar-event -> app-modellen i data.js. */
export function mapEvent(ev, todayYmd, idx = 0) {
  const { who, title } = parseTitle(ev.summary);
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
  const out = { id: 'g' + (ev.id ? String(ev.id).replace(/[^A-Za-z0-9_-]/g, '').slice(0, 64) : idx), day, start, end, who, type: 'routine', title };
  if (who === 'albert' && /handboll/i.test(title)) {
    out.soloTransit = true;
    const loc = ev.location ? String(ev.location).trim() : '';
    out.place = loc;
    out.transit = ''; // ingen påhittad resetext
  }
  return out;
}

/** Vilka kalendernycklar en roll får se. */
export function calendarsForRole(role) {
  if (role === 'parent') return ['family', 'harry', 'albert'];
  if (role === 'harry') return ['family', 'harry'];
  if (role === 'albert') return ['family', 'albert'];
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

/** Bygg svar: items per kalendernyckel -> sorterade app-events. */
export function buildEvents(itemsByCal, role, todayYmd) {
  const cals = calendarsForRole(role) || [];
  const events = [];
  const seen = new Set();
  for (const cal of cals) {
    for (const [i, ev] of (itemsByCal[cal] || []).entries()) {
      if (ev.status === 'cancelled') continue;
      const m = mapEvent(ev, todayYmd, `${cal}${i}`);
      if (seen.has(m.id)) continue;
      // Barn ser aldrig syskons event, även om de skulle ligga i familjekalendern med prefix.
      if (role !== 'parent' && m.who !== 'family' && m.who !== role) continue;
      seen.add(m.id);
      events.push(m);
    }
  }
  events.sort((a, b) => a.day - b.day || (a.start || '00:00').localeCompare(b.start || '00:00'));
  return { today: todayYmd, role, children: childrenForRole(role), events, highlights: [] };
}

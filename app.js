/* Familjen – Steg 1, visuell prototyp. All data kommer från data.js (mock). */
(function () {
  'use strict';

  const DAYS = ['Söndag', 'Måndag', 'Tisdag', 'Onsdag', 'Torsdag', 'Fredag', 'Lördag'];
  const DAYS_SHORT = ['Sön', 'Mån', 'Tis', 'Ons', 'Tor', 'Fre', 'Lör'];
  const MONTHS = ['januari', 'februari', 'mars', 'april', 'maj', 'juni', 'juli',
    'augusti', 'september', 'oktober', 'november', 'december'];
  const WEEK_DAYS = 7;
  const BUSY_THRESHOLD = 4; // antal barnaktiviteter för "Mycket"
  const isBusy = (d) => eventsOn(d, (e) => e.who !== 'family').length >= BUSY_THRESHOLD;

  const [Y, M, D] = MOCK_TODAY.split('-').map(Number);
  const dateFor = (offset) => new Date(Y, M - 1, D + offset);

  const esc = (s) => String(s == null ? '' : s).replace(/[&<>"']/g, (c) =>
    ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);

  function dayName(offset, short) {
    if (offset === 0) return 'Idag';
    if (offset === 1) return 'Imorgon';
    const d = dateFor(offset);
    return (short ? DAYS_SHORT : DAYS)[d.getDay()];
  }
  function fullDate(offset) {
    const d = dateFor(offset);
    return `${DAYS[d.getDay()]} ${d.getDate()} ${MONTHS[d.getMonth()]}`;
  }
  function shortDate(offset) {
    const d = dateFor(offset);
    return `${d.getDate()} ${MONTHS[d.getMonth()].slice(0, 3)}`;
  }

  const byTime = (a, b) => (a.start || '00:00').localeCompare(b.start || '00:00');
  const eventsOn = (day, filter) => EVENTS.filter((e) => e.day === day && (!filter || filter(e))).sort(byTime);
  const hlForEvent = (id) => HIGHLIGHTS.find((h) => h.events.includes(id));
  const reasonsForDay = (d) => {
    const rs = HIGHLIGHTS.filter((h) => h.day === d).map((h) => h.reason || h.title);
    return [...new Set(rs.filter(Boolean))];
  };

  /* ---------- Byggstenar ---------- */

  function timeHtml(e) {
    if (!e.start) return '<div class="ev-time"><span class="allday">Hela dagen</span></div>';
    return `<div class="ev-time"><b>${esc(e.start)}</b>${e.end ? `<span>${esc(e.end)}</span>` : ''}</div>`;
  }

  /** Kort "!" som öppnar reason-popover. reason kan vara sträng eller komma-separerad lista. */
  function attnBtn(reason, extraClass) {
    if (!reason) return '';
    const r = Array.isArray(reason) ? reason.join(' · ') : reason;
    if (!r) return '';
    const cls = ['attn', extraClass].filter(Boolean).join(' ');
    return `<button type="button" class="${cls}" data-reason="${esc(r)}" aria-label="Viktigt: ${esc(r)}" aria-expanded="false">!</button>`;
  }

  function detailsHtml(e) {
    const d = e.details || {};
    let h = '';
    if (e.place) h += `<p class="ev-place"><span class="lbl">📍 Plats</span> ${esc(e.place)}</p>`;
    const transit = e.transit || 'SL: buss 144 → hållplats Skolan, ~12 min';
    h += `<p class="ev-transit"><span class="lbl">🚌 Resa</span> ${esc(transit)}</p>`;
    if (d.notes) h += `<p class="ev-notes">${esc(d.notes)}</p>`;
    if (d.pack && d.pack.length) {
      h += `<div class="ev-pack"><div class="lbl">🎒 Packlista</div><ul>${d.pack.map((p) => `<li>${esc(p)}</li>`).join('')}</ul></div>`;
    }
    if (d.links && d.links.length) {
      h += `<ul class="ev-links">${d.links.map((l) =>
        `<li><a href="${esc(l.url)}" target="_blank" rel="noopener">📎 ${esc(l.label)}</a></li>`).join('')}</ul>`;
    }
    return h;
  }

  function eventCard(e, opts) {
    opts = opts || {};
    const p = PEOPLE[e.who];
    const hl = hlForEvent(e.id);
    const cls = ['ev', e.type === 'special' ? 'ev--special' : 'ev--routine', hl ? 'ev--hl' : ''].join(' ');
    const whoTag = opts.hideWho ? '' : `<span class="who who-tag">${p.emoji} ${esc(p.name)}</span>`;
    const hlTag = hl ? attnBtn(hl.reason || 'viktigt', 'hl-tag') : '';
    const inner = `
      ${timeHtml(e)}
      <div class="ev-body">
        <div class="ev-title">${esc(e.title)}</div>
        <div class="ev-meta">${whoTag}${e.place ? `<span class="place">${esc(e.place)}</span>` : ''}</div>
        ${hlTag}
      </div>`;
    return `<details class="${cls}" style="--c:${p.color}">
      <summary class="ev-row">${inner}<span class="chev" aria-hidden="true">›</span></summary>
      <div class="ev-details">${detailsHtml(e)}</div>
    </details>`;
  }

  function hlCard(h, opts) {
    opts = opts || {};
    const people = h.who.map((w) => PEOPLE[w]);
    const color = people[0].color;
    const stripes = people.map((p) => p.color).join(', ');
    return `<article class="hl" style="--c:${color};--stripes:linear-gradient(${people.length > 1 ? stripes : color + ',' + color})">
      ${attnBtn(h.reason || 'viktigt', 'hl-ico')}
      <div class="hl-body">
        <div class="hl-top"><span class="hl-kind">Viktigt</span><span class="hl-when">${esc(dayName(h.day))}${h.day > 1 ? ' ' + shortDate(h.day) : ''}</span></div>
        <div class="hl-title">${esc(h.title)}</div>
        ${opts.compact ? '' : `<div class="hl-text">${esc(h.text)}</div>`}
        <div class="hl-who">${people.map((p) => `<span class="who who-tag" style="--c:${p.color}">${p.emoji} ${esc(p.name)}</span>`).join('')}</div>
      </div>
    </article>`;
  }

  function compactEvent(e) {
    const p = PEOPLE[e.who];
    const hl = hlForEvent(e.id);
    return `<details class="compact-ev ${e.type === 'special' ? 'is-special' : ''}">
      <summary class="compact-row">
        <span class="c-time">${e.start ? esc(e.start) : 'Heldag'}</span>
        <span class="c-dot" style="--c:${p.color}" title="${esc(p.name)}">${p.emoji}</span>
        <span class="c-title">${esc(e.title)}</span>
        ${hl ? attnBtn(hl.reason || 'viktigt', 'c-hl') : ''}
        <span class="chev chev--sm" aria-hidden="true">›</span>
      </summary>
      <div class="compact-details">${detailsHtml(e)}</div>
    </details>`;
  }

  /* ---------- Vyer ---------- */

  function viewIdag() {
    const evs = eventsOn(0);
    const soon = HIGHLIGHTS.filter((h) => h.day >= 0 && h.day <= 1);
    const kidsBusy = CHILDREN.filter((c) => evs.some((e) => e.who === c)).length;
    let h = `<section class="summary">
      <div class="summary-big">${evs.length} aktiviteter</div>
      <div class="summary-small">${kidsBusy} av 3 barn har något idag${soon.length ? '' : ' · inget som kräver extra koll'}</div>
    </section>`;
    if (soon.length) {
      h += `<section class="section"><h2 class="sec-title">Tänk på</h2>${soon.map((x) => hlCard(x, { compact: false })).join('')}</section>`;
    }
    h += `<section class="section"><h2 class="sec-title">Dagens plan</h2>`;
    h += evs.length ? `<div class="list">${evs.map((e) => eventCard(e)).join('')}</div>` : '<p class="empty">Inget planerat idag 🎉</p>';
    h += '</section>';
    return h;
  }

  function viewVecka() {
    // Endast barn i rutnätet – ingen "Alla"/familje-rad
    const rows = ['harry', 'albert', 'georg'];
    let grid = '<div class="grid" role="table" aria-label="Veckoöversikt"><div class="grid-row grid-head" role="row"><div class="grid-label"></div>';
    for (let d = 0; d < WEEK_DAYS; d++) {
      const busy = isBusy(d);
      grid += `<a class="grid-day ${d === 0 ? 'is-today' : ''} ${busy ? 'is-busy' : ''}" href="#dag-${d}" role="columnheader">${DAYS_SHORT[dateFor(d).getDay()]}<small>${dateFor(d).getDate()}</small></a>`;
    }
    grid += '</div>';
    rows.forEach((w) => {
      const p = PEOPLE[w];
      grid += `<div class="grid-row" role="row"><div class="grid-label" title="${esc(p.name)}">${p.emoji}<span>${esc(p.name)}</span></div>`;
      for (let d = 0; d < WEEK_DAYS; d++) {
        const n = eventsOn(d, (e) => e.who === w).length;
        const hl = HIGHLIGHTS.some((x) => x.day === d && x.who.includes(w));
        grid += `<div class="grid-cell" role="cell" style="--c:${p.color}">${n ? `<span class="pip ${hl ? 'pip--hl' : ''}">${n}</span>` : ''}</div>`;
      }
      grid += '</div>';
    });
    grid += '</div><p class="legend"><span class="pip pip--demo">2</span> antal aktiviteter · <span class="pip pip--demo pip--hl">1</span> kräver koll</p>';

    let days = '';
    for (let d = 0; d < WEEK_DAYS; d++) {
      const evs = eventsOn(d);
      const hls = HIGHLIGHTS.filter((x) => x.day === d);
      const busy = isBusy(d);
      const dayReasons = reasonsForDay(d);
      days += `<section class="day" id="dag-${d}">
        <header class="day-head">
          <div><span class="day-name">${esc(dayName(d))}</span> <span class="day-date">${d <= 1 ? fullDate(d).toLowerCase() : shortDate(d)}</span></div>
          <div class="day-badges">${hls.length ? attnBtn(dayReasons, 'badge badge--hl attn--day') : ''}${busy ? '<span class="badge badge--busy">Mycket</span>' : ''}</div>
        </header>
        ${evs.length ? `<div class="compact">${evs.map((e) => compactEvent(e)).join('')}</div>` : '<p class="empty small">Lugnt</p>'}
      </section>`;
    }
    return `<section class="section">${grid}</section><section class="section">${days}</section>`;
  }

  function viewHighlights() {
    const list = HIGHLIGHTS.filter((h) => h.day >= 0 && h.day < WEEK_DAYS).sort((a, b) => a.day - b.day);
    if (!list.length) return '<p class="empty">Inget som kräver uppmärksamhet just nu ✅</p>';
    return `<p class="intro">${list.length} saker att ha koll på kommande vecka. Allt annat rullar på som vanligt.</p>
      <div class="list">${list.map((h) => hlCard(h)).join('')}</div>`;
  }

  function viewBarn() {
    const sel = state.child;
    let h = `<div class="picker" role="tablist" aria-label="Välj barn">${CHILDREN.map((c) => {
      const p = PEOPLE[c];
      return `<button class="pick ${sel === c ? 'is-on' : ''}" role="tab" aria-selected="${sel === c}" data-child="${c}" style="--c:${p.color}"><span class="pick-emoji">${p.emoji}</span>${esc(p.name)}</button>`;
    }).join('')}</div>`;
    if (!sel) return h + '<p class="empty">Välj ett barn ovan för att se en personlig vy.</p>';

    const p = PEOPLE[sel];
    const mine = (e) => e.who === sel || (e.who === 'family' && (!e.about || e.about.includes(sel)));
    const hls = HIGHLIGHTS.filter((x) => x.who.includes(sel) && x.day >= 0 && x.day < WEEK_DAYS);
    const count = EVENTS.filter((e) => e.who === sel && e.day >= 0 && e.day < WEEK_DAYS).length;
    h += `<section class="summary child-summary" style="--c:${p.color}">
      <div class="summary-big">${p.emoji} ${esc(p.name)}</div>
      <div class="summary-small">${count} aktiviteter i veckan${hls.length ? ` · ${hls.length} att ha koll på` : ''}</div>
    </section>`;
    if (hls.length) h += `<section class="section"><h2 class="sec-title">Att ha koll på</h2>${hls.map((x) => hlCard(x)).join('')}</section>`;
    h += '<section class="section"><h2 class="sec-title">Veckan</h2>';
    for (let d = 0; d < WEEK_DAYS; d++) {
      const evs = eventsOn(d, mine);
      h += `<div class="child-day"><h3 class="child-day-title">${esc(dayName(d))} <span>${shortDate(d)}</span></h3>`;
      h += evs.length ? `<div class="list">${evs.map((e) => eventCard(e, { hideWho: e.who === sel })).join('')}</div>` : '<p class="empty small">Ledigt</p>';
      h += '</div>';
    }
    return h + '</section>';
  }

  /* ---------- Navigering ---------- */

  const VIEWS = {
    idag: { title: 'Idag', render: viewIdag },
    vecka: { title: 'Vecka', render: viewVecka },
    highlights: { title: 'Highlights', render: viewHighlights },
    barn: { title: 'Barn', render: viewBarn }
  };

  const store = {
    get(k, def) { try { return localStorage.getItem('familjen.' + k) || def; } catch (_) { return def; } },
    set(k, v) { try { localStorage.setItem('familjen.' + k, v); } catch (_) { /* privat läge */ } }
  };

  const [hashTab, hashChild] = location.hash.slice(1).split(':');
  const state = {
    tab: VIEWS[hashTab] ? hashTab : store.get('tab', 'idag'),
    child: CHILDREN.includes(hashChild) ? hashChild : store.get('child', null)
  };
  if (!VIEWS[state.tab]) state.tab = 'idag';
  if (state.child && !CHILDREN.includes(state.child)) state.child = null;

  const $view = document.getElementById('view');

  /* Popover för "!"-reason */
  let $pop = null;
  let attnIgnoreScrollUntil = 0;
  function closeAttn() {
    if ($pop) { $pop.remove(); $pop = null; }
    document.querySelectorAll('.attn[aria-expanded="true"]').forEach((b) => b.setAttribute('aria-expanded', 'false'));
  }
  function openAttn(btn) {
    const reason = (btn.getAttribute('data-reason') || '').trim();
    const wasOpen = btn.getAttribute('aria-expanded') === 'true';
    closeAttn();
    if (wasOpen || !reason) return;
    btn.setAttribute('aria-expanded', 'true');
    $pop = document.createElement('div');
    $pop.className = 'attn-pop';
    $pop.setAttribute('role', 'status');
    $pop.textContent = reason;
    document.body.appendChild($pop);
    const r = btn.getBoundingClientRect();
    const pw = $pop.offsetWidth || 160;
    const ph = $pop.offsetHeight || 36;
    let left = r.left + r.width / 2 - pw / 2;
    left = Math.max(8, Math.min(left, window.innerWidth - pw - 8));
    let top = r.bottom + 10;
    if (top + ph > window.innerHeight - 12) top = Math.max(8, r.top - ph - 10);
    $pop.style.left = left + 'px';
    $pop.style.top = top + 'px';
    // iOS often fires a scroll on tap; ignore briefly so the popover stays open
    attnIgnoreScrollUntil = Date.now() + 500;
  }

  function render() {
    closeAttn();
    const v = VIEWS[state.tab];
    document.getElementById('view-title').textContent = v.title;
    document.title = `${v.title} · Familjen`;
    $view.innerHTML = v.render();
    $view.dataset.view = state.tab;
    document.querySelectorAll('.tab').forEach((b) => {
      const on = b.dataset.tab === state.tab;
      b.classList.toggle('is-on', on);
      b.setAttribute('aria-current', on ? 'page' : 'false');
    });
  }

  function go(tab) {
    if (!VIEWS[tab]) return;
    state.tab = tab;
    store.set('tab', tab);
    history.replaceState(null, '', '#' + tab);
    render();
    window.scrollTo(0, 0);
  }

  document.querySelector('.tabbar').addEventListener('click', (ev) => {
    const b = ev.target.closest('.tab');
    if (b) go(b.dataset.tab);
  });

  // Capture so "!" inside <summary> does not also toggle <details>
  $view.addEventListener('click', (ev) => {
    const attn = ev.target.closest('.attn');
    if (!attn || !$view.contains(attn)) return;
    ev.preventDefault();
    ev.stopPropagation();
    openAttn(attn);
  }, true);

  $view.addEventListener('click', (ev) => {
    const pick = ev.target.closest('.pick');
    if (pick) {
      state.child = pick.dataset.child;
      store.set('child', state.child);
      render();
      return;
    }
    const jump = ev.target.closest('a.grid-day');
    if (jump) {
      ev.preventDefault();
      const el = document.querySelector(jump.getAttribute('href'));
      if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  });

  // Klick utanför stänger popover; klick på popover själv gör inget
  document.addEventListener('click', (ev) => {
    if ($pop && !ev.target.closest('.attn') && !ev.target.closest('.attn-pop')) closeAttn();
  });
  document.addEventListener('keydown', (ev) => {
    if (ev.key === 'Escape') closeAttn();
  });
  window.addEventListener('scroll', () => { if ($pop && Date.now() > attnIgnoreScrollUntil) closeAttn(); }, { passive: true });

  // Statisk header-info
  document.getElementById('today-label').textContent = fullDate(0);
  const upcoming = HIGHLIGHTS.filter((h) => h.day >= 0 && h.day < WEEK_DAYS).length;
  const badge = document.getElementById('hl-badge');
  if (upcoming) { badge.textContent = upcoming; badge.hidden = false; }

  render();
})();

/* ==========================================================================
   Familjen – MOCKDATA (påhittad). Inga riktiga adresser, skolor eller kalendrar.
   Alla händelser anges med dagsförskjutning (day) relativt MOCK_TODAY så att
   demon alltid ser likadan ut.
   OBS: 2026-10-06 är en tisdag – måndagen i den veckan är 2026-10-05.
   ========================================================================== */
const MOCK_TODAY = '2026-10-05'; // Måndag

const PEOPLE = {
  harry:  { name: 'Harry',    emoji: '🔴', color: '#e5484d' },
  albert: { name: 'Albert',   emoji: '🟢', color: '#30a46c' },
  georg:  { name: 'Georg',    emoji: '🟡', color: '#e0b400' },
  family: { name: 'Familjen', emoji: '👨‍👩‍👧‍👦', color: '#6e56cf' }
};
const CHILDREN = ['harry', 'albert', 'georg'];

/* type: 'routine' = vardag/återkommande (dämpad), 'special' = avvikande
   about: (valfritt) för familjehändelser som bara rör vissa barn – döljs i övriga barns vy */
const EVENTS = [
  // ---- Dag 0 (måndag, idag) ----
  { id: 'e1', day: 0, start: '08:10', end: '09:00', who: 'georg', type: 'routine',
    title: 'Idrott', place: 'Skolans gympasal',
    details: { notes: 'Gympapåse: shorts, t-shirt, inneskor.' } },
  { id: 'e2', day: 0, start: '17:00', end: '18:30', who: 'harry', type: 'routine',
    title: 'Fotbollsträning', place: 'Fotbollsplanen' },
  { id: 'e3', day: 0, start: '17:30', end: '18:30', who: 'albert', type: 'routine',
    title: 'Simning', place: 'Simhallen' },
  { id: 'e4', day: 0, start: '18:45', end: '19:30', who: 'family', type: 'routine',
    title: 'Middag', place: 'Hemma' },

  // ---- Dag 1 (tisdag) ----
  { id: 'e5', day: 1, start: '09:00', end: '09:30', who: 'albert', type: 'special',
    title: 'Glosförhör engelska', place: 'Skolan',
    details: { notes: 'Kapitel 3 – 20 glosor, båda hållen.',
      links: [{ label: 'Glosor kapitel 3 (PDF)', url: 'https://example.com/mock/glosor-kap3.pdf' }] } },
  { id: 'e6', day: 1, start: '16:30', end: '17:30', who: 'georg', type: 'routine',
    title: 'Gymnastik', place: 'Idrottshallen' },
  { id: 'e7', day: 1, start: '18:00', end: '19:15', who: 'harry', type: 'routine',
    title: 'Innebandy', place: 'Idrottshallen' },

  // ---- Dag 2 (onsdag) ----
  { id: 'e8', day: 2, start: '15:45', end: '16:15', who: 'georg', type: 'routine',
    title: 'Pianolektion', place: 'Musikskolan' },
  { id: 'e9', day: 2, start: '17:00', end: '18:15', who: 'albert', type: 'routine',
    title: 'Fotbollsträning', place: 'Fotbollsplanen' },
  { id: 'e10', day: 2, start: '18:30', end: '19:30', who: 'family', about: ['albert'], type: 'special',
    title: 'Föräldramöte åk 5 (Albert)', place: 'Skolan, matsalen',
    details: { notes: 'En förälder räcker. Agenda: höstens utflykter.',
      links: [{ label: 'Kallelse föräldramöte', url: 'https://example.com/mock/foraldramote.pdf' }] } },

  // ---- Dag 3 (torsdag) ----
  { id: 'e11', day: 3, start: null, end: null, who: 'georg', type: 'special',
    title: 'Sista dag: anmälan skogsutflykt', place: 'Lämnas till fröken',
    details: { notes: 'Lapp + 50 kr i kuvert. Glöm inte namn.',
      links: [{ label: 'Informationsbrev utflykt', url: 'https://example.com/mock/skogsutflykt-info' }] } },
  { id: 'e12', day: 3, start: '17:00', end: '18:30', who: 'harry', type: 'routine',
    title: 'Fotbollsträning', place: 'Fotbollsplanen' },
  { id: 'e13', day: 3, start: '18:45', end: '19:30', who: 'harry', type: 'special',
    title: 'Trumlektion', place: 'Musikskolan',
    details: { notes: 'Byte direkt från fotbollen – ta med ombyte och mellanmål i bilen.' } },
  { id: 'e14', day: 3, start: '17:30', end: '18:30', who: 'albert', type: 'routine',
    title: 'Simning', place: 'Simhallen' },

  // ---- Dag 4 (fredag) ----
  { id: 'e15', day: 4, start: '08:15', end: '14:30', who: 'georg', type: 'special',
    title: 'Skogsutflykt (heldag)', place: 'Samling vid skolan',
    details: { pack: ['Matsäck', 'Vattenflaska', 'Regnkläder', 'Stövlar', 'Sittunderlag'],
      links: [{ label: 'Informationsbrev utflykt', url: 'https://example.com/mock/skogsutflykt-info' }] } },
  { id: 'e16', day: 4, start: '16:30', end: '17:30', who: 'georg', type: 'routine',
    title: 'Gymnastik', place: 'Idrottshallen' },
  { id: 'e17', day: 4, start: '18:00', end: '19:15', who: 'harry', type: 'routine',
    title: 'Innebandy', place: 'Idrottshallen' },
  { id: 'e18', day: 4, start: '18:00', end: '20:00', who: 'family', type: 'routine',
    title: 'Fredagsmys', place: 'Hemma' },

  // ---- Dag 5 (lördag) ----
  { id: 'e19', day: 5, start: '08:45', end: '11:00', who: 'harry', type: 'special',
    title: 'Fotbollsmatch (borta)', place: 'Bortaplan (motståndarlaget)',
    details: { notes: 'Samling 08:45, avspark 09:30. Matchställ + vattenflaska.' } },
  { id: 'e20', day: 5, start: '08:30', end: '14:00', who: 'albert', type: 'special',
    title: 'Fotbollscup', place: 'Cupplanen',
    details: { notes: 'Tre matcher. Lunch serveras på plats.',
      links: [{ label: 'Spelschema cupen', url: 'https://example.com/mock/cup-spelschema' }] } },
  { id: 'e21', day: 5, start: '14:00', end: '16:00', who: 'georg', type: 'routine',
    title: 'Kalas hos klasskompis', place: 'Hos kompisen',
    details: { notes: 'Present är köpt – ligger i hallen.' } },

  // ---- Dag 6 (söndag) ----
  { id: 'e22', day: 6, start: '10:00', end: '11:00', who: 'albert', type: 'routine',
    title: 'Simning (extrapass)', place: 'Simhallen' },
  { id: 'e23', day: 6, start: '16:00', end: '19:00', who: 'family', type: 'routine',
    title: 'Middag hos farmor', place: 'Hos farmor' }
];

/* Highlights – endast saker som kräver uppmärksamhet. */
const HIGHLIGHT_KINDS = {
  prov:     { label: 'Prov',     icon: '📝' },
  packa:    { label: 'Packa',    icon: '🎒' },
  deadline: { label: 'Deadline', icon: '⏰' },
  logistik: { label: 'Logistik', icon: '🚗' },
  krock:    { label: 'Krock',    icon: '⚠️' }
};

const HIGHLIGHTS = [
  { id: 'h1', day: 1, kind: 'prov', who: ['albert'], events: ['e5'],
    title: 'Glosförhör engelska', text: 'Kapitel 3. Förhör gärna ikväll efter simningen.' },
  { id: 'h2', day: 3, kind: 'deadline', who: ['georg'], events: ['e11'],
    title: 'Anmälan skogsutflykt', text: 'Sista dag torsdag: lapp + 50 kr till fröken.' },
  { id: 'h3', day: 3, kind: 'logistik', who: ['harry'], events: ['e12', 'e13'],
    title: 'Tight byte fotboll → trummor', text: 'Fotbollen slutar 18:30, trumlektionen börjar 18:45 på annan plats. Skjuts direkt.' },
  { id: 'h4', day: 4, kind: 'packa', who: ['georg'], events: ['e15'],
    title: 'Packa för skogsutflykt', text: 'Matsäck, vattenflaska, regnkläder, stövlar, sittunderlag. Packa torsdag kväll.' },
  { id: 'h5', day: 5, kind: 'krock', who: ['harry', 'albert'], events: ['e19', 'e20'],
    title: 'Två skjutsar lördag morgon', text: 'Albert 08:30 och Harry 08:45 – olika platser. Vem kör vem?' }
];

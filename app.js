// Nasuvia Buchhaltung: Einnahmen, Ausgaben, Belege, MWST (effektive Methode) und Jahresabschluss.
(() => {
  'use strict';

  /* ================= Grunddaten ================= */
  // ziffer: wohin die Vorsteuer im MWST-Formular gehört (400 Material/Dienstleistungen, 405 Investitionen/übriger Aufwand)
  const KAT_AUS_STD = [
    { id: 'material', name: 'Material', ziffer: 400, satz: 8.1 },
    { id: 'fremd', name: 'Subunternehmer und Fremdarbeiten', ziffer: 400, satz: 8.1 },
    { id: 'werkzeug', name: 'Werkzeug und Kleingeräte', ziffer: 405, satz: 8.1 },
    { id: 'anschaffung', name: 'Anschaffungen (Geräte, Maschinen)', ziffer: 405, satz: 8.1 },
    { id: 'fahrzeug', name: 'Fahrzeug (Benzin, Service, Leasing)', ziffer: 405, satz: 8.1 },
    { id: 'telefon', name: 'Telefon und Internet', ziffer: 405, satz: 8.1 },
    { id: 'software', name: 'Software und Abos', ziffer: 405, satz: 8.1 },
    { id: 'buero', name: 'Miete und Büro', ziffer: 405, satz: 8.1 },
    { id: 'werbung', name: 'Werbung und Website', ziffer: 405, satz: 8.1 },
    { id: 'spesen', name: 'Spesen und Verpflegung', ziffer: 405, satz: 8.1 },
    { id: 'weiterbildung', name: 'Weiterbildung', ziffer: 405, satz: 8.1 },
    { id: 'versicherung', name: 'Versicherungen', ziffer: 405, satz: 0 },
    { id: 'bank', name: 'Bank- und Kartengebühren', ziffer: 405, satz: 0 },
    { id: 'gebuehren', name: 'Gebühren und Abgaben', ziffer: 405, satz: 0 },
    { id: 'loehne', name: 'Löhne', ziffer: 405, satz: 0 },
    { id: 'sozial', name: 'Sozialversicherungen und Vorsorge', ziffer: 405, satz: 0 },
    { id: 'fahrten', name: 'Fahrten (Kilometer)', ziffer: 405, satz: 0 },
    { id: 'uebrig', name: 'Übriges', ziffer: 405, satz: 8.1 },
    { id: 'steuern', name: 'Steuern (Gewinn und Kapital)', ziffer: 405, satz: 0, nurFirma: true },
  ];
  const KAT_EIN_STD = [
    { id: 'dienstleistung', name: 'Dienstleistungen', satz: 8.1 },
    { id: 'materialverkauf', name: 'Materialverkauf', satz: 8.1 },
    { id: 'uebrig-ein', name: 'Übrige Einnahmen', satz: 8.1 },
  ];
  // Eigene Kategorien: umbenennen, ausblenden, Farbe, neue hinzufügen (in den Einstellungen gespeichert)
  let KAT_AUS = KAT_AUS_STD, KAT_EIN = KAT_EIN_STD;
  const FARBEN = ['#0E7A55', '#0E9F6E', '#F5B53D', '#E5484D', '#6EE7A8', '#0B3B2E', '#14B8A6', '#A855F7', '#F97316', '#64748B', '#EC4899', '#84CC16', '#06B6D4', '#B7791F', '#7C8499', '#94A3B8'];
  function kategorienAnwenden() {
    const k = (Z.einst && Z.einst.kategorien) || {};
    const mischen = (std, eigene) => {
      const map = new Map(std.map((x, i) => [x.id, { ...x, farbe: FARBEN[i % FARBEN.length] }]));
      for (const e of eigene || []) if (e && e.id) map.set(e.id, { ...(map.get(e.id) || { ziffer: 405, satz: 8.1 }), ...e });
      return [...map.values()];
    };
    // Branche: passende Kategorien zusätzlich anbieten (vor „Übriges“)
    const br = window.Branchen ? Branchen.finde(Branchen.aktuell()) : null;
    const std = br && br.kat.length ? [...KAT_AUS_STD.slice(0, -2), ...br.kat.filter((x) => !KAT_AUS_STD.some((y) => y.id === x.id)), ...KAT_AUS_STD.slice(-2)] : KAT_AUS_STD;
    KAT_AUS = mischen(std, k.aus).map((x) => (x.nurFirma && !istFirma() ? { ...x, versteckt: true } : x));
    KAT_EIN = mischen(KAT_EIN_STD, k.ein);
  }
  const sichtbar = (liste, aktuell) => liste.filter((x) => !x.versteckt || x.id === aktuell);
  const katFarbe = (id) => ([...KAT_AUS, ...KAT_EIN].find((k) => k.id === id) || {}).farbe || '#7C8499';
  const SAETZE = [8.1, 2.6, 3.8, 0];
  const ZAHLUNG = ['Bank', 'Karte', 'TWINT', 'Bar'];
  const MONATE = ['Jan', 'Feb', 'Mär', 'Apr', 'Mai', 'Jun', 'Jul', 'Aug', 'Sep', 'Okt', 'Nov', 'Dez'];

  const ICON = {
    uebersicht: '<svg viewBox="0 0 24 24"><rect x="3" y="3" width="7" height="9" rx="1.5"/><rect x="14" y="3" width="7" height="5" rx="1.5"/><rect x="14" y="12" width="7" height="9" rx="1.5"/><rect x="3" y="16" width="7" height="5" rx="1.5"/></svg>',
    buchungen: '<svg viewBox="0 0 24 24"><path d="M4 6h16M4 12h16M4 18h10"/></svg>',
    mwst: '<svg viewBox="0 0 24 24"><path d="M19 5L5 19"/><circle cx="7" cy="7" r="2.5"/><circle cx="17" cy="17" r="2.5"/></svg>',
    abschluss: '<svg viewBox="0 0 24 24"><path d="M6 3h9l4 4v14H6z"/><path d="M14 3v5h5M9 13h7M9 17h7"/></svg>',
    auswertung: '<svg viewBox="0 0 24 24"><path d="M4 20V10M10 20V4M16 20v-7M22 20H2"/></svg>',
    liquiditaet: '<svg viewBox="0 0 24 24"><path d="M3 17l5-5 4 3 8-8"/><path d="M15 7h5v5"/><path d="M3 21h18"/></svg>',
    konten: '<svg viewBox="0 0 24 24"><rect x="3" y="4" width="18" height="16" rx="2"/><path d="M12 4v16M3 9h18M6 13h3M15 13h3M6 16h3M15 16h3"/></svg>',
    loehne: '<svg viewBox="0 0 24 24"><circle cx="9" cy="8" r="3.2"/><path d="M3 20a6 6 0 0 1 12 0"/><circle cx="17" cy="9" r="2.5"/><path d="M15.5 14.2A5 5 0 0 1 21 19"/></svg>',
    mehr: '<svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.7 1.7 0 0 0 .3 1.8l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.7 1.7 0 0 0-1.8-.3 1.7 1.7 0 0 0-1 1.5V21a2 2 0 1 1-4 0v-.1a1.7 1.7 0 0 0-1.1-1.5 1.7 1.7 0 0 0-1.8.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.7 1.7 0 0 0 .3-1.8 1.7 1.7 0 0 0-1.5-1H3a2 2 0 1 1 0-4h.1a1.7 1.7 0 0 0 1.5-1.1 1.7 1.7 0 0 0-.3-1.8l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.7 1.7 0 0 0 1.8.3H9a1.7 1.7 0 0 0 1-1.5V3a2 2 0 1 1 4 0v.1a1.7 1.7 0 0 0 1 1.5 1.7 1.7 0 0 0 1.8-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.7 1.7 0 0 0-.3 1.8V9a1.7 1.7 0 0 0 1.5 1H21a2 2 0 1 1 0 4h-.1a1.7 1.7 0 0 0-1.5 1z"/></svg>',
  };
  const ANSICHTEN = [
    ['uebersicht', 'Übersicht'], ['buchungen', 'Buchungen'], ['konten', 'Konten'], ['auswertung', 'Auswertung'], ['liquiditaet', 'Liquidität'], ['loehne', 'Löhne'], ['mwst', 'MWST'], ['abschluss', 'Abschluss'], ['mehr', 'Einstellungen'],
  ];
  // Konten nur mit doppelter Buchhaltung, Löhne nur in Paketen mit Lohn
  const ansichten = () => ANSICHTEN.filter(([id]) => (id !== 'konten' || doppeltAktiv()) && (id !== 'loehne' || lohnErlaubt()));
  const KURZ = { liquiditaet: 'Geld', uebersicht: 'Start', buchungen: 'Buchen', konten: 'Konten', auswertung: 'Grafik', mwst: 'MWST', abschluss: 'Abschluss', mehr: 'Mehr' };

  /* ================= Hilfen ================= */
  const $ = (id) => document.getElementById(id);
  const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const zahl = new Intl.NumberFormat('de-CH', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  const chf = (r) => zahl.format((r || 0) / 100);
  const chfVoll = (r) => 'CHF ' + chf(r);
  const heute = () => new Date().toLocaleDateString('sv-SE');
  const datumKurz = (d) => (d ? d.slice(8, 10) + '.' + d.slice(5, 7) + '.' + d.slice(0, 4) : '');
  const quartalVon = (d) => Math.floor((Number(d.slice(5, 7)) - 1) / 3) + 1;
  const katAus = (id) => KAT_AUS.find((k) => k.id === id) || KAT_AUS.find((k) => k.id === 'uebrig') || KAT_AUS[0];
  const katName = (b) => (b.typ === 'ausgabe' ? katAus(b.kategorie).name : (KAT_EIN.find((k) => k.id === b.kategorie) || KAT_EIN[0]).name);
  const netto = (b) => (b.betragRappen || 0) - (b.mwstRappen || 0);
  const mwstAus = (brutto, satz) => Math.round(brutto * satz / (100 + satz));

  function betragLesen(text) {
    let t = String(text || '').trim().replace(/[’'\s]/g, '').replace(/^CHF/i, '');
    if (/,\d{1,2}$/.test(t)) t = t.replace(/\./g, '').replace(',', '.');
    t = t.replace(/,/g, '');
    const n = Number(t);
    return Number.isFinite(n) ? Math.round(n * 100) : NaN;
  }

  function toast(text) {
    const t = $('toast');
    t.textContent = text;
    t.classList.add('zeigen');
    clearTimeout(toast.z);
    toast.z = setTimeout(() => t.classList.remove('zeigen'), 2600);
  }

  function herunterladen(name, inhalt, typ) {
    const blob = inhalt instanceof Blob ? inhalt : new Blob([inhalt], { type: typ });
    const datei = new File([blob], name, { type: blob.type });
    if (navigator.canShare && /iPhone|iPad/.test(navigator.userAgent) && navigator.canShare({ files: [datei] })) {
      navigator.share({ files: [datei] }).catch(() => {});
      return;
    }
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = name;
    document.body.appendChild(a);
    a.click();
    setTimeout(() => { URL.revokeObjectURL(a.href); a.remove(); }, 1000);
  }

  function dateiWaehlen(accept) {
    return new Promise((ok) => {
      const inp = $('dateiWahl');
      inp.value = '';
      inp.accept = accept;
      inp.onchange = () => ok(inp.files[0] || null);
      inp.click();
    });
  }

  /* ================= Zustand ================= */
  const Z = {
    buchungen: [],
    einst: { id: 'haupt', abrechnung: 'vereinbart' },
    ansicht: 'uebersicht',
    jahr: String(new Date().getFullYear()),
    quartal: quartalVon(heute()),
    filter: { typ: 'alle', monat: '', kat: '', suche: '' },
    stichtag: '',
    lohnMonat: new Date().toLocaleDateString('sv-SE').slice(0, 7),
    journal: [],
    kontenTab: 'journal',
    journalFilter: { art: 'alle', suche: '' },
    alleKonten: false,
  };
  try { const a = new URLSearchParams(location.search).get('ansicht') || localStorage.getItem('nb.ansicht'); if (a && ANSICHTEN.some(([id]) => id === a)) Z.ansicht = a; } catch {}

  async function laden() {
    Z.buchungen = await Speicher.alle('buchungen');
    Z.journal = await Speicher.alle('journal');
    const e = await Speicher.holen('einstellungen', 'haupt');
    if (e) Z.einst = { ...Z.einst, ...e };
    kategorienAnwenden();
  }
  // Stunden aus der Zeiterfassung: werden beim Mitarbeiter mit gleichem Namen und Stundenlohn eingetragen
  async function stundenAusZeiterfassung() {
    let ze = null;
    try { ze = JSON.parse(sessionStorage.getItem('ordasio.zeit.lohn') || 'null'); sessionStorage.removeItem('ordasio.zeit.lohn'); } catch {}
    if (!ze || !ze.monat || !ze.stunden) return;
    const norm = (s) => String(s || '').trim().toLowerCase().replace(/\s+/g, ' ');
    const laeufe = { ...(Z.einst.lohnlaeufe || {}) };
    const monat = { ...(laeufe[ze.monat] || {}) };
    const fehlt = [], ohneStd = [];
    let n = 0;
    for (const [name, h] of Object.entries(ze.stunden)) {
      const m = (Z.einst.mitarbeiter || []).find((x) => norm(x.name) === norm(name) && x.aktiv !== false);
      if (!m) { fehlt.push(name); continue; }
      if (m.lohnart !== 'stunde') { ohneStd.push(name); continue; }
      monat[m.id] = { ...(monat[m.id] || {}), stunden: h }; n++;
    }
    laeufe[ze.monat] = monat;
    if (n) await einstSpeichern({ lohnlaeufe: laeufe });
    Z.lohnMonat = ze.monat; Z.ansicht = 'loehne';
    const teile = [n ? `Stunden für ${n} ${n === 1 ? 'Mitarbeiter' : 'Mitarbeiter'} übernommen.` : 'Keine Stunden übernommen.'];
    if (fehlt.length) teile.push(`Nicht in den Löhnen erfasst: ${fehlt.join(', ')}.`);
    if (ohneStd.length) teile.push(`Mit Monatslohn (keine Stunden nötig): ${ohneStd.join(', ')}.`);
    setTimeout(() => toast(teile.join(' ')), 400);
  }
  async function einstSpeichern(teil) {
    Z.einst = await Speicher.speichern('einstellungen', { ...Z.einst, ...teil, id: 'haupt' });
    kategorienAnwenden();
  }

  const jahre = () => {
    const s = new Set(Z.buchungen.map((b) => (b.datum || '').slice(0, 4)).filter(Boolean));
    s.add(String(new Date().getFullYear()));
    return [...s].sort().reverse();
  };
  const imJahr = (j) => Z.buchungen.filter((b) => (b.datum || '').startsWith(j));
  const sortiert = (l) => [...l].sort((a, b) => (b.datum || '').localeCompare(a.datum || '') || (b.geaendert || '').localeCompare(a.geaendert || ''));
  const istOffen = (b) => b.typ === 'einnahme' && b.quelle === 'rechnung' && !b.bezahlt;

  /* ================= Rechtsform und doppelte Buchhaltung ================= */
  // In der Verkaufsversion kommt die Rechtsform aus der Lizenz, sonst aus den Einstellungen
  const O = window.ORDASIO, D = window.Doppelt;
  const lizenzJetzt = () => window.NASUVIA_LIZENZ || null;
  // Zusatzpaket Finanzen Plus (Fremdwährungen, Liquiditätsvorschau); ohne Lizenz (eigene Nutzung) offen
  const finanzenErlaubt = () => { const l = lizenzJetzt(); return !O || !l || !O.darf || O.darf(l, 'finanzen'); };
  // Projekte (Zusatzpaket Projekte & Lager) als Kostenstellen beim Buchen
  const projekteListe = () => { const l = lizenzJetzt(); if (O && l && O.darf && !O.darf(l, 'projekte')) return []; try { return JSON.parse(localStorage.getItem('ordasio.projekte') || '[]') || []; } catch { return []; } };
  const WAEHRUNGEN = ['EUR', 'USD', 'GBP', 'JPY', 'SEK', 'NOK', 'DKK', 'PLN', 'CZK', 'CAD', 'AUD'];
  const kursCache = {};
  async function kursHolen(w, datum) {
    const k = w + datum; if (kursCache[k]) return kursCache[k];
    const tag = datum && datum < heute() ? datum : 'latest';
    const r = await fetch(`https://api.frankfurter.app/${tag}?from=${w}&to=CHF`);
    if (!r.ok) throw new Error('Kurs nicht erreichbar');
    const j = await r.json(); const kurs = j && j.rates && j.rates.CHF;
    if (!kurs) throw new Error('Kurs nicht gefunden');
    return (kursCache[k] = { kurs, am: j.date });
  }
  function rechtsform() {
    const l = lizenzJetzt();
    const gueltig = (r) => !!r && r !== 'privat' && (O ? !!O.RECHTSFORMEN[r] : ['einzel', 'gmbh', 'ag'].includes(r));
    if (l && gueltig(l.rechtsform)) return l.rechtsform;
    return gueltig(Z.einst.rechtsform) ? Z.einst.rechtsform : 'einzel';
  }
  // Firma = juristische Person (Gewinnreserven, Steuern); Personenunternehmen haben ein Privatkonto
  const istFirma = () => (D ? !D.person(rechtsform()) : rechtsform() !== 'einzel');
  const doppeltPflicht = () => (O ? O.doppelt(rechtsform()) : istFirma());
  const kapitalName = () => ((O && O.RECHTSFORMEN[rechtsform()]) || {}).kapital || '';
  const doppeltAktiv = () => !!D && (doppeltPflicht() || !!Z.einst.doppelt);
  const lohnErlaubt = () => { const l = lizenzJetzt(); return !O || !l || O.darf(l, 'lohn'); };
  const kontenplan = () => D.kontenplan(rechtsform(), Z.einst.konten || []);
  const katKonto = (b) => D.kategorieKonto(Z.einst, b.typ, b.kategorie);
  const kontoText = (nr) => `${nr} ${D.nameVon(kontenplan(), nr)}`;
  const festBis = () => Z.einst.festBis || '';
  const istFest = (datum) => !!festBis() && !!datum && datum <= festBis();
  const eintraege = () => D.journalAus({ buchungen: Z.buchungen, journal: Z.journal, einst: Z.einst, rechtsform: rechtsform() });
  // Anschaffungen werden mit doppelter Buchhaltung aktiviert und zählen nicht als Aufwand
  const erfolgswirksam = (b) => !doppeltAktiv() || D.istErfolgskonto(katKonto(b));
  const firmenName = () => ((lizenzJetzt() || {}).firma) || ((window.Marke && Marke.daten && Marke.daten()) || {}).name || '';

  /* ================= Navigation ================= */
  // Zurück-Knopf: innerhalb der Buchhaltung zuerst die vorherige Ansicht
  const ansichtVorher = [];
  const ANS_NAME = { uebersicht: 'Übersicht', buchungen: 'Buchungen', konten: 'Konten', auswertung: 'Auswertung', liquiditaet: 'Liquidität', loehne: 'Löhne', mwst: 'MWST', abschluss: 'Abschluss', mehr: 'Einstellungen' };
  window.OrdasioZurueck = window.OrdasioZurueck || {};
  window.OrdasioZurueck.kannIntern = () => (ansichtVorher.length ? ANS_NAME[ansichtVorher[ansichtVorher.length - 1]] || 'zurück' : Z.ansicht !== 'uebersicht' ? 'Übersicht' : false);
  window.OrdasioZurueck.intern = () => {
    if (document.querySelector('dialog[open]')) { document.querySelector('dialog[open]').close(); return true; }
    if (!ansichtVorher.length && Z.ansicht === 'uebersicht') return false;
    Z.ansicht = ansichtVorher.pop() || 'uebersicht';
    try { localStorage.setItem('nb.ansicht', Z.ansicht); } catch {}
    zeichnen(); window.scrollTo(0, 0); return true;
  };
  function navZeichnen() {
    if (!ansichten().some(([id]) => id === Z.ansicht)) Z.ansicht = 'uebersicht';
    $('navPc').innerHTML = ansichten().map(([id, name]) =>
      `<button class="nav-knopf ${Z.ansicht === id ? 'aktiv' : ''}" data-ansicht="${id}">${ICON[id]}${name}</button>`).join('');
    $('navHandy').innerHTML = ansichten().filter(([id]) => id !== 'loehne' && id !== 'liquiditaet' && !(id === 'auswertung' && doppeltAktiv())).map(([id, name]) =>
      `<button class="${Z.ansicht === id ? 'aktiv' : ''}" data-ansicht="${id}">${ICON[id]}${KURZ[id] || name}</button>`).join('');
  }
  document.addEventListener('click', (e) => {
    const k = e.target.closest('[data-ansicht]');
    if (!k) return;
    if (k.dataset.ansicht !== Z.ansicht) { ansichtVorher.push(Z.ansicht); if (ansichtVorher.length > 20) ansichtVorher.shift(); }
    Z.ansicht = k.dataset.ansicht;
    if (window.OrdasioZurueck && OrdasioZurueck.aktualisieren) OrdasioZurueck.aktualisieren();
    try { localStorage.setItem('nb.ansicht', Z.ansicht); } catch {}
    zeichnen();
    window.scrollTo(0, 0);
  });
  $('fab').addEventListener('click', () => buchungBearbeiten());

  function jahrWahl() {
    return `<select class="auswahl-klein" data-jahr>${jahre().map((j) => `<option ${j === Z.jahr ? 'selected' : ''}>${j}</option>`).join('')}</select>`;
  }
  document.addEventListener('change', (e) => {
    if (e.target.matches('[data-jahr]')) { Z.jahr = e.target.value; zeichnen(); }
  });

  function zeichnen() {
    navZeichnen();
    const f = { uebersicht: uebersicht, buchungen: buchungenAnsicht, konten: kontenAnsicht, auswertung: auswertung, liquiditaet: liquiditaet, loehne: loehneAnsicht, mwst: mwstAnsicht,
      abschluss: doppeltAktiv() ? abschlussDoppelt : abschluss, mehr: mehr }[Z.ansicht];
    $('inhalt').innerHTML = f();
    statusZeigen();
  }

  function statusText() {
    if (!window.Abgleich || !Abgleich.benutzer) return 'Nur auf diesem Gerät gespeichert';
    if (Abgleich.laeuft) return 'Wird abgeglichen …';
    if (Abgleich.fehler) return Abgleich.fehler;
    const z = Abgleich.zuletzt;
    return z ? `Abgeglichen um ${new Date(z).toLocaleTimeString('de-CH', { hour: '2-digit', minute: '2-digit' })}` : 'Angemeldet';
  }

  function statusZeigen() {
    const offen = Z.buchungen.filter(istOffen).length;
    $('speicherInfo').innerHTML = `${Z.buchungen.length} Buchungen${offen ? `, ${offen} offen` : ''}<br>${esc(statusText())}`;
    const s = document.querySelector('[data-abgleich-status]');
    if (s) s.textContent = statusText();
  }

  /* ================= Übersicht ================= */
  function summen(liste) {
    let ein = 0, aus = 0;
    for (const b of liste) {
      if (!erfolgswirksam(b)) continue;
      if (b.typ === 'einnahme') ein += netto(b); else aus += netto(b);
    }
    return { ein, aus, gewinn: ein - aus };
  }

  /* ---------- Rückfragen vom Treuhänder ---------- */
  Z.fragen = [];
  async function fragenLaden() {
    const sb = window.NASUVIA_SB; if (!sb) return;
    try {
      const { data: { session } } = await sb.auth.getSession(); if (!session) return;
      const { data } = await sb.from('tr_rueckfragen').select('*').eq('kunde', session.user.id).eq('status', 'offen').order('erstellt');
      const vorher = Z.fragen.length; Z.fragen = data || [];
      if (Z.fragen.length || vorher) zeichnen();
    } catch { /* ohne Netz: später */ }
  }
  function fragenKarte() {
    if (!Z.fragen.length) return '';
    return `<div class="card abstand-unten" style="border:1px solid rgba(183,121,31,.35)"><h2>Fragen von Ihrem Treuhänder (${Z.fragen.length})</h2>
      ${Z.fragen.map((f) => `<div style="padding:10px 0;border-top:1px solid var(--linie)"><p class="hinweis">${esc(f.treuhaender_email || 'Treuhänder')}${f.bezug ? ' · ' + esc(f.bezug) : ''}</p>
        <p style="margin:4px 0 8px"><b>${esc(f.frage)}</b></p>
        <textarea data-frage-text="${f.id}" rows="2" placeholder="Ihre Antwort" style="width:100%"></textarea>
        <div style="display:flex;gap:8px;flex-wrap:wrap;margin-top:6px"><button class="btn btn-haupt btn-klein" data-frage-antwort="${f.id}">Antworten</button>${f.buchung_id && Z.buchungen.some((b) => b.id === f.buchung_id) ? `<button class="btn btn-klein" data-frage-buchung="${esc(f.buchung_id)}">Buchung öffnen</button>` : ''}</div></div>`).join('')}</div>`;
  }
  document.addEventListener('click', async (e) => {
    const a = e.target.closest('[data-frage-antwort]');
    if (a) {
      const t = document.querySelector(`[data-frage-text="${a.dataset.frageAntwort}"]`), text = t ? t.value.trim() : '';
      if (!text) { if (t) t.focus(); toast('Bitte eine Antwort schreiben'); return; }
      a.disabled = true;
      const { error } = await window.NASUVIA_SB.rpc('tr_frage_beantworten', { p_id: a.dataset.frageAntwort, p_antwort: text });
      if (error) { a.disabled = false; toast(error.message); return; }
      Z.fragen = Z.fragen.filter((f) => f.id !== a.dataset.frageAntwort); zeichnen(); toast('✓ Antwort gesendet');
    }
    const bu = e.target.closest('[data-frage-buchung]');
    if (bu) { const b = Z.buchungen.find((x) => x.id === bu.dataset.frageBuchung); if (b) buchungBearbeiten(b); }
  });
  document.addEventListener('ordasio-lizenz', () => fragenLaden());

  /* ================= Liquidität (Finanzen Plus) ================= */
  const tagePlus = (d, n) => { const x = new Date(d + 'T12:00'); x.setDate(x.getDate() + n); return x.toLocaleDateString('sv-SE'); };
  const monatPlus = (d, n) => { const x = new Date(d + 'T12:00'); const t = x.getDate(); x.setDate(1); x.setMonth(x.getMonth() + n); x.setDate(Math.min(t, new Date(x.getFullYear(), x.getMonth() + 1, 0).getDate())); return x.toLocaleDateString('sv-SE'); };
  // Wiederkehrende Zahlungen der letzten 6 Monate erkennen: gleicher Partner/Kategorie, in mind. 2 Monaten, ähnlicher Betrag
  function wiederkehrend() {
    const seit = tagePlus(heute(), -185), gruppen = {};
    for (const b of Z.buchungen) {
      if (b.geloescht || b.datum < seit || b.quelle === 'rechnung' || b.zahlung === 'Bar') continue;
      const k = b.typ + '|' + (b.partner || '').toLowerCase().trim() + '|' + b.kategorie;
      (gruppen[k] = gruppen[k] || []).push(b);
    }
    const aus = [];
    for (const liste of Object.values(gruppen)) {
      const monate = new Set(liste.map((b) => b.datum.slice(0, 7)));
      if (monate.size < 2) continue;
      liste.sort((a, b) => a.datum.localeCompare(b.datum));
      const betraege = liste.map((b) => b.betragRappen).sort((a, b) => a - b), mitte = betraege[Math.floor(betraege.length / 2)];
      if (betraege.some((x) => Math.abs(x - mitte) > mitte * 0.25)) continue;
      // Rhythmus: monatlich, oder alle 3 Monate
      const schritt = monate.size >= 3 || liste.length >= 3 ? 1 : 3;
      const letzte = liste[liste.length - 1];
      const proMonat = liste.length / Math.max(1, monate.size);
      aus.push({ b: letzte, betrag: Math.round(mitte * Math.max(1, Math.round(proMonat))), schritt, typ: letzte.typ, text: letzte.partner || letzte.text || katName(letzte) });
    }
    return aus;
  }
  function liquiPlan() {
    const start = Z.einst.liquiStand || null, h = heute(), ende = tagePlus(h, 7 * 12), posten = [];
    // offene Rechnungen: am Fälligkeitstag (überfällige diese Woche)
    for (const b of Z.buchungen.filter(istOffen)) {
      const f = b.faellig || tagePlus(b.datum, 30);
      posten.push({ datum: f < h ? h : f, betrag: b.betragRappen, text: `Rechnung ${b.rechnungNr || ''} ${b.partner || ''}`.trim(), quelle: f < h ? 'überfällig' : 'Rechnung' });
    }
    for (const w of wiederkehrend()) {
      let d = monatPlus(w.b.datum, w.schritt);
      while (d <= ende) { if (d >= h) posten.push({ datum: d, betrag: w.typ === 'einnahme' ? w.betrag : -w.betrag, text: w.text, quelle: 'wiederkehrend' }); d = monatPlus(d, w.schritt); }
    }
    // MWST: laufendes Quartal, fällig 60 Tage nach Quartalsende
    if (Z.einst.mwstPflicht !== false) {
      const j = h.slice(0, 4), q = quartalVon(h), mw = mwstRechnen(j, q), qEnde = `${j}-${String(q * 3).padStart(2, '0')}-${q === 1 || q === 4 ? '31' : '30'}`;
      const faellig = tagePlus(qEnde, 60);
      if (mw.zahlen > 0 && faellig <= ende) posten.push({ datum: faellig, betrag: -mw.zahlen, text: `MWST ${q}. Quartal ${j} (Schätzung)`, quelle: 'MWST' });
    }
    for (const g of (Z.einst.liquiGeplant || [])) if (g.datum >= h && g.datum <= ende) posten.push({ datum: g.datum, betrag: g.betragRappen, text: g.text, quelle: 'geplant', id: g.id });
    posten.sort((a, b) => a.datum.localeCompare(b.datum));
    let stand = start ? start.betragRappen : 0;
    const wochen = Array.from({ length: 12 }, (_, i) => ({ von: tagePlus(h, i * 7), bis: tagePlus(h, i * 7 + 6), ein: 0, aus: 0, stand: 0 }));
    for (const p of posten) { const w = wochen.find((x) => p.datum >= x.von && p.datum <= x.bis); if (w) { if (p.betrag > 0) w.ein += p.betrag; else w.aus -= p.betrag; } }
    for (const w of wochen) { stand += w.ein - w.aus; w.stand = stand; }
    return { start, posten, wochen, tiefst: Math.min(...wochen.map((w) => w.stand)), reserve: Number(Z.einst.liquiReserve) || 0 };
  }
  function liquiditaet() {
    const gesperrt = !finanzenErlaubt();
    const p = liquiPlan(), st = p.start;
    const posMax = Math.max(0, ...p.wochen.map((w) => w.stand)), negMax = Math.max(0, ...p.wochen.map((w) => -w.stand)), max = Math.max(1, posMax + negMax);
    const obenPct = negMax ? posMax / max * 100 : 100;
    const knapp = st && p.wochen.find((w) => w.stand < p.reserve);
    const balken = p.wochen.map((w, i) => `<div class="lq-woche" title="Woche ab ${datumKurz(w.von)}: + ${chf(w.ein)} / − ${chf(w.aus)} → ${chf(w.stand)}">
        <div class="lq-saeule"><div class="lq-oben" style="height:${obenPct}%">${w.stand >= 0 ? `<i class="${w.stand < p.reserve ? 'knapp' : ''}" style="height:${Math.max(2, w.stand / Math.max(1, posMax) * 100)}%"></i>` : ''}</div><div class="lq-unten">${w.stand < 0 ? `<i class="minus" style="height:${Math.max(2, -w.stand / Math.max(1, negMax) * 100)}%"></i>` : ''}</div></div><span>${i === 0 ? 'jetzt' : datumKurz(w.von).slice(0, 5)}</span></div>`).join('');
    const QF = { Rechnung: 'marke-ok', 'überfällig': 'marke-offen', wiederkehrend: 'marke-info', MWST: 'marke-info', geplant: 'marke-info' };
    const inhalt = `
      <div class="card abstand-unten">
        <div class="lq-stand">
          <div><div class="label">Kontostand${st ? ' vom ' + datumKurz(st.datum) : ''}</div><div class="wert" style="font-size:1.9rem;font-weight:800">${st ? chf(st.betragRappen) + ' <span class="klein">CHF</span>' : '—'}</div>
            <p class="hinweis">${st ? 'Wird beim nächsten Bankauszug automatisch aktualisiert.' : 'Tragen Sie Ihren Kontostand ein oder laden Sie einen Bankauszug mit Saldo.'}</p></div>
          <div class="kopf-aktionen"><button class="btn ${st ? '' : 'btn-haupt'}" data-lq-stand>${st ? 'Kontostand ändern' : 'Kontostand eintragen'}</button><button class="btn" data-lq-plan>+ Geplante Zahlung</button><button class="btn" data-lq-reserve>Reserve: ${chf(p.reserve)}</button></div>
        </div>
      </div>
      ${st ? `<div class="card abstand-unten ${knapp ? 'lq-warnung' : 'lq-gut'}"><b>${knapp ? `⚠️ Achtung: In der Woche ab ${datumKurz(knapp.von)} fällt der Kontostand auf ${chf(knapp.stand)} CHF.` : `✓ Ihr Geld reicht: tiefster Stand in 12 Wochen ${chf(p.tiefst)} CHF.`}</b>
        ${knapp ? '<p class="hinweis" style="margin-top:4px">Tipp: Offene Rechnungen jetzt erinnern, grosse Ausgaben verschieben oder Reserve auflösen.</p>' : ''}</div>` : ''}
      <div class="card abstand-unten"><h2>Kontostand der nächsten 12 Wochen</h2><div class="lq-balken">${balken}</div>
        <div class="legende"><span><i style="background:var(--elektrik)"></i>genug</span><span><i style="background:#F59E0B"></i>unter Reserve</span><span><i style="background:var(--rot,#E5484D)"></i>im Minus</span></div></div>
      <div class="card"><h2>Was kommt</h2>
        ${p.posten.length ? `<div class="liste">${p.posten.map((x) => `<div class="zeile lq-zeile"><div class="datum">${datumKurz(x.datum)}</div><div style="min-width:0"><div class="titel">${esc(x.text)}</div><div class="info"><span class="nur-handy-datum">${datumKurz(x.datum)}</span><span class="marke ${QF[x.quelle] || 'marke-info'}">${esc(x.quelle)}</span>${x.id ? `<button class="link" data-lq-weg="${x.id}">entfernen</button>` : ''}</div></div><div class="betrag ${x.betrag > 0 ? 'plus' : ''}">${x.betrag > 0 ? '+' : '−'} ${chf(Math.abs(x.betrag))}</div></div>`).join('')}</div>`
          : '<p class="leer">Noch nichts geplant. Offene Rechnungen, wiederkehrende Zahlungen und MWST erscheinen hier automatisch.</p>'}
        <p class="hinweis abstand">Ordasio rechnet mit: offenen Rechnungen (am Fälligkeitstag), wiederkehrenden Zahlungen der letzten 6 Monate (Miete, Löhne, Abos), der MWST des laufenden Quartals und Ihren geplanten Zahlungen.</p></div>`;
    return `<div class="kopf"><div><h1>Liquidität</h1><p class="unter">Reicht das Geld? Vorschau auf 12 Wochen</p></div></div>
      ${gesperrt ? `${window.OrdasioZusatz ? OrdasioZusatz.karte('finanzen', { grund: 'Sehen Sie Wochen im Voraus, ob das Geld reicht: Kontostand, offene Rechnungen, Löhne, Miete und MWST in einer Vorschau.' }) : ''}<div class="lq-vorschau" aria-hidden="true">${inhalt}</div>` : inhalt}`;
  }
  document.addEventListener('click', async (e) => {
    const t = e.target;
    if (t.closest('[data-lq-stand]')) {
      const v = await UI.eingabe('Aktueller Kontostand in CHF (Geschäftskonto)', { vorgabe: Z.einst.liquiStand ? (Z.einst.liquiStand.betragRappen / 100).toFixed(2) : '' });
      if (v === null) return; const r = betragLesen(v); if (!Number.isFinite(r)) { toast('Bitte einen Betrag eingeben'); return; }
      await einstSpeichern({ liquiStand: { betragRappen: r, datum: heute(), quelle: 'hand' } }); zeichnen();
    }
    if (t.closest('[data-lq-reserve]')) {
      const v = await UI.eingabe('Mindestreserve in CHF: darunter warnt Ordasio', { vorgabe: Z.einst.liquiReserve ? (Z.einst.liquiReserve / 100).toFixed(2) : '0' });
      if (v === null) return; const r = betragLesen(v); await einstSpeichern({ liquiReserve: Number.isFinite(r) ? Math.max(0, r) : 0 }); zeichnen();
    }
    if (t.closest('[data-lq-plan]')) {
      const text = await UI.eingabe('Was ist geplant? (z. B. Leasing Fahrzeug, Steuern, Auftrag Müller)'); if (!text) return;
      const v = await UI.eingabe('Betrag in CHF. Ausgabe mit Minus, z. B. -2500'); if (v === null) return;
      const r = betragLesen(String(v).replace(/^\s*−/, '-')); if (!Number.isFinite(r) || !r) { toast('Bitte einen Betrag eingeben'); return; }
      const d = await UI.eingabe('Datum (TT.MM.JJJJ)', { vorgabe: datumKurz(tagePlus(heute(), 14)) }); if (!d) return;
      const m = String(d).match(/(\d{1,2})\.(\d{1,2})\.(\d{4})/); if (!m) { toast('Datum bitte als TT.MM.JJJJ'); return; }
      const datum = `${m[3]}-${m[2].padStart(2, '0')}-${m[1].padStart(2, '0')}`;
      const neg = /^\s*[-−]/.test(String(v));
      await einstSpeichern({ liquiGeplant: [...(Z.einst.liquiGeplant || []), { id: 'g' + Date.now(), text: text.trim(), betragRappen: neg ? -Math.abs(r) : Math.abs(r), datum }] }); zeichnen();
    }
    const w = t.closest('[data-lq-weg]');
    if (w) { await einstSpeichern({ liquiGeplant: (Z.einst.liquiGeplant || []).filter((g) => g.id !== w.dataset.lqWeg) }); zeichnen(); }
  });

  /* ---------- Fristen-Autopilot: Schweizer Termine für KMU, je nach Rechtsform und Mitarbeitenden ---------- */
  function fristenListe() {
    const h = heute(), bis = tagePlus(h, 370), j = Number(h.slice(0, 4)), aus = [];
    const add = (datum, titel, info, art, ziel) => { if (datum >= h && datum <= bis) aus.push({ datum, titel, info, art, ziel }); };
    const mitLohn = lohnErlaubt() && ((Z.einst.mitarbeiter || []).length > 0 || Z.buchungen.some((b) => b.lohnMonat));
    const firma = ['gmbh', 'ag', 'genossenschaft'].includes(rechtsform());
    for (const jahr of [j - 1, j, j + 1]) {
      if (Z.einst.mwstPflicht !== false) for (const q of [1, 2, 3, 4]) add(fristVon(String(jahr), q), `MWST ${q}. Quartal ${jahr}`, 'Abrechnung bei der ESTV einreichen und bezahlen', 'mwst', 'mwst');
      if (mitLohn) {
        add(`${jahr}-01-31`, `Lohnausweise ${jahr - 1}`, 'An Mitarbeitende abgeben, Lohnsummen an AHV, UVG, BVG und KTG melden', 'lohn', 'loehne');
        for (const m of ['03-31', '06-30', '09-30', '12-31']) add(`${jahr}-${m}`, 'AHV-Akontobeiträge', 'Rechnung der Ausgleichskasse bis Quartalsende bezahlen', 'lohn', 'loehne');
      }
      add(`${jahr}-03-31`, `Steuererklärung ${jahr - 1}`, firma ? 'Für die Firma; viele Kantone verlängern auf Gesuch' : 'Private Steuererklärung mit Geschäftsabschluss; Frist je nach Kanton', 'steuer', 'abschluss');
      if (firma) add(`${jahr}-06-30`, `Jahresrechnung ${jahr - 1} genehmigen`, 'Generalversammlung bzw. Gesellschafterversammlung innert 6 Monaten (OR 699/805)', 'abschluss', 'abschluss');
      add(`${jahr}-01-15`, `Jahresabschluss ${jahr - 1} beginnen`, 'Bankauszüge bis 31.12., Belege, Kasse und Debitoren prüfen', 'abschluss', 'abschluss');
    }
    return aus.sort((a, b) => a.datum.localeCompare(b.datum));
  }
  const FRIST_IC = { mwst: '🧾', lohn: '💸', steuer: '🏛️', abschluss: '📘' };
  const tageBisText = (d) => { const n = Math.round((new Date(d + 'T12:00') - new Date(heute() + 'T12:00')) / 864e5); return n === 0 ? 'heute' : n === 1 ? 'morgen' : `in ${n} Tagen`; };
  function fristenKarte() {
    const l = fristenListe().slice(0, 3); if (!l.length) return '';
    return `<div class="card abstand-unten"><div class="ja-kopf"><h2 style="margin:0">Nächste Fristen</h2><button class="btn klein" data-fristen>Alle Fristen</button></div>
      ${l.map((f) => `<div class="ja-zeile"><span style="font-size:20px">${FRIST_IC[f.art] || '📌'}</span><div class="ja-text"><b>${esc(f.titel)}</b><small>${datumKurz(f.datum)} · ${tageBisText(f.datum)} · ${esc(f.info)}</small></div></div>`).join('')}</div>`;
  }
  async function fristenDialog() {
    const l = fristenListe();
    const dlg = document.createElement('dialog');
    dlg.innerHTML = `<form method="dialog" style="width:min(640px,calc(100vw - 24px))"><div class="dlg-kopf"><h3>Fristen der nächsten 12 Monate</h3><button class="x" value="zu" aria-label="Schliessen">×</button></div>
      <div class="dlg-inhalt"><p class="hinweis">Je nach Rechtsform, MWST und Mitarbeitenden. Kantonale Steuerfristen können abweichen.</p>
      ${l.map((f) => `<div class="ja-zeile"><span style="font-size:20px">${FRIST_IC[f.art] || '📌'}</span><div class="ja-text"><b>${esc(f.titel)}</b><small>${datumKurz(f.datum)} · ${tageBisText(f.datum)} · ${esc(f.info)}</small></div></div>`).join('')}</div>
      <div class="dlg-fuss"><div class="rechts">${window.NASUVIA_SB ? '<button type="button" class="btn btn-haupt" data-fristen-handy>Alle als Erinnerung aufs Handy</button>' : ''}<button class="btn" value="zu">Schliessen</button></div></div></form>`;
    document.body.appendChild(dlg); dlg.addEventListener('close', () => dlg.remove()); dlg.showModal();
    const k = dlg.querySelector('[data-fristen-handy]');
    if (k) k.onclick = async () => {
      const sb = window.NASUVIA_SB; k.disabled = true;
      const { data: da } = await sb.from('erinnerungen').select('titel,wann').eq('erledigt', false).limit(500);
      const gibts = new Set((da || []).map((x) => x.titel + '|' + String(x.wann).slice(0, 10)));
      // Erinnerung 7 Tage vor der Frist, ganztägig
      const neu = l.map((f) => ({ titel: `Frist: ${f.titel} (${datumKurz(f.datum)})`, wann: tagePlus(f.datum, -7) + 'T08:00:00+01:00', ganztag: true, wiederholung: 'nie', vorher_min: 0, notiz: f.info, bereich: '/?bereich=buchhaltung' }))
        .filter((x) => !gibts.has(x.titel + '|' + x.wann.slice(0, 10)));
      if (neu.length) { const { error } = await sb.from('erinnerungen').insert(neu); if (error) { k.disabled = false; UI.hinweis(error.message); return; } }
      dlg.close(); UI.hinweis(neu.length ? `✓ ${neu.length} Fristen eingetragen. Ordasio erinnert Sie jeweils eine Woche vorher, mit verbundenem Kalender auch auf dem Handy.` : 'Alle Fristen sind schon eingetragen.');
    };
  }
  document.addEventListener('click', (e) => { if (e.target.closest('[data-fristen]')) fristenDialog(); });

  function uebersicht() {
    const liste = imJahr(Z.jahr);
    const s = summen(liste);
    const offen = Z.buchungen.filter(istOffen);
    const offenSumme = offen.reduce((a, b) => a + b.betragRappen, 0);
    const ohneBeleg = liste.filter((b) => b.typ === 'ausgabe' && !b.belegId).length;

    // Monatsbalken (netto)
    const m = Array.from({ length: 12 }, () => ({ ein: 0, aus: 0 }));
    for (const b of liste) {
      const i = Number(b.datum.slice(5, 7)) - 1;
      if (b.typ === 'einnahme') m[i].ein += netto(b); else m[i].aus += netto(b);
    }
    const max = Math.max(1, ...m.map((x) => Math.max(x.ein, x.aus)));
    const balken = m.map((x, i) => `<div class="balken-monat" title="${MONATE[i]}: Einnahmen ${chf(x.ein)}, Ausgaben ${chf(x.aus)}">
      <div class="balken-paar"><i class="ein" style="height:${(x.ein / max) * 100}%"></i><i class="aus" style="height:${(x.aus / max) * 100}%"></i></div>
      <span>${MONATE[i].slice(0, 1)}</span></div>`).join('');

    // Ausgaben nach Kategorie
    const kat = {};
    for (const b of liste) if (b.typ === 'ausgabe') kat[b.kategorie] = (kat[b.kategorie] || 0) + netto(b);
    const katListe = Object.entries(kat).sort((a, b) => b[1] - a[1]).slice(0, 6);
    const katMax = Math.max(1, ...katListe.map((k) => k[1]));

    // MWST im laufenden Quartal
    const jetztJahr = String(new Date().getFullYear());
    const q = quartalVon(heute());
    const mw = mwstRechnen(jetztJahr, q);

    const st = startKarten();
    const ziel = Number(Z.einst.jahresziel) || 0;
    const zielPct = ziel ? Math.min(100, Math.round(s.ein / ziel * 100)) : 0;
    const k = (id, html) => (st[id] ? html : '');
    const paar = (a, b) => (a && b ? `<div class="raster raster-2 abstand">${a}${b}</div>` : (a || b) ? `<div class="abstand">${a || b}</div>` : '');
    const karteMonate = st.monate ? `<div class="card">
        <h2>Monate ${Z.jahr}</h2>
        <div class="balken">${balken}</div>
        <div class="legende"><span><i style="background:var(--elektrik)"></i>Einnahmen</span><span><i style="background:rgba(11,59,46,.22)"></i>Ausgaben</span></div>
      </div>` : '';
    const karteMwst = st.mwst ? `<div class="card">
        <h2>MWST ${q}. Quartal ${jetztJahr}</h2>
        <table>
          <tr><td>MWST auf Ihren Einnahmen</td><td class="b">${chf(mw.steuer)}</td></tr>
          <tr><td>Vorsteuer auf Ihren Ausgaben</td><td class="b">minus ${chf(mw.vorsteuer)}</td></tr>
          <tr class="summe"><td>${mw.zahlen >= 0 ? 'Voraussichtlich zu bezahlen' : 'Guthaben'}</td><td class="b">${chf(Math.abs(mw.zahlen))}</td></tr>
        </table>
        <p class="hinweis abstand">Einreichen bis ${datumKurz(fristVon(jetztJahr, q))}. <button class="link" data-ansicht="mwst">Zur Abrechnung</button></p>
      </div>` : '';
    const karteKat = st.kategorien ? `<div class="card">
        <h2>Ausgaben nach Kategorie</h2>
        ${katListe.length ? katListe.map(([id, r]) => `<div class="kat-zeile"><span>${esc(katAus(id).name)}</span><span class="num">${chf(r)}</span><div class="spur"><i style="width:${(r / katMax) * 100}%;background:${katFarbe(id)}"></i></div></div>`).join('')
          : '<p class="leer">Noch keine Ausgaben in diesem Jahr.</p>'}
      </div>` : '';
    const karteZuletzt = st.zuletzt ? `<div class="card">
        <h2>Zuletzt erfasst</h2>
        ${ohneBeleg ? `<p class="hinweis" style="margin:-4px 0 8px"><span class="marke marke-offen">${ohneBeleg} ${ohneBeleg === 1 ? 'Ausgabe' : 'Ausgaben'} ohne Beleg</span></p>` : ''}
        ${zeilen(sortiert(liste).slice(0, 6)) || '<p class="leer">Noch nichts erfasst. Tippen Sie auf „+“, um die erste Buchung zu machen.</p>'}
      </div>` : '';
    const ks = kasseStand();
    const karteKasse = st.kasse ? `<div class="card">
        <h2>Kasse (Bargeld)</h2>
        <div class="wert ${ks.bestand < 0 ? 'minus' : ''}" style="font-size:1.8rem;font-weight:700">${chf(ks.bestand)} <span class="klein">CHF</span></div>
        <p class="hinweis">Bar eingenommen ${chf(ks.ein)} · bar ausgegeben ${chf(ks.aus)} · vom Konto ${chf(ks.bezug)} · aufs Konto ${chf(ks.abgabe)}</p>
        <div class="kopf-aktionen abstand" style="flex-wrap:wrap"><button class="btn" onclick="NB.kasse('bezug')">Bargeld abgehoben</button><button class="btn" onclick="NB.kasse('abgabe')">Aufs Konto einbezahlt</button><button class="btn" onclick="NB.kasse('buch')">Kassenbuch</button></div>
      </div>` : '';
    const karteVerlauf = st.verlauf ? `<div class="card"><h2>Gewinn im Verlauf ${Z.jahr}</h2>${linienDiagramm([{ werte: kumuliert(Z.jahr), farbe: 'var(--elektrik)', name: Z.jahr }])}</div>` : '';
    return `
    <div class="kopf">
      <div><h1>${esc(Z.einst.begruessung || 'Übersicht')}</h1><p class="unter">Alle Beträge ohne MWST</p></div>
      <div class="kopf-aktionen">${jahrWahl()}<button class="btn" onclick="NB.startAnpassen()">Übersicht anpassen</button><button class="btn" onclick="NB.zwischenbilanz()">Zwischenbilanz</button><button class="btn" onclick="NB.fahrt()">Fahrt erfassen</button><a class="btn nv-weg" href="rechnungen/" style="text-decoration:none">Rechnung schreiben</a><button class="btn btn-haupt nur-pc" onclick="NB.neu()">+ Neue Buchung</button></div>
    </div>
    ${fragenKarte()}
    ${(() => { if (!finanzenErlaubt()) return `<div class="card abstand-unten lq-kurz" data-ansicht="liquiditaet"><span class="ic">📈</span><span class="txt"><b>Reicht das Geld in den nächsten Wochen?</b><span class="hinweis">Liquiditätsvorschau mit Finanzen Plus ansehen</span></span><span class="marke marke-info">Zusatz</span></div>`;
      if (!Z.einst.liquiStand) return `<div class="card abstand-unten lq-kurz" data-ansicht="liquiditaet"><span class="ic">📈</span><span class="txt"><b>Liquiditätsvorschau</b><span class="hinweis">Kontostand eintragen und sehen, ob das Geld 12 Wochen reicht</span></span><span>›</span></div>`;
      const lp = liquiPlan(), knapp = lp.wochen.find((w) => w.stand < lp.reserve);
      return `<div class="card abstand-unten lq-kurz ${knapp ? 'lq-warnung' : ''}" data-ansicht="liquiditaet"><span class="ic">${knapp ? '⚠️' : '📈'}</span><span class="txt"><b>${knapp ? 'Ab ' + datumKurz(knapp.von) + ' wird das Geld knapp' : 'Ihr Geld reicht die nächsten 12 Wochen'}</b><span class="hinweis">Tiefster Kontostand: ${chf(lp.tiefst)} CHF</span></span><span>›</span></div>`; })()}
    ${fristenKarte()}
    ${doppeltAktiv() ? kontostaendeKarte() : ''}
    ${k('ziel', ziel ? `<div class="card abstand-unten ziel-karte"><div class="ziel-kopf"><h2 style="margin:0">Jahresziel ${Z.jahr}</h2><span class="num">${chf(s.ein)} von ${chf(ziel)} CHF · ${zielPct} %</span></div><div class="spur gross"><i style="width:${zielPct}%"></i></div></div>` : '')}
    ${k('kennzahlen', `<div class="raster raster-4">`)}
      ${st.kennzahlen ? '' : '<!--KZ'}<div class="card kennzahl"><div class="label">Einnahmen</div><div class="wert">${chf(s.ein)}</div><div class="klein">CHF im Jahr ${Z.jahr}</div></div>
      <div class="card kennzahl"><div class="label">Ausgaben</div><div class="wert">${chf(s.aus)}</div><div class="klein">CHF im Jahr ${Z.jahr}</div></div>
      <div class="card kennzahl"><div class="label">Gewinn</div><div class="wert ${s.gewinn < 0 ? 'minus' : 'plus'}">${chf(s.gewinn)}</div><div class="klein">Einnahmen minus Ausgaben</div></div>
      <div class="card kennzahl"><div class="label">Offene Rechnungen</div><div class="wert">${chf(offenSumme)}</div><div class="klein">${offen.length} ${offen.length === 1 ? 'Rechnung' : 'Rechnungen'} noch nicht bezahlt</div></div>${st.kennzahlen ? '' : 'KZ-->'}
    ${k('kennzahlen', '</div>')}
    ${paar(karteMonate, karteMwst)}
    ${paar(karteVerlauf, karteKasse)}
    ${paar(karteKat, karteZuletzt)}
    <!--ALT
      <div class="card">
        <h2>Monate ${Z.jahr}</h2>
        <div class="balken">${balken}</div>
        <div class="legende"><span><i style="background:var(--elektrik)"></i>Einnahmen</span><span><i style="background:rgba(11,59,46,.22)"></i>Ausgaben</span></div>
      </div>
      <div class="card">
        <h2>MWST ${q}. Quartal ${jetztJahr}</h2>
        <table>
          <tr><td>MWST auf Ihren Einnahmen</td><td class="b">${chf(mw.steuer)}</td></tr>
          <tr><td>Vorsteuer auf Ihren Ausgaben</td><td class="b">minus ${chf(mw.vorsteuer)}</td></tr>
          <tr class="summe"><td>${mw.zahlen >= 0 ? 'Voraussichtlich zu bezahlen' : 'Guthaben'}</td><td class="b">${chf(Math.abs(mw.zahlen))}</td></tr>
        </table>
        <p class="hinweis abstand">Einreichen bis ${datumKurz(fristVon(jetztJahr, q))}. <button class="link" data-ansicht="mwst">Zur Abrechnung</button></p>
      </div>
    </div>
    <div class="raster raster-2 abstand">
      <div class="card">
        <h2>Ausgaben nach Kategorie</h2>
        ${katListe.length ? katListe.map(([id, r]) => `<div class="kat-zeile"><span>${esc(katAus(id).name)}</span><span class="num">${chf(r)}</span><div class="spur"><i style="width:${(r / katMax) * 100}%"></i></div></div>`).join('')
          : '<p class="leer">Noch keine Ausgaben in diesem Jahr.</p>'}
      </div>
      <div class="card">
        <h2>Zuletzt erfasst</h2>
        ${ohneBeleg ? `<p class="hinweis" style="margin:-4px 0 8px"><span class="marke marke-offen">${ohneBeleg} ${ohneBeleg === 1 ? 'Ausgabe' : 'Ausgaben'} ohne Beleg</span></p>` : ''}
        ${zeilen(sortiert(liste).slice(0, 6)) || '<p class="leer">Noch nichts erfasst. Tippen Sie auf „+“, um die erste Buchung zu machen.</p>'}
      </div>
    </div>ALT-->`.replace(/<!--ALT[\s\S]*?ALT-->/, '');
  }

  /* ================= Startseite wählen ================= */
  const START_KARTEN = [['kennzahlen', 'Kennzahlen (Einnahmen, Ausgaben, Gewinn, Offen)'], ['ziel', 'Jahresziel mit Fortschritt'], ['monate', 'Monate als Balken'],
    ['mwst', 'MWST im laufenden Quartal'], ['verlauf', 'Gewinn im Verlauf'], ['kategorien', 'Ausgaben nach Kategorie'], ['zuletzt', 'Zuletzt erfasst'], ['kasse', 'Kasse (Bargeld)']];
  // Kasse: Bar-Buchungen plus Bargeld vom Konto abgehoben oder aufs Konto einbezahlt
  const kasse = () => ({ anfang: 0, bewegungen: [], ...(Z.einst.kasse || {}) });
  function kasseStand() {
    const k = kasse();
    const bar = Z.buchungen.filter((b) => b.zahlung === 'Bar' && !b.geloescht);
    const ein = bar.filter((b) => b.typ === 'einnahme').reduce((s, b) => s + (b.betragRappen || 0), 0);
    const aus = bar.filter((b) => b.typ === 'ausgabe').reduce((s, b) => s + (b.betragRappen || 0), 0);
    const bezug = k.bewegungen.filter((x) => x.art === 'bezug').reduce((s, x) => s + x.betrag, 0);
    const abgabe = k.bewegungen.filter((x) => x.art === 'abgabe').reduce((s, x) => s + x.betrag, 0);
    return { ein, aus, bezug, abgabe, bestand: (k.anfang || 0) + ein - aus + bezug - abgabe, bar };
  }
  const startKarten = () => ({ kennzahlen: true, ziel: true, monate: true, mwst: true, verlauf: false, kategorien: true, zuletzt: true, kasse: true, ...(Z.einst.start || {}) });

  /* ================= Diagramme ================= */
  const monatsWerte = (jahr, typ) => {
    const m = Array(12).fill(0);
    for (const b of imJahr(jahr)) if ((!typ || b.typ === typ) && erfolgswirksam(b)) m[Number(b.datum.slice(5, 7)) - 1] += typ ? netto(b) : (b.typ === 'einnahme' ? netto(b) : -netto(b));
    return m;
  };
  const kumuliert = (jahr) => {
    const m = monatsWerte(jahr), aus = [];
    const bis = jahr === String(new Date().getFullYear()) ? new Date().getMonth() + 1 : 12;
    m.slice(0, bis).reduce((a, x) => { aus.push(a + x); return a + x; }, 0);
    return aus;
  };
  const kurzChf = (r) => { const v = r / 100; return Math.abs(v) >= 1000 ? (v / 1000).toFixed(Math.abs(v) >= 10000 ? 0 : 1) + 'k' : String(Math.round(v)); };
  function linienDiagramm(reihen) {
    const B = 640, H = 220, L = 46, R = 10, O = 14, U = 26;
    const alle = reihen.flatMap((r) => r.werte);
    if (!alle.length) return '<p class="leer">Noch keine Daten.</p>';
    const max = Math.max(1, ...alle), min = Math.min(0, ...alle);
    const x = (i) => L + (i / 11) * (B - L - R), y = (v) => O + (1 - (v - min) / (max - min)) * (H - O - U);
    const gitter = [0, 0.25, 0.5, 0.75, 1].map((f) => { const v = min + (max - min) * f; return `<line x1="${L}" x2="${B - R}" y1="${y(v)}" y2="${y(v)}" class="dg-gitter"/><text x="${L - 6}" y="${y(v) + 4}" class="dg-achse" text-anchor="end">${kurzChf(v)}</text>`; }).join('');
    const null0 = min < 0 ? `<line x1="${L}" x2="${B - R}" y1="${y(0)}" y2="${y(0)}" class="dg-null"/>` : '';
    const linien = reihen.map((r, ri) => {
      if (!r.werte.length) return '';
      const pkt = r.werte.map((v, i) => `${x(i).toFixed(1)},${y(v).toFixed(1)}`).join(' ');
      const flaeche = ri === 0 ? `<polygon points="${x(0)},${y(Math.max(0, min))} ${pkt} ${x(r.werte.length - 1)},${y(Math.max(0, min))}" fill="${r.farbe}" opacity=".10"/>` : '';
      const letzter = r.werte.length - 1;
      return `${flaeche}<polyline points="${pkt}" fill="none" stroke="${r.farbe}" stroke-width="${ri === 0 ? 3 : 2}" stroke-dasharray="${r.strich || ''}" stroke-linejoin="round" stroke-linecap="round"/>` +
        `<circle cx="${x(letzter)}" cy="${y(r.werte[letzter])}" r="4.5" fill="${r.farbe}"/>`;
    }).join('');
    const monate = MONATE.map((n, i) => `<text x="${x(i)}" y="${H - 8}" class="dg-achse" text-anchor="middle">${n.slice(0, 1)}</text>`).join('');
    const legende = reihen.length > 1 ? `<div class="legende">${reihen.map((r) => `<span><i style="background:${r.farbe}"></i>${esc(r.name)}</span>`).join('')}</div>` : '';
    return `<svg class="diagramm" viewBox="0 0 ${B} ${H}" role="img" aria-label="Verlauf">${gitter}${null0}${linien}${monate}</svg>${legende}`;
  }
  function saeulenVergleich(a, b, namen) {
    const B = 640, H = 220, L = 46, R = 10, O = 14, U = 26;
    const max = Math.max(1, ...a, ...b), w = (B - L - R) / 12;
    const y = (v) => O + (1 - v / max) * (H - O - U);
    const gitter = [0, 0.5, 1].map((f) => `<line x1="${L}" x2="${B - R}" y1="${y(max * f)}" y2="${y(max * f)}" class="dg-gitter"/><text x="${L - 6}" y="${y(max * f) + 4}" class="dg-achse" text-anchor="end">${kurzChf(max * f)}</text>`).join('');
    const saeulen = a.map((v, i) => {
      const x0 = L + i * w + w * 0.14, bw = w * 0.34;
      return `<rect x="${x0}" y="${y(b[i])}" width="${bw}" height="${Math.max(0, H - U - y(b[i]))}" rx="3" class="dg-vorjahr"><title>${namen[1]} ${MONATE[i]}: ${chf(b[i])}</title></rect>` +
        `<rect x="${x0 + bw + 2}" y="${y(v)}" width="${bw}" height="${Math.max(0, H - U - y(v))}" rx="3" class="dg-jahr"><title>${namen[0]} ${MONATE[i]}: ${chf(v)}</title></rect>` +
        `<text x="${L + i * w + w / 2}" y="${H - 8}" class="dg-achse" text-anchor="middle">${MONATE[i].slice(0, 1)}</text>`;
    }).join('');
    return `<svg class="diagramm" viewBox="0 0 ${B} ${H}" role="img" aria-label="Vergleich">${gitter}${saeulen}</svg>
      <div class="legende"><span><i style="background:var(--elektrik)"></i>${esc(namen[0])}</span><span><i style="background:rgba(11,59,46,.22)"></i>${esc(namen[1])}</span></div>`;
  }
  function ringDiagramm(teile) {
    const total = teile.reduce((a, t) => a + t.wert, 0);
    if (!total) return '<p class="leer">Noch keine Ausgaben.</p>';
    const R = 70, U = 2 * Math.PI * R;
    let start = 0;
    const boegen = teile.map((t) => {
      const l = (t.wert / total) * U;
      const bogen = `<circle r="${R}" cx="90" cy="90" fill="none" stroke="${t.farbe}" stroke-width="26" stroke-dasharray="${Math.max(0, l - 1.5)} ${U}" stroke-dashoffset="${-start}" transform="rotate(-90 90 90)"><title>${esc(t.name)}: ${chf(t.wert)}</title></circle>`;
      start += l;
      return bogen;
    }).join('');
    return `<div class="ring"><svg viewBox="0 0 180 180" class="ring-svg">${boegen}<text x="90" y="86" text-anchor="middle" class="ring-zahl">${kurzChf(total)}</text><text x="90" y="104" text-anchor="middle" class="dg-achse">CHF total</text></svg>
      <div class="ring-legende">${teile.map((t) => `<div><i style="background:${t.farbe}"></i><span>${esc(t.name)}</span><b>${Math.round(t.wert / total * 100)} %</b></div>`).join('')}</div></div>`;
  }

  /* ================= Auswertung ================= */
  function auswertung() {
    const j = Z.jahr, vj = String(Number(j) - 1);
    const s = summen(imJahr(j)), sv = summen(imJahr(vj));
    const diff = (a, b) => (b ? Math.round((a - b) / Math.abs(b) * 100) : null);
    const pfeil = (d) => (d == null ? '<span class="klein">kein Vorjahr</span>' : `<span class="trend ${d >= 0 ? 'plus' : 'minus'}">${d >= 0 ? '▲' : '▼'} ${Math.abs(d)} % zum Vorjahr</span>`);
    const monate = j === String(new Date().getFullYear()) ? new Date().getMonth() + 1 : 12;
    const marge = s.ein ? Math.round(s.gewinn / s.ein * 100) : 0;
    const kat = {};
    for (const b of imJahr(j)) if (b.typ === 'ausgabe') kat[b.kategorie] = (kat[b.kategorie] || 0) + netto(b);
    const katSort = Object.entries(kat).sort((a, b) => b[1] - a[1]);
    const teile = katSort.slice(0, 7).map(([id, w]) => ({ name: katAus(id).name, wert: w, farbe: katFarbe(id) }));
    const rest = katSort.slice(7).reduce((a, x) => a + x[1], 0);
    if (rest) teile.push({ name: 'Weitere', wert: rest, farbe: '#C4C8D4' });
    const kunden = {};
    for (const b of imJahr(j)) if (b.typ === 'einnahme') { const p = b.partner || 'Ohne Namen'; kunden[p] = (kunden[p] || 0) + netto(b); }
    const kListe = Object.entries(kunden).sort((a, b) => b[1] - a[1]).slice(0, 6);
    const kMax = Math.max(1, ...kListe.map((x) => x[1]));
    const fahrten = imJahr(j).filter((b) => b.quelle === 'fahrt');
    const km = fahrten.reduce((a, b) => a + (Number(b.km) || 0), 0);
    return `
    <div class="kopf">
      <div><h1>Auswertung ${j}</h1><p class="unter">Vergleich mit ${vj}, alle Beträge ohne MWST</p></div>
      <div class="kopf-aktionen">${jahrWahl()}</div>
    </div>
    <div class="raster raster-4">
      <div class="card kennzahl"><div class="label">Umsatz</div><div class="wert">${chf(s.ein)}</div>${pfeil(diff(s.ein, sv.ein))}</div>
      <div class="card kennzahl"><div class="label">Gewinn</div><div class="wert ${s.gewinn < 0 ? 'minus' : 'plus'}">${chf(s.gewinn)}</div>${pfeil(diff(s.gewinn, sv.gewinn))}</div>
      <div class="card kennzahl"><div class="label">Marge</div><div class="wert">${marge} %</div><div class="klein">Gewinn im Verhältnis zum Umsatz</div></div>
      <div class="card kennzahl"><div class="label">Ø pro Monat</div><div class="wert">${chf(Math.round(s.ein / monate))}</div><div class="klein">Umsatz über ${monate} ${monate === 1 ? 'Monat' : 'Monate'}</div></div>
    </div>
    <div class="raster raster-2 abstand">
      <div class="card"><h2>Umsatz pro Monat</h2>${saeulenVergleich(monatsWerte(j, 'einnahme'), monatsWerte(vj, 'einnahme'), [j, vj])}</div>
      <div class="card"><h2>Gewinn im Verlauf</h2>${linienDiagramm([{ werte: kumuliert(j), farbe: 'var(--elektrik)', name: j }, { werte: kumuliert(vj), farbe: '#9AA3BC', name: vj, strich: '5 5' }])}</div>
    </div>
    <div class="raster raster-2 abstand">
      <div class="card"><h2>Wofür das Geld ausgegeben wird</h2>${ringDiagramm(teile)}</div>
      <div class="card"><h2>Beste Kunden</h2>
        ${kListe.length ? kListe.map(([n, r]) => `<div class="kat-zeile"><span>${esc(n)}</span><span class="num">${chf(r)}</span><div class="spur"><i style="width:${r / kMax * 100}%"></i></div></div>`).join('') : '<p class="leer">Noch keine Einnahmen.</p>'}
        ${km ? `<p class="hinweis abstand">Fahrten: <strong>${km.toLocaleString('de-CH')} km</strong> in ${fahrten.length} Fahrten, ${chf(fahrten.reduce((a, b) => a + b.betragRappen, 0))} CHF Spesen.</p>` : ''}
      </div>
    </div>`;
  }

  /* ================= Fahrten ================= */
  function fahrtErfassen() {
    const dlg = $('dlg');
    const ansatz = Number(Z.einst.kmAnsatz) || 0.7;
    dlg.innerHTML = `<form method="dialog" id="fForm">
      <div class="dlg-kopf"><h3>Fahrt erfassen</h3><button type="button" class="x" data-zu aria-label="Schliessen">×</button></div>
      <div class="dlg-inhalt">
        <p class="hinweis">Geschäftsfahrten mit dem Privatauto werden mit ${ansatz.toFixed(2)} CHF pro Kilometer als Ausgabe gebucht (ändern unter Einstellungen).</p>
        <div class="feld-zeile">
          <div class="feld"><label for="fkDatum">Datum</label><input type="date" id="fkDatum" value="${heute()}" required /></div>
          <div class="feld"><label for="fkKm">Kilometer</label><input type="text" id="fkKm" inputmode="decimal" placeholder="z. B. 42" required /></div>
        </div>
        <div class="feld"><label for="fkZweck">Von, nach und Zweck</label><input type="text" id="fkZweck" placeholder="z. B. Winterthur – Zürich, Kunde Muster AG" /></div>
        <label class="haken"><input type="checkbox" id="fkRetour" checked /> Hin- und Rückfahrt (Kilometer verdoppeln)</label>
        <p class="hinweis abstand" id="fkSumme"></p>
      </div>
      <div class="dlg-fuss"><div class="rechts"><button type="button" class="btn" data-zu>Abbrechen</button><button type="submit" class="btn btn-haupt">Fahrt buchen</button></div></div>
    </form>`;
    const rechnen = () => {
      const km = (Number(String($('fkKm').value).replace(',', '.')) || 0) * ($('fkRetour').checked ? 2 : 1);
      $('fkSumme').textContent = km ? `${km.toLocaleString('de-CH')} km × ${ansatz.toFixed(2)} = CHF ${chf(Math.round(km * ansatz * 100))}` : '';
      return km;
    };
    dlg.oninput = rechnen; dlg.onchange = rechnen;
    dlg.onclick = (e) => { if (e.target === dlg || e.target.closest('[data-zu]')) dlg.close(); };
    $('fForm').onsubmit = async (e) => {
      e.preventDefault();
      const km = rechnen();
      if (!km) { $('fkKm').focus(); toast('Bitte die Kilometer eingeben'); return; }
      if (istFest($('fkDatum').value)) { toast(`Bis ${datumKurz(festBis())} ist alles festgeschrieben`); return; }
      await Speicher.speichern('buchungen', { typ: 'ausgabe', quelle: 'fahrt', kategorie: 'fahrten', datum: $('fkDatum').value || heute(),
        km, kmAnsatz: ansatz, betragRappen: Math.round(km * ansatz * 100), mwstSatz: 0, mwstRappen: 0,
        text: $('fkZweck').value.trim() || `Fahrt ${km} km`, partner: '', zahlung: 'Bar' });
      dlg.close();
      await neuLaden(`Fahrt mit ${km} km gebucht`);
    };
    dlg.showModal();
    $('fkKm').focus();
  }

  /* ================= Bankauszug importieren ================= */
  const REGELN = [
    [/shell|bp |avia|tamoil|socar|agrola|migrol|coop pronto|eni |esso|garage|amag|emil frey|parkhaus|parking|mobility/i, 'fahrzeug'],
    [/swisscom|sunrise|salt|upc|init7|wingo|yallo|quickline/i, 'telefon'],
    [/axa|mobiliar|zurich vers|helvetia|baloise|allianz|generali|vaudoise|suva/i, 'versicherung'],
    [/kontoführung|kontofuehrung|bankgebühr|spesen bank|zinsen|kartengebühr|jahresgebühr|preis für/i, 'bank'],
    [/google|apple\.com|microsoft|adobe|github|hostpoint|infomaniak|cyon|canva|openai|dropbox|zoom|anthropic|metanet/i, 'software'],
    [/restaurant|cafe|café|mcdonald|burger king|starbucks|bäckerei|beck|sbb|zvv|postauto/i, 'spesen'],
    [/hornbach|bauhaus|jumbo|obi|landi|distrelec|conrad|elektro-material|em ag|winterhalter|otto fischer|brack|digitec|galaxus/i, 'material'],
    [/miete|immobilien|verwaltung/i, 'buero'],
    [/estv|steueramt|gemeinde|strassenverkehrsamt|gebühr/i, 'gebuehren'],
  ];
  // Lernender Bankabgleich: Partner vereinfachen (ohne AG, GmbH, Ort, Nummern), damit „MIGROS ZUERICH 1234“ und „Migros“ gleich sind
  const partnerSchluessel = (t) => {
    const roh = String(t.partner || '').trim() || String(t.text || '').replace(/^(einkauf|zahlung|lastschrift|gutschrift|e-banking|twint|debit|kartenzahlung|maestro|visa|mastercard)[\s:,-]*/i, '');
    return roh.toLowerCase().replace(/\b(ag|gmbh|sa|sàrl|sarl|ltd|inc|co|kg|ch|schweiz|suisse|svizzera|switzerland)\b/g, ' ').replace(/[0-9]+/g, ' ').replace(/[^a-zäöüéèàç ]+/g, ' ')
      .split(/\s+/).filter((w) => w.length > 2).reduce((a, w, i, l) => (i === 0 ? (w.length >= 4 ? [w] : l.slice(0, 2)) : a), []).join(' ');
  };
  const regelVon = (t, typ) => { const k = partnerSchluessel(t); return k ? (Z.einst.bankRegeln || []).find((x) => x.typ === typ && x.muster === k) : null; };
  async function regelnLernen(liste) {
    const alle = [...(Z.einst.bankRegeln || [])];
    let neu = 0;
    for (const v of liste) {
      const k = partnerSchluessel(v); if (!k || !v.kategorie || v.rechnung) continue;
      const i = alle.findIndex((x) => x.typ === v.typ && x.muster === k);
      if (i >= 0) { if (alle[i].kategorie !== v.kategorie) { alle[i] = { ...alle[i], kategorie: v.kategorie, mal: 1 }; neu++; } else alle[i] = { ...alle[i], mal: (alle[i].mal || 1) + 1 }; }
      else if (v.geaendert || v.gelernt === undefined) { alle.push({ typ: v.typ, muster: k, kategorie: v.kategorie, mal: 1 }); if (v.geaendert) neu++; }
    }
    await einstSpeichern({ bankRegeln: alle.slice(-800) });
    return neu;
  }
  function kategorieRaten(t, typ) {
    const regel = regelVon(t, typ);
    if (regel && (typ === 'ausgabe' ? KAT_AUS : KAT_EIN).some((k) => k.id === regel.kategorie)) { t.gelernt = true; return regel.kategorie; }
    const key = partnerSchluessel(t);
    const frueher = key && sortiert(Z.buchungen).find((b) => b.typ === typ && (b.partner || b.text) && partnerSchluessel(b) === key);
    if (frueher) { t.gelernt = true; return frueher.kategorie; }
    if (typ === 'einnahme') return 'dienstleistung';
    const text = `${t.partner} ${t.text}`;
    const r = REGELN.find(([re]) => re.test(text));
    return r ? r[1] : 'uebrig';
  }
  const datumLesen = (s) => {
    s = String(s || '').trim();
    let m = s.match(/^(\d{4})-(\d{2})-(\d{2})/); if (m) return `${m[1]}-${m[2]}-${m[3]}`;
    m = s.match(/^(\d{1,2})[./](\d{1,2})[./](\d{2,4})/); if (m) return `${m[3].length === 2 ? '20' + m[3] : m[3]}-${m[2].padStart(2, '0')}-${m[1].padStart(2, '0')}`;
    return '';
  };
  function camtLesen(xml) {
    const doc = new DOMParser().parseFromString(xml, 'application/xml');
    const tag = (el, n) => el.getElementsByTagNameNS('*', n);
    const text = (el, ...pfad) => { let e = el; for (const n of pfad) { e = e && tag(e, n)[0]; } return e ? e.textContent.trim() : ''; };
    return [...tag(doc, 'Ntry')].map((n) => {
      const betrag = Math.round(Number(text(n, 'Amt')) * 100) * (text(n, 'CdtDbtInd') === 'DBIT' ? -1 : 1);
      const haben = betrag > 0;
      const partner = text(n, 'RltdPties', haben ? 'Dbtr' : 'Cdtr', 'Nm') || text(n, 'RltdPties', 'Nm');
      const info = text(n, 'RmtInf', 'Ustrd') || text(n, 'AddtlTxInf') || text(n, 'AddtlNtryInf');
      const ref = text(n, 'RmtInf', 'Ref') || text(n, 'AcctSvcrRef');
      return { datum: datumLesen(text(n, 'BookgDt', 'Dt') || text(n, 'BookgDt', 'DtTm') || text(n, 'ValDt', 'Dt')), betragRappen: betrag, partner, text: info || partner, ref };
    }).filter((t) => t.datum && t.betragRappen);
  }
  function csvLesen(roh) {
    const zeilen = roh.replace(/^﻿/, '').split(/\r?\n/).filter((z) => z.trim());
    const trenner = (zeilen.slice(0, 15).join('\n').match(/;/g) || []).length >= (zeilen.slice(0, 15).join('\n').match(/,/g) || []).length / 2 ? ';' : ',';
    const teilen = (z) => { const aus = []; let f = '', q = false; for (const c of z) { if (c === '"') q = !q; else if (c === trenner && !q) { aus.push(f.trim()); f = ''; } else f += c; } aus.push(f.trim()); return aus; };
    const kopfIdx = zeilen.findIndex((z) => /datum|date/i.test(z) && /(betrag|amount|gutschrift|belastung|soll|haben|credit|debit)/i.test(z));
    if (kopfIdx < 0) throw new Error('In dieser CSV-Datei habe ich keine Spalten für Datum und Betrag gefunden.');
    const kopf = teilen(zeilen[kopfIdx]).map((k) => k.toLowerCase());
    const finde = (re) => kopf.findIndex((k) => re.test(k));
    const iDatum = finde(/buchungsdatum|^datum|date|valuta/), iBetrag = finde(/^betrag|amount|betrag in chf|^chf/);
    const iHaben = finde(/gutschrift|haben|credit|eingang/), iSoll = finde(/belastung|^soll|debit|ausgang|lastschrift/);
    const iText = finde(/buchungstext|beschreibung|mitteilung|text|details|description|avis/), iPartner = finde(/empfänger|auftraggeber|gegenpartei|name|partner|kunde|lieferant/);
    const iKat = finde(/kategorie|konto|category/), iArt = finde(/^art$|^typ$|einnahme\/ausgabe|type/), iMwst = finde(/mwst-satz|mwst satz|steuersatz|^mwst$|vat/);
    return zeilen.slice(kopfIdx + 1).map((z) => {
      const f = teilen(z);
      const zahl = (i) => (i >= 0 && f[i] ? betragLesen(f[i].replace(/^-/, '−').replace('−', '-')) : NaN);
      let betrag = zahl(iBetrag);
      if (!Number.isFinite(betrag)) { const h = zahl(iHaben), so = zahl(iSoll); betrag = Number.isFinite(h) && h ? Math.abs(h) : Number.isFinite(so) && so ? -Math.abs(so) : NaN; }
      if (iBetrag >= 0 && /^\s*-/.test(f[iBetrag] || '')) betrag = -Math.abs(betrag);
      if (iArt >= 0 && /ausgabe|aufwand|soll|debit/i.test(f[iArt] || '')) betrag = -Math.abs(betrag);
      if (iArt >= 0 && /einnahme|ertrag|haben|credit/i.test(f[iArt] || '')) betrag = Math.abs(betrag);
      const satz = iMwst >= 0 ? Number(String(f[iMwst] || '').replace('%', '').replace(',', '.')) : NaN;
      return { datum: datumLesen(f[iDatum]), betragRappen: betrag, partner: iPartner >= 0 ? f[iPartner] : '', text: iText >= 0 ? f[iText] : '',
        kategorieName: iKat >= 0 ? f[iKat] : '', mwstSatz: SAETZE.includes(satz) ? satz : null };
    }).filter((t) => t.datum && Number.isFinite(t.betragRappen) && t.betragRappen);
  }
  const importSchluessel = (t) => `${t.datum}|${t.betragRappen}|${(t.text || t.partner || '').slice(0, 40).toLowerCase()}`;
  async function bankImport(vorgabe) {
    const datei = vorgabe || await dateiWaehlen(''); // alle Dateien: camt, CSV, Excel, PDF
    if (!datei) return;
    let liste, v;
    try {
      v = await Auszug.vorbereiten(datei, (t) => toast(t));
      liste = v.liste || (/<\?xml|<Document/i.test(v.roh.slice(0, 500)) ? camtLesen(v.roh) : csvLesen(v.roh));
    } catch (f) { toast(f.message || 'Diese Datei kann ich nicht lesen'); return; }
    if (!liste.length) { toast('In dieser Datei habe ich keine Buchungen gefunden'); return; }
    const bekannt = new Set(Z.buchungen.map((b) => b.importSchluessel).filter(Boolean));
    // Schritt 1: Beträge, Vorzeichen und Saldo mit dem Auszug vergleichen (nichts wird gespeichert)
    const quelle = v.quelle || (/<\?xml|<Document/i.test((v.roh || '').slice(0, 500)) ? 'camt' : 'csv');
    const geprueft = await Auszug.pruefen({ liste, anfang: v.anfang ?? null, ende: v.ende ?? null, quelle, spalten: v.spalten, bank: v.bank, karte: v.karte },
      { doppelt: (t) => bekannt.has(importSchluessel(t)), datei, weiter: 'Weiter zu den Kategorien' });
    if (!geprueft || !geprueft.length) return;
    liste = geprueft;
    // Endsaldo für die Liquiditätsvorschau merken (nur wenn neuer als der bisherige Stand)
    if (v.ende != null && Number.isFinite(v.ende)) {
      const bis = liste.reduce((m, t) => (t.datum > m ? t.datum : m), '');
      if (bis && (!Z.einst.liquiStand || Z.einst.liquiStand.datum <= bis)) await einstSpeichern({ liquiStand: { betragRappen: Math.round(v.ende), datum: bis, quelle: 'bank' } });
    }
    const offen = Z.buchungen.filter(istOffen);
    const vergeben = new Set();
    const vorschlaege = liste.map((t) => {
      const typ = t.betragRappen > 0 ? 'einnahme' : 'ausgabe';
      const betrag = Math.abs(t.betragRappen);
      const schluessel = importSchluessel(t);
      const txt = `${t.text || ''} ${t.ref || ''}`;
      const rechnung = typ === 'einnahme' ? (offen.find((b) => !vergeben.has(b.id) && b.rechnungNr && b.betragRappen === betrag && new RegExp('(^|\\D)' + String(b.rechnungNr).replace(/[^0-9A-Za-z-]/g, '') + '(\\D|$)').test(txt))
        || offen.find((b) => b.betragRappen === betrag && !vergeben.has(b.id))) : null;
      if (rechnung) vergeben.add(rechnung.id);
      // Gleiche Bewegung aus einer anderen Datei (z. B. erst CSV, dann camt): gleiches Datum, gleicher Betrag
      const aehnlich = Z.buchungen.some((b) => b.quelle === 'bank' && b.datum === t.datum && b.betragRappen === betrag && b.typ === typ);
      const nachName = t.kategorieName ? (typ === 'ausgabe' ? KAT_AUS : KAT_EIN).find((k) => k.name.toLowerCase() === t.kategorieName.toLowerCase() || k.name.toLowerCase().includes(t.kategorieName.toLowerCase().slice(0, 6))) : null;
      const kat = nachName ? nachName.id : kategorieRaten(t, typ);
      return { ...t, typ, betrag, schluessel, doppelt: bekannt.has(schluessel) || aehnlich, rechnung, kategorie: kat, gelernt: !!t.gelernt };
    });
    const dlg = $('dlg');
    const optionen = (v) => sichtbar(v.typ === 'ausgabe' ? KAT_AUS : KAT_EIN, v.kategorie).map((k) => `<option value="${k.id}" ${k.id === v.kategorie ? 'selected' : ''}>${esc(k.name)}</option>`).join('');
    const neu = vorschlaege.filter((v) => !v.doppelt).length;
    dlg.innerHTML = `<form method="dialog" id="iForm" class="import-form">
      <div class="dlg-kopf"><h3>Bankauszug: ${vorschlaege.length} Bewegungen</h3><button type="button" class="x" data-zu aria-label="Schliessen">×</button></div>
      <div class="dlg-inhalt">
        <p class="hinweis">Schritt 2 von 2: Kategorien prüfen. Zahlungen, die zu einer offenen Rechnung passen, werden als bezahlt vermerkt statt neu gebucht. Den ganzen Import können Sie später unter „Importe“ wieder entfernen.</p>
        <div class="import-liste">${vorschlaege.map((v, i) => `<div class="import-zeile ${v.doppelt ? 'doppelt' : ''}">
          <input type="checkbox" data-i="${i}" checked aria-label="Übernehmen" />
          <div class="import-text"><b>${esc(v.partner || v.text || '—')}</b><small>${datumKurz(v.datum)} · ${esc((v.text || '').slice(0, 80))}${v.doppelt ? ' · schon importiert' : ''}</small></div>
          <div class="import-betrag ${v.typ === 'einnahme' ? 'plus' : ''}">${v.typ === 'einnahme' ? '+' : '−'} ${chf(v.betrag)}</div>
          ${v.rechnung ? `<div class="import-kat"><span class="marke marke-ok">Rechnung ${esc(v.rechnung.rechnungNr || '')} bezahlt</span></div>` : `<select class="auswahl-klein import-kat" data-kat="${i}" title="${v.gelernt ? 'Von früher gelernt' : 'Vorschlag'}">${optionen(v)}</select>${v.gelernt ? '<span class="marke marke-info" style="justify-self:end">gelernt</span>' : ''}`}
        </div>`).join('')}</div>
      </div>
      <div class="dlg-fuss"><div class="rechts"><button type="button" class="btn" data-zu>Abbrechen</button><button type="submit" class="btn btn-haupt">Ausgewählte übernehmen</button></div></div>
    </form>`;
    dlg.onclick = (e) => { if (e.target === dlg || e.target.closest('[data-zu]')) dlg.close(); };
    dlg.onchange = (e) => { const k = e.target.closest('[data-kat]'); if (k) { const v = vorschlaege[Number(k.dataset.kat)]; v.kategorie = k.value; v.geaendert = true;
      // Gleicher Partner weiter unten: gleich mitziehen, damit man nur einmal korrigieren muss
      const key = partnerSchluessel(v); if (key) vorschlaege.forEach((w, j) => { if (w !== v && !w.geaendert && !w.rechnung && w.typ === v.typ && partnerSchluessel(w) === key) { w.kategorie = v.kategorie; const sel = dlg.querySelector(`[data-kat="${j}"]`); if (sel) sel.value = v.kategorie; } }); } };
    dlg.oninput = null;
    $('iForm').onsubmit = async (e) => {
      e.preventDefault();
      const alleGewaehlt = [...dlg.querySelectorAll('input[data-i]:checked')].map((c) => vorschlaege[Number(c.dataset.i)]);
      const gewaehlt = alleGewaehlt.filter((v) => !istFest(v.datum));
      if (gewaehlt.length < alleGewaehlt.length) toast(`${alleGewaehlt.length - gewaehlt.length} Bewegungen liegen in der festgeschriebenen Zeit und wurden übersprungen`);
      const speichern = [], imp = 'imp' + Date.now().toString(36), impAm = new Date().toISOString(), impName = (datei.name || 'Bankauszug').slice(0, 80);
      for (const v of gewaehlt) {
        if (v.rechnung) { speichern.push({ ...v.rechnung, bezahlt: true, bezahltAm: v.datum, zahlung: 'Bank', importSchluessel: v.schluessel, bezahltImp: imp }); continue; }
        const liste2 = v.typ === 'ausgabe' ? KAT_AUS : KAT_EIN;
        const satz = v.mwstSatz != null ? v.mwstSatz : ((liste2.find((k) => k.id === v.kategorie) || {}).satz ?? 8.1);
        speichern.push({ typ: v.typ, quelle: 'bank', kategorie: v.kategorie, datum: v.datum, betragRappen: v.betrag, mwstSatz: satz, mwstRappen: mwstAus(v.betrag, satz),
          text: (v.text || '').slice(0, 120), partner: (v.partner || '').slice(0, 80), zahlung: 'Bank', importSchluessel: v.schluessel, imp, impAm, impName });
      }
      await Speicher.mehrereSpeichern('buchungen', speichern);
      const gelerntNeu = await regelnLernen(gewaehlt).catch(() => 0);
      if (gelerntNeu) setTimeout(() => toast(`✓ ${gelerntNeu} ${gelerntNeu === 1 ? 'Korrektur' : 'Korrekturen'} gemerkt: beim nächsten Auszug macht Ordasio das selbst`, 5000), 1500);
      dlg.close();
      const bezahlt = gewaehlt.filter((v) => v.rechnung).length;
      await neuLaden(`${speichern.length - bezahlt} Buchungen übernommen${bezahlt ? `, ${bezahlt} Rechnungen als bezahlt vermerkt` : ''}`);
      // Nach der allgemeinen Rückgängig-Meldung zeigen, damit diese länger stehen bleibt
      if (window.Rueckgaengig) setTimeout(() => Rueckgaengig.zeigen(`${speichern.length - bezahlt} Buchungen aus „${impName}“ übernommen`, () => importEntfernen(imp, true), 30000), 700);
    };
    dlg.showModal();
    if (!neu) toast('Alle Bewegungen sind schon importiert');
  }

  /* ================= Importe: jeden Bankauszug als Ganzes wieder entfernen ================= */
  function bankImportGruppen() {
    const g = new Map(), alt = [];
    for (const b of Z.buchungen) {
      if (b.imp) { if (!g.has(b.imp)) g.set(b.imp, { id: b.imp, name: b.impName || 'Bankauszug', am: b.impAm || b.geaendert || '', liste: [] }); g.get(b.imp).liste.push(b); }
      else if (b.quelle === 'bank' && b.geaendert) alt.push(b);
    }
    // Frühere Importe ohne Kennung: alle Bank-Buchungen, die innert Sekunden gespeichert wurden
    alt.sort((a, b) => String(a.geaendert).localeCompare(String(b.geaendert)));
    let akt = null;
    for (const b of alt) {
      const t = Date.parse(b.geaendert) || 0;
      if (akt && t - akt.ende < 20000) { akt.liste.push(b); akt.ende = t; }
      else { akt = { id: 'alt' + t, name: 'Früherer Bankimport', am: b.geaendert, ende: t, liste: [b] }; g.set(akt.id, akt); }
    }
    return [...g.values()].filter((x) => x.liste.length >= (String(x.id).startsWith('alt') ? 3 : 1)).sort((a, b) => String(b.am).localeCompare(String(a.am)));
  }
  async function importEntfernen(id, ohneFrage) {
    const g = bankImportGruppen().find((x) => x.id === id);
    const rech = Z.buchungen.filter((b) => b.bezahltImp === id);
    const liste = g ? g.liste : [];
    if (!liste.length && !rech.length) return false;
    const fest = liste.filter((b) => istFest(b.datum));
    if (!ohneFrage && !await UI.frage(`${liste.length - fest.length} Buchungen aus „${g ? g.name : 'Bankauszug'}“ entfernen?${fest.length ? ` ${fest.length} liegen in der festgeschriebenen Zeit und bleiben.` : ''} Sie finden sie danach unter „Zuletzt gelöscht“.`)) return false;
    const n = await Speicher.mehrereLoeschen('buchungen', liste.filter((b) => !istFest(b.datum)).map((b) => b.id));
    if (rech.length) await Speicher.mehrereSpeichern('buchungen', rech.map(({ bezahltImp, importSchluessel, ...r }) => ({ ...r, bezahlt: false, bezahltAm: '' })));
    await neuLaden(`${n} Buchungen entfernt${rech.length ? `, ${rech.length} Rechnungen wieder offen` : ''}`);
    return true;
  }
  function importeZeigen() {
    const dlg = $('dlg');
    const malen = () => {
      const g = bankImportGruppen();
      dlg.innerHTML = `<form method="dialog" class="import-form">
        <div class="dlg-kopf"><h3>Importe</h3><button type="button" class="x" data-zu aria-label="Schliessen">×</button></div>
        <div class="dlg-inhalt"><p class="hinweis">Jeder hochgeladene Bankauszug erscheint hier. Mit „Entfernen“ werden alle Buchungen dieses Imports gelöscht, zum Beispiel wenn falsche Zahlen übernommen wurden. Gelöschtes finden Sie unter „Zuletzt gelöscht“.</p>
        ${g.length ? g.map((x) => { const ein = x.liste.filter((b) => b.typ === 'einnahme').reduce((a, b) => a + b.betragRappen, 0), aus = x.liste.filter((b) => b.typ === 'ausgabe').reduce((a, b) => a + b.betragRappen, 0);
          const d = x.liste.map((b) => b.datum).sort();
          return `<div class="imp-zeile"><div><b>${esc(x.name)}</b><small>${x.am ? 'Hochgeladen ' + new Date(x.am).toLocaleString('de-CH', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' }) + ' · ' : ''}${x.liste.length} Buchungen · ${datumKurz(d[0])} bis ${datumKurz(d[d.length - 1])}<br>Einnahmen CHF ${chf(ein)} · Ausgaben CHF ${chf(aus)}</small></div><button type="button" class="btn btn-klein" data-imp-weg="${esc(x.id)}">Entfernen</button></div>`; }).join('')
          : '<p class="hinweis">Noch keine Bankauszüge importiert.</p>'}</div>
        <div class="dlg-fuss"><div class="rechts"><button type="button" class="btn" data-zu>Schliessen</button></div></div></form>`;
    };
    malen();
    dlg.onclick = async (e) => {
      if (e.target === dlg || e.target.closest('[data-zu]')) { dlg.close(); return; }
      const w = e.target.closest('[data-imp-weg]');
      if (w) { if (await importEntfernen(w.dataset.impWeg)) { if (bankImportGruppen().length) { malen(); if (!dlg.open) dlg.showModal(); } else dlg.close(); } }
    };
    dlg.onchange = null; dlg.oninput = null;
    if (!dlg.open) dlg.showModal();
  }

  /* ================= Kategorien anpassen ================= */
  function kategorienBearbeiten() {
    const dlg = $('dlg');
    let art = 'aus';
    const arbeit = { aus: KAT_AUS.map((k) => ({ ...k })), ein: KAT_EIN.map((k) => ({ ...k })) };
    const zeichnenK = () => {
      dlg.innerHTML = `<form method="dialog" id="kForm">
        <div class="dlg-kopf"><h3>Kategorien anpassen</h3><button type="button" class="x" data-zu aria-label="Schliessen">×</button></div>
        <div class="dlg-inhalt">
          <div class="segment"><button type="button" class="${art === 'aus' ? 'an' : ''}" data-kart="aus">Ausgaben</button><button type="button" class="${art === 'ein' ? 'an' : ''}" data-kart="ein">Einnahmen</button></div>
          <p class="hinweis abstand">Umbenennen, Farbe wählen oder ausblenden. Ausgeblendete Kategorien bleiben bei alten Buchungen erhalten.</p>
          <div class="kat-edit">${arbeit[art].map((k, i) => `<div class="kat-edit-zeile ${k.versteckt ? 'aus' : ''}">
            <input type="color" value="${k.farbe || '#0E7A55'}" data-kfarbe="${i}" aria-label="Farbe" />
            <input type="text" value="${esc(k.name)}" data-kname="${i}" aria-label="Name" />
            <select class="auswahl-klein" data-ksatz="${i}" aria-label="MWST-Satz">${SAETZE.map((s2) => `<option value="${s2}" ${Number(k.satz) === s2 ? 'selected' : ''}>${s2 ? s2.toFixed(1) + ' %' : 'ohne'}</option>`).join('')}</select>
            <label class="haken klein"><input type="checkbox" data-ksicht="${i}" ${k.versteckt ? '' : 'checked'} />sichtbar</label>
          </div>`).join('')}</div>
          <button type="button" class="btn btn-klein abstand" data-kneu>+ Kategorie hinzufügen</button>
        </div>
        <div class="dlg-fuss"><button type="button" class="btn" data-kstandard>Standard wiederherstellen</button><div class="rechts"><button type="button" class="btn" data-zu>Abbrechen</button><button type="submit" class="btn btn-haupt">Speichern</button></div></div>
      </form>`;
      $('kForm').onsubmit = async (e) => {
        e.preventDefault();
        await einstSpeichern({ kategorien: { aus: arbeit.aus, ein: arbeit.ein } });
        dlg.close(); zeichnen(); toast('Kategorien gespeichert');
      };
    };
    dlg.oninput = (e) => {
      const t = e.target, l = arbeit[art];
      if (t.dataset.kname != null) l[t.dataset.kname].name = t.value;
      if (t.dataset.kfarbe != null) l[t.dataset.kfarbe].farbe = t.value;
    };
    dlg.onchange = (e) => {
      const t = e.target, l = arbeit[art];
      if (t.dataset.ksatz != null) l[t.dataset.ksatz].satz = Number(t.value);
      if (t.dataset.ksicht != null) { l[t.dataset.ksicht].versteckt = !t.checked; t.closest('.kat-edit-zeile').classList.toggle('aus', !t.checked); }
    };
    dlg.onclick = async (e) => {
      if (e.target === dlg || e.target.closest('[data-zu]')) { dlg.close(); return; }
      const t = e.target.closest('button'); if (!t) return;
      if (t.dataset.kart) { art = t.dataset.kart; zeichnenK(); }
      if (t.matches('[data-kneu]')) { arbeit[art].push({ id: 'eigen-' + Date.now(), name: 'Neue Kategorie', satz: 8.1, ziffer: 405, farbe: FARBEN[arbeit[art].length % FARBEN.length], eigen: true }); zeichnenK(); dlg.querySelector('.kat-edit-zeile:last-child input[type=text]').select(); }
      if (t.matches('[data-kstandard]') && await UI.frage('Alle Kategorien auf den Standard zurücksetzen? Eigene Kategorien bleiben bei alten Buchungen erhalten.')) {
        await einstSpeichern({ kategorien: {} }); dlg.close(); zeichnen(); toast('Standard wiederhergestellt');
      }
    };
    zeichnenK();
    dlg.showModal();
  }

  /* ================= Belege per Drag & Drop ================= */
  // Dateien irgendwo auf die Buchhaltung ziehen: Bilder und PDF werden Belege, camt/CSV/Excel ein Bankauszug
  (() => {
    let tiefe = 0;
    const hatDateien = (e) => e.dataTransfer && [...(e.dataTransfer.types || [])].includes('Files');
    const decke = () => { let d = document.getElementById('ablegen'); if (!d) { d = document.createElement('div'); d.id = 'ablegen'; d.innerHTML = '<div><b>Dateien hier ablegen</b><span>Belege (Foto, PDF) oder Bankauszug (camt, CSV, Excel)</span></div>'; document.body.appendChild(d); } return d; };
    const offen = () => document.querySelector('dialog[open]');
    document.addEventListener('dragenter', (e) => { if (!hatDateien(e) || offen()) return; tiefe++; decke().classList.add('zeigen'); });
    document.addEventListener('dragleave', () => { if (--tiefe <= 0) { tiefe = 0; decke().classList.remove('zeigen'); } });
    document.addEventListener('dragover', (e) => { if (hatDateien(e) && !offen()) e.preventDefault(); });
    document.addEventListener('drop', async (e) => {
      if (!hatDateien(e) || offen()) return;
      e.preventDefault(); tiefe = 0; decke().classList.remove('zeigen');
      const alle = [...e.dataTransfer.files];
      const belege = alle.filter((d) => /^image\//.test(d.type) || /\.(pdf|jpe?g|png|heic|webp)$/i.test(d.name));
      const bank = alle.filter((d) => /\.(xml|csv|txt|xlsx?|053)$/i.test(d.name));
      if (bank.length === 1 && !belege.length) { bankImport(bank[0]); return; }
      if (belege.length) { await belegeStapel(belege); return; }
      toast('Diese Datei kann ich nicht übernehmen. Belege als Foto oder PDF, Bankauszüge als camt, CSV oder Excel.');
    });
  })();

  /* ================= Belege stapelweise hochladen ================= */
  function mehrereDateien(accept) {
    return new Promise((ok) => {
      const inp = document.createElement('input');
      inp.type = 'file'; inp.multiple = true; inp.accept = accept;
      inp.onchange = () => ok([...inp.files]);
      inp.click();
    });
  }
  async function belegeStapel(vorgabe) {
    const dateien = vorgabe || await mehrereDateien('image/*,application/pdf');
    if (!dateien.length) return;
    let i = 0;
    for (const d of dateien) {
      i++;
      const x = await belegVorbereiten(d);
      const zu = new Promise((ok) => $('dlg').addEventListener('close', ok, { once: true }));
      await buchungBearbeiten(null, { _beleg: x, _titel: `Beleg ${i} von ${dateien.length}`, text: d.name.replace(/\.[^.]+$/, '').replace(/[_-]+/g, ' ') });
      await zu;
    }
    toast(`${dateien.length} ${dateien.length === 1 ? 'Beleg' : 'Belege'} bearbeitet`);
  }

  /* ================= Löhne ================= */
  // Sätze 2026 als Vorgabe; jede Firma passt sie an ihre Ausgleichskasse und Versicherungen an.
  const LOHN_SAETZE_STD = { ahv: 5.3, alv: 1.1, alvGrenze: 148200, nbu: 1.2, ktg: 0.6, agAhv: 5.3, agAlv: 1.1, fak: 1.0, vk: 0.3, bu: 0.4, agKtg: 0.6 };
  const LOHN_SAETZE_TEXT = { ahv: 'AHV/IV/EO Arbeitnehmer %', alv: 'ALV Arbeitnehmer %', alvGrenze: 'ALV-Grenze CHF pro Jahr', nbu: 'Nichtberufsunfall (NBU) %', ktg: 'Krankentaggeld Arbeitnehmer %',
    agAhv: 'AHV/IV/EO Arbeitgeber %', agAlv: 'ALV Arbeitgeber %', fak: 'Familienausgleichskasse (FAK) %', vk: 'Verwaltungskosten Ausgleichskasse %', bu: 'Berufsunfall (BU) %', agKtg: 'Krankentaggeld Arbeitgeber %' };
  const lohnSaetze = () => ({ ...LOHN_SAETZE_STD, ...(Z.einst.lohnSaetze || {}) });
  const mitarbeiterListe = () => Z.einst.mitarbeiter || [];
  const lohnEingabe = (monat, id) => (((Z.einst.lohnlaeufe || {})[monat] || {})[id]) || {};
  const r5 = (x) => Math.round(x / 5) * 5;
  const monatName = (m) => new Date(m + '-15').toLocaleDateString('de-CH', { month: 'long', year: 'numeric' });
  function lohnBerechnen(m, e = {}) {
    const S = lohnSaetze();
    const grundRoh = m.lohnart === 'stunde' ? Math.round((Number(e.stunden) || 0) * (m.lohn || 0)) : Math.round((m.lohn || 0) * (Number(m.pensum) || 100) / 100);
    const kuerzung = Math.min(Math.max(Number(e.kuerzung) || 0, 0), grundRoh);
    const grund = grundRoh - kuerzung;
    const taggeld = Math.max(Number(e.taggeld) || 0, 0);
    const ferien = m.lohnart === 'stunde' ? r5(grund * (Number(m.ferienPct) || 0) / 100) : 0;
    const bonus = Number(e.bonus) || 0;
    const brutto = grund + ferien + bonus;
    const zulagen = e.zulagen != null && e.zulagen !== '' ? Number(e.zulagen) : (Number(m.zulagen) || 0);
    const spesen = Number(e.spesen) || 0;
    const pct = (b, p) => r5(b * (Number(p) || 0) / 100);
    const alvBasis = Math.min(brutto, Math.round(S.alvGrenze * 100 / 12));
    const an = { ahv: pct(brutto, S.ahv), alv: pct(alvBasis, S.alv), nbu: pct(brutto, S.nbu), ktg: pct(brutto, S.ktg), bvg: Number(m.bvg) || 0, qst: pct(brutto, m.qst) };
    const abzuege = Object.values(an).reduce((a, x) => a + x, 0);
    const ag = { ahv: pct(brutto, S.agAhv), alv: pct(alvBasis, S.agAlv), fak: pct(brutto, S.fak), vk: pct(brutto, S.vk), bu: pct(brutto, S.bu), ktg: pct(brutto, S.agKtg), bvg: m.bvgAg != null && m.bvgAg !== '' ? Number(m.bvgAg) : (Number(m.bvg) || 0) };
    const agTotal = Object.values(ag).reduce((a, x) => a + x, 0);
    return { grundRoh, kuerzung, grund, ferien, bonus, brutto, zulagen, taggeld, spesen, an, abzuege, netto: brutto - abzuege + zulagen + taggeld + spesen, ag, agTotal };
  }
  const chfFeld = (r) => (r ? chf(r).replace(/’/g, '') : '');

  function loehneAnsicht() {
    const monat = Z.lohnMonat, jahr = monat.slice(0, 4), S = lohnSaetze();
    const aktive = mitarbeiterListe().filter((m) => m.aktiv !== false);
    const zeilenL = aktive.map((m) => ({ m, e: lohnEingabe(monat, m.id), r: lohnBerechnen(m, lohnEingabe(monat, m.id)) }));
    const summe = (f) => zeilenL.reduce((a, z) => a + f(z.r), 0);
    const gebucht = Z.buchungen.some((b) => b.quelle === 'lohn' && b.lohnMonat === monat);
    const jahrZeilen = mitarbeiterListe().map((m) => {
      const t = { brutto: 0, sozial: 0, bvg: 0, qst: 0, zulagen: 0, taggeld: 0, spesen: 0, netto: 0, monate: 0 };
      for (let i = 1; i <= 12; i++) {
        const mo = `${jahr}-${String(i).padStart(2, '0')}`;
        if (!Z.buchungen.some((b) => b.quelle === 'lohn' && b.lohnMonat === mo && b.partner === m.name)) continue;
        const r = lohnBerechnen(m, lohnEingabe(mo, m.id));
        t.brutto += r.brutto; t.sozial += r.an.ahv + r.an.alv + r.an.nbu + r.an.ktg; t.bvg += r.an.bvg; t.qst += r.an.qst;
        t.zulagen += r.zulagen; t.taggeld += r.taggeld; t.spesen += r.spesen; t.netto += r.netto; t.monate++;
      }
      return { m, t };
    }).filter((x) => x.t.monate);
    return `
    <div class="kopf">
      <div><h1>Löhne</h1><p class="unter">Lohnabrechnungen, Sozialabzüge und Jahresübersicht für den Lohnausweis</p></div>
      <div class="kopf-aktionen"><input type="month" class="auswahl-klein" data-lohnmonat value="${monat}" /><button class="btn" onclick="NB.mitarbeiter()">+ Mitarbeiter</button></div>
    </div>
    ${aktive.length ? `<div class="card">
      <h2>Lohnlauf ${monatName(monat)} ${gebucht ? '<span class="marke marke-ok">gebucht</span>' : ''}</h2>
      <div class="tabelle-scroll"><table class="lohn-tabelle">
        <tr><th>Mitarbeiter</th><th>Stunden</th><th class="b">Bonus</th><th class="b">Spesen</th><th class="b">Brutto</th><th class="b">Abzüge</th><th class="b">Auszahlung</th></tr>
        ${zeilenL.map(({ m, e, r }) => `<tr>
          <td><b>${esc(m.name)}</b>${e.gesendet ? ' <span class="marke marke-ok">gesendet</span>' : ''}<br><span class="hinweis">${m.lohnart === 'stunde' ? `${chf(m.lohn)} pro Stunde` : `${chf(m.lohn)} pro Monat · ${m.pensum || 100} %`}${r.taggeld ? ` · Taggeld ${chf(r.taggeld)}` : ''}${r.kuerzung ? ` · Kürzung ${chf(r.kuerzung)}` : ''}${e.notiz ? ' · Text' : ''}</span><div class="lohn-knoepfe"><button class="btn btn-klein" onclick="NB.lohnDetails('${m.id}')">Details</button><button class="btn btn-klein" onclick="NB.lohnzettel('${m.id}')">Abrechnung</button><button class="btn btn-klein" onclick="NB.lohnMail('${m.id}')">E-Mail</button></div></td>
          <td>${m.lohnart === 'stunde' ? `<input class="bilanz-eingabe klein" inputmode="decimal" data-lohn="${m.id}:stunden" value="${e.stunden || ''}" placeholder="0" />` : '<span class="hinweis">Monatslohn</span>'}</td>
          <td class="b"><input class="bilanz-eingabe klein" inputmode="decimal" data-lohn="${m.id}:bonus" value="${chfFeld(e.bonus)}" placeholder="0.00" /></td>
          <td class="b"><input class="bilanz-eingabe klein" inputmode="decimal" data-lohn="${m.id}:spesen" value="${chfFeld(e.spesen)}" placeholder="0.00" /></td>
          <td class="b">${chf(r.brutto)}</td><td class="b">− ${chf(r.abzuege)}</td><td class="b"><b>${chf(r.netto)}</b></td>
</tr>`).join('')}
        <tr class="summe"><td>Total</td><td></td><td></td><td class="b">${chf(summe((r) => r.spesen))}</td><td class="b">${chf(summe((r) => r.brutto))}</td><td class="b">− ${chf(summe((r) => r.abzuege))}</td><td class="b">${chf(summe((r) => r.netto))}</td></tr>
      </table></div>
      <p class="hinweis abstand">Arbeitgeberbeiträge dazu: <strong>CHF ${chf(summe((r) => r.agTotal))}</strong>. Lohnkosten total: <strong>CHF ${chf(summe((r) => r.brutto + r.agTotal + r.spesen))}</strong>.</p>
      <label class="feld abstand"><span class="hinweis">Text auf allen Abrechnungen ${esc(monatName(monat))} (optional)</span><textarea rows="2" data-lohntext="${monat}" placeholder="z. B. Wir wünschen Ihnen frohe Festtage. Der 13. Monatslohn folgt im Dezember.">${esc((Z.einst.lohnTexte || {})[monat] || '')}</textarea></label>
      <div class="abstand" style="display:flex;gap:8px;flex-wrap:wrap"><button class="btn btn-haupt" onclick="NB.lohnBuchen()">${gebucht ? 'Lohnlauf neu buchen' : 'Lohnlauf buchen'}</button><button class="btn" onclick="NB.lohnCsv()">Excel</button><span class="hinweis" style="align-self:center">Bucht Löhne, Arbeitgeberbeiträge und Spesen als Ausgaben. Erneut buchen ersetzt den Monat.</span></div>
    </div>` : `<div class="card leer-karte"><h2>Noch keine Mitarbeiter</h2><p class="hinweis">Erfassen Sie Ihre Mitarbeiter mit Monats- oder Stundenlohn. Danach rechnet das Programm jeden Monat Brutto, AHV, ALV, Unfall, Pensionskasse und Auszahlung.</p><button class="btn btn-haupt abstand" onclick="NB.mitarbeiter()">+ Ersten Mitarbeiter erfassen</button></div>`}
    <div class="raster raster-2 abstand">
      <div class="card"><h2>Mitarbeiter</h2>
        ${mitarbeiterListe().length ? `<div class="liste">${mitarbeiterListe().map((m) => `<div class="zeile" data-mitarbeiter="${m.id}"><div class="datum">${m.aktiv === false ? 'ausgetreten' : (m.eintritt ? datumKurz(m.eintritt) : '')}</div><div style="min-width:0"><div class="titel">${esc(m.name)}</div><div class="info"><span>${m.lohnart === 'stunde' ? 'Stundenlohn' : 'Monatslohn'}</span>${m.ahvNr ? `<span>${esc(m.ahvNr)}</span>` : ''}</div></div><div class="betrag">${chf(m.lohn)}</div></div>`).join('')}</div>` : '<p class="leer">Noch niemand erfasst.</p>'}
      </div>
      <div class="card"><h2>Jahresübersicht ${jahr}</h2>
        ${jahrZeilen.length ? `<div class="tabelle-scroll"><table>
          <tr><th>Name</th><th class="b">Brutto</th><th class="b">Sozialabz.</th><th class="b">BVG</th><th class="b">Netto</th></tr>
          ${jahrZeilen.map(({ m, t }) => `<tr><td>${esc(m.name)}<br><span class="hinweis">${t.monate} Monate${t.qst ? ` · QST ${chf(t.qst)}` : ''}${t.taggeld ? ` · Taggeld ${chf(t.taggeld)}` : ''}${t.spesen ? ` · Spesen ${chf(t.spesen)}` : ''}</span><div class="lohn-knoepfe"><button class="btn btn-klein" onclick="NB.lohnkonto('${m.id}')">Lohnkonto</button><button class="btn btn-klein" onclick="NB.lohnausweis('${m.id}')">Lohnausweis</button></div></td><td class="b">${chf(t.brutto)}</td><td class="b">${chf(t.sozial)}</td><td class="b">${chf(t.bvg)}</td><td class="b">${chf(t.netto)}</td></tr>`).join('')}
        </table></div><p class="hinweis abstand">Lohnkonto und Lohnausweis enthalten alle gebuchten Monate ${jahr}. <button class="link" onclick="NB.lohnJahrCsv()">Jahresübersicht als Excel</button></p>` : '<p class="leer">Noch keine gebuchten Lohnläufe in diesem Jahr.</p>'}
      </div>
    </div>
    <div class="card abstand"><h2>Sätze für Sozialversicherungen</h2>
      <p class="hinweis" style="margin-bottom:10px">Vorgaben für 2026. Bitte mit Ihrer Ausgleichskasse, Unfallversicherung und Krankentaggeld-Versicherung abgleichen und anpassen.</p>
      <div class="saetze-raster">${Object.keys(LOHN_SAETZE_STD).map((k) => `<label class="feld"><span class="hinweis">${LOHN_SAETZE_TEXT[k]}</span><input type="text" inputmode="decimal" data-lohnsatz="${k}" value="${S[k]}" /></label>`).join('')}</div>
      <label class="feld abstand"><span class="hinweis">Lohnabrechnungen zusätzlich senden an (z. B. Treuhänder, mehrere mit Komma)</span><input type="text" inputmode="email" data-lohnkopie value="${esc(Z.einst.lohnKopie || '')}" placeholder="treuhand@beispiel.ch" /></label>
    </div>`;
  }
  document.addEventListener('change', async (e) => {
    const t = e.target;
    if (t.matches('[data-lohnmonat]')) { Z.lohnMonat = t.value || Z.lohnMonat; zeichnen(); return; }
    if (t.matches('[data-lohnsatz]')) {
      const v = Number(String(t.value).replace(',', '.'));
      await einstSpeichern({ lohnSaetze: { ...(Z.einst.lohnSaetze || {}), [t.dataset.lohnsatz]: Number.isFinite(v) ? v : LOHN_SAETZE_STD[t.dataset.lohnsatz] } });
      zeichnen(); toast('Satz gespeichert'); return;
    }
    if (t.matches('[data-lohntext]')) { await einstSpeichern({ lohnTexte: { ...(Z.einst.lohnTexte || {}), [t.dataset.lohntext]: t.value.trim() } }); toast('Text gespeichert'); return; }
    if (t.matches('[data-lohnkopie]')) { await einstSpeichern({ lohnKopie: t.value.trim() }); toast('Gespeichert'); return; }
    if (t.matches('[data-lohn]')) {
      const [id, feld] = t.dataset.lohn.split(':');
      const v = feld === 'stunden' ? Number(String(t.value).replace(',', '.')) || 0 : (Number.isFinite(betragLesen(t.value)) ? betragLesen(t.value) : 0);
      const laeufe = { ...(Z.einst.lohnlaeufe || {}) };
      laeufe[Z.lohnMonat] = { ...(laeufe[Z.lohnMonat] || {}), [id]: { ...lohnEingabe(Z.lohnMonat, id), [feld]: v } };
      await einstSpeichern({ lohnlaeufe: laeufe });
      zeichnen();
    }
  });
  document.addEventListener('click', (e) => {
    const z = e.target.closest('[data-mitarbeiter]');
    if (z) mitarbeiterBearbeiten(mitarbeiterListe().find((m) => m.id === z.dataset.mitarbeiter));
  });

  function mitarbeiterBearbeiten(vorhanden) {
    const m = vorhanden ? { ...vorhanden } : { id: 'ma-' + Date.now(), lohnart: 'monat', pensum: 100, aktiv: true, eintritt: heute() };
    const dlg = $('dlg');
    const f = (id, label, wert, typ = 'text', extra = '') => `<div class="feld"><label for="m_${id}">${label}</label><input type="${typ}" id="m_${id}" value="${esc(wert ?? '')}" ${extra} /></div>`;
    dlg.innerHTML = `<form method="dialog" id="mForm">
      <div class="dlg-kopf"><h3>${vorhanden ? esc(m.name) : 'Neuer Mitarbeiter'}</h3><button type="button" class="x" data-zu aria-label="Schliessen">×</button></div>
      <div class="dlg-inhalt">
        ${f('name', 'Vor- und Nachname', m.name, 'text', 'required')}
        <div class="feld-zeile">${f('strasse', 'Strasse und Nr.', m.strasse)}${f('ort', 'PLZ und Ort', m.ort)}</div>
        <div class="feld-zeile">${f('ahvNr', 'AHV-Nummer', m.ahvNr, 'text', 'placeholder="756.0000.0000.00"')}${f('eintritt', 'Eintritt', m.eintritt, 'date')}</div>
        <div class="feld-zeile">
          <div class="feld"><label for="m_lohnart">Lohnart</label><select id="m_lohnart"><option value="monat" ${m.lohnart !== 'stunde' ? 'selected' : ''}>Monatslohn</option><option value="stunde" ${m.lohnart === 'stunde' ? 'selected' : ''}>Stundenlohn</option></select></div>
          ${f('lohn', m.lohnart === 'stunde' ? 'Lohn pro Stunde (CHF)' : 'Monatslohn 100 % (CHF)', chfFeld(m.lohn), 'text', 'inputmode="decimal" required')}
        </div>
        <div class="feld-zeile">${f('pensum', 'Pensum in % (Monatslohn)', m.pensum, 'text', 'inputmode="decimal"')}${f('ferienPct', 'Ferienzuschlag in % (Stundenlohn)', m.ferienPct ?? 8.33, 'text', 'inputmode="decimal"')}</div>
        <div class="feld-zeile">${f('bvg', 'Pensionskasse Arbeitnehmer (CHF/Monat)', chfFeld(m.bvg), 'text', 'inputmode="decimal"')}${f('bvgAg', 'Pensionskasse Arbeitgeber (CHF/Monat)', chfFeld(m.bvgAg), 'text', 'inputmode="decimal" placeholder="gleich wie Arbeitnehmer"')}</div>
        <div class="feld-zeile">${f('zulagen', 'Kinder- und Familienzulagen (CHF/Monat)', chfFeld(m.zulagen), 'text', 'inputmode="decimal"')}${f('qst', 'Quellensteuer in %', m.qst, 'text', 'inputmode="decimal" placeholder="nur falls quellensteuerpflichtig"')}</div>
        <div class="feld-zeile">${f('iban', 'IBAN für die Auszahlung', m.iban)}${f('mail', 'E-Mail für Lohnabrechnungen', m.mail, 'text', 'inputmode="email" placeholder="mehrere mit Komma trennen"')}</div>
        <label class="haken"><input type="checkbox" id="m_aktiv" ${m.aktiv !== false ? 'checked' : ''} /> Arbeitet zurzeit bei uns</label>
      </div>
      <div class="dlg-fuss">${vorhanden ? '<button type="button" class="btn btn-rot" data-ma-weg>Löschen</button>' : ''}<div class="rechts"><button type="button" class="btn" data-zu>Abbrechen</button><button type="submit" class="btn btn-haupt">Speichern</button></div></div>
    </form>`;
    dlg.oninput = null;
    dlg.onchange = (e) => { if (e.target.id === 'm_lohnart') $('m_lohn').previousElementSibling.textContent = e.target.value === 'stunde' ? 'Lohn pro Stunde (CHF)' : 'Monatslohn 100 % (CHF)'; };
    dlg.onclick = async (e) => {
      if (e.target === dlg || e.target.closest('[data-zu]')) { dlg.close(); return; }
      if (e.target.closest('[data-ma-weg]') && await UI.frage(`${m.name} löschen? Gebuchte Löhne bleiben in der Buchhaltung.`)) {
        await einstSpeichern({ mitarbeiter: mitarbeiterListe().filter((x) => x.id !== m.id) }); dlg.close(); zeichnen();
      }
    };
    $('mForm').onsubmit = async (e) => {
      e.preventDefault();
      const z = (id) => { const r = betragLesen($('m_' + id).value); return Number.isFinite(r) ? r : 0; };
      const zahlF = (id) => { const v = Number(String($('m_' + id).value).replace(',', '.')); return Number.isFinite(v) ? v : 0; };
      Object.assign(m, { name: $('m_name').value.trim(), strasse: $('m_strasse').value.trim(), ort: $('m_ort').value.trim(), ahvNr: $('m_ahvNr').value.trim(),
        eintritt: $('m_eintritt').value, lohnart: $('m_lohnart').value, lohn: z('lohn'), pensum: zahlF('pensum') || 100, ferienPct: zahlF('ferienPct'),
        bvg: z('bvg'), bvgAg: $('m_bvgAg').value.trim() ? z('bvgAg') : '', zulagen: z('zulagen'), qst: zahlF('qst'), iban: $('m_iban').value.trim(), mail: $('m_mail').value.trim(), aktiv: $('m_aktiv').checked });
      if (!m.name) { $('m_name').focus(); return; }
      const liste = mitarbeiterListe().filter((x) => x.id !== m.id);
      await einstSpeichern({ mitarbeiter: [...liste, m] });
      dlg.close(); zeichnen(); toast('Mitarbeiter gespeichert');
    };
    dlg.showModal();
  }

  async function lohnBuchen() {
    const monat = Z.lohnMonat;
    const ende = new Date(Number(monat.slice(0, 4)), Number(monat.slice(5, 7)), 0).toLocaleDateString('sv-SE');
    const name = monatName(monat);
    if (istFest(ende)) { toast(`${name} ist festgeschrieben und kann nicht mehr gebucht werden.`); return; }
    const alt = Z.buchungen.filter((b) => b.quelle === 'lohn' && b.lohnMonat === monat);
    for (const b of alt) await Speicher.loeschen('buchungen', b.id);
    let n = 0;
    for (const m of mitarbeiterListe().filter((x) => x.aktiv !== false)) {
      const r = lohnBerechnen(m, lohnEingabe(monat, m.id));
      if (!r.brutto) continue;
      const basis = { typ: 'ausgabe', quelle: 'lohn', lohnMonat: monat, datum: ende, mwstSatz: 0, mwstRappen: 0, partner: m.name, zahlung: 'Bank' };
      await Speicher.speichern('buchungen', { ...basis, id: `lohn-${monat}-${m.id}`, kategorie: 'loehne', betragRappen: r.brutto + r.zulagen + r.taggeld, anAbzuege: r.abzuege, text: `Lohn ${name}` });
      if (r.agTotal) await Speicher.speichern('buchungen', { ...basis, id: `lohn-ag-${monat}-${m.id}`, kategorie: 'sozial', betragRappen: r.agTotal, text: `Arbeitgeberbeiträge ${name}` });
      if (r.spesen) await Speicher.speichern('buchungen', { ...basis, id: `lohn-sp-${monat}-${m.id}`, kategorie: 'spesen', betragRappen: r.spesen, text: `Spesen ${name}` });
      n++;
    }
    await neuLaden(n ? `Lohnlauf ${name} gebucht (${n} ${n === 1 ? 'Person' : 'Personen'})` : 'Keine Löhne zu buchen');
  }

  /* ---------- Lohnabrechnung, Lohnkonto, Lohnausweis ---------- */
  const firmaDaten = () => { const F = (window.Marke && Marke.daten()) || {}; return { ...F, name: F.name || firmenName() || 'Firma', farbe: F.farbe1 || '#0B3B2E' }; };
  const lohnText = (monat) => (Z.einst.lohnTexte || {})[monat] || '';
  const absatz = (t) => esc(t).replace(/\n/g, '<br>');
  const DRUCK_STIL = (farbe) => `body{font:13px/1.5 -apple-system,system-ui,"Segoe UI",sans-serif;color:#0A1F17;margin:0;padding:16mm;background:#fff}
    h1{font-size:24px;margin:22px 0 2px;color:${farbe}}h2{font-size:15px;margin:18px 0 6px}
    .kopf{display:flex;justify-content:space-between;align-items:flex-start;border-top:6px solid ${farbe};padding-top:12px}.kopf img{max-height:46px;max-width:200px}
    .an{margin-top:22px;line-height:1.45}table{width:100%;border-collapse:collapse;margin-top:14px}td,th{padding:5px 4px;border-bottom:1px solid #E3E6EF;text-align:left}
    .b{text-align:right;font-variant-numeric:tabular-nums;white-space:nowrap}th{font-size:11px;color:#5B6478;font-weight:600}
    tr.s td{font-weight:700;border-top:2px solid #0A1F17;border-bottom:0;padding-top:8px}tr.t td{font-weight:700;font-size:16px;color:${farbe}}.h{color:#7C8499;font-size:11.5px}
    .text{margin-top:16px;padding:10px 12px;background:#F4F6F9;border-radius:8px}.nicht-drucken{margin:0 0 14px;display:flex;gap:8px;flex-wrap:wrap}
    .nicht-drucken a,.nicht-drucken button{font:600 13px system-ui;padding:8px 14px;border-radius:8px;border:1px solid #CBD2DE;background:#fff;color:#0A1F17;text-decoration:none;cursor:pointer}
    @media print{body{padding:10mm}.nicht-drucken{display:none}}`;
  function firmenKopf(F, rechts) {
    return `<div class="kopf"><div>${F.logo ? `<img src="${F.logo}" alt="">` : `<b style="font-size:19px">${esc(F.name)}</b>`}<div class="h">${esc([F.strasse, F.ort].filter(Boolean).join(', '))}</div></div><div class="h" style="text-align:right">${rechts}</div></div>`;
  }
  function lohnzettelDoc(m, monat, drucken) {
    const e = lohnEingabe(monat, m.id), r = lohnBerechnen(m, e), S = lohnSaetze(), F = firmaDaten();
    const z = (t, b, neg) => `<tr><td>${t}</td><td class="b">${neg ? '−' : ''} ${chf(b)}</td></tr>`;
    const texte = [lohnText(monat), e.notiz].filter(Boolean);
    return `<!doctype html><html lang="de-CH"><head><meta charset="utf-8"><title>Lohnabrechnung ${esc(m.name)} ${monat}</title><style>${DRUCK_STIL(F.farbe)}</style></head><body>
      ${firmenKopf(F, `Lohnabrechnung<br>${esc(monatName(monat))}`)}
      <div class="an"><b>${esc(m.name)}</b><br>${esc(m.strasse || '')}<br>${esc(m.ort || '')}${m.ahvNr ? `<br><span class="h">AHV-Nr. ${esc(m.ahvNr)}</span>` : ''}</div>
      <h1>Lohnabrechnung ${esc(monatName(monat))}</h1>
      <table>
        ${m.lohnart === 'stunde' ? z(`Stundenlohn ${e.stunden || 0} h × ${chf(m.lohn)}`, r.grundRoh) : z(`Monatslohn${(m.pensum || 100) !== 100 ? ` (${m.pensum} %)` : ''}`, r.grundRoh)}
        ${r.kuerzung ? z('Lohnkürzung wegen Abwesenheit', r.kuerzung, 1) : ''}
        ${r.ferien ? z(`Ferienentschädigung ${m.ferienPct} %`, r.ferien) : ''}
        ${r.bonus ? z('Bonus / Zulage', r.bonus) : ''}
        <tr class="s"><td>Bruttolohn</td><td class="b">${chf(r.brutto)}</td></tr>
        ${z(`AHV/IV/EO ${S.ahv} %`, r.an.ahv, 1)}${z(`ALV ${S.alv} %`, r.an.alv, 1)}${r.an.nbu ? z(`Nichtberufsunfall ${S.nbu} %`, r.an.nbu, 1) : ''}${r.an.ktg ? z(`Krankentaggeld ${S.ktg} %`, r.an.ktg, 1) : ''}
        ${r.an.bvg ? z('Pensionskasse (BVG)', r.an.bvg, 1) : ''}${r.an.qst ? z(`Quellensteuer ${m.qst} %`, r.an.qst, 1) : ''}
        <tr class="s"><td>Nettolohn</td><td class="b">${chf(r.brutto - r.abzuege)}</td></tr>
        ${r.zulagen ? z('Kinder- und Familienzulagen', r.zulagen) : ''}${r.taggeld ? z('Versicherungstaggeld (Unfall/Krankheit)', r.taggeld) : ''}${r.spesen ? z('Spesen', r.spesen) : ''}
        <tr class="s t"><td>Auszahlung</td><td class="b">CHF ${chf(r.netto)}</td></tr>
      </table>
      ${m.iban ? `<p class="h" style="margin-top:12px">Überweisung auf ${esc(m.iban)}</p>` : ''}
      ${texte.length ? `<div class="text">${texte.map(absatz).join('<br><br>')}</div>` : ''}
      ${drucken ? '<script>setTimeout(function(){window.print()},300)<\/script>' : ''}</body></html>`;
  }
  function druckFenster(html) {
    const w = window.open('', '_blank');
    if (!w) { toast('Bitte Pop-ups für diese Seite erlauben'); return; }
    w.document.write(html); w.document.close();
  }
  function lohnzettel(id) {
    const m = mitarbeiterListe().find((x) => x.id === id);
    if (m) druckFenster(lohnzettelDoc(m, Z.lohnMonat, true));
  }

  async function lohnEingabeSetzen(monat, id, teil) {
    const laeufe = { ...(Z.einst.lohnlaeufe || {}) };
    laeufe[monat] = { ...(laeufe[monat] || {}), [id]: { ...lohnEingabe(monat, id), ...teil } };
    await einstSpeichern({ lohnlaeufe: laeufe });
  }
  function lohnDetails(id) {
    const m = mitarbeiterListe().find((x) => x.id === id); if (!m) return;
    const monat = Z.lohnMonat, e = lohnEingabe(monat, id), dlg = $('dlg');
    const f = (k, label, wert, extra = '') => `<div class="feld"><label for="ld_${k}">${label}</label><input type="text" id="ld_${k}" inputmode="decimal" value="${esc(wert)}" ${extra} /></div>`;
    dlg.innerHTML = `<form method="dialog" id="ldForm">
      <div class="dlg-kopf"><h3>${esc(m.name)} · ${esc(monatName(monat))}</h3><button type="button" class="x" data-zu aria-label="Schliessen">×</button></div>
      <div class="dlg-inhalt">
        <div class="feld-zeile">${f('bonus', 'Bonus / Zulage (CHF)', chfFeld(e.bonus), 'placeholder="0.00"')}${f('spesen', 'Spesen (CHF)', chfFeld(e.spesen), 'placeholder="0.00"')}</div>
        <div class="feld-zeile">${f('taggeld', 'Versicherungstaggeld Unfall/Krankheit (CHF)', chfFeld(e.taggeld), 'placeholder="0.00"')}${f('kuerzung', 'Lohnkürzung wegen Abwesenheit (CHF)', chfFeld(e.kuerzung), 'placeholder="0.00"')}</div>
        <p class="hinweis">Taggelder der Unfall- oder Krankentaggeld-Versicherung sind nicht AHV-pflichtig. Sie werden ohne Sozialabzüge ausbezahlt. Die Erstattung der Versicherung buchen Sie als Einnahme, wenn sie eintrifft.</p>
        <div class="feld-zeile">${f('zulagen', 'Kinder- und Familienzulagen diesen Monat (CHF)', e.zulagen != null && e.zulagen !== '' ? chfFeld(e.zulagen) : '', `placeholder="${chfFeld(m.zulagen) || '0.00'} (Standard)"`)}</div>
        <div class="feld"><label for="ld_notiz">Persönlicher Text auf der Abrechnung</label><textarea id="ld_notiz" rows="3" placeholder="z. B. Danke für Ihren Einsatz auf der Baustelle Müller.">${esc(e.notiz || '')}</textarea></div>
      </div>
      <div class="dlg-fuss"><div class="rechts"><button type="button" class="btn" data-zu>Abbrechen</button><button type="submit" class="btn btn-haupt">Speichern</button></div></div>
    </form>`;
    dlg.oninput = null; dlg.onchange = null;
    dlg.onclick = (ev) => { if (ev.target === dlg || ev.target.closest('[data-zu]')) dlg.close(); };
    $('ldForm').onsubmit = async (ev) => {
      ev.preventDefault();
      const z = (k) => { const v = $('ld_' + k).value.trim(); if (!v) return 0; const r = betragLesen(v); return Number.isFinite(r) ? r : 0; };
      const zul = $('ld_zulagen').value.trim();
      await lohnEingabeSetzen(monat, id, { bonus: z('bonus'), spesen: z('spesen'), taggeld: z('taggeld'), kuerzung: z('kuerzung'), zulagen: zul ? z('zulagen') : '', notiz: $('ld_notiz').value.trim() });
      dlg.close(); zeichnen(); toast('Gespeichert');
    };
    dlg.showModal();
  }

  // PDF für den E-Mail-Versand: Bibliotheken erst bei Bedarf laden
  const skript = (src) => new Promise((ok, f) => { const s = document.createElement('script'); s.src = src; s.onload = ok; s.onerror = () => f(new Error('Laden fehlgeschlagen')); document.head.appendChild(s); });
  async function pdfLibs() {
    if (!window.html2canvas) await skript('lib/html2canvas.min.js');
    if (!window.jspdf) await skript('lib/jspdf.umd.min.js');
  }
  async function htmlAlsPdf(doc) {
    await pdfLibs();
    const f = document.createElement('iframe');
    f.style.cssText = 'position:fixed;left:-30000px;top:0;width:794px;height:1123px;border:0;background:#fff';
    document.body.appendChild(f);
    try {
      await new Promise((ok) => { f.onload = ok; f.srcdoc = doc; });
      const d = f.contentDocument;
      if (d.fonts && d.fonts.ready) await d.fonts.ready;
      await Promise.all([...d.images].map((i) => (i.complete ? null : new Promise((ok) => { i.onload = i.onerror = ok; }))));
      const c = await window.html2canvas(d.body, { scale: 2, backgroundColor: '#ffffff', logging: false, windowWidth: 794, onclone: (d) => window.UI && UI.pdfFarben && UI.pdfFarben(d) });
      const pdf = new window.jspdf.jsPDF({ unit: 'mm', format: 'a4', compress: true });
      const seiteH = Math.round(c.width * 297 / 210);
      for (let y = 0, i = 0; y < c.height; y += seiteH, i++) {
        const teil = document.createElement('canvas'); teil.width = c.width; teil.height = Math.min(seiteH, c.height - y);
        teil.getContext('2d').drawImage(c, 0, y, c.width, teil.height, 0, 0, c.width, teil.height);
        if (i) pdf.addPage();
        pdf.addImage(teil.toDataURL('image/jpeg', 0.92), 'JPEG', 0, 0, 210, teil.height * 210 / c.width, undefined, 'FAST');
      }
      return pdf.output('blob');
    } finally { f.remove(); }
  }
  const adressen = (t) => String(t || '').split(/[,;\s]+/).map((x) => x.trim()).filter((x) => /.+@.+\..+/.test(x));
  async function lohnMail(id) {
    const m = mitarbeiterListe().find((x) => x.id === id); if (!m) return;
    const monat = Z.lohnMonat, an = adressen(m.mail), kopie = adressen(Z.einst.lohnKopie).filter((x) => !an.includes(x));
    if (!an.length && !kopie.length) {
      if (await UI.frage(`Für ${m.name} ist noch keine E-Mail-Adresse hinterlegt. Jetzt eintragen?`, { ja: 'Eintragen', nein: 'Abbrechen' })) mitarbeiterBearbeiten(m);
      return;
    }
    toast('PDF wird erstellt …');
    let blob;
    try { blob = await htmlAlsPdf(lohnzettelDoc(m, monat, false)); } catch (f) { toast('PDF konnte nicht erstellt werden: ' + (f.message || f)); return; }
    const F = firmaDaten(), vorname = m.name.split(/\s+/)[0];
    const datei = `Lohnabrechnung_${monat}_${m.name.replace(/[^\wÀ-ž-]+/g, '-')}.pdf`;
    const betreff = `Lohnabrechnung ${monatName(monat)} – ${F.name}`;
    const text = `Guten Tag ${vorname}\n\nIm Anhang finden Sie Ihre Lohnabrechnung für ${monatName(monat)}.${lohnText(monat) ? '\n\n' + lohnText(monat) : ''}\n\nFreundliche Grüsse\n${F.name}`;
    const datei_ = new File([blob], datei, { type: 'application/pdf' });
    const teilenGeht = navigator.canShare && navigator.canShare({ files: [datei_] });
    const url = URL.createObjectURL(blob);
    const ziel = an.length ? an : kopie, cc = an.length ? kopie : [];
    const mailto = `mailto:${ziel.map(encodeURIComponent).join(',')}?${cc.length ? `cc=${cc.map(encodeURIComponent).join(',')}&` : ''}subject=${encodeURIComponent(betreff)}&body=${encodeURIComponent(text)}`;
    const dlg = $('dlg');
    dlg.innerHTML = `<form method="dialog">
      <div class="dlg-kopf"><h3>Lohnabrechnung senden</h3><button type="button" class="x" data-zu aria-label="Schliessen">×</button></div>
      <div class="dlg-inhalt">
        <p><b>An:</b> ${esc(ziel.join(', '))}${cc.length ? `<br><b>Kopie:</b> ${esc(cc.join(', '))}` : ''}</p>
        <div data-lm-direkt hidden style="margin:10px 0 14px"><p class="hinweis" data-lm-abs></p><p class="hinweis" data-lm-fehler style="color:#C2373C"></p><button type="button" class="btn btn-haupt" data-lm="direkt">Jetzt senden</button><p class="hinweis" style="margin-top:12px">oder mit der Mail-App:</p></div>
        <p class="hinweis" data-lm-alt>${teilenGeht ? 'Tippen Sie auf „Teilen“ und wählen Sie Mail. Das PDF ist schon angehängt, die Adressen fügen Sie mit „Adressen kopieren“ ein.' : 'Laden Sie das PDF herunter, öffnen Sie dann die Mail und hängen Sie das PDF an. Empfänger, Betreff und Text sind schon ausgefüllt.'}</p>
        <div data-lm-alt style="display:flex;gap:8px;flex-wrap:wrap;margin-top:12px">
          ${teilenGeht ? '<button type="button" class="btn btn-haupt" data-lm="teilen">Teilen</button><button type="button" class="btn" data-lm="kopieren">Adressen kopieren</button>' : `<a class="btn btn-haupt" href="${url}" download="${esc(datei)}" data-lm="laden">PDF herunterladen</a><a class="btn" href="${mailto}" data-lm="mail">Mail öffnen</a>`}
          <a class="btn" href="${url}" target="_blank" rel="noopener">PDF ansehen</a>
        </div>
      </div>
      <div class="dlg-fuss"><div class="rechts"><button type="button" class="btn" data-zu>Fertig</button></div></div>
    </form>`;
    dlg.oninput = null; dlg.onchange = null;
    const vermerken = () => lohnEingabeSetzen(monat, id, { gesendet: heute() }).catch(() => {});
    if (window.OrdasioMail && OrdasioMail.moeglich()) OrdasioMail.status().then((st) => {
      const box = dlg.querySelector('[data-lm-direkt]'); if (!st.bereit || !box) return;
      box.hidden = false;
      box.querySelector('[data-lm-abs]').innerHTML = OrdasioMail.absenderText(st, F.name, F.mail) + ' · <button type="button" class="link" data-lm="absender">ändern</button>';
    });
    dlg.onclick = async (ev) => {
      const k = ev.target.closest('[data-lm]');
      if (k && k.dataset.lm === 'absender') { dlg.close(); OrdasioMail.einstellungen(); return; }
      if (k && k.dataset.lm === 'direkt') {
        const f = dlg.querySelector('[data-lm-fehler]'); k.disabled = true; k.textContent = 'Wird gesendet …'; f.textContent = '';
        try {
          const erg = await OrdasioMail.senden({ an: ziel, cc, betreff, text, anhaenge: [{ name: datei, blob }], antwortAn: F.mail, absenderName: F.name, art: 'lohn' });
          await vermerken();
          dlg.querySelectorAll('[data-lm-alt]').forEach((x) => { x.hidden = true; x.style.display = 'none'; });
          dlg.querySelector('[data-lm-direkt]').innerHTML = `<p style="color:#0E7A55;font-weight:600">✓ Gesendet an ${esc([...erg.an, ...(erg.cc || [])].join(', '))}</p>`;
        } catch (x) { f.textContent = x.message; k.disabled = false; k.textContent = 'Nochmals senden'; }
        return;
      }
      if (k && k.dataset.lm === 'teilen') {
        try { await navigator.share({ files: [datei_], title: betreff, text }); await vermerken(); toast('Lohnabrechnung geteilt'); } catch (f) { if (f && f.name !== 'AbortError') window.open(url, '_blank'); }
        return;
      }
      if (k && k.dataset.lm === 'kopieren') { try { await navigator.clipboard.writeText([...ziel, ...cc].join(', ')); toast('Adressen kopiert'); } catch { toast([...ziel, ...cc].join(', ')); } return; }
      if (k && k.dataset.lm === 'mail') vermerken();
      if (ev.target === dlg || ev.target.closest('[data-zu]')) { dlg.close(); zeichnen(); setTimeout(() => URL.revokeObjectURL(url), 60000); }
    };
    dlg.showModal();
  }

  // Alle gebuchten Monate eines Jahres für eine Person
  function lohnJahr(m, jahr) {
    const l = [];
    for (let i = 1; i <= 12; i++) {
      const mo = `${jahr}-${String(i).padStart(2, '0')}`;
      if (!Z.buchungen.some((b) => b.quelle === 'lohn' && b.lohnMonat === mo && b.partner === m.name)) continue;
      const e = lohnEingabe(mo, m.id);
      l.push({ mo, e, r: lohnBerechnen(m, e) });
    }
    return l;
  }
  const LOHNKONTO_ZEILEN = [
    ['Grundlohn', (r) => r.grundRoh], ['Lohnkürzung', (r) => -r.kuerzung], ['Ferienentschädigung', (r) => r.ferien], ['Bonus / Zulage', (r) => r.bonus],
    ['Bruttolohn', (r) => r.brutto, 1],
    ['AHV/IV/EO', (r) => -r.an.ahv], ['ALV', (r) => -r.an.alv], ['Nichtberufsunfall', (r) => -r.an.nbu], ['Krankentaggeld', (r) => -r.an.ktg], ['Pensionskasse (BVG)', (r) => -r.an.bvg], ['Quellensteuer', (r) => -r.an.qst],
    ['Nettolohn', (r) => r.brutto - r.abzuege, 1],
    ['Kinder- und Familienzulagen', (r) => r.zulagen], ['Versicherungstaggeld', (r) => r.taggeld], ['Spesen', (r) => r.spesen],
    ['Auszahlung', (r) => r.netto, 1],
    ['Arbeitgeberbeiträge', (r) => r.agTotal],
  ];
  function lohnkontoDaten(m, jahr) {
    const l = lohnJahr(m, jahr);
    const zeilen = LOHNKONTO_ZEILEN.map(([t, f, fett]) => ({ t, fett, werte: l.map((x) => f(x.r)), total: l.reduce((a, x) => a + f(x.r), 0) }))
      .filter((z) => z.fett || z.werte.some((w) => w));
    return { l, zeilen };
  }
  function lohnkonto(id) {
    const m = mitarbeiterListe().find((x) => x.id === id); if (!m) return;
    const jahr = Z.lohnMonat.slice(0, 4), { l, zeilen } = lohnkontoDaten(m, jahr), F = firmaDaten();
    if (!l.length) { toast(`Für ${m.name} sind ${jahr} noch keine Löhne gebucht.`); return; }
    const kurz = (mo) => new Date(mo + '-15').toLocaleDateString('de-CH', { month: 'short' });
    const tabelle = [['Lohnart', ...l.map((x) => monatName(x.mo)), 'Total'], ...zeilen.map((z) => [z.t, ...z.werte.map(csvBetrag), csvBetrag(z.total)])];
    const csvUrl = 'data:text/csv;charset=utf-8,' + encodeURIComponent(csv(tabelle));
    druckFenster(`<!doctype html><html lang="de-CH"><head><meta charset="utf-8"><title>Lohnkonto ${esc(m.name)} ${jahr}</title><style>${DRUCK_STIL(F.farbe)}@page{size:A4 landscape}table{font-size:11px}</style></head><body>
      <div class="nicht-drucken"><button onclick="window.print()">Drucken / PDF</button><a href="${csvUrl}" download="Lohnkonto_${jahr}_${esc(m.name.replace(/\s+/g, '-'))}.csv">Als Excel herunterladen</a></div>
      ${firmenKopf(F, `Lohnkonto ${jahr}`)}
      <h1>Lohnkonto ${jahr}: ${esc(m.name)}</h1>
      <p class="h">${[m.ahvNr ? 'AHV-Nr. ' + esc(m.ahvNr) : '', m.eintritt ? 'Eintritt ' + datumKurz(m.eintritt) : '', m.lohnart === 'stunde' ? `Stundenlohn CHF ${chf(m.lohn)}` : `Monatslohn CHF ${chf(m.lohn)} · ${m.pensum || 100} %`].filter(Boolean).join(' · ')}</p>
      <table><tr><th>Lohnart</th>${l.map((x) => `<th class="b">${kurz(x.mo)}</th>`).join('')}<th class="b">Total</th></tr>
        ${zeilen.map((z) => `<tr${z.fett ? ' class="s"' : ''}><td>${z.t}</td>${z.werte.map((w) => `<td class="b">${w ? chf(w) : ''}</td>`).join('')}<td class="b"><b>${chf(z.total)}</b></td></tr>`).join('')}
      </table></body></html>`);
  }

  function lohnausweis(id) {
    const m = mitarbeiterListe().find((x) => x.id === id); if (!m) return;
    const jahr = Z.lohnMonat.slice(0, 4), l = lohnJahr(m, jahr), F = firmaDaten();
    if (!l.length) { toast(`Für ${m.name} sind ${jahr} noch keine Löhne gebucht.`); return; }
    const s = (f) => l.reduce((a, x) => a + f(x.r), 0);
    const z1 = s((r) => r.grund + r.ferien + r.zulagen + r.taggeld), z3 = s((r) => r.bonus), z8 = z1 + z3;
    const z9 = s((r) => r.an.ahv + r.an.alv + r.an.nbu), z10 = s((r) => r.an.bvg), z11 = z8 - z9 - z10, z12 = s((r) => r.an.qst), z13 = s((r) => r.spesen), ktg = s((r) => r.an.ktg);
    const von = (() => { const a = l[0].mo + '-01'; return m.eintritt && m.eintritt > a && m.eintritt.slice(0, 7) === l[0].mo ? m.eintritt : a; })();
    const bis = (() => { const x = l[l.length - 1].mo; return new Date(Number(x.slice(0, 4)), Number(x.slice(5, 7)), 0).toLocaleDateString('sv-SE'); })();
    const bem = [ktg ? `Beiträge an die Krankentaggeldversicherung Arbeitnehmer CHF ${chf(ktg)}` : '', s((r) => r.taggeld) ? `In Ziffer 1 enthalten: Versicherungstaggelder CHF ${chf(s((r) => r.taggeld))}` : ''].filter(Boolean);
    const zf = (nr, t, b, opt = {}) => `<tr${opt.fett ? ' class="s"' : ''}><td style="width:46px">${nr}</td><td>${t}</td><td class="b">${opt.minus ? '− ' : ''}${b == null ? '' : chf(b)}</td></tr>`;
    druckFenster(`<!doctype html><html lang="de-CH"><head><meta charset="utf-8"><title>Lohnausweis ${jahr} ${esc(m.name)}</title><style>${DRUCK_STIL(F.farbe)}
      .feld4{display:grid;grid-template-columns:1fr 1fr;gap:6px 18px;margin-top:14px}.feld4 div{border-bottom:1px solid #E3E6EF;padding:4px 0}.feld4 span{display:block}</style></head><body>
      <div class="nicht-drucken"><button onclick="window.print()">Drucken / PDF</button></div>
      ${firmenKopf(F, `Lohnausweis ${jahr}<br>Formular 11`)}
      <h1>Lohnausweis ${jahr}</h1>
      <div class="feld4">
        <div><span class="h">A Lohnausweis · C AHV-Nr.</span>${esc(m.ahvNr || '–')}</div>
        <div><span class="h">D Jahr · E Lohnperiode</span>${jahr} · ${datumKurz(von)} bis ${datumKurz(bis)}</div>
        <div><span class="h">H Arbeitnehmer</span><b>${esc(m.name)}</b><br>${esc([m.strasse, m.ort].filter(Boolean).join(', '))}</div>
        <div><span class="h">F Unentgeltliche Beförderung · G Kantinenverpflegung</span>nein · nein</div>
      </div>
      <table>
        ${zf('1.', 'Lohn (inkl. Familienzulagen und Taggelder)', z1)}
        ${z3 ? zf('3.', 'Unregelmässige Leistungen (Bonus)', z3) : ''}
        ${zf('8.', 'Bruttolohn total', z8, { fett: 1 })}
        ${zf('9.', 'Beiträge AHV/IV/EO/ALV/NBUV', z9, { minus: 1 })}
        ${zf('10.1', 'Berufliche Vorsorge 2. Säule, ordentliche Beiträge', z10, { minus: 1 })}
        ${zf('11.', 'Nettolohn', z11, { fett: 1 })}
        ${z12 ? zf('12.', 'Quellensteuerabzug', z12) : ''}
        ${z13 ? zf('13.1.1', 'Effektive Spesen: Reise, Verpflegung, Übernachtung', z13) : ''}
      </table>
      ${bem.length ? `<h2>15. Bemerkungen</h2><p>${bem.map(esc).join('<br>')}</p>` : ''}
      <h2>I Ort und Datum, Arbeitgeber</h2>
      <p>${esc(F.name)}${F.strasse || F.ort ? ', ' + esc([F.strasse, F.ort].filter(Boolean).join(', ')) : ''}${F.tel ? ', Tel. ' + esc(F.tel) : ''}<br>${esc(F.ort ? F.ort.replace(/^\d{4}\s*/, '') + ', ' : '')}${datumKurz(heute())}</p>
      <p class="h" style="margin-top:24px">Werte aus den gebuchten Lohnläufen ${jahr}, aufgebaut wie das amtliche Formular 11. Bitte vor der Abgabe prüfen. Verlangt Ihr Kanton das amtliche Formular oder ELM (Swissdec), übertragen Sie die Ziffern dorthin.</p>
    </body></html>`);
  }

  function lohnCsv() {
    const monat = Z.lohnMonat;
    const kopf = ['Name', 'AHV-Nr.', 'Stunden', 'Grundlohn', 'Kürzung', 'Ferien', 'Bonus', 'Brutto', 'AHV/IV/EO', 'ALV', 'NBU', 'KTG', 'BVG', 'Quellensteuer', 'Abzüge', 'Netto', 'Zulagen', 'Taggeld', 'Spesen', 'Auszahlung', 'AG-Beiträge', 'IBAN'];
    const zeilen = mitarbeiterListe().filter((m) => m.aktiv !== false).map((m) => {
      const e = lohnEingabe(monat, m.id), r = lohnBerechnen(m, e);
      return [m.name, m.ahvNr || '', m.lohnart === 'stunde' ? (e.stunden || 0) : '', ...[r.grundRoh, r.kuerzung, r.ferien, r.bonus, r.brutto, r.an.ahv, r.an.alv, r.an.nbu, r.an.ktg, r.an.bvg, r.an.qst, r.abzuege, r.brutto - r.abzuege, r.zulagen, r.taggeld, r.spesen, r.netto, r.agTotal].map(csvBetrag), m.iban || ''];
    });
    herunterladen(`Lohnlauf ${monat}.csv`, csv([kopf, ...zeilen]), 'text/csv');
  }
  function lohnJahrCsv() {
    const jahr = Z.lohnMonat.slice(0, 4);
    const kopf = ['Name', 'AHV-Nr.', 'Monate', 'Ziffer 1 Lohn', 'Ziffer 3 Bonus', 'Ziffer 8 Brutto', 'Ziffer 9 AHV/IV/EO/ALV/NBUV', 'Ziffer 10.1 BVG', 'Ziffer 11 Netto', 'Ziffer 12 Quellensteuer', 'Ziffer 13.1.1 Spesen', 'KTG Arbeitnehmer', 'Taggelder', 'Auszahlung', 'AG-Beiträge'];
    const zeilen = mitarbeiterListe().map((m) => {
      const l = lohnJahr(m, jahr); if (!l.length) return null;
      const s = (f) => l.reduce((a, x) => a + f(x.r), 0);
      const z1 = s((r) => r.grund + r.ferien + r.zulagen + r.taggeld), z3 = s((r) => r.bonus), z9 = s((r) => r.an.ahv + r.an.alv + r.an.nbu), z10 = s((r) => r.an.bvg);
      return [m.name, m.ahvNr || '', l.length, ...[z1, z3, z1 + z3, z9, z10, z1 + z3 - z9 - z10, s((r) => r.an.qst), s((r) => r.spesen), s((r) => r.an.ktg), s((r) => r.taggeld), s((r) => r.netto), s((r) => r.agTotal)].map(csvBetrag)];
    }).filter(Boolean);
    if (!zeilen.length) { toast('Noch keine gebuchten Löhne in diesem Jahr'); return; }
    herunterladen(`Löhne ${jahr}.csv`, csv([kopf, ...zeilen]), 'text/csv');
  }

  /* ================= Buchungen ================= */
  function zeilen(liste) {
    return liste.length ? `<div class="liste">${liste.map((b) => {
      const ein = b.typ === 'einnahme';
      const marke = istOffen(b) ? '<span class="marke marke-offen">offen</span>'
        : (b.quelle === 'rechnung' ? '<span class="marke marke-ok">bezahlt</span>' : '');
      const beleg = b.belegId ? '<span title="Beleg vorhanden">📎</span>' : (b.quelle === 'fahrt' ? `<span class="marke marke-info">${b.km} km</span>` : '');
      return `<div class="zeile" data-buchung="${b.id}">
        <div class="datum">${datumKurz(b.datum)}</div>
        <div style="min-width:0">
          <div class="titel">${esc(b.text || b.partner || katName(b))}</div>
          <div class="info"><span class="nur-handy-datum">${datumKurz(b.datum)}</span><span>${esc(katName(b))}</span>${b.partner && b.text ? `<span>${esc(b.partner)}</span>` : ''}${marke}${beleg}${b.waehrung ? `<span class="marke marke-info">${esc(b.waehrung)} ${(b.betragFremd / 100).toFixed(2)}</span>` : ''}</div>
        </div>
        <div class="betrag ${ein ? 'plus' : ''}">${ein ? '+' : '−'} ${chf(b.betragRappen)}<small>MWST ${chf(b.mwstRappen)}</small></div>
      </div>`;
    }).join('')}</div>` : '';
  }
  document.addEventListener('click', (e) => {
    const z = e.target.closest('[data-buchung]');
    if (z) buchungBearbeiten(Z.buchungen.find((b) => b.id === z.dataset.buchung));
  });

  function gefiltert() {
    const f = Z.filter;
    const q = f.suche.trim().toLowerCase();
    // Mit Suchbegriff wird über alle Jahre gesucht
    return sortiert((q ? Z.buchungen : imJahr(Z.jahr)).filter((b) =>
      (f.typ === 'alle' || (f.typ === 'offen' ? istOffen(b) : b.typ === f.typ))
      && (!f.monat || b.datum.slice(5, 7) === f.monat)
      && (!f.kat || b.kategorie === f.kat)
      && (!q || [b.text, b.partner, katName(b), b.rechnungNr, chf(b.betragRappen)].join(' ').toLowerCase().includes(q))));
  }

  function buchungenAnsicht() {
    const f = Z.filter;
    const liste = gefiltert();
    const s = summen(liste);
    const typen = [['alle', 'Alle'], ['ausgabe', 'Ausgaben'], ['einnahme', 'Einnahmen'], ['offen', 'Offen']];
    const kats = f.typ === 'einnahme' ? KAT_EIN : f.typ === 'ausgabe' ? KAT_AUS : [...KAT_AUS, ...KAT_EIN];
    return `
    <div class="kopf">
      <div><h1>Buchungen</h1><p class="unter">${f.suche.trim() ? 'Suche in allen Jahren: ' : ''}${liste.length} Einträge, Einnahmen ${chf(s.ein)}, Ausgaben ${chf(s.aus)} (ohne MWST)</p></div>
      <div class="kopf-aktionen">${jahrWahl()}<button class="btn" onclick="NB.korb()">Zuletzt gelöscht</button>${bankImportGruppen().length ? '<button class="btn" onclick="NB.importe()">Importe</button>' : ''}<button class="btn" onclick="NB.bankImport()">Bankauszug oder Daten importieren</button><button class="btn" onclick="NB.shopImport()">Onlineshop</button><button class="btn" onclick="NB.belege()">Belege hochladen</button><button class="btn" onclick="NB.fahrt()">Fahrt erfassen</button><button class="btn btn-haupt nur-pc" onclick="NB.neu()">+ Neue Buchung</button></div>
    </div>
    <div class="filter">
      <div class="segment">${typen.map(([id, n]) => `<button class="${f.typ === id ? 'an' : ''}" data-ftyp="${id}">${n}</button>`).join('')}</div>
      <select class="auswahl-klein" data-fmonat><option value="">Alle Monate</option>${MONATE.map((n, i) => { const v = String(i + 1).padStart(2, '0'); return `<option value="${v}" ${f.monat === v ? 'selected' : ''}>${n}</option>`; }).join('')}</select>
      <select class="auswahl-klein" data-fkat><option value="">Alle Kategorien</option>${kats.map((k) => `<option value="${k.id}" ${f.kat === k.id ? 'selected' : ''}>${esc(k.name)}</option>`).join('')}</select>
      <input type="search" placeholder="Suchen" value="${esc(f.suche)}" data-fsuche />
    </div>
    <div class="card">${zeilen(liste) || '<p class="leer">Keine Buchungen gefunden.</p>'}</div>`;
  }
  document.addEventListener('click', (e) => {
    const t = e.target.closest('[data-ftyp]');
    if (t) { Z.filter.typ = t.dataset.ftyp; Z.filter.kat = ''; zeichnen(); }
  });
  document.addEventListener('change', (e) => {
    if (e.target.matches('[data-fmonat]')) { Z.filter.monat = e.target.value; zeichnen(); }
    if (e.target.matches('[data-fkat]')) { Z.filter.kat = e.target.value; zeichnen(); }
  });
  document.addEventListener('input', (e) => {
    if (!e.target.matches('[data-fsuche]')) return;
    Z.filter.suche = e.target.value;
    const pos = e.target.selectionStart;
    zeichnen();
    const neu = document.querySelector('[data-fsuche]');
    neu.focus();
    neu.setSelectionRange(pos, pos);
  });

  /* ================= Buchung erfassen / bearbeiten ================= */
  // Vorgaben für neue Ausgaben: fest gewählt in den Einstellungen oder „wie zuletzt“
  function vorgabeNeu() {
    let zuletzt = {}; try { zuletzt = JSON.parse(localStorage.getItem('nb.zuletzt') || '{}'); } catch {}
    const wahl = (feld, std) => { const v = Z.einst[feld] || 'zuletzt'; return v === 'zuletzt' ? std : v; };
    let kategorie = wahl('vorgabeKat', zuletzt.kategorie || 'material');
    if (!KAT_AUS.some((k) => k.id === kategorie && !k.versteckt)) kategorie = 'material';
    let zahlung = wahl('vorgabeZahlung', zuletzt.zahlung || 'Bank');
    if (!ZAHLUNG.includes(zahlung)) zahlung = 'Bank';
    const k = KAT_AUS.find((x) => x.id === kategorie);
    return { kategorie, zahlung, satz: k ? k.satz : 8.1 };
  }
  async function buchungBearbeiten(vorhanden, vorlage = {}) {
    const { _beleg, _titel, ...vorgaben } = vorlage;
    const v0 = vorgabeNeu();
    const b = vorhanden ? { ...vorhanden } : {
      typ: 'ausgabe', datum: heute(), kategorie: v0.kategorie, mwstSatz: v0.satz, zahlung: v0.zahlung, quelle: 'manuell', ...vorgaben,
    };
    let beleg = b.belegId ? await Speicher.holen('belege', b.belegId) : null;
    let neuerBeleg = _beleg || null;
    let mwstVonHand = vorhanden != null;
    const partner = [...new Set(Z.buchungen.map((x) => x.partner).filter(Boolean))].sort();
    const dlg = $('dlg');

    const katOptionen = () => sichtbar(b.typ === 'ausgabe' ? KAT_AUS : KAT_EIN, b.kategorie)
      .map((k) => `<option value="${k.id}" ${b.kategorie === k.id ? 'selected' : ''}>${esc(k.name)}</option>`).join('');

    function belegHtml() {
      const x = neuerBeleg || beleg;
      if (!x || !x.daten) return `<div class="beleg-feld"><p class="hinweis" style="margin-bottom:10px">Foto der Quittung oder PDF</p><button type="button" class="btn" data-beleg-neu>📷 Beleg hinzufügen</button></div>`;
      const bild = x.typ && x.typ.startsWith('image/') ? `<img src="${URL.createObjectURL(x.daten)}" alt="Beleg" />` : '';
      return `<div class="beleg-feld">${bild}<div class="beleg-name">${esc(x.name || 'Beleg')}</div>
        <button type="button" class="btn btn-klein" data-beleg-zeigen>Ansehen</button>
        <button type="button" class="btn btn-klein" data-beleg-neu>Ersetzen</button>
        <button type="button" class="btn btn-klein btn-rot" data-beleg-weg>Entfernen</button></div>`;
    }

    function formular() {
      const ein = b.typ === 'einnahme';
      const rechnung = b.quelle === 'rechnung';
      const gesperrt = !!(vorhanden && istFest(vorhanden.datum));
      const mitKreditor = doppeltAktiv() && !ein && !['lohn', 'fahrt'].includes(b.quelle);
      dlg.innerHTML = `
      <form method="dialog" id="bForm">
        <div class="dlg-kopf"><h3>${_titel || (vorhanden ? 'Buchung bearbeiten' : (vorgaben.text ? 'Kopie der Buchung' : 'Neue Buchung'))}</h3><button type="button" class="x" data-zu aria-label="Schliessen">×</button></div>
        <div class="dlg-inhalt">
          ${gesperrt ? `<p class="hinweis" style="background:var(--flaeche);padding:10px 12px;border-radius:10px"><b>Festgeschrieben bis ${datumKurz(festBis())}.</b> Diese Buchung lässt sich nicht mehr ändern oder löschen. Korrekturen machen Sie mit einer Storno-Buchung im Journal.</p>` : ''}
          ${rechnung ? `<p class="hinweis"><span class="marke marke-info">Rechnung ${esc(b.rechnungNr || '')}</span> aus der Rechnungs-App</p>`
            : `<div class="segment"><button type="button" class="${!ein ? 'an' : ''}" data-btyp="ausgabe">Ausgabe</button><button type="button" class="${ein ? 'an' : ''}" data-btyp="einnahme">Einnahme</button></div>`}
          <div class="feld-zeile">
            <div class="feld"><label for="fBetrag">Betrag inkl. MWST (CHF)</label><input type="text" id="fBetrag" inputmode="decimal" autocomplete="off" placeholder="0.00" value="${b.betragRappen != null ? chf(b.betragRappen).replace(/’/g, '') : ''}" required /></div>
            <div class="feld"><label for="fDatum">Datum</label><input type="date" id="fDatum" value="${b.datum}" required /></div>
          </div>
          <div class="fw" data-fw ${b.waehrung && b.waehrung !== 'CHF' ? '' : 'data-zu'}>
            <button type="button" class="link fw-knopf" data-fw-auf>${b.waehrung && b.waehrung !== 'CHF' ? '' : '+ Betrag in Fremdwährung (EUR, USD …)'}</button>
            <div class="feld-zeile fw-felder">
              <div class="feld"><label for="fwWaehrung">Währung</label><select id="fwWaehrung">${WAEHRUNGEN.map((w) => `<option ${b.waehrung === w ? 'selected' : ''}>${w}</option>`).join('')}</select></div>
              <div class="feld"><label for="fwBetrag">Betrag in Währung</label><input type="text" id="fwBetrag" inputmode="decimal" autocomplete="off" placeholder="0.00" value="${b.betragFremd != null ? (b.betragFremd / 100).toFixed(2) : ''}" /></div>
              <div class="feld"><label for="fwKurs">Kurs in CHF</label><input type="text" id="fwKurs" inputmode="decimal" autocomplete="off" placeholder="z. B. 0.9412" value="${b.kurs || ''}" /></div>
            </div>
            <p class="hinweis fw-info" data-fw-info>${b.kursAm ? 'Kurs vom ' + datumKurz(b.kursAm) + ' (Europäische Zentralbank)' : ''}</p>
          </div>
          <div class="feld-zeile">
            <div class="feld"><label for="fSatz">MWST-Satz</label><select id="fSatz">${SAETZE.map((s) => `<option value="${s}" ${Number(b.mwstSatz) === s ? 'selected' : ''}>${s ? s.toFixed(1) + ' %' : 'ohne MWST'}</option>`).join('')}</select></div>
            <div class="feld"><label for="fMwst">${ein ? 'MWST' : 'Vorsteuer'} (CHF)</label><input type="text" id="fMwst" inputmode="decimal" autocomplete="off" value="${b.mwstRappen != null ? chf(b.mwstRappen).replace(/’/g, '') : ''}" /></div>
          </div>
          <div class="feld"><label for="fKat">Kategorie</label><select id="fKat">${katOptionen()}</select>${doppeltAktiv() ? `<p class="hinweis" id="fKontoInfo" style="margin-top:4px">${kontoHinweis()}</p>` : ''}</div>
          <div class="feld"><label for="fText">Beschreibung</label><input type="text" id="fText" value="${esc(b.text || '')}" placeholder="${ein ? 'z. B. Gartenpflege Winterthur' : 'z. B. Büromaterial'}" /></div>
          <div class="feld-zeile">
            <div class="feld"><label for="fPartner">${ein ? 'Kunde' : 'Lieferant'}</label><input type="text" id="fPartner" list="partnerListe" value="${esc(b.partner || '')}" /><datalist id="partnerListe">${partner.map((p) => `<option value="${esc(p)}">`).join('')}</datalist></div>
            <div class="feld"><label for="fZahlung">Bezahlt mit</label><select id="fZahlung">${ZAHLUNG.map((z) => `<option ${b.zahlung === z ? 'selected' : ''}>${z}</option>`).join('')}</select></div>
          </div>
          ${(() => { const pj = projekteListe(); return pj.length || b.kostenstelle ? `<div class="feld"><label for="fKst">Projekt / Kostenstelle</label><select id="fKst"><option value="">Keines</option>${pj.map((x) => `<option value="${esc(x.id)}" ${b.kostenstelle === x.id ? 'selected' : ''}>${esc(x.name)}${x.kostenstelle ? ' · ' + esc(x.kostenstelle) : ''}</option>`).join('')}${b.kostenstelle && !pj.some((x) => x.id === b.kostenstelle) ? `<option value="${esc(b.kostenstelle)}" selected>Früheres Projekt</option>` : ''}</select></div>` : ''; })()}
          ${mitKreditor ? `<label class="haken"><input type="checkbox" id="fKreditor" ${b.kreditor ? 'checked' : ''} />Lieferantenrechnung, noch offen (Kreditor)</label>` : ''}
          ${rechnung || (mitKreditor && b.kreditor) ? `<div class="feld-zeile">
            <label class="haken"><input type="checkbox" id="fBezahlt" ${b.bezahlt ? 'checked' : ''} />Rechnung ist bezahlt</label>
            <div class="feld"><label for="fBezahltAm">Bezahlt am</label><input type="date" id="fBezahltAm" value="${b.bezahltAm || ''}" ${b.bezahlt ? '' : 'disabled'} /></div>
          </div>` : ''}
          <div id="belegBox">${belegHtml()}</div>
        </div>
        <div class="dlg-fuss">
          ${vorhanden && !gesperrt ? '<button type="button" class="btn btn-rot" data-loeschen>Löschen</button>' : ''}${vorhanden ? '<button type="button" class="btn" data-duplizieren>Duplizieren</button>' : ''}
          ${gesperrt && doppeltAktiv() ? '<button type="button" class="btn" data-storno>Storno-Buchung</button>' : ''}
          <div class="rechts"><button type="button" class="btn" data-zu>${gesperrt ? 'Schliessen' : 'Abbrechen'}</button>${gesperrt ? '' : '<button type="submit" class="btn btn-haupt">Speichern</button>'}</div>
        </div>
      </form>`;
    }

    function kontoHinweis() {
      if (!doppeltAktiv()) return '';
      const k = katKonto(b);
      const gegen = b.typ === 'einnahme' ? (b.quelle === 'rechnung' ? '1100' : D.zahlungKonto(Z.einst, b.zahlung)) : (b.kreditor ? '2000' : D.zahlungKonto(Z.einst, b.zahlung));
      return b.typ === 'einnahme' ? `Buchung: ${kontoText(gegen)} an ${kontoText(k)}` : `Buchung: ${kontoText(k)} an ${kontoText(gegen)}`;
    }
    function mwstNachfuehren() {
      if (mwstVonHand) return;
      const brutto = betragLesen($('fBetrag').value);
      const satz = Number($('fSatz').value);
      $('fMwst').value = Number.isFinite(brutto) ? chf(mwstAus(brutto, satz)).replace(/’/g, '') : '';
    }

    // Beleg automatisch lesen (KI oder Texterkennung) und vor dem Übernehmen prüfen lassen
    async function belegLesen(x) {
      if (!window.Leser || !x || !x.daten || b.quelle === 'rechnung') return;
      felderMerken();
      const ein = b.typ === 'einnahme', kats = sichtbar(ein ? KAT_EIN : KAT_AUS, b.kategorie);
      const w = await Leser.lesenUndPruefen(x.daten, 'beleg', {
        titel: ein ? 'Beleg prüfen (Einnahme)' : 'Beleg prüfen', extra: { kategorien: kats.map((k) => ({ id: k.id, name: k.name })) },
        felder: [{ id: 'betrag', label: 'Betrag inkl. MWST (CHF)', typ: 'betrag' }, { id: 'datum', label: 'Datum', typ: 'datum' },
          { id: 'lieferant', label: ein ? 'Kunde' : 'Lieferant', typ: 'text' }, { id: 'beschreibung', label: 'Beschreibung', typ: 'text' },
          { id: 'kategorie', label: 'Kategorie', typ: 'select', optionen: kats.map((k) => [k.id, k.name]) },
          { id: 'mwst_satz', label: 'MWST-Satz', typ: 'select', optionen: SAETZE.map((x) => [String(x), x ? x.toFixed(1) + ' %' : 'ohne MWST']) },
          { id: 'mwst_betrag', label: ein ? 'MWST (CHF)' : 'Vorsteuer (CHF)', typ: 'betrag' },
          { id: 'zahlung', label: 'Bezahlt mit', typ: 'select', optionen: ZAHLUNG.map((z) => [z, z]) }],
        werteAus: (f) => ({ betrag: f.betrag ?? (b.betragRappen != null ? b.betragRappen / 100 : ''), datum: /^\d{4}-\d{2}-\d{2}$/.test(f.datum || '') ? f.datum : b.datum,
          lieferant: f.lieferant || b.partner || '', beschreibung: f.beschreibung || b.text || '',
          kategorie: kats.some((k) => k.id === f.kategorie) ? f.kategorie : b.kategorie,
          mwst_satz: String(SAETZE.includes(Number(f.mwst_satz)) && f.mwst_satz != null ? Number(f.mwst_satz) : b.mwstSatz),
          mwst_betrag: f.mwst_betrag ?? '', zahlung: ZAHLUNG.includes(f.zahlung) ? f.zahlung : b.zahlung }),
      });
      if (!w || !dlg.open) return;
      if (w.betrag != null && Number.isFinite(w.betrag)) b.betragRappen = Math.round(w.betrag * 100);
      if (w.datum) b.datum = w.datum;
      b.partner = w.lieferant || b.partner; b.text = w.beschreibung || b.text;
      if (w.kategorie) b.kategorie = w.kategorie;
      b.mwstSatz = Number(w.mwst_satz); b.zahlung = w.zahlung || b.zahlung;
      mwstVonHand = w.mwst_betrag != null && Number.isFinite(w.mwst_betrag);
      b.mwstRappen = mwstVonHand ? Math.round(w.mwst_betrag * 100) : (b.betragRappen != null ? mwstAus(b.betragRappen, b.mwstSatz) : null);
      formular();
      toast('✓ Angaben vom Beleg übernommen');
    }

    function felderMerken() {
      if (!$('fBetrag')) return;
      const r = betragLesen($('fBetrag').value);
      b.betragRappen = Number.isFinite(r) ? r : null;
      b.datum = $('fDatum').value;
      if ($('fwWaehrung') && !document.querySelector('[data-fw]').hasAttribute('data-zu')) {
        const fb = betragLesen($('fwBetrag').value), ku = Number(String($('fwKurs').value).replace(',', '.'));
        if (Number.isFinite(fb) && fb > 0) { b.waehrung = $('fwWaehrung').value; b.betragFremd = fb; b.kurs = ku || null; }
      } else if (b.waehrung) { delete b.waehrung; delete b.betragFremd; delete b.kurs; delete b.kursAm; }
      b.mwstSatz = Number($('fSatz').value);
      const m = betragLesen($('fMwst').value);
      b.mwstRappen = Number.isFinite(m) ? m : null;
      b.kategorie = $('fKat').value;
      b.text = $('fText').value.trim();
      b.partner = $('fPartner').value.trim();
      b.zahlung = $('fZahlung').value;
      if ($('fKst')) { if ($('fKst').value) b.kostenstelle = $('fKst').value; else delete b.kostenstelle; }
      if ($('fKreditor')) b.kreditor = $('fKreditor').checked;
      if ($('fBezahlt')) { b.bezahlt = $('fBezahlt').checked; b.bezahltAm = b.bezahlt ? ($('fBezahltAm').value || heute()) : ''; }
    }

    formular();
    dlg.showModal();
    if (!vorhanden && !matchMedia('(max-width: 820px)').matches) $('fBetrag').focus();
    if (_beleg && b.betragRappen == null) belegLesen(_beleg);

    // Fremdwährung: Betrag × Kurs ergibt den CHF-Betrag; der Kurs kommt von der EZB (Tageskurs zum Buchungsdatum)
    const fwRechnen = () => {
      const fb = betragLesen($('fwBetrag').value), ku = Number(String($('fwKurs').value).replace(',', '.'));
      if (Number.isFinite(fb) && fb > 0 && ku > 0) { $('fBetrag').value = (Math.round(fb * ku) / 100).toFixed(2); mwstNachfuehren(); }
    };
    const fwKurs = async () => {
      const w = $('fwWaehrung').value, info = document.querySelector('[data-fw-info]');
      info.textContent = 'Kurs wird geholt …';
      try { const k = await kursHolen(w, $('fDatum').value || heute()); $('fwKurs').value = k.kurs.toFixed(4); b.kursAm = k.am; info.textContent = `Kurs vom ${datumKurz(k.am)} (Europäische Zentralbank). Sie können ihn anpassen, z. B. auf den Kurs Ihrer Bank.`; fwRechnen(); }
      catch { info.textContent = 'Kein Kurs erreichbar. Bitte den Kurs von Hand eintragen.'; }
    };
    if (dlg._fwKlick) dlg.removeEventListener('click', dlg._fwKlick);
    dlg.addEventListener('click', dlg._fwKlick = (e) => {
      if (!e.target.closest('[data-fw-auf]')) return;
      if (!finanzenErlaubt()) { if (window.OrdasioZusatz) OrdasioZusatz.erklaeren('finanzen'); return; }
      const fw = document.querySelector('[data-fw]'); fw.removeAttribute('data-zu'); e.target.closest('[data-fw-auf]').textContent = '';
      if (!$('fwKurs').value) fwKurs(); $('fwBetrag').focus();
    });
    dlg.oninput = (e) => {
      if (e.target.id === 'fMwst') mwstVonHand = true;
      if (e.target.id === 'fBetrag') mwstNachfuehren();
      if (e.target.id === 'fwBetrag' || e.target.id === 'fwKurs') fwRechnen();
    };
    dlg.onchange = (e) => {
      if (e.target.id === 'fwWaehrung' || (e.target.id === 'fDatum' && $('fwWaehrung') && !document.querySelector('[data-fw]').hasAttribute('data-zu'))) fwKurs();
      if (e.target.id === 'fSatz') { mwstVonHand = false; mwstNachfuehren(); }
      if (e.target.id === 'fKat' && !vorhanden) {
        const k = (b.typ === 'ausgabe' ? KAT_AUS : KAT_EIN).find((x) => x.id === e.target.value);
        if (k) { $('fSatz').value = String(k.satz); mwstVonHand = false; mwstNachfuehren(); }
      }
      if (e.target.id === 'fKreditor') { felderMerken(); if (!b.kreditor) { b.bezahlt = false; b.bezahltAm = ''; } formular(); return; }
      if (['fKat', 'fZahlung'].includes(e.target.id) && $('fKontoInfo')) { felderMerken(); $('fKontoInfo').textContent = kontoHinweis(); }
      if (e.target.id === 'fBezahlt') {
        $('fBezahltAm').disabled = !e.target.checked;
        if (e.target.checked && !$('fBezahltAm').value) $('fBezahltAm').value = heute();
      }
    };
    dlg.onclick = async (e) => {
      const t = e.target.closest('button');
      if (e.target === dlg) { dlg.close(); return; }
      if (!t) return;
      if (t.matches('[data-zu]')) dlg.close();
      if (t.matches('[data-btyp]')) {
        felderMerken();
        b.typ = t.dataset.btyp;
        b.kategorie = b.typ === 'ausgabe' ? 'material' : 'dienstleistung';
        formular();
      }
      if (t.matches('[data-beleg-neu]')) {
        const datei = await dateiWaehlen('image/*,application/pdf');
        if (!datei) return;
        neuerBeleg = await belegVorbereiten(datei);
        $('belegBox').innerHTML = belegHtml();
        belegLesen(neuerBeleg);
      }
      if (t.matches('[data-beleg-weg]')) {
        neuerBeleg = null; beleg = null;
        $('belegBox').innerHTML = belegHtml();
      }
      if (t.matches('[data-beleg-zeigen]')) belegZeigen(neuerBeleg || beleg);
      if (t.matches('[data-duplizieren]')) {
        felderMerken();
        const { id, belegId, geaendert, quelle, rechnungNr, bezahlt, bezahltAm, importSchluessel, ...kopie } = b;
        dlg.close();
        buchungBearbeiten(null, { ...kopie, datum: heute(), quelle: 'manuell' });
      }
      if (t.matches('[data-storno]')) {
        dlg.close();
        const e = eintraege().filter((x) => x.ref === b.id);
        journalBearbeiten(null, { text: 'Storno: ' + (b.text || katName(b)), datum: heute(), zeilen: e.flatMap((x) => x.zeilen).map((z) => ({ soll: z.haben, haben: z.soll, betrag: z.betrag })) });
        return;
      }
      if (t.matches('[data-loeschen]')) {
        if (istFest(b.datum)) { toast('Festgeschrieben, Löschen nicht möglich'); return; }
        if (!await UI.frage('Diese Buchung wirklich löschen?')) return;
        await Speicher.loeschen('buchungen', b.id);
        if (b.belegId) await Speicher.loeschen('belege', b.belegId);
        dlg.close();
        await neuLaden('Buchung gelöscht');
      }
    };
    $('bForm').onsubmit = async (e) => {
      e.preventDefault();
      felderMerken();
      if (!Number.isFinite(b.betragRappen) || b.betragRappen === null || b.betragRappen <= 0) { $('fBetrag').focus(); toast('Bitte einen Betrag eingeben'); return; }
      if (!b.datum) { $('fDatum').focus(); return; }
      if (istFest(b.datum) || (vorhanden && istFest(vorhanden.datum))) { toast(`Bis ${datumKurz(festBis())} ist alles festgeschrieben. Bitte ein späteres Datum wählen.`); $('fDatum').focus(); return; }
      if (b.mwstRappen == null) b.mwstRappen = mwstAus(b.betragRappen, b.mwstSatz);
      if (neuerBeleg) {
        if (b.belegId) await Speicher.loeschen('belege', b.belegId);
        const gespeichert = await Speicher.speichern('belege', neuerBeleg);
        b.belegId = gespeichert.id;
      } else if (!beleg && b.belegId) {
        await Speicher.loeschen('belege', b.belegId);
        b.belegId = null;
      }
      await Speicher.speichern('buchungen', b);
      if (!vorhanden && b.typ === 'ausgabe') { try { localStorage.setItem('nb.zuletzt', JSON.stringify({ kategorie: b.kategorie, zahlung: b.zahlung })); } catch {} }
      dlg.close();
      await neuLaden(vorhanden ? 'Gespeichert' : (b.typ === 'ausgabe' ? 'Ausgabe erfasst' : 'Einnahme erfasst'));
    };
  }

  async function belegVorbereiten(datei) {
    let daten = datei, typ = datei.type || 'application/octet-stream';
    if (typ.startsWith('image/')) {
      try { daten = await bildVerkleinern(datei); typ = 'image/jpeg'; } catch { /* Original behalten */ }
    }
    const name = typ === 'image/jpeg' && !/\.jpe?g$/i.test(datei.name) ? datei.name.replace(/\.[^.]+$/, '') + '.jpg' : datei.name;
    return { name: name || 'Beleg', typ, daten };
  }

  function bildVerkleinern(datei) {
    return new Promise((ok, fehler) => {
      const img = new Image();
      const url = URL.createObjectURL(datei);
      img.onload = () => {
        const max = 1800;
        const f = Math.min(1, max / Math.max(img.naturalWidth, img.naturalHeight));
        const c = document.createElement('canvas');
        c.width = Math.round(img.naturalWidth * f);
        c.height = Math.round(img.naturalHeight * f);
        c.getContext('2d').drawImage(img, 0, 0, c.width, c.height);
        URL.revokeObjectURL(url);
        c.toBlob((blob) => (blob ? ok(blob) : fehler(new Error('leer'))), 'image/jpeg', 0.82);
      };
      img.onerror = () => { URL.revokeObjectURL(url); fehler(new Error('Bild')); };
      img.src = url;
    });
  }

  function belegZeigen(x) {
    if (!x || !x.daten) return;
    const url = URL.createObjectURL(x.daten);
    if (!x.typ.startsWith('image/')) { window.open(url, '_blank'); return; }
    const dlg = $('dlg2');
    dlg.innerHTML = `<div class="dlg-kopf"><h3>${esc(x.name)}</h3><button type="button" class="x" data-zurueck aria-label="Schliessen">×</button></div>
      <div class="dlg-inhalt"><img class="beleg-ansicht" src="${url}" alt="Beleg" /></div>
      <div class="dlg-fuss"><div class="rechts"><button class="btn" data-laden>Herunterladen</button><button class="btn btn-haupt" data-zurueck>Schliessen</button></div></div>`;
    dlg.onclick = (e) => {
      const t = e.target.closest('button');
      if (e.target === dlg) { dlg.close(); return; }
      if (!t) return;
      if (t.matches('[data-laden]')) herunterladen(x.name, x.daten);
      if (t.matches('[data-zurueck]')) dlg.close();
    };
    dlg.onclose = () => URL.revokeObjectURL(url);
    dlg.showModal();
  }

  /* ---------- Onlineshop-Bestellungen (Verkauf Plus): Shopify, WooCommerce und andere CSV-Exporte ---------- */
  async function shopImport() {
    const l = lizenzJetzt();
    if (O && l && O.darf && !O.darf(l, 'verkauf')) { if (window.OrdasioZusatz) OrdasioZusatz.erklaeren('verkauf'); return; }
    const datei = await new Promise((ok) => { const i = document.createElement('input'); i.type = 'file'; i.accept = '.csv,text/csv'; i.onchange = () => ok(i.files[0] || null); i.click(); });
    if (!datei || !window.Auszug || !Auszug.zerlegen) return;
    const zeilen = Auszug.zerlegen(await datei.text()).filter((z) => z.some((x) => x));
    if (zeilen.length < 2) { toast('In dieser Datei habe ich keine Bestellungen gefunden'); return; }
    const kopf = zeilen[0].map((x) => x.toLowerCase().trim());
    const spalte = (...re) => { for (const x of re) { const i = kopf.findIndex((h) => x.test(h)); if (i >= 0) return i; } return -1; };
    const S = {
      nr: spalte(/^name$/, /order number/, /bestellnummer/, /^order id$/, /^bestellung$/, /^order$/),
      datum: spalte(/paid at/, /^order date/, /bestelldatum/, /^created at/, /^datum/, /^date/),
      total: spalte(/^total$/, /order total amount/, /^order total$/, /gesamtsumme/, /bestellsumme/, /^summe/, /^betrag/),
      mwst: spalte(/^taxes$/, /order total tax/, /^tax total/, /mwst/, /steuer/),
      status: spalte(/financial status/, /order status/, /bestellstatus/, /^status$/),
      kunde: spalte(/billing name/, /^billing first name/, /kunde/, /^customer/, /^email$/),
      waehrung: spalte(/^currency$/, /währung/),
    };
    if (S.total < 0 || S.datum < 0) { toast('Spalten für Datum und Betrag nicht erkannt. Bitte den Bestell-Export als CSV laden.', 6000); return; }
    const bekannt = new Set(Z.buchungen.map((b) => b.importSchluessel).filter(Boolean));
    const liste = [], gesehen = new Set();
    let uebersprungen = 0;
    for (const z of zeilen.slice(1)) {
      const nr = S.nr >= 0 ? z[S.nr] : '', datum = Auszug.tagLesen ? Auszug.tagLesen(String(z[S.datum] || '').slice(0, 25)) : String(z[S.datum] || '').slice(0, 10);
      const betrag = Auszug.geld ? Auszug.geld(z[S.total]) : Math.round(Number(String(z[S.total]).replace(/[^0-9.,-]/g, '').replace(',', '.')) * 100);
      const status = S.status >= 0 ? String(z[S.status] || '').toLowerCase() : '';
      // Shopify: mehrere Zeilen pro Bestellung (eine pro Artikel); nur die erste mit Betrag zählt
      if (!datum || !betrag || (nr && gesehen.has(nr))) continue;
      if (/refund|erstatt|cancel|storn|fail|pending|ausstehend|abgebrochen/.test(status)) { uebersprungen++; continue; }
      if (nr) gesehen.add(nr);
      const schluessel = 'shop-' + (nr || datum + '-' + betrag);
      if (bekannt.has(schluessel)) { uebersprungen++; continue; }
      const mwst = S.mwst >= 0 && Auszug.geld ? Math.abs(Auszug.geld(z[S.mwst]) || 0) : 0;
      liste.push({ id: 'shop-' + Date.now().toString(36) + '-' + liste.length, typ: 'einnahme', quelle: 'shop', importSchluessel: schluessel, datum, betragRappen: Math.abs(betrag), mwstRappen: mwst, mwstSatz: mwst ? 8.1 : 0,
        kategorie: 'materialverkauf', partner: S.kunde >= 0 ? String(z[S.kunde] || '').slice(0, 80) : '', text: `Onlineshop ${nr || ''}`.trim(), zahlung: 'Bank', imp: 'shop-' + Date.now(), impAm: new Date().toISOString(), impName: datei.name,
        ...(S.waehrung >= 0 && z[S.waehrung] && z[S.waehrung].toUpperCase() !== 'CHF' ? { waehrungHinweis: z[S.waehrung].toUpperCase() } : {}) });
    }
    if (!liste.length) { toast(uebersprungen ? `Keine neuen Bestellungen (${uebersprungen} schon da oder nicht bezahlt)` : 'Keine Bestellungen gefunden', 5000); return; }
    const summe = liste.reduce((a, b) => a + b.betragRappen, 0);
    const fremd = liste.filter((b) => b.waehrungHinweis).length;
    if (!await UI.frage(`${liste.length} bezahlte Bestellungen über CHF ${chf(summe)} als Einnahmen buchen?${uebersprungen ? `\n\n${uebersprungen} übersprungen (schon gebucht, storniert oder offen).` : ''}${fremd ? `\n\nAchtung: ${fremd} Bestellungen sind nicht in CHF. Bitte die Beträge prüfen.` : ''}`, { ja: 'Buchen', gefahr: false })) return;
    await Speicher.mehrereSpeichern('buchungen', liste.map((b) => ({ ...b, geaendert: new Date().toISOString() })));
    await neuLaden(`${liste.length} Bestellungen gebucht`);
    if (window.Rueckgaengig) setTimeout(() => Rueckgaengig.zeigen(`${liste.length} Bestellungen gebucht`, async () => { await Speicher.mehrereLoeschen('buchungen', liste.map((b) => b.id)); await neuLaden('Import rückgängig gemacht'); }), 700);
  }

  async function neuLaden(meldung) {
    await laden();
    zeichnen();
    if (meldung) toast(meldung);
  }

  /* ================= MWST ================= */
  function fristVon(jahr, q) {
    // 60 Tage nach Ende der Abrechnungsperiode
    const ende = new Date(Number(jahr), q * 3, 0);
    ende.setDate(ende.getDate() + 60);
    return ende.toLocaleDateString('sv-SE');
  }

  function mwstRechnen(jahr, q, bis = '') {
    const vereinnahmt = Z.einst.abrechnung === 'vereinnahmt';
    const imQuartal = (d) => d && d.startsWith(jahr) && quartalVon(d) === q && (!bis || d <= bis);
    const ein = Z.buchungen.filter((b) => b.typ === 'einnahme' && imQuartal(vereinnahmt && b.quelle === 'rechnung' ? (b.bezahlt ? b.bezahltAm : '') : b.datum));
    const aus = Z.buchungen.filter((b) => b.typ === 'ausgabe' && imQuartal(b.datum));
    const proSatz = {};
    for (const b of ein) {
      const s = Number(b.mwstSatz) || 0;
      proSatz[s] = proSatz[s] || { netto: 0, steuer: 0 };
      proSatz[s].netto += netto(b);
      proSatz[s].steuer += b.mwstRappen || 0;
    }
    const umsatz = ein.reduce((a, b) => a + netto(b), 0);
    const steuer = ein.reduce((a, b) => a + (b.mwstRappen || 0), 0);
    const v400 = aus.filter((b) => katAus(b.kategorie).ziffer === 400).reduce((a, b) => a + (b.mwstRappen || 0), 0);
    const v405 = aus.filter((b) => katAus(b.kategorie).ziffer === 405).reduce((a, b) => a + (b.mwstRappen || 0), 0);
    const ohneMwst = proSatz[0] ? proSatz[0].netto : 0;
    return { ein, aus, proSatz, umsatz, ohneMwst, steuer, v400, v405, vorsteuer: v400 + v405, zahlen: steuer - v400 - v405 };
  }

  function mwstAnsicht() {
    const q = Z.quartal;
    const r = mwstRechnen(Z.jahr, q);
    const zeile = (z, text, betrag, klasse = '') => `<tr class="${klasse}"><td class="z">${z}</td><td>${text}</td><td class="b">${betrag}</td></tr>`;
    const satzZeilen = [[8.1, '303', 'Normalsatz 8.1 %'], [2.6, '313', 'Reduzierter Satz 2.6 %'], [3.8, '343', 'Beherbergung 3.8 %']]
      .filter(([s]) => r.proSatz[s])
      .map(([s, z, n]) => `<tr><td class="z">${z}</td><td>${n}<br><span class="hinweis">Umsatz ${chf(r.proSatz[s].netto)}</span></td><td class="b">${chf(r.proSatz[s].steuer)}</td></tr>`).join('');
    const fehlend = r.aus.filter((b) => !b.belegId).length;
    return `
    <div class="kopf">
      <div><h1>MWST-Abrechnung</h1><p class="unter">Effektive Methode, ${Z.einst.abrechnung === 'vereinnahmt' ? 'nach vereinnahmten' : 'nach vereinbarten'} Entgelten</p></div>
      <div class="kopf-aktionen">${jahrWahl()}
        <div class="segment">${[1, 2, 3, 4].map((n) => `<button class="${q === n ? 'an' : ''}" data-quartal="${n}">Q${n}</button>`).join('')}</div>
      </div>
    </div>
    <div class="raster raster-2">
      <div class="card">
        <h2>Werte für das Formular der ESTV, ${q}. Quartal ${Z.jahr}</h2>
        <table>
          <tr><th>Ziffer</th><th></th><th class="b">CHF</th></tr>
          ${zeile('200', 'Total Umsatz (ohne MWST)', chf(r.umsatz))}
          ${r.ohneMwst ? zeile('', '<span class="hinweis">davon ohne MWST, bitte prüfen, unter welche Ziffer (220 bis 280) dieser Umsatz gehört</span>', chf(r.ohneMwst)) : ''}
          ${zeile('299', 'Steuerbarer Umsatz', chf(r.umsatz - r.ohneMwst))}
          ${satzZeilen || zeile('303', 'Normalsatz 8.1 %', '0.00')}
          ${zeile('399', 'Total geschuldete Steuer', chf(r.steuer), 'summe')}
          ${zeile('400', 'Vorsteuer auf Material und Dienstleistungen', chf(r.v400))}
          ${zeile('405', 'Vorsteuer auf Investitionen und übrigem Aufwand', chf(r.v405))}
          ${zeile('479', 'Total Vorsteuer', chf(r.vorsteuer), 'summe')}
          ${zeile(r.zahlen >= 0 ? '500' : '510', r.zahlen >= 0 ? 'Zu bezahlender Betrag' : 'Guthaben', chf(Math.abs(r.zahlen)), 'summe')}
        </table>
        <p class="hinweis abstand">Frist für Abrechnung und Zahlung: <strong>${datumKurz(fristVon(Z.jahr, q))}</strong>. Bitte die Werte vor dem Einreichen kurz prüfen.</p>
      </div>
      <div class="card">
        <h2>Woher die Zahlen kommen</h2>
        <div class="kennzahl"><div class="label">Einnahmen im Quartal</div><div class="wert">${r.ein.length}</div><div class="klein">Buchungen mit ${chf(r.steuer)} MWST</div></div>
        <div class="kennzahl abstand"><div class="label">Ausgaben im Quartal</div><div class="wert">${r.aus.length}</div><div class="klein">Buchungen mit ${chf(r.vorsteuer)} Vorsteuer</div></div>
        ${fehlend ? `<p class="abstand"><span class="marke marke-offen">${fehlend} ${fehlend === 1 ? 'Ausgabe' : 'Ausgaben'} ohne Beleg</span></p><p class="hinweis" style="margin-top:6px">Für den Vorsteuerabzug braucht es eine Quittung oder Rechnung. Bitte den Beleg noch hinzufügen.</p>` : ''}
        <div class="abstand" style="display:flex;gap:8px;flex-wrap:wrap">
          <button class="btn btn-klein" onclick="NB.mwstCsv()">Als CSV speichern</button>
          <button class="btn btn-klein nur-pc" onclick="window.print()">Drucken</button>
        </div>
        ${doppeltAktiv() ? mwstVerbuchenHtml(q, r) : ''}
      </div>
    </div>`;
  }
  document.addEventListener('click', (e) => {
    const t = e.target.closest('[data-quartal]');
    if (t) { Z.quartal = Number(t.dataset.quartal); zeichnen(); }
  });

  function csv(zeilen) {
    const feld = (v) => { const s = String(v ?? ''); return /[;"\n]/.test(s) ? '"' + s.replace(/"/g, '""') + '"' : s; };
    return '﻿' + zeilen.map((z) => z.map(feld).join(';')).join('\r\n');
  }
  const csvBetrag = (r) => ((r || 0) / 100).toFixed(2);
  const buchungsZeilen = (liste) => [
    ['Datum', 'Art', 'Kategorie', 'Beschreibung', 'Kunde/Lieferant', 'Betrag inkl. MWST', 'MWST-Satz', 'MWST/Vorsteuer', 'Betrag ohne MWST', 'Bezahlt mit', 'Rechnung', 'Bezahlt am', 'Beleg'],
    ...sortiert(liste).reverse().map((b) => [datumKurz(b.datum), b.typ === 'einnahme' ? 'Einnahme' : 'Ausgabe', katName(b), b.text, b.partner,
      csvBetrag(b.betragRappen), b.mwstSatz, csvBetrag(b.mwstRappen), csvBetrag(netto(b)), b.zahlung, b.rechnungNr || '',
      b.quelle === 'rechnung' ? (b.bezahlt ? datumKurz(b.bezahltAm) : 'offen') : '', b.belegId ? 'ja' : 'nein']),
  ];

  /* ================= Jahresabschluss ================= */
  /* ---------- Jahresabschluss-Assistent: Schritt für Schritt bis zum Festschreiben ---------- */
  function abschlussAssistent() {
    const j = Z.jahr, h = heute();
    if (j > h.slice(0, 4)) return '';
    const liste = imJahr(j), hand = ((Z.einst.abschlussCheck || {})[j]) || {};
    const bankBis = liste.filter((b) => b.imp && b.zahlung !== 'Bar').reduce((m, b) => (b.datum > m ? b.datum : m), '');
    const ohneBeleg = liste.filter((b) => b.typ === 'ausgabe' && !b.belegId).length;
    const offen = liste.filter(istOffen).length;
    const ks = kasseStand();
    const fest = festBis() >= j + '-12-31';
    const S = [
      ['bank', 'Alle Bankauszüge bis 31.12. geladen', bankBis >= j + '-12-20', bankBis ? `Letzte Bankbuchung: ${datumKurz(bankBis)}` : 'Noch kein Bankauszug für dieses Jahr', 'NB.bankImport()', 'Bankauszug laden'],
      ['belege', 'Belege zu allen Ausgaben', !ohneBeleg, ohneBeleg ? `${ohneBeleg} Ausgaben ohne Beleg` : 'Alle Ausgaben haben einen Beleg', "NB.ansicht('buchungen')", 'Ansehen'],
      ['debitoren', 'Offene Rechnungen geprüft', !offen || !!hand.debitoren, offen ? `${offen} Rechnungen per 31.12. noch offen: bleiben als Guthaben stehen` : 'Keine offenen Rechnungen', '', ''],
      ['kasse', 'Kassenbestand stimmt mit dem Bargeld überein', !!hand.kasse, `Kasse laut Ordasio: CHF ${chf(ks.bestand)}`, '', ''],
      ['mwst', 'MWST des 4. Quartals abgerechnet', !!hand.mwst, 'Frist: 28. Februar', "NB.ansicht('mwst')", 'Zur MWST'],
      ['privat', 'Privatanteile gebucht (Auto, Telefon, Wohnung)', !!hand.privat, 'Privat genutzte Anteile sind kein Geschäftsaufwand', '', ''],
      ...(doppeltAktiv() ? [['abschreibung', 'Abschreibungen und Abgrenzungen gebucht', !!hand.abschreibung, 'Fahrzeuge, Maschinen, IT; Rechnungen fürs nächste Jahr abgrenzen', "NB.ansicht('konten')", 'Zum Journal']] : []),
      ['inventar', 'Warenlager und angefangene Arbeiten gezählt', !!hand.inventar, 'Nur wenn Sie ein Lager oder laufende Aufträge haben', '', ''],
      ['fest', `Jahr ${j} festschreiben`, fest, fest ? 'Festgeschrieben, wie es die GeBüV verlangt' : 'Zum Schluss: danach ist das Jahr unveränderbar', '', ''],
    ];
    const fertig = S.filter((x) => x[2]).length;
    if (fest && fertig === S.length) return '';
    return `<div class="card abstand-unten ja-karte"><div class="ja-kopf"><h2 style="margin:0">Jahresabschluss ${j}: ${fertig} von ${S.length} erledigt</h2><div class="pj-spur" style="flex:1;max-width:220px"><i style="width:${Math.round(fertig / S.length * 100)}%"></i></div></div>
      ${S.map(([id, t, ok, info, aktion, knopf]) => `<div class="ja-zeile ${ok ? 'ok' : ''}"><button class="ja-haken" ${['bank', 'belege', 'fest'].includes(id) || (id === 'debitoren' && !offen) ? 'disabled' : `data-ja="${id}"`} aria-label="Erledigt">${ok ? '✓' : ''}</button><div class="ja-text"><b>${esc(t)}</b><small>${esc(info)}</small></div>${!ok && aktion ? `<button class="btn klein" onclick="${aktion}">${knopf}</button>` : ''}</div>`).join('')}
      <p class="hinweis abstand">Abhaken, was Sie selbst geprüft haben. Mit Ihrem Treuhänder-Zugang kann auch Ihr Treuhänder mitschauen.</p></div>`;
  }
  document.addEventListener('click', async (e) => {
    const b = e.target.closest('[data-ja]'); if (!b) return;
    const alle = { ...(Z.einst.abschlussCheck || {}) }, j = Z.jahr; alle[j] = { ...(alle[j] || {}), [b.dataset.ja]: !(alle[j] || {})[b.dataset.ja] };
    await einstSpeichern({ abschlussCheck: alle }); zeichnen();
  });
  function abschluss() {
    const bis = Z.stichtag && Z.stichtag.startsWith(Z.jahr) ? Z.stichtag : '';
    const liste = imJahr(Z.jahr).filter((b) => !bis || b.datum <= bis);
    const gruppe = (typ, kats) => kats.map((k) => ({ k, r: liste.filter((b) => b.typ === typ && b.kategorie === k.id).reduce((a, b) => a + netto(b), 0) })).filter((x) => x.r);
    const ein = gruppe('einnahme', KAT_EIN);
    const aus = gruppe('ausgabe', KAT_AUS);
    const s = summen(liste);
    const offen = liste.filter(istOffen);
    const mwstJahr = [1, 2, 3, 4].filter((q) => !bis || q <= quartalVon(bis)).map((q) => ({ q, ...mwstRechnen(Z.jahr, q, bis) }));
    const jetztJahr = Z.jahr === String(new Date().getFullYear());
    return `
    <div class="stichtag-leiste">
      <div class="segment"><button class="${bis ? '' : 'an'}" data-ganzjahr>Ganzes Jahr</button>${jetztJahr ? `<button class="${bis === heute() ? 'an' : ''}" data-zwischen>Bis heute</button>` : ''}</div>
      <label class="hinweis">Stichtag <input type="date" class="auswahl-klein" data-stichtag value="${bis}" min="${Z.jahr}-01-01" max="${Z.jahr}-12-31" /></label>
    </div>
    ${bis ? '' : abschlussAssistent()}
    <div class="kopf">
      <div><h1>${bis ? 'Zwischenbilanz per ' + datumKurz(bis) : 'Jahresabschluss ' + Z.jahr}</h1><p class="unter">${bis ? `Erfolgsrechnung und Bilanz vom 01.01. bis ${datumKurz(bis)}, Beträge ohne MWST` : 'Erfolgsrechnung für die Steuererklärung, Beträge ohne MWST'}</p></div>
      <div class="kopf-aktionen">${jahrWahl()}<button class="btn" onclick="NB.jahrCsv()">Alle Buchungen als CSV</button><button class="btn" onclick="window.print()">Als PDF drucken</button></div>
    </div>
    <div class="raster raster-2">
      <div class="card">
        <h2>Erfolgsrechnung</h2>
        <table>
          <tr><th colspan="2">Ertrag</th></tr>
          ${ein.map((x) => `<tr><td>${esc(x.k.name)}</td><td class="b">${chf(x.r)}</td></tr>`).join('') || '<tr><td class="hinweis">Keine Einnahmen</td><td></td></tr>'}
          <tr class="summe"><td>Total Ertrag</td><td class="b">${chf(s.ein)}</td></tr>
          <tr><th colspan="2" style="padding-top:18px">Aufwand</th></tr>
          ${aus.map((x) => `<tr><td>${esc(x.k.name)}</td><td class="b">${chf(x.r)}</td></tr>`).join('') || '<tr><td class="hinweis">Keine Ausgaben</td><td></td></tr>'}
          <tr class="summe"><td>Total Aufwand</td><td class="b">${chf(s.aus)}</td></tr>
          <tr class="summe"><td>${s.gewinn >= 0 ? 'Gewinn' : 'Verlust'}</td><td class="b ${s.gewinn < 0 ? 'minus' : 'plus'}">${chf(Math.abs(s.gewinn))}</td></tr>
        </table>
      </div>
      <div>
        <div class="card">
          <h2>MWST im Jahr ${Z.jahr}</h2>
          <table>
            <tr><th>Quartal</th><th class="b">Steuer</th><th class="b">Vorsteuer</th><th class="b">Saldo</th></tr>
            ${mwstJahr.map((m) => `<tr><td>Q${m.q}</td><td class="b">${chf(m.steuer)}</td><td class="b">${chf(m.vorsteuer)}</td><td class="b">${chf(m.zahlen)}</td></tr>`).join('')}
            <tr class="summe"><td>Total</td><td class="b">${chf(mwstJahr.reduce((a, m) => a + m.steuer, 0))}</td><td class="b">${chf(mwstJahr.reduce((a, m) => a + m.vorsteuer, 0))}</td><td class="b">${chf(mwstJahr.reduce((a, m) => a + m.zahlen, 0))}</td></tr>
          </table>
        </div>
        <div class="card abstand">
          <h2>Offene Rechnungen ${bis ? 'per ' + datumKurz(bis) : 'Ende Jahr'}</h2>
          ${offen.length ? `<table>${offen.map((b) => `<tr><td>${esc(b.rechnungNr || '')} ${esc(b.partner || '')}</td><td class="b">${chf(b.betragRappen)}</td></tr>`).join('')}
            <tr class="summe"><td>Total Guthaben bei Kunden</td><td class="b">${chf(offen.reduce((a, b) => a + b.betragRappen, 0))}</td></tr></table>`
            : '<p class="hinweis">Alle Rechnungen aus diesem Jahr sind bezahlt.</p>'}
        </div>
        ${bilanzKarte(offen, bis)}
        <p class="hinweis abstand">Diese Übersicht geben Sie am besten zusammen mit der CSV-Datei Ihrem Treuhänder oder legen sie der Steuererklärung bei. Mit „Als PDF drucken“ entsteht ein sauberes Dokument.</p>
      </div>
    </div>`;
  }
  document.addEventListener('change', (e) => {
    if (!e.target.matches('[data-stichtag]')) return;
    Z.stichtag = e.target.value;
    if (Z.stichtag) Z.jahr = Z.stichtag.slice(0, 4);
    zeichnen();
  });
  document.addEventListener('click', (e) => {
    if (e.target.closest('[data-zwischen]')) { Z.stichtag = heute(); zeichnen(); }
    if (e.target.closest('[data-ganzjahr]')) { Z.stichtag = ''; zeichnen(); }
  });
  const BILANZ_FELDER = { bank: 'Bankkonten', kasse: 'Kasse (Bargeld)', anlagen: 'Fahrzeug, Geräte, Maschinen', schulden: 'Offene Lieferantenrechnungen', darlehen: 'Darlehen und Kredite' };
  const bilanzSchluessel = () => (Z.stichtag && Z.stichtag.startsWith(Z.jahr) ? Z.stichtag : Z.jahr);
  function bilanzKarte(offen, bis = '') {
    const w = ((Z.einst.bilanz || {})[bilanzSchluessel()]) || {};
    const forderungen = offen.reduce((a, b) => a + b.betragRappen, 0);
    const qn = bis ? quartalVon(bis) : 4;
    const q4 = mwstRechnen(Z.jahr, qn, bis).zahlen;
    const aktiv = (w.bank || 0) + (w.kasse || 0) + (w.anlagen || 0) + forderungen + (q4 < 0 ? -q4 : 0);
    const fremd = (w.schulden || 0) + (w.darlehen || 0) + (q4 > 0 ? q4 : 0);
    const feld = (id) => `<tr><td>${BILANZ_FELDER[id]}</td><td class="b"><input class="bilanz-eingabe" inputmode="decimal" data-bilanz="${id}" value="${w[id] ? chf(w[id]).replace(/’/g, '') : ''}" placeholder="0.00" /></td></tr>`;
    return `<div class="card abstand">
      <h2>Bilanz per ${bis ? datumKurz(bis) : '31.12.' + Z.jahr}</h2>
      <p class="hinweis" style="margin-bottom:8px">Tragen Sie die Kontostände und Werte per Stichtag ein. Offene Rechnungen und MWST kommen automatisch.</p>
      <table>
        <tr><th colspan="2">Aktiven</th></tr>
        ${feld('bank')}${feld('kasse')}
        <tr><td>Guthaben bei Kunden (offene Rechnungen)</td><td class="b">${chf(forderungen)}</td></tr>
        ${q4 < 0 ? `<tr><td>MWST-Guthaben Q${qn}</td><td class="b">${chf(-q4)}</td></tr>` : ''}
        ${feld('anlagen')}
        <tr class="summe"><td>Total Aktiven</td><td class="b">${chf(aktiv)}</td></tr>
        <tr><th colspan="2" style="padding-top:16px">Passiven</th></tr>
        ${feld('schulden')}
        ${q4 > 0 ? `<tr><td>MWST-Schuld Q${qn}</td><td class="b">${chf(q4)}</td></tr>` : ''}
        ${feld('darlehen')}
        <tr class="summe"><td>Total Fremdkapital</td><td class="b">${chf(fremd)}</td></tr>
        <tr class="summe"><td>Eigenkapital</td><td class="b ${aktiv - fremd < 0 ? 'minus' : 'plus'}">${chf(aktiv - fremd)}</td></tr>
      </table>
    </div>`;
  }
  document.addEventListener('change', async (e) => {
    const t = e.target.closest('[data-bilanz]');
    if (!t) return;
    const r = betragLesen(t.value);
    const bilanz = { ...(Z.einst.bilanz || {}) };
    const sk = bilanzSchluessel();
    bilanz[sk] = { ...(bilanz[sk] || {}), [t.dataset.bilanz]: Number.isFinite(r) ? r : 0 };
    await einstSpeichern({ bilanz });
    zeichnen();
  });

  /* ================= Doppelte Buchhaltung: Konten, Journal, Eröffnung, Abschluss ================= */
  const ART_NAME = { auto: 'Automatisch', manuell: 'Manuell', eroeffnung: 'Eröffnung', mwst: 'MWST', kasse: 'Kasse' };
  const KLASSEN = [['1', 'Aktiven'], ['2', 'Passiven'], ['3', 'Ertrag'], ['4', 'Material und Waren'], ['5', 'Personal'], ['6', 'Übriger Aufwand'], ['7', 'Nebenbetriebe'], ['8', 'Betriebsfremd, ausserordentlich, Steuern'], ['9', 'Abschluss']];
  function kontoOptionen(wert, filter) {
    const plan = kontenplan().filter((k) => k.art !== 'abschluss' && (!filter || filter(k)));
    return '<option value="">Konto wählen</option>' + KLASSEN.map(([z, n]) => {
      const l = plan.filter((k) => k.nr[0] === z);
      return l.length ? `<optgroup label="${z} ${esc(n)}">${l.map((k) => `<option value="${k.nr}" ${k.nr === wert ? 'selected' : ''}>${k.nr} ${esc(k.name)}</option>`).join('')}</optgroup>` : '';
    }).join('');
  }
  const eroeffnung = () => Z.journal.find((j) => j.id === 'eroeffnung' && !j.geloescht) || null;
  function naechsterBeleg() {
    const n = Z.journal.map((j) => /^J-(\d+)$/.exec(j.beleg || '')).filter(Boolean).map((m) => Number(m[1]));
    return 'J-' + String((n.length ? Math.max(...n) : 0) + 1).padStart(4, '0');
  }
  const betragZelle = (x) => `<td class="b ${x < 0 ? 'minus' : ''}">${chf(x)}</td>`;

  function kontenAnsicht() {
    const tabs = [['journal', 'Journal'], ['salden', 'Saldenliste'], ['plan', 'Kontenplan']];
    const inhalt = { journal: journalTab, salden: saldenTab, plan: planTab }[Z.kontenTab] || journalTab;
    const rfName = O ? O.RECHTSFORMEN[rechtsform()].name : rechtsform();
    return `
    <div class="kopf">
      <div><h1>Konten</h1><p class="unter">Doppelte Buchhaltung nach KMU-Kontenrahmen · ${esc(rfName)}${festBis() ? ` · festgeschrieben bis ${datumKurz(festBis())}` : ''}</p></div>
      <div class="kopf-aktionen">${jahrWahl()}<button class="btn" onclick="NB.eroeffnung()">Eröffnungsbilanz</button><button class="btn" onclick="NB.fremdImport()">Aus bexio, Banana … übernehmen</button><button class="btn" onclick="NB.journalCsv()">Journal als CSV</button><button class="btn btn-haupt" onclick="NB.journalNeu()">+ Buchung Soll an Haben</button></div>
    </div>
    ${eroeffnungHinweis()}
    <div class="segment" style="margin-bottom:12px">${tabs.map(([id, n]) => `<button class="${Z.kontenTab === id ? 'an' : ''}" data-ktab="${id}">${n}</button>`).join('')}</div>
    ${inhalt()}`;
  }
  function eroeffnungHinweis() {
    if (eroeffnung()) return '';
    return `<div class="card abstand-unten" style="border:1px solid rgba(183,121,31,.3)"><h2>Zuerst die Eröffnungsbilanz</h2>
      <p class="hinweis">Tragen Sie einmal ein, womit Ihre Buchhaltung startet: ${kapitalName() ? 'das einbezahlte ' + kapitalName() + ', ' : ''}Bankguthaben, Kasse, offene Rechnungen, Fahrzeuge, Darlehen. Bei einer Neugründung reicht meist eine Zeile: Bank an Kapital.</p>
      <button class="btn btn-haupt abstand" onclick="NB.eroeffnung()">Eröffnungsbilanz erfassen</button> <button class="btn abstand" onclick="NB.fremdImport()">Aus bexio, Banana … übernehmen</button></div>`;
  }

  function journalTab() {
    const f = Z.journalFilter, q = f.suche.trim().toLowerCase();
    const plan = kontenplan();
    const liste = eintraege().filter((e) => e.datum.startsWith(Z.jahr)
      && (f.art === 'alle' || (f.art === 'manuell' ? !['auto', 'kasse'].includes(e.art) : ['auto', 'kasse'].includes(e.art)))
      && (!q || [e.text, e.beleg, ...e.zeilen.flatMap((z) => [z.soll, z.haben, D.nameVon(plan, z.soll), D.nameVon(plan, z.haben), chf(z.betrag)])].join(' ').toLowerCase().includes(q)));
    const zuViel = liste.length > 400;
    const zeigen = zuViel ? liste.slice(-400) : liste;
    const zeilenJ = zeigen.map((e) => e.zeilen.map((z, i) => `<tr class="klick" data-jeintrag="${esc(e.id)}">
        <td class="num">${i ? '' : datumKurz(e.datum)}</td><td class="num">${i ? '' : esc(e.beleg || '')}</td>
        <td>${i ? '' : `${esc(e.text || '')}${e.art !== 'auto' ? ` <span class="marke marke-info">${ART_NAME[e.art] || 'Manuell'}</span>` : ''}`}</td>
        <td><span class="kontonr">${z.soll}</span> <span class="nur-pc">${esc(D.nameVon(plan, z.soll))}</span></td>
        <td><span class="kontonr">${z.haben}</span> <span class="nur-pc">${esc(D.nameVon(plan, z.haben))}</span></td>
        <td class="b">${chf(z.betrag)}</td></tr>`).join('')).join('');
    return `
    <div class="filter">
      <div class="segment">${[['alle', 'Alle'], ['manuell', 'Manuell'], ['auto', 'Automatisch']].map(([id, n]) => `<button class="${f.art === id ? 'an' : ''}" data-jart="${id}">${n}</button>`).join('')}</div>
      <input type="search" placeholder="Text, Konto oder Betrag suchen" value="${esc(f.suche)}" data-jsuche />
    </div>
    <div class="card scroll">${zeigen.length ? `<table class="journal"><tr><th>Datum</th><th>Beleg</th><th>Text</th><th>Soll</th><th>Haben</th><th class="b">Betrag</th></tr>${zeilenJ}</table>` : '<p class="leer">Keine Buchungen in diesem Jahr.</p>'}</div>
    <p class="hinweis abstand">${zuViel ? 'Es werden die letzten 400 Buchungen gezeigt, mit der Suche finden Sie alle. ' : ''}Automatische Buchungen entstehen aus Einnahmen, Ausgaben, Rechnungen, Löhnen und der Kasse. Zum Ändern öffnen Sie die ursprüngliche Buchung mit einem Klick.</p>`;
  }

  function saldenTab() {
    const sl = D.saldenliste({ plan: kontenplan(), eintraege: eintraege(), jahr: Z.jahr });
    const sichtbar = sl.filter((k) => Z.alleKonten || k.soll || k.haben);
    const gruppen = KLASSEN.map(([z, n]) => {
      const l = sichtbar.filter((k) => k.nr[0] === z);
      if (!l.length) return '';
      return `<tr><th colspan="5" style="padding-top:14px">${z} ${esc(n)}</th></tr>` + l.map((k) => `<tr class="klick" data-konto="${k.nr}"><td><span class="kontonr">${k.nr}</span></td><td>${esc(k.name)}</td><td class="b">${chf(k.soll)}</td><td class="b">${chf(k.haben)}</td>${betragZelle(k.saldo)}</tr>`).join('');
    }).join('');
    const tS = sichtbar.reduce((a, k) => a + k.soll, 0), tH = sichtbar.reduce((a, k) => a + k.haben, 0);
    return `
    <div class="filter"><label class="haken"><input type="checkbox" data-alle-konten ${Z.alleKonten ? 'checked' : ''} /> Auch Konten ohne Bewegung zeigen</label><button class="btn btn-klein" onclick="NB.saldenCsv()">Saldenliste als CSV</button></div>
    <div class="card scroll"><table class="journal"><tr><th>Konto</th><th>Bezeichnung</th><th class="b">Soll</th><th class="b">Haben</th><th class="b">Saldo</th></tr>${gruppen || '<tr><td colspan="5" class="leer">Noch keine Bewegungen.</td></tr>'}
      <tr class="summe"><td></td><td>Total</td><td class="b">${chf(tS)}</td><td class="b">${chf(tH)}</td><td></td></tr></table></div>
    <p class="hinweis abstand">Bilanzkonten (1 und 2) zeigen alle Bewegungen bis Ende ${Z.jahr}, Erfolgskonten (3 bis 8) nur das Jahr ${Z.jahr}. Soll und Haben sind immer gleich gross. Ein Klick öffnet das Kontoblatt.</p>`;
  }

  function planTab() {
    const plan = kontenplan().filter((k) => k.art !== 'abschluss');
    const fix = !!festBis();
    const ART = { aktiv: 'Aktiven', passiv: 'Passiven', aufwand: 'Aufwand', ertrag: 'Ertrag' };
    const katZeile = (k, typ) => `<tr><td>${esc(k.name)}</td><td><select class="auswahl-klein" data-kat-konto="${k.id}" data-typ="${typ}" ${fix ? 'disabled' : ''}>${kontoOptionen(D.kategorieKonto(Z.einst, typ, k.id), typ === 'einnahme' ? (x) => x.art === 'ertrag' || x.nr[0] === '8' : (x) => ['aufwand', 'aktiv'].includes(x.art))}</select></td></tr>`;
    return `
    <div class="raster raster-2">
      <div class="card">
        <h2>Kategorien und Konten</h2>
        <p class="hinweis" style="margin-bottom:8px">Jede Kategorie bucht auf ein Konto. ${fix ? 'Nach dem Festschreiben sind die Zuordnungen fix, damit abgeschlossene Jahre gleich bleiben. Für ein anderes Konto legen Sie eine neue Kategorie an.' : 'Ändern Sie das nur, wenn Ihr Treuhänder es so möchte.'}</p>
        <table><tr><th colspan="2">Ausgaben</th></tr>${sichtbar(KAT_AUS).map((k) => katZeile(k, 'ausgabe')).join('')}
          <tr><th colspan="2" style="padding-top:14px">Einnahmen</th></tr>${sichtbar(KAT_EIN).map((k) => katZeile(k, 'einnahme')).join('')}</table>
        <h2 class="abstand">Bezahlt mit</h2>
        <table>${ZAHLUNG.map((z) => `<tr><td>${z}</td><td><select class="auswahl-klein" data-zahl-konto="${z}" ${fix ? 'disabled' : ''}>${kontoOptionen(D.zahlungKonto(Z.einst, z), (x) => /^10/.test(x.nr) || x.nr === '2100')}</select></td></tr>`).join('')}</table>
      </div>
      <div class="card">
        <div style="display:flex;justify-content:space-between;align-items:center;gap:8px"><h2 style="margin:0">Kontenplan</h2><button class="btn btn-klein" data-konto-neu>+ Eigenes Konto</button></div>
        <p class="hinweis" style="margin:6px 0 8px">Schweizer KMU-Kontenrahmen für ${esc(O ? O.RECHTSFORMEN[rechtsform()].name : rechtsform())}. Eigene Konten und Namen sind möglich.</p>
        <table class="journal">${KLASSEN.slice(0, 8).map(([z, n]) => { const l = plan.filter((k) => k.nr[0] === z); return l.length ? `<tr><th colspan="3" style="padding-top:12px">${z} ${esc(n)}</th></tr>` + l.map((k) => `<tr><td><span class="kontonr">${k.nr}</span></td><td>${esc(k.name)}${k.standard ? '' : ' <span class="marke marke-info">eigenes</span>'}</td><td class="b"><button class="link" data-konto-umbenennen="${k.nr}">Umbenennen</button></td></tr>`).join('') : ''; }).join('')}</table>
        <p class="hinweis abstand">Arten: ${Object.values(ART).join(', ')}.</p>
      </div>
    </div>`;
  }
  async function kontoAnpassen(nr) {
    const plan = kontenplan(), alt = nr ? plan.find((k) => k.nr === nr) : null;
    kleinerDialog(`<h3 style="margin:0">${alt ? 'Konto umbenennen' : 'Eigenes Konto anlegen'}</h3>
      <div class="feld"><label>Kontonummer (4 Ziffern)</label><input name="nr" inputmode="numeric" pattern="[1-8][0-9]{3}" value="${alt ? alt.nr : ''}" ${alt ? 'readonly' : 'required'} placeholder="z. B. 1022"></div>
      <div class="feld"><label>Bezeichnung</label><input name="name" value="${esc(alt ? alt.name : '')}" required maxlength="80"></div>
      ${alt ? '' : `<div class="feld"><label>Art</label><select name="art"><option value="aktiv">Aktiven (1…)</option><option value="passiv">Passiven (2…)</option><option value="ertrag">Ertrag (3…, 8…)</option><option value="aufwand">Aufwand (4… bis 8…)</option></select></div>`}
      <p class="hinweis">Tipp: 1000 bis 1099 Geld, 1500 bis 1599 Sachanlagen, 2400 bis 2599 langfristige Schulden, 3000 bis 3999 Ertrag, 4000 bis 6999 Aufwand.</p>`,
    async (fd) => {
      const n = String(fd.get('nr') || '').trim(), name = String(fd.get('name') || '').trim();
      if (!/^[1-8]\d{3}$/.test(n)) { toast('Bitte eine vierstellige Kontonummer von 1000 bis 8999'); return false; }
      if (!alt && plan.some((k) => k.nr === n)) { toast(`Konto ${n} gibt es schon`); return false; }
      const art = alt ? alt.art : fd.get('art');
      const erwartet = D.artNachNummer(n);
      if (!alt && !((art === erwartet) || (n[0] === '8' && ['aufwand', 'ertrag'].includes(art)))) { toast(`Konto ${n} passt nicht zur Art ${art}. Nummern mit ${n[0]} sind ${erwartet}.`); return false; }
      const eigene = (Z.einst.konten || []).filter((k) => k.nr !== n);
      await einstSpeichern({ konten: [...eigene, { nr: n, name, art }] });
      zeichnen(); toast(alt ? 'Konto umbenannt' : 'Konto angelegt');
    });
  }

  /* ---------- Manuelle Buchung (Soll an Haben) ---------- */
  const VORLAGEN = [
    { id: 'frei', name: 'Freie Buchung', zeilen: [['', '']] },
    { id: 'privatbezug', name: 'Privatbezug (Geld für den Inhaber)', zeilen: [['2850', '1020']], nur: 'einzel', text: 'Privatbezug' },
    { id: 'privateinlage', name: 'Privateinlage (Inhaber bringt Geld)', zeilen: [['1020', '2850']], nur: 'einzel', text: 'Privateinlage' },
    { id: 'privatanteil', name: 'Privatanteil Fahrzeug', zeilen: [['2850', '6200']], nur: 'einzel', text: 'Privatanteil Fahrzeug', hinweis: 'Üblich sind 0.9 % des Kaufpreises pro Monat (Richtlinie der Steuerverwaltung). Bitte mit dem Treuhänder prüfen.' },
    { id: 'kapital', name: 'Einzahlung Stamm- oder Aktienkapital', zeilen: [['1020', '2800']], nur: 'firma', text: 'Kapitaleinzahlung' },
    { id: 'abschreibung', name: 'Abschreibung auf Sachanlagen', zeilen: [['6800', '1500']], text: 'Abschreibung', hinweis: 'Wählen Sie im Haben das Anlagekonto (z. B. 1530 Fahrzeuge). Üblich sind zum Beispiel 40 % vom Restwert für Fahrzeuge und Informatik, 25 % für Mobiliar.' },
    { id: 'mwst_zahlung', name: 'MWST an die ESTV bezahlt', zeilen: [['2200', '1020']], text: 'MWST-Zahlung ESTV' },
    { id: 'mwst_guthaben', name: 'MWST-Guthaben von der ESTV erhalten', zeilen: [['1020', '1170']], text: 'MWST-Guthaben ESTV' },
    { id: 'sozial_zahlung', name: 'Sozialversicherungen bezahlt (AHV, BVG, UVG)', zeilen: [['2270', '1020']], text: 'Zahlung Sozialversicherungen' },
    { id: 'darlehen_erhalten', name: 'Darlehen erhalten', zeilen: [['1020', '2450']], text: 'Darlehen erhalten' },
    { id: 'darlehen_zurueck', name: 'Darlehen zurückbezahlt', zeilen: [['2450', '1020']], text: 'Darlehen Rückzahlung' },
    { id: 'zinsen', name: 'Zinsen bezahlt', zeilen: [['6900', '1020']], text: 'Zinsen' },
    { id: 'aufwand_abgrenzen', name: 'Aufwand abgrenzen (Rechnung kommt erst später)', zeilen: [['6700', '2300']], text: 'Abgrenzung Aufwand', hinweis: 'Im neuen Jahr mit der umgekehrten Buchung wieder auflösen.' },
    { id: 'ertrag_abgrenzen', name: 'Ertrag abgrenzen (Arbeit gemacht, noch nicht verrechnet)', zeilen: [['1300', '3400']], text: 'Abgrenzung Ertrag', hinweis: 'Im neuen Jahr mit der umgekehrten Buchung wieder auflösen.' },
    { id: 'rueckstellung', name: 'Rückstellung bilden', zeilen: [['6700', '2330']], text: 'Rückstellung' },
    { id: 'steuern_rueck', name: 'Steuern zurückstellen (Gewinn und Kapital)', zeilen: [['8900', '2330']], nur: 'firma', text: 'Steuerrückstellung' },
    { id: 'steuern_zahlung', name: 'Steuern bezahlt (aus der Rückstellung)', zeilen: [['2330', '1020']], nur: 'firma', text: 'Steuerzahlung' },
    { id: 'reserve', name: 'Gewinnverwendung: gesetzliche Gewinnreserve', zeilen: [['2970', '2950']], nur: 'firma', text: 'Zuweisung gesetzliche Gewinnreserve', hinweis: 'Nach OR 672: 5 % des Jahresgewinns, bis die gesetzlichen Reserven die Hälfte des Kapitals erreichen. Bitte mit dem Treuhänder prüfen.' },
    { id: 'ausschuettung', name: 'Gewinnverwendung: Ausschüttung beschliessen', zeilen: [['2970', '2261']], nur: 'firma', text: 'Beschlossene Ausschüttung' },
    { id: 'ausschuettung_zahlung', name: 'Ausschüttung auszahlen (mit 35 % Verrechnungssteuer)', zeilen: [['2261', '1020'], ['2261', '2206']], nur: 'firma', text: 'Auszahlung Ausschüttung', hinweis: 'Beispiel 10’000: 6’500 auf die erste Zeile (an die Gesellschafter), 3’500 auf die zweite (Verrechnungssteuer an die ESTV).' },
    { id: 'bank_kasse', name: 'Bargeld vom Konto abgehoben', zeilen: [['1000', '1020']], text: 'Bargeld abgehoben' },
    { id: 'kasse_bank', name: 'Bargeld aufs Konto einbezahlt', zeilen: [['1020', '1000']], text: 'Bargeld einbezahlt' },
  ];
  function journalBearbeiten(vorhanden, vorlage = {}) {
    const { _hinweis, ...vor } = vorlage;
    const j = vorhanden ? JSON.parse(JSON.stringify(vorhanden)) : { datum: heute(), beleg: naechsterBeleg(), text: '', art: 'manuell', zeilen: [{ soll: '', haben: '', betrag: null }], ...vor };
    if (!j.zeilen || !j.zeilen.length) j.zeilen = [{ soll: '', haben: '', betrag: null }];
    const gesperrt = !!(vorhanden && istFest(vorhanden.datum));
    const dlg = $('dlg');
    const vorlagen = VORLAGEN.filter((v) => !v.nur || (v.nur === 'firma' ? istFirma() : !istFirma())).filter((v) => !(rechtsform() === 'verein' && ['kapital', 'reserve', 'ausschuettung', 'ausschuettung_zahlung'].includes(v.id)));
    const merken = () => {
      j.datum = $('jDatum').value; j.beleg = $('jBeleg').value.trim(); j.text = $('jText').value.trim();
      j.zeilen = [...dlg.querySelectorAll('[data-jz]')].map((r) => { const x = betragLesen(r.querySelector('[data-betrag]').value); return { soll: r.querySelector('[data-soll]').value, haben: r.querySelector('[data-haben]').value, betrag: Number.isFinite(x) ? x : null }; });
    };
    const summe = () => { const t = [...dlg.querySelectorAll('[data-betrag]')].reduce((a, x) => { const v = betragLesen(x.value); return a + (Number.isFinite(v) ? v : 0); }, 0); if ($('jSumme')) $('jSumme').textContent = t ? `Total ${chf(t)} CHF` : ''; };
    const zeichnenJ = (hinweis = '') => {
      dlg.innerHTML = `<form method="dialog" id="jForm">
        <div class="dlg-kopf"><h3>${vorhanden ? 'Buchung im Journal' : 'Neue Buchung: Soll an Haben'}</h3><button type="button" class="x" data-zu aria-label="Schliessen">×</button></div>
        <div class="dlg-inhalt">
          ${gesperrt ? `<p class="hinweis" style="background:var(--flaeche);padding:10px 12px;border-radius:10px"><b>Festgeschrieben bis ${datumKurz(festBis())}.</b> Korrekturen mit einer Storno-Buchung.</p>` : ''}
          ${!vorhanden ? `<div class="feld"><label for="jVorlage">Vorlage</label><select id="jVorlage"><option value="">Häufige Buchung wählen (freiwillig)</option>${vorlagen.map((v) => `<option value="${v.id}">${esc(v.name)}</option>`).join('')}</select></div>` : ''}
          ${hinweis ? `<p class="hinweis">${esc(hinweis)}</p>` : ''}
          <div class="feld-zeile"><div class="feld"><label for="jDatum">Datum</label><input type="date" id="jDatum" value="${j.datum || ''}" required ${gesperrt ? 'disabled' : ''} /></div>
            <div class="feld"><label for="jBeleg">Beleg-Nr.</label><input id="jBeleg" value="${esc(j.beleg || '')}" ${gesperrt ? 'disabled' : ''} /></div></div>
          <div class="feld"><label for="jText">Buchungstext</label><input id="jText" value="${esc(j.text || '')}" placeholder="z. B. Abschreibung Lieferwagen" ${gesperrt ? 'disabled' : ''} /></div>
          <div class="j-zeilen">
            <div class="j-zeile j-kopf"><span>Soll</span><span>Haben</span><span>Betrag CHF</span><span></span></div>
            ${j.zeilen.map((z, i) => `<div class="j-zeile" data-jz="${i}"><select data-soll aria-label="Soll-Konto" ${gesperrt ? 'disabled' : ''}>${kontoOptionen(z.soll)}</select><select data-haben aria-label="Haben-Konto" ${gesperrt ? 'disabled' : ''}>${kontoOptionen(z.haben)}</select><input data-betrag inputmode="decimal" placeholder="0.00" aria-label="Betrag" value="${z.betrag != null ? chf(z.betrag).replace(/’/g, '') : ''}" ${gesperrt ? 'disabled' : ''} />${j.zeilen.length > 1 && !gesperrt ? `<button type="button" class="x" data-jweg="${i}" aria-label="Zeile entfernen">×</button>` : '<span></span>'}</div>`).join('')}
          </div>
          ${gesperrt ? '' : '<div><button type="button" class="btn btn-klein" data-jplus>+ Zeile (Sammelbuchung)</button></div>'}
          <p class="hinweis" id="jSumme"></p>
          <p class="hinweis">Soll: Konto, das zunimmt (Aktiven, Aufwand) oder abnimmt (Schulden, Ertrag). Haben: das Gegenkonto. Beispiel Abschreibung: 6800 Abschreibungen an 1530 Fahrzeuge.</p>
        </div>
        <div class="dlg-fuss">
          ${vorhanden && !gesperrt ? '<button type="button" class="btn btn-rot" data-jloeschen>Löschen</button>' : ''}
          ${vorhanden ? '<button type="button" class="btn" data-jstorno>Storno-Buchung</button>' : ''}
          <div class="rechts"><button type="button" class="btn" data-zu>${gesperrt ? 'Schliessen' : 'Abbrechen'}</button>${gesperrt ? '' : '<button type="submit" class="btn btn-haupt">Speichern</button>'}</div>
        </div></form>`;
      summe();
    };
    zeichnenJ(_hinweis || '');
    dlg.showModal();
    dlg.addEventListener('close', () => { dlg.onsubmit = null; }, { once: true });
    dlg.oninput = (e) => { if (e.target.matches('[data-betrag]')) summe(); };
    dlg.onchange = (e) => {
      if (e.target.id !== 'jVorlage' || !e.target.value) return;
      merken();
      const v = VORLAGEN.find((x) => x.id === e.target.value);
      const betrag = j.zeilen[0] && j.zeilen[0].betrag;
      j.zeilen = v.zeilen.map(([so, ha], i) => ({ soll: so, haben: ha, betrag: i === 0 ? betrag : null }));
      if (!j.text || VORLAGEN.some((x) => x.text === j.text)) j.text = v.text || '';
      zeichnenJ(v.hinweis || '');
      const w = $('jVorlage'); if (w) w.value = v.id;
    };
    dlg.onclick = async (e) => {
      if (e.target === dlg) { dlg.close(); return; }
      const t = e.target.closest('button'); if (!t) return;
      if (t.matches('[data-zu]')) dlg.close();
      if (t.matches('[data-jplus]')) { merken(); j.zeilen.push({ soll: '', haben: '', betrag: null }); zeichnenJ(); }
      if (t.matches('[data-jweg]')) { merken(); j.zeilen.splice(Number(t.dataset.jweg), 1); zeichnenJ(); }
      if (t.matches('[data-jstorno]')) { dlg.close(); journalBearbeiten(null, { text: 'Storno: ' + (j.text || j.beleg || ''), zeilen: j.zeilen.map((z) => ({ soll: z.haben, haben: z.soll, betrag: z.betrag })) }); }
      if (t.matches('[data-jloeschen]')) {
        if (istFest(j.datum)) { toast('Festgeschrieben, Löschen nicht möglich'); return; }
        if (!await UI.frage('Diese Buchung löschen?')) return;
        await Speicher.loeschen('journal', j.id); dlg.close(); await neuLaden('Buchung gelöscht');
      }
    };
    dlg.onsubmit = async (e) => {
      e.preventDefault();
      if (gesperrt) return;
      merken();
      j.zeilen = j.zeilen.filter((z) => z.soll || z.haben || z.betrag);
      const fehler = D.pruefen(j, kontenplan());
      if (fehler) { toast(fehler); return; }
      if (istFest(j.datum)) { toast(`Bis ${datumKurz(festBis())} ist alles festgeschrieben. Bitte ein späteres Datum wählen.`); return; }
      if (j.id === 'eroeffnung' || j.art === 'eroeffnung') { toast('Die Eröffnungsbilanz bearbeiten Sie unter „Eröffnungsbilanz“'); return; }
      await Speicher.speichern('journal', { ...j, art: j.art || 'manuell', geloescht: false });
      dlg.close();
      await neuLaden(vorhanden ? 'Buchung geändert' : 'Buchung gespeichert');
    };
  }

  /* ---------- Eröffnungsbilanz ---------- */
  function eroeffnungDialog() {
    const plan = kontenplan();
    const alt = eroeffnung();
    const gesperrt = !!(alt && istFest(alt.datum));
    const werte = {};
    if (alt) for (const z of alt.zeilen || []) {
      if (z.haben === '9100') werte[z.soll] = (werte[z.soll] || 0) + (D.artNachNummer(z.soll) === 'aktiv' ? z.betrag : -z.betrag);
      if (z.soll === '9100') werte[z.haben] = (werte[z.haben] || 0) + (D.artNachNummer(z.haben) === 'passiv' ? z.betrag : -z.betrag);
    } else if ((kasse().anfang || 0) > 0) werte['1000'] = kasse().anfang;
    const ersteJahr = jahre().slice(-1)[0] || String(new Date().getFullYear());
    const datum = alt ? alt.datum : ersteJahr + '-01-01';
    const ekKonto = istFirma() ? '2970' : '2800';
    const konten = plan.filter((k) => D.istBilanzkonto(k.nr) && !['2891', '2979'].includes(k.nr));
    const feld = (k) => `<label class="eb-zeile"><span><span class="kontonr">${k.nr}</span> ${esc(k.name)}</span><input data-eb="${k.nr}" inputmode="decimal" placeholder="0.00" value="${werte[k.nr] ? chf(werte[k.nr]).replace(/’/g, '') : ''}" ${gesperrt ? 'disabled' : ''} /></label>`;
    const d = kleinerDialog(`<h3 style="margin:0">Eröffnungsbilanz</h3>
      <p class="hinweis">Die Bestände am ersten Tag in Ordasio, zum Beispiel aus der Schlussbilanz des Vorjahres. ${kapitalName() ? `Bei einer Neugründung: Bank und ${kapitalName()} mit dem einbezahlten Betrag.` : istFirma() ? 'Bei einem Neustart: Bank, Kasse und Vereinsvermögen.' : 'Bei einem Neustart: Bank, Kasse und Eigenkapital.'}</p>
      ${gesperrt ? `<p class="hinweis"><b>Festgeschrieben.</b> Die Eröffnungsbilanz kann nicht mehr geändert werden.</p>` : ''}
      <div class="feld"><label>Datum</label><input type="date" name="datum" value="${datum}" required ${gesperrt ? 'disabled' : ''}></div>
      <div class="eb-raster"><div><h4>Aktiven</h4>${konten.filter((k) => k.art === 'aktiv').map(feld).join('')}</div><div><h4>Passiven und Eigenkapital</h4>${konten.filter((k) => k.art === 'passiv').map(feld).join('')}</div></div>
      <div class="eb-summe" data-eb-summe></div>
      ${gesperrt ? '' : `<button type="button" class="btn btn-klein" data-eb-ausgleich>Differenz ins Eigenkapital (${ekKonto} ${esc(D.nameVon(plan, ekKonto))})</button>`}`,
    gesperrt ? null : async (fd) => {
      const w = lesen();
      if (w.aktiv !== w.passiv) { toast('Aktiven und Passiven müssen gleich gross sein'); return false; }
      const dt = fd.get('datum');
      if (istFest(dt)) { toast(`Bis ${datumKurz(festBis())} ist alles festgeschrieben`); return false; }
      const zeilen = Object.entries(w.werte).filter(([, v]) => v).map(([nr, v]) => {
        const aktiv = D.artNachNummer(nr) === 'aktiv';
        const sollSeite = aktiv ? v > 0 : v < 0;
        return sollSeite ? { soll: nr, haben: '9100', betrag: Math.abs(v) } : { soll: '9100', haben: nr, betrag: Math.abs(v) };
      });
      if (!zeilen.length) { if (alt) await Speicher.loeschen('journal', 'eroeffnung'); await neuLaden('Eröffnungsbilanz entfernt'); return; }
      await Speicher.speichern('journal', { ...(alt || {}), id: 'eroeffnung', art: 'eroeffnung', datum: dt, beleg: 'EB', text: 'Eröffnungsbilanz', zeilen, geloescht: false });
      await neuLaden('Eröffnungsbilanz gespeichert');
    });
    d.style.width = 'min(800px, calc(100vw - 24px))';
    function lesen() {
      const werte2 = {};
      let aktiv = 0, passiv = 0;
      for (const inp of d.querySelectorAll('[data-eb]')) {
        const v = betragLesen(inp.value); if (!Number.isFinite(v) || !v) continue;
        werte2[inp.dataset.eb] = v;
        if (D.artNachNummer(inp.dataset.eb) === 'aktiv') aktiv += v; else passiv += v;
      }
      return { werte: werte2, aktiv, passiv };
    }
    function summeZeigen() {
      const w = lesen();
      d.querySelector('[data-eb-summe]').innerHTML = `Aktiven <b>${chf(w.aktiv)}</b> · Passiven <b>${chf(w.passiv)}</b> · ${w.aktiv === w.passiv ? '<span class="plus">✓ ausgeglichen</span>' : `<span class="minus">Differenz ${chf(w.aktiv - w.passiv)}</span>`}`;
    }
    d.addEventListener('input', summeZeigen);
    d.addEventListener('click', (e) => {
      if (!e.target.closest('[data-eb-ausgleich]')) return;
      const w = lesen(), inp = d.querySelector(`[data-eb="${ekKonto}"]`);
      const neu = (w.werte[ekKonto] || 0) + (w.aktiv - w.passiv);
      inp.value = neu ? chf(neu).replace(/’/g, '') : '';
      summeZeigen();
    });
    summeZeigen();
  }

  /* ---------- Kontoblatt ---------- */
  function kontoblattDialog(nr) {
    const kb = D.kontoblatt({ plan: kontenplan(), eintraege: eintraege(), nr, jahr: Z.jahr });
    const d = kleinerDialog(`<h3 style="margin:0">Konto ${kb.nr} ${esc(kb.name)}</h3><p class="hinweis">${Z.jahr}${D.istBilanzkonto(nr) ? ` · Anfangsbestand ${chf(kb.anfang)}` : ''} · Saldo ${chf(kb.ende)}</p>
      <div style="max-height:60vh;overflow:auto"><table class="journal"><tr><th>Datum</th><th>Text</th><th>Gegenkonto</th><th class="b">Soll</th><th class="b">Haben</th><th class="b">Saldo</th></tr>
      ${D.istBilanzkonto(nr) ? `<tr><td></td><td class="hinweis">Anfangsbestand</td><td></td><td></td><td></td>${betragZelle(kb.anfang)}</tr>` : ''}
      ${kb.zeilen.map((z) => `<tr class="klick" data-jeintrag="${esc(z.id)}"><td class="num">${datumKurz(z.datum)}</td><td>${esc(z.text || '')}${z.beleg ? ` <span class="hinweis">${esc(z.beleg)}</span>` : ''}</td><td><span class="kontonr">${z.gegen}</span></td><td class="b">${z.soll ? chf(z.soll) : ''}</td><td class="b">${z.haben ? chf(z.haben) : ''}</td>${betragZelle(z.saldo)}</tr>`).join('') || '<tr><td colspan="6" class="leer">Keine Bewegungen im Jahr.</td></tr>'}
      </table></div>`, null);
    d.style.width = 'min(900px, calc(100vw - 24px))';
    d.addEventListener('click', (e) => { if (e.target.closest('[data-jeintrag]')) d.close(); });
  }
  function eintragOeffnen(id) {
    const e = eintraege().find((x) => x.id === id);
    if (!e) return;
    if (e.art === 'auto') { const b = Z.buchungen.find((x) => x.id === e.ref); if (b) buchungBearbeiten(b); return; }
    if (e.art === 'kasse') { kasseDialog('buch'); return; }
    if (e.art === 'eroeffnung') { eroeffnungDialog(); return; }
    const j = Z.journal.find((x) => x.id === id); if (j) journalBearbeiten(j);
  }

  /* ---------- Jahresabschluss nach OR ---------- */
  function abschlussDoppelt() {
    const bis = Z.stichtag && Z.stichtag.startsWith(Z.jahr) ? Z.stichtag : '';
    const plan = kontenplan(), e = eintraege();
    const r = D.bericht({ plan, eintraege: e, jahr: Z.jahr, bis, rechtsform: rechtsform() });
    const jetztJahr = Z.jahr === String(new Date().getFullYear());
    const kontoZeile = (k) => `<tr class="klick" data-konto="${k.nr}"><td><span class="kontonr">${k.nr}</span> ${esc(k.name)}</td>${betragZelle(k.betrag)}</tr>`;
    const erHtml = r.erfolg.map((g) => g.zwischen ? `<tr class="summe"><td>${esc(g.zwischen)}</td>${betragZelle(g.betrag)}</tr>`
      : `<tr><th colspan="2" style="padding-top:14px">${esc(g.titel)}</th></tr>${g.konten.map(kontoZeile).join('')}${g.konten.length > 1 ? `<tr><td class="hinweis">Total ${esc(g.titel)}</td>${betragZelle(g.summe)}</tr>` : ''}`).join('');
    const seite = (gruppen) => gruppen.map((g) => `<tr><th colspan="2" style="padding-top:14px">${esc(g.titel)}</th></tr>`
      + g.teile.map((t) => (g.teile.length > 1 || t.titel !== g.titel ? `<tr><td colspan="2" class="hinweis" style="padding-top:8px">${esc(t.titel)}</td></tr>` : '') + t.konten.map(kontoZeile).join('')).join('')
      + `<tr class="summe"><td>Total ${esc(g.titel)}</td>${betragZelle(g.summe)}</tr>`).join('');
    // Prüfpunkte vor dem Abschluss
    const quartale = [1, 2, 3, 4].filter((q) => { const m = mwstRechnen(Z.jahr, q); return (m.steuer || m.vorsteuer) && !Z.journal.some((j) => j.id === `mwst-${Z.jahr}-Q${q}` && !j.geloescht); });
    const ohneBeleg = imJahr(Z.jahr).filter((b) => b.typ === 'ausgabe' && !b.belegId && b.quelle !== 'lohn' && b.quelle !== 'fahrt').length;
    const sl = Object.fromEntries(D.saldenliste({ plan, eintraege: e, jahr: Z.jahr }).map((k) => [k.nr, k]));
    const anlagen = Object.values(sl).filter((k) => /^1[5-7]/.test(k.nr)).reduce((a, k) => a + k.saldo, 0);
    const abgeschrieben = (sl['6800'] || {}).saldo || 0;
    const punkte = [
      [!!eroeffnung() && r.differenz === 0, eroeffnung() ? (r.differenz === 0 ? 'Eröffnungsbilanz ist ausgeglichen' : 'Bilanz geht nicht auf, bitte Eröffnungsbilanz prüfen') : 'Eröffnungsbilanz fehlt', 'NB.eroeffnung()'],
      [!quartale.length, quartale.length ? `MWST noch nicht verbucht: ${quartale.map((q) => q + '. Quartal').join(', ')}` : 'MWST aller Quartale verbucht', "NB.ansicht('mwst')"],
      [!(anlagen > 0 && !abgeschrieben), anlagen > 0 && !abgeschrieben ? 'Sachanlagen vorhanden, aber noch keine Abschreibung gebucht' : 'Abschreibungen geprüft', "NB.journalNeu('abschreibung')"],
      [!ohneBeleg, ohneBeleg ? `${ohneBeleg} Ausgaben ohne Beleg` : 'Alle Ausgaben mit Beleg', "NB.ansicht('buchungen')"],
      [null, `Bank: Saldo 1020 mit dem Kontoauszug per ${datumKurz(r.stichtag)} vergleichen (${chf((sl['1020'] || {}).saldo || 0)})`, "NB.kontoblatt('1020')"],
      [null, `Offen: Debitoren ${chf((sl['1100'] || {}).saldo || 0)}, Kreditoren ${chf((sl['2000'] || {}).saldo || 0)}`, ''],
    ];
    const kannFest = !bis && Z.jahr < String(new Date().getFullYear()) && (!festBis() || festBis() < Z.jahr + '-12-31');
    const istFestJahr = festBis() && festBis() >= Z.jahr + '-12-31';
    return `
    <div class="stichtag-leiste">
      <div class="segment"><button class="${bis ? '' : 'an'}" data-ganzjahr>Ganzes Jahr</button>${jetztJahr ? `<button class="${bis === heute() ? 'an' : ''}" data-zwischen>Bis heute</button>` : ''}</div>
      <label class="hinweis">Stichtag <input type="date" class="auswahl-klein" data-stichtag value="${bis}" min="${Z.jahr}-01-01" max="${Z.jahr}-12-31" /></label>
    </div>
    ${bis ? '' : abschlussAssistent()}
    <div class="kopf">
      <div><h1>${bis ? 'Zwischenabschluss per ' + datumKurz(bis) : 'Jahresrechnung ' + Z.jahr}</h1><p class="unter">${esc(firmenName() || '')}${firmenName() ? ' · ' : ''}Bilanz und Erfolgsrechnung nach OR 959a und 959b, Beträge ohne MWST${istFestJahr ? ' · festgeschrieben' : ''}</p></div>
      <div class="kopf-aktionen">${jahrWahl()}<button class="btn" onclick="NB.journalCsv()">Journal CSV</button><button class="btn" onclick="NB.saldenCsv()">Saldenliste CSV</button><button class="btn" onclick="window.print()">Als PDF drucken</button></div>
    </div>
    ${r.differenz ? `<div class="card abstand-unten" style="border:1px solid rgba(229,72,77,.35)"><h2>Die Bilanz geht nicht auf</h2><p class="hinweis">Differenz ${chf(r.differenz)}. Meist ist die Eröffnungsbilanz nicht ausgeglichen. <button class="link" onclick="NB.eroeffnung()">Eröffnungsbilanz öffnen</button></p></div>` : ''}
    <div class="raster raster-2">
      <div class="card">
        <h2>Erfolgsrechnung ${bis ? '01.01. bis ' + datumKurz(bis) : Z.jahr}</h2>
        <table>${erHtml || '<tr><td class="leer">Noch keine Erträge oder Aufwände.</td><td></td></tr>'}
          <tr class="summe"><td>${r.gewinn >= 0 ? 'Jahresgewinn' : 'Jahresverlust'}</td><td class="b ${r.gewinn < 0 ? 'minus' : 'plus'}">${chf(r.gewinn)}</td></tr></table>
      </div>
      <div class="card">
        <h2>Bilanz per ${datumKurz(r.stichtag)}</h2>
        <table><tr><th colspan="2">Aktiven</th></tr>${seite(r.aktiven) || '<tr><td class="leer">Keine Aktiven</td><td></td></tr>'}<tr class="summe"><td>Total Aktiven</td>${betragZelle(r.summeAktiven)}</tr></table>
        <table class="abstand"><tr><th colspan="2">Passiven</th></tr>${seite(r.passiven) || '<tr><td class="leer">Keine Passiven</td><td></td></tr>'}<tr class="summe"><td>Total Passiven</td>${betragZelle(r.summePassiven)}</tr></table>
        ${r.vorErgebnis ? `<p class="hinweis abstand">${istFirma() ? 'Im Gewinnvortrag (2970)' : 'Im Eigenkapital (2800)'} ist das Ergebnis der Vorjahre von ${chf(r.vorErgebnis)} enthalten. ${istFirma() ? 'Die Verwendung (Reserven, Ausschüttung) buchen Sie ab 2970.' : ''}</p>` : ''}
      </div>
    </div>
    <div class="raster raster-2 abstand">
      <div class="card">
        <h2>Vor dem Abschluss prüfen</h2>
        <div class="pruef">${punkte.map(([ok, text, aktion]) => `<div class="pruef-zeile"><span class="pruef-ic ${ok === true ? 'ok' : ok === false ? 'offen' : ''}">${ok === true ? '✓' : ok === false ? '!' : '•'}</span><span>${esc(text)}</span>${aktion && ok !== true ? `<button class="link" onclick="${aktion}">Öffnen</button>` : ''}</div>`).join('')}</div>
        <h2 class="abstand">Abschlussbuchungen</h2>
        <div style="display:flex;gap:8px;flex-wrap:wrap">${[['abschreibung', 'Abschreibung'], ['aufwand_abgrenzen', 'Aufwand abgrenzen'], ['ertrag_abgrenzen', 'Ertrag abgrenzen'], ['rueckstellung', 'Rückstellung'], ...(istFirma() ? [['steuern_rueck', 'Steuern zurückstellen'], ['reserve', 'Reserve bilden'], ['ausschuettung', 'Ausschüttung']] : [['privatbezug', 'Privatbezug'], ['privatanteil', 'Privatanteil']])].map(([id, n]) => `<button class="btn btn-klein" onclick="NB.journalNeu('${id}')">${n}</button>`).join('')}</div>
      </div>
      <div class="card">
        <h2>Festschreiben</h2>
        ${istFestJahr ? `<p class="hinweis"><b>${Z.jahr} ist festgeschrieben</b> (bis ${datumKurz(festBis())}). Buchungen bis zu diesem Datum lassen sich nicht mehr ändern oder löschen. Korrekturen machen Sie mit einer Storno-Buchung im offenen Jahr.</p>`
          : `<p class="hinweis">Nach dem Abschluss schreiben Sie das Jahr fest. Danach lassen sich die Buchungen nicht mehr ändern, so wie es die Geschäftsbücherverordnung (GeBüV) verlangt. Bewahren Sie Jahresrechnung, Journal und Belege 10 Jahre auf.</p>
             ${kannFest ? `<button class="btn btn-haupt abstand" data-festschreiben="${Z.jahr}">Jahr ${Z.jahr} festschreiben</button>` : `<p class="hinweis abstand">${bis ? 'Zum Festschreiben „Ganzes Jahr“ wählen.' : `Festschreiben ist ab dem 01.01.${Number(Z.jahr) + 1} möglich.`}</p>`}`}
        ${window.NASUVIA_SB ? '<button class="btn abstand" data-protokoll>Änderungsprotokoll ansehen</button>' : ''}
      </div>
    </div>`;
  }
  // Änderungsprotokoll vom Server: jede Erfassung, Änderung und Löschung von Buchungen (GeBüV)
  async function protokollZeigen() {
    const sb = window.NASUVIA_SB; if (!sb) return;
    const { data, error } = await sb.from('aenderungen').select('art,datensatz_id,aktion,alt,neu,zeit,von,user_id').order('zeit', { ascending: false }).limit(300);
    if (error) { toast('Protokoll nicht erreichbar: ' + error.message); return; }
    const NAME = { erfasst: 'Erfasst', geaendert: 'Geändert', geloescht: 'Gelöscht', entfernt: 'Entfernt', abgelehnt: 'Abgelehnt (festgeschrieben)', festschreiben: 'Festgeschrieben' };
    const zeile = (x) => { const d = x.neu || x.alt || {}; const betrag = d.betragRappen != null ? chf(d.betragRappen) : ''; return `<tr><td>${esc(new Date(x.zeit).toLocaleString('de-CH', { dateStyle: 'short', timeStyle: 'short' }))}</td><td>${esc(NAME[x.aktion] || x.aktion)}${x.von && x.von !== x.user_id ? ' <span class="marke marke-info">Treuhänder</span>' : ''}</td><td>${esc(x.aktion === 'festschreiben' ? 'bis ' + datumKurz((x.neu || {}).festBis || '') : [d.datum ? datumKurz(d.datum) : '', d.text || d.partner || d.kategorie || x.datensatz_id].filter(Boolean).join(' · '))}</td><td style="text-align:right">${esc(betrag)}</td></tr>`; };
    const dlg = document.createElement('dialog');
    dlg.innerHTML = `<form method="dialog" style="width:min(760px,calc(100vw - 24px))"><div class="dlg-kopf"><h3>Änderungsprotokoll</h3><button class="x" value="zu" aria-label="Schliessen">×</button></div>
      <p class="hinweis">Der Server hält jede Änderung an Buchungen fest, mit Zeitpunkt sowie altem und neuem Stand. Änderungen in festgeschriebenen Jahren lehnt er ab. Die letzten 300 Einträge:</p>
      <div style="overflow:auto;max-height:60vh"><table><thead><tr><th>Zeit</th><th>Aktion</th><th>Buchung</th><th style="text-align:right">Betrag</th></tr></thead><tbody>${(data || []).map(zeile).join('') || '<tr><td colspan="4">Noch keine Einträge.</td></tr>'}</tbody></table></div></form>`;
    document.body.appendChild(dlg); dlg.addEventListener('close', () => dlg.remove()); dlg.showModal();
  }
  async function festschreiben(jahr) {
    const bis = jahr + '-12-31';
    const r = D.bericht({ plan: kontenplan(), eintraege: eintraege(), jahr, rechtsform: rechtsform() });
    if (r.differenz) { toast('Die Bilanz geht nicht auf. Bitte zuerst die Eröffnungsbilanz prüfen.'); return; }
    if (!await UI.frage(`Jahr ${jahr} festschreiben?\n\nAlle Buchungen bis ${datumKurz(bis)} lassen sich danach nicht mehr ändern oder löschen. Das kann nicht rückgängig gemacht werden.\n\nLaden Sie vorher Journal und Jahresrechnung herunter.`)) return;
    await einstSpeichern({ festBis: bis, festProtokoll: [...(Z.einst.festProtokoll || []), { bis, am: new Date().toISOString(), gewinn: r.gewinn, bilanzsumme: r.summeAktiven }] });
    zeichnen();
    toast(`${jahr} ist festgeschrieben`);
  }

  /* ---------- MWST verbuchen ---------- */
  function mwstVerbuchenHtml(q, r) {
    const j = Z.journal.find((x) => x.id === `mwst-${Z.jahr}-Q${q}` && !x.geloescht);
    return `<div class="abstand" style="border-top:1px solid var(--hairline);padding-top:14px">
      <h2>In der Buchhaltung</h2>
      <p class="hinweis">${j ? `Verbucht per ${datumKurz(j.datum)}: ${chf(j.zeilen[0].betrag)} Vorsteuer mit der geschuldeten MWST verrechnet.` : 'Noch nicht verbucht. Dabei wird die Vorsteuer (1170) mit der geschuldeten MWST (2200) verrechnet. Übrig bleibt die Zahllast an die ESTV oder ein Guthaben.'}</p>
      <div style="display:flex;gap:8px;flex-wrap:wrap;margin-top:8px"><button class="btn btn-klein ${j ? '' : 'btn-haupt'}" onclick="NB.mwstVerbuchen()">${j ? 'Neu verbuchen' : 'Abrechnung verbuchen'}</button>${r.zahlen ? `<button class="btn btn-klein" onclick="NB.mwstZahlung()">${r.zahlen > 0 ? 'Zahlung an die ESTV buchen' : 'Rückzahlung der ESTV buchen'}</button>` : ''}</div>
    </div>`;
  }
  async function mwstVerbuchen() {
    const q = Z.quartal, r = mwstRechnen(Z.jahr, q), id = `mwst-${Z.jahr}-Q${q}`;
    const datum = new Date(Number(Z.jahr), q * 3, 0).toLocaleDateString('sv-SE');
    if (istFest(datum)) { toast('Dieses Quartal ist festgeschrieben'); return; }
    const betrag = Math.min(r.steuer, r.vorsteuer);
    if (!(betrag > 0)) { toast('Nichts zu verrechnen: in diesem Quartal gibt es keine Vorsteuer oder keine MWST'); return; }
    const alt = Z.journal.find((x) => x.id === id);
    await Speicher.speichern('journal', { ...(alt || {}), id, art: 'mwst', datum, beleg: `MWST ${q}/${Z.jahr}`, text: `MWST-Abrechnung ${q}. Quartal ${Z.jahr}`, zeilen: [{ soll: '2200', haben: '1170', betrag }], geloescht: false });
    await neuLaden(`MWST ${q}. Quartal verbucht`);
  }
  function mwstZahlung() {
    const q = Z.quartal, r = mwstRechnen(Z.jahr, q), bank = D.zahlungKonto(Z.einst, 'Bank');
    if (r.zahlen > 0) journalBearbeiten(null, { text: `MWST ${q}. Quartal ${Z.jahr} an die ESTV`, zeilen: [{ soll: '2200', haben: bank, betrag: r.zahlen }] });
    else if (r.zahlen < 0) journalBearbeiten(null, { text: `MWST-Guthaben ${q}. Quartal ${Z.jahr} von der ESTV`, zeilen: [{ soll: bank, haben: '1170', betrag: -r.zahlen }] });
  }

  /* ---------- Zuletzt gelöscht (30 Tage) ---------- */
  async function korbDialog() {
    const grenze = Date.now() - 30 * 864e5;
    const holen = async (sp) => (await Speicher.alleMitGeloeschten(sp)).filter((x) => x.geloescht && !x.endgueltig && Date.parse(x.geaendert || 0) >= grenze).map((x) => ({ sp, x }));
    const liste = [...await holen('buchungen'), ...(doppeltAktiv() ? await holen('journal') : [])].sort((a, b) => (b.x.geaendert || '').localeCompare(a.x.geaendert || ''));
    const zeile = ({ sp, x }, i) => {
      const rest = 30 - Math.floor((Date.now() - Date.parse(x.geaendert)) / 864e5);
      const titel = sp === 'journal' ? `${x.text || 'Journal-Buchung'} (Soll/Haben)` : `${x.text || x.partner || katName(x)}`;
      const betrag = sp === 'journal' ? (x.zeilen || []).reduce((a, z) => a + (z.betrag || 0), 0) : x.betragRappen;
      return `<div class="pruef-zeile" style="grid-template-columns:minmax(0,1fr) auto auto;padding:8px 0;border-bottom:1px solid var(--hairline)"><span style="min-width:0"><b style="color:var(--tinte)">${esc(titel)}</b><br><span class="hinweis">${datumKurz(x.datum)} · ${chf(betrag || 0)} CHF · noch ${rest} ${rest === 1 ? 'Tag' : 'Tage'}</span></span>
        <button type="button" class="btn btn-klein" data-k-zurueck="${i}">Wiederherstellen</button><button type="button" class="btn btn-klein btn-rot" data-k-weg="${i}">Endgültig</button></div>`;
    };
    const d = kleinerDialog(`<h3 style="margin:0">Zuletzt gelöscht</h3><p class="hinweis">Gelöschte Buchungen bleiben 30 Tage hier. Danach sind sie weg.</p>
      <div style="max-height:56vh;overflow:auto">${liste.length ? liste.map(zeile).join('') : '<p class="leer">Hier ist nichts.</p>'}</div>`, null);
    d.addEventListener('click', async (e) => {
      const z = e.target.closest('[data-k-zurueck]'), w = e.target.closest('[data-k-weg]');
      const ein = z ? liste[Number(z.dataset.kZurueck)] : w ? liste[Number(w.dataset.kWeg)] : null;
      if (!ein) return;
      if (z) {
        if (istFest(ein.x.datum)) { toast('Liegt in der festgeschriebenen Zeit und kann nicht zurückgeholt werden'); return; }
        await Speicher.speichern(ein.sp, { ...ein.x, geloescht: false }); d.close(); await neuLaden('Wiederhergestellt'); return;
      }
      if (!await UI.frage('Endgültig löschen? Das lässt sich nicht rückgängig machen.')) return;
      // Nur die Markierung bleibt (damit andere Geräte es auch löschen), der Inhalt ist weg
      await Speicher.roh(ein.sp, [{ id: ein.x.id, geloescht: true, endgueltig: true, geaendert: new Date().toISOString(), offen: true }]);
      d.close(); await neuLaden('Endgültig gelöscht');
    });
  }

  /* ---------- Übersicht und Einstellungen ---------- */
  function kontostaendeKarte() {
    const jetzt = String(new Date().getFullYear());
    const sl = D.saldenliste({ plan: kontenplan(), eintraege: eintraege(), jahr: jetzt, bis: heute() });
    const w = (nr) => (sl.find((k) => k.nr === nr) || {}).saldo || 0;
    const geld = sl.filter((k) => /^10\d\d$/.test(k.nr)).reduce((a, k) => a + k.saldo, 0);
    const mwst = w('2200') - w('1170');
    const kz = [['Flüssige Mittel', geld, 'Kasse und Bank'], ['Debitoren', w('1100'), 'Offene Kundenrechnungen'], ['Kreditoren', w('2000'), 'Offene Lieferantenrechnungen'], ['MWST', Math.abs(mwst), mwst >= 0 ? 'Geschuldet nach Vorsteuer' : 'Guthaben']];
    return `${eroeffnung() ? '' : `<div class="card abstand-unten" style="display:flex;gap:12px;align-items:center;flex-wrap:wrap;border:1px solid rgba(183,121,31,.3)"><span style="flex:1;min-width:220px"><b>Eröffnungsbilanz fehlt.</b> <span class="hinweis">Damit Bilanz und Kontostände stimmen, einmal Startkapital und Bestände eintragen.</span></span><button class="btn btn-haupt" onclick="NB.eroeffnung()">Jetzt erfassen</button></div>`}
      <div class="raster raster-4 abstand-unten">${kz.map(([l, v, k]) => `<div class="card kennzahl klick" data-ansicht="konten"><div class="label">${l}</div><div class="wert ${v < 0 ? 'minus' : ''}">${chf(v)}</div><div class="klein">${k}, Stand heute</div></div>`).join('')}</div>`;
  }
  function einstRechtsform() {
    const l = lizenzJetzt(), rf = rechtsform(), name = O ? O.RECHTSFORMEN[rf].name : rf;
    const auswahl = l ? `<p class="hinweis">Ihre Firma: <b>${esc(name)}</b>. Ändern unter <a href="lizenz/">Lizenz und Konto</a>.</p>`
      : `<div class="segment" style="flex-wrap:wrap">${(O ? Object.keys(O.RECHTSFORMEN).filter((k) => k !== 'privat') : ['einzel', 'gmbh', 'ag']).map((k) => `<button class="${rf === k ? 'an' : ''}" data-rechtsform="${k}">${O ? O.RECHTSFORMEN[k].kurz : k}</button>`).join('')}</div>`;
    const schalter = !doppeltPflicht()
      ? `<label class="haken abstand"><input type="checkbox" data-doppelt ${Z.einst.doppelt ? 'checked' : ''} /> Doppelte Buchhaltung (Soll und Haben, Bilanz nach OR)</label><p class="hinweis">Für Einzelfirmen und Kollektivgesellschaften ab CHF 500’000 Umsatz Pflicht, für Vereine im Handelsregister immer. Ihre bisherigen Buchungen werden automatisch übernommen.</p>`
      : `<p class="hinweis abstand">Als ${esc(name)} führen Sie die doppelte Buchhaltung. Einnahmen, Ausgaben, Rechnungen und Löhne werden automatisch in Soll und Haben verbucht.</p>`;
    const links = doppeltAktiv() ? `<div class="abstand" style="display:flex;gap:8px;flex-wrap:wrap"><button class="btn" data-ansicht="konten">Konten und Journal</button><button class="btn" onclick="NB.eroeffnung()">Eröffnungsbilanz</button></div>` : '';
    return auswahl + schalter + links;
  }
  document.addEventListener('click', async (e) => {
    const t = e.target;
    const kt = t.closest('[data-ktab]'); if (kt) { Z.kontenTab = kt.dataset.ktab; zeichnen(); return; }
    const ja = t.closest('[data-jart]'); if (ja) { Z.journalFilter.art = ja.dataset.jart; zeichnen(); return; }
    const je = t.closest('[data-jeintrag]'); if (je) { eintragOeffnen(je.dataset.jeintrag); return; }
    const ko = t.closest('[data-konto]'); if (ko) { kontoblattDialog(ko.dataset.konto); return; }
    const ku = t.closest('[data-konto-umbenennen]'); if (ku) { kontoAnpassen(ku.dataset.kontoUmbenennen); return; }
    if (t.closest('[data-konto-neu]')) { kontoAnpassen(null); return; }
    const fs = t.closest('[data-festschreiben]'); if (fs) { festschreiben(fs.dataset.festschreiben); return; }
    if (t.closest('[data-protokoll]')) { protokollZeigen(); return; }
    const rf = t.closest('[data-rechtsform]'); if (rf) { await einstSpeichern({ rechtsform: rf.dataset.rechtsform }); zeichnen(); toast('Rechtsform gespeichert'); }
  });
  document.addEventListener('change', async (e) => {
    const t = e.target;
    if (t.matches('[data-alle-konten]')) { Z.alleKonten = t.checked; zeichnen(); return; }
    if (t.matches('[data-kat-konto]')) { await einstSpeichern({ kontoZuordnung: { ...(Z.einst.kontoZuordnung || {}), [t.dataset.katKonto]: t.value } }); toast('Konto zugeordnet'); zeichnen(); return; }
    if (t.matches('[data-zahl-konto]')) { await einstSpeichern({ zahlungKonten: { ...(Z.einst.zahlungKonten || {}), [t.dataset.zahlKonto]: t.value } }); toast('Konto zugeordnet'); zeichnen(); return; }
    if (t.matches('[data-doppelt]')) {
      if (!t.checked && Z.journal.some((j) => !j.geloescht) && !await UI.frage('Doppelte Buchhaltung ausschalten? Ihre manuellen Journal-Buchungen bleiben gespeichert, werden aber nicht mehr angezeigt.')) { t.checked = true; return; }
      await einstSpeichern({ doppelt: t.checked }); zeichnen(); toast(t.checked ? 'Doppelte Buchhaltung eingeschaltet' : 'Doppelte Buchhaltung ausgeschaltet');
    }
  });
  document.addEventListener('input', (e) => {
    if (!e.target.matches('[data-jsuche]')) return;
    Z.journalFilter.suche = e.target.value;
    const pos = e.target.selectionStart;
    zeichnen();
    const neu = document.querySelector('[data-jsuche]');
    if (neu) { neu.focus(); neu.setSelectionRange(pos, pos); }
  });

  /* ================= Einstellungen ================= */
  function letzteSicherung() {
    let d = null;
    try { d = localStorage.getItem('nb.sicherung'); } catch {}
    return d ? `Letzte Sicherung auf diesem Gerät: ${datumKurz(d.slice(0, 10))}` : 'Auf diesem Gerät wurde noch keine Sicherung gespeichert.';
  }

  document.addEventListener('click', async (e) => {
    const w = e.target.closest('[data-regel-weg]'); if (!w) return;
    const [typ, ...m] = w.dataset.regelWeg.split('|'); const muster = m.join('|');
    await einstSpeichern({ bankRegeln: (Z.einst.bankRegeln || []).filter((x) => !(x.typ === typ && x.muster === muster)) }); zeichnen(); toast('Vergessen');
  });
  function mehr() {
    const v = Z.einst.abrechnung;
    return `
    <div class="kopf"><div><h1>Einstellungen</h1><p class="unter">Rechtsform, Daten, Sicherung und MWST</p></div></div>
    <div class="raster raster-2">
      <div class="card">
        <h2>Rechtsform und Buchhaltung</h2>
        ${einstRechtsform()}
      </div>
      <div class="card">
        <h2>Gelernte Kategorien (Bankauszug)</h2>
        <p class="hinweis">Wenn Sie beim Bankimport eine Kategorie korrigieren, merkt sich Ordasio das und macht es beim nächsten Mal selbst.</p>
        ${(Z.einst.bankRegeln || []).length ? `<div class="liste" style="max-height:260px;overflow:auto">${(Z.einst.bankRegeln || []).slice().sort((a, b) => a.muster.localeCompare(b.muster)).map((x) => `<div class="zeile" style="grid-template-columns:minmax(0,1fr) auto auto"><div style="min-width:0"><div class="titel">${esc(x.muster)}</div><div class="info"><span>${x.typ === 'einnahme' ? 'Einnahme' : 'Ausgabe'}</span><span>${esc(((x.typ === 'einnahme' ? KAT_EIN : KAT_AUS).find((k) => k.id === x.kategorie) || {}).name || x.kategorie)}</span></div></div><span></span><button class="link" data-regel-weg="${esc(x.typ + '|' + x.muster)}">Vergessen</button></div>`).join('')}</div>`
          : '<p class="leer">Noch nichts gelernt. Laden Sie einen Bankauszug und korrigieren Sie, wo nötig.</p>'}
      </div>
      <div class="card">
        <h2>Rechnungen übernehmen</h2>
        <p class="hinweis">Laden Sie die Datei <strong>rechnungen.json</strong> aus dem Ordner „Nasuvia Rechnungen“ auf dem Schreibtisch oder eine Sicherung aus der iPhone-App. Jede Rechnung wird als Einnahme übernommen. Schon vorhandene Rechnungen werden nur aktualisiert.</p>
        <button class="btn abstand" onclick="NB.rechnungenImport()">Rechnungen laden</button>
      </div>
      <div class="card">
        <h2>MWST</h2>
        <p class="hinweis" style="margin-bottom:10px">Effektive Methode, Abrechnung jedes Quartal. Wann zählt eine Rechnung als Umsatz?</p>
        <div class="segment"><button class="${v === 'vereinbart' ? 'an' : ''}" data-abrechnung="vereinbart">Rechnungsdatum</button><button class="${v === 'vereinnahmt' ? 'an' : ''}" data-abrechnung="vereinnahmt">Zahlungseingang</button></div>
        <p class="hinweis abstand">Üblich ist das Rechnungsdatum (vereinbarte Entgelte). Den Zahlungseingang (vereinnahmte Entgelte) nur wählen, wenn die ESTV Ihnen das bewilligt hat.</p>
      </div>
      <div class="card">
        <h2>Startseite</h2>
        <p class="hinweis" style="margin-bottom:10px">Wählen Sie, was die Übersicht zeigt.</p>
        <div class="feld"><label for="sBegruessung">Titel der Übersicht</label><input type="text" id="sBegruessung" data-einst="begruessung" value="${esc(Z.einst.begruessung || '')}" placeholder="Übersicht" /></div>
        <div style="display:grid;gap:6px;margin:12px 0">${START_KARTEN.map(([id, n]) => `<label class="haken"><input type="checkbox" data-start="${id}" ${startKarten()[id] ? 'checked' : ''} />${n}</label>`).join('')}</div>
        <div class="feld"><label for="sZiel">Jahresziel Umsatz ohne MWST (CHF)</label><input type="text" id="sZiel" inputmode="decimal" data-einst="jahresziel" value="${Z.einst.jahresziel ? chf(Z.einst.jahresziel).replace(/’/g, '') : ''}" placeholder="z. B. 120000" /></div>
      </div>
      <div class="card nur-handy-karte" ${lohnErlaubt() ? '' : 'hidden'}>
        <h2>Löhne</h2>
        <p class="hinweis">Mitarbeiter, Lohnabrechnungen und Jahresübersicht.</p>
        <button class="btn abstand" data-ansicht="loehne">Zu den Löhnen</button>
      </div>
      <div class="card">
        <h2>Firma und Design</h2>
        <p class="hinweis">Ihr Logo und Ihre Farben für Programm, Rechnungen und Offerten. Automatisch von Ihrer Website oder selbst hochgeladen.</p>
        <button class="btn btn-haupt abstand" onclick="window.Marke && Marke.dialog({ beiSpeichern: () => location.reload() })">Firma und Design anpassen</button>
      </div>
      <div class="card">
        <h2>Kategorien, Vorgaben und Fahrten</h2>
        <p class="hinweis">Eigene Kategorien anlegen, umbenennen, einfärben oder ausblenden.</p>
        <button class="btn abstand" onclick="NB.kategorien()">Kategorien anpassen</button>
        <div class="feld-zeile abstand">
          <div class="feld"><label for="sVKat">Neue Ausgabe: Kategorie</label><select id="sVKat" data-einst="vorgabeKat"><option value="zuletzt">Wie zuletzt</option>${sichtbar(KAT_AUS, '').map((k) => `<option value="${k.id}" ${Z.einst.vorgabeKat === k.id ? 'selected' : ''}>${esc(k.name)}</option>`).join('')}</select></div>
          <div class="feld"><label for="sVZahl">Neue Ausgabe: bezahlt mit</label><select id="sVZahl" data-einst="vorgabeZahlung"><option value="zuletzt">Wie zuletzt</option>${ZAHLUNG.map((z) => `<option ${Z.einst.vorgabeZahlung === z ? 'selected' : ''}>${z}</option>`).join('')}</select></div>
        </div>
        <p class="hinweis">Spart Klicks, wenn Sie meist dasselbe erfassen. Sie können es bei jeder Buchung ändern.</p>
        <div class="feld abstand"><label for="sKm">Kilometer-Ansatz für Fahrten (CHF pro km)</label><input type="text" id="sKm" inputmode="decimal" data-einst="kmAnsatz" value="${(Number(Z.einst.kmAnsatz) || 0.7).toFixed(2)}" /></div>
        <p class="hinweis">Üblich sind 0.70 CHF pro Kilometer für Geschäftsfahrten mit dem Privatauto.</p>
      </div>
      <div class="card">
        <h2>Sicherung</h2>
        <p class="hinweis">Speichert alle Buchungen und Belege in einer Datei. Bewahren Sie diese Datei zum Beispiel in iCloud Drive auf. Geschäftsunterlagen müssen 10 Jahre aufbewahrt werden.</p>
        <div class="abstand" style="display:flex;gap:8px;flex-wrap:wrap">
          <button class="btn btn-haupt" onclick="NB.sichern()">Sicherung speichern</button>
          <button class="btn" onclick="NB.zurueckholen()">Sicherung laden</button>
        </div>
        <p class="hinweis abstand">${letzteSicherung()}</p>
      </div>
      <div class="card">
        <h2>Abgleich zwischen iPhone und Mac</h2>
        ${abgleichKarte()}
      </div>
    </div>`;
  }
  function abgleichKarte() {
    const A = window.Abgleich;
    if (A && A.benutzer) {
      return `<p class="hinweis">Angemeldet als <strong>${esc(A.benutzer.email)}</strong>. Alles, was Sie hier erfassen, erscheint automatisch auch auf Ihren anderen Geräten.</p>
        <p class="hinweis abstand" data-abgleich-status>${esc(statusText())}</p>
        <div class="abstand" style="display:flex;gap:8px;flex-wrap:wrap">
          <button class="btn btn-klein" data-abgleich-jetzt>Jetzt abgleichen</button>
          <button class="btn btn-klein btn-rot" data-abmelden>Abmelden</button>
        </div>`;
    }
    return `<p class="hinweis">Melden Sie sich auf jedem Gerät mit dem gleichen Konto an. Danach sind iPhone und Mac immer auf dem gleichen Stand.</p>
      <form class="abstand" data-login style="display:grid;gap:10px">
        <div class="feld"><label for="lMail">E-Mail</label><input type="text" id="lMail" inputmode="email" autocomplete="username" autocapitalize="off" required /></div>
        <div class="feld"><label for="lPw">Passwort</label><input type="password" id="lPw" autocomplete="current-password" required minlength="6" style="width:100%;background:var(--karte);border:1px solid var(--hairline-strong);border-radius:var(--r-feld);padding:8px 11px;color:var(--tinte)" /></div>
        <div style="display:flex;gap:8px;flex-wrap:wrap">
          <button type="submit" class="btn btn-haupt btn-klein">Anmelden</button>
          <button type="button" class="btn btn-klein" data-registrieren>Konto erstellen</button>
        </div>
      </form>`;
  }

  document.addEventListener('submit', async (e) => {
    if (!e.target.matches('[data-login]')) return;
    e.preventDefault();
    try {
      await Abgleich.anmelden($('lMail').value.trim(), $('lPw').value);
      toast('Angemeldet, Daten werden abgeglichen');
    } catch (f) { toast(f.message); }
  });
  document.addEventListener('click', async (e) => {
    if (e.target.closest('[data-registrieren]')) {
      const mail = $('lMail').value.trim(), pw = $('lPw').value;
      if (!mail || pw.length < 6) { toast('Bitte E-Mail und ein Passwort mit mindestens 6 Zeichen eingeben'); return; }
      try {
        const bestaetigen = await Abgleich.registrieren(mail, pw);
        toast(bestaetigen ? 'Konto erstellt. Bitte den Link in der E-Mail bestätigen.' : 'Konto erstellt und angemeldet');
      } catch (f) { toast(f.message); }
    }
    if (e.target.closest('[data-abgleich-jetzt]')) { Abgleich.jetzt(); statusZeigen(); }
    if (e.target.closest('[data-abmelden]')) {
      if (!await UI.frage('Abmelden? Die Daten bleiben auf diesem Gerät, werden aber nicht mehr abgeglichen.')) return;
      await Abgleich.abmelden();
      zeichnen();
    }
  });

  document.addEventListener('change', async (e) => {
    const t = e.target;
    if (t.matches('[data-start]')) { await einstSpeichern({ start: { ...startKarten(), [t.dataset.start]: t.checked } }); toast('Startseite angepasst'); return; }
    if (t.matches('[data-einst]')) {
      const k = t.dataset.einst;
      let v = t.value.trim();
      if (k === 'jahresziel') { const r = betragLesen(v); v = Number.isFinite(r) ? r : 0; }
      if (k === 'kmAnsatz') { v = Number(v.replace(',', '.')) || 0.7; }
      await einstSpeichern({ [k]: v });
      toast('Gespeichert');
    }
  });
  document.addEventListener('click', async (e) => {
    const t = e.target.closest('[data-abrechnung]');
    if (!t) return;
    Z.einst = await Speicher.speichern('einstellungen', { ...Z.einst, abrechnung: t.dataset.abrechnung });
    zeichnen();
    toast('Gespeichert');
  });

  function satzSchaetzen(betrag, mwst) {
    if (!mwst) return 0;
    const s = (mwst / (betrag - mwst)) * 100;
    return SAETZE.reduce((best, x) => (Math.abs(x - s) < Math.abs(best - s) ? x : best), 8.1);
  }

  async function rechnungenImport() {
    const datei = await dateiWaehlen('application/json,.json');
    if (!datei) return;
    let daten;
    try { daten = JSON.parse(await datei.text()); } catch { toast('Diese Datei kann ich nicht lesen'); return; }
    const register = Array.isArray(daten) ? daten : (daten && Array.isArray(daten.register) ? daten.register : null);
    if (!register) { toast('In dieser Datei sind keine Rechnungen'); return; }
    const { neu, aktualisiert } = await rechnungenEinbuchen(register);
    await neuLaden(`${neu} Rechnungen übernommen${aktualisiert ? `, ${aktualisiert} aktualisiert` : ''}`);
  }

  // Bucht Rechnungen als Einnahmen ein. Schreibt nur, was neu ist oder sich geändert hat.
  async function rechnungenEinbuchen(register) {
    const vorhanden = new Map((await Speicher.alleMitGeloeschten('buchungen')).filter((b) => b.quelle === 'rechnung').map((b) => [b.rechnungNr, b]));
    let neu = 0, aktualisiert = 0;
    const liste = [];
    for (const r of register) {
      const nr = String(r.nr || '').trim();
      const gutschrift = r.dokArt === 'gutschrift';
      const betrag = (Number(r.betragRappen) || 0) * (gutschrift ? -1 : 1);
      if (!nr || !betrag) continue;
      const alt = vorhanden.get(nr);
      // Vom Nutzer hier gelöschte Buchungen bleiben weg; von der Rechnungs-App entfernte kommen beim Wiederherstellen zurück
      if (alt && alt.geloescht && !alt.entferntDurchApp) continue;
      const mwst = (Number(r.mwstRappen) || 0) * (gutschrift ? -1 : 1);
      const b = {
        ...(alt || {}),
        id: alt ? alt.id : 'rechnung-' + nr,
        typ: 'einnahme', quelle: 'rechnung', rechnungNr: nr,
        kategorie: alt ? alt.kategorie : 'dienstleistung',
        datum: (r.datum || '').slice(0, 10) || heute(),
        betragRappen: betrag, mwstRappen: mwst, mwstSatz: satzSchaetzen(betrag, mwst),
        partner: r.kunde || r.empfaenger || '',
        text: alt && alt.text ? alt.text : `${gutschrift ? 'Gutschrift' : 'Rechnung'} ${nr}`,
        zahlung: alt ? alt.zahlung : 'Bank',
        faellig: (r.faellig || '').slice(0, 10),
        bezahlt: alt && alt.bezahlt ? true : !!r.bezahlt,
        bezahltAm: alt && alt.bezahltAm ? alt.bezahltAm : (r.bezahlt ? (r.bezahltAm || (r.datum || '').slice(0, 10)) : ''),
        geaendert: undefined, geloescht: false, entferntDurchApp: false,
      };
      if (alt && ['datum', 'betragRappen', 'mwstRappen', 'partner', 'bezahlt', 'bezahltAm', 'geloescht'].every((k) => !!alt[k] === !!b[k] && (typeof b[k] === 'boolean' || alt[k] === b[k]))) continue;
      liste.push(b);
      if (alt) aktualisiert++; else neu++;
    }
    if (liste.length) await Speicher.mehrereSpeichern('buchungen', liste.map((b) => ({ ...b, geaendert: new Date().toISOString() })));
    return { neu, aktualisiert };
  }

  // Holt die Rechnungen aus der Rechnungs-App nach jedem Abgleich automatisch herein
  let rechnungenLaeuft = false;
  async function rechnungenAusApp() {
    if (rechnungenLaeuft || !window.Abgleich || !Abgleich.benutzer || !Abgleich.rechnungenHolen) return;
    rechnungenLaeuft = true;
    try {
      const alle = await Abgleich.rechnungenHolen();
      // Nur Rechnungen und Gutschriften sind Einnahmen; Offerten und Mahnungen nicht
      const zaehlt = (r) => ['rechnung', 'gutschrift'].includes(r.dokArt || 'rechnung');
      const aktiv = alle.filter((r) => !r.geloescht && zaehlt(r));
      const { neu, aktualisiert } = await rechnungenEinbuchen(aktiv);
      // In der Rechnungs-App gelöscht und keine andere Rechnung mit dieser Nummer: auch hier entfernen
      const aktiveNr = new Set(aktiv.map((r) => String(r.nr || '').trim()));
      const weg = [...new Set(alle.filter((r) => r.geloescht && zaehlt(r)).map((r) => String(r.nr || '').trim()))].filter((nr) => nr && !aktiveNr.has(nr));
      let entfernt = 0;
      for (const nr of weg) {
        const b = await Speicher.holen('buchungen', 'rechnung-' + nr);
        if (b && !b.geloescht && b.quelle === 'rechnung') { await Speicher.mehrereSpeichern('buchungen', [{ ...b, geloescht: true, entferntDurchApp: true, geaendert: new Date().toISOString() }]); entfernt++; }
      }
      if (neu || aktualisiert || entfernt) await neuLaden(neu ? `${neu} neue ${neu === 1 ? 'Rechnung' : 'Rechnungen'} aus der Rechnungs-App` : entfernt ? `${entfernt} gelöschte Rechnung entfernt` : '');
    } catch { /* beim nächsten Abgleich wieder */ } finally { rechnungenLaeuft = false; }
  }

  const blobZuText = (blob) => new Promise((ok) => { const r = new FileReader(); r.onload = () => ok(r.result); r.readAsDataURL(blob); });
  const textZuBlob = async (url) => (await fetch(url)).blob();

  async function sichern() {
    const belege = [];
    for (const x of await Speicher.alleMitGeloeschten('belege')) {
      belege.push({ ...x, daten: x.daten ? await blobZuText(x.daten) : null });
    }
    const inhalt = JSON.stringify({
      art: 'nasuvia-buchhaltung', version: 1, erstellt: new Date().toISOString(),
      buchungen: await Speicher.alleMitGeloeschten('buchungen'), journal: await Speicher.alleMitGeloeschten('journal'), einstellungen: Z.einst, belege,
    });
    herunterladen(`Nasuvia Buchhaltung Sicherung ${heute()}.json`, inhalt, 'application/json');
    try { localStorage.setItem('nb.sicherung', new Date().toISOString()); } catch {}
  }

  async function zurueckholen() {
    const datei = await dateiWaehlen('application/json,.json');
    if (!datei) return;
    let d;
    try { d = JSON.parse(await datei.text()); } catch { toast('Diese Datei kann ich nicht lesen'); return; }
    if (!d || d.art !== 'nasuvia-buchhaltung') { toast('Das ist keine Sicherung der Buchhaltung'); return; }
    if (!await UI.frage(`Sicherung vom ${datumKurz((d.erstellt || '').slice(0, 10))} laden? Neuere Einträge auf diesem Gerät bleiben erhalten.`)) return;
    const jetzt = new Map((await Speicher.alleMitGeloeschten('buchungen')).map((b) => [b.id, b]));
    const neuer = (x) => !jetzt.get(x.id) || (jetzt.get(x.id).geaendert || '') < (x.geaendert || '');
    await Speicher.mehrereSpeichern('buchungen', (d.buchungen || []).filter(neuer));
    const jetztJ = new Map((await Speicher.alleMitGeloeschten('journal')).map((x) => [x.id, x]));
    const neuerJ = (x) => !jetztJ.get(x.id) || (jetztJ.get(x.id).geaendert || '') < (x.geaendert || '');
    if ((d.journal || []).length) await Speicher.mehrereSpeichern('journal', d.journal.filter(neuerJ));
    const belege = [];
    for (const x of d.belege || []) belege.push({ ...x, daten: x.daten ? await textZuBlob(x.daten) : null });
    await Speicher.mehrereSpeichern('belege', belege);
    if (d.einstellungen) Z.einst = await Speicher.speichern('einstellungen', { ...d.einstellungen, id: 'haupt' });
    await neuLaden('Sicherung geladen');
  }

  /* ================= Öffentliche Aktionen ================= */
  function kleinerDialog(html, beiOk) {
    const d = document.createElement('dialog');
    d.innerHTML = `<form class="dlg-inhalt" style="padding:20px;display:grid;gap:10px;min-width:min(440px,90vw)">${html}<div style="display:flex;gap:8px;justify-content:flex-end;margin-top:6px"><button type="button" class="btn" data-zu>${beiOk ? 'Abbrechen' : 'Schliessen'}</button>${beiOk ? '<button class="btn btn-haupt">Speichern</button>' : ''}</div></form>`;
    document.body.appendChild(d);
    d.querySelector('[data-zu]').onclick = () => d.close();
    d.addEventListener('close', () => d.remove());
    d.querySelector('form').onsubmit = async (e) => { e.preventDefault(); if (!beiOk) { d.close(); return; } if (await beiOk(new FormData(e.target), d) !== false) d.close(); };
    d.showModal();
    return d;
  }
  async function kasseDialog(art) {
    const k = kasse();
    if (art === 'buch') {
      const ks = kasseStand();
      const zeilenK = [
        ...ks.bar.map((b) => ({ datum: b.datum, text: (b.text || katName(b)) + (b.partner ? ' · ' + b.partner : ''), betrag: b.typ === 'einnahme' ? b.betragRappen : -b.betragRappen })),
        ...k.bewegungen.map((x) => ({ datum: x.datum, text: x.art === 'bezug' ? 'Bargeld vom Konto' : 'Aufs Konto einbezahlt', betrag: x.art === 'bezug' ? x.betrag : -x.betrag, id: x.id })),
      ].sort((a, b) => (a.datum < b.datum ? 1 : -1));
      kleinerDialog(`<h3 style="margin:0">Kassenbuch</h3><p class="hinweis">Anfangsbestand: <input type="text" inputmode="decimal" name="anfang" value="${chf(k.anfang || 0)}" style="width:110px"> CHF · Bestand jetzt <b>${chf(ks.bestand)} CHF</b></p>
        <div style="max-height:50vh;overflow:auto">${zeilenK.length ? zeilenK.map((z) => `<div style="display:flex;justify-content:space-between;gap:10px;padding:7px 0;border-bottom:1px solid var(--linie)"><span>${datumKurz(z.datum)} · ${esc(z.text)}${z.id ? ` <button type="button" class="link" data-kasse-weg="${z.id}">löschen</button>` : ''}</span><b class="num ${z.betrag < 0 ? 'minus' : 'plus'}">${chf(z.betrag)}</b></div>`).join('') : '<p class="leer">Noch keine Bargeld-Bewegungen. Buchungen mit „Bezahlt mit: Bar“ erscheinen hier automatisch.</p>'}</div>`,
        async (fd) => { const a = betragLesen(fd.get('anfang')); await einstSpeichern({ kasse: { ...kasse(), anfang: Number.isFinite(a) ? a : 0 } }); zeichnen(); toast('Kassenbuch gespeichert'); });
      return;
    }
    kleinerDialog(`<h3 style="margin:0">${art === 'bezug' ? 'Bargeld vom Konto abgehoben' : 'Bargeld aufs Konto einbezahlt'}</h3>
      <div class="feld"><label>Betrag CHF</label><input type="text" inputmode="decimal" name="betrag" required autofocus></div>
      <div class="feld"><label>Datum</label><input type="date" name="datum" value="${heute()}" required></div>
      <p class="hinweis">Das ist keine Einnahme oder Ausgabe, nur eine Verschiebung zwischen Konto und Kasse.</p>`,
      async (fd) => { const b = betragLesen(fd.get('betrag')); if (!(b > 0)) { toast('Bitte einen Betrag eingeben'); return false; }
        if (istFest(fd.get('datum'))) { toast(`Bis ${datumKurz(festBis())} ist alles festgeschrieben`); return false; }
        const kk = kasse(); kk.bewegungen = [...kk.bewegungen, { id: Speicher.neueId(), art, betrag: b, datum: fd.get('datum') }];
        await einstSpeichern({ kasse: kk }); zeichnen(); toast('In der Kasse erfasst'); });
  }
  document.addEventListener('click', async (e) => {
    const w = e.target.closest('[data-kasse-weg]'); if (!w) return;
    const bw = (kasse().bewegungen || []).find((x) => x.id === w.dataset.kasseWeg);
    if (bw && istFest(bw.datum)) { toast('Festgeschrieben, Löschen nicht möglich'); return; }
    if (!await UI.frage('Diese Bargeld-Bewegung löschen?')) return;
    const kk = kasse(); kk.bewegungen = kk.bewegungen.filter((x) => x.id !== w.dataset.kasseWeg); await einstSpeichern({ kasse: kk });
    w.closest('dialog').close(); zeichnen(); toast('Gelöscht');
  });
  function startAnpassen() {
    kleinerDialog(`<h3 style="margin:0">Übersicht anpassen</h3><p class="hinweis">Wählen Sie, was auf Ihrer Startseite erscheint.</p>
      <div style="display:grid;gap:8px">${START_KARTEN.map(([id, n]) => `<label class="haken"><input type="checkbox" name="${id}" ${startKarten()[id] ? 'checked' : ''} />${n}</label>`).join('')}</div>`,
      async (fd) => { await einstSpeichern({ start: Object.fromEntries(START_KARTEN.map(([id]) => [id, fd.get(id) === 'on'])) }); zeichnen(); toast('Übersicht angepasst'); });
  }
  // Von Ordi angestossene Aufgabe auf einer anderen Seite (z. B. Lohnlauf)
  setTimeout(async () => {
    let v = null; try { v = JSON.parse(sessionStorage.getItem('ordasio.nb') || 'null'); sessionStorage.removeItem('ordasio.nb'); } catch {}
    if (v && v.fn === 'lohnBuchen' && lohnErlaubt()) { if (/^\d{4}-\d{2}$/.test(v.monat || '')) Z.lohnMonat = v.monat; Z.ansicht = 'loehne'; zeichnen(); await lohnBuchen(); }
  }, 900);
  // Von Ordi vorbereitete Buchung: Fenster ausgefüllt öffnen, gespeichert wird erst durch den Nutzer
  setTimeout(() => {
    let v = null; try { v = JSON.parse(sessionStorage.getItem('ordasio.buchung') || 'null'); sessionStorage.removeItem('ordasio.buchung'); } catch {}
    if (!v || !v.betrag) return;
    const typ = v.art === 'einnahme' ? 'einnahme' : 'ausgabe', liste = typ === 'ausgabe' ? KAT_AUS : KAT_EIN;
    const kn = String(v.kategorie || '').toLowerCase();
    const kat = (kn && liste.find((k) => k.name.toLowerCase() === kn || k.name.toLowerCase().includes(kn) || kn.includes(k.name.toLowerCase().split(' ')[0]))) || null;
    const vorlage = { typ, betragRappen: v.betrag, datum: v.datum || heute(), partner: v.partner || '', text: v.text || '', kategorie: kat ? kat.id : kategorieRaten({ partner: v.partner || '', text: v.text || '' }, typ), zahlung: 'Bank' };
    vorlage.mwstSatz = (liste.find((k) => k.id === vorlage.kategorie) || {}).satz ?? 8.1;
    vorlage.mwstRappen = mwstAus(vorlage.betragRappen, vorlage.mwstSatz);
    buchungBearbeiten(null, vorlage);
  }, 900);
  /* ---------- Übernahme aus bexio, Banana, Abacus usw. (fremdimport.js) ---------- */
  function fremdImport(vorgabe) {
    if (!window.FremdImport || !window.Auszug) { toast('Wird noch geladen, bitte gleich nochmals versuchen'); return; }
    const ekKonto = istFirma() ? '2970' : '2800';
    FremdImport.oeffnen({
      plan: kontenplan(), journal: Z.journal, doppelt: doppeltAktiv(), ekKonto, ekName: D.nameVon(kontenplan(), ekKonto),
      artNachNummer: D.artNachNummer, istFest, toast, dateiWaehlen, eroeffnung,
      idVon: FremdImport._id,
      doppeltEinschalten: () => einstSpeichern({ doppelt: true }),
      kontenErgaenzen: async (liste) => {
        const plan = new Set(kontenplan().map((k) => k.nr)), eigene = [...(Z.einst.konten || [])];
        for (const k of liste) if (/^\d{4}$/.test(k.nr) && !plan.has(k.nr) && !eigene.some((e) => e.nr === k.nr)) eigene.push({ nr: k.nr, name: k.name || 'Konto ' + k.nr, art: D.artNachNummer(k.nr) });
        if (eigene.length !== (Z.einst.konten || []).length) await einstSpeichern({ konten: eigene });
      },
      eroeffnungSpeichern: async (werte) => {
        const alt = eroeffnung();
        const dt = alt ? alt.datum : (jahre().slice(-1)[0] || String(new Date().getFullYear())) + '-01-01';
        const zeilen = Object.entries(werte).filter(([, v]) => v).map(([nr, v]) => {
          const aktiv = D.artNachNummer(nr) === 'aktiv', sollSeite = aktiv ? v > 0 : v < 0;
          return sollSeite ? { soll: nr, haben: '9100', betrag: Math.abs(v) } : { soll: '9100', haben: nr, betrag: Math.abs(v) };
        });
        await Speicher.speichern('journal', { ...(alt || {}), id: 'eroeffnung', art: 'eroeffnung', datum: dt, beleg: 'EB', text: 'Eröffnungsbilanz (übernommen)', zeilen, geloescht: false });
      },
      journalSpeichern: (liste) => (Speicher.mehrereSpeichern ? Speicher.mehrereSpeichern('journal', liste) : Promise.all(liste.map((j) => Speicher.speichern('journal', j)))),
      fertig: (m) => { Z.ansicht = 'konten'; Z.kontenTab = 'journal'; neuLaden(m); },
    }, vorgabe);
  }

  window.NB = {
    fremdImport: () => { let v = null; try { v = JSON.parse(sessionStorage.getItem('ordasio.fi') || 'null'); sessionStorage.removeItem('ordasio.fi'); } catch {} fremdImport(v || undefined); },
    shopImport: () => shopImport(),
    korb: () => korbDialog(),
    importe: () => importeZeigen(),
    ansicht: (id) => { Z.ansicht = id; zeichnen(); window.scrollTo(0, 0); },
    journalNeu: (vorlageId) => {
      const v = VORLAGEN.find((x) => x.id === vorlageId);
      if (!v) return journalBearbeiten(null);
      journalBearbeiten(null, { text: v.text || '', zeilen: v.zeilen.map(([soll, haben]) => ({ soll, haben, betrag: null })), _hinweis: v.hinweis || '' });
    },
    eroeffnung: () => { if (!doppeltAktiv()) { toast('Die Eröffnungsbilanz gibt es mit der doppelten Buchhaltung'); return; } eroeffnungDialog(); },
    kontoblatt: (nr) => kontoblattDialog(nr),
    journalCsv: () => herunterladen(`Ordasio Journal ${Z.jahr}.csv`, D.journalCsv(eintraege(), kontenplan(), Z.jahr + '-01-01', Z.jahr + '-12-31'), 'text/csv'),
    saldenCsv: () => {
      const sl = D.saldenliste({ plan: kontenplan(), eintraege: eintraege(), jahr: Z.jahr }).filter((k) => k.soll || k.haben);
      herunterladen(`Ordasio Saldenliste ${Z.jahr}.csv`, csv([['Konto', 'Bezeichnung', 'Soll', 'Haben', 'Saldo'], ...sl.map((k) => [k.nr, k.name, (k.soll / 100).toFixed(2), (k.haben / 100).toFixed(2), (k.saldo / 100).toFixed(2)])]), 'text/csv');
    },
    mwstVerbuchen: () => mwstVerbuchen(),
    mwstZahlung: () => mwstZahlung(),
    kasse: kasseDialog,
    startAnpassen,
    neu: () => buchungBearbeiten(),
    rechnungenImport,
    bankImport,
    fahrt: () => fahrtErfassen(),
    belege: () => belegeStapel(),
    zwischenbilanz: () => { Z.jahr = String(new Date().getFullYear()); Z.stichtag = heute(); Z.ansicht = 'abschluss'; zeichnen(); window.scrollTo(0, 0); },
    mitarbeiter: () => mitarbeiterBearbeiten(),
    lohnBuchen: (monat) => { if (/^\d{4}-\d{2}$/.test(monat || '')) Z.lohnMonat = monat; return lohnBuchen(); },
    neuLaden: () => neuLaden(),
    kategorienListe: () => ({ aus: KAT_AUS.filter((k) => !k.versteckt), ein: KAT_EIN.filter((k) => !k.versteckt) }),
    // Von Ordi geschickte Datei (Kontoauszug) einlesen
    ordiDatei: async () => {
      try {
        const db = await new Promise((ok, f) => { const r = indexedDB.open('ordasio-ordi', 1); r.onupgradeneeded = () => r.result.createObjectStore('datei'); r.onsuccess = () => ok(r.result); r.onerror = () => f(r.error); });
        const datei = await new Promise((ok) => { const t = db.transaction('datei', 'readwrite'), st = t.objectStore('datei'), g = st.get('bank'); g.onsuccess = () => { st.delete('bank'); ok(g.result); }; g.onerror = () => ok(null); });
        db.close();
        if (datei) bankImport(datei);
      } catch { /* nichts da */ }
    },
    lohnzettel: (id) => lohnzettel(id),
    lohnDetails: (id) => lohnDetails(id),
    lohnMail: (id) => lohnMail(id),
    lohnkonto: (id) => lohnkonto(id),
    lohnausweis: (id) => lohnausweis(id),
    lohnCsv: () => lohnCsv(),
    lohnJahrCsv: () => lohnJahrCsv(),
    kategorien: () => kategorienBearbeiten(),
    sichern,
    zurueckholen,
    jahrCsv: () => herunterladen(`Nasuvia Buchungen ${Z.jahr}.csv`, csv(buchungsZeilen(imJahr(Z.jahr))), 'text/csv'),
    mwstCsv: () => {
      const r = mwstRechnen(Z.jahr, Z.quartal);
      herunterladen(`Nasuvia MWST ${Z.jahr} Q${Z.quartal}.csv`, csv(buchungsZeilen([...r.ein, ...r.aus])), 'text/csv');
    },
  };

  /* ================= Start ================= */
  (async () => {
    await Speicher.dauerhaftAnfragen();
    await laden();
    // Jede Änderung lässt sich mit „Rückgängig“ zurücknehmen
    Speicher.nachRueckgaengig = async () => { await laden(); zeichnen(); };
    Speicher.nachAktion = (liste, zurueck) => {
      const n = liste.filter((e) => e.speicher === 'buchungen').length;
      const weg = liste.filter((e) => e.speicher === 'buchungen' && e.art === 'loeschen').length;
      const neu = liste.filter((e) => e.speicher === 'buchungen' && !e.vorher).length;
      const text = weg ? (weg > 1 ? `${weg} Buchungen gelöscht` : 'Buchung gelöscht') : neu > 1 ? `${neu} Buchungen erfasst` : neu ? 'Buchung gespeichert' : n > 1 ? `${n} Buchungen geändert` : n ? 'Buchung geändert' : 'Gespeichert';
      if (window.Rueckgaengig) Rueckgaengig.zeigen(text, zurueck);
    };
    setTimeout(() => { Speicher.rueckgaengigAktiv = true; }, 800);
    // Sprungziele aus Suche und Anleitung: ?ansicht=loehne, ?aktion=fahrt …
    const q = new URLSearchParams(location.search);
    if (q.get('ansicht') && ANSICHTEN.some(([id]) => id === q.get('ansicht'))) Z.ansicht = q.get('ansicht');
    await stundenAusZeiterfassung();
    zeichnen();
    fragenLaden();
    const aktion = q.get('aktion');
    if (aktion) {
      history.replaceState(null, '', location.pathname + (q.get('produkt') ? '?produkt=' + q.get('produkt') : ''));
      setTimeout(() => {
        if (aktion === 'firma' && window.Marke) Marke.dialog({ beiSpeichern: () => location.reload() });
        else if (aktion === 'neu') buchungBearbeiten();
        else if (window.NB[aktion]) window.NB[aktion]();
      }, 300);
    }
    if (window.Abgleich) {
      Abgleich.beiAenderung(async (geholt) => {
        if (geholt) {
          await laden();
          const suche = document.activeElement && document.activeElement.matches('[data-fsuche]');
          if (!suche && !$('dlg').open) { zeichnen(); return; }
        }
        if (Z.ansicht === 'mehr' && !document.querySelector('[data-login]')) zeichnen(); else statusZeigen();
        if (!Abgleich.laeuft) rechnungenAusApp();
      });
    }
    document.addEventListener('ordasio-lizenz', () => { kategorienAnwenden(); zeichnen(); });
    if ('serviceWorker' in navigator && location.protocol !== 'file:') navigator.serviceWorker.register('sw.js').catch(() => {});
  })();
})();

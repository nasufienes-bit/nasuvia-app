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
  ];
  const KAT_EIN_STD = [
    { id: 'dienstleistung', name: 'Dienstleistungen', satz: 8.1 },
    { id: 'materialverkauf', name: 'Materialverkauf', satz: 8.1 },
    { id: 'uebrig-ein', name: 'Übrige Einnahmen', satz: 8.1 },
  ];
  // Eigene Kategorien: umbenennen, ausblenden, Farbe, neue hinzufügen (in den Einstellungen gespeichert)
  let KAT_AUS = KAT_AUS_STD, KAT_EIN = KAT_EIN_STD;
  const FARBEN = ['#3B55E6', '#0E9F6E', '#F5B53D', '#E5484D', '#8FA6FF', '#1C2A7B', '#14B8A6', '#A855F7', '#F97316', '#64748B', '#EC4899', '#84CC16', '#06B6D4', '#B7791F', '#7C8499', '#94A3B8'];
  function kategorienAnwenden() {
    const k = (Z.einst && Z.einst.kategorien) || {};
    const mischen = (std, eigene) => {
      const map = new Map(std.map((x, i) => [x.id, { ...x, farbe: FARBEN[i % FARBEN.length] }]));
      for (const e of eigene || []) if (e && e.id) map.set(e.id, { ...(map.get(e.id) || { ziffer: 405, satz: 8.1 }), ...e });
      return [...map.values()];
    };
    KAT_AUS = mischen(KAT_AUS_STD, k.aus);
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
    loehne: '<svg viewBox="0 0 24 24"><circle cx="9" cy="8" r="3.2"/><path d="M3 20a6 6 0 0 1 12 0"/><circle cx="17" cy="9" r="2.5"/><path d="M15.5 14.2A5 5 0 0 1 21 19"/></svg>',
    mehr: '<svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.7 1.7 0 0 0 .3 1.8l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.7 1.7 0 0 0-1.8-.3 1.7 1.7 0 0 0-1 1.5V21a2 2 0 1 1-4 0v-.1a1.7 1.7 0 0 0-1.1-1.5 1.7 1.7 0 0 0-1.8.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.7 1.7 0 0 0 .3-1.8 1.7 1.7 0 0 0-1.5-1H3a2 2 0 1 1 0-4h.1a1.7 1.7 0 0 0 1.5-1.1 1.7 1.7 0 0 0-.3-1.8l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.7 1.7 0 0 0 1.8.3H9a1.7 1.7 0 0 0 1-1.5V3a2 2 0 1 1 4 0v.1a1.7 1.7 0 0 0 1 1.5 1.7 1.7 0 0 0 1.8-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.7 1.7 0 0 0-.3 1.8V9a1.7 1.7 0 0 0 1.5 1H21a2 2 0 1 1 0 4h-.1a1.7 1.7 0 0 0-1.5 1z"/></svg>',
  };
  const ANSICHTEN = [
    ['uebersicht', 'Übersicht'], ['buchungen', 'Buchungen'], ['auswertung', 'Auswertung'], ['loehne', 'Löhne'], ['mwst', 'MWST'], ['abschluss', 'Abschluss'], ['mehr', 'Einstellungen'],
  ];
  const KURZ = { uebersicht: 'Start', buchungen: 'Buchen', auswertung: 'Grafik', mwst: 'MWST', abschluss: 'Abschluss', mehr: 'Mehr' };

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
  };
  try { const a = localStorage.getItem('nb.ansicht'); if (a && ANSICHTEN.some(([id]) => id === a)) Z.ansicht = a; } catch {}

  async function laden() {
    Z.buchungen = await Speicher.alle('buchungen');
    const e = await Speicher.holen('einstellungen', 'haupt');
    if (e) Z.einst = { ...Z.einst, ...e };
    kategorienAnwenden();
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

  /* ================= Navigation ================= */
  function navZeichnen() {
    $('navPc').innerHTML = ANSICHTEN.map(([id, name]) =>
      `<button class="nav-knopf ${Z.ansicht === id ? 'aktiv' : ''}" data-ansicht="${id}">${ICON[id]}${name}</button>`).join('');
    $('navHandy').innerHTML = ANSICHTEN.filter(([id]) => id !== 'loehne').map(([id, name]) =>
      `<button class="${Z.ansicht === id ? 'aktiv' : ''}" data-ansicht="${id}">${ICON[id]}${KURZ[id] || name}</button>`).join('');
  }
  document.addEventListener('click', (e) => {
    const k = e.target.closest('[data-ansicht]');
    if (!k) return;
    Z.ansicht = k.dataset.ansicht;
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
    const f = { uebersicht: uebersicht, buchungen: buchungenAnsicht, auswertung: auswertung, loehne: loehneAnsicht, mwst: mwstAnsicht, abschluss: abschluss, mehr: mehr }[Z.ansicht];
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
      if (b.typ === 'einnahme') ein += netto(b); else aus += netto(b);
    }
    return { ein, aus, gewinn: ein - aus };
  }

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
        <div class="legende"><span><i style="background:var(--elektrik)"></i>Einnahmen</span><span><i style="background:rgba(28,42,123,.22)"></i>Ausgaben</span></div>
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
    const karteVerlauf = st.verlauf ? `<div class="card"><h2>Gewinn im Verlauf ${Z.jahr}</h2>${linienDiagramm([{ werte: kumuliert(Z.jahr), farbe: 'var(--elektrik)', name: Z.jahr }])}</div>` : '';
    return `
    <div class="kopf">
      <div><h1>${esc(Z.einst.begruessung || 'Übersicht')}</h1><p class="unter">Alle Beträge ohne MWST</p></div>
      <div class="kopf-aktionen">${jahrWahl()}<button class="btn" onclick="NB.zwischenbilanz()">Zwischenbilanz</button><button class="btn" onclick="NB.fahrt()">Fahrt erfassen</button><a class="btn nv-weg" href="rechnungen/" style="text-decoration:none">Rechnung schreiben</a><button class="btn btn-haupt nur-pc" onclick="NB.neu()">+ Neue Buchung</button></div>
    </div>
    ${k('ziel', ziel ? `<div class="card abstand-unten ziel-karte"><div class="ziel-kopf"><h2 style="margin:0">Jahresziel ${Z.jahr}</h2><span class="num">${chf(s.ein)} von ${chf(ziel)} CHF · ${zielPct} %</span></div><div class="spur gross"><i style="width:${zielPct}%"></i></div></div>` : '')}
    ${k('kennzahlen', `<div class="raster raster-4">`)}
      ${st.kennzahlen ? '' : '<!--KZ'}<div class="card kennzahl"><div class="label">Einnahmen</div><div class="wert">${chf(s.ein)}</div><div class="klein">CHF im Jahr ${Z.jahr}</div></div>
      <div class="card kennzahl"><div class="label">Ausgaben</div><div class="wert">${chf(s.aus)}</div><div class="klein">CHF im Jahr ${Z.jahr}</div></div>
      <div class="card kennzahl"><div class="label">Gewinn</div><div class="wert ${s.gewinn < 0 ? 'minus' : 'plus'}">${chf(s.gewinn)}</div><div class="klein">Einnahmen minus Ausgaben</div></div>
      <div class="card kennzahl"><div class="label">Offene Rechnungen</div><div class="wert">${chf(offenSumme)}</div><div class="klein">${offen.length} ${offen.length === 1 ? 'Rechnung' : 'Rechnungen'} noch nicht bezahlt</div></div>${st.kennzahlen ? '' : 'KZ-->'}
    ${k('kennzahlen', '</div>')}
    ${paar(karteMonate, karteMwst)}
    ${paar(karteVerlauf, '')}
    ${paar(karteKat, karteZuletzt)}
    <!--ALT
      <div class="card">
        <h2>Monate ${Z.jahr}</h2>
        <div class="balken">${balken}</div>
        <div class="legende"><span><i style="background:var(--elektrik)"></i>Einnahmen</span><span><i style="background:rgba(28,42,123,.22)"></i>Ausgaben</span></div>
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
    ['mwst', 'MWST im laufenden Quartal'], ['verlauf', 'Gewinn im Verlauf'], ['kategorien', 'Ausgaben nach Kategorie'], ['zuletzt', 'Zuletzt erfasst']];
  const startKarten = () => ({ kennzahlen: true, ziel: true, monate: true, mwst: true, verlauf: false, kategorien: true, zuletzt: true, ...(Z.einst.start || {}) });

  /* ================= Diagramme ================= */
  const monatsWerte = (jahr, typ) => {
    const m = Array(12).fill(0);
    for (const b of imJahr(jahr)) if (!typ || b.typ === typ) m[Number(b.datum.slice(5, 7)) - 1] += typ ? netto(b) : (b.typ === 'einnahme' ? netto(b) : -netto(b));
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
      <div class="legende"><span><i style="background:var(--elektrik)"></i>${esc(namen[0])}</span><span><i style="background:rgba(28,42,123,.22)"></i>${esc(namen[1])}</span></div>`;
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
  function kategorieRaten(t, typ) {
    if (typ === 'einnahme') return 'dienstleistung';
    const frueher = sortiert(Z.buchungen).find((b) => b.typ === 'ausgabe' && b.partner && t.partner && b.partner.toLowerCase() === t.partner.toLowerCase());
    if (frueher) return frueher.kategorie;
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
  async function bankImport() {
    const datei = await dateiWaehlen('.xml,.csv,.txt,text/csv,text/xml,application/xml');
    if (!datei) return;
    let liste;
    try {
      const roh = await datei.text();
      liste = /<\?xml|<Document/i.test(roh.slice(0, 500)) ? camtLesen(roh) : csvLesen(roh);
    } catch (f) { toast(f.message || 'Diese Datei kann ich nicht lesen'); return; }
    if (!liste.length) { toast('In dieser Datei habe ich keine Buchungen gefunden'); return; }
    const bekannt = new Set(Z.buchungen.map((b) => b.importSchluessel).filter(Boolean));
    const offen = Z.buchungen.filter(istOffen);
    const vergeben = new Set();
    const vorschlaege = liste.map((t) => {
      const typ = t.betragRappen > 0 ? 'einnahme' : 'ausgabe';
      const betrag = Math.abs(t.betragRappen);
      const schluessel = importSchluessel(t);
      const rechnung = typ === 'einnahme' ? offen.find((b) => b.betragRappen === betrag && !vergeben.has(b.id)) : null;
      if (rechnung) vergeben.add(rechnung.id);
      // Gleiche Bewegung aus einer anderen Datei (z. B. erst CSV, dann camt): gleiches Datum, gleicher Betrag
      const aehnlich = Z.buchungen.some((b) => b.quelle === 'bank' && b.datum === t.datum && b.betragRappen === betrag && b.typ === typ);
      const nachName = t.kategorieName ? (typ === 'ausgabe' ? KAT_AUS : KAT_EIN).find((k) => k.name.toLowerCase() === t.kategorieName.toLowerCase() || k.name.toLowerCase().includes(t.kategorieName.toLowerCase().slice(0, 6))) : null;
      return { ...t, typ, betrag, schluessel, doppelt: bekannt.has(schluessel) || aehnlich, rechnung, kategorie: nachName ? nachName.id : kategorieRaten(t, typ) };
    });
    const dlg = $('dlg');
    const optionen = (v) => sichtbar(v.typ === 'ausgabe' ? KAT_AUS : KAT_EIN, v.kategorie).map((k) => `<option value="${k.id}" ${k.id === v.kategorie ? 'selected' : ''}>${esc(k.name)}</option>`).join('');
    const neu = vorschlaege.filter((v) => !v.doppelt).length;
    dlg.innerHTML = `<form method="dialog" id="iForm" class="import-form">
      <div class="dlg-kopf"><h3>Bankauszug: ${vorschlaege.length} Bewegungen</h3><button type="button" class="x" data-zu aria-label="Schliessen">×</button></div>
      <div class="dlg-inhalt">
        <p class="hinweis">Prüfen Sie die Vorschläge. Zahlungen, die zu einer offenen Rechnung passen, werden als bezahlt vermerkt statt neu gebucht. Bereits importierte Bewegungen sind abgewählt.</p>
        <div class="import-liste">${vorschlaege.map((v, i) => `<div class="import-zeile ${v.doppelt ? 'doppelt' : ''}">
          <input type="checkbox" data-i="${i}" ${v.doppelt ? '' : 'checked'} aria-label="Übernehmen" />
          <div class="import-text"><b>${esc(v.partner || v.text || '—')}</b><small>${datumKurz(v.datum)} · ${esc((v.text || '').slice(0, 80))}${v.doppelt ? ' · schon importiert' : ''}</small></div>
          <div class="import-betrag ${v.typ === 'einnahme' ? 'plus' : ''}">${v.typ === 'einnahme' ? '+' : '−'} ${chf(v.betrag)}</div>
          ${v.rechnung ? `<div class="import-kat"><span class="marke marke-ok">Rechnung ${esc(v.rechnung.rechnungNr || '')} bezahlt</span></div>` : `<select class="auswahl-klein import-kat" data-kat="${i}">${optionen(v)}</select>`}
        </div>`).join('')}</div>
      </div>
      <div class="dlg-fuss"><div class="rechts"><button type="button" class="btn" data-zu>Abbrechen</button><button type="submit" class="btn btn-haupt">Ausgewählte übernehmen</button></div></div>
    </form>`;
    dlg.onclick = (e) => { if (e.target === dlg || e.target.closest('[data-zu]')) dlg.close(); };
    dlg.onchange = (e) => { const k = e.target.closest('[data-kat]'); if (k) vorschlaege[Number(k.dataset.kat)].kategorie = k.value; };
    dlg.oninput = null;
    $('iForm').onsubmit = async (e) => {
      e.preventDefault();
      const gewaehlt = [...dlg.querySelectorAll('input[data-i]:checked')].map((c) => vorschlaege[Number(c.dataset.i)]);
      const speichern = [];
      for (const v of gewaehlt) {
        if (v.rechnung) { speichern.push({ ...v.rechnung, bezahlt: true, bezahltAm: v.datum, zahlung: 'Bank', importSchluessel: v.schluessel }); continue; }
        const liste2 = v.typ === 'ausgabe' ? KAT_AUS : KAT_EIN;
        const satz = v.mwstSatz != null ? v.mwstSatz : ((liste2.find((k) => k.id === v.kategorie) || {}).satz ?? 8.1);
        speichern.push({ typ: v.typ, quelle: 'bank', kategorie: v.kategorie, datum: v.datum, betragRappen: v.betrag, mwstSatz: satz, mwstRappen: mwstAus(v.betrag, satz),
          text: (v.text || '').slice(0, 120), partner: (v.partner || '').slice(0, 80), zahlung: 'Bank', importSchluessel: v.schluessel });
      }
      for (const b of speichern) await Speicher.speichern('buchungen', b);
      dlg.close();
      const bezahlt = gewaehlt.filter((v) => v.rechnung).length;
      await neuLaden(`${speichern.length - bezahlt} Buchungen übernommen${bezahlt ? `, ${bezahlt} Rechnungen als bezahlt vermerkt` : ''}`);
    };
    dlg.showModal();
    if (!neu) toast('Alle Bewegungen sind schon importiert');
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
            <input type="color" value="${k.farbe || '#3B55E6'}" data-kfarbe="${i}" aria-label="Farbe" />
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
      if (t.matches('[data-kstandard]') && confirm('Alle Kategorien auf den Standard zurücksetzen? Eigene Kategorien bleiben bei alten Buchungen erhalten.')) {
        await einstSpeichern({ kategorien: {} }); dlg.close(); zeichnen(); toast('Standard wiederhergestellt');
      }
    };
    zeichnenK();
    dlg.showModal();
  }

  /* ================= Belege stapelweise hochladen ================= */
  function mehrereDateien(accept) {
    return new Promise((ok) => {
      const inp = document.createElement('input');
      inp.type = 'file'; inp.multiple = true; inp.accept = accept;
      inp.onchange = () => ok([...inp.files]);
      inp.click();
    });
  }
  async function belegeStapel() {
    const dateien = await mehrereDateien('image/*,application/pdf');
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
    const grund = m.lohnart === 'stunde' ? Math.round((Number(e.stunden) || 0) * (m.lohn || 0)) : Math.round((m.lohn || 0) * (Number(m.pensum) || 100) / 100);
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
    return { grund, ferien, bonus, brutto, zulagen, spesen, an, abzuege, netto: brutto - abzuege + zulagen + spesen, ag, agTotal };
  }
  const chfFeld = (r) => (r ? chf(r).replace(/’/g, '') : '');

  function loehneAnsicht() {
    const monat = Z.lohnMonat, jahr = monat.slice(0, 4), S = lohnSaetze();
    const aktive = mitarbeiterListe().filter((m) => m.aktiv !== false);
    const zeilenL = aktive.map((m) => ({ m, e: lohnEingabe(monat, m.id), r: lohnBerechnen(m, lohnEingabe(monat, m.id)) }));
    const summe = (f) => zeilenL.reduce((a, z) => a + f(z.r), 0);
    const gebucht = Z.buchungen.some((b) => b.quelle === 'lohn' && b.lohnMonat === monat);
    const jahrZeilen = mitarbeiterListe().map((m) => {
      const t = { brutto: 0, sozial: 0, bvg: 0, qst: 0, zulagen: 0, spesen: 0, netto: 0, monate: 0 };
      for (let i = 1; i <= 12; i++) {
        const mo = `${jahr}-${String(i).padStart(2, '0')}`;
        if (!Z.buchungen.some((b) => b.quelle === 'lohn' && b.lohnMonat === mo && b.partner === m.name)) continue;
        const r = lohnBerechnen(m, lohnEingabe(mo, m.id));
        t.brutto += r.brutto; t.sozial += r.an.ahv + r.an.alv + r.an.nbu + r.an.ktg; t.bvg += r.an.bvg; t.qst += r.an.qst;
        t.zulagen += r.zulagen; t.spesen += r.spesen; t.netto += r.netto; t.monate++;
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
        <tr><th>Mitarbeiter</th><th>Stunden</th><th class="b">Bonus</th><th class="b">Spesen</th><th class="b">Brutto</th><th class="b">Abzüge</th><th class="b">Auszahlung</th><th></th></tr>
        ${zeilenL.map(({ m, e, r }) => `<tr>
          <td><b>${esc(m.name)}</b><br><span class="hinweis">${m.lohnart === 'stunde' ? `${chf(m.lohn)} pro Stunde` : `${chf(m.lohn)} pro Monat · ${m.pensum || 100} %`}</span></td>
          <td>${m.lohnart === 'stunde' ? `<input class="bilanz-eingabe klein" inputmode="decimal" data-lohn="${m.id}:stunden" value="${e.stunden || ''}" placeholder="0" />` : '<span class="hinweis">Monatslohn</span>'}</td>
          <td class="b"><input class="bilanz-eingabe klein" inputmode="decimal" data-lohn="${m.id}:bonus" value="${chfFeld(e.bonus)}" placeholder="0.00" /></td>
          <td class="b"><input class="bilanz-eingabe klein" inputmode="decimal" data-lohn="${m.id}:spesen" value="${chfFeld(e.spesen)}" placeholder="0.00" /></td>
          <td class="b">${chf(r.brutto)}</td><td class="b">− ${chf(r.abzuege)}</td><td class="b"><b>${chf(r.netto)}</b></td>
          <td><button class="btn btn-klein" onclick="NB.lohnzettel('${m.id}')">Abrechnung</button></td></tr>`).join('')}
        <tr class="summe"><td>Total</td><td></td><td></td><td class="b">${chf(summe((r) => r.spesen))}</td><td class="b">${chf(summe((r) => r.brutto))}</td><td class="b">− ${chf(summe((r) => r.abzuege))}</td><td class="b">${chf(summe((r) => r.netto))}</td><td></td></tr>
      </table></div>
      <p class="hinweis abstand">Arbeitgeberbeiträge dazu: <strong>CHF ${chf(summe((r) => r.agTotal))}</strong>. Lohnkosten total: <strong>CHF ${chf(summe((r) => r.brutto + r.agTotal + r.spesen))}</strong>.</p>
      <div class="abstand" style="display:flex;gap:8px;flex-wrap:wrap"><button class="btn btn-haupt" onclick="NB.lohnBuchen()">${gebucht ? 'Lohnlauf neu buchen' : 'Lohnlauf buchen'}</button><span class="hinweis" style="align-self:center">Bucht Löhne, Arbeitgeberbeiträge und Spesen als Ausgaben. Erneut buchen ersetzt den Monat.</span></div>
    </div>` : `<div class="card leer-karte"><h2>Noch keine Mitarbeiter</h2><p class="hinweis">Erfassen Sie Ihre Mitarbeiter mit Monats- oder Stundenlohn. Danach rechnet das Programm jeden Monat Brutto, AHV, ALV, Unfall, Pensionskasse und Auszahlung.</p><button class="btn btn-haupt abstand" onclick="NB.mitarbeiter()">+ Ersten Mitarbeiter erfassen</button></div>`}
    <div class="raster raster-2 abstand">
      <div class="card"><h2>Mitarbeiter</h2>
        ${mitarbeiterListe().length ? `<div class="liste">${mitarbeiterListe().map((m) => `<div class="zeile" data-mitarbeiter="${m.id}"><div class="datum">${m.aktiv === false ? 'ausgetreten' : (m.eintritt ? datumKurz(m.eintritt) : '')}</div><div style="min-width:0"><div class="titel">${esc(m.name)}</div><div class="info"><span>${m.lohnart === 'stunde' ? 'Stundenlohn' : 'Monatslohn'}</span>${m.ahvNr ? `<span>${esc(m.ahvNr)}</span>` : ''}</div></div><div class="betrag">${chf(m.lohn)}</div></div>`).join('')}</div>` : '<p class="leer">Noch niemand erfasst.</p>'}
      </div>
      <div class="card"><h2>Jahresübersicht ${jahr}</h2>
        ${jahrZeilen.length ? `<div class="tabelle-scroll"><table>
          <tr><th>Name</th><th class="b">Brutto</th><th class="b">AHV/ALV/NBU</th><th class="b">BVG</th><th class="b">Netto</th></tr>
          ${jahrZeilen.map(({ m, t }) => `<tr><td>${esc(m.name)}<br><span class="hinweis">${t.monate} Monate${t.qst ? ` · QST ${chf(t.qst)}` : ''}${t.spesen ? ` · Spesen ${chf(t.spesen)}` : ''}</span></td><td class="b">${chf(t.brutto)}</td><td class="b">${chf(t.sozial)}</td><td class="b">${chf(t.bvg)}</td><td class="b">${chf(t.netto)}</td></tr>`).join('')}
        </table></div><p class="hinweis abstand">Diese Werte brauchen Sie für den Lohnausweis (Bruttolohn Ziffer 8, Beiträge AHV/IV/EO/ALV/NBUV Ziffer 9, BVG Ziffer 10). <button class="link" onclick="window.print()">Drucken</button></p>` : '<p class="leer">Noch keine gebuchten Lohnläufe in diesem Jahr.</p>'}
      </div>
    </div>
    <div class="card abstand"><h2>Sätze für Sozialversicherungen</h2>
      <p class="hinweis" style="margin-bottom:10px">Vorgaben für 2026. Bitte mit Ihrer Ausgleichskasse, Unfallversicherung und Krankentaggeld-Versicherung abgleichen und anpassen.</p>
      <div class="saetze-raster">${Object.keys(LOHN_SAETZE_STD).map((k) => `<label class="feld"><span class="hinweis">${LOHN_SAETZE_TEXT[k]}</span><input type="text" inputmode="decimal" data-lohnsatz="${k}" value="${S[k]}" /></label>`).join('')}</div>
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
        ${f('iban', 'IBAN für die Auszahlung', m.iban)}
        <label class="haken"><input type="checkbox" id="m_aktiv" ${m.aktiv !== false ? 'checked' : ''} /> Arbeitet zurzeit bei uns</label>
      </div>
      <div class="dlg-fuss">${vorhanden ? '<button type="button" class="btn btn-rot" data-ma-weg>Löschen</button>' : ''}<div class="rechts"><button type="button" class="btn" data-zu>Abbrechen</button><button type="submit" class="btn btn-haupt">Speichern</button></div></div>
    </form>`;
    dlg.oninput = null;
    dlg.onchange = (e) => { if (e.target.id === 'm_lohnart') $('m_lohn').previousElementSibling.textContent = e.target.value === 'stunde' ? 'Lohn pro Stunde (CHF)' : 'Monatslohn 100 % (CHF)'; };
    dlg.onclick = async (e) => {
      if (e.target === dlg || e.target.closest('[data-zu]')) { dlg.close(); return; }
      if (e.target.closest('[data-ma-weg]') && confirm(`${m.name} löschen? Gebuchte Löhne bleiben in der Buchhaltung.`)) {
        await einstSpeichern({ mitarbeiter: mitarbeiterListe().filter((x) => x.id !== m.id) }); dlg.close(); zeichnen();
      }
    };
    $('mForm').onsubmit = async (e) => {
      e.preventDefault();
      const z = (id) => { const r = betragLesen($('m_' + id).value); return Number.isFinite(r) ? r : 0; };
      const zahlF = (id) => { const v = Number(String($('m_' + id).value).replace(',', '.')); return Number.isFinite(v) ? v : 0; };
      Object.assign(m, { name: $('m_name').value.trim(), strasse: $('m_strasse').value.trim(), ort: $('m_ort').value.trim(), ahvNr: $('m_ahvNr').value.trim(),
        eintritt: $('m_eintritt').value, lohnart: $('m_lohnart').value, lohn: z('lohn'), pensum: zahlF('pensum') || 100, ferienPct: zahlF('ferienPct'),
        bvg: z('bvg'), bvgAg: $('m_bvgAg').value.trim() ? z('bvgAg') : '', zulagen: z('zulagen'), qst: zahlF('qst'), iban: $('m_iban').value.trim(), aktiv: $('m_aktiv').checked });
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
    const alt = Z.buchungen.filter((b) => b.quelle === 'lohn' && b.lohnMonat === monat);
    for (const b of alt) await Speicher.loeschen('buchungen', b.id);
    let n = 0;
    for (const m of mitarbeiterListe().filter((x) => x.aktiv !== false)) {
      const r = lohnBerechnen(m, lohnEingabe(monat, m.id));
      if (!r.brutto) continue;
      const basis = { typ: 'ausgabe', quelle: 'lohn', lohnMonat: monat, datum: ende, mwstSatz: 0, mwstRappen: 0, partner: m.name, zahlung: 'Bank' };
      await Speicher.speichern('buchungen', { ...basis, id: `lohn-${monat}-${m.id}`, kategorie: 'loehne', betragRappen: r.brutto + r.zulagen, text: `Lohn ${name}` });
      if (r.agTotal) await Speicher.speichern('buchungen', { ...basis, id: `lohn-ag-${monat}-${m.id}`, kategorie: 'sozial', betragRappen: r.agTotal, text: `Arbeitgeberbeiträge ${name}` });
      if (r.spesen) await Speicher.speichern('buchungen', { ...basis, id: `lohn-sp-${monat}-${m.id}`, kategorie: 'spesen', betragRappen: r.spesen, text: `Spesen ${name}` });
      n++;
    }
    await neuLaden(n ? `Lohnlauf ${name} gebucht (${n} ${n === 1 ? 'Person' : 'Personen'})` : 'Keine Löhne zu buchen');
  }

  function lohnzettel(id) {
    const m = mitarbeiterListe().find((x) => x.id === id);
    if (!m) return;
    const monat = Z.lohnMonat, r = lohnBerechnen(m, lohnEingabe(monat, m.id)), S = lohnSaetze();
    const F = (window.Marke && Marke.daten()) || {};
    const firma = F.name || 'Nasuvia', farbe = F.farbe1 || '#1C2A7B';
    const z = (t, b, neg) => `<tr><td>${t}</td><td class="b">${neg ? '−' : ''} ${chf(b)}</td></tr>`;
    const html = `<!doctype html><html lang="de-CH"><head><meta charset="utf-8"><title>Lohnabrechnung ${esc(m.name)} ${monat}</title>
      <style>body{font:14px/1.5 -apple-system,system-ui,sans-serif;color:#0C1226;margin:0;padding:18mm}h1{font-size:26px;margin:24px 0 2px;color:${farbe}}
      .kopf{display:flex;justify-content:space-between;align-items:flex-start;border-top:6px solid ${farbe};padding-top:12px}.kopf img{max-height:46px;max-width:200px}
      .an{margin-top:26px;line-height:1.45}table{width:100%;border-collapse:collapse;margin-top:18px}td{padding:6px 0;border-bottom:1px solid #E3E6EF}td.b{text-align:right;font-variant-numeric:tabular-nums}
      tr.s td{font-weight:700;border-top:2px solid #0C1226;border-bottom:0;padding-top:9px}tr.t td{font-weight:700;font-size:17px;color:${farbe}}.h{color:#7C8499;font-size:12px}
      @media print{body{padding:12mm}}</style></head><body>
      <div class="kopf"><div>${F.logo ? `<img src="${F.logo}" alt="">` : `<b style="font-size:20px">${esc(firma)}</b>`}<div class="h">${esc([F.strasse, F.ort].filter(Boolean).join(', '))}</div></div><div class="h" style="text-align:right">Lohnabrechnung<br>${esc(monatName(monat))}</div></div>
      <div class="an"><b>${esc(m.name)}</b><br>${esc(m.strasse || '')}<br>${esc(m.ort || '')}${m.ahvNr ? `<br><span class="h">AHV-Nr. ${esc(m.ahvNr)}</span>` : ''}</div>
      <h1>Lohnabrechnung ${esc(monatName(monat))}</h1>
      <table>
        ${m.lohnart === 'stunde' ? z(`Stundenlohn ${lohnEingabe(monat, m.id).stunden || 0} h × ${chf(m.lohn)}`, r.grund) + (r.ferien ? z(`Ferienentschädigung ${m.ferienPct} %`, r.ferien) : '') : z(`Monatslohn${(m.pensum || 100) !== 100 ? ` (${m.pensum} %)` : ''}`, r.grund)}
        ${r.bonus ? z('Bonus / Zulage', r.bonus) : ''}
        <tr class="s"><td>Bruttolohn</td><td class="b">${chf(r.brutto)}</td></tr>
        ${z(`AHV/IV/EO ${S.ahv} %`, r.an.ahv, 1)}${z(`ALV ${S.alv} %`, r.an.alv, 1)}${r.an.nbu ? z(`Nichtberufsunfall ${S.nbu} %`, r.an.nbu, 1) : ''}${r.an.ktg ? z(`Krankentaggeld ${S.ktg} %`, r.an.ktg, 1) : ''}
        ${r.an.bvg ? z('Pensionskasse (BVG)', r.an.bvg, 1) : ''}${r.an.qst ? z(`Quellensteuer ${m.qst} %`, r.an.qst, 1) : ''}
        <tr class="s"><td>Nettolohn</td><td class="b">${chf(r.brutto - r.abzuege)}</td></tr>
        ${r.zulagen ? z('Kinder- und Familienzulagen', r.zulagen) : ''}${r.spesen ? z('Spesen', r.spesen) : ''}
        <tr class="s t"><td>Auszahlung</td><td class="b">CHF ${chf(r.netto)}</td></tr>
      </table>
      ${m.iban ? `<p class="h" style="margin-top:14px">Überweisung auf ${esc(m.iban)}</p>` : ''}
      <script>setTimeout(function(){window.print()},300)<\/script></body></html>`;
    const w = window.open('', '_blank');
    if (!w) { toast('Bitte Pop-ups für diese Seite erlauben'); return; }
    w.document.write(html); w.document.close();
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
          <div class="info"><span class="nur-handy-datum">${datumKurz(b.datum)}</span><span>${esc(katName(b))}</span>${b.partner && b.text ? `<span>${esc(b.partner)}</span>` : ''}${marke}${beleg}</div>
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
      <div class="kopf-aktionen">${jahrWahl()}<button class="btn" onclick="NB.bankImport()">Bankauszug oder Daten importieren</button><button class="btn" onclick="NB.belege()">Belege hochladen</button><button class="btn" onclick="NB.fahrt()">Fahrt erfassen</button><button class="btn btn-haupt nur-pc" onclick="NB.neu()">+ Neue Buchung</button></div>
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
  async function buchungBearbeiten(vorhanden, vorlage = {}) {
    const { _beleg, _titel, ...vorgaben } = vorlage;
    const b = vorhanden ? { ...vorhanden } : {
      typ: 'ausgabe', datum: heute(), kategorie: 'material', mwstSatz: 8.1, zahlung: 'Bank', quelle: 'manuell', ...vorgaben,
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
      dlg.innerHTML = `
      <form method="dialog" id="bForm">
        <div class="dlg-kopf"><h3>${_titel || (vorhanden ? 'Buchung bearbeiten' : (vorgaben.text ? 'Kopie der Buchung' : 'Neue Buchung'))}</h3><button type="button" class="x" data-zu aria-label="Schliessen">×</button></div>
        <div class="dlg-inhalt">
          ${rechnung ? `<p class="hinweis"><span class="marke marke-info">Rechnung ${esc(b.rechnungNr || '')}</span> aus der Rechnungs-App</p>`
            : `<div class="segment"><button type="button" class="${!ein ? 'an' : ''}" data-btyp="ausgabe">Ausgabe</button><button type="button" class="${ein ? 'an' : ''}" data-btyp="einnahme">Einnahme</button></div>`}
          <div class="feld-zeile">
            <div class="feld"><label for="fBetrag">Betrag inkl. MWST (CHF)</label><input type="text" id="fBetrag" inputmode="decimal" autocomplete="off" placeholder="0.00" value="${b.betragRappen != null ? chf(b.betragRappen).replace(/’/g, '') : ''}" required /></div>
            <div class="feld"><label for="fDatum">Datum</label><input type="date" id="fDatum" value="${b.datum}" required /></div>
          </div>
          <div class="feld-zeile">
            <div class="feld"><label for="fSatz">MWST-Satz</label><select id="fSatz">${SAETZE.map((s) => `<option value="${s}" ${Number(b.mwstSatz) === s ? 'selected' : ''}>${s ? s.toFixed(1) + ' %' : 'ohne MWST'}</option>`).join('')}</select></div>
            <div class="feld"><label for="fMwst">${ein ? 'MWST' : 'Vorsteuer'} (CHF)</label><input type="text" id="fMwst" inputmode="decimal" autocomplete="off" value="${b.mwstRappen != null ? chf(b.mwstRappen).replace(/’/g, '') : ''}" /></div>
          </div>
          <div class="feld"><label for="fKat">Kategorie</label><select id="fKat">${katOptionen()}</select></div>
          <div class="feld"><label for="fText">Beschreibung</label><input type="text" id="fText" value="${esc(b.text || '')}" placeholder="${ein ? 'z. B. Spleissarbeiten Winterthur' : 'z. B. Kabel und OTO-Dosen'}" /></div>
          <div class="feld-zeile">
            <div class="feld"><label for="fPartner">${ein ? 'Kunde' : 'Lieferant'}</label><input type="text" id="fPartner" list="partnerListe" value="${esc(b.partner || '')}" /><datalist id="partnerListe">${partner.map((p) => `<option value="${esc(p)}">`).join('')}</datalist></div>
            <div class="feld"><label for="fZahlung">Bezahlt mit</label><select id="fZahlung">${ZAHLUNG.map((z) => `<option ${b.zahlung === z ? 'selected' : ''}>${z}</option>`).join('')}</select></div>
          </div>
          ${rechnung ? `<div class="feld-zeile">
            <label class="haken"><input type="checkbox" id="fBezahlt" ${b.bezahlt ? 'checked' : ''} />Rechnung ist bezahlt</label>
            <div class="feld"><label for="fBezahltAm">Bezahlt am</label><input type="date" id="fBezahltAm" value="${b.bezahltAm || ''}" ${b.bezahlt ? '' : 'disabled'} /></div>
          </div>` : ''}
          <div id="belegBox">${belegHtml()}</div>
        </div>
        <div class="dlg-fuss">
          ${vorhanden ? '<button type="button" class="btn btn-rot" data-loeschen>Löschen</button><button type="button" class="btn" data-duplizieren>Duplizieren</button>' : ''}
          <div class="rechts"><button type="button" class="btn" data-zu>Abbrechen</button><button type="submit" class="btn btn-haupt">Speichern</button></div>
        </div>
      </form>`;
    }

    function mwstNachfuehren() {
      if (mwstVonHand) return;
      const brutto = betragLesen($('fBetrag').value);
      const satz = Number($('fSatz').value);
      $('fMwst').value = Number.isFinite(brutto) ? chf(mwstAus(brutto, satz)).replace(/’/g, '') : '';
    }

    function felderMerken() {
      if (!$('fBetrag')) return;
      const r = betragLesen($('fBetrag').value);
      b.betragRappen = Number.isFinite(r) ? r : null;
      b.datum = $('fDatum').value;
      b.mwstSatz = Number($('fSatz').value);
      const m = betragLesen($('fMwst').value);
      b.mwstRappen = Number.isFinite(m) ? m : null;
      b.kategorie = $('fKat').value;
      b.text = $('fText').value.trim();
      b.partner = $('fPartner').value.trim();
      b.zahlung = $('fZahlung').value;
      if ($('fBezahlt')) { b.bezahlt = $('fBezahlt').checked; b.bezahltAm = b.bezahlt ? ($('fBezahltAm').value || heute()) : ''; }
    }

    formular();
    dlg.showModal();
    if (!vorhanden && !matchMedia('(max-width: 820px)').matches) $('fBetrag').focus();

    dlg.oninput = (e) => {
      if (e.target.id === 'fMwst') mwstVonHand = true;
      if (e.target.id === 'fBetrag') mwstNachfuehren();
    };
    dlg.onchange = (e) => {
      if (e.target.id === 'fSatz') { mwstVonHand = false; mwstNachfuehren(); }
      if (e.target.id === 'fKat' && !vorhanden) {
        const k = (b.typ === 'ausgabe' ? KAT_AUS : KAT_EIN).find((x) => x.id === e.target.value);
        if (k) { $('fSatz').value = String(k.satz); mwstVonHand = false; mwstNachfuehren(); }
      }
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
      if (t.matches('[data-loeschen]')) {
        if (!confirm('Diese Buchung wirklich löschen?')) return;
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

  /* ================= Einstellungen ================= */
  function letzteSicherung() {
    let d = null;
    try { d = localStorage.getItem('nb.sicherung'); } catch {}
    return d ? `Letzte Sicherung auf diesem Gerät: ${datumKurz(d.slice(0, 10))}` : 'Auf diesem Gerät wurde noch keine Sicherung gespeichert.';
  }

  function mehr() {
    const v = Z.einst.abrechnung;
    return `
    <div class="kopf"><div><h1>Einstellungen</h1><p class="unter">Daten, Sicherung und MWST</p></div></div>
    <div class="raster raster-2">
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
      <div class="card nur-handy-karte">
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
        <h2>Kategorien und Fahrten</h2>
        <p class="hinweis">Eigene Kategorien anlegen, umbenennen, einfärben oder ausblenden.</p>
        <button class="btn abstand" onclick="NB.kategorien()">Kategorien anpassen</button>
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
      if (!confirm('Abmelden? Die Daten bleiben auf diesem Gerät, werden aber nicht mehr abgeglichen.')) return;
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
      buchungen: await Speicher.alleMitGeloeschten('buchungen'), einstellungen: Z.einst, belege,
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
    if (!confirm(`Sicherung vom ${datumKurz((d.erstellt || '').slice(0, 10))} laden? Neuere Einträge auf diesem Gerät bleiben erhalten.`)) return;
    const jetzt = new Map((await Speicher.alleMitGeloeschten('buchungen')).map((b) => [b.id, b]));
    const neuer = (x) => !jetzt.get(x.id) || (jetzt.get(x.id).geaendert || '') < (x.geaendert || '');
    await Speicher.mehrereSpeichern('buchungen', (d.buchungen || []).filter(neuer));
    const belege = [];
    for (const x of d.belege || []) belege.push({ ...x, daten: x.daten ? await textZuBlob(x.daten) : null });
    await Speicher.mehrereSpeichern('belege', belege);
    if (d.einstellungen) Z.einst = await Speicher.speichern('einstellungen', { ...d.einstellungen, id: 'haupt' });
    await neuLaden('Sicherung geladen');
  }

  /* ================= Öffentliche Aktionen ================= */
  window.NB = {
    neu: () => buchungBearbeiten(),
    rechnungenImport,
    bankImport,
    fahrt: () => fahrtErfassen(),
    belege: () => belegeStapel(),
    zwischenbilanz: () => { Z.jahr = String(new Date().getFullYear()); Z.stichtag = heute(); Z.ansicht = 'abschluss'; zeichnen(); window.scrollTo(0, 0); },
    mitarbeiter: () => mitarbeiterBearbeiten(),
    lohnBuchen: () => lohnBuchen(),
    lohnzettel: (id) => lohnzettel(id),
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
    // Sprungziele aus Suche und Anleitung: ?ansicht=loehne, ?aktion=fahrt …
    const q = new URLSearchParams(location.search);
    if (q.get('ansicht') && ANSICHTEN.some(([id]) => id === q.get('ansicht'))) Z.ansicht = q.get('ansicht');
    zeichnen();
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
    if ('serviceWorker' in navigator && location.protocol !== 'file:') navigator.serviceWorker.register('sw.js').catch(() => {});
  })();
})();

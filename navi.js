// Gemeinsames Menü für Admin, Offerten, Rechnungen und Buchhaltung.
// Ein Knopf mit zwei Strichen öffnet links eine Seitenleiste, von der aus man zwischen allen Bereichen wechselt.
// Dazu eine einheitliche Kopfzeile: Menü-Knopf, Logo und Bereich links, die Knöpfe des Bereichs rechts.
// Einbinden: <script src="navi.js" data-hier="rechnungen" data-titel="Rechnungen" data-rechts="#kopfRechts"></script>
//   data-hier       welcher Bereich gerade offen ist (wird hervorgehoben)
//   data-titel      Name des Bereichs in der Kopfzeile
//   data-rechts     Element, dessen Inhalt rechts in die Kopfzeile wandert (optional)
//   data-kopf-in    Element, an dessen Anfang die Kopfzeile kommt (sonst ganz oben im body)
// Die Seite kann eigene Knöpfe rechts anfügen: NasuviaNavi.rechts(element)
// Elemente mit der Klasse nv-weg werden ausgeblendet, sobald die Kopfzeile da ist.
(function(){
  var skript = document.currentScript || {}, ds = skript.dataset || {};
  var MARKE = 'Nasuvia';
  var BEREICHE = [
    { id: 'admin', name: 'Anfragen', text: 'Admin, Anfragen von der Website', href: 'https://www.nasuvia.ch/admin/',
      icon: '<rect x="4" y="4" width="7" height="7" rx="1.5"/><rect x="13" y="4" width="7" height="7" rx="1.5"/><rect x="4" y="13" width="7" height="7" rx="1.5"/><rect x="13" y="13" width="7" height="7" rx="1.5"/>' },
    { id: 'offerten', name: 'Offerten', text: 'Erstellen, ablegen, senden', href: 'https://www.nasuvia.ch/admin/offerten/',
      icon: '<path d="M6 3h9l4 4v14H6z"/><path d="M14 3v5h5M9 12h6M9 16h3"/><path d="m14.5 16.5 1.5 1.5 3-3"/>' },
    { id: 'rechnungen', name: 'Rechnungen', text: 'Schreiben und versenden', href: 'https://www.nasuvia.ch/buchhaltung/rechnungen/',
      icon: '<path d="M6 3h9l4 4v14H6z"/><path d="M14 3v5h5M9 13h7M9 17h5"/>' },
    { id: 'buchhaltung', name: 'Buchhaltung', text: 'Einnahmen, Ausgaben, MWST', href: 'https://www.nasuvia.ch/buchhaltung/',
      icon: '<path d="M4 19V5a2 2 0 0 1 2-2h13v16H6a2 2 0 0 0-2 2 2 2 0 0 0 2 2h13"/><path d="M9 8h6M9 12h4"/>' }
  ];
  var WEBSITE = { name: 'Website', text: 'www.nasuvia.ch', href: 'https://www.nasuvia.ch/' };
  var PRODUKT = !!(window.NASUVIA_KONFIG && window.NASUVIA_KONFIG.produkt);
  var WURZEL = (function(){ try { return new URL('.', skript.src).href; } catch (e) { return '/'; } })();
  if (PRODUKT) {
    MARKE = 'Ordasio';
    BEREICHE = [
      { id: 'start', name: 'Start', text: 'Ihre Aufgaben und ersten Schritte', href: WURZEL + 'start/', icon: '<path d="M3 11 12 4l9 7"/><path d="M5 10v10h14V10"/>' },
      { id: 'buchhaltung', name: 'Buchhaltung', text: 'Einnahmen, Ausgaben, MWST, Löhne', href: WURZEL + '?bereich=buchhaltung', icon: BEREICHE[3].icon },
      { id: 'rechnungen', name: 'Rechnungen', text: 'Rechnungen, Offerten, Mahnungen', href: WURZEL + 'rechnungen/', icon: BEREICHE[2].icon },
      { id: 'zeit', name: 'Zeiterfassung', text: 'Stunden, Einsatzplan, Rapporte', href: WURZEL + 'zeit/', icon: '<circle cx="12" cy="13" r="8"/><path d="M12 9v4l2.5 2.5M9 2h6"/>' },
      { id: 'termine', name: 'Termine', text: 'Online-Buchung für Kunden', href: WURZEL + 'termine/', icon: '<rect x="3" y="4" width="18" height="17" rx="2"/><path d="M3 9h18M8 2v4M16 2v4M8 14h3"/>' },
      { id: 'lager', name: 'Lager', text: 'Material, Bestand, Nachbestellen', href: WURZEL + 'lager/', icon: '<path d="M3 8 12 3l9 5v8l-9 5-9-5z"/><path d="M3 8l9 5 9-5M12 13v8"/>' },
      { id: 'ablage', name: 'Firmenablage', text: 'Ordner, Personal, Mitteilungen', href: WURZEL + 'ablage/', icon: '<path d="M3 7a2 2 0 0 1 2-2h4l2 2h8a2 2 0 0 1 2 2v9a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/>' },
      { id: 'vorlagen', name: 'Vorlagen', text: 'Rapporte, Zeugnis, Kündigung, Quittung', href: WURZEL + 'vorlagen/', icon: '<path d="M6 3h9l4 4v14H6z"/><path d="M14 3v5h5M9 13h7M9 17h5"/>' },
      { id: 'privat', name: 'Home-Büro', text: 'Privat: Konto, Abos, Rechnungen', href: WURZEL + 'privat/', icon: '<path d="M3 11 12 4l9 7"/><path d="M5 10v10h14V10"/><path d="M10 20v-5h4v5"/>' },
      { id: 'hilfe', name: 'Anleitung', text: 'Schritt für Schritt, mit Suche', href: WURZEL + 'hilfe/', icon: '<circle cx="12" cy="12" r="9"/><path d="M9.5 9a2.5 2.5 0 1 1 3.5 2.3c-.6.3-1 .9-1 1.6V14"/><path d="M12 17h.01"/>' }
    ];
    WEBSITE = { id: 'lizenz', name: 'Lizenz und Konto', text: 'Paket, Stand, bestellen', href: WURZEL + 'lizenz/' };
    // Nur die Bereiche zeigen, die beim Start gewählt wurden (Start, Anleitung und der aktuelle Bereich immer)
    try {
      const gewaehlt = JSON.parse(localStorage.getItem('ordasio.bereiche') || 'null');
      if (Array.isArray(gewaehlt) && gewaehlt.length) {
        const alle = BEREICHE.length;
        BEREICHE = BEREICHE.filter((b) => ['start', 'hilfe'].includes(b.id) || gewaehlt.includes(b.id) || b.id === (ds.hier || ''));
        if (BEREICHE.length < alle) BEREICHE.push({ id: 'mehr', name: 'Bereiche anpassen', text: `${alle - BEREICHE.length} weitere ausgeblendet`, href: WURZEL + 'start/?anpassen=1', icon: '<circle cx="12" cy="12" r="3"/><path d="M12 2v3M12 19v3M2 12h3M19 12h3M4.9 4.9l2.1 2.1M17 17l2.1 2.1M4.9 19.1 7 17M17 7l2.1-2.1"/>' });
      }
    } catch (e) { /* ohne Speicher: alle Bereiche */ }
    // Nur Bereiche des eigenen Pakets (Home-Büro allein braucht keine Firmenbereiche)
    try {
      const lz = window.NASUVIA_LIZENZ || JSON.parse(localStorage.getItem('ordasio.lizenz') || 'null');
      const O = window.ORDASIO;
      if (lz && lz.paket === 'privat') BEREICHE = BEREICHE.filter((b) => ['privat', 'hilfe'].includes(b.id));
      else if (lz && O && O.paket && O.paket(lz.paket)) BEREICHE = BEREICHE.filter((b) => ['start', 'hilfe', 'vorlagen', 'mehr'].includes(b.id) || O.darf(lz.paket, b.id));
    } catch (e) { /* ohne Lizenz: alle */ }
  }
  var hier = ds.hier || '';

  var stil = document.createElement('style');
  stil.textContent = [
    '.nv-knopf{display:inline-grid;place-items:center;gap:6px;grid-auto-flow:column;height:40px;min-width:40px;padding:0 10px;border:0;border-radius:100px;background:#fff;color:#0B3B2E;cursor:pointer;font:600 .92rem inherit;font-family:inherit;box-shadow:0 1px 2px rgba(12,18,38,.06),0 8px 22px -12px rgba(11,59,46,.45);transition:transform .25s cubic-bezier(.3,1.5,.5,1),box-shadow .25s;flex:none;-webkit-tap-highlight-color:transparent}',
    '.nv-knopf:hover{transform:translateY(-1px);box-shadow:0 1px 2px rgba(12,18,38,.06),0 12px 26px -12px rgba(11,59,46,.55)}',
    '.nv-knopf:active{transform:scale(.94)}',
    '.nv-knopf svg{width:20px;height:20px;fill:none;stroke:currentColor;stroke-width:2.2;stroke-linecap:round}',
    '.nv-knopf svg path{transition:transform .35s cubic-bezier(.3,1.4,.5,1)}',
    '.nv-knopf:hover svg .nv-zwei{transform:translateX(3px)}',
    '.nv-schwebend{position:fixed;top:max(12px,env(safe-area-inset-top));right:14px;z-index:60}',
    '@media (min-width:821px){.nv-schwebend.nv-mobil{display:none}}',
    // Keine Trennlinie: oben durchsichtig, erst beim Scrollen ein ruhiger Hintergrund (ohne Rand und ohne Schatten)
    '.nv-kopfzeile{position:sticky;top:0;z-index:50;height:64px;background:transparent;border:0;box-shadow:none;transition:background .25s;font-family:"League Spartan",-apple-system,system-ui,sans-serif}',
    '.nv-kopfzeile.nv-gerollt{background:rgba(244,250,246,.94);backdrop-filter:blur(14px);-webkit-backdrop-filter:blur(14px)}',
    '.nv-app{gap:10px!important;padding:4px 10px 4px 2px!important}',
    '.nv-app-ic{width:34px;height:34px;border-radius:10px;background:linear-gradient(160deg,#2E6B55,#0B3B2E);display:grid;place-items:center;flex:none;box-shadow:0 6px 14px -8px rgba(11,59,46,.8)}',
    '.nv-app-ic svg{width:19px;height:19px;fill:none;stroke:#fff;stroke-width:2;stroke-linecap:round;stroke-linejoin:round}',
    '.nv-app-name{font-weight:700;font-size:1.22rem;color:#0A1F17;letter-spacing:-.01em;line-height:1}',
    '.nv-kz{height:64px;display:flex;align-items:center;gap:12px;padding:0 clamp(14px,3vw,28px)}',
    '.nv-logo{display:inline-flex;align-items:center;gap:5px;text-decoration:none;padding:6px 8px 6px 4px;border-radius:100px}',
    '.nv-logo i{width:15px;height:15px;border-radius:50%;background:#0B3B2E;flex:none}',
    '.nv-logo img{height:18px;width:auto;display:block}',
    '.nv-logo,.nv-bereich{white-space:nowrap;flex:none}','.nv-bereich{font-family:"JetBrains Mono",ui-monospace,monospace;font-size:.68rem;font-weight:500;letter-spacing:.12em;text-transform:uppercase;line-height:1;background:#E8F4EE;color:#0B3B2E;border-radius:100px;padding:6px 10px}',
    '.nv-rechts{margin-left:auto;display:flex;gap:4px;align-items:center}',
    '.nv-rechts button,.nv-rechts a{display:inline-flex;align-items:center;gap:7px;height:40px;margin:0;padding:0 14px;border:0;border-radius:100px;background:none;box-shadow:none;color:#0A1F17;font:500 .95rem "League Spartan",-apple-system,system-ui,sans-serif;text-decoration:none;white-space:nowrap;cursor:pointer;transition:background .2s}',
    '.nv-rechts button:hover,.nv-rechts a:hover{background:#E8F4EE}',
    '.nv-rechts svg{width:17px;height:17px;fill:none;stroke:currentColor;stroke-width:2;stroke-linecap:round;stroke-linejoin:round}',
    '.nv-mit-kopf .nv-weg{display:none!important}',
    '.nv-umzug{display:flex;flex-wrap:wrap;align-items:center;justify-content:center;gap:4px 10px;padding:10px 16px;background:#0B3B2E;color:#fff;text-decoration:none;font:500 .92rem "League Spartan",-apple-system,system-ui,sans-serif;text-align:center}',
    '.nv-umzug span{color:#6EE7A8;font-weight:600}',
    '@media (max-width:520px){.nv-bereich{display:none}.nv-rechts button,.nv-rechts a{padding:0 10px}}',
    '.nv-hinten{position:fixed;inset:0;z-index:9998;background:rgba(12,18,38,.32);backdrop-filter:blur(5px);-webkit-backdrop-filter:blur(5px);opacity:0;visibility:hidden;transition:opacity .3s,visibility .3s}',
    '.nv-leiste{position:fixed;top:0;bottom:0;left:0;z-index:9999;width:min(320px,86vw);background:#F4FAF6;border-radius:0 26px 26px 0;box-shadow:none;transform:translateX(-104%);visibility:hidden;transition:transform .42s cubic-bezier(.2,.9,.3,1),box-shadow .42s,visibility 0s .42s;display:flex;flex-direction:column;padding:max(18px,env(safe-area-inset-top)) 16px max(18px,env(safe-area-inset-bottom));font-family:inherit;color:#0A1F17;overflow-y:auto}',
    '.nv-offen .nv-hinten{opacity:1;visibility:visible}',
    '.nv-offen .nv-leiste{transform:none;visibility:visible;box-shadow:30px 0 80px -30px rgba(12,18,38,.5);transition:transform .42s cubic-bezier(.2,.9,.3,1),box-shadow .42s,visibility 0s}',
    '.nv-kopf{display:flex;align-items:center;justify-content:space-between;padding:4px 4px 18px}',
    '.nv-marke{display:flex;align-items:center;gap:7px;font-weight:700;font-size:1.25rem;letter-spacing:-.02em;color:#0A1F17}',
    '.nv-marke i{width:15px;height:15px;border-radius:50%;background:#0B3B2E;box-shadow:0 0 0 4px rgba(14,122,85,.14)}',
    '.nv-zu{width:38px;height:38px;border:0;border-radius:50%;background:#E8F4EE;color:#0B3B2E;cursor:pointer;display:grid;place-items:center}',
    '.nv-zu svg{width:18px;height:18px;fill:none;stroke:currentColor;stroke-width:2.2;stroke-linecap:round}',
    '.nv-titel{font-family:ui-monospace,"JetBrains Mono",monospace;font-size:.66rem;letter-spacing:.16em;text-transform:uppercase;color:#8A90A3;margin:8px 8px 8px}',
    '.nv-ziel{display:flex;align-items:center;gap:12px;padding:11px 12px;border-radius:16px;text-decoration:none;color:#0A1F17;transition:background .2s,transform .25s cubic-bezier(.3,1.5,.5,1);opacity:0;transform:translateX(-14px)}',
    '.nv-offen .nv-ziel{opacity:1;transform:none;transition:background .2s,opacity .35s,transform .45s cubic-bezier(.2,.9,.3,1)}',
    '.nv-ziel:hover{background:rgba(14,122,85,.07)}',
    '.nv-ziel .nv-ic{width:42px;height:42px;border-radius:13px;flex:none;display:grid;place-items:center;background:linear-gradient(135deg,rgba(14,122,85,.14),rgba(110,231,168,.2));color:#0B3B2E}',
    '.nv-ziel .nv-ic svg{width:21px;height:21px;fill:none;stroke:currentColor;stroke-width:1.8;stroke-linecap:round;stroke-linejoin:round}',
    '.nv-ziel b{display:block;font-size:1.02rem;line-height:1.2}',
    '.nv-ziel small{display:block;font-size:.8rem;color:#3F5A4F;line-height:1.3;margin-top:2px}',
    '.nv-ziel.nv-hier{background:#fff;box-shadow:0 1px 2px rgba(12,18,38,.04),0 16px 34px -22px rgba(11,59,46,.45)}',
    '.nv-ziel.nv-hier .nv-ic{background:#0E7A55;color:#fff}',
    '.nv-ziel em{margin-left:auto;font-style:normal;font-family:ui-monospace,"JetBrains Mono",monospace;font-size:.6rem;letter-spacing:.12em;text-transform:uppercase;color:#0E7A55;background:rgba(14,122,85,.1);border-radius:100px;padding:3px 8px}',
    '.nv-ziel .nv-pfeil{margin-left:auto;color:#0E7A55}',
    '.nv-trenner{height:1px;background:rgba(11,59,46,.1);margin:12px 8px}',
    '.nv-fuss{margin-top:auto;padding:16px 8px 0;font-size:.78rem;color:#8A90A3}',
    'html.nv-sperre,html.nv-sperre body{overflow:hidden}'
  ].join('\n');
  document.head.appendChild(stil);

  var svg = function(inhalt){ return '<svg viewBox="0 0 24 24" aria-hidden="true">' + inhalt + '</svg>'; };
  var huelle = document.createElement('div');
  huelle.className = 'nv';
  huelle.innerHTML = '<div class="nv-hinten" data-nv-zu></div>' +
    '<nav class="nv-leiste" aria-label="Bereiche" aria-hidden="true">' +
      '<div class="nv-kopf"><span class="nv-marke">' + (PRODUKT ? '<img src="' + WURZEL + 'ordasio-zeichen.svg" alt="" style="width:22px;height:22px;display:block">' : '<i></i>') + MARKE + '</span><button class="nv-zu" type="button" data-nv-zu aria-label="Menü schliessen">' + svg('<path d="M6 6l12 12M18 6 6 18"/>') + '</button></div>' +
      '<p class="nv-titel">Bereiche</p>' +
      BEREICHE.map(function(b, i){
        return '<a class="nv-ziel' + (b.id === hier ? ' nv-hier' : '') + '" href="' + b.href + '" style="transition-delay:' + (60 + i * 45) + 'ms">' +
          '<span class="nv-ic">' + svg(b.icon) + '</span><span><b>' + b.name + '</b><small>' + b.text + '</small></span>' + (b.id === hier ? '<em>Hier</em>' : '') + '</a>';
      }).join('') +
      '<div class="nv-trenner"></div>' +
      '<a class="nv-ziel' + (WEBSITE.id && WEBSITE.id === hier ? ' nv-hier' : '') + '" href="' + WEBSITE.href + '"' + (PRODUKT ? '' : ' target="_blank" rel="noopener"') + ' style="transition-delay:' + (60 + BEREICHE.length * 45) + 'ms"><span class="nv-ic">' + svg('<circle cx="12" cy="12" r="9"/><path d="M3 12h18M12 3a14 14 0 0 1 0 18M12 3a14 14 0 0 0 0 18"/>') + '</span><span><b>' + WEBSITE.name + '</b><small>' + WEBSITE.text + '</small></span><span class="nv-pfeil">↗</span></a>' +
      (PRODUKT ? '<button type="button" class="nv-ziel" data-nv-erinnerung style="border:0;background:none;width:100%;text-align:left;font:inherit;cursor:pointer;transition-delay:' + (80 + BEREICHE.length * 45) + 'ms"><span class="nv-ic">' + svg('<path d="M6 8a6 6 0 0 1 12 0c0 7 3 8 3 8H3s3-1 3-8"/><path d="M10.3 20a1.9 1.9 0 0 0 3.4 0"/>') + '</span><span><b>Erinnerungen</b><small>Und Kalender aufs Handy</small></span></button>' : '') +
      (PRODUKT ? '<button type="button" class="nv-ziel" data-nv-darstellung style="border:0;background:none;width:100%;text-align:left;font:inherit;cursor:pointer;transition-delay:' + (100 + BEREICHE.length * 45) + 'ms"><span class="nv-ic">' + svg('<circle cx="12" cy="12" r="9"/><path d="M12 3a9 9 0 0 0 0 18c1.2 0 2-.8 2-1.8 0-1.4-1.6-1.6-1.6-3 0-1 .8-1.7 1.8-1.7H17a4 4 0 0 0 4-4C21 6.6 17 3 12 3z"/><circle cx="7.5" cy="11" r="1"/><circle cx="10" cy="7.5" r="1"/><circle cx="15" cy="7.5" r="1"/>') + '</span><span><b>Darstellung</b><small>Hintergrund, Farben, Schrift</small></span></button>' : '') +
      '<p class="nv-fuss">Ordasio · Daten sicher in der Schweiz</p>' +
    '</nav>';

  var offen = false;
  function oeffnen(){
    if (!huelle.isConnected) document.body.appendChild(huelle);
    offen = true;
    requestAnimationFrame(function(){ huelle.classList.add('nv-offen'); });
    huelle.querySelector('.nv-leiste').setAttribute('aria-hidden', 'false');
    document.documentElement.classList.add('nv-sperre');
    setTimeout(function(){ var z = huelle.querySelector('.nv-hier') || huelle.querySelector('.nv-ziel'); z && z.focus({ preventScroll: true }); }, 200);
  }
  function schliessen(){
    offen = false;
    huelle.classList.remove('nv-offen');
    huelle.querySelector('.nv-leiste').setAttribute('aria-hidden', 'true');
    document.documentElement.classList.remove('nv-sperre');
  }
  huelle.addEventListener('click', function(e){
    if (e.target.closest('[data-nv-zu]')) { schliessen(); return; }
    if (e.target.closest('[data-nv-erinnerung]')) { schliessen(); if (window.Erinnerungen) Erinnerungen.dialog(); return; }
    if (e.target.closest('[data-nv-darstellung]')) { schliessen(); if (window.UI && UI.darstellung) UI.darstellung(); return; }
    var a = e.target.closest('a.nv-hier'); if (a) { e.preventDefault(); schliessen(); }
  });
  document.addEventListener('keydown', function(e){ if (e.key === 'Escape' && offen) schliessen(); });
  // Mit dem Finger nach links wischen schliesst die Leiste
  var startX = null;
  huelle.addEventListener('touchstart', function(e){ startX = e.touches[0].clientX; }, { passive: true });
  huelle.addEventListener('touchend', function(e){ if (startX != null && e.changedTouches[0].clientX - startX < -60) schliessen(); startX = null; }, { passive: true });

  function knopf(text){
    var b = document.createElement('button');
    b.type = 'button';
    b.className = 'nv-knopf';
    b.setAttribute('aria-label', 'Menü öffnen');
    b.innerHTML = svg('<path d="M4 9h16"/><path class="nv-zwei" d="M4 15h10"/>') + (text ? '<span>' + text + '</span>' : '');
    b.addEventListener('click', oeffnen);
    return b;
  }
  window.NasuviaNavi = { knopf: knopf, oeffnen: oeffnen, schliessen: schliessen };

  // Kopfzeile
  var kopfzeile = document.createElement('header'), rechtsSlot = document.createElement('div');
  kopfzeile.className = 'nv-kopfzeile';
  rechtsSlot.className = 'nv-rechts';
  function rechts(el){ rechtsSlot.appendChild(el); return el; }
  window.NasuviaNavi.rechts = rechts;

  function einbauen(){
    document.body.appendChild(huelle);
    if (ds.titel) {
      var kz = document.createElement('div'); kz.className = 'nv-kz';
      kz.appendChild(knopf());
      var bIcon = (BEREICHE.filter(function(b){ return b.id === hier; })[0] || {}).icon || '<path d="M3 11 12 4l9 7"/><path d="M5 10v10h14V10"/>';
      kz.insertAdjacentHTML('beforeend', (PRODUKT ? '<a class="nv-logo nv-app" href="' + WURZEL + 'start/" aria-label="Zur Startseite"><span class="nv-app-ic"><svg viewBox="0 0 24 24">' + bIcon + '</svg></span><span class="nv-app-name">' + ds.titel + '</span></a>' : '<a class="nv-logo" href="https://www.nasuvia.ch/admin/" aria-label="Nasuvia Admin"><i></i><img src="https://www.nasuvia.ch/logo-wort.png" alt="Nasuvia" width="94" height="18"></a>') + (PRODUKT ? '' : '<span class="nv-bereich">' + ds.titel + '</span>'));
      kz.appendChild(rechtsSlot);
      kopfzeile.appendChild(kz);
      if (ds.rechts) { var quelle = document.querySelector(ds.rechts); if (quelle) { while (quelle.firstChild) rechtsSlot.appendChild(quelle.firstChild); quelle.remove(); } }
      var ort = ds.kopfIn ? document.querySelector(ds.kopfIn) : document.body;
      ort.insertBefore(kopfzeile, ort.firstChild);
      document.body.classList.add('nv-mit-kopf');
      var rollen = function(){ kopfzeile.classList.toggle('nv-gerollt', (window.scrollY || document.documentElement.scrollTop) > 4); };
      window.addEventListener('scroll', rollen, { passive: true }); rollen();
    }
    // Alte Adresse: Hinweis auf die neue unter nasuvia.ch
    if (/github\.io$/.test(location.hostname) && /nasuvia-buchhaltung/.test(location.pathname)) {
      var neu = 'https://www.nasuvia.ch/buchhaltung/' + location.pathname.replace(/^.*nasuvia-buchhaltung\//, '');
      var h = document.createElement('a');
      h.href = neu; h.className = 'nv-umzug';
      h.innerHTML = '<b>Neue Adresse:</b> www.nasuvia.ch/buchhaltung <span>Jetzt öffnen →</span>';
      document.body.insertBefore(h, document.body.firstChild);
    }
    if (ds.einfuegen) [].forEach.call(document.querySelectorAll(ds.einfuegen), function(z){ z.insertBefore(knopf(), z.firstChild); });
    if (ds.schwebend) {
      var s = knopf();
      s.classList.add('nv-schwebend');
      if (ds.schwebend === 'mobil') s.classList.add('nv-mobil');
      document.body.appendChild(s);
    }
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', einbauen); else einbauen();
})();

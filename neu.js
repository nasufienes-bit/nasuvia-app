/* Ordasio – «+ Neu» im Kopf (wie Stripe «Create» oder Linear), Tastenkürzel und Offline-Hinweis.
   Wird von navi.js auf jeder App-Seite geladen.
   - Knopf «+ Neu»: Rechnung, Offerte, Ausgabe, Belege, Termin, Mitarbeiter, Projekt, Artikel, Erinnerung (nur was die Lizenz erlaubt)
   - Zielseite mit ?neu=…: der passende «Neu»-Knopf wird automatisch gedrückt
   - Tasten: N = Neu, / = Suchen, ? = Kürzel, G + Buchstabe = Bereich wechseln, Esc = schliessen */
(function () {
  'use strict';
  if (window.OrdasioNeu) return;
  var K = window.NASUVIA_KONFIG || {};
  if (!K.produkt) return;
  var skript = document.currentScript;
  var W = (function () { try { return new URL('.', skript.src).href; } catch (e) { return '/'; } })();
  var esc = function (s) { return String(s == null ? '' : s).replace(/[&<>"]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]; }); };
  var P = function (d) { return '<svg viewBox="0 0 24 24" aria-hidden="true">' + d + '</svg>'; };
  var IC = {
    rechnung: P('<path d="M6 3h9l4 4v14H6z"/><path d="M14 3v5h5M9 13h7M9 17h5"/>'),
    offerte: P('<path d="M6 3h9l4 4v14H6z"/><path d="M14 3v5h5M9 12h6M9 16h3"/><path d="m14.5 16.5 1.5 1.5 3-3"/>'),
    buchung: P('<path d="M12 5v14M5 12h14"/>'),
    beleg: P('<path d="M4 7h3l2-3h6l2 3h3a1 1 0 0 1 1 1v11a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1V8a1 1 0 0 1 1-1z"/><circle cx="12" cy="13" r="4"/>'),
    termin: P('<rect x="3" y="4" width="18" height="17" rx="2"/><path d="M3 9h18M8 2v4M16 2v4M12 13v4M10 15h4"/>'),
    mitarbeiter: P('<circle cx="9" cy="8" r="3.5"/><path d="M2.5 20a6.5 6.5 0 0 1 13 0"/><path d="M19 8v6M16 11h6"/>'),
    projekt: P('<path d="M3 7a2 2 0 0 1 2-2h4l2 2h8a2 2 0 0 1 2 2v9a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><path d="M12 11v5M9.5 13.5h5"/>'),
    artikel: P('<path d="M21 8 12 3 3 8v8l9 5 9-5z"/><path d="M3 8l9 5 9-5M12 13v8"/>'),
    erinnerung: P('<path d="M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9"/><path d="M10.3 21a1.94 1.94 0 0 0 3.4 0"/>'),
    plus: P('<path d="M12 5v14M5 12h14"/>'),
  };
  var AKTIONEN = [
    { id: 'rechnung', bereich: 'rechnungen', name: 'Rechnung', text: 'Mit QR-Zahlteil, als PDF oder per E-Mail', href: 'rechnungen/?neu=rechnung', taste: 'R' },
    { id: 'offerte', bereich: 'rechnungen', name: 'Offerte', text: 'Später mit einem Klick zur Rechnung', href: 'rechnungen/?neu=offerte', taste: 'O' },
    { id: 'buchung', bereich: 'buchhaltung', name: 'Ausgabe oder Einnahme', text: 'Buchung erfassen, MWST wird gerechnet', href: '?bereich=buchhaltung&aktion=neu', taste: 'A' },
    { id: 'beleg', bereich: 'buchhaltung', name: 'Belege hochladen', text: 'Foto oder PDF, wird automatisch gelesen', href: '?bereich=buchhaltung&aktion=belege', taste: 'B' },
    { id: 'termin', bereich: 'termine', name: 'Termin', text: 'Im Kalender und auf dem Handy', href: 'termine/?neu=termin', taste: 'T' },
    { id: 'mitarbeiter', bereich: 'zeit', name: 'Mitarbeiter', text: 'Mit persönlichem Handy-Link', href: 'zeit/?tab=mitarbeiter&neu=mitarbeiter', taste: 'M' },
    { id: 'projekt', bereich: 'projekte', name: 'Projekt', text: 'Stunden, Material und Kosten pro Auftrag', href: 'projekte/?neu=projekt', taste: 'P' },
    { id: 'artikel', bereich: 'lager', name: 'Artikel', text: 'Mit Bestand und Mindestmenge', href: 'lager/?neu=artikel', taste: 'L' },
    { id: 'privatrechnung', bereich: 'privat', name: 'Rechnung erfassen', text: 'Foto machen, Frist wird erkannt', href: 'privat/?neu=rechnung', taste: 'R', icon: 'rechnung' },
    { id: 'erinnerung', bereich: '', name: 'Erinnerung', text: 'Ordi trägt sie ein, auch im Handy-Kalender', ordi: 'Erinnere mich ', taste: 'E' },
  ];
  // Was zeigen? Nur Bereiche, die die Lizenz erlaubt
  function lizenz() { if (window.NASUVIA_LIZENZ) return window.NASUVIA_LIZENZ; try { return JSON.parse(localStorage.getItem('ordasio.lizenz') || 'null'); } catch (e) { return null; } }
  function erlaubt() {
    var l = lizenz(), O = window.ORDASIO;
    if (l && l.paket === 'privat') return AKTIONEN.filter(function (a) { return a.bereich === 'privat' || !a.bereich; });
    return AKTIONEN.filter(function (a) {
      if (a.bereich === 'privat') return false;
      if (!a.bereich) return true;
      if (!l || !O || !O.darf) return ['rechnungen', 'buchhaltung'].indexOf(a.bereich) >= 0;
      try { return O.darf(l, a.bereich); } catch (e) { return true; }
    });
  }

  var css = document.createElement('style');
  css.textContent =
    'body button.nu-knopf{display:inline-flex;align-items:center;gap:6px;height:40px;padding:0 15px 0 12px!important;border:0!important;border-radius:100px!important;background:var(--blau,#0B3B2E)!important;color:#fff!important;font:inherit;font-size:14px;font-weight:700;cursor:pointer;flex-shrink:0;box-shadow:0 6px 16px -10px rgba(11,59,46,.7)!important}' +
    '.nu-knopf svg{width:18px;height:18px;fill:none;stroke:currentColor;stroke-width:2.4;stroke-linecap:round}' +
    '.nu-knopf:hover{filter:brightness(1.12)}' +
    '@media(max-width:640px){body button.nu-knopf{width:40px;padding:0!important;justify-content:center}.nu-knopf span{display:none}body button.nu-knopf.nu-handy-weg{display:none!important}}' +
    '.kopfzeile .marke i,.nv-kopf .marke i{flex-shrink:0}' +
    '.nu-menue{position:fixed;z-index:9600;width:min(360px,calc(100vw - 20px));background:var(--karte,#fff);border:1px solid color-mix(in srgb,var(--blau,#0B3B2E) 10%,transparent);border-radius:18px;box-shadow:0 24px 60px -20px rgba(12,18,38,.45);padding:8px;animation:nuEin .14s ease-out}' +
    '@keyframes nuEin{from{opacity:0;transform:translateY(-6px) scale(.98)}to{opacity:1;transform:none}}' +
    '.nu-menue h4{margin:6px 10px 6px;font:600 10.5px/1 var(--mono,ui-monospace,monospace);letter-spacing:.14em;text-transform:uppercase;color:var(--leise,#7C8499)}' +
    '.nu-eintrag{display:grid;grid-template-columns:36px 1fr auto;gap:0 12px;align-items:center;width:100%;border:0;background:none;padding:8px 10px;border-radius:12px;cursor:pointer;text-align:left;font:inherit;color:var(--tinte,#0A1F17);text-decoration:none}' +
    '.nu-eintrag:hover,.nu-eintrag.an{background:color-mix(in srgb,var(--blau,#0B3B2E) 6%,transparent)}' +
    '.nu-eintrag i{width:36px;height:36px;border-radius:11px;display:grid;place-items:center;background:color-mix(in srgb,var(--elektrik,#0E7A55) 11%,transparent);color:var(--elektrik,#0E7A55)}' +
    '.nu-eintrag i svg{width:18px;height:18px;fill:none;stroke:currentColor;stroke-width:1.9;stroke-linecap:round;stroke-linejoin:round}' +
    '.nu-eintrag b{display:block;font-size:14.5px}.nu-eintrag small{display:block;font-size:12.5px;color:var(--leise,#7C8499);line-height:1.35}' +
    '.nu-eintrag kbd,.nu-kuerzel kbd{font:600 11px/1 var(--mono,ui-monospace,monospace);padding:4px 6px;border-radius:6px;background:color-mix(in srgb,var(--blau,#0B3B2E) 7%,transparent);color:var(--text,#3F5A4F)}' +
    '.nu-fuss{display:flex;justify-content:space-between;align-items:center;padding:8px 10px 4px;border-top:1px solid color-mix(in srgb,var(--blau,#0B3B2E) 8%,transparent);margin-top:6px;font-size:12px;color:var(--leise,#7C8499)}' +
    '.nu-fuss button{border:0;background:none;color:var(--elektrik,#0E7A55);font:inherit;font-weight:600;cursor:pointer;padding:0}' +
    '.nu-decke{position:fixed;inset:0;z-index:9590;background:transparent}' +
    '@media(max-width:640px){.nu-eintrag kbd,.nu-fuss{display:none}.nu-eintrag{grid-template-columns:36px 1fr}.nu-decke{background:rgba(10,31,23,.25)}.nu-menue{left:10px!important;right:10px;width:auto;top:auto!important;bottom:calc(10px + env(safe-area-inset-bottom,0px));max-height:75vh;overflow:auto}}' +
    '.nu-kuerzel{position:fixed;inset:0;z-index:9700;display:grid;place-items:center;background:rgba(10,31,23,.35);padding:16px}' +
    '.nu-kuerzel>div{background:var(--karte,#fff);border-radius:20px;padding:22px 24px;width:min(460px,100%);box-shadow:0 30px 80px -30px rgba(0,0,0,.5);max-height:85vh;overflow:auto}' +
    '.nu-kuerzel h3{margin:0 0 12px;font-size:19px}.nu-kuerzel table{width:100%;border-collapse:collapse;font-size:14px}.nu-kuerzel td{padding:7px 0;border-bottom:1px solid color-mix(in srgb,var(--blau,#0B3B2E) 8%,transparent)}.nu-kuerzel td:last-child{text-align:right;white-space:nowrap}' +
    '.nu-offline{position:fixed;left:50%;bottom:calc(84px + env(safe-area-inset-bottom,0px));transform:translateX(-50%);z-index:9550;background:#0A1F17;color:#fff;border-radius:100px;padding:10px 16px;font-size:13.5px;font-weight:600;box-shadow:0 12px 30px -12px rgba(0,0,0,.5);display:flex;gap:8px;align-items:center;max-width:calc(100vw - 24px)}' +
    '.nu-offline i{width:8px;height:8px;border-radius:50%;background:#F5B53D;flex:none}' +
    '@media(min-width:821px){.nu-offline{bottom:24px}}';
  document.head.appendChild(css);

  /* ---------- Menü ---------- */
  var offen = null, auswahl = 0;
  function zu() { if (!offen) return; offen.decke.remove(); offen.menue.remove(); offen = null; }
  function ausfuehren(a) {
    zu();
    if (a.ordi) { if (window.Ordi && Ordi.vorschlag) Ordi.vorschlag(a.ordi); else if (window.Ordi && Ordi.oeffnen) Ordi.oeffnen(); return; }
    location.href = W + a.href;
  }
  function oeffnen(knopf) {
    if (offen) { zu(); return; }
    var liste = erlaubt();
    var decke = document.createElement('div'); decke.className = 'nu-decke';
    var menue = document.createElement('div'); menue.className = 'nu-menue'; menue.setAttribute('role', 'menu');
    menue.innerHTML = '<h4>Neu erstellen</h4>' + liste.map(function (a, i) {
      return '<button type="button" class="nu-eintrag' + (i === 0 ? ' an' : '') + '" role="menuitem" data-nu="' + a.id + '"><i>' + (IC[a.icon || a.id] || IC.plus) + '</i><span><b>' + esc(a.name) + '</b><small>' + esc(a.text) + '</small></span><kbd>' + a.taste + '</kbd></button>';
    }).join('') + '<div class="nu-fuss"><span>Taste <kbd>N</kbd> öffnet dieses Menü</span><button type="button" data-nu-kuerzel>Alle Tastenkürzel</button></div>';
    document.body.appendChild(decke); document.body.appendChild(menue);
    var r = (knopf || document.querySelector('.nu-knopf') || document.body).getBoundingClientRect();
    menue.style.top = Math.round(r.bottom + 8) + 'px';
    menue.style.left = Math.round(Math.max(10, Math.min(window.innerWidth - menue.offsetWidth - 10, r.right - menue.offsetWidth))) + 'px';
    offen = { decke: decke, menue: menue, liste: liste }; auswahl = 0;
    decke.onclick = zu;
    menue.onclick = function (e) {
      if (e.target.closest('[data-nu-kuerzel]')) { zu(); kuerzel(); return; }
      var b = e.target.closest('[data-nu]'); if (!b) return;
      ausfuehren(liste.filter(function (a) { return a.id === b.dataset.nu; })[0]);
    };
    menue.onmousemove = function (e) { var b = e.target.closest('[data-nu]'); if (!b) return; markieren([].indexOf.call(menue.querySelectorAll('[data-nu]'), b)); };
  }
  function markieren(i) {
    if (!offen) return;
    var bs = offen.menue.querySelectorAll('[data-nu]'); if (!bs.length) return;
    auswahl = (i + bs.length) % bs.length;
    [].forEach.call(bs, function (b, k) { b.classList.toggle('an', k === auswahl); });
    bs[auswahl].scrollIntoView({ block: 'nearest' });
  }

  /* ---------- Tastenkürzel ---------- */
  var GEHE = [
    ['S', 'Start', 'start/'], ['B', 'Buchhaltung', '?bereich=buchhaltung'], ['R', 'Rechnungen', 'rechnungen/'], ['Z', 'Zeiterfassung', 'zeit/'],
    ['T', 'Termine', 'termine/'], ['A', 'Firmenablage', 'ablage/'], ['P', 'Projekte', 'projekte/'], ['L', 'Lager', 'lager/'], ['H', 'Home-Büro', 'privat/'], ['K', 'Konto', 'konto/'],
  ];
  function kuerzel() {
    var d = document.createElement('div'); d.className = 'nu-kuerzel';
    var mac = /Mac|iPhone|iPad/.test(navigator.platform || navigator.userAgent);
    d.innerHTML = '<div role="dialog" aria-label="Tastenkürzel"><h3>Tastenkürzel</h3><table>' +
      [['Neu erstellen', '<kbd>N</kbd>'], ['Suchen', '<kbd>/</kbd> oder <kbd>' + (mac ? '⌘' : 'Ctrl') + ' K</kbd>'], ['Diese Übersicht', '<kbd>?</kbd>'], ['Schliessen', '<kbd>Esc</kbd>']]
        .concat(GEHE.map(function (g) { return ['Gehe zu ' + g[1], '<kbd>G</kbd> dann <kbd>' + g[0] + '</kbd>']; }))
        .map(function (z) { return '<tr><td>' + z[0] + '</td><td>' + z[1] + '</td></tr>'; }).join('') +
      '</table><p style="margin:14px 0 0;font-size:13px;color:var(--leise,#7C8499)">Im Menü «Neu» wählen Sie mit den Pfeiltasten und Enter, oder direkt mit dem Buchstaben.</p></div>';
    d.onclick = function (e) { if (e.target === d) d.remove(); };
    document.body.appendChild(d);
  }
  var gWarten = 0;
  document.addEventListener('keydown', function (e) {
    var ziel = e.target, tippt = ziel && (ziel.isContentEditable || /^(INPUT|TEXTAREA|SELECT)$/.test(ziel.tagName));
    if (offen) {
      if (e.key === 'Escape') { e.preventDefault(); zu(); return; }
      if (e.key === 'ArrowDown') { e.preventDefault(); markieren(auswahl + 1); return; }
      if (e.key === 'ArrowUp') { e.preventDefault(); markieren(auswahl - 1); return; }
      if (e.key === 'Enter') { e.preventDefault(); ausfuehren(offen.liste[auswahl]); return; }
      var t = offen.liste.filter(function (a) { return a.taste.toLowerCase() === String(e.key).toLowerCase(); })[0];
      if (t && !e.metaKey && !e.ctrlKey) { e.preventDefault(); ausfuehren(t); }
      return;
    }
    if (tippt || e.metaKey || e.ctrlKey || e.altKey || document.querySelector('dialog[open]')) return;
    if (e.key === 'Escape') { var k = document.querySelector('.nu-kuerzel'); if (k) k.remove(); return; }
    if (Date.now() - gWarten < 1200) {
      gWarten = 0;
      var g = GEHE.filter(function (x) { return x[0].toLowerCase() === String(e.key).toLowerCase(); })[0];
      if (g) { e.preventDefault(); location.href = W + g[2]; }
      return;
    }
    if (e.key === 'n' || e.key === 'N') { e.preventDefault(); oeffnen(document.querySelector('.nu-knopf')); }
    else if (e.key === '?') { e.preventDefault(); kuerzel(); }
    else if (e.key === '/') { var s = document.querySelector('.su-knopf'); if (s) { e.preventDefault(); s.click(); } }
    else if (e.key === 'g' || e.key === 'G') gWarten = Date.now();
  });

  /* ---------- Knopf in den Kopf setzen ---------- */
  function einbauen() {
    if (document.querySelector('.nu-knopf')) return true;
    var anker = document.querySelector('[data-suche-hier]') || document.querySelector('.su-knopf');
    if (!anker || !anker.parentNode) return false;
    if (!erlaubt().length) return true;
    var b = document.createElement('button'); b.type = 'button'; b.className = 'nu-knopf'; b.title = 'Neu erstellen (Taste N)';
    b.innerHTML = IC.plus + '<span>Neu</span>';
    b.onclick = function () { oeffnen(b); };
    // Am Handy nur auf der Startseite (in den Bereichen ist der Kopf sonst zu eng, dort gibt es eigene «+»-Knöpfe)
    setTimeout(function () { var z = document.querySelector('.nv-zurueck'); if (z && z.offsetParent) b.classList.add('nu-handy-weg'); }, 600);
    // Ordi kommt manchmal später dazu: «Neu» immer links davon halten
    var n = 0, t = setInterval(function () { var o = document.querySelector('.ordi-kopfknopf'); if (o && o.parentNode && b.nextSibling !== o) o.parentNode.insertBefore(b, o); if (++n > 20) clearInterval(t); }, 300);
    var ordi = document.querySelector('.ordi-kopfknopf');
    if (ordi && ordi.parentNode) ordi.parentNode.insertBefore(b, ordi);
    else if (anker.matches('[data-suche-hier]')) anker.insertBefore(b, anker.firstChild); else anker.parentNode.insertBefore(b, anker);
    return true;
  }
  var versuche = 0;
  (function warten() { if (einbauen() || ++versuche > 40) return; setTimeout(warten, 250); })();

  /* ---------- Zielseite: ?neu=… den passenden Knopf drücken ---------- */
  var KLICK = {
    rechnung: function () { return /\/privat\//.test(location.pathname) ? document.querySelector('[data-aktion="rechnung"]') : document.getElementById('btnNeu'); },
    offerte: function () { return document.querySelector('[data-art="offerte"]'); },
    termin: function () { return knopfMitText(/^\+\s?(ersten\s|neuer\s)?Termin( erfassen| eintragen)?$/i); },
    mitarbeiter: function () { return knopfMitText(/^\+\s?(ersten\s)?Mitarbeiter( erfassen| hinzufügen)?$/i); },
    projekt: function () { return knopfMitText(/^\+\s?(erstes\s|neues\s)?Projekt( erfassen| anlegen)?$/i); },
    artikel: function () { return knopfMitText(/^\+\s?(ersten\s|neuen\s)?Artikel( erfassen)?$/i); },
  };
  function knopfMitText(re) { var bs = document.querySelectorAll('button, a.btn'); for (var i = 0; i < bs.length; i++) if (bs[i].offsetParent && re.test(bs[i].textContent.trim())) return bs[i]; return null; }
  (function () {
    var q = new URLSearchParams(location.search), was = q.get('neu');
    if (!was || !KLICK[was] || was === '1') return;
    q.delete('neu');
    try { history.replaceState(null, '', location.pathname + (q.toString() ? '?' + q : '') + location.hash); } catch (e) {}
    var n = 0;
    (function suchen() {
      var el = KLICK[was]();
      if (el && el.offsetParent && !document.querySelector('.lz-decke')) { setTimeout(function () { el.click(); }, 150); return; }
      if (++n < 40) setTimeout(suchen, 250);
    })();
  })();

  /* ---------- Offline-Hinweis ---------- */
  var off = null;
  function netz() {
    if (navigator.onLine === false) {
      if (!off) { off = document.createElement('div'); off.className = 'nu-offline'; off.setAttribute('role', 'status'); off.innerHTML = '<i></i>Offline: keine Internetverbindung. Speichern und Senden gehen erst wieder, wenn Sie online sind.'; document.body.appendChild(off); }
    } else if (off) { off.innerHTML = '<i style="background:#6EE7A8"></i>Wieder online.'; var x = off; off = null; setTimeout(function () { x.remove(); }, 2500); }
  }
  window.addEventListener('online', netz); window.addEventListener('offline', netz);
  if (document.readyState !== 'loading') netz(); else document.addEventListener('DOMContentLoaded', netz);

  window.OrdasioNeu = { oeffnen: oeffnen, kuerzel: kuerzel, aktionen: erlaubt };
})();

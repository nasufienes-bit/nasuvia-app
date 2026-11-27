/* Ordasio – mehrere Firmen für Buchhalter.
   Ein Buchhalter meldet sich einmal an, legt Firmen an und wechselt mit einem Klick, ohne Passwort.
   Jede Firma ist ein eigenes Konto mit eigenen Daten und eigener Lizenz (Edge Function „firmen“).
   Den lokalen Datentausch beim Wechsel übernimmt konten.js (wie beim Wechsel zwischen Konten).
   Merker mit Schlüsseln ohne „ordasio.“-Punkt, damit konten.js sie beim Tausch nicht wegräumt. */
(function () {
  'use strict';
  if (window.OrdasioFirmen) return;
  var K = window.NASUVIA_KONFIG;
  if (!K || !K.produkt || !window.supabase) return;
  var WURZEL = (function () { try { return new URL('.', document.currentScript.src).href; } catch (e) { return '/'; } })();
  var K_RUECK = 'ordasioFirmenRueck', K_LISTE = 'ordasioFirmenListe', INTERN = '@firmen.ordasio.ch';
  var RF = [['einzel', 'Einzelunternehmen'], ['klg', 'Kollektivgesellschaft'], ['gmbh', 'GmbH'], ['ag', 'AG'], ['genossenschaft', 'Genossenschaft'], ['verein', 'Verein oder Stiftung']];
  var sb = window.supabase.createClient(K.url, K.key, { auth: { persistSession: true, autoRefreshToken: false, storageKey: K.speicher, detectSessionInUrl: false } });
  var lies = function (k) { try { return JSON.parse(localStorage.getItem(k) || 'null'); } catch (e) { return null; } };
  var schreib = function (k, v) { try { v == null ? localStorage.removeItem(k) : localStorage.setItem(k, JSON.stringify(v)); } catch (e) {} };
  var esc = function (s) { return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); };

  async function session() { var r = await sb.auth.getSession(); return r.data && r.data.session; }
  async function rufen(daten, s) {
    s = s || await session();
    if (!s) throw new Error('Bitte zuerst anmelden.');
    var r = await fetch(K.url + '/functions/v1/firmen', { method: 'POST', headers: { 'Content-Type': 'application/json', apikey: K.key, Authorization: 'Bearer ' + s.access_token }, body: JSON.stringify(daten) });
    var j = {}; try { j = await r.json(); } catch (e) {}
    if (!r.ok || j.fehler) throw new Error(j.fehler || 'Verbindung fehlgeschlagen.');
    return j;
  }
  // Wo bin ich? heim = eigenes Konto des Buchhalters, firma = gerade geöffnete Firma
  async function lage() {
    var s = await session(); if (!s) return null;
    var r = lies(K_RUECK), ich = s.user.id;
    if (r && r.firma === ich) return { s: s, ich: ich, inFirma: true, heim: r.heim, heimName: r.heimName, rueck: r.rueck };
    if (r && r.heim !== ich) schreib(K_RUECK, null); // anderes Konto, Merker gilt nicht mehr
    return { s: s, ich: ich, inFirma: false, heim: ich };
  }
  async function liste() {
    var l = await lage(); if (!l) return { firmen: [], zugriff: [] };
    var j = await rufen({ aktion: 'liste' }, l.s);
    if (!l.inFirma) schreib(K_LISTE, { heim: l.ich, firmen: (j.firmen || []).map(function (f) { return { uid: f.uid, firma: f.firma }; }) });
    return j;
  }
  // Token einlösen, ohne die laufende Anmeldung anzufassen (andere Teile der Seite hören auf Abmelde-Ereignisse).
  // Gespeichert wird die neue Anmeldung erst ganz am Schluss, direkt vor dem Neuladen.
  async function anmeldenMit(tokenHash) {
    var tmp = window.supabase.createClient(K.url, K.key, { auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false, storageKey: 'ordasio-firmen-tmp' } });
    var r = await tmp.auth.verifyOtp({ token_hash: tokenHash, type: 'magiclink' });
    if (r.error || !r.data || !r.data.session) throw new Error('Wechsel hat nicht geklappt: ' + ((r.error && r.error.message) || 'keine Anmeldung'));
    return r.data.session;
  }
  function uebernehmen(s) { localStorage.setItem(K.speicher, JSON.stringify(s)); }
  async function abgleichen() { try { if (window.Abgleich && Abgleich.jetzt) await Abgleich.jetzt(); } catch (e) {} }

  // Zu einer Firma (oder zurück ins eigene Konto) wechseln. Danach lädt die Seite neu.
  async function wechseln(ziel, wohin) {
    var l = await lage(); if (!l || ziel === l.ich) return;
    await abgleichen();
    var s = l.s, heimName = l.heimName;
    var rueckNeu = null;
    if (l.inFirma) {
      // zuerst zurück ins eigene Konto
      var z = await rufen({ aktion: 'wechseln', ziel: l.heim, rueck: l.rueck }, s);
      s = await anmeldenMit(z.token_hash);
    } else {
      try { var lz = await sb.from('lizenzen').select('name, firma').eq('user_id', l.ich).maybeSingle(); heimName = lz.data && (lz.data.name || lz.data.firma); } catch (e) {}
    }
    var heim = s;
    if (ziel !== l.heim) {
      var h = await rufen({ aktion: 'wechseln', ziel: ziel }, heim);
      s = await anmeldenMit(h.token_hash);
      rueckNeu = { heim: heim.user.id, heimName: heimName || heim.user.email, rueck: h.rueck, firma: ziel };
    }
    schreib(K_RUECK, rueckNeu);
    uebernehmen(s);
    location.href = wohin || (WURZEL + 'start/');
  }
  async function neu(firma, rechtsform) {
    var l = await lage();
    if (l && l.inFirma) throw new Error('Neue Firmen legen Sie in Ihrem eigenen Konto an. Wechseln Sie zuerst zurück.');
    var j = await rufen({ aktion: 'neu', firma: firma, rechtsform: rechtsform });
    await liste().catch(function () {});
    return j;
  }
  var freigeben = function (email) { return rufen({ aktion: 'freigeben', email: email }); };
  var entziehen = function (id) { return rufen({ aktion: 'entziehen', id: id }); };
  var umbenennen = function (ziel, firma) { return rufen({ aktion: 'umbenennen', ziel: ziel, firma: firma }); };

  /* ---------- Oberfläche: Firmen-Knopf in der Kopfzeile und Auswahl ---------- */
  var STIL = '.of-knopf{display:inline-flex;align-items:center;gap:7px;max-width:240px;height:38px;padding:0 12px 0 6px;border-radius:100px;border:1px solid color-mix(in srgb,var(--blau,#0B3B2E) 14%,transparent);background:#fff;color:var(--blau,#0B3B2E);font:600 14px/1 inherit;cursor:pointer;white-space:nowrap;box-shadow:0 4px 14px -10px color-mix(in srgb,var(--blau,#0B3B2E) 50%,transparent)}' +
    '.of-knopf i{flex:none;width:26px;height:26px;border-radius:50%;display:grid;place-items:center;background:var(--blau,#0B3B2E);color:#fff;font-style:normal;font-size:12px;font-weight:700}' +
    '.of-knopf.in i{background:var(--elektrik,#0E7A55)}.of-knopf span{overflow:hidden;text-overflow:ellipsis}.of-knopf svg{width:14px;height:14px;flex:none;stroke:currentColor;fill:none;stroke-width:2}' +
    '.of-schwebend{position:fixed;right:14px;top:calc(14px + env(safe-area-inset-top,0px));z-index:9500}@media(max-width:820px){.of-knopf{max-width:170px}.of-knopf:not(.of-schwebend){padding:0 5px;gap:0}.of-knopf:not(.of-schwebend) span,.of-knopf:not(.of-schwebend) svg{display:none}}' +
    '.of-dlg{z-index:9600;border:0;border-radius:20px;padding:0;width:min(460px,calc(100vw - 24px));max-height:calc(100dvh - 40px);box-shadow:0 30px 80px -20px rgba(5,19,16,.5);color:#0A1F17;font-family:inherit}' +
    '.of-dlg::backdrop{background:rgba(5,19,16,.45)}.of-dlg .of-in{padding:22px 22px 18px;display:grid;gap:12px}.of-dlg h2{margin:0;font-size:20px}.of-dlg p{margin:0;color:#3F5A4F;font-size:14px;line-height:1.45}' +
    '.of-liste{display:grid;gap:6px;max-height:46vh;overflow:auto}.of-zeile{display:flex;align-items:center;gap:10px;width:100%;text-align:left;border:1px solid color-mix(in srgb,var(--blau,#0B3B2E) 10%,transparent);background:#fff;border-radius:12px;padding:10px 12px;font:inherit;color:inherit;cursor:pointer}' +
    '.of-zeile:hover{border-color:var(--elektrik,#0E7A55)}.of-zeile.jetzt{background:var(--flaeche,#E8F4EE);border-color:var(--elektrik,#0E7A55);cursor:default}.of-zeile i{flex:none;width:32px;height:32px;border-radius:10px;display:grid;place-items:center;background:var(--blau,#0B3B2E);color:#fff;font-style:normal;font-weight:700}' +
    '.of-zeile b{display:block;font-size:15px}.of-zeile small{display:block;color:#5B6B64;font-size:12.5px}.of-zeile em{margin-left:auto;font-style:normal;font-size:12px;color:var(--elektrik,#0E7A55);font-weight:600}' +
    '.of-form{display:grid;gap:8px}.of-form label{display:grid;gap:4px;font-size:13px;color:#3F5A4F}.of-form input,.of-form select{font:inherit;font-size:15px;padding:10px 12px;border:1px solid color-mix(in srgb,var(--blau,#0B3B2E) 20%,transparent);border-radius:10px;background:#fff;color:#0A1F17}' +
    '.of-knoepfe{display:flex;gap:8px;flex-wrap:wrap;justify-content:flex-end}.of-btn{font:inherit;font-weight:600;font-size:14px;border-radius:100px;padding:10px 16px;border:1px solid color-mix(in srgb,var(--blau,#0B3B2E) 16%,transparent);background:#fff;color:var(--blau,#0B3B2E);cursor:pointer}.of-btn.haupt{background:var(--blau,#0B3B2E);color:#fff;border-color:var(--blau,#0B3B2E)}.of-btn:disabled{opacity:.6}' +
    '.of-fehler{color:#B42318!important}';
  var stilDa = false;
  function stil() { if (stilDa) return; stilDa = true; var s = document.createElement('style'); s.textContent = STIL; document.head.appendChild(s); }
  var anfang = function (t) { return esc(String(t || '?').trim().charAt(0).toUpperCase() || '?'); };
  var PFEIL = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="m6 9 6 6 6-6"/></svg>';

  function dialog(html) {
    stil();
    var d = document.createElement('dialog'); d.className = 'of-dlg'; d.innerHTML = '<div class="of-in">' + html + '</div>';
    document.body.appendChild(d); d.addEventListener('close', function () { d.remove(); });
    d.addEventListener('click', function (e) { if (e.target === d || e.target.closest('[data-of-zu]')) d.close(); });
    d.showModal(); return d;
  }
  var STATUS = { test: 'Test', aktiv: 'Aktiv', abgelaufen: 'Abgelaufen', gesperrt: 'Gesperrt' };
  async function auswahl() {
    var l = await lage(); if (!l) { location.href = WURZEL + 'start/'; return; }
    var d = dialog('<h2>Firmen</h2><p data-of-text>Wird geladen …</p><div class="of-liste" data-of-liste></div>' +
      '<div class="of-knoepfe"><button class="of-btn" data-of-zu>Schliessen</button>' + (l.inFirma ? '' : '<button class="of-btn haupt" data-of-neu>+ Firma hinzufügen</button>') + '</div>');
    var text = d.querySelector('[data-of-text]'), box = d.querySelector('[data-of-liste]');
    var heimZeile = function () {
      return '<button class="of-zeile' + (l.inFirma ? '' : ' jetzt') + '" data-of-ziel="' + esc(l.heim) + '"><i>' + anfang(l.heimName || 'M') + '</i><span><b>Mein Konto</b><small>' + esc(l.inFirma ? (l.heimName || '') : 'Ihr eigenes Konto') + '</small></span>' + (l.inFirma ? '' : '<em>Geöffnet</em>') + '</button>';
    };
    try {
      var firmen;
      if (l.inFirma) { var c = lies(K_LISTE); firmen = c && c.heim === l.heim ? c.firmen : []; }
      else firmen = (await liste()).firmen || [];
      text.textContent = l.inFirma ? 'Sie arbeiten gerade in einer Firma. Wählen Sie, wohin Sie wechseln möchten.' : firmen.length ? 'Tippen Sie auf eine Firma, um sie zu öffnen. Die Daten jeder Firma bleiben getrennt.' : 'Für Buchhalter und Treuhänder: Legen Sie für jede Firma, die Sie betreuen, eine eigene Buchhaltung an. Sie wechseln mit einem Klick, ohne neues Passwort.';
      box.innerHTML = heimZeile() + firmen.map(function (f) {
        var jetzt = f.uid === l.ich;
        return '<button class="of-zeile' + (jetzt ? ' jetzt' : '') + '" data-of-ziel="' + esc(f.uid) + '"><i>' + anfang(f.firma) + '</i><span><b>' + esc(f.firma || 'Ohne Namen') + '</b><small>' + esc([f.rolle === 'buchhalter' ? 'Freigegeben vom Kunden' : '', STATUS[f.status] || ''].filter(Boolean).join(' · ')) + '</small></span>' + (jetzt ? '<em>Geöffnet</em>' : '') + '</button>';
      }).join('');
    } catch (e) { text.textContent = e.message; text.classList.add('of-fehler'); }
    d.addEventListener('click', async function (e) {
      var z = e.target.closest('[data-of-ziel]');
      if (z && !z.classList.contains('jetzt')) {
        text.classList.remove('of-fehler'); text.textContent = 'Wechsle … Ihre Daten werden zuerst gesichert.';
        Array.prototype.forEach.call(d.querySelectorAll('button'), function (b) { b.disabled = true; });
        try { await wechseln(z.dataset.ofZiel); } catch (x) { text.textContent = x.message; text.classList.add('of-fehler'); Array.prototype.forEach.call(d.querySelectorAll('button'), function (b) { b.disabled = false; }); }
        return;
      }
      if (e.target.closest('[data-of-neu]')) { d.close(); neuDialog(); }
    });
  }
  function neuDialog(fertig) {
    var d = dialog('<h2>Firma hinzufügen</h2><p>Die Firma bekommt eine eigene Buchhaltung mit eigenen Rechnungen, Löhnen und eigener Lizenz (30 Tage gratis). Eine eigene E-Mail-Adresse braucht es nicht.</p>' +
      '<form class="of-form" data-of-form><label>Name der Firma<input name="firma" required minlength="2" maxlength="120" autocomplete="organization" placeholder="z. B. Muster Bau GmbH"></label>' +
      '<label>Rechtsform<select name="rf">' + RF.map(function (r) { return '<option value="' + r[0] + '">' + r[1] + '</option>'; }).join('') + '</select></label>' +
      '<p data-of-meldung></p><div class="of-knoepfe"><button type="button" class="of-btn" data-of-zu>Abbrechen</button><button class="of-btn haupt">Anlegen</button></div></form>');
    var f = d.querySelector('form'), m = d.querySelector('[data-of-meldung]');
    f.firma.focus();
    f.addEventListener('submit', async function (e) {
      e.preventDefault(); var b = f.querySelector('.haupt'); b.disabled = true; m.classList.remove('of-fehler'); m.textContent = 'Wird angelegt …';
      try {
        var j = await neu(f.firma.value.trim(), f.rf.value);
        m.innerHTML = '<b>' + esc(j.firma) + '</b> ist angelegt.';
        f.querySelector('.of-knoepfe').innerHTML = '<button type="button" class="of-btn" data-of-zu>Später</button><button type="button" class="of-btn haupt" data-of-oeffnen>Jetzt öffnen</button>';
        f.querySelector('[data-of-oeffnen]').onclick = function () { m.textContent = 'Wechsle …'; wechseln(j.uid).catch(function (x) { m.textContent = x.message; m.classList.add('of-fehler'); }); };
        if (fertig) fertig(j);
      } catch (x) { m.textContent = x.message; m.classList.add('of-fehler'); b.disabled = false; }
    });
  }

  // Knopf in der Kopfzeile: in einer Firma immer, im eigenen Konto sobald es Firmen gibt
  async function knopf() {
    var l = await lage(); if (!l) return;
    var c = lies(K_LISTE), anzahl = c && c.heim === l.heim ? (c.firmen || []).length : 0;
    if (!l.inFirma && !anzahl) return;
    var name = 'Firmen';
    if (l.inFirma) {
      var f = c && c.heim === l.heim ? (c.firmen || []).filter(function (x) { return x.uid === l.ich; })[0] : null;
      name = f ? f.firma : '';
      if (!name) { try { var lz = await sb.from('lizenzen').select('firma, name').eq('user_id', l.ich).maybeSingle(); name = lz.data && (lz.data.firma || lz.data.name); } catch (e) {} }
    }
    stil();
    var b = document.createElement('button'); b.type = 'button'; b.className = 'of-knopf' + (l.inFirma ? ' in' : '');
    b.title = l.inFirma ? 'Sie arbeiten in: ' + name + '. Tippen zum Wechseln.' : 'Firma wechseln';
    b.innerHTML = '<i>' + anfang(name || 'F') + '</i><span>' + esc(name || 'Firma') + '</span>' + PFEIL;
    b.onclick = auswahl;
    var ziel = Array.prototype.filter.call(document.querySelectorAll('.nv-kz .nv-logo, .kopfzeile .marke, .nv-logo, .kopf-links'), function (el) { return el.getClientRects().length > 0; })[0];
    if (ziel && ziel.parentNode) { b.style.marginLeft = '6px'; ziel.parentNode.insertBefore(b, ziel.nextSibling); }
    else { b.classList.add('of-schwebend'); document.body.appendChild(b); }
  }

  window.OrdasioFirmen = { liste: liste, wechseln: wechseln, neu: neu, neuDialog: neuDialog, auswahl: auswahl, freigeben: freigeben, entziehen: entziehen, umbenennen: umbenennen, lage: lage, INTERN: INTERN };
  var los = function () { setTimeout(function () { knopf().catch(function () {}); }, 300); };
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', los); else los();
})();

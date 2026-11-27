// Lizenz der verkauften Version: Anmelden, Gratis-Test, Paket und Ablauf.
// Läuft nur in der Verkaufsversion (konfig.js → produkt). Der Server prüft zusätzlich: ohne gültige Lizenz wird nichts gespeichert.
// Einbinden: <script src="pakete.js"></script><script src="lizenz.js" data-produkt="buchhaltung|rechnungen|privat|zeit|termine|lager|start"></script>
(() => {
  const K = window.NASUVIA_KONFIG || {};
  if (!K.produkt) return;
  const skript = document.currentScript || {};
  const PRODUKT = (skript.dataset && skript.dataset.produkt) || 'buchhaltung';
  const NAME = { buchhaltung: 'die Buchhaltung', rechnungen: 'das Rechnungsprogramm', privat: 'das Home-Büro', zeit: 'die Zeiterfassung', termine: 'die Online-Terminbuchung', lager: 'das Lager', ablage: 'die Firmenablage', start: 'Ordasio', projekte: 'die Projekte', konto: 'Ihr Konto' }[PRODUKT] || 'diesen Bereich';
  // Pakete und Rechtsformen kommen aus pakete.js (vor lizenz.js einbinden)
  const O = window.ORDASIO || null;
  try { const em = new URLSearchParams(location.search).get('empf'); if (em && /^[A-Za-z0-9]{6,10}$/.test(em)) localStorage.setItem('ordasio.empf', em.toUpperCase()); } catch {}
  // Aktionscodes (z. B. vom Autokleber: ordasio.ch/auto → ?code=AUTO100): Rabatt aufs Jahresabo
  const AKTIONEN = { AUTO100: { code: 'AUTO100', name: 'Autokleber', rabatt: 100, text: 'CHF 100 Rabatt auf das erste Jahresabo' } };
  try { const c = (new URLSearchParams(location.search).get('code') || '').toUpperCase(); if (AKTIONEN[c]) localStorage.setItem('ordasio.aktion', JSON.stringify({ code: c, am: new Date().toISOString().slice(0, 10) })); } catch {}
  window.OrdasioAktion = () => { try { const a = JSON.parse(localStorage.getItem('ordasio.aktion') || 'null'); return a && AKTIONEN[a.code] ? { ...AKTIONEN[a.code], am: a.am } : null; } catch { return null; } };
  const paketName = (id) => (O && O.paket(id) ? O.paket(id).name : id);
  // Lizenz-Objekt (mit Zusatzpaketen) oder nur Paket-ID; „konto“ ist immer offen
  const darf = (l) => !O || PRODUKT === 'konto' || O.darf(l, PRODUKT);
  const KAUFEN = (() => { try { return new URL('lizenz/', new URL('.', skript.src)).href; } catch { return '/lizenz/'; } })();
  const esc = (s) => String(s ?? '').replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
  const heute = () => new Date().toLocaleDateString('sv-SE');
  const dk = (d) => (d ? d.slice(8, 10) + '.' + d.slice(5, 7) + '.' + d.slice(0, 4) : '');
  const sb = window.supabase.createClient(K.url, K.key, { auth: { persistSession: true, autoRefreshToken: true, storageKey: K.speicher, detectSessionInUrl: true } });
  window.NASUVIA_SB = sb;
  // Vorzeige-Modus (konfig.js → demo): ohne Anmeldung ins Demo-Konto. Wer sich bewusst abmeldet oder ?anmelden an die Adresse hängt, sieht wieder die Anmeldung.
  const OHNE_DEMO = 'nk.ohneDemo';
  try { if (/[?&]anmelden\b/.test(location.search)) sessionStorage.setItem(OHNE_DEMO, '1'); } catch {}
  // Automatische Anmeldung nur, wenn ein Demo-Passwort hinterlegt ist (zurzeit nicht: Demo braucht eine Anmeldung)
  const demoErlaubt = () => { try { return !!(K.demo && K.demo.password) && sessionStorage.getItem(OHNE_DEMO) !== '1'; } catch { return !!(K.demo && K.demo.password); } };
  const demoAus = () => { try { sessionStorage.setItem(OHNE_DEMO, '1'); } catch {} };
  const istDemo = (s) => !!(K.demo && s && s.user && s.user.email === K.demo.email);

  const stil = document.createElement('style');
  stil.textContent = `
  .lz-decke{position:fixed;inset:0;z-index:100000;background:rgba(247,249,253,.97);backdrop-filter:blur(8px);-webkit-backdrop-filter:blur(8px);display:grid;place-items:center;padding:18px;font-family:'League Spartan',-apple-system,system-ui,sans-serif;color:#0A1F17;overflow:auto}
  .lz-karte{width:min(440px,100%);background:#fff;border-radius:24px;padding:26px;box-shadow:0 30px 80px -30px rgba(12,18,38,.45)}
  .lz-karte h2{font-size:1.6rem;line-height:1.15;margin:10px 0 6px;letter-spacing:-.02em}
  .lz-karte p{color:#3F5A4F;font-size:15px;line-height:1.5;margin:0 0 14px}
  .lz-symbol{width:52px;height:52px;border-radius:16px;background:linear-gradient(135deg,var(--blau,#0B3B2E),var(--elektrik,#0E7A55));display:grid;place-items:center}
  .lz-symbol svg{width:26px;height:26px;stroke:#fff;fill:none;stroke-width:2;stroke-linecap:round;stroke-linejoin:round}
  .lz-reiter{display:flex;background:var(--flaeche,#E8F4EE);border-radius:100px;padding:4px;margin:4px 0 16px}
  .lz-reiter button{flex:1;border:0;background:none;border-radius:100px;padding:9px;font:inherit;font-weight:500;color:#3F5A4F;cursor:pointer}
  .lz-reiter button.an{background:#fff;color:var(--blau,#0B3B2E);font-weight:700;box-shadow:0 2px 8px rgba(12,18,38,.08)}
  .lz-karte label{display:grid;gap:4px;font-size:13px;color:#3F5A4F;margin-bottom:10px}
  .lz-karte input,.lz-karte select{font:inherit;font-size:16px;border:1px solid color-mix(in srgb,var(--blau,#0B3B2E) 26%,transparent);border-radius:12px;padding:11px 12px;background:#fff;color:#0A1F17;width:100%}
  .lz-knopf{display:block;width:100%;border:0;border-radius:100px;padding:13px;font:inherit;font-weight:700;font-size:16px;cursor:pointer;background:var(--blau,#0B3B2E);color:#fff;text-align:center;text-decoration:none;margin-top:6px}
  .lz-knopf.zweit{background:var(--flaeche,#E8F4EE);color:var(--blau,#0B3B2E)}
  .lz-oder{display:flex;align-items:center;gap:10px;margin:14px 0 10px;font-size:12.5px;color:#7a8a83}.lz-oder::before,.lz-oder::after{content:"";flex:1;height:1px;background:#dfe7e2}
  .lz-wege{display:grid;gap:8px;margin-bottom:8px}.lz-wege:empty{display:none}.lz-weg{display:flex!important;align-items:center;justify-content:center;gap:10px;background:#fff!important;box-shadow:inset 0 0 0 1.5px #d5e0da}
  .lz-modul{text-align:left}.lz-modul small{display:block;text-align:center;font-size:12px;font-weight:700;letter-spacing:.08em;text-transform:uppercase;color:var(--elektrik,#1F9D6B)}
  .lz-modul h2{text-align:center;margin:2px 0 10px}.lz-modul-ic{display:grid;place-items:center;width:58px;height:58px;margin:0 auto 8px;border-radius:18px;background:var(--flaeche,#E8F4EE);font-size:30px}
  .lz-modul ul{margin:10px 0 12px;padding-left:20px;line-height:1.55;font-size:14.5px}.lz-preis{text-align:center;margin:0 0 12px}
  .lz-link{display:block;margin:12px auto 0;background:none;border:0;color:var(--elektrik,#0E7A55);font:inherit;font-size:14px;cursor:pointer}
  .lz-postfach{display:grid;gap:8px;margin:4px 0 12px}.lz-postfach:empty{display:none}.lz-postfach a{text-decoration:none}
  .lz-klein{font-size:13px!important;color:#7a8a83!important;margin:0 0 4px!important}
  .lz-hinweis{font-size:13px!important;margin:-4px 0 10px!important;color:#3F5A4F}
  .lz-meldung{min-height:1.3em;font-size:14px;color:#C53030;margin:4px 0 6px}
  .lz-meldung.ok{color:var(--elektrik,#0A7150)}
  .lz-pille{position:fixed;left:14px;bottom:calc(14px + env(safe-area-inset-bottom,0px));z-index:9000;background:#0A1F17;color:#fff;border-radius:100px;padding:8px 14px;font:600 13px 'League Spartan',system-ui,sans-serif;box-shadow:0 10px 30px -10px rgba(12,18,38,.5);text-decoration:none}
  .lz-pille b{color:#6EE7A8}
  .lz-menue{display:block;margin:0 4px 10px;padding:10px 12px;border-radius:14px;background:#0A1F17;color:#fff;font:600 13px/1.35 'League Spartan',system-ui,sans-serif;text-decoration:none}.lz-menue b{color:#6EE7A8}.lz-menue.lesen{background:#B4282D}.lz-menue.lesen b{color:#fff}
  .lz-pille.lesen{background:#B4282D}
  @media(max-width:820px){.lz-pille{bottom:calc(76px + env(safe-area-inset-bottom,0px))}}`;
  document.head.appendChild(stil);

  const decke = document.createElement('div');
  decke.className = 'lz-decke';
  decke.innerHTML = '<div class="lz-karte"><p>Wird geladen …</p></div>';
  // Erst anhängen, wenn die Seite einen <body> hat (lizenz.js steht teils im <head>)
  const anhaengen = (el) => { if (document.body) document.body.appendChild(el); else document.addEventListener('DOMContentLoaded', () => document.body.appendChild(el), { once: true }); };
  // Postfach-Knöpfe nach der Registrierung
  try { if (!window.OrdasioPostfach) { const ps = document.createElement('script'); ps.src = new URL('postfach.js', new URL('.', skript.src)).href; document.head.appendChild(ps); } } catch {}
  let wartetAufBestaetigung = '';
  function bestaetigenKarte(email, hinweis) {
    wartetAufBestaetigung = email;
    const P = window.OrdasioPostfach;
    zeigen(`${SYMBOL}<h2>Bitte bestätigen Sie Ihre E-Mail</h2>
      <p>${hinweis ? esc(hinweis) + ' ' : ''}Wir haben Ihnen eine Bestätigung an <b>${esc(email)}</b> geschickt. Öffnen Sie die E-Mail von <b>Ordasio</b> und tippen Sie auf <b>«E-Mail-Adresse bestätigen»</b>. Danach sind Sie automatisch angemeldet.</p>
      <div class="lz-postfach">${P ? P.knoepfe(email) : ''}</div>
      <p class="lz-klein">Keine E-Mail da? Schauen Sie auch im Spam- oder Werbung-Ordner nach. Absender: noreply@ordasio.ch</p>
      <button class="lz-link" data-lz-nochmals>Bestätigung nochmals senden</button>
      <button class="lz-link" data-lz-weiter>Ich habe bestätigt, weiter</button>
      <button class="lz-link" data-lz-andere>Andere E-Mail-Adresse verwenden</button>
      <p class="lz-klein" data-lz-bmeldung></p>`);
  }
  document.addEventListener('click', async (e) => {
    if (!wartetAufBestaetigung) return;
    const m = document.querySelector('[data-lz-bmeldung]');
    if (e.target.closest('[data-lz-nochmals]')) {
      const b = e.target.closest('[data-lz-nochmals]'); b.disabled = true;
      const r = await sb.auth.resend({ type: 'signup', email: wartetAufBestaetigung, options: { emailRedirectTo: location.origin + location.pathname } });
      if (m) m.textContent = r.error ? (/rate limit|seconds|security purposes/i.test(r.error.message) ? 'Bitte eine Minute warten und nochmals versuchen.' : r.error.message) : '✓ Neue E-Mail ist unterwegs.';
      setTimeout(() => { b.disabled = false; }, 30000);
    } else if (e.target.closest('[data-lz-weiter]')) {
      const { data: { session } } = await sb.auth.getSession();
      if (session) location.reload();
      else { wartetAufBestaetigung = ''; anmelden('anmelden', 'Melden Sie sich jetzt mit E-Mail und Passwort an.'); }
    } else if (e.target.closest('[data-lz-andere]')) { wartetAufBestaetigung = ''; anmelden('neu'); }
  });
  const zeigen = (html) => { decke.querySelector('.lz-karte').innerHTML = html; if (!decke.isConnected) anhaengen(decke); };
  const weg = () => decke.remove();
  anhaengen(decke);
  const SYMBOL = '<img src="' + KAUFEN.replace(/lizenz\/$/, 'logo.png') + '" alt="Ordasio" style="height:34px;display:block">';

  /* ---------- Anmelden und Konto erstellen ---------- */
  function paketOptionen(rechtsform, gewaehlt, empfohlen = '') {
    if (!O) return '';
    const liste = O.fuer(rechtsform);
    const wahl = liste.some((p) => p.id === gewaehlt) ? gewaehlt : O.vorgabe(rechtsform);
    return liste.map((p) => `<option value="${p.id}" ${p.id === wahl ? 'selected' : ''}>${p.id === empfohlen ? '★ ' : ''}${esc(p.name)} · ${esc(p.kurz)} · CHF ${p.monat}/Mt.${p.id === empfohlen ? ' (empfohlen)' : ''}</option>`).join('');
  }
  const BR = window.Branchen || null;
  // Empfehlung aus Rechtsform, Branche und Mitarbeitenden ins Formular übernehmen
  function empfehlen(f) {
    const r = f.querySelector('[data-lz-rechtsform]'), p = f.querySelector('[data-lz-paket]'), h = f.querySelector('[data-lz-rfhinweis]');
    if (!r || !p) return;
    const e = BR ? BR.empfehlung({ rechtsform: r.value, branche: (f.querySelector('[name=branche]') || {}).value || '', mitarbeiter: Number((f.querySelector('[name=ma]') || {}).value || 0) }) : null;
    const id = e ? e.paket : O.passend(p.value, r.value);
    p.innerHTML = paketOptionen(r.value, id, e && e.paket);
    if (h) h.innerHTML = esc(rechtsformHinweis(r.value)) + (e && e.gruende.length ? `<br><b>Empfehlung ${esc((O.paket(id) || {}).name || '')}:</b> ${esc(e.gruende.slice(0, 2).join(' '))}` : '');
    f.querySelectorAll('[data-lz-firmafeld]').forEach((x) => { x.hidden = r.value === 'privat'; });
  }
  function anmelden(modus = 'anmelden', meldung = '') {
    const q = new URLSearchParams(location.search);
    const rfVorgabe = (O && O.RECHTSFORMEN[q.get('rechtsform')]) ? q.get('rechtsform') : (PRODUKT === 'privat' ? 'privat' : 'einzel');
    const paketVorgabe = (O && O.paket(q.get('paket'))) ? O.passend(q.get('paket'), rfVorgabe) : (O ? O.vorgabe(rfVorgabe) : '');
    zeigen(`${SYMBOL}<h2>${modus === 'neu' ? '30 Tage gratis testen' : 'Willkommen zurück'}</h2>
      <p>${modus === 'neu' ? 'Konto erstellen und sofort loslegen. Keine Zahlung nötig.' : `Melden Sie sich an, um ${NAME} zu öffnen.`}</p>
      ${modus === 'neu' && window.OrdasioAktion && OrdasioAktion() ? `<p style="background:#EAF6F0;color:#0B3B2E;border-radius:12px;padding:10px 12px;font-weight:600">Aktion ${OrdasioAktion().name}: ${OrdasioAktion().text}. Der Rabatt ist für Sie gespeichert.</p>` : ''}
      <div class="lz-reiter"><button class="${modus === 'anmelden' ? 'an' : ''}" data-lz-modus="anmelden">Anmelden</button><button class="${modus === 'neu' ? 'an' : ''}" data-lz-modus="neu">Konto erstellen</button></div>
      <form data-lz-form="${modus}">
        ${modus === 'neu' ? `<label>Vor- und Nachname<input name="name" autocomplete="name" required></label>
          ${O ? `<label>Rechtsform<select name="rechtsform" data-lz-rechtsform>${Object.entries(O.RECHTSFORMEN).map(([k, r]) => `<option value="${k}" ${k === rfVorgabe ? 'selected' : ''}>${esc(r.name)}${k === 'privat' ? ' (nur private Finanzen)' : ''}</option>`).join('')}</select></label>` : ''}
          <label data-lz-firmafeld ${rfVorgabe === 'privat' ? 'hidden' : ''}>Firmenname <span>(freiwillig)</span><input name="firma" autocomplete="organization"></label>
          ${O && BR ? `<div data-lz-firmafeld ${rfVorgabe === 'privat' ? 'hidden' : ''} style="display:grid;grid-template-columns:1.4fr 1fr;gap:8px"><label>Branche<select name="branche" data-lz-empf><option value="">Bitte wählen</option>${BR.LISTE.map((b) => `<option value="${b.id}">${b.icon} ${esc(b.name)}</option>`).join('')}</select></label>
            <label>Mitarbeitende<select name="ma" data-lz-empf><option value="0">Nur ich</option><option value="2">1 bis 3</option><option value="5">4 bis 5</option><option value="8">Mehr als 5</option></select></label></div>` : ''}
          ${O ? `<label>Paket<select name="paket" data-lz-paket>${paketOptionen(rfVorgabe, paketVorgabe)}</select></label>
          <p class="lz-hinweis" data-lz-rfhinweis>${rechtsformHinweis(rfVorgabe)}</p>` : ''}` : ''}
        <label>E-Mail<input name="email" type="email" autocomplete="username" required value="${esc(new URLSearchParams(location.search).get('konto') || '')}"></label>
        <label>Passwort${modus === 'neu' ? ' <span>(mindestens 8 Zeichen)</span>' : ''}<input name="passwort" type="password" autocomplete="${modus === 'neu' ? 'new-password' : 'current-password'}" required minlength="${modus === 'neu' ? 8 : 6}"></label>
        <p class="lz-meldung ${meldung.startsWith('✓') ? 'ok' : ''}" data-lz-meldung>${esc(meldung)}</p>
        <button class="lz-knopf">${modus === 'neu' ? 'Gratis-Test starten' : 'Anmelden'}</button>
      </form>
      <div class="lz-oder"><span>oder</span></div>
      <div class="lz-wege" data-lz-oauth></div>
      ${modus === 'anmelden' ? '<button class="lz-knopf zweit" data-lz-maillink>✉ Anmeldelink per E-Mail</button>' : ''}
      ${modus === 'anmelden' ? '<button class="lz-link" data-lz-vergessen>Passwort vergessen?</button>' : '<p style="font-size:12.5px;margin-top:12px">Ihre Daten liegen verschlüsselt in der Schweiz (Zürich) und gehören Ihnen. Nur Sie sehen sie. Paket und Rechtsform können Sie während des Tests jederzeit ändern.</p>'}`);
    wegeZeigen();
  }
  // Google und Apple nur zeigen, wenn sie in Supabase eingeschaltet sind
  let wegeCache = null;
  async function wegeZeigen() {
    const ziel = decke.querySelector('[data-lz-oauth]'); if (!ziel) return;
    try { wegeCache = wegeCache || (await (await fetch(K.url + '/auth/v1/settings', { headers: { apikey: K.key } })).json()).external || {}; } catch { wegeCache = {}; }
    const W = [['google', 'Mit Google anmelden', '<svg viewBox="0 0 24 24" width="18" height="18"><path fill="#4285F4" d="M22.5 12.3c0-.8-.1-1.5-.2-2.2H12v4.2h5.9a5 5 0 0 1-2.2 3.3v2.7h3.5c2.1-1.9 3.3-4.7 3.3-8z"/><path fill="#34A853" d="M12 23c3 0 5.5-1 7.2-2.7l-3.5-2.7c-1 .7-2.2 1-3.7 1-2.8 0-5.2-1.9-6.1-4.5H2.3v2.8A11 11 0 0 0 12 23z"/><path fill="#FBBC05" d="M5.9 14.1a6.6 6.6 0 0 1 0-4.2V7.1H2.3a11 11 0 0 0 0 9.8z"/><path fill="#EA4335" d="M12 5.4c1.6 0 3 .5 4.1 1.6l3.1-3.1A11 11 0 0 0 2.3 7.1l3.6 2.8C6.8 7.3 9.2 5.4 12 5.4z"/></svg>'],
      ['apple', 'Mit Apple anmelden', '<svg viewBox="0 0 24 24" width="18" height="18"><path fill="currentColor" d="M16.4 12.6c0-2.6 2.1-3.8 2.2-3.9a4.8 4.8 0 0 0-3.8-2c-1.6-.2-3.1.9-3.9.9-.8 0-2-.9-3.4-.9a5 5 0 0 0-4.2 2.6c-1.8 3.1-.5 7.7 1.3 10.2.9 1.2 1.9 2.6 3.2 2.6 1.3-.1 1.8-.8 3.3-.8 1.6 0 2 .8 3.4.8 1.4 0 2.3-1.3 3.1-2.5a11 11 0 0 0 1.4-2.9 4.5 4.5 0 0 1-2.6-4.1zM13.9 5.1A4.4 4.4 0 0 0 15 1.9a4.5 4.5 0 0 0-2.9 1.5 4.2 4.2 0 0 0-1.1 3.1 3.7 3.7 0 0 0 2.9-1.4z"/></svg>']]
      .filter(([id]) => wegeCache[id]);
    ziel.innerHTML = W.map(([id, t, ic]) => `<button class="lz-knopf zweit lz-weg" data-lz-oauth-weg="${id}">${ic}<span>${t}</span></button>`).join('');
    if (!W.length && !decke.querySelector('[data-lz-maillink]')) { const o = decke.querySelector('.lz-oder'); if (o) o.hidden = true; }
  }
  function rechtsformHinweis(rf) {
    return { einzel: 'Einfache Buchhaltung ohne Fachbegriffe. Die doppelte Buchhaltung lässt sich jederzeit zuschalten.',
      klg: 'Einfache Buchhaltung mit Privatkonten der Gesellschafter. Die doppelte Buchhaltung lässt sich jederzeit zuschalten.',
      genossenschaft: 'Mit doppelter Buchhaltung nach Schweizer KMU-Kontenrahmen, Bilanz und Erfolgsrechnung nach OR.',
      verein: 'Einnahmen und Ausgaben einfach erfassen, Mitgliederbeiträge als Rechnung. Doppelte Buchhaltung zuschaltbar.',
      gmbh: 'Mit doppelter Buchhaltung nach Schweizer KMU-Kontenrahmen, Bilanz und Erfolgsrechnung nach OR.',
      ag: 'Mit doppelter Buchhaltung nach Schweizer KMU-Kontenrahmen, Bilanz und Erfolgsrechnung nach OR.',
      privat: 'Für Ihre privaten Finanzen: Konto, Abos, Rechnungen und Fristen.' }[rf] || '';
  }
  decke.addEventListener('change', (e) => {
    const r = e.target.closest('[data-lz-rechtsform],[data-lz-empf]'); if (!r || !O) return;
    empfehlen(r.form);
  });
  decke.addEventListener('click', async (e) => {
    const t = e.target.closest('button,a'); if (!t) return;
    if (t.dataset.lzModus) { e.preventDefault(); anmelden(t.dataset.lzModus); }
    if (t.hasAttribute('data-lz-vergessen')) {
      e.preventDefault();
      const mail = (decke.querySelector('input[name=email]') || {}).value || '';
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(mail)) { decke.querySelector('[data-lz-meldung]').textContent = 'Bitte zuerst Ihre E-Mail eingeben.'; return; }
      await sb.auth.resetPasswordForEmail(mail, { redirectTo: location.origin + location.pathname });
      anmelden('anmelden', '✓ Falls es ein Konto gibt, ist ein Link zum Zurücksetzen unterwegs.');
    }
    if (t.dataset.lzOauthWeg) {
      e.preventDefault();
      await sb.auth.signInWithOAuth({ provider: t.dataset.lzOauthWeg, options: { redirectTo: location.origin + location.pathname } });
      return;
    }
    if (t.hasAttribute('data-lz-maillink')) {
      e.preventDefault();
      const mail = (decke.querySelector('input[name=email]') || {}).value || '', m = decke.querySelector('[data-lz-meldung]');
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(mail)) { m.className = 'lz-meldung'; m.textContent = 'Bitte zuerst Ihre E-Mail eingeben.'; return; }
      t.disabled = true;
      const { error } = await sb.auth.signInWithOtp({ email: mail.trim(), options: { shouldCreateUser: false, emailRedirectTo: location.origin + location.pathname } });
      t.disabled = false;
      m.className = 'lz-meldung' + (error ? '' : ' ok');
      m.textContent = error ? (/rate limit/i.test(error.message) ? 'Bitte ein paar Minuten warten und nochmals versuchen.' : /signups not allowed|not found/i.test(error.message) ? 'Zu dieser E-Mail gibt es noch kein Konto.' : error.message)
        : '✓ Link ist unterwegs. Öffnen Sie die E-Mail auf diesem Gerät und tippen Sie auf den Link.';
      return;
    }
    if (t.hasAttribute('data-lz-mfa-ab')) { e.preventDefault(); await sb.auth.signOut({ scope: 'local' }); location.reload(); return; }
    if (t.dataset.lzWechsel) {
      e.preventDefault(); t.disabled = true;
      const l0 = window.NASUVIA_LIZENZ || {};
      const { error } = await sb.rpc('paket_wechseln', { p_paket: t.dataset.lzWechsel, p_rechtsform: l0.rechtsform || 'einzel' });
      if (error) { t.disabled = false; await UI.hinweis(error.message); return; }
      location.reload();
    }
    if (t.dataset.lzModul) {
      e.preventDefault(); t.disabled = true;
      const m = O && O.modul(t.dataset.lzModul), l0 = window.NASUVIA_LIZENZ || {};
      if (l0.status === 'aktiv' && !await UI.frage(`„${m ? m.name : ''}“ für CHF ${m ? m.monat : ''} pro Monat dazubuchen? Es ist sofort offen, der Betrag kommt auf Ihre nächste Rechnung. Abbestellen geht jederzeit in Ihrem Konto.`)) { t.disabled = false; return; }
      const { error } = await sb.rpc('zusatz_buchen', { p_id: t.dataset.lzModul, p_an: true });
      if (error) { t.disabled = false; await UI.hinweis(error.message); return; }
      location.reload();
    }
    if (t.hasAttribute('data-lz-abmelden')) { e.preventDefault(); demoAus(); await sb.auth.signOut({ scope: 'local' }); location.reload(); }
    if (t.hasAttribute('data-lz-lesen')) { e.preventDefault(); weg(); pille('Nur Lesen: Lizenz abgelaufen · <b>Lizenz kaufen</b>', true); }
  });
  decke.addEventListener('submit', async (e) => {
    const f = e.target.closest('[data-lz-form]'); if (!f) return;
    e.preventDefault();
    const m = f.querySelector('[data-lz-meldung]'), d = Object.fromEntries(new FormData(f));
    m.className = 'lz-meldung'; m.textContent = '';
    const knopf = f.querySelector('button'); knopf.disabled = true;
    try {
      if (f.dataset.lzForm === 'neu') {
        const { data, error } = await sb.auth.signUp({ email: d.email.trim(), password: d.passwort,
          options: { emailRedirectTo: location.origin + location.pathname, data: { empf: (() => { try { return localStorage.getItem('ordasio.empf') || ''; } catch { return ''; } })(), aktion: (window.OrdasioAktion() || {}).code || '', name: d.name.trim(), firma: (d.firma || '').trim(), paket: d.paket || '', rechtsform: d.rechtsform || 'einzel', branche: d.branche || '', zyklus: 'jahr' } } });
        try { if (d.branche) localStorage.setItem('ordasio.branche', d.branche); } catch {}
        if (error) throw error;
        if (!data.session) { bestaetigenKarte(d.email.trim(), 'Fast geschafft!'); return; }
        location.reload();
      } else if (f.dataset.lzForm === 'mfa') {
        const { data: fa } = await sb.auth.mfa.listFactors();
        const faktor = (fa && fa.totp || []).find((x) => x.status === 'verified');
        if (!faktor) throw new Error('Kein zweiter Faktor gefunden.');
        const { error } = await sb.auth.mfa.challengeAndVerify({ factorId: faktor.id, code: String(d.code || '').replace(/\D/g, '') });
        if (error) throw new Error('Der Code stimmt nicht. Bitte den aktuellen Code aus der App eingeben.');
        location.reload();
      } else if (f.dataset.lzForm === 'passwort') {
        const { error } = await sb.auth.updateUser({ password: d.passwort });
        if (error) throw error;
        history.replaceState(null, '', location.pathname); location.reload();
      } else {
        const { error } = await sb.auth.signInWithPassword({ email: d.email.trim(), password: d.passwort });
        if (error) throw error;
        location.reload();
      }
    } catch (fehler) {
      const t = String(fehler.message || fehler);
      m.textContent = /Invalid login/i.test(t) ? 'E-Mail oder Passwort stimmt nicht.' : /not confirmed/i.test(t) ? 'Bitte zuerst die E-Mail bestätigen (Link in Ihrem Postfach).'
        : /already registered/i.test(t) ? 'Mit dieser E-Mail gibt es schon ein Konto. Bitte anmelden.' : /rate limit/i.test(t) ? 'Bitte ein paar Minuten warten und nochmals versuchen.' : t;
      if (/not confirmed/i.test(t) && d.email) { bestaetigenKarte(d.email.trim(), 'Ihre E-Mail ist noch nicht bestätigt.'); return; }
    } finally { knopf.disabled = false; }
  });

  /* ---------- Lizenz prüfen ---------- */
  // Hinweis zur Lizenz: immer im Menü; als Pille unten links nur wenn dringend (oder auf dem Computer auf der Startseite)
  function pille(html, lesen, dringend) {
    imMenue(html, lesen);
    const zeigen = lesen || dringend || (PRODUKT === 'start' && innerWidth > 820);
    if (!zeigen) return;
    const a = document.createElement('a');
    a.className = 'lz-pille' + (lesen ? ' lesen' : ''); a.href = KAUFEN; a.innerHTML = html;
    anhaengen(a);
  }
  function imMenue(html, lesen, versuch = 0) {
    const leiste = document.querySelector('.nv-leiste .nv-kopf');
    if (!leiste) { if (versuch < 20) setTimeout(() => imMenue(html, lesen, versuch + 1), 250); return; }
    if (document.querySelector('.lz-menue')) return;
    const a = document.createElement('a'); a.className = 'lz-menue' + (lesen ? ' lesen' : ''); a.href = KAUFEN; a.innerHTML = html;
    leiste.insertAdjacentElement('afterend', a);
  }
  function demoPille() {
    const a = document.createElement('a');
    a.className = 'lz-pille'; a.href = '#'; a.innerHTML = 'Demo-Ansicht · <b>Eigenes Konto</b>';
    a.title = 'Das ist das Demo-Konto. Alle mit dem Demo-Login sehen dieselben Daten.';
    a.onclick = async (ev) => { ev.preventDefault(); demoAus(); await sb.auth.signOut({ scope: 'local' }); location.reload(); };
    anhaengen(a);
  }
  function sperre(titel, text, mitLesen) {
    zeigen(`${SYMBOL}<h2>${esc(titel)}</h2><p>${text}</p>
      <a class="lz-knopf" href="${KAUFEN}">Lizenz kaufen</a>
      <a class="lz-knopf zweit" href="mailto:support@ordasio.ch?subject=${encodeURIComponent('Lizenz: ' + titel)}">Frage per E-Mail</a>
      ${mitLesen ? '<button class="lz-link" data-lz-lesen>Daten nur ansehen und herunterladen</button>' : ''}
      <button class="lz-link" data-lz-abmelden>Abmelden</button>`);
  }
  async function pruefen() {
    const { data: { session } } = await sb.auth.getSession();
    if (!session) {
      const willNeu = /[?&#](paket|neu)=/.test(location.href);
      if (demoErlaubt() && !willNeu) {
        const { error } = await sb.auth.signInWithPassword(K.demo);
        if (!error) { location.reload(); return; }
      }
      anmelden(willNeu ? 'neu' : 'anmelden'); return;
    }
    if (window.OrdasioKonten && !(await window.OrdasioKonten.pruefen(session.user.id))) return;
    try {
      const { data: a } = await sb.auth.mfa.getAuthenticatorAssuranceLevel();
      if (a && a.nextLevel === 'aal2' && a.currentLevel !== 'aal2') {
        zeigen(`${SYMBOL}<h2>Bestätigungscode</h2><p>Ihr Konto ist mit Zwei-Faktor geschützt. Bitte geben Sie den 6-stelligen Code aus Ihrer Authenticator-App ein.</p>
          <form data-lz-form="mfa"><label>Code<input name="code" inputmode="numeric" autocomplete="one-time-code" pattern="[0-9 ]{6,7}" maxlength="7" required autofocus></label><p class="lz-meldung" data-lz-meldung></p><button class="lz-knopf">Bestätigen</button></form>
          <button class="lz-link" data-lz-mfa-ab>Abmelden</button>`);
        return;
      }
    } catch {}
    const { data: l, error } = await sb.from('lizenzen').select('*').eq('user_id', session.user.id).maybeSingle();
    if (error || !l) { sperre('Lizenz nicht gefunden', 'Zu Ihrem Konto gibt es noch keine Lizenz. Bitte melden Sie sich bei uns.', false); return; }
    window.NASUVIA_LIZENZ = l;
    // Empfehlung nachtragen (z. B. nach Anmeldung mit Google/Apple)
    try { const em = localStorage.getItem('ordasio.empf'); if (em && !l.empfohlen_von) { sb.rpc('empfehlung_setzen', { p_code: em }).then(() => localStorage.removeItem('ordasio.empf')); } else if (em) localStorage.removeItem('ordasio.empf'); } catch {}
    if (window.OrdasioKonten) window.OrdasioKonten.merken({ uid: session.user.id, email: session.user.email, firma: l.firma || l.name || '', paket: l.paket, rechtsform: l.rechtsform });
    try { localStorage.setItem('ordasio.lizenz', JSON.stringify({ paket: l.paket, rechtsform: l.rechtsform, status: l.status, zusatz: l.zusatz || {}, branche: l.branche || '' })); } catch {}
    try { document.dispatchEvent(new CustomEvent('ordasio-lizenz', { detail: l })); } catch {}
    const h = heute();
    const gueltig = l.status !== 'gesperrt' && ((l.status === 'test' && l.test_bis >= h) || (l.status === 'aktiv' && (l.gueltig_bis || '') >= h));
    if (PRODUKT === 'start' && l.paket === 'privat') { location.replace(KAUFEN.replace(/lizenz\/$/, 'privat/')); return; }
    // Bereich gehört zu einem Zusatzpaket: erklären, was es bringt, und per Knopfdruck dazubuchen
    const zm = O && O.modulFuer && O.modulFuer(PRODUKT);
    if (!darf(l) && zm && O.kannBuchen(l, zm.id) && gueltig) {
      const pr = O.preis({ paket: l.paket, module: [...O.gebucht(l), zm.id], zyklus: 'monat' });
      zeigen(`<div class="lz-modul"><span class="lz-modul-ic">${zm.icon}</span><small>Zusatzpaket</small><h2>${esc(zm.name)}</h2>
        <p>${esc(zm.erklaerung)}</p><ul>${zm.was.map((w) => `<li>${esc(w)}</li>`).join('')}</ul>
        <p class="lz-preis"><b>CHF ${zm.monat}</b> pro Monat${pr && pr.prozent ? ` · mit Kombi-Rabatt ${pr.prozent} % auf alle Zusatzpakete` : ''}</p>
        <button class="lz-knopf" data-lz-modul="${zm.id}">Jetzt dazubuchen</button>
        <a class="lz-knopf zweit" href="${KAUFEN}#zusatzpakete">Alle Zusatzpakete vergleichen</a>
        <a class="lz-link" href="${KAUFEN.replace(/lizenz\/$/, 'start/')}" style="text-align:center;text-decoration:none">Zurück zum Start</a></div>`);
      return;
    }
    if (!darf(l)) {
      const besser = O && O.ab(PRODUKT === 'start' ? 'start' : PRODUKT, l.rechtsform || 'einzel');
      const text = `Ihr Paket „${esc(paketName(l.paket))}“ enthält ${NAME} nicht.` + (besser ? ` Das gibt es ab dem Paket „${esc(besser.name)}“ (CHF ${besser.monat} pro Monat).` : '');
      if (besser && l.status === 'test' && gueltig) {
        zeigen(`${SYMBOL}<h2>Nicht in Ihrem Paket</h2><p>${text} Während des Gratis-Tests können Sie gratis wechseln.</p>
          <button class="lz-knopf" data-lz-wechsel="${besser.id}">Zu „${esc(besser.name)}“ wechseln</button>
          <a class="lz-knopf zweit" href="${KAUFEN}">Alle Pakete ansehen</a>
          <a class="lz-link" href="${KAUFEN.replace(/lizenz\/$/, 'start/')}" style="text-align:center;text-decoration:none">Zurück zum Start</a>`);
      } else sperre('Nicht in Ihrem Paket', text, false);
      return;
    }
    if (!gueltig && PRODUKT !== 'konto') {
      sperre(l.status === 'gesperrt' ? 'Zugang gesperrt' : l.status === 'test' ? 'Ihr Gratis-Test ist abgelaufen' : 'Ihre Lizenz ist abgelaufen',
        'Ihre Daten sind sicher gespeichert und bleiben erhalten. Sobald die Lizenz bezahlt ist, geht es genau dort weiter, wo Sie aufgehört haben.', true);
      return;
    }
    weg();
    if (istDemo(session)) { window.NASUVIA_DEMO = true; demoPille(); return; }
    const tage = Math.round((new Date((l.status === 'test' ? l.test_bis : l.gueltig_bis) + 'T12:00') - new Date(h + 'T12:00')) / 864e5);
    if (l.status === 'test') pille(`Gratis-Test: noch ${tage} ${tage === 1 ? 'Tag' : 'Tage'} · <b>Lizenz kaufen</b>`, false, tage <= 7);
    else if (tage <= 21) pille(`Lizenz läuft am ${dk(l.gueltig_bis)} ab · <b>Verlängern</b>`, false, tage <= 7);
  }
  sb.auth.onAuthStateChange((ereignis) => {
    if (ereignis === 'PASSWORD_RECOVERY') zeigen(`${SYMBOL}<h2>Neues Passwort</h2><form data-lz-form="passwort"><label>Neues Passwort (mindestens 8 Zeichen)<input name="passwort" type="password" minlength="8" autocomplete="new-password" required></label><p class="lz-meldung" data-lz-meldung></p><button class="lz-knopf">Speichern</button></form>`);
    if (ereignis === 'SIGNED_OUT') location.reload();
    if (ereignis === 'SIGNED_IN' && wartetAufBestaetigung) location.reload();
  });
  window.NasuviaLizenz = { pruefen, abmelden: async () => { demoAus(); await sb.auth.signOut({ scope: 'local' }); location.reload(); } };
  const keineVerbindung = () => sperre('Keine Verbindung', 'Bitte prüfen Sie Ihre Internetverbindung und laden Sie die Seite neu.', false);
  // Links aus den Ordasio-Mails (Bestätigen, Anmeldelink, Passwort, neue E-Mail) führen direkt hierher: ?token_hash=…&type=…
  const URLP = new URLSearchParams(location.search);
  const tokenHash = URLP.get('token_hash'), tokenTyp = URLP.get('type');
  if (tokenHash && /^(signup|email|magiclink|recovery|invite|email_change)$/.test(tokenTyp || '')) {
    URLP.delete('token_hash'); URLP.delete('type');
    try { history.replaceState(null, '', location.pathname + (URLP.toString() ? '?' + URLP : '') + location.hash); } catch {}
    (async () => {
      const { error } = await sb.auth.verifyOtp({ token_hash: tokenHash, type: tokenTyp });
      if (error) {
        const { data: { session } } = await sb.auth.getSession();
        if (session && tokenTyp !== 'recovery') { pruefen().catch(keineVerbindung); return; }
        zeigen(`${SYMBOL}<h2>Link nicht mehr gültig</h2><p>Dieser Link ist abgelaufen oder wurde schon verwendet. ${tokenTyp === 'recovery' ? 'Fordern Sie bei der Anmeldung unter „Passwort vergessen“ einen neuen Link an.' : 'Melden Sie sich einfach mit E-Mail und Passwort an. Ist Ihre E-Mail noch nicht bestätigt, können Sie dort einen neuen Link anfordern.'}</p>
          <a class="lz-knopf" href="${esc(location.pathname)}?anmelden">Zur Anmeldung</a>`);
        return;
      }
      if (tokenTyp !== 'recovery') pruefen().catch(keineVerbindung);
    })().catch(keineVerbindung);
  } else if (!/type=recovery/.test(location.hash)) pruefen().catch(keineVerbindung);
})();

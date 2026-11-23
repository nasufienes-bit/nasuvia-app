// Lizenz der verkauften Version: Anmelden, Gratis-Test, Paket und Ablauf.
// Läuft nur in der Verkaufsversion (konfig.js → produkt). Der Server prüft zusätzlich: ohne gültige Lizenz wird nichts gespeichert.
// Einbinden: <script src="pakete.js"></script><script src="lizenz.js" data-produkt="buchhaltung|rechnungen|privat|zeit|termine|lager|start"></script>
(() => {
  const K = window.NASUVIA_KONFIG || {};
  if (!K.produkt) return;
  const skript = document.currentScript || {};
  const PRODUKT = (skript.dataset && skript.dataset.produkt) || 'buchhaltung';
  const NAME = { buchhaltung: 'die Buchhaltung', rechnungen: 'das Rechnungsprogramm', privat: 'das Home-Büro', zeit: 'die Zeiterfassung', termine: 'die Online-Terminbuchung', lager: 'das Lager', start: 'Ordasio' }[PRODUKT];
  // Pakete und Rechtsformen kommen aus pakete.js (vor lizenz.js einbinden)
  const O = window.ORDASIO || null;
  const paketName = (id) => (O && O.paket(id) ? O.paket(id).name : id);
  const darf = (id) => !O || O.darf(id, PRODUKT);
  const KAUFEN = (() => { try { return new URL('lizenz/', new URL('.', skript.src)).href; } catch { return '/lizenz/'; } })();
  const esc = (s) => String(s ?? '').replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
  const heute = () => new Date().toLocaleDateString('sv-SE');
  const dk = (d) => (d ? d.slice(8, 10) + '.' + d.slice(5, 7) + '.' + d.slice(0, 4) : '');
  const sb = window.supabase.createClient(K.url, K.key, { auth: { persistSession: true, autoRefreshToken: true, storageKey: K.speicher, detectSessionInUrl: true } });
  // Vorzeige-Modus (konfig.js → demo): ohne Anmeldung ins Demo-Konto. Wer sich bewusst abmeldet oder ?anmelden an die Adresse hängt, sieht wieder die Anmeldung.
  const OHNE_DEMO = 'nk.ohneDemo';
  try { if (/[?&]anmelden\b/.test(location.search)) sessionStorage.setItem(OHNE_DEMO, '1'); } catch {}
  const demoErlaubt = () => { try { return !!K.demo && sessionStorage.getItem(OHNE_DEMO) !== '1'; } catch { return !!K.demo; } };
  const demoAus = () => { try { sessionStorage.setItem(OHNE_DEMO, '1'); } catch {} };
  const istDemo = (s) => !!(K.demo && s && s.user && s.user.email === K.demo.email);

  const stil = document.createElement('style');
  stil.textContent = `
  .lz-decke{position:fixed;inset:0;z-index:100000;background:rgba(247,249,253,.97);backdrop-filter:blur(8px);-webkit-backdrop-filter:blur(8px);display:grid;place-items:center;padding:18px;font-family:'League Spartan',-apple-system,system-ui,sans-serif;color:#0A1F17;overflow:auto}
  .lz-karte{width:min(440px,100%);background:#fff;border-radius:24px;padding:26px;box-shadow:0 30px 80px -30px rgba(12,18,38,.45)}
  .lz-karte h2{font-size:1.6rem;line-height:1.15;margin:10px 0 6px;letter-spacing:-.02em}
  .lz-karte p{color:#3F5A4F;font-size:15px;line-height:1.5;margin:0 0 14px}
  .lz-symbol{width:52px;height:52px;border-radius:16px;background:linear-gradient(135deg,#0B3B2E,#0E7A55);display:grid;place-items:center}
  .lz-symbol svg{width:26px;height:26px;stroke:#fff;fill:none;stroke-width:2;stroke-linecap:round;stroke-linejoin:round}
  .lz-reiter{display:flex;background:#E8F4EE;border-radius:100px;padding:4px;margin:4px 0 16px}
  .lz-reiter button{flex:1;border:0;background:none;border-radius:100px;padding:9px;font:inherit;font-weight:500;color:#3F5A4F;cursor:pointer}
  .lz-reiter button.an{background:#fff;color:#0B3B2E;font-weight:700;box-shadow:0 2px 8px rgba(12,18,38,.08)}
  .lz-karte label{display:grid;gap:4px;font-size:13px;color:#3F5A4F;margin-bottom:10px}
  .lz-karte input,.lz-karte select{font:inherit;font-size:16px;border:1px solid rgba(11,59,46,.26);border-radius:12px;padding:11px 12px;background:#fff;color:#0A1F17;width:100%}
  .lz-knopf{display:block;width:100%;border:0;border-radius:100px;padding:13px;font:inherit;font-weight:700;font-size:16px;cursor:pointer;background:#0B3B2E;color:#fff;text-align:center;text-decoration:none;margin-top:6px}
  .lz-knopf.zweit{background:#E8F4EE;color:#0B3B2E}
  .lz-link{display:block;margin:12px auto 0;background:none;border:0;color:#0E7A55;font:inherit;font-size:14px;cursor:pointer}
  .lz-hinweis{font-size:13px!important;margin:-4px 0 10px!important;color:#3F5A4F}
  .lz-meldung{min-height:1.3em;font-size:14px;color:#C53030;margin:4px 0 6px}
  .lz-meldung.ok{color:#0A7150}
  .lz-pille{position:fixed;left:14px;bottom:calc(14px + env(safe-area-inset-bottom,0px));z-index:9000;background:#0A1F17;color:#fff;border-radius:100px;padding:8px 14px;font:600 13px 'League Spartan',system-ui,sans-serif;box-shadow:0 10px 30px -10px rgba(12,18,38,.5);text-decoration:none}
  .lz-pille b{color:#6EE7A8}
  .lz-pille.lesen{background:#B4282D}
  @media(max-width:820px){.lz-pille{bottom:calc(76px + env(safe-area-inset-bottom,0px))}}`;
  document.head.appendChild(stil);

  const decke = document.createElement('div');
  decke.className = 'lz-decke';
  decke.innerHTML = '<div class="lz-karte"><p>Wird geladen …</p></div>';
  // Erst anhängen, wenn die Seite einen <body> hat (lizenz.js steht teils im <head>)
  const anhaengen = (el) => { if (document.body) document.body.appendChild(el); else document.addEventListener('DOMContentLoaded', () => document.body.appendChild(el), { once: true }); };
  const zeigen = (html) => { decke.querySelector('.lz-karte').innerHTML = html; if (!decke.isConnected) anhaengen(decke); };
  const weg = () => decke.remove();
  anhaengen(decke);
  const SYMBOL = '<img src="' + KAUFEN.replace(/lizenz\/$/, 'logo.png') + '" alt="Ordasio" style="height:34px;display:block">';

  /* ---------- Anmelden und Konto erstellen ---------- */
  function paketOptionen(rechtsform, gewaehlt) {
    if (!O) return '';
    const liste = O.fuer(rechtsform);
    const wahl = liste.some((p) => p.id === gewaehlt) ? gewaehlt : O.vorgabe(rechtsform);
    return liste.map((p) => `<option value="${p.id}" ${p.id === wahl ? 'selected' : ''}>${esc(p.name)} · ${esc(p.kurz)} · CHF ${p.monat}/Mt.</option>`).join('');
  }
  function anmelden(modus = 'anmelden', meldung = '') {
    const q = new URLSearchParams(location.search);
    const rfVorgabe = (O && O.RECHTSFORMEN[q.get('rechtsform')]) ? q.get('rechtsform') : (PRODUKT === 'privat' ? 'privat' : 'einzel');
    const paketVorgabe = (O && O.paket(q.get('paket'))) ? O.passend(q.get('paket'), rfVorgabe) : (O ? O.vorgabe(rfVorgabe) : '');
    zeigen(`${SYMBOL}<h2>${modus === 'neu' ? '30 Tage gratis testen' : 'Willkommen zurück'}</h2>
      <p>${modus === 'neu' ? 'Konto erstellen und sofort loslegen. Keine Zahlung nötig.' : `Melden Sie sich an, um ${NAME} zu öffnen.`}</p>
      <div class="lz-reiter"><button class="${modus === 'anmelden' ? 'an' : ''}" data-lz-modus="anmelden">Anmelden</button><button class="${modus === 'neu' ? 'an' : ''}" data-lz-modus="neu">Konto erstellen</button></div>
      <form data-lz-form="${modus}">
        ${modus === 'neu' ? `<label>Vor- und Nachname<input name="name" autocomplete="name" required></label>
          ${O ? `<label>Ihre Firma ist …<select name="rechtsform" data-lz-rechtsform>${Object.entries(O.RECHTSFORMEN).map(([k, r]) => `<option value="${k}" ${k === rfVorgabe ? 'selected' : ''}>${esc(r.name)}${k === 'privat' ? ' (nur private Finanzen)' : ''}</option>`).join('')}</select></label>` : ''}
          <label data-lz-firmafeld ${rfVorgabe === 'privat' ? 'hidden' : ''}>Firmenname <span>(freiwillig)</span><input name="firma" autocomplete="organization"></label>
          ${O ? `<label>Paket<select name="paket" data-lz-paket>${paketOptionen(rfVorgabe, paketVorgabe)}</select></label>
          <p class="lz-hinweis" data-lz-rfhinweis>${rechtsformHinweis(rfVorgabe)}</p>` : ''}` : ''}
        <label>E-Mail<input name="email" type="email" autocomplete="username" required></label>
        <label>Passwort${modus === 'neu' ? ' <span>(mindestens 8 Zeichen)</span>' : ''}<input name="passwort" type="password" autocomplete="${modus === 'neu' ? 'new-password' : 'current-password'}" required minlength="${modus === 'neu' ? 8 : 6}"></label>
        <p class="lz-meldung ${meldung.startsWith('✓') ? 'ok' : ''}" data-lz-meldung>${esc(meldung)}</p>
        <button class="lz-knopf">${modus === 'neu' ? 'Gratis-Test starten' : 'Anmelden'}</button>
      </form>
      ${modus === 'anmelden' ? '<button class="lz-link" data-lz-vergessen>Passwort vergessen?</button>' : '<p style="font-size:12.5px;margin-top:12px">Ihre Daten liegen verschlüsselt in der Schweiz (Zürich) und gehören Ihnen. Nur Sie sehen sie. Paket und Rechtsform können Sie während des Tests jederzeit ändern.</p>'}`);
  }
  function rechtsformHinweis(rf) {
    return { einzel: 'Einfache Buchhaltung ohne Fachbegriffe. Die doppelte Buchhaltung lässt sich jederzeit zuschalten.',
      gmbh: 'Mit doppelter Buchhaltung nach Schweizer KMU-Kontenrahmen, Bilanz und Erfolgsrechnung nach OR.',
      ag: 'Mit doppelter Buchhaltung nach Schweizer KMU-Kontenrahmen, Bilanz und Erfolgsrechnung nach OR.',
      privat: 'Für Ihre privaten Finanzen: Konto, Abos, Rechnungen und Fristen.' }[rf] || '';
  }
  decke.addEventListener('change', (e) => {
    const r = e.target.closest('[data-lz-rechtsform]'); if (!r) return;
    const f = r.form, p = f.querySelector('[data-lz-paket]');
    if (p) p.innerHTML = paketOptionen(r.value, O.passend(p.value, r.value));
    const h = f.querySelector('[data-lz-rfhinweis]'); if (h) h.textContent = rechtsformHinweis(r.value);
    const ff = f.querySelector('[data-lz-firmafeld]'); if (ff) ff.hidden = r.value === 'privat';
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
    if (t.dataset.lzWechsel) {
      e.preventDefault(); t.disabled = true;
      const l0 = window.NASUVIA_LIZENZ || {};
      const { error } = await sb.rpc('paket_wechseln', { p_paket: t.dataset.lzWechsel, p_rechtsform: l0.rechtsform || 'einzel' });
      if (error) { t.disabled = false; alert(error.message); return; }
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
          options: { emailRedirectTo: location.origin + location.pathname, data: { name: d.name.trim(), firma: (d.firma || '').trim(), paket: d.paket || '', rechtsform: d.rechtsform || 'einzel', zyklus: 'jahr' } } });
        if (error) throw error;
        if (!data.session) { anmelden('anmelden', '✓ Fast geschafft: Bitte bestätigen Sie Ihre E-Mail über den Link, den wir Ihnen gerade geschickt haben.'); return; }
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
    } finally { knopf.disabled = false; }
  });

  /* ---------- Lizenz prüfen ---------- */
  function pille(html, lesen) {
    const a = document.createElement('a');
    a.className = 'lz-pille' + (lesen ? ' lesen' : ''); a.href = KAUFEN; a.innerHTML = html;
    anhaengen(a);
  }
  function demoPille() {
    const a = document.createElement('a');
    a.className = 'lz-pille'; a.href = '#'; a.innerHTML = 'Demo-Ansicht · <b>Eigenes Konto</b>';
    a.title = 'Das ist ein Vorzeige-Konto. Eingaben sehen auch andere Besucher.';
    a.onclick = async (ev) => { ev.preventDefault(); demoAus(); await sb.auth.signOut({ scope: 'local' }); location.reload(); };
    anhaengen(a);
  }
  function sperre(titel, text, mitLesen) {
    zeigen(`${SYMBOL}<h2>${esc(titel)}</h2><p>${text}</p>
      <a class="lz-knopf" href="${KAUFEN}">Lizenz kaufen</a>
      <a class="lz-knopf zweit" href="mailto:info@nasuvia.ch?subject=${encodeURIComponent('Lizenz: ' + titel)}">Frage per E-Mail</a>
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
    const { data: l, error } = await sb.from('lizenzen').select('*').eq('user_id', session.user.id).maybeSingle();
    if (error || !l) { sperre('Lizenz nicht gefunden', 'Zu Ihrem Konto gibt es noch keine Lizenz. Bitte melden Sie sich bei uns.', false); return; }
    window.NASUVIA_LIZENZ = l;
    try { document.dispatchEvent(new CustomEvent('ordasio-lizenz', { detail: l })); } catch {}
    const h = heute();
    const gueltig = l.status !== 'gesperrt' && ((l.status === 'test' && l.test_bis >= h) || (l.status === 'aktiv' && (l.gueltig_bis || '') >= h));
    if (!darf(l.paket)) {
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
    if (!gueltig) {
      sperre(l.status === 'gesperrt' ? 'Zugang gesperrt' : l.status === 'test' ? 'Ihr Gratis-Test ist abgelaufen' : 'Ihre Lizenz ist abgelaufen',
        'Ihre Daten sind sicher gespeichert und bleiben erhalten. Sobald die Lizenz bezahlt ist, geht es genau dort weiter, wo Sie aufgehört haben.', true);
      return;
    }
    weg();
    if (istDemo(session)) { demoPille(); return; }
    const tage = Math.round((new Date((l.status === 'test' ? l.test_bis : l.gueltig_bis) + 'T12:00') - new Date(h + 'T12:00')) / 864e5);
    if (l.status === 'test') pille(`Gratis-Test: noch ${tage} ${tage === 1 ? 'Tag' : 'Tage'} · <b>Lizenz kaufen</b>`);
    else if (tage <= 21) pille(`Lizenz läuft am ${dk(l.gueltig_bis)} ab · <b>Verlängern</b>`);
  }
  sb.auth.onAuthStateChange((ereignis) => {
    if (ereignis === 'PASSWORD_RECOVERY') zeigen(`${SYMBOL}<h2>Neues Passwort</h2><form data-lz-form="passwort"><label>Neues Passwort (mindestens 8 Zeichen)<input name="passwort" type="password" minlength="8" autocomplete="new-password" required></label><p class="lz-meldung" data-lz-meldung></p><button class="lz-knopf">Speichern</button></form>`);
    if (ereignis === 'SIGNED_OUT') location.reload();
  });
  window.NasuviaLizenz = { pruefen, abmelden: async () => { demoAus(); await sb.auth.signOut({ scope: 'local' }); location.reload(); } };
  if (!/type=recovery/.test(location.hash)) pruefen().catch(() => sperre('Keine Verbindung', 'Bitte prüfen Sie Ihre Internetverbindung und laden Sie die Seite neu.', false));
})();

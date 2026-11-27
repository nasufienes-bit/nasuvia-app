// Schutz vor automatisch erstellten Konten: Cloudflare Turnstile vor Registrieren, Anmelden, Passwort vergessen und Mail-Link.
// Ohne Site-Key in konfig.js (turnstile) passiert nichts. Meist unsichtbar; nur bei Verdacht erscheint unten ein kleines Kästchen.
(() => {
  if (window.OrdasioCaptcha) return;
  const K = window.NASUVIA_KONFIG || {};
  const schluessel = K.turnstile || '';
  let laden = null, box = null, wid = null, warten = null;

  const skript = () => laden || (laden = new Promise((ok, nein) => {
    if (window.turnstile) return ok();
    const s = document.createElement('script');
    s.src = 'https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit';
    s.async = true; s.onload = () => ok(); s.onerror = () => { laden = null; nein(new Error('Sicherheitsprüfung konnte nicht geladen werden.')); };
    document.head.appendChild(s);
  }));

  function kasten() {
    if (box) return box;
    const st = document.createElement('style');
    st.textContent = '.oc-kasten{position:fixed;left:50%;bottom:24px;transform:translateX(-50%);z-index:2147483000;background:#fff;border:1px solid #E1E9E5;border-radius:16px;padding:12px 14px 10px;box-shadow:0 12px 40px rgba(10,31,23,.18);display:none;font:14px/1.4 system-ui,sans-serif;color:#3F5A4F;text-align:center}.oc-kasten.an{display:block}.oc-kasten p{margin:0 0 8px}';
    document.head.appendChild(st);
    box = document.createElement('div'); box.className = 'oc-kasten';
    box.innerHTML = '<p>Kurze Sicherheitsprüfung</p><div></div>';
    document.body.appendChild(box);
    return box;
  }
  const fertig = (wert) => { const w = warten; warten = null; if (box) box.classList.remove('an'); if (w) w(wert); };

  async function token() {
    if (!schluessel) return undefined;
    await skript();
    kasten();
    if (warten) fertig(undefined);
    const p = new Promise((ok) => { warten = ok; });
    if (wid === null) {
      wid = window.turnstile.render(box.lastElementChild, {
        sitekey: schluessel, appearance: 'interaction-only', execution: 'execute', language: 'de',
        callback: (t) => fertig(t),
        'error-callback': () => { fertig(undefined); return true; },
        'expired-callback': () => {},
        'timeout-callback': () => fertig(undefined),
        'before-interactive-callback': () => box.classList.add('an'),
        'after-interactive-callback': () => box.classList.remove('an'),
      });
    } else window.turnstile.reset(wid);
    window.turnstile.execute(wid);
    // Nach 90 Sekunden aufgeben, damit das Formular nie hängen bleibt
    setTimeout(() => { if (warten) fertig(undefined); }, 90000);
    return p;
  }
  const istFehler = (t) => /captcha/i.test(String(t || ''));
  const TEXT = 'Die Sicherheitsprüfung hat nicht geklappt. Bitte die Seite neu laden und nochmals versuchen.';
  window.OrdasioCaptcha = { an: !!schluessel, token, istFehler, TEXT };
})();

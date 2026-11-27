// Mitteilungen aufs Handy (Web Push). Ein- und ausschalten pro Gerät, Themen pro Konto,
// geplante Mitteilungen abgleichen (z. B. Home-Büro: Kalender, Rechnungen, Fristen).
// Auf dem iPhone nur, wenn Ordasio als App auf dem Home-Bildschirm liegt (ab iOS 16.4).
(() => {
  if (window.OrdasioPush) return;
  const K = window.NASUVIA_KONFIG || {};
  const WURZEL = ((document.currentScript && document.currentScript.src) || '').replace(/push\.js(\?.*)?$/, '') || '/';
  const THEMEN = [
    ['fristen', 'Fristen, Kalender und Erinnerungen', 'Termine aus dem Kalender, Steuer- und MWST-Fristen, Ihre Erinnerungen', 'alle'],
    ['zahlungen', 'Zahlungen fällig', 'Rechnungen und Betreibungen im Home-Büro, kurz vor der Frist', 'privat'],
    ['steuern', 'Steuererklärung', 'Erinnerung an die Frist der Steuererklärung', 'privat'],
    ['rechnungen', 'Rechnungen und Offerten', 'Kunde hat geöffnet, Offerte angenommen', 'firma'],
    ['team', 'Team', 'Anträge, Anfragen, Spesen und Material von Mitarbeitenden', 'firma'],
    ['termine', 'Online-Termine', 'Neue Buchung durch Kunden', 'firma'],
    ['support', 'Antworten vom Ordasio-Team', 'Wenn wir auf Ihre Frage antworten', 'alle'],
  ];
  const istIos = /iphone|ipad|ipod/i.test(navigator.userAgent) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
  const alsApp = () => (window.matchMedia && matchMedia('(display-mode: standalone)').matches) || navigator.standalone === true;
  const kann = () => 'serviceWorker' in navigator && 'PushManager' in window && 'Notification' in window;
  const sb = () => window.NASUVIA_SB;
  const zuBytes = (s) => { s = s.replace(/-/g, '+').replace(/_/g, '/'); while (s.length % 4) s += '='; return Uint8Array.from(atob(s), (c) => c.charCodeAt(0)); };
  const b64u = (b) => btoa(String.fromCharCode(...new Uint8Array(b))).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
  async function token() { try { const s = (await sb().auth.getSession()).data.session; return s && s.access_token; } catch { return ''; } }
  async function funktion(aktion) {
    const t = await token();
    const r = await fetch(K.url + '/functions/v1/push', { method: 'POST', headers: { 'Content-Type': 'application/json', apikey: K.key, ...(t ? { Authorization: 'Bearer ' + t } : {}) }, body: JSON.stringify({ aktion }) });
    const j = await r.json().catch(() => ({})); if (!r.ok) throw new Error(j.fehler || 'Das hat nicht geklappt.'); return j;
  }
  async function registrierung() {
    let r = await navigator.serviceWorker.getRegistration(WURZEL);
    if (!r) r = await navigator.serviceWorker.register(WURZEL + 'sw.js', { scope: WURZEL });
    return navigator.serviceWorker.ready.then(() => r);
  }
  const geraetName = () => { const u = navigator.userAgent; return (/iphone/i.test(u) ? 'iPhone' : /ipad/i.test(u) ? 'iPad' : /android/i.test(u) ? 'Android' : /mac/i.test(u) ? 'Mac' : /windows/i.test(u) ? 'Windows' : 'Gerät') + (alsApp() ? ' (App)' : ' (Browser)'); };

  async function status() {
    if (!kann()) return { zustand: istIos && !alsApp() ? 'ios-app' : 'nicht' };
    if (Notification.permission === 'denied') return { zustand: 'blockiert' };
    try { const r = await navigator.serviceWorker.getRegistration(WURZEL); const s = r && await r.pushManager.getSubscription(); return { zustand: s ? 'an' : 'aus' }; } catch { return { zustand: 'aus' }; }
  }
  async function einschalten() {
    if (!kann()) throw new Error(istIos && !alsApp() ? 'Auf dem iPhone gehen Mitteilungen nur, wenn Ordasio als App auf dem Home-Bildschirm liegt: In Safari auf Teilen tippen, «Zum Home-Bildschirm», dann Ordasio von dort öffnen.' : 'Dieser Browser kann keine Mitteilungen empfangen.');
    const erlaubt = await Notification.requestPermission();
    if (erlaubt !== 'granted') throw new Error('Mitteilungen wurden nicht erlaubt. Sie können das in den Einstellungen des Handys bei Ordasio ändern.');
    const reg = await registrierung();
    const { schluessel } = await funktion('schluessel');
    let s = await reg.pushManager.getSubscription();
    if (s && s.options && s.options.applicationServerKey && b64u(s.options.applicationServerKey) !== schluessel) { await s.unsubscribe(); s = null; }
    if (!s) s = await reg.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: zuBytes(schluessel) });
    const j = s.toJSON();
    const { error } = await sb().rpc('push_abo_speichern', { p_endpoint: j.endpoint, p_p256dh: j.keys.p256dh, p_auth: j.keys.auth, p_geraet: geraetName() });
    if (error) throw error;
    try { localStorage.setItem('ordasio.pushAn', '1'); } catch { /* leer */ }
    document.dispatchEvent(new CustomEvent('ordasio-push'));
    return true;
  }
  async function ausschalten() {
    try { const r = await navigator.serviceWorker.getRegistration(WURZEL); const s = r && await r.pushManager.getSubscription(); if (s) { await sb().rpc('push_abo_entfernen', { p_endpoint: s.endpoint }); await s.unsubscribe(); } } catch { /* leer */ }
    try { localStorage.removeItem('ordasio.pushAn'); } catch { /* leer */ }
    document.dispatchEvent(new CustomEvent('ordasio-push'));
  }
  async function themenLaden() {
    const { data } = await sb().from('push_einstellungen').select('themen').maybeSingle();
    return (data && data.themen) || {};
  }
  async function themenSetzen(t) { const { error } = await sb().rpc('push_themen_setzen', { p_themen: t }); if (error) throw error; }
  // Geplante Mitteilungen eines Bereichs: [{ id, wann (Date oder ISO), titel, text, url, thema }]
  let warten = {};
  function planen(bereich, liste) {
    clearTimeout(warten[bereich]);
    warten[bereich] = setTimeout(async () => {
      const l = (liste || []).filter((x) => x && x.wann && x.id).map((x) => ({ ...x, wann: new Date(x.wann).toISOString() }));
      const kurz = JSON.stringify(l); try { if (sessionStorage.getItem('ordasio.pushPlan.' + bereich) === kurz) return; } catch { /* leer */ }
      if (!sb()) return;
      const { error } = await sb().rpc('push_planen', { p_bereich: bereich, p_liste: l });
      if (!error) try { sessionStorage.setItem('ordasio.pushPlan.' + bereich, kurz); } catch { /* leer */ }
    }, 1500);
  }
  window.OrdasioPush = { THEMEN, status, einschalten, ausschalten, test: () => funktion('test'), themenLaden, themenSetzen, planen, istIos, alsApp };
})();

/* Ordasio – mehrere Firmen auf einem Gerät.
   Jede Firma ist ein eigenes Konto mit eigener Lizenz. Damit sich die Daten auf dem Gerät nie vermischen,
   wird beim Wechsel alles Lokale der bisherigen Firma beiseitegelegt (IndexedDB „ordasio-ablage-konten“)
   und das der neuen Firma zurückgeholt. Der Abgleich mit dem Server wartet, bis das erledigt ist.
   Einbinden VOR abgleich.js und lizenz.js: <script src="konten.js"></script>
*/
(function () {
  'use strict';
  if (window.OrdasioKonten) return;
  const LS = /^(nasuvia\.|homebuero|nb\.(?!anmeldung)|nr\.|ze\.|ordasio\.(?!konten$|besitzer$))/;
  const DBS = ['nasuvia-buchhaltung', 'nasuvia-rechnungen', 'homebuero-dateien'];
  const ABLAGE = 'ordasio-ablage-konten';
  const lies = (k, v) => { try { const x = JSON.parse(localStorage.getItem(k)); return x == null ? v : x; } catch { return v; } };
  const schreib = (k, v) => { try { localStorage.setItem(k, JSON.stringify(v)); } catch {} };
  const anfrage = (r) => new Promise((ok, f) => { r.onsuccess = () => ok(r.result); r.onerror = () => f(r.error); });

  async function vorhanden() {
    try { if (indexedDB.databases) return (await indexedDB.databases()).map((d) => d.name); } catch {}
    return DBS; // ältere Browser: versuchen, Fehler werden abgefangen
  }
  async function dbAuslesen(name) {
    const db = await anfrage(indexedDB.open(name));
    const aus = {};
    for (const s of Array.from(db.objectStoreNames)) {
      const st = db.transaction(s).objectStore(s), liste = [];
      await new Promise((ok, f) => { const c = st.openCursor(); c.onsuccess = () => { const z = c.result; if (!z) return ok(); liste.push([z.key, z.value]); z.continue(); }; c.onerror = () => f(c.error); });
      aus[s] = { inline: st.keyPath != null, liste };
    }
    const version = db.version; db.close();
    return { version, aus };
  }
  async function dbLeeren(name) {
    const db = await anfrage(indexedDB.open(name));
    const namen = Array.from(db.objectStoreNames);
    if (namen.length) { const t = db.transaction(namen, 'readwrite'); namen.forEach((s) => t.objectStore(s).clear()); await new Promise((ok) => { t.oncomplete = ok; t.onerror = ok; }); }
    db.close();
  }
  async function dbFuellen(name, inhalt) {
    const r = indexedDB.open(name, inhalt.version);
    r.onupgradeneeded = () => Object.keys(inhalt.aus).forEach((s) => { if (!r.result.objectStoreNames.contains(s)) r.result.createObjectStore(s, inhalt.aus[s].inline ? { keyPath: 'id' } : undefined); });
    const db = await anfrage(r);
    const namen = Object.keys(inhalt.aus).filter((s) => db.objectStoreNames.contains(s));
    if (namen.length) {
      const t = db.transaction(namen, 'readwrite');
      namen.forEach((s) => { const st = t.objectStore(s); inhalt.aus[s].liste.forEach(([k, v]) => { if (st.keyPath != null) st.put(v); else st.put(v, k); }); });
      await new Promise((ok) => { t.oncomplete = ok; t.onerror = ok; });
    }
    db.close();
  }
  const ablageDb = () => { const r = indexedDB.open(ABLAGE, 1); r.onupgradeneeded = () => r.result.createObjectStore('konten'); return anfrage(r); };
  async function ablegen(uid) {
    const paket = { ls: {}, dbs: {}, am: Date.now() };
    for (let i = 0; i < localStorage.length; i++) { const k = localStorage.key(i); if (LS.test(k)) paket.ls[k] = localStorage.getItem(k); }
    const da = await vorhanden();
    for (const n of DBS) if (da.includes(n)) { try { paket.dbs[n] = await dbAuslesen(n); } catch {} }
    const db = await ablageDb(); const t = db.transaction('konten', 'readwrite'); t.objectStore('konten').put(paket, uid);
    await new Promise((ok, f) => { t.oncomplete = ok; t.onerror = () => f(t.error); }); db.close();
    // erst nach erfolgreichem Ablegen leeren
    Object.keys(paket.ls).forEach((k) => localStorage.removeItem(k));
    for (const n of Object.keys(paket.dbs)) { try { await dbLeeren(n); } catch {} }
  }
  async function zurueckholen(uid) {
    const db = await ablageDb();
    const paket = await anfrage(db.transaction('konten').objectStore('konten').get(uid)); db.close();
    if (!paket) return false;
    Object.entries(paket.ls || {}).forEach(([k, v]) => { try { localStorage.setItem(k, v); } catch {} });
    for (const [n, inhalt] of Object.entries(paket.dbs || {})) { try { await dbFuellen(n, inhalt); } catch {} }
    const db2 = await ablageDb(); const t = db2.transaction('konten', 'readwrite'); t.objectStore('konten').delete(uid);
    await new Promise((ok) => { t.oncomplete = ok; t.onerror = ok; }); db2.close();
    return true;
  }

  // Wird aufgerufen, sobald klar ist, wer angemeldet ist. true = alles bereit, false = es wurde getauscht (Seite lädt neu).
  let laeuft = null, laeuftFuer = null;
  function pruefen(uid) {
    if (!uid) return Promise.resolve(true);
    if (laeuft && laeuftFuer === uid) return laeuft;
    laeuftFuer = uid;
    laeuft = (async () => {
      const besitzer = localStorage.getItem('ordasio.besitzer');
      if (!besitzer) { localStorage.setItem('ordasio.besitzer', uid); return true; }
      if (besitzer === uid) return true;
      try {
        await ablegen(besitzer);
        await zurueckholen(uid);
        localStorage.setItem('ordasio.besitzer', uid);
      } catch (f) { console.error('Kontowechsel', f); return true; }
      location.reload();
      return false;
    })();
    return laeuft;
  }

  // Liste der Firmen auf diesem Gerät (für den Wechsel)
  const liste = () => lies('ordasio.konten', []);
  function merken(eintrag) {
    if (!eintrag || !eintrag.uid) return;
    const l = liste().filter((x) => x.uid !== eintrag.uid);
    l.unshift(Object.assign({}, liste().find((x) => x.uid === eintrag.uid) || {}, eintrag, { zuletzt: Date.now() }));
    schreib('ordasio.konten', l.slice(0, 12));
  }
  function vergessen(uid) { schreib('ordasio.konten', liste().filter((x) => x.uid !== uid)); }

  window.OrdasioKonten = { pruefen, liste, merken, vergessen };
})();

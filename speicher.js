// Speicher der Buchhaltung: IndexedDB auf dem Gerät.
// Jeder Datensatz trägt id, geaendert und geloescht. „offen“ heisst: noch nicht
// mit Supabase abgeglichen. Nach jeder lokalen Änderung meldet sich der Speicher
// über Speicher.beiAenderung, damit der Abgleich anlaufen kann.
(() => {
  const NAME = 'nasuvia-buchhaltung';
  const VERSION = 2;
  // journal: manuelle Soll/Haben-Buchungen der doppelten Buchhaltung (seit Version 2)
  const SPEICHER = ['buchungen', 'belege', 'einstellungen', 'journal'];
  let offen;

  const anfrage = (r) => new Promise((ok, fehler) => {
    r.onsuccess = () => ok(r.result);
    r.onerror = () => fehler(r.error);
  });

  function db() {
    if (!offen) {
      const r = indexedDB.open(NAME, VERSION);
      r.onupgradeneeded = () => {
        for (const s of SPEICHER) {
          if (!r.result.objectStoreNames.contains(s)) r.result.createObjectStore(s, { keyPath: 'id' });
        }
      };
      offen = anfrage(r);
    }
    return offen;
  }

  async function laden(speicher) {
    const d = await db();
    return anfrage(d.transaction(speicher).objectStore(speicher).getAll());
  }

  async function holen(speicher, id) {
    const d = await db();
    return anfrage(d.transaction(speicher).objectStore(speicher).get(id));
  }

  async function schreiben(speicher, eintraege) {
    const d = await db();
    const t = d.transaction(speicher, 'readwrite');
    const s = t.objectStore(speicher);
    for (const e of eintraege) s.put(e);
    return new Promise((ok, fehler) => { t.oncomplete = ok; t.onerror = () => fehler(t.error); });
  }

  const gemeldet = () => { try { window.Speicher.beiAenderung && window.Speicher.beiAenderung(); } catch {} };

  const neueId = () => (crypto.randomUUID ? crypto.randomUUID()
    : 'id-' + Date.now().toString(36) + Math.random().toString(36).slice(2));

  // Rückgängig: vor jeder Änderung den alten Stand merken; Änderungen kurz hintereinander zählen als ein Schritt
  let schrittListe = null, schrittTimer = null;
  async function merken(speicher, ids, art = 'speichern') {
    if (!window.Speicher || !window.Speicher.rueckgaengigAktiv) return;
    if (!schrittListe) schrittListe = new Map();
    for (const id of ids) {
      const k = speicher + '|' + id;
      if (!schrittListe.has(k)) schrittListe.set(k, { speicher, id, art, vorher: id ? await holen(speicher, id) : null });
    }
    clearTimeout(schrittTimer);
    schrittTimer = setTimeout(schrittAbschliessen, 350);
  }
  function schrittAbschliessen() {
    const liste = schrittListe ? [...schrittListe.values()] : []; schrittListe = null;
    if (!liste.length || !window.Speicher.nachAktion) return;
    window.Speicher.nachAktion(liste, () => rueckgaengig(liste));
  }
  async function rueckgaengig(liste) {
    const jetzt = new Date().toISOString();
    for (const e of liste) {
      if (e.vorher) await schreiben(e.speicher, [{ ...e.vorher, geaendert: jetzt, offen: true }]);
      else { const neu = await holen(e.speicher, e.id); if (neu) await schreiben(e.speicher, [{ ...neu, ...(e.speicher === 'belege' ? { daten: null } : {}), geloescht: true, geaendert: jetzt, offen: true }]); }
    }
    gemeldet();
    if (window.Speicher.nachRueckgaengig) await window.Speicher.nachRueckgaengig();
  }

  window.Speicher = {
    neueId,
    // Nur gültige (nicht gelöschte) Datensätze
    async alle(speicher) {
      return (await laden(speicher)).filter((e) => !e.geloescht);
    },
    alleMitGeloeschten: laden,
    holen,
    async speichern(speicher, eintrag) {
      const e = { ...eintrag, id: eintrag.id || neueId(), geaendert: new Date().toISOString(), offen: true };
      await merken(speicher, [e.id]);
      await schreiben(speicher, [e]);
      gemeldet();
      return e;
    },
    // Viele auf einmal löschen (z. B. einen ganzen Bankimport)
    async mehrereLoeschen(speicher, ids) {
      const liste = [];
      for (const id of ids) { const e = await holen(speicher, id); if (e && !e.geloescht) liste.push(e); }
      if (!liste.length) return 0;
      await merken(speicher, liste.map((e) => e.id), 'loeschen');
      const jetzt = new Date().toISOString();
      await schreiben(speicher, liste.map((e) => ({ ...e, ...(speicher === 'belege' ? { daten: null } : {}), geloescht: true, geaendert: jetzt, offen: true })));
      gemeldet();
      return liste.length;
    },
    async mehrereSpeichern(speicher, liste) {
      const jetzt = new Date().toISOString();
      const fertig = liste.map((e) => ({ ...e, id: e.id || neueId(), geaendert: e.geaendert || jetzt, offen: true }));
      await merken(speicher, fertig.map((e) => e.id));
      await schreiben(speicher, fertig);
      gemeldet();
      return fertig;
    },
    // Für den Abgleich: schreibt genau so, wie es kommt (Zeitstempel und offen bleiben)
    async roh(speicher, liste) {
      await schreiben(speicher, liste);
    },
    // Gelöscht wird nur markiert, damit andere Geräte die Löschung mitbekommen
    async loeschen(speicher, id) {
      const e = await holen(speicher, id);
      if (!e) return;
      await merken(speicher, [id], 'loeschen');
      const leer = speicher === 'belege' ? { daten: null } : {};
      await schreiben(speicher, [{ ...e, ...leer, geloescht: true, geaendert: new Date().toISOString(), offen: true }]);
      gemeldet();
    },
    async dauerhaftAnfragen() {
      try { if (navigator.storage && navigator.storage.persist) await navigator.storage.persist(); } catch {}
    },
  };
})();

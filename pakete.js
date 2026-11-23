// Rechtsformen und Pakete von Ordasio: eine Quelle für Anmeldung, Lizenz-Seite, Startseite und Programme.
// Preise in CHF (exkl. MWST), jährlich = 10 Monatspreise (2 Monate gratis).
// programme: welche Bereiche das Paket öffnet (Namen wie data-produkt in lizenz.js; „lohn“ ist die Lohnabrechnung in der Buchhaltung).
(() => {
  const RECHTSFORMEN = {
    einzel: { name: 'Einzelunternehmen', kurz: 'Einzelfirma', text: 'Selbständig, Einzelfirma, auch nebenberuflich' },
    gmbh: { name: 'GmbH', kurz: 'GmbH', text: 'Gesellschaft mit beschränkter Haftung' },
    ag: { name: 'AG', kurz: 'AG', text: 'Aktiengesellschaft' },
    privat: { name: 'Privatperson', kurz: 'Privat', text: 'Nur private Finanzen (Home-Büro)' },
  };

  const PAKETE = [
    { id: 'start', name: 'Start', rechtsformen: ['einzel', 'gmbh', 'ag'], monat: 12, jahr: 120, mitarbeiter: 0,
      programme: ['start', 'rechnungen', 'termine'],
      kurz: 'Rechnungen und Online-Termine',
      was: ['Unbegrenzt QR-Rechnungen', 'Offerten, Gutschriften, Mahnungen', 'Abos und eigene Vorlagen', 'Online-Termine für Kunden', 'Logo und Farben Ihrer Firma'] },
    { id: 'solo', name: 'Solo', rechtsformen: ['einzel'], monat: 22, jahr: 220, mitarbeiter: 0, top: ['einzel'],
      programme: ['start', 'rechnungen', 'termine', 'buchhaltung', 'privat'],
      kurz: 'Rechnungen und Buchhaltung für Selbständige',
      was: ['Alles aus Start', 'Buchhaltung ohne Fachbegriffe', 'Belege, Bankauszug, MWST-Abrechnung', 'Abschluss für die Steuererklärung', 'Doppelte Buchhaltung zuschaltbar', 'Home-Büro inklusive', 'Treuhänder-Zugang gratis'] },
    { id: 'team', name: 'Team', rechtsformen: ['einzel'], monat: 39, jahr: 390, mitarbeiter: 3,
      programme: ['start', 'rechnungen', 'termine', 'buchhaltung', 'privat', 'zeit', 'lager', 'lohn'],
      kurz: 'Für Einzelfirmen mit Mitarbeitenden',
      was: ['Alles aus Solo', 'Zeiterfassung per Handy-Link, 3 Mitarbeitende inklusive', 'Einsatzplanung und Aufträge mit Fotos', 'Lohnabrechnung', 'Lager und Material'] },
    { id: 'business', name: 'Business', rechtsformen: ['gmbh', 'ag'], monat: 39, jahr: 390, mitarbeiter: 0, top: ['gmbh', 'ag'],
      programme: ['start', 'rechnungen', 'termine', 'buchhaltung', 'privat'],
      kurz: 'Doppelte Buchhaltung für GmbH und AG',
      was: ['Alles aus Start', 'Doppelte Buchhaltung nach KMU-Kontenrahmen', 'Bilanz und Erfolgsrechnung nach OR', 'Debitoren, Kreditoren, Eröffnungsbilanz', 'MWST-Abrechnung und Verbuchung', 'Jahresabschluss mit Festschreiben', 'Treuhänder-Zugang mit Journal-Export'] },
    { id: 'business_team', name: 'Business Team', rechtsformen: ['gmbh', 'ag'], monat: 69, jahr: 690, mitarbeiter: 5,
      programme: ['start', 'rechnungen', 'termine', 'buchhaltung', 'privat', 'zeit', 'lager', 'lohn'],
      kurz: 'GmbH und AG mit Mitarbeitenden',
      was: ['Alles aus Business', 'Zeiterfassung per Handy-Link, 5 Mitarbeitende inklusive', 'Einsatzplanung und Aufträge mit Fotos', 'Lohnabrechnung, Löhne direkt verbucht', 'Lager und Material'] },
    { id: 'privat', name: 'Home-Büro', rechtsformen: ['privat'], monat: 3, jahr: 29, mitarbeiter: 0, top: ['privat'],
      programme: ['privat'],
      kurz: 'Private Finanzen',
      was: ['Kontoauszüge und Übersicht', 'Abos und Fixkosten', 'Rechnungen, Fristen, Betreibungen', 'Budget und Sparziele'] },
  ];
  // Frühere Pakete (vor November 2026) zeigen auf die neuen
  const FRUEHER = { rechnungen: 'start', buchhaltung: 'solo', kombi: 'team' };
  const ZUSATZ_MITARBEITER = { monat: 5, jahr: 50 };
  const EINRICHTUNG = 190;

  const paket = (id) => PAKETE.find((p) => p.id === (FRUEHER[id] || id)) || null;
  const fuer = (rechtsform) => PAKETE.filter((p) => p.rechtsformen.includes(rechtsform));
  const vorgabe = (rechtsform) => ({ einzel: 'solo', gmbh: 'business', ag: 'business', privat: 'privat' }[rechtsform] || 'solo');
  // Passt ein Paket nicht zur Rechtsform, das entsprechende der anderen Seite nehmen
  function passend(id, rechtsform) {
    const p = paket(id);
    if (p && p.rechtsformen.includes(rechtsform)) return p.id;
    const tausch = { solo: 'business', team: 'business_team', business: 'solo', business_team: 'team' }[p && p.id];
    const t = tausch && paket(tausch);
    return t && t.rechtsformen.includes(rechtsform) ? t.id : vorgabe(rechtsform);
  }
  const darf = (paketId, programm) => { const p = paket(paketId); return !!p && p.programme.includes(programm); };
  // Kleinstes Paket der Rechtsform, das ein Programm enthält (für „ab Paket …“-Hinweise)
  const ab = (programm, rechtsform) => fuer(rechtsform).find((p) => p.programme.includes(programm)) || null;
  const doppelt = (rechtsform) => rechtsform === 'gmbh' || rechtsform === 'ag';

  window.ORDASIO = { RECHTSFORMEN, PAKETE, FRUEHER, ZUSATZ_MITARBEITER, EINRICHTUNG, paket, fuer, vorgabe, passend, darf, ab, doppelt };
})();

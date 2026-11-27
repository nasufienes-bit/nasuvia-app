/* Ordasio – Gesamtarbeitsverträge (GAV) pro Branche: Mindestlöhne, Arbeitszeit, Ferien, 13. Monatslohn und Beiträge.
   Stand 2026, aus den Lohnvereinbarungen der Sozialpartner. Werte, die hier fehlen, waren nicht verlässlich belegt:
   dann zeigt Ordasio einen Hinweis statt einer Zahl. Jede Firma kann die Beiträge in den Lohnsätzen selbst anpassen.
   kategorien: [Name, Mindestlohn CHF pro Monat (100 %) oder null, Mindestlohn CHF pro Stunde oder null]
   beitraege: anChf/agChf = fixe Franken pro Monat und Person, anPct/agPct = Prozent vom Bruttolohn */
(function () {
  'use strict';
  var L = [
    { id: 'elektro', name: 'Elektro- und Telekommunikationsbranche', kurz: 'GAV Elektro', ave: true, gebiet: 'Ganze Schweiz (AVE)',
      branchen: ['handwerk'], jahresstunden: 2088, dreizehnter: true, ferien: null,
      kategorien: [['Elektroinstallateur/in EFZ, nach Lehrabschluss', 4500, null], ['Elektroinstallateur/in EFZ, ab 1 Jahr Erfahrung in der Schweiz', 5000, 28.85],
        ['Montage-Elektriker/in EFZ, nach Lehrabschluss', 4300, null], ['Montage-Elektriker/in EFZ, ab 1 Jahr Erfahrung', 4700, null],
        ['Telematiker/in EFZ, nach Lehrabschluss', 4770, null], ['Telematiker/in EFZ, ab 1 Jahr Erfahrung', 5300, null],
        ['Ohne Berufsabschluss, nach 2 Jahren Erfahrung', 4500, 25.96]],
      beitraege: { anChf: 21, agChf: 21, text: 'Vollzugskosten CHF 11 und Aus- und Weiterbildung CHF 10 pro Monat, je für Arbeitnehmende und Arbeitgeber.' },
      hinweis: 'Mindestlöhne 2026 unverändert, Erhöhung um CHF 100 ab 2027.', quelle: 'https://www.eit.swiss' },
    { id: 'gebaeudetechnik', name: 'Gebäudetechnikbranche (Sanitär, Heizung, Lüftung, Spengler)', kurz: 'GAV Gebäudetechnik', ave: true, gebiet: 'Ganze Schweiz (ohne GE, VD, VS)',
      branchen: ['handwerk'], jahresstunden: 2088, dreizehnter: true, ferien: null,
      kategorien: [['Installateur/in EFZ, ab Lehrabschluss', 4600, 26.54], ['Installateur/in EFZ, ab 3. Jahr nach Lehrabschluss', 5100, 29.43], ['Installateur/in EFZ, ab 5. Jahr nach Lehrabschluss', 5300, 30.58],
        ['Installateur/in EBA, ab Lehrabschluss', 4100, 23.66], ['Installateur/in EBA, ab 3. Jahr', 4300, 24.81], ['Installateur/in EBA, ab 5. Jahr', 4500, 25.97],
        ['Ohne Ausbildung (ab 20 Jahren), 1. Jahr der Anstellung', 4000, 23.08], ['Ohne Ausbildung, ab 3. Jahr der Anstellung', 4100, 23.66], ['Ohne Ausbildung, ab 5. Jahr der Anstellung', 4300, 24.81]],
      beitraege: { anChf: 25, agChf: 25, text: 'Vollzugskosten CHF 20 und Weiterbildung CHF 5 pro Monat, je für Arbeitnehmende und Arbeitgeber. Arbeitgeber zusätzlich CHF 240 Grundbeitrag pro Jahr.' },
      hinweis: 'Stundenlohn = Monatslohn geteilt durch 173.3.', quelle: 'https://suissetec.ch' },
    { id: 'maler', name: 'Maler- und Gipsergewerbe (Deutschschweiz)', kurz: 'GAV Maler und Gipser', ave: true, gebiet: 'ZH (ohne Gipser Stadt ZH), BE, LU, UR, SZ, OW, NW, GL, ZG, SO, SH, AR, AI, SG, GR, AG, TG, JU',
      branchen: ['handwerk'], jahresstunden: 2088, dreizehnter: true, ferien: { bis20: 27, ab20: 22, ab50: 27, text: '27 Arbeitstage bis 20 Jahre, 22 Tage von 20 bis 50, ab 50 wieder 27 Tage.' },
      kategorien: [['Maler: Vorarbeiter (V)', 5744], ['Maler: Baustellenleiter (Q)', 5300], ['Maler: gelernter Berufsarbeiter, 3+ Jahre (A)', 5051], ['Maler: Berufsarbeiter (B)', 4667], ['Maler: Hilfsarbeiter (C)', 4429], ['Maler: Branchenfremder (D)', 4147],
        ['Maler: Lehrabgänger EFZ, 1. Jahr', 4351], ['Maler: Lehrabgänger EFZ, 2. Jahr', 4586], ['Maler: Lehrabgänger EFZ, 3. Jahr', 4850], ['Maler: Lehrabgänger EBA, 1. Jahr', 4004],
        ['Gipser: Vorarbeiter (V)', 5956], ['Gipser: gelernter Berufsarbeiter, 3+ Jahre (A)', 5267], ['Gipser: Berufsarbeiter (B)', 4841], ['Gipser: Hilfsarbeiter (C)', 4590], ['Gipser: Branchenfremder (D)', 4258],
        ['Gipser: Lehrabgänger EFZ, 1. Jahr', 4513], ['Gipser: Lehrabgänger EFZ, 2. Jahr', 4747], ['Gipser: Lehrabgänger EFZ, 3. Jahr', 5066]],
      beitraege: { anChf: 10, agChf: 15, text: 'Vollzugskosten: Arbeitnehmende CHF 10 pro Monat, Arbeitgeber CHF 10 plus CHF 5 pro Person und Monat. Dazu Weiterbildung (Gimafonds) und Vorruhestand VRM gemäss Abrechnung der Kasse.' },
      hinweis: 'Gültig ab 1. April 2026. 40 Stunden pro Woche, 2088 Stunden im Jahr. Kategorien B, C und D ab 18 Jahren.', quelle: 'https://www.seco.admin.ch' },
    { id: 'schreiner', name: 'Schreinergewerbe', kurz: 'GAV Schreiner', ave: true, gebiet: 'Deutschschweiz und Tessin (AVE)',
      branchen: ['handwerk'], jahresstunden: 2164, dreizehnter: true, ferien: null,
      kategorien: [['Berufsarbeiter/in, ab 24 Jahren', 5447, 30.20], ['Monteur/in, ab 24 Jahren', 5605, 31.10], ['Hilfskraft (ungelernt), ab 24 Jahren', 4292, 23.80]],
      beitraege: null, hinweis: 'Weitere Kategorien (jüngere Mitarbeitende, Lehrabgänger) in der Lohntabelle des GAV.', quelle: 'https://www.seco.admin.ch' },
    { id: 'lmv', name: 'Bauhauptgewerbe (Landesmantelvertrag LMV)', kurz: 'LMV Bau', ave: true, gebiet: 'Ganze Schweiz',
      branchen: ['handwerk'], jahresstunden: null, dreizehnter: true, ferien: { text: 'Mindestens 5 Wochen.' },
      kategorien: [['Vorarbeiter (V)', null], ['Baufacharbeiter (Q)', null], ['Bauarbeiter mit Fachkenntnissen (A)', null], ['Bauarbeiter ohne Fachkenntnisse (B)', null], ['Bauarbeiter (C)', null]],
      beitraege: null, hinweis: 'Mindestlöhne je nach Lohnklasse und Lohnzone (Region). Ordasio zeigt hier keine Zahlen, weil sie regional abweichen: Lohntabelle der SVK (svk-bau.ch) verwenden. Frühpensionierung FAR und Parifonds Bau gemäss Abrechnung der Stiftungen als Prozent in den Lohnsätzen eintragen. Ab 2026 Baustellenzulage CHF 4 pro Arbeitstag.', quelle: 'https://www.svk-bau.ch' },
    { id: 'lgav', name: 'Gastgewerbe (L-GAV)', kurz: 'L-GAV Gastgewerbe', ave: true, gebiet: 'Ganze Schweiz',
      branchen: ['gastro'], jahresstunden: 2184, dreizehnter: true, ferien: { wochen: 5, text: '5 Wochen Ferien und 6 bezahlte Feiertage. Im Stundenlohn: Ferien 10.65 %, Feiertage 2.27 %, 13. Monatslohn 8.33 %.' }, stundenZuschlag: 10.65,
      kategorien: [['Ohne Berufsausbildung (Ia)', 3713, 20.40], ['Ohne Berufsausbildung mit Progresso (Ib)', 3943, 21.66], ['Mit Berufsattest EBA (II)', 4070, 22.36], ['Mit Berufslehre EFZ (IIIa)', 4528, 24.88],
        ['Mit Berufslehre EFZ und 6 Tagen Weiterbildung (IIIb)', 4635, 25.47], ['Mit Berufsprüfung (IV)', 5293, 29.08]],
      beitraege: { anChf: 7.42, agChf: 0, text: 'Vollzugskosten CHF 89 pro Jahr vom Lohn (hier CHF 7.42 pro Monat).' },
      hinweis: 'Basis 42 Stunden pro Woche. Bei Neueinstellung in der Probezeit bis 8 % tiefer möglich. Kantonale Mindestlöhne (z. B. GE, NE) gehen vor.', quelle: 'https://www.l-gav.ch' },
    { id: 'reinigung', name: 'Reinigungsbranche (Deutschschweiz)', kurz: 'GAV Reinigung', ave: true, gebiet: 'Deutschschweiz',
      branchen: ['garten'], jahresstunden: null, dreizehnter: true, ferien: { text: '5 Wochen bis 20 Jahre, 4 Wochen ab 21, 5 Wochen ab 50 mit 5 Dienstjahren. 9 bezahlte Feiertage.' }, stundenZuschlag: 8.33,
      kategorien: [['Unterhaltsreinigung (pro Stunde)', null, 21.40], ['Unterhaltsreinigung mit GAV-Lehrgang', null, 22.90], ['Spezialreinigung', null, 23.40], ['Spezialreinigung mit GAV-Lehrgang', null, 24.90],
        ['Spitalreinigung', null, 21.85], ['Fahrzeugreinigung', null, 23.20], ['Reinigungsfachkraft EBA (Monatslohn)', 4200, null], ['Reinigungsfachkraft EFZ (Monatslohn)', 4700, null]],
      beitraege: null, hinweis: 'Stundenlöhne ohne Zuschläge: dazu Ferien (8.33 % bei 4 Wochen), Feiertage (1.5 bis 3.1 %) und Anteil 13. Monatslohn (8.33 %). 13. Monatslohn ab 3 Monaten Anstellung. Krankentaggeld ab dem 3. Tag.', quelle: 'https://www.unia.ch' },
    { id: 'coiffeur', name: 'Coiffeurgewerbe', kurz: 'GAV Coiffeur', ave: true, gebiet: 'Ganze Schweiz',
      branchen: ['beauty'], jahresstunden: null, dreizehnter: false, ferien: null,
      kategorien: [['Coiffeur/euse EFZ, 1. Berufsjahr', 4160], ['Coiffeur/euse EFZ, ab 3. Berufsjahr', 4360]],
      beitraege: null, hinweis: 'Im 1. und 2. Berufsjahr nach EFZ sind Abzüge bis CHF 200 bzw. CHF 100 möglich. Ein 13. Monatslohn ist im GAV nicht vorgeschrieben.', quelle: 'https://www.coiffuresuisse.ch' },
  ];
  var finde = function (id) { return L.filter(function (g) { return g.id === id; })[0] || null; };
  var fuerBranche = function (b) { return L.filter(function (g) { return g.branchen.indexOf(b) >= 0; }); };
  // Mindestlohn einer Kategorie für den gegebenen Lohn (Monat oder Stunde) prüfen
  function pruefen(gav, katIndex, lohnart, lohnRappen, pensum) {
    var g = typeof gav === 'string' ? finde(gav) : gav; if (!g) return null;
    var k = g.kategorien[katIndex]; if (!k) return null;
    var monat = k[1], stunde = k[2];
    if (lohnart === 'stunde') {
      var minStd = stunde != null ? stunde : (monat && g.jahresstunden ? Math.round(monat * 12 / g.jahresstunden * 100) / 100 : null);
      if (minStd == null) return { kategorie: k[0], mindest: null };
      return { kategorie: k[0], mindest: minStd, einheit: 'Stunde', ok: lohnRappen / 100 >= minStd - 0.005 };
    }
    var minMon = monat != null ? monat : (stunde != null && g.jahresstunden ? Math.round(stunde * g.jahresstunden / 12) : null);
    if (minMon == null) return { kategorie: k[0], mindest: null };
    return { kategorie: k[0], mindest: minMon, einheit: 'Monat (100 %)', ok: lohnRappen / 100 >= minMon - 0.5 };
  }
  window.OrdasioGAV = { LISTE: L, finde: finde, fuerBranche: fuerBranche, pruefen: pruefen };
})();

// Suche und Anleitung für alle Programme.
// Ein Suchfeld oben (oder Cmd/Strg+K): findet Funktionen und Anleitungen und springt direkt an die richtige Stelle.
// Die Anleitung unter hilfe/ benutzt dieselben Texte.
(() => {
  const skript = document.currentScript || {};
  const WURZEL = (() => { try { return new URL('.', skript.src).href; } catch { return '/'; } })();
  const B = WURZEL, R = WURZEL + 'rechnungen/', P = WURZEL + 'privat/', H = WURZEL + 'hilfe/', Z = WURZEL + 'zeit/', T = WURZEL + 'termine/', L = WURZEL + 'lager/';

  // id, Bereich, Titel, Suchwörter, Anleitung (Schritte), Ziel im Programm
  const ARTIKEL = [
    // Erste Schritte
    ['start', 'Erste Schritte', 'So starten Sie', 'anfang einstieg erste schritte konto anmelden registrieren test', [
      'Öffnen Sie app.nasuvia.ch und tippen Sie auf „Konto erstellen“.',
      'Wählen Sie Ihr Paket, geben Sie E-Mail und Passwort ein und bestätigen Sie den Link in Ihrer E-Mail.',
      'Melden Sie sich an. Ihr Gratis-Test läuft 30 Tage, unten sehen Sie, wie viele Tage noch bleiben.',
      'Richten Sie unter Einstellungen „Firma und Design“ ein, damit Ihr Logo auf den Rechnungen steht.'], B],
    ['homescreen', 'Erste Schritte', 'Als App auf das iPhone legen', 'iphone handy app home bildschirm android installieren symbol', [
      'Öffnen Sie app.nasuvia.ch in Safari (iPhone) oder Chrome (Android).',
      'iPhone: Teilen-Symbol, dann „Zum Home-Bildschirm“. Android: Menü ⋮, dann „App installieren“.',
      'Jetzt öffnet sich das Programm wie eine App, ohne Adressleiste.'], B],
    ['design', 'Erste Schritte', 'Logo, Farben und Firmendaten', 'logo farbe design firma adresse website marke uid mwst nummer briefkopf', [
      'Buchhaltung: Einstellungen, dann „Firma und Design anpassen“. Rechnungen: unten „Weitere Einstellungen“, dann „Firma und Design“.',
      'Automatisch: Ihre Website eingeben und „Übernehmen“ tippen. Logo, Name und Farben werden gelesen.',
      'Oder selbst: „Logo hochladen“ und Haupt- und Akzentfarbe wählen.',
      'Firmendaten ausfüllen (Adresse, Telefon, UID) und speichern. Sie erscheinen auf allen Rechnungen.'], B + '?aktion=firma'],
    ['geraete', 'Erste Schritte', 'Auf mehreren Geräten arbeiten', 'mac iphone geräte abgleich synchronisieren computer tablet', [
      'Melden Sie sich auf jedem Gerät mit demselben Konto an.',
      'Alles, was Sie erfassen, erscheint nach wenigen Sekunden auch auf den anderen Geräten.'], B],

    // Rechnungen
    ['rechnung', 'Rechnungen', 'Rechnung mit QR-Zahlteil schreiben', 'rechnung schreiben neu qr qr-rechnung einzahlungsschein zahlteil iban', [
      'Öffnen Sie „Rechnungen“. Wählen Sie oben unter „Geld geht an“ Ihr Konto (IBAN einmal eintragen).',
      'Kunde auswählen oder mit „Neu“ anlegen.',
      'Positionen mit Menge und Preis eintragen, MwSt-Satz wählen.',
      'Rechts sehen Sie die fertige Rechnung mit QR-Zahlteil. „Rechnung sichern“ erstellt das PDF, „Per E-Mail senden“ verschickt es.'], R],
    ['offerte', 'Rechnungen', 'Offerte schreiben und zur Rechnung machen', 'offerte angebot kostenvoranschlag umwandeln auftrag', [
      'Im Rechnungsprogramm oben bei „Rechnung“ auf „Offerte“ tippen. Die Offerte bekommt eine eigene Nummer (O-001).',
      'Ausfüllen und sichern wie eine Rechnung. Eine Offerte hat keinen Zahlteil.',
      'Bekommen Sie den Auftrag, tippen Sie in der Liste „Gesicherte Rechnungen“ bei der Offerte auf „Zu Rechnung“.'], R + '?dok=offerte'],
    ['gutschrift', 'Rechnungen', 'Gutschrift erstellen', 'gutschrift rückerstattung storno korrektur minus', [
      'Oben auf „Gutschrift“ tippen und unter „Zu Rechnung“ die ursprüngliche Rechnungsnummer eintragen.',
      'Beträge eintragen und sichern. Die Gutschrift wird vom Umsatz abgezogen.'], R + '?dok=gutschrift'],
    ['mahnung', 'Rechnungen', 'Zahlungserinnerung und Mahnung', 'mahnung mahnen erinnerung überfällig offen nicht bezahlt mahngebühr betreibung', [
      'Überfällige Rechnungen sind in der Liste „Gesicherte Rechnungen“ rot markiert.',
      'Tippen Sie auf „Erinnern“ für eine freundliche Zahlungserinnerung, später auf „Mahnen“ für die 1. und 2. Mahnung.',
      'Text, neue Frist und Mahngebühr sind schon ausgefüllt. Prüfen, sichern oder per E-Mail senden.'], R + '#archiv'],
    ['bezahlt', 'Rechnungen', 'Rechnung als bezahlt markieren', 'bezahlt zahlung eingang erhalten offen', [
      'In der Liste „Gesicherte Rechnungen“ bei der Rechnung auf „Bezahlt“ tippen.',
      'Mit dem Kombi-Paket wird die Zahlung automatisch auch in der Buchhaltung vermerkt. Noch schneller: Bankauszug importieren.'], R + '#archiv'],
    ['abo', 'Rechnungen', 'Wiederkehrende Rechnung (Abo)', 'abo wiederkehrend monatlich jährlich wartung miete serie dauerauftrag', [
      'Eine Rechnung fertig ausfüllen, dann „Als Abo einrichten“ tippen.',
      'Rhythmus (monatlich bis jährlich) und nächstes Datum wählen.',
      'Wenn sie fällig ist, steht sie unter „Wiederkehrende Rechnungen“. Ein Tipp auf „Erstellen“ genügt.'], R],
    ['rabatt', 'Rechnungen', 'Rabatt, Skonto und Runden', 'rabatt skonto rundung runden aufrunden abrunden 5 rappen franken prozent', [
      'In der Karte „Rabatt, Skonto und Rundung“ den Rabatt in Prozent eintragen. Er wird vor der MwSt. abgezogen.',
      'Skonto in Prozent und Frist eintragen. Es erscheint als Hinweis auf der Rechnung.',
      'Bei „Total runden“ z. B. „auf 5 Rappen“ und „Aufrunden“ oder „Abrunden“ wählen.'], R],
    ['zusatz', 'Rechnungen', 'Objekt-Nr., Kommission, Referenz', 'objekt objektnummer kommission auftragsnummer referenz projekt zusatz bestellnummer', [
      'In der Karte „Zusatzangaben“ das passende Feld ausfüllen.',
      'Es erscheint oben rechts auf der Rechnung. Leer lassen oder Häkchen entfernen, wenn es nicht erscheinen soll.'], R],
    ['vorlage', 'Rechnungen', 'Eigene Texte und Layout', 'vorlage layout text einleitung schlusstext standard modern minimal klassisch', [
      'Einleitung und Schlusstext anpassen, Layout wählen (Klassisch, Modern, Minimal).',
      '„Texte und Layout als Standard sichern“ tippen. Jede neue Rechnung beginnt dann so.'], R],
    ['kunden', 'Rechnungen', 'Kunden anlegen und importieren', 'kunde kunden adresse import excel csv liste kontakte', [
      'Einzeln: Bei „Rechnung an“ auf „Neu“ tippen.',
      'Viele auf einmal: unten „Weitere Einstellungen“, dann „Kunden importieren“ und eine CSV-Datei aus Excel wählen (Spalten Name, Strasse, PLZ, Ort, E-Mail).'], R],
    ['kopieren', 'Rechnungen', 'Alte Rechnung wiederverwenden', 'kopieren duplizieren alte rechnung wiederverwenden vorlage nochmals früher', [
      'In der Liste „Gesicherte Rechnungen“ suchen (Nummer oder Kunde) und „Kopieren“ tippen.',
      'Alles wird übernommen, mit neuer Nummer und heutigem Datum.'], R + '#archiv'],

    // Buchhaltung
    ['buchung', 'Buchhaltung', 'Einnahme oder Ausgabe erfassen', 'buchung buchen erfassen ausgabe einnahme quittung neu eintragen', [
      'In der Buchhaltung auf „+“ oder „Neue Buchung“ tippen.',
      'Ausgabe oder Einnahme wählen, Betrag inkl. MWST, Datum und Kategorie eintragen. Die MWST rechnet das Programm.',
      'Mit „Beleg hinzufügen“ ein Foto der Quittung anhängen.'], B + '?aktion=neu'],
    ['belege', 'Buchhaltung', 'Viele Belege auf einmal hochladen', 'belege quittungen fotos stapel mehrere hochladen scannen pdf', [
      'Unter „Buchungen“ auf „Belege hochladen“ tippen und mehrere Fotos oder PDFs wählen.',
      'Für jeden Beleg öffnet sich eine Buchung. Betrag und Kategorie eintragen, speichern, weiter zum nächsten.'], B + '?aktion=belege'],
    ['bank', 'Buchhaltung', 'Bankauszug importieren', 'bank bankauszug konto import camt csv e-banking ubs zkb postfinance raiffeisen kontoauszug', [
      'Im E-Banking den Kontoauszug als camt.053 (XML) oder CSV herunterladen.',
      'Unter „Buchungen“ auf „Bankauszug oder Daten importieren“ tippen und die Datei wählen.',
      'Kategorien werden vorgeschlagen, Zahlungen von Kunden werden offenen Rechnungen zugeordnet, Doppelte erkannt. Prüfen und übernehmen.'], B + '?aktion=bankImport'],
    ['import', 'Buchhaltung', 'Daten aus Excel oder einem anderen Programm', 'import excel altes programm wechseln übernehmen bexio daten bisherige', [
      'Exportieren Sie Ihre bisherigen Buchungen als CSV (Spalten Datum, Betrag, Text, wenn vorhanden Kategorie und MWST).',
      'Unter „Buchungen“ auf „Bankauszug oder Daten importieren“ tippen. Spalten werden automatisch erkannt.'], B + '?aktion=bankImport'],
    ['kategorien', 'Buchhaltung', 'Eigene Kategorien', 'kategorie kategorien konto eigene umbenennen farbe ausblenden', [
      'Einstellungen, dann „Kategorien anpassen“.',
      'Umbenennen, Farbe wählen, MWST-Satz festlegen, ausblenden oder mit „+ Kategorie“ neue anlegen.'], B + '?aktion=kategorien'],
    ['mwst', 'Buchhaltung', 'MWST-Abrechnung', 'mwst mehrwertsteuer abrechnung estv quartal vorsteuer ziffer', [
      'Ansicht „MWST“ öffnen und das Quartal wählen.',
      'Sie sehen die Werte mit den Ziffern des ESTV-Formulars (200, 299, 303, 399, 400, 405, 500).',
      'Ausgaben ohne Beleg werden angezeigt, damit Sie keinen Vorsteuerabzug verlieren.'], B + '?ansicht=mwst'],
    ['fahrt', 'Buchhaltung', 'Fahrten und Kilometer', 'fahrt fahrten kilometer km auto spesen fahrtenbuch reise', [
      '„Fahrt erfassen“ tippen, Kilometer und Zweck eintragen, bei Hin- und Rückfahrt Häkchen setzen.',
      'Die Fahrt wird mit dem Kilometer-Ansatz (Standard 0.70 CHF) als Ausgabe gebucht.'], B + '?aktion=fahrt'],
    ['auswertung', 'Buchhaltung', 'Auswertung und Diagramme', 'auswertung diagramm grafik statistik umsatz gewinn vorjahr vergleich kunden', [
      'Ansicht „Auswertung“ öffnen.',
      'Sie sehen Umsatz und Gewinn im Vergleich zum Vorjahr, den Gewinnverlauf, wofür Geld ausgegeben wird und Ihre besten Kunden.'], B + '?ansicht=auswertung'],
    ['zwischenbilanz', 'Buchhaltung', 'Zwischenbilanz per Knopfdruck', 'zwischenbilanz bilanz stichtag erfolgsrechnung zwischenabschluss heute', [
      'Auf der Übersicht „Zwischenbilanz“ tippen. Sie sehen Erfolgsrechnung und Bilanz bis heute.',
      'Für einen anderen Tag unter „Abschluss“ einen Stichtag wählen.',
      '„Als PDF drucken“ erstellt ein Dokument für Bank oder Treuhänder.'], B + '?aktion=zwischenbilanz'],
    ['abschluss', 'Buchhaltung', 'Jahresabschluss und Bilanz', 'abschluss jahresabschluss bilanz erfolgsrechnung steuererklärung treuhänder eigenkapital', [
      'Ansicht „Abschluss“ öffnen und das Jahr wählen.',
      'Bei der Bilanz Kontostände und Werte per 31.12. eintragen. Offene Rechnungen und MWST kommen automatisch.',
      '„Als PDF drucken“ und „Alle Buchungen als CSV“ für den Treuhänder.'], B + '?ansicht=abschluss'],
    ['lohn', 'Buchhaltung', 'Löhne und Lohnabrechnung', 'lohn löhne lohnabrechnung mitarbeiter ahv alv bvg pensionskasse quellensteuer lohnausweis gehalt', [
      'Ansicht „Löhne“ öffnen (am Handy unter „Mehr“) und „+ Mitarbeiter“ tippen.',
      'Monats- oder Stundenlohn, Pensum, Pensionskasse und Zulagen eintragen.',
      'Jeden Monat Stunden, Bonus oder Spesen eintragen, „Lohnlauf buchen“ tippen und bei jeder Person „Abrechnung“ für das PDF.',
      'Die Jahresübersicht liefert die Werte für den Lohnausweis. Sozialversicherungs-Sätze unten an Ihre Versicherungen anpassen.'], B + '?ansicht=loehne'],
    ['startseite', 'Buchhaltung', 'Startseite und Jahresziel anpassen', 'startseite übersicht anpassen jahresziel ziel karten', [
      'Einstellungen, Bereich „Startseite“.',
      'Wählen Sie, welche Karten erscheinen, geben Sie einen eigenen Titel und ein Jahresziel ein.'], B + '?ansicht=mehr'],
    ['suche-alt', 'Buchhaltung', 'Alte Buchungen finden', 'suchen alt früher vergangen letztes jahr finden buchung', [
      'Unter „Buchungen“ ins Suchfeld tippen. Mit Suchbegriff wird in allen Jahren gesucht.',
      'Eine Buchung öffnen und „Duplizieren“ tippen, um sie nochmals zu erfassen.'], B + '?ansicht=buchungen'],
    ['sicherung', 'Buchhaltung', 'Sicherung und Export', 'sicherung backup export herunterladen csv daten speichern', [
      'Einstellungen, „Sicherung speichern“: alle Buchungen und Belege in einer Datei.',
      'Abschluss: „Alle Buchungen als CSV“ für Excel oder den Treuhänder.'], B + '?ansicht=mehr'],

    // Home-Büro
    ['hb-start', 'Home-Büro', 'Home-Büro: Kontoauszug hochladen', 'home büro privat kontoauszug haushalt finanzen ausgaben', [
      'Home-Büro öffnen und „Kontoauszug hochladen“ tippen (CSV oder camt.053 aus dem E-Banking).',
      'Alle Zahlungen werden sortiert. Sie sehen, wofür Ihr Geld weggeht und was übrig bleibt.'], P],
    ['hb-abos', 'Home-Büro', 'Abos und Fixkosten finden', 'abos abonnement netflix spotify fixkosten kündigen sparen monatlich', [
      'Ansicht „Abos“ öffnen. Wiederkehrende Zahlungen werden automatisch erkannt.',
      'Unnötige Abos „Zum Kündigen vormerken“ und nach der Kündigung auf „Gekündigt“ setzen.'], P + '?tab=abos'],
    ['hb-rechnungen', 'Home-Büro', 'Private Rechnungen im Griff', 'rechnung offen bezahlt frist privat zahnarzt krankenkasse rückwirkend', [
      'Ansicht „Rechnungen“, dann „+ Rechnung erfassen“. Auch alte Rechnungen rückwirkend.',
      'Fällige Rechnungen erscheinen auf der Übersicht unter „Jetzt wichtig“. Bezahlte werden im Kontoauszug erkannt.'], P + '?tab=rechnungen'],
    ['hb-betreibung', 'Home-Büro', 'Betreibungen verfolgen', 'betreibung zahlungsbefehl rechtsvorschlag schulden abzahlung löschung register', [
      'Ansicht „Betreibungen“, dann „+ Betreibung erfassen“ mit Datum der Zustellung.',
      'Sie sehen die 10-Tage-Frist für den Rechtsvorschlag, Abzahlungen und den Restbetrag.'], P + '?tab=betreibung'],

    // Zeiterfassung
    ['ze-start', 'Zeiterfassung', 'Zeiterfassung: Mitarbeiter einrichten', 'zeiterfassung stunden mitarbeiter arbeitszeit rapport link handy', [
      'Im Menü „Zeiterfassung“ öffnen und „+ Mitarbeiter“ tippen. Name, Stundenlohn und Ansatz für Kunden eingeben.',
      'Danach erscheint der persönliche Link. Mit „Per WhatsApp senden“ geht er direkt aufs Handy des Mitarbeiters.',
      'Der Mitarbeiter braucht kein Konto und kein Passwort. Er sieht nur die eigenen Stunden.'], Z + '?tab=mitarbeiter'],
    ['ze-erfassen', 'Zeiterfassung', 'So erfassen Mitarbeiter ihre Stunden', 'stunden erfassen stempeln start stopp uhr nachtragen pause handy', [
      'Link öffnen und „Arbeit starten“ tippen. Am Abend „Stoppen und speichern“, Auftrag und Tätigkeit wählen.',
      'Vergessen? Mit „Stunden nachtragen“ geht es auch später, mit Von, Bis und Pause oder nur mit der Anzahl Stunden.',
      'Unten sieht der Mitarbeiter jeden Monat und jeden einzelnen Tag nach.'], Z],
    ['ze-auftraege', 'Zeiterfassung', 'Aufträge für die Zeiterfassung', 'auftrag projekt baustelle kunde stunden zuordnen', [
      'Zeiterfassung, Ansicht „Aufträge“, dann „+ Auftrag“ mit Bezeichnung und Kunde.',
      'Ihre Mitarbeiter wählen den Auftrag beim Erfassen. Abgeschlossene Aufträge verschwinden aus ihrer Auswahl.'], Z + '?tab=auftraege'],
    ['ze-rechnung', 'Zeiterfassung', 'Stunden verrechnen und Rapport drucken', 'stunden verrechnen rechnung rapport stundenrapport drucken kunde unterschrift', [
      'Ansicht „Aufträge“: bei einem Auftrag auf „offen“ tippen. Die offenen Stunden sind schon ausgewählt.',
      '„In Rechnung übernehmen“: Die Rechnung öffnet sich mit allen Positionen, Sie wählen nur noch den Kunden.',
      '„Stundenrapport drucken“ macht ein Blatt mit allen Stunden und Platz für die Unterschrift.'], Z + '?tab=eintraege'],
    ['ze-lohn', 'Zeiterfassung', 'Stunden in den Lohn übernehmen', 'stundenlohn lohn lohnlauf stunden übernehmen monat', [
      'Zeiterfassung, Übersicht, „Stunden in den Lohnlauf“, Monat wählen.',
      'Die Stunden landen bei den Mitarbeitern mit gleichem Namen und Stundenlohn unter „Löhne“.'], Z],

    ['ze-plan', 'Zeiterfassung', 'Einsätze planen', 'einsatzplan planung einsatz termin kunde mitarbeiter wer wann wo sms adresse', [
      'Zeiterfassung, Ansicht „Einsatzplan“, dann „+ Einsatz planen“: Mitarbeiter, Datum, Zeit, Auftrag und Adresse.',
      'Der Mitarbeiter sieht den Einsatz auf seinem Handy mit Route und Telefonnummer und kann die Uhr direkt dort starten.',
      'Mit „SMS an Kunde“ öffnet sich eine fertige Terminbestätigung für den Kunden.'], Z + '?tab=plan'],

    // Termine
    ['tb-start', 'Termine', 'Online-Terminbuchung einrichten', 'termin buchen online buchung kalender coiffeur therapie öffnungszeiten link', [
      'Im Menü „Termine“ öffnen, Ansicht „Online-Buchung“.',
      'Leistungen mit Dauer und Preis erfassen, Öffnungszeiten eintragen und „Online-Buchung eingeschaltet“ anhaken. Speichern.',
      'Den Buchungslink auf Ihre Website, in Google, Instagram oder WhatsApp stellen. Ihre Kunden buchen selbst einen freien Termin.'], T + '?tab=einstellungen'],
    ['tb-verwalten', 'Termine', 'Termine bestätigen, absagen, verrechnen', 'termin bestätigen absagen erinnerung sms rechnung kunde', [
      'Neue Online-Buchungen sind gelb markiert. Antippen, dann „Bestätigen per SMS“ oder „Erinnerung per SMS“.',
      'Nach dem Termin „Rechnung“: Die Rechnung öffnet sich mit der Leistung und dem Preis.',
      'Kunden können über den Link in ihrer Bestätigung selbst absagen. Der Termin wird dann wieder frei.'], T],

    // Lager
    ['lg-start', 'Lager', 'Lager und Material erfassen', 'lager material artikel bestand einkauf verkauf lieferant', [
      'Im Menü „Lager“ öffnen und „+ Artikel“: Bezeichnung, Einheit, Einkaufs- und Verkaufspreis, Anfangsbestand und Mindestbestand.',
      'Mit „+“ buchen Sie einen Wareneingang, mit „−“ den Verbrauch. Der Bestand rechnet sich selbst.'], L],
    ['lg-verrechnen', 'Lager', 'Material verrechnen und nachbestellen', 'material verrechnen rechnung nachbestellen bestellen mindestbestand bestellliste auftrag', [
      '„Material verrechnen“: Mengen eintragen, der Bestand wird abgebucht und die Rechnung öffnet sich mit den Positionen.',
      'Verbrauch für einen Auftrag erscheint automatisch auf der Rechnung, wenn Sie die Stunden dieses Auftrags verrechnen.',
      'Ansicht „Nachbestellen“: alles unter dem Mindestbestand, nach Lieferant, mit Bestellung per E-Mail.'], L],

    // Treuhänder
    ['treuhand', 'Konto und Lizenz', 'Treuhänder Zugang geben', 'treuhänder treuhand buchhalter zugang freigeben lesen steuerberater', [
      'Im Menü „Lizenz und Konto“ unter „Treuhänder-Zugang“ die E-Mail Ihres Treuhänders eingeben und „Freigeben“.',
      'Ihr Treuhänder meldet sich unter Treuhänder-Zugang mit dieser E-Mail an und sieht Erfolgsrechnung, MWST, Buchungen und Belege. Ändern kann er nichts.',
      'Mit „Entfernen“ ist der Zugang sofort wieder weg.'], WURZEL + 'lizenz/#treuhand'],
    ['einrichtung', 'Konto und Lizenz', 'Einrichtung durch uns', 'einrichtung hilfe einrichten daten übernehmen import service schulung', [
      'Beim Bestellen der Lizenz „Einrichtung durch uns“ ankreuzen (CHF 190 einmalig).',
      'Wir übernehmen Ihre bisherigen Daten, richten Logo, Vorlagen und Kategorien ein und zeigen Ihnen alles in 30 Minuten.'], WURZEL + 'lizenz/'],

    // Home-Büro: neue Bereiche
    ['hb-budget', 'Home-Büro', 'Haushaltsbudget planen', 'budget haushalt sparen monat ausgaben planen familie', [
      'Home-Büro, Ansicht „Budget“: pro Kategorie einen Monatsbetrag eintragen, oder „Vorschlag aus 3 Monaten“ tippen.',
      'Der Balken zeigt, wie viel schon ausgegeben ist. Rot heisst: über dem Budget.'], P + '?tab=budget'],
    ['hb-teilen', 'Home-Büro', 'Ausgaben in WG oder Familie teilen', 'teilen wg familie gemeinsam ausgaben schulden ausgleich wer schuldet', [
      'Home-Büro, Ansicht „Teilen“: zuerst die Personen erfassen, dann jede gemeinsame Ausgabe mit „Bezahlt von“ und „Für wen“.',
      'Unter „So wird ausgeglichen“ steht, wer wem wie viel überweist, mit möglichst wenigen Zahlungen. Per WhatsApp teilen.'], P + '?tab=teilen'],
    ['hb-steuern', 'Home-Büro', 'Belege für die Steuererklärung sammeln', 'steuern steuererklärung abzüge arzt zahnarzt spenden 3a säule weiterbildung quittung', [
      'Home-Büro, Ansicht „Steuern“: Abzüge mit Betrag und Foto der Quittung erfassen.',
      'Vorschläge aus dem Kontoauszug (Arzt, Spenden, Säule 3a, Prämien) mit „Übernehmen“ hinzufügen.',
      '„Übersicht drucken“ macht eine Liste nach Abzugsart mit allen Quittungen für die Steuererklärung.'], P + '?tab=steuern'],
    ['hb-kk', 'Home-Büro', 'Krankenkasse vergleichen', 'krankenkasse prämie franchise vergleichen wechseln kündigen grundversicherung', [
      'Home-Büro, Ansicht „Krankenkasse“: Ihre heutige Prämie und Franchise eintragen und Ihre ungefähren Gesundheitskosten wählen.',
      'Angebote von priminfo.admin.ch erfassen. Der Vergleich zeigt die echten Jahreskosten inklusive Franchise und Selbstbehalt.',
      'Wechsel auf 1. Januar: Die Kündigung muss bis 30. November bei der Kasse sein.'], P + '?tab=kk'],

    // Konto und Lizenz
    ['lizenz', 'Konto und Lizenz', 'Lizenz kaufen oder verlängern', 'lizenz kaufen bezahlen preis verlängern test abgelaufen paket wechseln upgrade', [
      'Im Menü „Lizenz und Konto“ öffnen oder unten auf „Lizenz kaufen“ tippen. Paket wählen und bestellen.',
      'Sie erhalten eine QR-Rechnung. Nach der Zahlung wird Ihre Lizenz freigeschaltet, alle Daten bleiben erhalten.'], WURZEL + 'lizenz/'],
    ['passwort', 'Konto und Lizenz', 'Passwort vergessen', 'passwort vergessen zurücksetzen login anmelden geht nicht', [
      'Beim Anmelden „Passwort vergessen?“ tippen und Ihre E-Mail eingeben.',
      'Im Link der E-Mail ein neues Passwort festlegen.'], B],
    ['daten', 'Konto und Lizenz', 'Wer sieht meine Daten?', 'datenschutz sicherheit daten schweiz zürich wer sieht privat', [
      'Nur Sie. Ihre Daten liegen verschlüsselt in einem Rechenzentrum in Zürich und sind an Ihr Konto gebunden.',
      'Auch nach Ablauf der Lizenz können Sie alles ansehen und herunterladen.'], H + '#daten'],
    ['kontakt', 'Konto und Lizenz', 'Hilfe und Kontakt', 'hilfe kontakt support frage problem telefon email', [
      'Schreiben Sie an info@nasuvia.ch oder rufen Sie 079 821 84 08 an.'], 'mailto:info@nasuvia.ch'],
  ].map(([id, bereich, titel, woerter, schritte, ziel]) => ({ id, bereich, titel, woerter, schritte, ziel }));

  const norm = (s) => String(s || '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/ß/g, 'ss');
  function finden(q) {
    const t = norm(q).split(/\s+/).filter(Boolean);
    if (!t.length) return ARTIKEL.slice(0, 8);
    return ARTIKEL.map((a) => {
      const titel = norm(a.titel), alles = norm(`${a.titel} ${a.woerter} ${a.bereich} ${a.schritte.join(' ')}`);
      let p = 0;
      for (const w of t) {
        if (titel.includes(w)) p += 5; else if (norm(a.woerter).split(' ').some((x) => x.startsWith(w))) p += 4; else if (alles.includes(w)) p += 1; else return null;
      }
      return { a, p };
    }).filter(Boolean).sort((x, y) => y.p - x.p).map((x) => x.a).slice(0, 10);
  }
  const esc = (s) => String(s ?? '').replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

  const stil = document.createElement('style');
  stil.textContent = `
  .su-knopf{display:inline-flex;align-items:center;gap:8px;height:40px;padding:0 14px;border:1px solid rgba(11,59,46,.16)!important;border-radius:100px!important;background:#fff!important;color:#3F5A4F!important;font:500 .92rem 'League Spartan',-apple-system,system-ui,sans-serif;cursor:pointer;min-width:0}
  .su-knopf svg{width:17px;height:17px;fill:none;stroke:currentColor;stroke-width:2;stroke-linecap:round}
  .su-knopf kbd{font:500 11px 'JetBrains Mono',monospace;background:#E8F4EE;border-radius:5px;padding:2px 5px;color:#7C8499}
  @media(max-width:640px){.su-knopf span,.su-knopf kbd{display:none}.su-knopf{padding:0 11px}}
  .su-hinten{position:fixed;inset:0;z-index:99990;background:rgba(12,18,38,.35);backdrop-filter:blur(4px);-webkit-backdrop-filter:blur(4px);display:flex;justify-content:center;align-items:flex-start;padding:max(60px,8vh) 14px 14px}
  .su-box{width:min(620px,100%);background:#fff;border-radius:20px;box-shadow:0 40px 100px -30px rgba(12,18,38,.55);overflow:hidden;font-family:'League Spartan',-apple-system,system-ui,sans-serif;color:#0A1F17}
  .su-feld{display:flex;align-items:center;gap:10px;padding:14px 18px;border-bottom:1px solid rgba(11,59,46,.12)}
  .su-feld svg{width:20px;height:20px;stroke:#0E7A55;fill:none;stroke-width:2.2;stroke-linecap:round;flex:none}
  .su-feld input{flex:1;border:0;outline:0;font:inherit;font-size:18px;color:#0A1F17;background:none;min-width:0}
  .su-feld button{border:0;background:#E8F4EE;border-radius:8px;padding:5px 9px;font:500 12px inherit;color:#3F5A4F;cursor:pointer}
  .su-liste{max-height:min(60vh,520px);overflow:auto;padding:8px}
  .su-treffer{display:block;width:100%;text-align:left;border:0;background:none;border-radius:14px;padding:11px 12px;cursor:pointer;font:inherit;color:inherit}
  .su-treffer.an,.su-treffer:hover{background:rgba(14,122,85,.08)}
  .su-treffer b{display:block;font-size:15.5px}
  .su-treffer small{display:block;font-size:13px;color:#7C8499;margin-top:2px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
  .su-treffer em{font-style:normal;font-family:'JetBrains Mono',monospace;font-size:10px;letter-spacing:.1em;text-transform:uppercase;color:#0E7A55;margin-right:6px}
  .su-detail{padding:4px 12px 12px}
  .su-detail ol{margin:6px 0 10px 20px;padding:0;display:grid;gap:6px;font-size:14.5px;color:#3F5A4F;line-height:1.45}
  .su-aktionen{display:flex;gap:8px;flex-wrap:wrap}
  .su-aktionen a{border-radius:100px;padding:9px 14px;font-weight:600;font-size:14px;text-decoration:none;background:#0B3B2E;color:#fff}
  .su-aktionen a.zweit{background:#E8F4EE;color:#0B3B2E}
  .su-fuss{padding:10px 18px;border-top:1px solid rgba(11,59,46,.1);font-size:12.5px;color:#7C8499;display:flex;justify-content:space-between;gap:10px}
  .su-fuss a{color:#0E7A55;text-decoration:none}
  .su-leer{padding:24px 14px;text-align:center;color:#7C8499;font-size:14px}`;
  document.head.appendChild(stil);

  let offen = null;
  function oeffnen(start = '') {
    if (offen) return;
    let auswahl = 0, liste = [], detail = null;
    const hinten = document.createElement('div');
    hinten.className = 'su-hinten';
    hinten.innerHTML = `<div class="su-box" role="dialog" aria-label="Suchen">
      <div class="su-feld"><svg viewBox="0 0 24 24"><circle cx="11" cy="11" r="7"/><path d="m20 20-3.5-3.5"/></svg>
        <input type="search" placeholder="Was suchen Sie? z. B. Mahnung, Lohn, Bankauszug" value="${esc(start)}" aria-label="Suchen" autocomplete="off" />
        <button type="button" data-su-zu>Esc</button></div>
      <div class="su-liste"></div>
      <div class="su-fuss"><span>↑↓ wählen · Enter öffnen</span><a href="${H}">Ganze Anleitung</a></div></div>`;
    const feld = hinten.querySelector('input'), box = hinten.querySelector('.su-liste');
    const zeichnen = () => {
      if (!liste.length) { box.innerHTML = `<div class="su-leer">Nichts gefunden. Versuchen Sie ein anderes Wort oder schreiben Sie uns: <a href="mailto:info@nasuvia.ch">info@nasuvia.ch</a></div>`; return; }
      box.innerHTML = liste.map((a, i) => `<button type="button" class="su-treffer ${i === auswahl ? 'an' : ''}" data-i="${i}"><b><em>${esc(a.bereich)}</em>${esc(a.titel)}</b>
        ${detail === i ? `</button><div class="su-detail"><ol>${a.schritte.map((s) => `<li>${esc(s)}</li>`).join('')}</ol>
          <div class="su-aktionen">${a.ziel ? `<a href="${esc(a.ziel)}">Jetzt öffnen</a>` : ''}<a class="zweit" href="${H}#${a.id}">In der Anleitung</a></div></div>` : `<small>${esc(a.schritte[0])}</small></button>`}`).join('');
      const an = box.querySelector('.su-treffer.an'); if (an) an.scrollIntoView({ block: 'nearest' });
    };
    const suchen = () => { liste = finden(feld.value); auswahl = 0; detail = null; zeichnen(); };
    feld.addEventListener('input', suchen);
    feld.addEventListener('keydown', (e) => {
      if (e.key === 'ArrowDown') { e.preventDefault(); auswahl = Math.min(liste.length - 1, auswahl + 1); detail = null; zeichnen(); }
      if (e.key === 'ArrowUp') { e.preventDefault(); auswahl = Math.max(0, auswahl - 1); detail = null; zeichnen(); }
      if (e.key === 'Enter' && liste[auswahl]) { e.preventDefault(); if (detail === auswahl && liste[auswahl].ziel) location.href = liste[auswahl].ziel; else { detail = auswahl; zeichnen(); } }
    });
    hinten.addEventListener('click', (e) => {
      if (e.target === hinten || e.target.closest('[data-su-zu]')) { schliessen(); return; }
      const t = e.target.closest('.su-treffer'); if (!t) return;
      const i = Number(t.dataset.i); auswahl = i; detail = detail === i ? null : i; zeichnen();
    });
    const schliessen = () => { hinten.remove(); offen = null; document.removeEventListener('keydown', esc2); };
    const esc2 = (e) => { if (e.key === 'Escape') schliessen(); };
    document.addEventListener('keydown', esc2);
    document.body.appendChild(hinten);
    offen = hinten;
    suchen();
    setTimeout(() => feld.focus(), 30);
  }

  // Knopf oben in der Kopfzeile (Buchhaltung, Rechnungen) oder dort, wo eine Seite Platz vorsieht
  function knopf() {
    const b = document.createElement('button');
    b.type = 'button'; b.className = 'su-knopf';
    b.innerHTML = '<svg viewBox="0 0 24 24"><circle cx="11" cy="11" r="7"/><path d="m20 20-3.5-3.5"/></svg><span>Suchen</span><kbd>⌘K</kbd>';
    b.addEventListener('click', () => oeffnen());
    return b;
  }
  function einbauen() {
    const ort = document.querySelector('[data-suche-hier]');
    if (ort) { ort.appendChild(knopf()); return; }
    const slot = document.querySelector('.nv-rechts');
    if (slot) { slot.insertBefore(knopf(), slot.firstChild); return; }
    setTimeout(einbauen, 300);
  }
  document.addEventListener('keydown', (e) => {
    if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') { e.preventDefault(); oeffnen(); }
  });
  window.NasuviaSuche = { oeffnen, finden, artikel: ARTIKEL, wurzel: WURZEL };
  if (!skript.dataset || skript.dataset.ohneKnopf === undefined) {
    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', () => setTimeout(einbauen, 200)); else setTimeout(einbauen, 200);
  }
})();

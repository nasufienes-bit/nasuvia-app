// Vorlagen zum Drucken, als PDF oder direkt in die Firmenablage: Rapporte, Personal, Kunden, Büro.
// Firmendaten (Logo, Adresse, Farben) kommen aus „Firma und Design“.
(() => {
  'use strict';
  const K = window.NASUVIA_KONFIG || {};
  try { const lz = JSON.parse(localStorage.getItem('ordasio.lizenz') || 'null'); if (K.produkt && lz && lz.paket === 'privat') { location.replace('../privat/'); return; } } catch {}
  const $ = (id) => document.getElementById(id);
  const esc = (s) => String(s ?? '').replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
  const dk = (d) => (d ? d.slice(8, 10) + '.' + d.slice(5, 7) + '.' + d.slice(0, 4) : '');
  const heute = () => new Date().toLocaleDateString('sv-SE');
  const plusTage = (d, n) => { const x = new Date(d + 'T12:00'); x.setDate(x.getDate() + n); return x.toLocaleDateString('sv-SE'); };
  const toast = (t, ms = 2800) => { const e = $('toast'); e.textContent = t; e.classList.add('da'); clearTimeout(toast.z); toast.z = setTimeout(() => e.classList.remove('da'), ms); };
  const firma = (() => { try { const l = JSON.parse(localStorage.getItem('nasuvia.firma.v1') || '[]'); return (Array.isArray(l) ? l[0] : l) || {}; } catch { return {}; } })();
  const ORT = (firma.ort || '').replace(/^\d{4}\s*/, '');
  const WT = ['Montag', 'Dienstag', 'Mittwoch', 'Donnerstag', 'Freitag', 'Samstag', 'Sonntag'];
  const montag = (d) => { const x = new Date(d + 'T12:00'); x.setDate(x.getDate() - (x.getDay() + 6) % 7); return x.toLocaleDateString('sv-SE'); };
  const absatz = (t) => esc(t).split(/\n+/).filter(Boolean).map((z) => `<p>${z}</p>`).join('');
  const linien = (n, spalten) => Array.from({ length: n }, () => `<tr>${spalten.map(() => '<td>&nbsp;</td>').join('')}</tr>`).join('');
  const unterschrift = (...wer) => `<div class="unterschriften">${wer.map((w) => `<div><span></span>${esc(w)}</div>`).join('')}</div>`;
  const anrede = (w) => (w.geschlecht === 'frau' ? 'Frau' : w.geschlecht === 'herr' ? 'Herr' : '');
  const sie = (w) => (w.geschlecht === 'frau' ? ['Sie', 'ihr', 'ihre', 'Ihr'] : w.geschlecht === 'herr' ? ['Er', 'ihm', 'seine', 'Sein'] : ['Sie/Er', 'ihr/ihm', 'ihre/seine', 'Ihr/Sein']);
  const nach = (w) => `${anrede(w)} ${w.name || '…'}`.trim();

  // Kündigungsfrist nach OR 335c: Probezeit 7 Tage, 1. Jahr 1 Monat, 2.–9. Jahr 2 Monate, danach 3 Monate, auf Monatsende
  function fruehestesEnde(eintritt, zustellung, probezeitMonate = 3) {
    if (!eintritt) return '';
    const e = new Date(eintritt + 'T12:00'), z = new Date(zustellung + 'T12:00');
    const probeEnde = new Date(e); probeEnde.setMonth(probeEnde.getMonth() + Number(probezeitMonate || 0));
    if (z < probeEnde) return plusTage(zustellung, 7);
    const jahre = (z - e) / (365.25 * 864e5);
    const monate = jahre < 1 ? 1 : jahre < 9 ? 2 : 3;
    const ende = new Date(z.getFullYear(), z.getMonth() + monate + 1, 0, 12);
    return ende.toLocaleDateString('sv-SE');
  }

  const LEISTUNG = {
    1: ['stets zu unserer vollsten Zufriedenheit', 'Wir haben sie/ihn als äusserst zuverlässige und selbständige Persönlichkeit kennengelernt.'],
    2: ['stets zu unserer vollen Zufriedenheit', 'Wir haben sie/ihn als zuverlässige und selbständige Persönlichkeit kennengelernt.'],
    3: ['zu unserer vollen Zufriedenheit', 'Sie/Er arbeitete zuverlässig.'],
    4: ['zu unserer Zufriedenheit', ''],
  };
  const VERHALTEN = { 1: 'Ihr/Sein Verhalten gegenüber Vorgesetzten, Mitarbeitenden und Kunden war stets vorbildlich.', 2: 'Ihr/Sein Verhalten gegenüber Vorgesetzten, Mitarbeitenden und Kunden war stets einwandfrei.', 3: 'Ihr/Sein Verhalten gegenüber Vorgesetzten, Mitarbeitenden und Kunden war einwandfrei.', 4: 'Ihr/Sein Verhalten gab zu keinen Beanstandungen Anlass.' };
  const GRUND = { eigen: 'verlässt uns auf eigenen Wunsch', befristet: 'verlässt uns nach Ablauf des befristeten Arbeitsvertrags', betrieb: 'verlässt uns aus betrieblichen Gründen', einvernehmlich: 'verlässt uns im gegenseitigen Einvernehmen', '': 'verlässt uns' };
  const fuerPerson = (t, w) => { const [Er, ihm, seine, Sein] = sie(w); return t.replace(/Sie\/Er/g, Er).replace(/sie\/ihn/g, w.geschlecht === 'herr' ? 'ihn' : w.geschlecht === 'frau' ? 'sie' : 'sie/ihn').replace(/Ihr\/Sein/g, Sein).replace(/ihre\/seine/g, seine).replace(/ihr\/ihm/g, ihm); };

  // [id, Feldname, Typ, Vorgabe, Optionen]
  const P = [['name', 'Name der Person', 'person', ''], ['geschlecht', 'Anrede', 'wahl', 'frau', [['frau', 'Frau'], ['herr', 'Herr'], ['neutral', 'Neutral']]]];
  const VORLAGEN = [
    { id: 'wochenrapport', gruppe: 'Zeit und Rapporte', titel: 'Wochenrapport', text: 'Stunden einer Woche, zum Ausfüllen von Hand', ic: '🗓️',
      felder: [['name', 'Mitarbeiter/in', 'person', ''], ['woche', 'Woche ab Montag', 'datum', montag(heute())], ['auftrag', 'Auftrag / Baustelle (freiwillig)', 'text', ''], ['km', 'Spalte Kilometer', 'ja', true], ['spesen', 'Spalte Spesen', 'ja', false]],
      html: (w) => `<h1>Wochenrapport</h1><table class="kopfdaten"><tr><td>Name</td><td><b>${esc(w.name) || '&nbsp;'}</b></td><td>Woche</td><td><b>${dk(w.woche)} – ${dk(plusTage(w.woche, 6))}</b></td></tr>${w.auftrag ? `<tr><td>Auftrag</td><td colspan="3"><b>${esc(w.auftrag)}</b></td></tr>` : ''}</table>
        <table class="gitter"><thead><tr><th>Tag</th><th>Beginn</th><th>Ende</th><th>Pause</th><th>Stunden</th><th style="width:34%">Auftrag / Tätigkeit</th>${w.km ? '<th>Km</th>' : ''}${w.spesen ? '<th>Spesen</th>' : ''}</tr></thead>
        <tbody>${WT.map((t, i) => `<tr style="height:13mm"><td><b>${t}</b><br><small>${dk(plusTage(w.woche, i))}</small></td><td></td><td></td><td></td><td></td><td></td>${w.km ? '<td></td>' : ''}${w.spesen ? '<td></td>' : ''}</tr>`).join('')}</tbody>
        <tfoot><tr><td colspan="4">Total Woche</td><td></td><td></td>${w.km ? '<td></td>' : ''}${w.spesen ? '<td></td>' : ''}</tr></tfoot></table>
        <p class="klein">Pausen über 30 Minuten bitte eintragen. Bitte bis Montag abgeben.</p>${unterschrift('Mitarbeiter/in', 'Vorgesetzte/r')}` },
    { id: 'monatsrapport', gruppe: 'Zeit und Rapporte', titel: 'Monatsrapport', text: 'Ein Blatt pro Monat und Person', ic: '📆',
      felder: [['name', 'Mitarbeiter/in', 'person', ''], ['monat', 'Monat', 'monat', heute().slice(0, 7)], ['soll', 'Sollstunden pro Tag', 'text', '8.4']],
      html: (w) => { const [j, m] = (w.monat || heute().slice(0, 7)).split('-').map(Number), n = new Date(j, m, 0).getDate();
        return `<h1>Monatsrapport ${new Date(j, m - 1, 1).toLocaleDateString('de-CH', { month: 'long', year: 'numeric' })}</h1><table class="kopfdaten"><tr><td>Name</td><td><b>${esc(w.name) || '&nbsp;'}</b></td><td>Soll pro Tag</td><td><b>${esc(w.soll)} Std.</b></td></tr></table>
        <table class="gitter eng"><thead><tr><th>Datum</th><th>Beginn</th><th>Ende</th><th>Pause</th><th>Stunden</th><th style="width:38%">Bemerkung (Ferien, krank …)</th></tr></thead><tbody>
        ${Array.from({ length: n }, (_, i) => { const d = new Date(j, m - 1, i + 1, 12), we = d.getDay() % 6 === 0; return `<tr class="${we ? 'we' : ''}"><td>${['So', 'Mo', 'Di', 'Mi', 'Do', 'Fr', 'Sa'][d.getDay()]} ${String(i + 1).padStart(2, '0')}.</td><td></td><td></td><td></td><td></td><td></td></tr>`; }).join('')}</tbody>
        <tfoot><tr><td colspan="4">Total Monat</td><td></td><td></td></tr></tfoot></table>${unterschrift('Mitarbeiter/in', 'Vorgesetzte/r')}`; } },
    { id: 'regierapport', gruppe: 'Zeit und Rapporte', titel: 'Arbeitsrapport mit Material', text: 'Pro Auftrag: Stunden, Material, Unterschrift Kunde', ic: '🧰',
      felder: [['auftrag', 'Auftrag', 'text', ''], ['kunde', 'Kunde', 'text', ''], ['adresse', 'Adresse', 'text', ''], ['datum', 'Datum', 'datum', heute()], ['leute', 'Zeilen Mitarbeitende', 'zahl', 4], ['material', 'Zeilen Material', 'zahl', 8]],
      html: (w) => `<h1>Arbeitsrapport</h1><table class="kopfdaten"><tr><td>Auftrag</td><td><b>${esc(w.auftrag) || '&nbsp;'}</b></td><td>Datum</td><td><b>${dk(w.datum)}</b></td></tr><tr><td>Kunde</td><td><b>${esc(w.kunde) || '&nbsp;'}</b></td><td>Adresse</td><td><b>${esc(w.adresse) || '&nbsp;'}</b></td></tr></table>
        <h2>Arbeitszeit</h2><table class="gitter"><thead><tr><th style="width:34%">Name</th><th>Beginn</th><th>Ende</th><th>Pause</th><th>Stunden</th></tr></thead><tbody>${linien(Number(w.leute) || 4, [1, 2, 3, 4, 5])}</tbody></table>
        <h2>Ausgeführte Arbeiten</h2><div class="feld-linien">${'<div></div>'.repeat(4)}</div>
        <h2>Material</h2><table class="gitter"><thead><tr><th>Menge</th><th>Einheit</th><th style="width:60%">Bezeichnung</th></tr></thead><tbody>${linien(Number(w.material) || 8, [1, 2, 3])}</tbody></table>
        <p class="klein">Mit der Unterschrift bestätigt der Kunde die ausgeführten Arbeiten und das verwendete Material.</p>${unterschrift('Monteur/in', 'Kunde')}` },
    { id: 'abnahme', gruppe: 'Kunden und Aufträge', titel: 'Abnahmeprotokoll', text: 'Übergabe an den Kunden, mit oder ohne Mängel', ic: '✅',
      felder: [['auftrag', 'Auftrag / Objekt', 'text', ''], ['kunde', 'Kunde', 'text', ''], ['adresse', 'Adresse', 'text', ''], ['datum', 'Datum der Abnahme', 'datum', heute()], ['frist', 'Frist für Mängelbehebung', 'datum', plusTage(heute(), 30)]],
      html: (w) => `<h1>Abnahmeprotokoll</h1><table class="kopfdaten"><tr><td>Objekt</td><td><b>${esc(w.auftrag) || '&nbsp;'}</b></td><td>Datum</td><td><b>${dk(w.datum)}</b></td></tr><tr><td>Kunde</td><td><b>${esc(w.kunde) || '&nbsp;'}</b></td><td>Adresse</td><td><b>${esc(w.adresse) || '&nbsp;'}</b></td></tr></table>
        <p>Die oben genannten Arbeiten wurden heute gemeinsam besichtigt und</p><p class="kaestchen">☐ ohne Mängel abgenommen.<br>☐ mit den folgenden Mängeln abgenommen. Die Mängel werden bis ${dk(w.frist)} behoben.</p>
        <table class="gitter"><thead><tr><th style="width:8%">Nr.</th><th>Mangel</th><th style="width:22%">Erledigt am</th></tr></thead><tbody>${Array.from({ length: 8 }, (_, i) => `<tr><td>${i + 1}</td><td></td><td></td></tr>`).join('')}</tbody></table>
        <p class="klein">Mit der Abnahme beginnen die Garantie- und Rügefristen gemäss Vertrag oder SIA-Norm 118, sofern vereinbart.</p>${unterschrift('Für die Firma', 'Kunde')}` },
    { id: 'auftrag', gruppe: 'Kunden und Aufträge', titel: 'Auftragsbestätigung', text: 'Was, wann, zu welchem Preis', ic: '🤝',
      felder: [['kunde', 'Kunde (Name)', 'text', ''], ['kadresse', 'Adresse des Kunden', 'mehrzeilig', ''], ['auftrag', 'Leistung', 'mehrzeilig', ''], ['termin', 'Ausführung', 'text', ''], ['preis', 'Preis (CHF, inkl. MWST)', 'text', ''], ['zahlung', 'Zahlung', 'text', '30 Tage netto nach Rechnung']],
      html: (w) => `${adressblock(w.kunde, w.kadresse)}<p class="datum">${esc(ORT) || 'Ort'}, ${dk(heute())}</p><h1>Auftragsbestätigung</h1>
        <p>Vielen Dank für Ihren Auftrag. Gerne bestätigen wir:</p><table class="kopfdaten breit"><tr><td>Leistung</td><td>${absatz(w.auftrag) || '&nbsp;'}</td></tr><tr><td>Ausführung</td><td>${esc(w.termin) || '&nbsp;'}</td></tr><tr><td>Preis</td><td><b>${w.preis ? 'CHF ' + esc(w.preis) : '&nbsp;'}</b></td></tr><tr><td>Zahlung</td><td>${esc(w.zahlung)}</td></tr></table>
        <p>Änderungen und Zusatzarbeiten verrechnen wir nach Aufwand, nach vorheriger Absprache mit Ihnen.</p><p>Freundliche Grüsse</p>${unterschrift(firma.name || 'Firma')}` },
    { id: 'quittung', gruppe: 'Kunden und Aufträge', titel: 'Quittung', text: 'Für bar erhaltene Beträge', ic: '🧾',
      felder: [['betrag', 'Betrag CHF', 'text', ''], ['von', 'Erhalten von', 'text', ''], ['fuer', 'Für', 'text', ''], ['datum', 'Datum', 'datum', heute()]],
      html: (w) => `<h1>Quittung</h1><div class="quittung"><div><span>Betrag</span><b>CHF ${esc(w.betrag) || '________'}</b></div><div><span>Erhalten von</span><b>${esc(w.von) || '&nbsp;'}</b></div><div><span>Für</span><b>${esc(w.fuer) || '&nbsp;'}</b></div><div><span>Ort, Datum</span><b>${esc(ORT)}, ${dk(w.datum)}</b></div></div>${unterschrift('Unterschrift Empfänger')}` },
    { id: 'ferien', gruppe: 'Personal', titel: 'Ferienantrag', text: 'Zum Ausfüllen und Bewilligen', ic: '🏖️',
      felder: [['name', 'Mitarbeiter/in', 'person', ''], ['von', 'Von', 'datum', ''], ['bis', 'Bis', 'datum', ''], ['tage', 'Anzahl Arbeitstage', 'text', ''], ['vertretung', 'Stellvertretung', 'text', '']],
      html: (w) => `<h1>Ferienantrag</h1><table class="kopfdaten breit"><tr><td>Name</td><td><b>${esc(w.name) || '&nbsp;'}</b></td></tr><tr><td>Ferien von</td><td><b>${dk(w.von) || '&nbsp;'}</b></td></tr><tr><td>bis und mit</td><td><b>${dk(w.bis) || '&nbsp;'}</b></td></tr><tr><td>Arbeitstage</td><td><b>${esc(w.tage) || '&nbsp;'}</b></td></tr><tr><td>Stellvertretung</td><td><b>${esc(w.vertretung) || '&nbsp;'}</b></td></tr></table>
        <p class="kaestchen">☐ bewilligt &nbsp;&nbsp; ☐ nicht bewilligt, Begründung: ____________________________</p>${unterschrift('Mitarbeiter/in, Datum', 'Vorgesetzte/r, Datum')}
        <p class="klein">Tipp: Mitarbeitende können Ferien auch direkt auf ihrem Handy-Link beantragen. Sie bewilligen dann in der Firmenablage unter „Anträge“.</p>` },
    { id: 'spesen', gruppe: 'Personal', titel: 'Spesenabrechnung', text: 'Auslagen mit Belegnummer', ic: '💳',
      felder: [['name', 'Mitarbeiter/in', 'person', ''], ['monat', 'Monat', 'monat', heute().slice(0, 7)], ['zeilen', 'Anzahl Zeilen', 'zahl', 14]],
      html: (w) => `<h1>Spesenabrechnung</h1><table class="kopfdaten"><tr><td>Name</td><td><b>${esc(w.name) || '&nbsp;'}</b></td><td>Monat</td><td><b>${w.monat ? new Date(w.monat + '-01T12:00').toLocaleDateString('de-CH', { month: 'long', year: 'numeric' }) : ''}</b></td></tr></table>
        <table class="gitter"><thead><tr><th>Datum</th><th style="width:44%">Beschreibung</th><th>Beleg Nr.</th><th>Betrag CHF</th></tr></thead><tbody>${linien(Number(w.zeilen) || 14, [1, 2, 3, 4])}</tbody><tfoot><tr><td colspan="3">Total</td><td></td></tr></tfoot></table>
        <p class="klein">Belege bitte nummeriert beilegen. Auszahlung mit dem nächsten Lohn.</p>${unterschrift('Mitarbeiter/in', 'Visum')}` },
    { id: 'zeugnis', gruppe: 'Personal', titel: 'Arbeitszeugnis', text: 'Vollzeugnis mit üblichen Formulierungen', ic: '🎓',
      felder: [...P, ['geburt', 'Geburtsdatum', 'datum', ''], ['eintritt', 'Eintritt', 'datum', ''], ['austritt', 'Austritt', 'datum', ''], ['funktion', 'Funktion', 'text', ''],
        ['aufgaben', 'Aufgaben (eine pro Zeile)', 'mehrzeilig', ''], ['leistung', 'Leistung', 'wahl', '2', [['1', 'Sehr gut'], ['2', 'Gut'], ['3', 'Genügend'], ['4', 'Knapp']]], ['verhalten', 'Verhalten', 'wahl', '2', [['1', 'Vorbildlich'], ['2', 'Sehr gut'], ['3', 'Gut'], ['4', 'Ohne Beanstandung']]],
        ['grund', 'Austrittsgrund', 'wahl', 'eigen', [['eigen', 'Auf eigenen Wunsch'], ['befristet', 'Befristung'], ['betrieb', 'Betriebliche Gründe'], ['einvernehmlich', 'Einvernehmlich'], ['', 'Ohne Angabe']]], ['unterzeichner', 'Unterzeichnet von', 'text', '']],
      html: (w) => { const [Er, , seine] = sie(w), l = LEISTUNG[w.leistung] || LEISTUNG[2];
        return `<p class="datum">${esc(ORT) || 'Ort'}, ${dk(heute())}</p><h1>Arbeitszeugnis</h1>
        <p>${esc(nach(w))}${w.geburt ? `, geboren am ${dk(w.geburt)},` : ''} war vom ${dk(w.eintritt) || '…'} bis ${dk(w.austritt) || '…'} in unserer Firma als ${esc(w.funktion) || '…'} tätig.</p>
        ${w.aufgaben ? `<p>Zu ${seine} Aufgaben gehörten:</p><ul>${w.aufgaben.split('\n').filter(Boolean).map((a) => `<li>${esc(a)}</li>`).join('')}</ul>` : ''}
        <p>${esc(Er)} erledigte die Arbeiten ${l[0]}. ${esc(fuerPerson(l[1], w))}</p><p>${esc(fuerPerson(VERHALTEN[w.verhalten] || VERHALTEN[2], w))}</p>
        <p>${esc(nach(w))} ${GRUND[w.grund] ?? GRUND['']}. Wir danken ${w.geschlecht === 'herr' ? 'ihm' : w.geschlecht === 'frau' ? 'ihr' : 'ihr/ihm'} für die geleistete Arbeit und wünschen ${w.geschlecht === 'herr' ? 'ihm' : w.geschlecht === 'frau' ? 'ihr' : 'ihr/ihm'} für die Zukunft alles Gute${w.leistung <= 2 ? ' und weiterhin viel Erfolg' : ''}.</p>
        ${unterschrift(w.unterzeichner || (firma.name || 'Firma'))}<p class="klein noprint-hinweis">Nach Art. 330a OR haben Mitarbeitende jederzeit Anspruch auf ein Zeugnis. Es muss wahr und wohlwollend sein.</p>`; } },
    { id: 'bestaetigung', gruppe: 'Personal', titel: 'Arbeitsbestätigung', text: 'Kurz: nur Art und Dauer', ic: '📄',
      felder: [...P, ['geburt', 'Geburtsdatum', 'datum', ''], ['eintritt', 'Eintritt', 'datum', ''], ['austritt', 'Austritt (leer = noch angestellt)', 'datum', ''], ['funktion', 'Funktion', 'text', ''], ['pensum', 'Pensum', 'text', '100 %']],
      html: (w) => `<p class="datum">${esc(ORT) || 'Ort'}, ${dk(heute())}</p><h1>Arbeitsbestätigung</h1>
        <p>Wir bestätigen, dass ${esc(nach(w))}${w.geburt ? `, geboren am ${dk(w.geburt)},` : ''} ${w.austritt ? `vom ${dk(w.eintritt) || '…'} bis ${dk(w.austritt)}` : `seit ${dk(w.eintritt) || '…'}`} in unserer Firma als ${esc(w.funktion) || '…'} mit einem Pensum von ${esc(w.pensum)} ${w.austritt ? 'angestellt war' : 'angestellt ist'}.</p>${unterschrift(firma.name || 'Firma')}` },
    { id: 'kuendigung', gruppe: 'Personal', titel: 'Kündigung (Arbeitgeber)', text: 'Mit Fristberechnung nach OR 335c', ic: '✉️',
      felder: [...P, ['padresse', 'Adresse der Person', 'mehrzeilig', ''], ['eintritt', 'Eintritt', 'datum', ''], ['probezeit', 'Probezeit (Monate)', 'zahl', 3], ['zustellung', 'Zustellung der Kündigung', 'datum', heute()], ['ende', 'Ende des Arbeitsverhältnisses', 'datum', ''], ['grund', 'Grund (freiwillig)', 'mehrzeilig', ''], ['ferien', 'Hinweis Ferien und Überstunden', 'ja', true]],
      html: (w) => { const vorschlag = fruehestesEnde(w.eintritt, w.zustellung, w.probezeit), ende = w.ende || vorschlag;
        return `${adressblock(nach(w), w.padresse, 'Einschreiben')}<p class="datum">${esc(ORT) || 'Ort'}, ${dk(w.zustellung)}</p><h1>Kündigung des Arbeitsverhältnisses</h1>
        <p>Sehr ${w.geschlecht === 'herr' ? 'geehrter Herr' : w.geschlecht === 'frau' ? 'geehrte Frau' : 'geehrte/r'} ${esc((w.name || '').split(' ').slice(-1)[0]) || '…'}</p>
        <p>Hiermit kündigen wir das Arbeitsverhältnis unter Einhaltung der gesetzlichen beziehungsweise vertraglichen Kündigungsfrist per <b>${dk(ende) || '…'}</b>.</p>${w.grund ? absatz(w.grund) : ''}
        ${w.ferien ? '<p>Allfällige Ferien- und Überstundenguthaben bitten wir Sie, bis zum Austritt zu beziehen, soweit es der Betrieb zulässt. Das Arbeitszeugnis erhalten Sie mit dem letzten Lohn.</p>' : ''}
        <p>Wir danken Ihnen für Ihren Einsatz und wünschen Ihnen für die Zukunft alles Gute.</p><p>Freundliche Grüsse</p>${unterschrift(firma.name || 'Firma')}
        <div class="hinweisbox noprint">Frühestes Ende nach OR 335c: <b>${dk(vorschlag) || 'Eintritt eingeben'}</b>. Probezeit: 7 Tage; 1. Dienstjahr 1 Monat; 2. bis 9. Dienstjahr 2 Monate; danach 3 Monate, jeweils auf Ende Monat (sofern der Vertrag nichts anderes regelt). Während Krankheit, Unfall, Militärdienst oder Schwangerschaft gelten Sperrfristen (OR 336c). Eingeschrieben senden.</div>`; } },
    { id: 'lohn', gruppe: 'Personal', titel: 'Beförderung oder Lohnanpassung', text: 'Bestätigung der neuen Funktion oder des Lohns', ic: '⬆️',
      felder: [...P, ['ab', 'Gültig ab', 'datum', ''], ['funktion', 'Neue Funktion (freiwillig)', 'text', ''], ['lohn', 'Neuer Lohn (freiwillig)', 'text', ''], ['text', 'Persönlicher Satz (freiwillig)', 'mehrzeilig', 'Wir danken Ihnen für Ihren grossen Einsatz.']],
      html: (w) => `<p class="datum">${esc(ORT) || 'Ort'}, ${dk(heute())}</p><h1>${w.funktion ? 'Beförderung' : 'Lohnanpassung'}</h1>
        <p>${w.geschlecht === 'herr' ? 'Lieber' : w.geschlecht === 'frau' ? 'Liebe' : 'Liebe/r'} ${esc((w.name || '').split(' ')[0]) || '…'}</p>${absatz(w.text)}
        <p>Mit Wirkung ab ${dk(w.ab) || '…'} gilt:</p><table class="kopfdaten breit">${w.funktion ? `<tr><td>Funktion</td><td><b>${esc(w.funktion)}</b></td></tr>` : ''}${w.lohn ? `<tr><td>Lohn</td><td><b>${esc(w.lohn)}</b></td></tr>` : ''}</table>
        <p>Alle übrigen Bestimmungen Ihres Arbeitsvertrags bleiben unverändert.</p><p>Herzliche Gratulation und freundliche Grüsse</p>${unterschrift(firma.name || 'Firma', 'Mitarbeiter/in (Kenntnisnahme)')}` },
  ];
  function adressblock(name, adresse, vermerk = '') {
    return `<div class="adresse">${vermerk ? `<small>${esc(vermerk)}</small>` : ''}<b>${esc(name) || '&nbsp;'}</b>${esc(adresse || '').split('\n').map((z) => `<div>${z}</div>`).join('')}</div>`;
  }
  const kopf = () => `<div class="briefkopf" style="--f:${firma.farbe1 || '#0B3B2E'}">${firma.logo ? `<img src="${firma.logo}" alt="">` : `<b>${esc(firma.name || 'Ihre Firma')}</b>`}
    <div class="absender">${[firma.logo ? firma.name : '', firma.strasse, firma.ort, firma.tel, firma.mail].filter(Boolean).map(esc).join('<br>')}</div></div>`;
  const fuss = () => `<div class="blattfuss">${[firma.name, firma.web, firma.uid].filter(Boolean).map(esc).join(' · ')}</div>`;

  /* ---------- Ansicht ---------- */
  const Z = { v: null, w: {}, leute: [] };
  const q = new URLSearchParams(location.search);
  function liste() {
    const gruppen = [...new Set(VORLAGEN.map((v) => v.gruppe))];
    $('inhalt').innerHTML = `<div class="kopf"><div><h1>Vorlagen</h1><p class="unter">Mit Ihrem Logo und Ihrer Adresse. Ausfüllen, drucken, als PDF speichern oder direkt in der Firmenablage ablegen.</p></div></div>
      ${!firma.name ? '<div class="info-box" style="margin-bottom:14px">Tipp: Unter „Firma und Design“ Logo und Adresse hinterlegen, dann erscheinen sie auf allen Vorlagen.</div>' : ''}
      ${gruppen.map((g) => `<h2 class="gruppe">${esc(g)}</h2><div class="vl-raster">${VORLAGEN.filter((v) => v.gruppe === g).map((v) => `<button class="vl" data-vorlage="${v.id}"><span>${v.ic}</span><b>${esc(v.titel)}</b><small>${esc(v.text)}</small></button>`).join('')}</div>`).join('')}`;
  }
  function editor(v) {
    Z.v = v; Z.w = Object.fromEntries(v.felder.map(([id, , , d]) => [id, d]));
    const feld = ([id, label, typ, , opt]) => {
      const w = Z.w[id] ?? '';
      if (typ === 'wahl') return `<label>${esc(label)}<select data-f="${id}">${opt.map(([k, n]) => `<option value="${k}" ${String(w) === k ? 'selected' : ''}>${esc(n)}</option>`).join('')}</select></label>`;
      if (typ === 'ja') return `<label class="haken"><input type="checkbox" data-f="${id}" ${w ? 'checked' : ''}> ${esc(label)}</label>`;
      if (typ === 'mehrzeilig') return `<label>${esc(label)}<textarea data-f="${id}" rows="3">${esc(w)}</textarea></label>`;
      const t = typ === 'datum' ? 'date' : typ === 'monat' ? 'month' : typ === 'zahl' ? 'number' : 'text';
      return `<label>${esc(label)}<input type="${t}" data-f="${id}" value="${esc(w)}" ${typ === 'person' ? 'list="leute"' : ''}></label>`;
    };
    $('inhalt').innerHTML = `<p class="hinweis" style="margin-bottom:8px"><a href="#" data-zurueck>← Alle Vorlagen</a></p>
      <div class="kopf"><div><h1>${esc(v.titel)}</h1><p class="unter">${esc(v.text)}</p></div>
        <div class="aktionen"><button class="btn" data-mail>Per E-Mail</button>${K.produkt ? '<button class="btn" data-ablage>In Firmenablage</button>' : ''}<button class="btn haupt" onclick="window.print()">Drucken / PDF</button></div></div>
      <div class="editor"><div class="card felder">${v.felder.map(feld).join('')}<datalist id="leute">${Z.leute.map((n) => `<option value="${esc(n)}">`).join('')}</datalist></div>
        <div class="vorschau-rahmen"><div class="blatt" id="blatt"></div></div></div>`;
    malen();
  }
  function malen() { const b = $('blatt'); if (!b) return; b.innerHTML = kopf() + `<div class="blattinhalt">${Z.v.html(Z.w)}</div>` + fuss(); passend(); }
  // Vorschau auf die verfügbare Breite verkleinern
  function passend() { const b = $('blatt'), r = b && b.parentElement; if (!b) return; b.style.zoom = ''; const f = Math.min(1, (r.clientWidth - 20) / b.offsetWidth); b.style.zoom = f < 1 ? f.toFixed(3) : ''; }
  addEventListener('resize', passend);
  // Text für E-Mail: Inhalt ohne Formatierung
  function alsText() { const b = $('blatt').cloneNode(true); b.querySelectorAll('.noprint,.briefkopf,.blattfuss').forEach((x) => x.remove()); return b.innerText.replace(/\n{3,}/g, '\n\n').trim(); }
  async function alsPdf() {
    const b = $('blatt'), alt = b.style.zoom; b.style.zoom = '';
    b.querySelectorAll('.noprint').forEach((x) => (x.style.display = 'none'));
    const c = await html2canvas(b, { scale: 2, backgroundColor: '#ffffff', useCORS: true, onclone: (d) => window.UI && UI.pdfFarben && UI.pdfFarben(d) });
    b.style.zoom = alt; b.querySelectorAll('.noprint').forEach((x) => (x.style.display = ''));
    const pdf = new jspdf.jsPDF({ unit: 'mm', format: 'a4' });
    pdf.addImage(c.toDataURL('image/jpeg', 0.92), 'JPEG', 0, 0, 210, Math.min(297, 210 * c.height / c.width));
    return pdf.output('blob');
  }
  async function inAblage() {
    const sb = window.supabase.createClient(K.url, K.key, { auth: { persistSession: true, autoRefreshToken: true, storageKey: K.speicher } });
    const { data: u } = await sb.auth.getUser(); if (!u || !u.user) { toast('Bitte zuerst anmelden'); return; }
    const [o, m] = await Promise.all([sb.from('ab_ordner').select('id,name,symbol').is('geloescht_am', null).order('name'), sb.from('ze_mitarbeiter').select('id,name').is('geloescht_am', null).order('name')]);
    const d = $('dlg'), passt = (m.data || []).find((x) => x.name === Z.w.name);
    d.innerHTML = `<form class="dlg"><h3>In Firmenablage speichern</h3><label>Dateiname<input name="name" value="${esc(`${Z.v.titel}${Z.w.name ? ' ' + Z.w.name : ''} ${dk(heute())}.pdf`)}"></label>
      <label>Ordner<select name="ordner"><option value="">Ohne Ordner</option>${(o.data || []).map((x) => `<option value="${x.id}">${esc(x.symbol + ' ' + x.name)}</option>`).join('')}</select></label>
      <label>Mitarbeiter<select name="ma"><option value="">Niemand</option>${(m.data || []).map((x) => `<option value="${x.id}" ${passt && passt.id === x.id ? 'selected' : ''}>${esc(x.name)}</option>`).join('')}</select></label>
      <label class="haken"><input type="checkbox" name="sichtbar"> Der Mitarbeiter darf es auf seinem Handy-Link sehen</label>
      <div class="fuss"><span></span><span class="aktionen"><button type="button" class="btn" data-zu>Abbrechen</button><button class="btn haupt">Speichern</button></span></div></form>`;
    d.onclick = (e) => { if (e.target.closest('[data-zu]')) d.close(); };
    d.onsubmit = async (e) => {
      e.preventDefault(); const f = Object.fromEntries(new FormData(d.querySelector('form'))); d.close(); toast('PDF wird erstellt …', 20000);
      const blob = await alsPdf(), id = crypto.randomUUID(), pfad = `${u.user.id}/${id}.pdf`;
      const r1 = await sb.storage.from('ablage').upload(pfad, blob, { contentType: 'application/pdf' }); if (r1.error) { toast(r1.error.message); return; }
      const r2 = await sb.from('ab_dateien').insert({ id, name: (f.name || 'Dokument.pdf').slice(0, 200), pfad, typ: 'application/pdf', groesse: blob.size, ordner_id: f.ordner || null, mitarbeiter_id: f.ma || null, fuer_mitarbeiter: !!f.sichtbar && !!f.ma });
      if (r2.error) { await sb.storage.from('ablage').remove([pfad]); toast(r2.error.message); return; }
      toast('✓ In der Firmenablage gespeichert');
    };
    d.showModal();
  }
  document.addEventListener('click', async (e) => {
    const v = e.target.closest('[data-vorlage]'); if (v) { history.replaceState(null, '', '?v=' + v.dataset.vorlage); editor(VORLAGEN.find((x) => x.id === v.dataset.vorlage)); scrollTo(0, 0); return; }
    if (e.target.closest('[data-zurueck]')) { e.preventDefault(); history.replaceState(null, '', location.pathname); liste(); return; }
    if (e.target.closest('[data-mail]')) { location.href = `mailto:?subject=${encodeURIComponent(Z.v.titel + (Z.w.name ? ' ' + Z.w.name : ''))}&body=${encodeURIComponent(alsText())}`; return; }
    if (e.target.closest('[data-ablage]')) inAblage();
  });
  document.addEventListener('input', (e) => { const f = e.target.closest('[data-f]'); if (!f) return; Z.w[f.dataset.f] = f.type === 'checkbox' ? f.checked : f.value; malen(); });
  document.addEventListener('change', (e) => { const f = e.target.closest('[data-f]'); if (!f) return; Z.w[f.dataset.f] = f.type === 'checkbox' ? f.checked : f.value; malen(); });

  // Namen der Mitarbeitenden zum Auswählen
  (async () => {
    if (!K.produkt || !window.supabase) return;
    try { const sb = window.supabase.createClient(K.url, K.key, { auth: { persistSession: true, autoRefreshToken: true, storageKey: K.speicher } });
      const { data } = await sb.from('ze_mitarbeiter').select('name').is('geloescht_am', null).order('name'); Z.leute = (data || []).map((x) => x.name);
      const dl = $('leute'); if (dl) dl.innerHTML = Z.leute.map((n) => `<option value="${esc(n)}">`).join(''); } catch {}
  })();
  const start = VORLAGEN.find((x) => x.id === q.get('v'));
  start ? editor(start) : liste();
  window.Vorlagen = { LISTE: VORLAGEN.map((v) => ({ id: v.id, titel: v.titel, gruppe: v.gruppe })) };
})();

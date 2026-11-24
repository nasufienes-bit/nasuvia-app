/* Ordi als Assistent: versteht Aufträge, zeigt eine Vorschau und führt erst nach „Ja“ aus.
   Ohne KI-Schlüssel versteht Ordi die wichtigsten Sätze selbst (Rechnung, Erinnerung, Zahlen, Mahnen, Stelle, Liquidität).
   Mit KI (Edge-Funktion „ordi“) kommen Aufträge als { typ, ... } zurück und laufen über dieselbe Vorschau.
   window.OrdiAktionen = { erkennen(frage) → Promise<{ text?, html?, aktion? } | null>, karte(aktion), ausfuehren(aktion), kontext() } */
(function () {
  'use strict';
  if (window.OrdiAktionen) return;
  const esc = (s) => String(s == null ? '' : s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
  const fmt = new Intl.NumberFormat('de-CH', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  const chf = (r) => 'CHF ' + fmt.format((r || 0) / 100);
  const zahl = (t) => Number(String(t || '').replace(/[’'\s]/g, '').replace(',', '.'));
  const heute = () => new Date().toLocaleDateString('sv-SE');
  const plusTage = (d, n) => { const x = new Date(d + 'T12:00'); x.setDate(x.getDate() + n); return x.toLocaleDateString('sv-SE'); };
  const dk = (d) => (d ? d.slice(8, 10) + '.' + d.slice(5, 7) + '.' + d.slice(0, 4) : '');
  const MONATE = ['januar', 'februar', 'märz', 'april', 'mai', 'juni', 'juli', 'august', 'september', 'oktober', 'november', 'dezember'];
  const WURZEL = (() => { const s = document.querySelector('script[src*="ordi-aktionen.js"]'); try { return new URL('.', s.src).href; } catch { return '/'; } })();

  // Daten auf dem Gerät lesen (Buchhaltung, Rechnungen)
  const idb = (name, store) => new Promise((ok) => {
    try {
      const r = indexedDB.open(name);
      r.onsuccess = () => { const db = r.result; if (!db.objectStoreNames.contains(store)) { db.close(); return ok([]); }
        const g = db.transaction(store).objectStore(store).getAll(); g.onsuccess = () => { db.close(); ok((g.result || []).filter((x) => !x.geloescht)); }; g.onerror = () => { db.close(); ok([]); }; };
      r.onerror = () => ok([]);
    } catch { ok([]); }
  });
  const netto = (b) => (b.betragRappen || 0) - (b.mwstRappen || 0);
  async function kontext() {
    const [b, r, e] = await Promise.all([idb('nasuvia-buchhaltung', 'buchungen'), idb('nasuvia-rechnungen', 'rechnung'), idb('nasuvia-buchhaltung', 'einstellungen')]);
    const h = heute(), j = h.slice(0, 4);
    const monate = {};
    for (const x of b) { const m = (x.datum || '').slice(0, 7); if (!m) continue; monate[m] = monate[m] || { ein: 0, aus: 0 }; if (x.typ === 'einnahme') monate[m].ein += netto(x); else monate[m].aus += netto(x); }
    const rechn = r.filter((x) => (x.dokArt || 'rechnung') === 'rechnung');
    const offen = rechn.filter((x) => !x.bezahlt), ueber = offen.filter((x) => x.faellig && x.faellig < h);
    const haupt = e.find((x) => x.id === 'haupt') || {};
    const kat = {}; for (const x of b) if (x.typ === 'ausgabe' && (x.datum || '').startsWith(j)) kat[x.kategorie] = (kat[x.kategorie] || 0) + netto(x);
    return { heute: h, monate, offen: { anzahl: offen.length, summe: offen.reduce((s, x) => s + (x.betragRappen || 0), 0) }, ueberfaellig: { anzahl: ueber.length, summe: ueber.reduce((s, x) => s + (x.betragRappen || 0), 0), liste: ueber.slice(0, 8).map((x) => ({ nr: x.nr, kunde: x.kunde, betrag: x.betragRappen, faellig: x.faellig })) },
      kontostand: haupt.liquiStand || null, ausgabenKategorien: kat, kunden: [...new Set(rechn.map((x) => x.kunde).filter(Boolean))].slice(0, 60) };
  }

  // Zeitangaben: heute, morgen, übermorgen, in 3 Tagen, am 12.12., nächsten Montag
  function datumAus(t) {
    const n = t.toLowerCase(); let m;
    if (/übermorgen/.test(n)) return plusTage(heute(), 2);
    if (/morgen/.test(n)) return plusTage(heute(), 1);
    if (/heute/.test(n)) return heute();
    if ((m = n.match(/in (\d+) tag/))) return plusTage(heute(), Number(m[1]));
    if ((m = n.match(/in (\d+) woche/))) return plusTage(heute(), 7 * Number(m[1]));
    if ((m = n.match(/(\d{1,2})\.(\d{1,2})\.?(\d{2,4})?/))) { const jj = m[3] ? (m[3].length === 2 ? '20' + m[3] : m[3]) : heute().slice(0, 4); let d = `${jj}-${m[2].padStart(2, '0')}-${m[1].padStart(2, '0')}`; if (!m[3] && d < heute()) d = `${Number(jj) + 1}${d.slice(4)}`; return d; }
    const TAGE = ['sonntag', 'montag', 'dienstag', 'mittwoch', 'donnerstag', 'freitag', 'samstag'];
    const i = TAGE.findIndex((x) => n.includes(x));
    if (i >= 0) { const d = new Date(); const diff = ((i - d.getDay() + 7) % 7) || 7; return plusTage(heute(), diff); }
    return '';
  }
  const zeitAus = (t) => { const m = t.match(/um (\d{1,2})(?:[:.](\d{2}))?\s*(uhr)?/i); return m ? `${m[1].padStart(2, '0')}:${m[2] || '00'}` : ''; };

  // Team-Aufträge, auch mehrere in einem Satz:
  // „Füge einen Mitarbeiter namens Luca Meier hinzu, erstelle den Auftrag Badsanierung Müller und teile ihm diesen Auftrag zu“
  const STOP = new Set(['füge', 'fuege', 'erfasse', 'lege', 'nimm', 'mach', 'erstelle', 'eröffne', 'teile', 'weise', 'gib', 'plane', 'einen', 'eine', 'ein', 'neuen', 'neue', 'neu', 'mitarbeiter', 'mitarbeiterin', 'mitarbeitende', 'namens', 'name', 'namen', 'heisst', 'hinzu', 'an', 'auf', 'ist', 'mit', 'dem', 'den', 'die', 'der', 'das', 'ihm', 'ihn', 'ihr', 'ihnen', 'sie', 'diesen', 'dieser', 'diese', 'auftrag', 'zu', 'bitte', 'noch', 'dazu', 'person', 'als']);
  const BRUCH = /^(mit|stundenlohn|lohn|ansatz|und|als|für|ab|per)$/i;
  const nameAus = (x) => {
    const w = x.replace(/[:,.!?]/g, ' ').split(/\s+/).filter(Boolean), out = [];
    let start = false;
    for (const t of w) {
      const k = t.toLowerCase();
      if (!start) { if (STOP.has(k)) continue; start = true; }
      if (BRUCH.test(k) || STOP.has(k) || /\d/.test(k)) { if (out.length) break; else continue; }
      out.push(t.charAt(0).toUpperCase() + t.slice(1)); if (out.length === 2) break;
    }
    return out.join(' ');
  };
  function teamPlan(t) {
    const teile = t.split(/\s*(?:,|;|\bund dann\b|\bdann\b|\bund\b(?=\s+(?:füge|erstelle|lege|teile|weise|plane|gib|mach|erfasse|schreib|stell)))\s*/i).filter(Boolean);
    const schritte = []; let ma = null, af = null, m;
    const geld = (x) => { const g = x && x.match(/(\d+(?:[.,]\d+)?)/); return g ? Math.round(zahl(g[1]) * 100) : 0; };
    for (const teil of teile) {
      const x = teil.trim();
      if (/\bmitarbeiter(in)?\b/i.test(x) && /(füge|fuege|erfasse|lege|nimm|neue[nr]?)\b/i.test(x) && !/\bauftrag\b/i.test(x)) {
        const name = nameAus(x); if (!name) continue;
        ma = name;
        const lohn = x.match(/(?:stundenlohn|lohn)\D{0,12}(\d+(?:[.,]\d+)?)/i), ans = x.match(/(?:ansatz|verrechnen|für kunden)\D{0,12}(\d+(?:[.,]\d+)?)/i);
        schritte.push({ typ: 'mitarbeiter', name, stundenlohn: lohn ? geld(lohn[1]) : 0, ansatz: ans ? geld(ans[1]) : 0 }); continue;
      }
      if ((m = x.match(/(?:erstelle|lege|mach|eröffne|füge)\b.*?\bauftrag\b\s*(?:namens|mit\s+(?:dem\s+)?namen|:)?\s*[„"«]?([^„"«»"]+?)[“"»]?(?:\s+(?:für|bei)\s+(?:den\s+|die\s+|kunde[n]?\s+)?(.+?))?(?:\s+(?:an|in)\s+(?:der\s+)?(.+?))?(?:\s+(?:an|hinzu|auf))?\s*$/i)) && !/^(an|hinzu|auf|zu|diesen|den)$/i.test(m[1].trim())) {
        af = m[1].trim(); schritte.push({ typ: 'auftrag', name: af, kunde: (m[2] || '').trim(), adresse: (m[3] || '').trim() }); continue;
      }
      if (/(teile|weise|gib)\b.*\bzu\b/i.test(x)) {
        const was = (x.match(/auftrag\s+[„"«]?([^„"«»"]+?)[“"»]?\s+(?:zu\b|an\b)/i) || [])[1];
        let auftrag = (was && !/^(diesen|den|dem|neuen)$/i.test(was) ? was : '') || af;
        let wer = nameAus(was ? x.replace(was, ' ') : x) || ma;
        // „Teile den Auftrag Heizung Schulhaus Sara zu“: letztes Wort ist die Person
        if (!wer && auftrag && auftrag.split(/\s+/).length >= 2) { const w = auftrag.split(/\s+/); wer = w.pop(); auftrag = w.join(' '); }
        if (auftrag && !af) af = auftrag;
        schritte.push({ typ: 'zuweisen', mitarbeiter: wer || '', auftrag: auftrag || '' }); continue;
      }
      if (/\b(rechnung|rächnig|rechnig|faktura)\b/i.test(x) && /(schreib|mach|erstell|stell)/i.test(x)) {
        const betrag = x.match(/(?:über|für|von)\s*(?:chf|fr\.?)?\s*(\d+(?:['’]\d{3})*(?:[.,]\d+)?)\s*(?:chf|franken|fr\.)?(?:\s+(?:für|wegen)\s+(.+))?/i);
        const std = x.match(/(\d+(?:[.,]\d+)?)\s*(?:std\.?|stunden|h)\b.*?(?:à|a|zu|je)\s*(?:chf|fr\.?)?\s*(\d+(?:[.,]\d+)?)/i);
        const fuer = (x.match(/(?:an|für)\s+(?:den\s+|die\s+|kunde[n]?\s+)?([A-ZÄÖÜ][\wäöüé&.' -]+?)(?:\s+(?:über|mit|für)\b|$)/) || [])[1];
        if (std) schritte.push({ typ: 'rechnung', kunde: fuer || '', auftrag: af || '', positionen: [{ text: 'Arbeit' + (af ? ' ' + af : ''), menge: zahl(std[1]), preis: Math.round(zahl(std[2]) * 100) }] });
        else if (betrag && zahl(betrag[1]) > 0) schritte.push({ typ: 'rechnung', kunde: fuer || '', auftrag: af || '', positionen: [{ text: (betrag[2] || (af ? 'Arbeit ' + af : 'Leistung')).trim(), menge: 1, preis: Math.round(zahl(betrag[1]) * 100) }] });
        else schritte.push({ typ: 'auftrag_rechnung', auftrag: af || (x.match(/auftrag\s+(.+?)(?:\s+(?:und|mit)\b|$)/i) || [])[1] || '' });
        continue;
      }
      const ein = x.match(/plane\s+(.+?)\s+(?:für|am)\s+(.+?)(?:\s+(?:bei|auf|für)\s+(.+))?$/i);
      if (ein) { const d = datumAus(ein[2]); if (d) { schritte.push({ typ: 'einsatz', mitarbeiter: /^(ihn|sie|ihm|ihr)$/i.test(ein[1]) ? ma : nameAus(ein[1]) || ma, datum: d, von: zeitAus(ein[2]), auftrag: ein[3] || af || '' }); continue; } }
    }
    const ord = { mitarbeiter: 0, auftrag: 1, zuweisen: 2, einsatz: 3, rechnung: 9, auftrag_rechnung: 9 };
    schritte.sort((a, b) => (ord[a.typ] ?? 5) - (ord[b.typ] ?? 5));
    for (const z of schritte) if ((z.typ === 'auftrag_rechnung' || z.typ === 'rechnung') && !z.auftrag) z.auftrag = af || '';
    for (const z of schritte) { if (z.typ === 'zuweisen' || z.typ === 'einsatz') { z.mitarbeiter = z.mitarbeiter || ma || ''; if (z.typ === 'zuweisen') z.auftrag = z.auftrag || af || ''; } }
    return schritte;
  }

  // Ohne KI: die häufigsten Aufträge selbst verstehen
  async function erkennen(frage) {
    const t = frage.trim(), n = t.toLowerCase(); let m;
    if (/(mitarbeiter|auftrag|teile .* zu|weise .* zu|plane )/i.test(t) && !/^\s*rechnung\s+(an|für)\b/i.test(t)) {
      const s2 = teamPlan(t);
      const fehlt = s2.find((z) => z.typ === 'zuweisen' && (!z.mitarbeiter || !z.auftrag));
      const ohneAuftrag = s2.find((z) => z.typ === 'auftrag_rechnung' && !z.auftrag);
      if (ohneAuftrag) return { text: 'Für welchen Auftrag soll ich die Rechnung machen? Sagen Sie z. B.: «Schreib die Rechnung für den Auftrag Badsanierung Müller».' };
      if (fehlt) return { text: !fehlt.auftrag ? 'Welchen Auftrag soll ich zuteilen? Sagen Sie z. B.: «Erstelle den Auftrag Badsanierung Müller und teile ihn Luca zu».' : 'Wem soll ich den Auftrag zuteilen? Nennen Sie bitte den Namen.' };
      if (s2.length > 1) return { aktion: { typ: 'plan', schritte: s2 } };
      if (s2.length === 1) return { aktion: s2[0] };
    }
    // Rechnung: „Rechnung an Müller über 3 Stunden à 95“, „Rechnung für Huber AG über CHF 500 für Gartenarbeit“
    if ((m = t.match(/rechnung\s+(?:an|für)\s+(.+?)\s+(?:über|für|mit)\s+(.+)$/i))) {
      const kunde = m[1].trim(), rest = m[2]; let pos = null, x;
      if ((x = rest.match(/(\d+(?:[.,]\d+)?)\s*(?:std\.?|stunden|h)\b(?:\s+(.+?))?\s+(?:à|a|zu|je|für)\s*(?:chf|fr\.?)?\s*(\d+(?:[.,]\d+)?)/i))) pos = [{ text: (x[2] && !/^(à|a|zu)$/i.test(x[2]) ? x[2] : 'Arbeit'), menge: zahl(x[1]), preis: Math.round(zahl(x[3]) * 100) }];
      else if ((x = rest.match(/(?:chf|fr\.?)?\s*(\d+(?:['’]\d{3})*(?:[.,]\d+)?)(?:\s*(?:chf|franken|fr\.)(?=\s|$))?(?:\s+(?:für|wegen)\s+(.+))?/i))) pos = [{ text: (x[2] || 'Leistung').trim(), menge: 1, preis: Math.round(zahl(x[1]) * 100) }];
      if (pos && pos[0].preis > 0) return { aktion: { typ: 'rechnung', kunde, positionen: pos } };
    }
    // Erinnerung: „Erinnere mich morgen um 9 an die Offerte für Keller“
    if ((m = t.match(/^erinner(?:e|n)?\s+(?:mich|uns)\s+(.*)$/i))) {
      const rest = m[1], datum = datumAus(rest) || plusTage(heute(), 1), zeit = zeitAus(rest);
      const titel = rest.replace(/\b(heute|morgen|übermorgen|in \d+ (tagen?|wochen?)|am \d{1,2}\.\d{1,2}\.?(\d{2,4})?|nächsten? \w+|(am )?(montag|dienstag|mittwoch|donnerstag|freitag|samstag|sonntag)|um \d{1,2}([:.]\d{2})?\s*(uhr)?)\b/gi, '').replace(/^\s*(an|daran,?|dass)\s+/i, '').replace(/^\s*(die|den|das|der)\s+/i, '').replace(/\s+/g, ' ').trim();
      if (titel) return { aktion: { typ: 'erinnerung', titel: titel.charAt(0).toUpperCase() + titel.slice(1), datum, zeit } };
    }
    // Mahnen
    if (/(mahn|erinner).*(alle|überfällig|säumig|offen)/.test(n)) return { aktion: { typ: 'mahnen' } };
    // Stelle ausschreiben: „Stelle für Maler 80%“
    if ((m = t.match(/(?:stelle|inserat|job)\s+(?:für|als)\s+(?:eine?n?\s+)?([a-zäöüé/ -]+?)(?:\s+(\d{2,3})\s*(?:-|–|bis)?\s*(\d{2,3})?\s*%)?$/i))) return { aktion: { typ: 'stelle', beruf: m[1].trim(), pensum: m[2] ? (m[3] ? `${m[2]}–${m[3]} %` : `${m[2]} %`) : '' } };
    // Zahlen
    if (/(umsatz|einnahmen|ausgaben|gewinn|verdient)/.test(n)) {
      const k = await kontext(); const h = k.heute;
      let von = h.slice(0, 7), bis = von, name = 'diesem Monat';
      const mi = MONATE.findIndex((x) => n.includes(x));
      if (/letzt(en|er) monat|vormonat/.test(n)) { const d = new Date(); d.setDate(1); d.setMonth(d.getMonth() - 1); von = bis = d.toLocaleDateString('sv-SE').slice(0, 7); name = 'im letzten Monat'; }
      else if (mi >= 0) { const jj = (n.match(/20\d{2}/) || [])[0] || (mi + 1 > Number(h.slice(5, 7)) ? String(Number(h.slice(0, 4)) - 1) : h.slice(0, 4)); von = bis = `${jj}-${String(mi + 1).padStart(2, '0')}`; name = `im ${MONATE[mi].charAt(0).toUpperCase() + MONATE[mi].slice(1)} ${jj}`; }
      else if ((m = n.match(/20\d{2}/)) || /dieses jahr|jahr/.test(n)) { const jj = m ? m[0] : h.slice(0, 4); von = jj + '-01'; bis = jj + '-12'; name = 'im Jahr ' + jj; }
      let ein = 0, aus = 0; for (const [mm, w] of Object.entries(k.monate)) if (mm >= von && mm <= bis) { ein += w.ein; aus += w.aus; }
      return { html: `<b>${esc(name.charAt(0).toUpperCase() + name.slice(1))}</b> (ohne MWST):<br>Einnahmen <b>${chf(ein)}</b><br>Ausgaben <b>${chf(aus)}</b><br>Gewinn <b>${chf(ein - aus)}</b>`, text: `Einnahmen ${chf(ein)}, Ausgaben ${chf(aus)}`, ziel: WURZEL + '?bereich=buchhaltung' };
    }
    if (/(offene|überfällige|unbezahlte)\s+rechnung|wer (hat|schuldet).*(bezahlt|geld)/.test(n)) {
      const k = await kontext();
      return { html: `Offen: <b>${k.offen.anzahl}</b> Rechnungen, ${chf(k.offen.summe)}.<br>Davon überfällig: <b>${k.ueberfaellig.anzahl}</b>, ${chf(k.ueberfaellig.summe)}${k.ueberfaellig.liste.length ? '<br>' + k.ueberfaellig.liste.map((x) => `· Nr. ${esc(x.nr)} ${esc(x.kunde || '')}: ${chf(x.betrag)}`).join('<br>') : ''}`,
        text: `${k.offen.anzahl} offene Rechnungen`, chips: k.ueberfaellig.anzahl ? ['Erinnere alle überfälligen Kunden'] : [] };
    }
    if (/(kontostand|reicht das geld|liquidität|wie viel geld)/.test(n)) {
      const k = await kontext();
      return { html: k.kontostand ? `Kontostand ${chf(k.kontostand.betragRappen)} (Stand ${dk(k.kontostand.datum)}). Die Vorschau auf 12 Wochen zeigt, ob es reicht.` : 'Ich kenne Ihren Kontostand noch nicht. Laden Sie einen Bankauszug oder tragen Sie ihn in der Liquiditätsvorschau ein.', text: 'Kontostand', ziel: WURZEL + '?bereich=buchhaltung&ansicht=liquiditaet' };
    }
    return null;
  }

  // Vorschau-Karte
  const TITEL = { auftrag_rechnung: '🧾 Rechnung zum Auftrag', plan: '📋 Mehrere Schritte', mitarbeiter: '👤 Mitarbeiter erfassen', auftrag: '📍 Auftrag erstellen', zuweisen: '🔗 Auftrag zuteilen', rechnung: '🧾 Rechnung vorbereiten', erinnerung: '🔔 Erinnerung eintragen', mahnen: '⏰ Überfällige erinnern', stelle: '🧑‍💼 Offene Stelle vorbereiten', einsatz: '🗓️ Einsatz planen', navigieren: '➡️ Hinführen' };
  const schrittText = (a) => ({
    mitarbeiter: () => `Mitarbeiter <b>${esc(a.name)}</b> erfassen${a.stundenlohn ? ', Stundenlohn ' + chf(a.stundenlohn) : ''}${a.ansatz ? ', Ansatz ' + chf(a.ansatz) : ''}`,
    auftrag: () => `Auftrag <b>${esc(a.name)}</b> erstellen${a.kunde ? ' für ' + esc(a.kunde) : ''}${a.adresse ? ', ' + esc(a.adresse) : ''}`,
    zuweisen: () => `Auftrag <b>${esc(a.auftrag)}</b> an <b>${esc(a.mitarbeiter)}</b> zuteilen`,
    rechnung: () => `Rechnung${a.kunde ? ' an <b>' + esc(a.kunde) + '</b>' : a.auftrag ? ' zum Auftrag <b>' + esc(a.auftrag) + '</b>' : ''}: ${(a.positionen || []).map((p) => `${esc(p.text)} ${Number(p.menge).toLocaleString('de-CH')} × ${chf(p.preis)}`).join(', ')} vorbereiten`,
    auftrag_rechnung: () => `Rechnung zum Auftrag <b>${esc(a.auftrag)}</b> vorbereiten (alle noch nicht verrechneten Stunden, Material und Fahrspesen)`,
    einsatz: () => `Einsatz für <b>${esc(a.mitarbeiter)}</b> am ${dk(a.datum)}${a.von ? ' um ' + esc(a.von) : ''}${a.auftrag ? ' (' + esc(a.auftrag) + ')' : ''}`,
  }[a.typ] || (() => esc(TITEL[a.typ] || a.typ)))();
  function karte(a) {
    let inhalt = '';
    if (a.typ === 'plan') inhalt = `<ol style="margin:0;padding-left:18px">${(a.schritte || []).map((z) => `<li>${schrittText(z)}</li>`).join('')}</ol>`;
    if (['mitarbeiter', 'auftrag', 'zuweisen', 'auftrag_rechnung'].includes(a.typ)) inhalt = schrittText(a) + (a.typ === 'auftrag_rechnung' ? '<br><small>Sie sehen die Rechnung danach und senden sie selbst.</small>' : '');
    if (a.typ === 'rechnung') inhalt = `An: <b>${esc(a.kunde)}</b><br>${(a.positionen || []).map((p) => `${esc(p.text)}: ${Number(p.menge).toLocaleString('de-CH')} × ${chf(p.preis)} = <b>${chf(Math.round(p.menge * p.preis))}</b>`).join('<br>')}<br><small>Sie sehen die Rechnung danach und senden sie selbst.</small>`;
    if (a.typ === 'erinnerung') inhalt = `<b>${esc(a.titel)}</b><br>${dk(a.datum)}${a.zeit ? ' um ' + esc(a.zeit) : ' (ganzer Tag)'}`;
    if (a.typ === 'mahnen') inhalt = 'Ich öffne die Rechnungen mit dem Mahn-Assistenten. Dort sehen Sie alle Überfälligen und bereiten Erinnerung oder Mahnung mit einem Klick vor.';
    if (a.typ === 'stelle') inhalt = `Beruf: <b>${esc(a.beruf)}</b>${a.pensum ? ', ' + esc(a.pensum) : ''}<br><small>Titel und Text werden ausgefüllt, Sie prüfen und speichern.</small>`;
    if (a.typ === 'einsatz') inhalt = `${esc(a.mitarbeiter || '')}${a.auftrag ? ' · ' + esc(a.auftrag) : ''}<br>${dk(a.datum)}${a.von ? ' ' + esc(a.von) + (a.bis ? '–' + esc(a.bis) : '') : ''}${a.adresse ? '<br>' + esc(a.adresse) : ''}`;
    if (a.typ === 'navigieren') inhalt = esc(a.text || '');
    return `<div class="ordi-aktion"><b>${TITEL[a.typ] || 'Auftrag'}</b><div style="margin:6px 0 8px;font-size:13.5px;line-height:1.5">${inhalt}</div><div class="ordi-chips" style="margin:0"><button data-ordi-ja>✓ Ja, ausführen</button><button data-ordi-nein>Abbrechen</button></div></div>`;
  }

  async function ausfuehren(a) {
    const sb = window.NASUVIA_SB;
    if (a.typ === 'plan') {
      const aus = [];
      for (const z of a.schritte || []) { const t = await ausfuehren(z); aus.push(t); if (/^Das hat nicht geklappt|^Ich finde/.test(t)) break; }
      return aus.join('\n');
    }
    const finde = async (tabelle, name) => {
      const { data } = await sb.from(tabelle).select('*').is('geloescht_am', null).limit(1000);
      const n = String(name || '').toLowerCase().trim();
      return (data || []).find((x) => x.name.toLowerCase() === n) || (data || []).find((x) => x.name.toLowerCase().includes(n) || n.includes(x.name.toLowerCase().split(' ')[0]));
    };
    if (a.typ === 'mitarbeiter') {
      if (!sb) return 'Mitarbeiter gibt es nach der Anmeldung.';
      const alt = await finde('ze_mitarbeiter', a.name);
      if (alt && alt.name.toLowerCase() === a.name.toLowerCase()) return `✓ ${alt.name} ist schon erfasst.`;
      const { data, error } = await sb.from('ze_mitarbeiter').insert({ name: a.name.slice(0, 120), stundenlohn_rappen: a.stundenlohn || 0, ansatz_rappen: a.ansatz || 0 }).select('name,token').single();
      if (error) return 'Das hat nicht geklappt: ' + error.message;
      const link = new URL('zeit/erfassen/?t=' + data.token, WURZEL).href;
      return `✓ ${data.name} ist erfasst. Persönlicher Handy-Link (per WhatsApp schicken): ${link}${a.stundenlohn ? '' : '\nTipp: Stundenlohn und Ansatz tragen Sie in der Zeiterfassung unter „Mitarbeiter“ nach.'}`;
    }
    if (a.typ === 'auftrag') {
      if (!sb) return 'Aufträge gibt es nach der Anmeldung.';
      const alt = await finde('ze_auftraege', a.name);
      if (alt && alt.name.toLowerCase() === a.name.toLowerCase()) return `✓ Auftrag „${alt.name}“ gibt es schon.`;
      const { error } = await sb.from('ze_auftraege').insert({ name: a.name.slice(0, 160), kunde: (a.kunde || '').slice(0, 160), adresse: (a.adresse || '').slice(0, 200) });
      return error ? 'Das hat nicht geklappt: ' + error.message : `✓ Auftrag „${a.name}“ erstellt${a.kunde ? ' für ' + a.kunde : ''}.`;
    }
    if (a.typ === 'zuweisen') {
      if (!sb) return 'Bitte zuerst anmelden.';
      const [m, f] = await Promise.all([finde('ze_mitarbeiter', a.mitarbeiter), finde('ze_auftraege', a.auftrag)]);
      if (!m) return `Ich finde keine Mitarbeiterin und keinen Mitarbeiter „${a.mitarbeiter}“.`;
      if (!f) return `Ich finde keinen Auftrag „${a.auftrag}“.`;
      const zu = [...new Set([...(f.zugewiesen || []), m.id])];
      const { error } = await sb.from('ze_auftraege').update({ zugewiesen: zu }).eq('id', f.id);
      return error ? 'Das hat nicht geklappt: ' + error.message : `✓ „${f.name}“ ist ${m.name} zugeteilt. ${m.name} sieht den Auftrag jetzt auf dem Handy.`;
    }
    if (a.typ === 'auftrag_rechnung') {
      if (!sb) return 'Bitte zuerst anmelden.';
      const f = await finde('ze_auftraege', a.auftrag); if (!f) return `Ich finde keinen Auftrag „${a.auftrag}“.`;
      const [{ data: ein }, { data: ma }, { data: mat }] = await Promise.all([
        sb.from('ze_eintraege').select('id,mitarbeiter_id,datum,minuten,taetigkeit,km').eq('auftrag_id', f.id).eq('verrechnet', false).is('geloescht_am', null),
        sb.from('ze_mitarbeiter').select('id,name,ansatz_rappen'),
        sb.from('lg_bewegungen').select('id,menge,lg_artikel(name,nummer,verkauf_rappen,einheit)').eq('auftrag_id', f.id).eq('art', 'ausgang').eq('verrechnet', false)]);
      const pos = [], g = new Map();
      for (const e of ein || []) { const k = e.mitarbeiter_id + '|' + (e.taetigkeit || '').toLowerCase(); if (!g.has(k)) g.set(k, { m: (ma || []).find((x) => x.id === e.mitarbeiter_id) || {}, t: e.taetigkeit, min: 0 }); g.get(k).min += e.minuten; }
      for (const x of g.values()) pos.push({ text: `${x.t || 'Arbeit'} (${x.m.name || 'Mitarbeiter'})`, menge: Math.round(x.min / 6) / 10, preis: x.m.ansatz_rappen || 0 });
      const pa = new Map(); for (const b of mat || []) { const k = (b.lg_artikel || {}).name || 'Material'; const y = pa.get(k) || { a: b.lg_artikel || {}, menge: 0 }; y.menge += Math.abs(Number(b.menge) || 0); pa.set(k, y); }
      for (const y of pa.values()) pos.push({ text: (y.a.name || 'Material') + (y.a.nummer ? ` (${y.a.nummer})` : ''), menge: Math.round(y.menge * 100) / 100, preis: y.a.verkauf_rappen || 0 });
      const km = (ein || []).reduce((s, e) => s + Number(e.km || 0), 0); if (km) pos.push({ text: `Fahrspesen ${km} km`, menge: km, preis: 70 });
      if (!pos.length) pos.push({ text: 'Arbeit gemäss Auftrag ' + f.name, menge: 1, preis: f.pauschal_rappen || 0 });
      if ((ein || []).length) await sb.from('ze_eintraege').update({ verrechnet: true }).in('id', ein.map((e) => e.id));
      if ((mat || []).length) await sb.from('lg_bewegungen').update({ verrechnet: true }).in('id', mat.map((b) => b.id));
      return ausfuehren({ typ: 'rechnung', kunde: f.kunde || '', projekt: f.name, positionen: pos });
    }
    if (a.typ === 'rechnung') {
      if (!a.kunde && a.auftrag && sb) { const f = await finde('ze_auftraege', a.auftrag); if (f) { a.kunde = f.kunde || ''; a.projekt = f.name; } }
      try { sessionStorage.setItem('ordasio.zeit.rechnung', JSON.stringify({ positionen: a.positionen.map((p) => ({ text: p.text, menge: String(p.menge), preis: p.preis ? (p.preis / 100).toFixed(2) : '' })), kunde: a.kunde, projekt: a.projekt || '', quelle: 'Ordi' })); } catch {}
      location.href = WURZEL + 'rechnungen/'; return 'Ich öffne die Rechnung …';
    }
    if (a.typ === 'erinnerung') {
      if (!sb) return 'Erinnerungen gibt es nach der Anmeldung.';
      const ganztag = !a.zeit, wann = new Date(`${a.datum}T${a.zeit || '08:00'}:00`).toISOString();
      const { error } = await sb.from('erinnerungen').insert({ titel: a.titel.slice(0, 200), wann, ganztag, wiederholung: 'nie', vorher_min: ganztag ? 0 : 15, bereich: location.pathname });
      return error ? 'Das hat nicht geklappt: ' + error.message : `✓ Eingetragen: „${a.titel}“ am ${dk(a.datum)}${a.zeit ? ' um ' + a.zeit : ''}. Mit verbundenem Kalender meldet sich auch Ihr Handy.`;
    }
    if (a.typ === 'mahnen') { location.href = WURZEL + 'rechnungen/#mahnBox'; return 'Ich öffne den Mahn-Assistenten …'; }
    if (a.typ === 'stelle') { try { sessionStorage.setItem('ordasio.stelle', JSON.stringify({ beruf: a.beruf, pensum: a.pensum || '' })); } catch {} location.href = WURZEL + 'ablage/?tab=bewerbungen'; return 'Ich öffne die offenen Stellen …'; }
    if (a.typ === 'einsatz') {
      if (!sb) return 'Einsätze gibt es nach der Anmeldung.';
      const [{ data: ma }, { data: af }] = await Promise.all([sb.from('ze_mitarbeiter').select('id,name').is('geloescht_am', null), sb.from('ze_auftraege').select('id,name').is('geloescht_am', null)]);
      const finde = (l, n) => (l || []).find((x) => n && x.name.toLowerCase().includes(String(n).toLowerCase()));
      const m = finde(ma, a.mitarbeiter); if (!m) return `Ich finde keine Mitarbeiterin und keinen Mitarbeiter „${a.mitarbeiter || ''}“.`;
      const f = finde(af, a.auftrag);
      const { error } = await sb.from('ze_einsaetze').insert({ mitarbeiter_id: m.id, auftrag_id: f ? f.id : null, datum: a.datum, von: a.von || null, bis: a.bis || null, adresse: a.adresse || '', info: a.info || '' });
      return error ? 'Das hat nicht geklappt: ' + error.message : `✓ Einsatz für ${m.name} am ${dk(a.datum)} geplant${f ? ' (' + f.name + ')' : ''}.`;
    }
    if (a.typ === 'navigieren' && a.ziel) { location.href = new URL(a.ziel, WURZEL).href; return 'Ich führe Sie hin …'; }
    return 'Das kann ich noch nicht.';
  }
  window.OrdiAktionen = { erkennen, karte, ausfuehren, kontext };
})();

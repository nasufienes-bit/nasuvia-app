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

  // Ohne KI: die häufigsten Aufträge selbst verstehen
  async function erkennen(frage) {
    const t = frage.trim(), n = t.toLowerCase(); let m;
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
  const TITEL = { rechnung: '🧾 Rechnung vorbereiten', erinnerung: '🔔 Erinnerung eintragen', mahnen: '⏰ Überfällige erinnern', stelle: '🧑‍💼 Offene Stelle vorbereiten', einsatz: '🗓️ Einsatz planen', navigieren: '➡️ Hinführen' };
  function karte(a) {
    let inhalt = '';
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
    if (a.typ === 'rechnung') {
      try { sessionStorage.setItem('ordasio.zeit.rechnung', JSON.stringify({ positionen: a.positionen.map((p) => ({ text: p.text, menge: String(p.menge), preis: (p.preis / 100).toFixed(2) })), kunde: a.kunde, quelle: 'Ordi' })); } catch {}
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

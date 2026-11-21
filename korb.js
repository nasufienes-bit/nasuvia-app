// „Zuletzt gelöscht“ für Zeiterfassung, Lager und Termine: Löschen markiert nur (geloescht_am),
// nach 30 Tagen wird endgültig entfernt. Wiederherstellen jederzeit davor.
(() => {
  const TAGE = 30;
  const esc = (s) => String(s ?? '').replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
  const dk = (d) => (d ? d.slice(8, 10) + '.' + d.slice(5, 7) + '.' + d.slice(0, 4) : '');
  async function loeschen(sb, tabelle, id, titel, extra = {}) {
    if (!confirm(`„${titel}“ löschen?\n\nSie finden es ${TAGE} Tage lang unter „Zuletzt gelöscht“ und können es dort wiederherstellen.`)) return false;
    const ids = [].concat(id);
    const { error } = await sb.from(tabelle).update({ geloescht_am: new Date().toISOString(), ...extra }).in('id', ids);
    if (error) { alert(error.message); return false; }
    // Sofort rückgängig machbar (alte Werte von extra, z. B. aktiv, werden mitgerettet)
    if (window.Rueckgaengig) window.Rueckgaengig.zeigen(`„${titel}“ gelöscht`, async () => {
      const zurueck = { geloescht_am: null }; if ('aktiv' in extra) zurueck.aktiv = true;
      const r = await sb.from(tabelle).update(zurueck).in('id', ids); if (r.error) throw r.error;
      if (window.Korb.neuLaden) await window.Korb.neuLaden();
    });
    return true;
  }
  // Ändern mit Rückgängig: alte Werte der geänderten Felder werden vorher gelesen
  async function aendern(sb, tabelle, id, werte, text = 'Gespeichert', schluessel = 'id') {
    const ids = [].concat(id), felder = Object.keys(werte);
    const alt = await sb.from(tabelle).select([schluessel, ...felder].join(',')).in(schluessel, ids);
    const r = await sb.from(tabelle).update(werte).in(schluessel, ids).select('*');
    if (r.error) return { error: r.error, data: null };
    if (window.Rueckgaengig && !alt.error && alt.data && alt.data.length) window.Rueckgaengig.zeigen(text, async () => {
      for (const zeile of alt.data) { const { [schluessel]: k, ...vorher } = zeile; const x = await sb.from(tabelle).update(vorher).eq(schluessel, k); if (x.error) throw x.error; }
      if (window.Korb.neuLaden) await window.Korb.neuLaden();
    });
    return { error: null, data: ids.length === 1 ? (r.data || [])[0] || null : r.data };
  }
  // Neu anlegen mit Rückgängig (in Tabellen ohne „Zuletzt gelöscht“ wird wieder entfernt)
  const OHNE_KORB = ['lg_bewegungen', 'tb_konfig', 'ze_konfig'];
  async function neu(sb, tabelle, zeilen, text = 'Gespeichert') {
    const liste = [].concat(zeilen);
    const r = await sb.from(tabelle).insert(liste).select('*');
    if (r.error) return { error: r.error, data: null };
    const ids = (r.data || []).map((x) => x.id);
    if (window.Rueckgaengig && ids.length) window.Rueckgaengig.zeigen(text, async () => {
      const x = OHNE_KORB.includes(tabelle) ? await sb.from(tabelle).delete().in('id', ids) : await sb.from(tabelle).update({ geloescht_am: new Date().toISOString() }).in('id', ids);
      if (x.error) throw x.error;
      if (window.Korb.neuLaden) await window.Korb.neuLaden();
    });
    return { error: null, data: Array.isArray(zeilen) ? r.data : (r.data || [])[0] || null };
  }
  async function aufraeumen(sb, tabellen) {
    const grenze = new Date(Date.now() - TAGE * 864e5).toISOString();
    for (const t of tabellen) {
      try {
        if (t.dateien) { const { data } = await sb.from(t.tabelle).select('*').lt('geloescht_am', grenze).limit(200); if (data && data.length) await t.dateien(data); }
        await sb.from(t.tabelle).delete().lt('geloescht_am', grenze);
      } catch {}
    }
  }
  async function oeffnen(sb, tabellen, beiAenderung) {
    const d = document.createElement('dialog');
    d.style.cssText = 'border:0;border-radius:20px;padding:0;width:min(620px,calc(100% - 20px))';
    document.body.appendChild(d);
    d.addEventListener('close', () => d.remove());
    async function zeichnen() {
      const zeilen = [];
      for (const t of tabellen) {
        const { data } = await sb.from(t.tabelle).select('*').not('geloescht_am', 'is', null).order('geloescht_am', { ascending: false }).limit(300);
        for (const r of data || []) zeilen.push({ t, r });
      }
      zeilen.sort((a, b) => (a.r.geloescht_am < b.r.geloescht_am ? 1 : -1));
      d.innerHTML = `<div style="padding:20px;display:grid;gap:10px"><h3 style="font-size:20px;margin:0">Zuletzt gelöscht</h3>
        <p style="color:#3F5A4F;font-size:14px;margin:0">Gelöschtes bleibt ${TAGE} Tage hier und wird danach automatisch entfernt.</p>
        <div style="max-height:60vh;overflow:auto">${zeilen.length ? zeilen.map(({ t, r }, i) => { const rest = TAGE - Math.floor((Date.now() - Date.parse(r.geloescht_am)) / 864e5);
          return `<div style="display:flex;gap:10px;align-items:center;justify-content:space-between;padding:10px 0;border-bottom:1px solid rgba(11,59,46,.14)"><span style="min-width:0"><b style="display:block">${esc(t.titel(r))}</b><small style="color:#7C8499">${esc(t.art)} · gelöscht am ${dk(r.geloescht_am.slice(0, 10))} · noch ${rest} ${rest === 1 ? 'Tag' : 'Tage'}</small></span>
            <span style="display:flex;gap:6px;flex:none"><button class="btn klein" data-k-zurueck="${i}">Wiederherstellen</button><button class="btn klein rot" data-k-weg="${i}">Endgültig</button></span></div>`; }).join('') : '<p style="color:#7C8499;padding:10px 0">Nichts gelöscht.</p>'}</div>
        <div style="display:flex;justify-content:flex-end"><button class="btn" data-k-zu>Schliessen</button></div></div>`;
      d.onclick = async (e) => {
        if (e.target.closest('[data-k-zu]')) { d.close(); return; }
        const z = e.target.closest('[data-k-zurueck]'), w = e.target.closest('[data-k-weg]');
        const eintrag = z ? zeilen[Number(z.dataset.kZurueck)] : w ? zeilen[Number(w.dataset.kWeg)] : null;
        if (!eintrag) return;
        if (z) { const { error } = await sb.from(eintrag.t.tabelle).update({ geloescht_am: null, ...(eintrag.t.zurueck || {}) }).eq('id', eintrag.r.id); if (error) { alert(error.message); return; } }
        if (w) { if (!confirm(`„${eintrag.t.titel(eintrag.r)}“ endgültig löschen? Das kann nicht rückgängig gemacht werden.`)) return; if (eintrag.t.dateien) { try { await eintrag.t.dateien([eintrag.r]); } catch {} } const { error } = await sb.from(eintrag.t.tabelle).delete().eq('id', eintrag.r.id); if (error) { alert(error.message); return; } }
        await zeichnen(); if (beiAenderung) beiAenderung();
      };
    }
    await zeichnen();
    d.showModal();
  }
  window.Korb = Object.assign(window.Korb || {}, { loeschen, aufraeumen, oeffnen, aendern, neu });
})();

// Erinnerungen und Kalender-Abo: fällige Erinnerungen erscheinen in der App,
// und mit dem Kalender-Link meldet sich das Handy auch, wenn Ordasio zu ist.
(() => {
  if (window.Erinnerungen) return;
  const K = window.NASUVIA_KONFIG || {};
  if (!K.produkt) return;
  const esc = (s) => String(s ?? '').replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
  const sb = () => window.NASUVIA_SB || (window.supabase && K.url ? (window.__erSb = window.__erSb || window.supabase.createClient(K.url, K.key, { auth: { persistSession: true, autoRefreshToken: true, storageKey: K.speicher } })) : null);
  const WDH = [['nie', 'Einmalig'], ['taeglich', 'Täglich'], ['woechentlich', 'Wöchentlich'], ['monatlich', 'Monatlich'], ['jaehrlich', 'Jährlich']];
  const VORHER = [[0, 'Zur Zeit'], [15, '15 Min. vorher'], [30, '30 Min. vorher'], [60, '1 Std. vorher'], [1440, '1 Tag vorher'], [10080, '1 Woche vorher']];
  const wannText = (e) => { const d = new Date(e.wann); return d.toLocaleDateString('de-CH', { weekday: 'short', day: '2-digit', month: '2-digit', year: 'numeric' }) + (e.ganztag ? '' : ' ' + d.toTimeString().slice(0, 5)); };
  function naechstes(e) {
    const d = new Date(e.wann), jetzt = Date.now();
    const schritt = { taeglich: (x) => x.setDate(x.getDate() + 1), woechentlich: (x) => x.setDate(x.getDate() + 7), monatlich: (x) => x.setMonth(x.getMonth() + 1), jaehrlich: (x) => x.setFullYear(x.getFullYear() + 1) }[e.wiederholung];
    if (!schritt) return null;
    do schritt(d); while (d.getTime() <= jetzt);
    return d.toISOString();
  }
  const css = document.createElement('style');
  css.textContent = `.er-banner{position:fixed;left:50%;top:max(12px,env(safe-area-inset-top));transform:translateX(-50%);z-index:9500;width:min(460px,calc(100vw - 20px));background:#0A1F17;color:#fff;border-radius:18px;padding:12px 14px;box-shadow:0 24px 60px -20px rgba(0,0,0,.6);display:grid;gap:8px;font:15px/1.4 'League Spartan',system-ui,sans-serif;animation:erRein .35s ease}
  @keyframes erRein{from{opacity:0;transform:translate(-50%,-12px)}}
  .er-banner small{opacity:.75}.er-banner .er-k{display:flex;gap:8px;flex-wrap:wrap}.er-banner button{border:0;border-radius:100px;padding:8px 13px;font:inherit;font-weight:700;cursor:pointer;background:rgba(255,255,255,.14);color:#fff}.er-banner button.ja{background:#34D399;color:#06140F}
  .er-liste{display:grid;gap:6px;max-height:34vh;overflow:auto;margin:6px 0}.er-z{display:grid;grid-template-columns:auto minmax(0,1fr) auto;gap:10px;align-items:center;padding:8px 10px;border-radius:12px;background:var(--papier,#F4FAF6)}
  .er-z input{width:20px;height:20px;accent-color:var(--elektrik,#0E7A55)}.er-z b{display:block;color:#0A1F17}.er-z small{color:#7C8499}.er-z button{border:0;background:none;color:#E5484D;cursor:pointer;font-size:18px}
  .er-form{display:grid;gap:8px;margin-top:6px}.er-form .zwei{display:grid;grid-template-columns:1fr 1fr;gap:8px}.er-form input,.er-form select{width:100%;font:inherit;font-size:16px;border:1px solid color-mix(in srgb,var(--blau,#0B3B2E) 22%,transparent);border-radius:10px;padding:9px 11px;color:#0A1F17;background:#fff}
  .er-form label{display:grid;gap:3px;font-size:12.5px;color:#3F5A4F}.er-kal{margin-top:12px;border-top:1px solid color-mix(in srgb,var(--blau,#0B3B2E) 12%,transparent);padding-top:12px}
  .er-kal .er-k{display:flex;gap:8px;flex-wrap:wrap;margin:8px 0}.er-kal a,.er-kal button.k{border:0;border-radius:100px;padding:9px 14px;font:inherit;font-weight:700;background:var(--blau,#0B3B2E);color:#fff;text-decoration:none;cursor:pointer;font-size:14px}
  .er-kal a.hell,.er-kal button.hell{background:var(--flaeche,#E8F4EE);color:var(--blau,#0B3B2E)}.er-kal label.h{display:flex;gap:8px;align-items:center;font-size:14px;color:#0A1F17;white-space:nowrap}.er-kal label.h input{width:18px!important;height:18px;flex:none;margin:0}.er-kal label.h select{width:auto!important}`;
  document.head.appendChild(css);

  async function liste(alle = false) {
    const c = sb(); if (!c) return [];
    const { data } = await c.from('erinnerungen').select('*').eq('erledigt', false).order('wann').limit(alle ? 200 : 20);
    return data || [];
  }
  async function erledigen(e) {
    const c = sb(), neu = naechstes(e);
    if (neu) await c.from('erinnerungen').update({ wann: neu }).eq('id', e.id);
    else await c.from('erinnerungen').update({ erledigt: true }).eq('id', e.id);
  }
  // Fällige Erinnerungen beim Öffnen einer Seite zeigen (einmal pro Erinnerung und Sitzung)
  async function pruefen() {
    const c = sb(); if (!c) return;
    try { const { data: { session } } = await c.auth.getSession(); if (!session) return; } catch { return; }
    const jetzt = Date.now(), l = (await liste()).filter((e) => new Date(e.wann).getTime() - (e.vorher_min || 0) * 60000 <= jetzt);
    const gezeigt = JSON.parse(sessionStorage.getItem('er.gezeigt') || '[]');
    const e = l.find((x) => !gezeigt.includes(x.id + x.wann)); if (!e) return;
    sessionStorage.setItem('er.gezeigt', JSON.stringify([...gezeigt, e.id + e.wann]));
    const b = document.createElement('div'); b.className = 'er-banner'; b.setAttribute('role', 'alert');
    b.innerHTML = `<div>🔔 <b>${esc(e.titel)}</b><br><small>${wannText(e)}${e.notiz ? ' · ' + esc(e.notiz) : ''}</small></div><div class="er-k"><button class="ja" data-er="ok">✓ Erledigt</button><button data-er="spaeter">In 1 Stunde</button><button data-er="morgen">Morgen</button><button data-er="zu">Schliessen</button></div>`;
    document.body.appendChild(b);
    b.addEventListener('click', async (ev) => {
      const a = ev.target.closest('[data-er]'); if (!a) return;
      if (a.dataset.er === 'ok') await erledigen(e);
      if (a.dataset.er === 'spaeter') await c.from('erinnerungen').update({ wann: new Date(Date.now() + 3600e3 + (e.vorher_min || 0) * 60000).toISOString() }).eq('id', e.id);
      if (a.dataset.er === 'morgen') { const d = new Date(); d.setDate(d.getDate() + 1); d.setHours(8, 0, 0, 0); await c.from('erinnerungen').update({ wann: new Date(d.getTime() + (e.vorher_min || 0) * 60000).toISOString() }).eq('id', e.id); }
      b.remove();
    });
  }

  async function dialog(vorgabe = {}) {
    const c = sb(); if (!c) return;
    const dlg = document.createElement('dialog'); dlg.className = 'ui-frage'; dlg.style.width = 'min(520px,calc(100vw - 24px))';
    document.body.appendChild(dlg); dlg.addEventListener('close', () => dlg.remove());
    let abo = null;
    const heute = new Date(Date.now() + 3600e3);
    const malen = async () => {
      const l = await liste(true);
      const link = abo ? `${K.url}/functions/v1/kalender?t=${abo.token}` : '', webcal = link.replace(/^https?:/, 'webcal:');
      dlg.innerHTML = `<form method="dialog"><h3>Erinnerungen</h3><p>Ordasio erinnert Sie in der App. Mit dem Kalender-Abo auch auf dem Handy, wenn Ordasio geschlossen ist.</p>
        <div class="er-liste">${l.map((e) => `<div class="er-z"><input type="checkbox" data-er-ok="${e.id}" title="Erledigt"><div><b>${esc(e.titel)}</b><small>${wannText(e)}${e.wiederholung !== 'nie' ? ' · ' + WDH.find((w) => w[0] === e.wiederholung)[1] : ''}</small></div><button type="button" data-er-weg="${e.id}" aria-label="Löschen">×</button></div>`).join('') || '<p class="hinweis" style="color:#7C8499">Noch keine Erinnerungen.</p>'}</div>
        <div class="er-form"><label>Woran erinnern?<input name="titel" maxlength="160" placeholder="z. B. MWST-Abrechnung einreichen" value="${esc(vorgabe.titel || '')}"></label>
          <div class="zwei"><label>Datum<input type="date" name="datum" value="${(vorgabe.datum || heute.toLocaleDateString('sv-SE'))}"></label><label>Zeit <small>(leer = ganzer Tag)</small><input type="time" name="zeit" value="${vorgabe.zeit ?? heute.toTimeString().slice(0, 5)}"></label></div>
          <div class="zwei"><label>Wiederholen<select name="wdh">${WDH.map(([k, n]) => `<option value="${k}">${n}</option>`).join('')}</select></label><label>Melden<select name="vorher">${VORHER.map(([k, n]) => `<option value="${k}" ${k === 0 ? 'selected' : ''}>${n}</option>`).join('')}</select></label></div>
          <button type="button" class="ja" data-er-neu style="border:0;border-radius:100px;padding:11px;font:inherit;font-weight:700;background:var(--blau,#0B3B2E);color:#fff;cursor:pointer">+ Erinnerung speichern</button></div>
        <div class="er-kal"><b style="color:#0A1F17">📅 Kalender verbinden</b>
          ${abo ? `<p style="margin:4px 0 0">Termine, Einsätze und Erinnerungen erscheinen in Ihrem Kalender, mit Hinweis vorher. Aktualisiert sich von selbst.</p>
            <div class="er-k"><a href="${webcal}">iPhone, iPad, Mac</a><a class="hell" href="https://calendar.google.com/calendar/r?cid=${encodeURIComponent(webcal)}" target="_blank" rel="noopener">Google Kalender</a><button type="button" class="k hell" data-er-kopie>Link kopieren (Outlook)</button></div>
            <div style="display:flex;gap:14px;flex-wrap:wrap">${[['termine', 'Online-Termine'], ['einsaetze', 'Einsätze'], ['erinnerungen', 'Erinnerungen']].map(([k, n]) => `<label class="h"><input type="checkbox" data-er-abo="${k}" ${abo[k] ? 'checked' : ''}> ${n}</label>`).join('')}
              <label class="h">Hinweis <select data-er-min>${[[0, 'keiner'], [15, '15 Min.'], [30, '30 Min.'], [60, '1 Std.'], [1440, '1 Tag']].map(([k, n]) => `<option value="${k}" ${abo.erinnerung_min === k ? 'selected' : ''}>${n}</option>`).join('')}</select> vorher</label></div>
            <p style="font-size:12.5px;color:#7C8499;margin-top:6px">Den Link nicht weitergeben: Wer ihn hat, sieht Ihre Termine. <button type="button" data-er-neuer style="border:0;background:none;color:#E5484D;cursor:pointer;font:inherit;padding:0;text-decoration:underline">Neuen Link erstellen</button></p>`
            : '<div class="er-k"><button type="button" class="k" data-er-abo-an>Kalender-Link erstellen</button></div>'}</div>
        <div class="ui-knoepfe"><button class="ja">Fertig</button></div></form>`;
    };
    const aboLaden = async () => { const { data } = await c.from('kalender_abo').select('*').maybeSingle(); abo = data; };
    await aboLaden(); await malen(); dlg.showModal();
    dlg.addEventListener('submit', (e) => { e.preventDefault(); dlg.close(); });
    dlg.addEventListener('click', async (e) => {
      if (e.target.closest('[data-er-neu]')) {
        const f = dlg.querySelector('form'), titel = f.titel.value.trim(); if (!titel) { f.titel.focus(); return; }
        const ganztag = !f.zeit.value, wann = new Date(`${f.datum.value}T${f.zeit.value || '08:00'}`);
        const { error } = await c.from('erinnerungen').insert({ titel, wann: wann.toISOString(), ganztag, wiederholung: f.wdh.value, vorher_min: Number(f.vorher.value), bereich: location.pathname });
        if (error) { UI.hinweis(error.message); return; } vorgabe = {}; await malen();
      }
      const w = e.target.closest('[data-er-weg]'); if (w) { await c.from('erinnerungen').delete().eq('id', w.dataset.erWeg); await malen(); }
      if (e.target.closest('[data-er-abo-an]')) { const { error } = await c.from('kalender_abo').insert({}); if (error) { UI.hinweis(error.message); return; } await aboLaden(); await malen(); }
      if (e.target.closest('[data-er-kopie]')) { try { await navigator.clipboard.writeText(`${K.url}/functions/v1/kalender?t=${abo.token}`); e.target.textContent = '✓ Kopiert'; } catch { UI.eingabe('Link kopieren:', { vorgabe: `${K.url}/functions/v1/kalender?t=${abo.token}` }); } }
      if (e.target.closest('[data-er-neuer]')) { if (!await UI.frage('Neuen Link erstellen? Der alte Link funktioniert danach nicht mehr. Kalender müssen neu verbunden werden.')) return; await c.from('kalender_abo').delete().eq('user_id', abo.user_id); await c.from('kalender_abo').insert({}); await aboLaden(); await malen(); }
    });
    dlg.addEventListener('change', async (e) => {
      const ok = e.target.closest('[data-er-ok]'); if (ok) { const l = await liste(true); const x = l.find((y) => y.id === ok.dataset.erOk); if (x) await erledigen(x); await malen(); }
      const a = e.target.closest('[data-er-abo]'); if (a) { await c.from('kalender_abo').update({ [a.dataset.erAbo]: a.checked }).eq('user_id', abo.user_id); abo[a.dataset.erAbo] = a.checked; }
      const m = e.target.closest('[data-er-min]'); if (m) { await c.from('kalender_abo').update({ erinnerung_min: Number(m.value) }).eq('user_id', abo.user_id); abo.erinnerung_min = Number(m.value); }
    });
  }
  window.Erinnerungen = { dialog, pruefen, liste };
  const los = () => setTimeout(pruefen, 1500);
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', los); else los();
})();

/* Ordasio – Briefing: die wichtigsten Punkte auf einen Blick (Startseite) und als Termin aufs Handy (Kalender-Abo).
   In den Einstellungen wählt man, welche Punkte, wie oft und wann.
   Briefing.karte(element) · Briefing.einstellungen() */
(function () {
  'use strict';
  if (window.Briefing) return;
  const esc = (s) => String(s == null ? '' : s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
  const PUNKTE = [
    ['kontostand', '🏦', 'Kontostand'],
    ['ueberfaellig', '⏰', 'Überfällige Rechnungen'],
    ['faellig', '📅', 'Rechnungen, die diese Woche fällig werden'],
    ['bezahlt', '💰', 'Zahlungseingänge der letzten 7 Tage'],
    ['offerten', '✍️', 'Antworten auf Offerten (angenommen, Fragen)'],
    ['mwst', '🧾', 'MWST-Frist'],
    ['ferien', '🏖️', 'Wer im Team abwesend ist'],
    ['antraege', '📝', 'Offene Ferienanträge und Spesen'],
    ['einsaetze', '🗓️', 'Geplante Einsätze'],
    ['lizenz', '⭐', 'Ablauf von Test oder Lizenz'],
  ];
  const TAGE = ['Montag', 'Dienstag', 'Mittwoch', 'Donnerstag', 'Freitag', 'Samstag', 'Sonntag'];
  const STD = { an: true, rhythmus: 'woechentlich', tag: 1, zeit: '07:30', punkte: PUNKTE.map((p) => p[0]), kalender: true };
  const sb = () => window.NASUVIA_SB;
  const heute = () => new Date().toLocaleDateString('sv-SE');

  const stil = document.createElement('style');
  stil.textContent = `.br-karte{background:linear-gradient(135deg,#0A1F17,var(--blau,#0B3B2E));color:#fff;border-radius:20px;padding:18px 20px;margin:0 0 16px;position:relative;box-shadow:0 10px 30px -18px rgba(0,0,0,.5)}
  .br-karte h3{margin:0 0 8px;font-size:17px;display:flex;align-items:center;gap:8px;padding-right:70px}.br-karte ul{list-style:none;margin:0;padding:0;display:grid;gap:7px}
  .br-karte li{display:flex;gap:10px;align-items:flex-start;font-size:14.5px;line-height:1.45}.br-karte li.wichtig{font-weight:700}.br-karte li span{flex:0 0 22px}
  .br-karte .br-knoepfe{position:absolute;top:12px;right:12px;display:flex;gap:4px}.br-karte .br-knoepfe button{border:0;background:rgba(255,255,255,.12);color:#fff;width:32px;height:32px;border-radius:50%;cursor:pointer;font-size:15px}
  .br-karte small{display:block;margin-top:10px;opacity:.7;font-size:12px}
  .br-form{display:grid;gap:10px}.ui-frage .br-form label.h{display:flex!important;flex-direction:row!important;gap:10px;align-items:center;justify-content:flex-start;text-align:left!important;font-size:14.5px;font-weight:500;color:var(--tinte,#0A1F17);margin:0}.ui-frage .br-form label.h input{width:19px!important;height:19px;flex:0 0 19px;margin:0;padding:0;accent-color:var(--elektrik,#0E7A55)}
  .ui-frage .br-form{text-align:left}.ui-frage .br-form h3{padding-right:46px}
  .br-form .zwei{display:grid;grid-template-columns:1fr 1fr;gap:8px}.br-form select,.br-form input[type=time]{width:100%;font:inherit;font-size:16px;padding:9px 11px;border:1px solid color-mix(in srgb,var(--blau,#0B3B2E) 22%,transparent);border-radius:11px;background:#fff}
  .br-form fieldset{border:0;padding:0;margin:0;display:grid;gap:6px}.br-form legend{font-weight:700;font-size:14px;margin-bottom:4px;color:var(--tinte,#0A1F17)}`;
  document.head.appendChild(stil);

  async function laden() {
    const c = sb(); if (!c) return null;
    const { data, error } = await c.rpc('mein_briefing');
    if (error || !data) return null;
    const e = Object.assign({}, STD, data.einstellungen || {});
    return { e, punkte: (data.punkte || []).filter((p) => e.punkte.includes(p.id)) };
  }
  function istTag(e) {
    const w = (new Date().getDay() + 6) % 7 + 1;
    return e.rhythmus === 'taeglich' || (e.rhythmus === 'werktags' ? w <= 5 : w === Number(e.tag));
  }
  async function karte(ziel) {
    if (!ziel || window.NASUVIA_DEMO) return;
    const d = await laden(); if (!d || !d.e.an) return;
    let weg = ''; try { weg = localStorage.getItem('ordasio.briefingWeg') || ''; } catch {}
    // Am Briefing-Tag oben zeigen, sonst nur wenn etwas Wichtiges ansteht
    const wichtig = d.punkte.some((p) => p.wichtig);
    if (weg === heute() || (!istTag(d.e) && !wichtig)) return;
    const titel = (new Date().getHours() < 11 ? 'Guten Morgen' : 'Ihr Briefing') + (d.punkte.length ? `: ${d.punkte.length} ${d.punkte.length === 1 ? 'Punkt' : 'Punkte'}` : '');
    ziel.innerHTML = `<div class="br-karte"><div class="br-knoepfe"><button data-br-einst title="Briefing einstellen" aria-label="Briefing einstellen">⚙</button><button data-br-weg title="Für heute ausblenden" aria-label="Für heute ausblenden">×</button></div>
      <h3>☀️ ${esc(titel)}</h3>
      ${d.punkte.length ? `<ul>${d.punkte.map((p) => `<li class="${p.wichtig ? 'wichtig' : ''}"><span>${p.icon}</span>${esc(p.text)}</li>`).join('')}</ul>` : '<p style="margin:0">✓ Alles im grünen Bereich. Keine offenen Punkte.</p>'}
      <small>${d.e.kalender ? 'Kommt auch als Termin aufs Handy, wenn der Kalender verbunden ist.' : 'Nur hier in Ordasio.'} Einstellen mit ⚙.</small></div>`;
  }
  async function einstellungen() {
    const c = sb(); if (!c || !window.UI) return;
    const d = await laden(); const e = d ? d.e : Object.assign({}, STD);
    const dlg = document.createElement('dialog'); dlg.className = 'ui-frage';
    dlg.innerHTML = `<form method="dialog" class="br-form"><h3>Briefing einstellen</h3>
      <p style="margin:0;font-size:14px;color:#3F5A4F">Die wichtigsten Punkte auf einen Blick: oben auf der Startseite und als Termin mit Erinnerung im Handy-Kalender.</p>
      <label class="h"><input type="checkbox" name="an" ${e.an ? 'checked' : ''}> Briefing einschalten</label>
      <div class="zwei"><label style="display:grid;gap:3px;font-size:12.5px">Wie oft<select name="rhythmus"><option value="taeglich" ${e.rhythmus === 'taeglich' ? 'selected' : ''}>Täglich</option><option value="werktags" ${e.rhythmus === 'werktags' ? 'selected' : ''}>Werktags</option><option value="woechentlich" ${e.rhythmus === 'woechentlich' ? 'selected' : ''}>Wöchentlich</option></select></label>
        <label style="display:grid;gap:3px;font-size:12.5px">Uhrzeit<input type="time" name="zeit" value="${esc(e.zeit)}"></label></div>
      <label style="display:grid;gap:3px;font-size:12.5px" data-br-tag ${e.rhythmus === 'woechentlich' ? '' : 'hidden'}>Wochentag<select name="tag">${TAGE.map((t, i) => `<option value="${i + 1}" ${Number(e.tag) === i + 1 ? 'selected' : ''}>${t}</option>`).join('')}</select></label>
      <fieldset><legend>Welche Punkte?</legend>${PUNKTE.map(([id, ic, t]) => `<label class="h"><input type="checkbox" name="p" value="${id}" ${e.punkte.includes(id) ? 'checked' : ''}> ${ic} ${esc(t)}</label>`).join('')}</fieldset>
      <label class="h"><input type="checkbox" name="kalender" ${e.kalender ? 'checked' : ''}> Als Termin aufs Handy (über den Ordasio-Kalender)</label>
      <p style="margin:0;font-size:12.5px;color:#7C8499">Den Kalender verbinden Sie einmal im Menü unter „Erinnerungen“. Danach meldet sich das Handy zur gewählten Zeit, auch wenn Ordasio zu ist.</p>
      <div class="ui-knoepfe"><button type="button" class="nein" data-zu>Abbrechen</button><button class="ja">Speichern</button></div></form>`;
    document.body.appendChild(dlg);
    dlg.addEventListener('close', () => dlg.remove());
    dlg.querySelector('[data-zu]').onclick = () => dlg.close();
    dlg.querySelector('[name=rhythmus]').onchange = (ev) => { dlg.querySelector('[data-br-tag]').hidden = ev.target.value !== 'woechentlich'; };
    dlg.querySelector('form').onsubmit = async (ev) => {
      ev.preventDefault(); const f = ev.target;
      const zeile = { an: f.an.checked, rhythmus: f.rhythmus.value, tag: Number(f.tag.value), zeit: f.zeit.value || '07:30', punkte: [...f.querySelectorAll('[name=p]:checked')].map((x) => x.value), kalender: f.kalender.checked, geaendert: new Date().toISOString() };
      const { data: { user } } = await c.auth.getUser();
      const { error } = await c.from('br_einstellungen').upsert({ user_id: user.id, ...zeile });
      if (error) { UI.hinweis(error.message); return; }
      dlg.close(); try { localStorage.removeItem('ordasio.briefingWeg'); } catch {}
      document.querySelectorAll('[data-briefing]').forEach((z) => { z.innerHTML = ''; karte(z); });
      UI.hinweis('✓ Briefing gespeichert.' + (zeile.kalender ? ' Im Handy-Kalender erscheint es spätestens in einer Stunde.' : ''));
    };
    dlg.showModal();
  }
  document.addEventListener('click', (ev) => {
    if (ev.target.closest('[data-br-einst]')) { ev.preventDefault(); einstellungen(); }
    if (ev.target.closest('[data-br-weg]')) { try { localStorage.setItem('ordasio.briefingWeg', heute()); } catch {} const k = ev.target.closest('.br-karte'); if (k) k.remove(); }
  });
  window.Briefing = { karte, einstellungen, PUNKTE };
})();

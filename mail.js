// E-Mails direkt aus Ordasio senden (Supabase-Funktion mail-senden).
// Standard: Absendername ist die Firma, Antworten gehen an die Firmenadresse. Optional eigenes Postfach.
(() => {
  const K = window.NASUVIA_KONFIG || {};
  const esc = (s) => String(s ?? '').replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
  async function token() {
    try { if (window.NASUVIA_SB) { const { data } = await window.NASUVIA_SB.auth.getSession(); if (data.session) return data.session.access_token; } } catch {}
    try { const s = JSON.parse(localStorage.getItem(K.speicher) || 'null'); return (s && (s.access_token || (s.currentSession || {}).access_token)) || ''; } catch { return ''; }
  }
  async function rufen(daten) {
    const t = await token();
    if (!K.produkt || !K.url || !t) throw new Error('Bitte anmelden, um E-Mails direkt aus Ordasio zu senden.');
    const r = await fetch(K.url + '/functions/v1/mail-senden', { method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: 'Bearer ' + t, apikey: K.key }, body: JSON.stringify(daten) });
    const j = await r.json().catch(() => ({}));
    if (!r.ok) { const f = new Error(j.fehler === 'nicht_eingerichtet' ? 'Der E-Mail-Versand ist noch nicht eingerichtet.' : (j.fehler || 'Senden hat nicht geklappt.')); f.status = r.status; throw f; }
    return j;
  }
  let statusCache = null, statusZeit = 0;
  async function status(neu) {
    if (!neu && statusCache && Date.now() - statusZeit < 60000) return statusCache;
    try { statusCache = await rufen({ aktion: 'status' }); } catch { statusCache = { bereit: false }; }
    statusZeit = Date.now();
    return statusCache;
  }
  const base64 = (blob) => new Promise((ok, f) => { const r = new FileReader(); r.onload = () => ok(String(r.result).replace(/^data:[^,]*,/, '')); r.onerror = () => f(r.error); r.readAsDataURL(blob); });
  // Eingebettete Bilder (data:) als Inline-Anhänge mitsenden, damit auch Gmail und Outlook sie zeigen
  function bilderAusHtml(html) {
    const anh = []; let n = 0;
    const neu = String(html || '').replace(/src="data:(image\/[a-z+.-]+);base64,([^"]+)"/gi, (_, typ, daten) => {
      const cid = `bild${++n}@ordasio`;
      anh.push({ name: `bild${n}.${(typ.split('/')[1] || 'png').replace('svg+xml', 'svg')}`, typ, daten, cid });
      return `src="cid:${cid}"`;
    });
    return { html: neu, anh };
  }
  // senden({ an, cc, betreff, text, html, anhaenge: [{ name, blob }], antwortAn, absenderName, art })
  async function senden(o) {
    const anh = [];
    for (const a of o.anhaenge || []) anh.push({ name: a.name, typ: a.typ || (a.blob && a.blob.type) || 'application/pdf', daten: await base64(a.blob) });
    let html = o.html;
    if (html) { const b = bilderAusHtml(html); html = b.html; anh.push(...b.anh); }
    const erg = await rufen({ aktion: 'senden', an: o.an, cc: o.cc, betreff: o.betreff, text: o.text, html, anhaenge: anh, antwortAn: o.antwortAn, absenderName: o.absenderName, art: o.art });
    statusZeit = 0;
    return erg;
  }
  const absenderText = (s, firma, antwortAn) => (s && s.eigen && s.eigen.aktiv)
    ? `Absender: <b>${esc(s.eigen.name || firma || '')}</b> &lt;${esc(s.eigen.absender)}&gt;`
    : `Absender: <b>${esc((s && s.firma) || firma || 'Ihre Firma')}</b>${antwortAn ? `. Antworten gehen an ${esc(antwortAn)}` : ''}`;

  /* ---------- Einstellungen: eigenes Postfach verbinden ---------- */
  const stil = document.createElement('style');
  stil.textContent = `
    .om-dlg{margin:auto;border:0;border-radius:18px;padding:22px;max-width:460px;width:calc(100% - 28px);box-shadow:0 30px 80px -20px rgba(12,18,38,.45);font-family:inherit;color:#0A1F17;background:#fff}
    .om-dlg::backdrop{background:rgba(12,18,38,.38);backdrop-filter:blur(6px);-webkit-backdrop-filter:blur(6px)}
    .om-dlg h3{margin:0 0 6px;font-size:1.2rem}.om-dlg p{margin:0 0 12px;color:#3F5A4F;line-height:1.5;font-size:.95rem}
    .om-dlg label{display:block;font-size:.82rem;color:#5B6478;margin:10px 0 4px}
    .om-dlg input,.om-dlg select{width:100%;box-sizing:border-box;font:inherit;font-size:16px;padding:10px 12px;border:1.5px solid #D5DBE5;border-radius:10px;background:#fff;color:inherit}
    .om-dlg .om-karte{border:1.5px solid #E3E6EF;border-radius:12px;padding:12px 14px;margin-bottom:10px;font-size:.92rem;line-height:1.45}
    .om-dlg .om-karte.an{border-color:#0E7A55;background:#F2FAF6}
    .om-dlg .om-reihe{display:flex;gap:8px;flex-wrap:wrap;justify-content:flex-end;margin-top:16px}
    .om-dlg button{font:600 .95rem inherit;font-family:inherit;padding:11px 16px;border-radius:11px;border:0;cursor:pointer;background:#EEF2F6;color:#0A1F17}
    .om-dlg button.haupt{background:#0B3B2E;color:#fff}.om-dlg button.rot{background:none;color:#C2373C;margin-right:auto}
    .om-dlg button:disabled{opacity:.55;cursor:default}
    .om-fehler{color:#C2373C;font-size:.9rem;min-height:1.2em;margin-top:8px}.om-klein{font-size:.82rem;color:#7C8499}
  `;
  document.head.appendChild(stil);
  const ANBIETER = [
    ['', 'Anbieter wählen …'], ['asmtp.mail.hostpoint.ch', 'Hostpoint'], ['mail.infomaniak.com', 'Infomaniak'], ['smtpauths.bluewin.ch', 'Bluewin / Swisscom'],
    ['smtp.gmail.com', 'Gmail / Google Workspace (App-Passwort)'], ['mail.gmx.net', 'GMX'], ['securesmtp.t-online.de', 'T-Online'], ['smtp.mail.me.com', 'iCloud (App-Passwort)'], ['eigen', 'Anderer Anbieter'],
  ];
  const ratenHost = (mail) => {
    const d = String(mail).split('@')[1] || '';
    if (/gmail|googlemail/.test(d)) return 'smtp.gmail.com';
    if (/bluewin/.test(d)) return 'smtpauths.bluewin.ch';
    if (/gmx/.test(d)) return 'mail.gmx.net';
    if (/icloud|me\.com|mac\.com/.test(d)) return 'smtp.mail.me.com';
    if (/t-online/.test(d)) return 'securesmtp.t-online.de';
    return '';
  };
  async function einstellungen() {
    const d = document.createElement('dialog');
    d.className = 'om-dlg';
    document.body.appendChild(d);
    d.addEventListener('close', () => setTimeout(() => d.remove(), 200));
    d.innerHTML = '<p>Wird geladen …</p>'; d.showModal();
    const s = await status(true);
    const F = (window.Marke && Marke.daten && Marke.daten()) || {};
    const e = s.eigen;
    d.innerHTML = `
      <h3>Absender für E-Mails</h3>
      <p>So sehen Ihre Kunden und Mitarbeitenden Ihre E-Mails aus Ordasio.</p>
      <div class="om-karte ${e && e.aktiv ? '' : 'an'}"><b>Standard</b><br>Absender ist <b>${esc(s.firma || F.name || 'Ihre Firma')}</b>. Ordasio versendet für Sie, Antworten gehen direkt an ${esc(F.mail || 'Ihre Firmenadresse')}.</div>
      <div class="om-karte ${e && e.aktiv ? 'an' : ''}"><b>Eigenes Postfach</b><br>${e ? `Verbunden: ${esc(e.absender)} über ${esc(e.host)}` : 'Die E-Mails kommen direkt von Ihrer Adresse, zum Beispiel info@ihrefirma.ch, und liegen auch in Ihrem Ordner „Gesendet“ des Servers.'}</div>
      <form id="omForm">
        <label for="omMail">E-Mail-Adresse</label><input id="omMail" type="email" autocomplete="username" value="${esc((e && e.absender) || F.mail || '')}" required>
        <label for="omAnb">Anbieter</label><select id="omAnb">${ANBIETER.map(([v, t]) => `<option value="${v}">${t}</option>`).join('')}</select>
        <div id="omHostZeile" hidden><label for="omHost">Postausgangsserver (SMTP, Port 465 mit SSL)</label><input id="omHost" type="text" placeholder="z. B. mail.ihrefirma.ch" value="${esc((e && e.host) || '')}"></div>
        <label for="omPass">Passwort des Postfachs</label><input id="omPass" type="password" autocomplete="current-password" placeholder="${e ? 'leer lassen = unverändert' : ''}">
        <label for="omName">Absendername (optional)</label><input id="omName" type="text" value="${esc((e && e.name) || s.firma || F.name || '')}">
        <p class="om-klein" style="margin-top:8px">Das Passwort wird verschlüsselt gespeichert und nur zum Senden verwendet. Ordasio sendet Ihnen zur Kontrolle eine Test-E-Mail. Microsoft 365 und Outlook.com gehen nicht, weil sie nur Port 587 anbieten; dort bleibt der Standard.</p>
        <div class="om-fehler" id="omFehler"></div>
        <div class="om-reihe">${e ? '<button type="button" class="rot" data-weg>Postfach trennen</button>' : ''}<button type="button" data-zu>Schliessen</button><button type="submit" class="haupt">${e ? 'Speichern' : 'Verbinden'}</button></div>
      </form>`;
    const $ = (id) => d.querySelector('#' + id);
    const anb = $('omAnb'), host = $('omHost');
    const setzen = (h) => { const bekannt = ANBIETER.some(([v]) => v && v !== 'eigen' && v === h); anb.value = h ? (bekannt ? h : 'eigen') : ''; $('omHostZeile').hidden = anb.value !== 'eigen'; if (bekannt) host.value = h; };
    setzen((e && e.host) || ratenHost($('omMail').value));
    anb.onchange = () => { $('omHostZeile').hidden = anb.value !== 'eigen'; if (anb.value && anb.value !== 'eigen') host.value = anb.value; else if (anb.value === 'eigen') host.focus(); };
    $('omMail').onchange = () => { if (!anb.value) { const h = ratenHost($('omMail').value); if (h) setzen(h); } };
    d.querySelector('[data-zu]').onclick = () => d.close();
    const weg = d.querySelector('[data-weg]');
    if (weg) weg.onclick = async () => { weg.disabled = true; try { await rufen({ aktion: 'konto_loeschen' }); statusZeit = 0; d.close(); hinweis('Eigenes Postfach getrennt. Ordasio sendet wieder im Standard.'); } catch (f) { $('omFehler').textContent = f.message; weg.disabled = false; } };
    $('omForm').onsubmit = async (ev) => {
      ev.preventDefault();
      const h = anb.value === 'eigen' ? host.value.trim() : anb.value;
      if (!h) { $('omFehler').textContent = 'Bitte den Anbieter wählen.'; return; }
      const knopf = d.querySelector('button[type=submit]'); knopf.disabled = true; knopf.textContent = 'Wird geprüft …'; $('omFehler').textContent = '';
      try {
        await rufen({ aktion: 'konto_speichern', absender: $('omMail').value.trim(), host: h, passwort: $('omPass').value, name: $('omName').value.trim() });
        statusZeit = 0; d.close(); hinweis('Postfach verbunden. Eine Test-E-Mail ist unterwegs.');
      } catch (f) { $('omFehler').textContent = f.message; knopf.disabled = false; knopf.textContent = e ? 'Speichern' : 'Verbinden'; }
    };
  }
  const hinweis = (t) => { if (window.UI && UI.hinweis) UI.hinweis(t); else alert(t); };

  window.OrdasioMail = { status, senden, einstellungen, absenderText, moeglich: () => !!(K.produkt && K.url) };
  try { if (new URLSearchParams(location.search).get('aktion') === 'absender') setTimeout(einstellungen, 800); } catch {}
})();

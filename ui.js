// Gemeinsame Bedienung für alle Bereiche: Fenster (dialog) erscheinen immer gut sichtbar,
// lassen sich mit ✕, Escape oder Tippen daneben schliessen und können die Seite nie blockieren.
(() => {
  const stil = document.createElement('style');
  stil.textContent = `
  dialog[open]{position:fixed;inset:0;margin:auto;max-height:calc(100dvh - 32px);overflow:auto;overscroll-behavior:contain;-webkit-overflow-scrolling:touch}
  dialog .ui-zu{position:sticky;float:right;top:10px;right:10px;margin:10px 10px -46px 0;z-index:5;width:36px;height:36px;border:0;border-radius:50%;background:var(--flaeche,#E8F4EE);color:var(--blau,#0B3B2E);font-size:18px;line-height:1;cursor:pointer;display:grid;place-items:center}
  dialog .ui-zu:hover{background:#E1E6F3}
  dialog:has(.dlg-kopf > .x) > .ui-zu{display:none}
  @media (max-width:640px){
    dialog[open]{inset:auto 0 var(--ui-tastatur,0px) 0;margin:0;width:100%!important;max-width:100%!important;max-height:calc(var(--ui-hoehe,100dvh) - 10px);border-radius:22px 22px 0 0!important;padding-bottom:env(safe-area-inset-bottom,0px);animation:uiHoch .28s cubic-bezier(.2,.9,.3,1)}
  }
  dialog.ui-frage{width:min(420px,calc(100vw - 24px));border:0;border-radius:18px;padding:0;background:#fff;color:#0A1F17;box-shadow:0 30px 80px -20px rgba(12,18,38,.45);font-family:'League Spartan',-apple-system,system-ui,sans-serif}
  dialog.ui-frage::backdrop{background:rgba(12,18,38,.4)}
  .ui-frage form{padding:22px;display:grid;gap:14px}
  .ui-frage h3{margin:0;font-size:19px;line-height:26px;color:#0A1F17;padding-right:46px}
  .ui-frage > .ui-zu{margin-top:17px;margin-right:16px}
  .ui-frage p{margin:0;font-size:15px;line-height:1.5;color:#3F5A4F;white-space:pre-line}
  .ui-frage .ui-html{max-height:min(62vh,560px);overflow:auto;font-size:15px;line-height:1.5;color:#3F5A4F}.ui-frage .ui-html p{white-space:normal;margin:0 0 6px}
  .ui-frage input{width:100%;padding:12px 14px;border:1px solid color-mix(in srgb,var(--blau,#0B3B2E) 26%,transparent);border-radius:10px;font:inherit;font-size:16px}
  .ui-frage .ui-knoepfe{display:flex;gap:8px;justify-content:flex-end;flex-wrap:wrap}
  .ui-frage button{border:0;border-radius:100px;padding:11px 18px;font:600 15px inherit;font-family:inherit;cursor:pointer;background:var(--flaeche,#E8F4EE);color:var(--blau,#0B3B2E)}
  .ui-frage button.ja{background:var(--blau,#0B3B2E);color:#fff}
  .ui-frage button.ja.gefahr{background:#E5484D}
  @media (max-width:640px){dialog.ui-frage[open]{border-radius:22px 22px 0 0!important}.ui-frage .ui-knoepfe button{flex:1}}
  dialog.ui-bild{width:min(760px,calc(100vw - 24px))}
  .ui-schnitt{position:relative;display:block;width:fit-content;max-width:100%;margin:0 auto;touch-action:none;user-select:none;overflow:hidden;border-radius:8px;background:#eef1f4}
  .ui-schnitt canvas{display:block;max-width:100%;max-height:55vh;width:auto;height:auto}
  .ui-rahmen{position:absolute;border:2px solid var(--elektrik,#0E7A55);box-shadow:0 0 0 9999px rgba(10,31,23,.45);cursor:move}
  .ui-rahmen i{position:absolute;width:20px;height:20px;background:#fff;border:2px solid var(--elektrik,#0E7A55);border-radius:50%}
  .ui-rahmen i[data-e=nw]{left:-3px;top:-3px;cursor:nwse-resize}.ui-rahmen i[data-e=ne]{right:-3px;top:-3px;cursor:nesw-resize}
  .ui-rahmen i[data-e=sw]{left:-3px;bottom:-3px;cursor:nesw-resize}.ui-rahmen i[data-e=se]{right:-3px;bottom:-3px;cursor:nwse-resize}
  .ui-bild .ui-knoepfe button[data-b].ja{background:var(--elektrik,#0E7A55);color:#fff}
  @keyframes uiHoch{from{transform:translateY(40px);opacity:.4}to{transform:none;opacity:1}}
  html.ui-dialog-offen,html.ui-dialog-offen body{overflow:hidden}
  /* Kopfzeile ohne Trennlinie: oben durchsichtig, beim Scrollen ruhiger Hintergrund in der Seitenfarbe */
  header.kopfzeile{background:transparent!important;backdrop-filter:none!important;-webkit-backdrop-filter:none!important;border:0!important;box-shadow:none!important;transition:background .25s}
  header.kopfzeile.ui-gerollt{background:color-mix(in srgb,var(--papier,#F4FAF6) 94%,transparent)!important;backdrop-filter:blur(14px)!important;-webkit-backdrop-filter:blur(14px)!important}
  /* iPhone zoomt beim Tippen in Felder mit Schrift unter 16px: auf Touch-Geräten immer 16px */
  @media (pointer:coarse){input:not([type=checkbox]):not([type=radio]):not([type=range]):not([type=color]),select,textarea{font-size:16px!important}}`;
  document.head.appendChild(stil);
  // Zusätzlich auf iPhone/iPad: kein automatisches Hineinzoomen beim Ausfüllen (Zwei-Finger-Zoom bleibt möglich)
  if (/iP(hone|ad|od)/.test(navigator.userAgent) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1)) {
    const vp = document.querySelector('meta[name=viewport]');
    if (vp && !/maximum-scale/.test(vp.content)) vp.content += ', maximum-scale=1';
  }

  // Kopfzeile bekommt erst beim Scrollen einen Hintergrund
  const rollen = () => { const k = document.querySelector('header.kopfzeile'); if (k) k.classList.toggle('ui-gerollt', (window.scrollY || document.documentElement.scrollTop) > 4); };
  window.addEventListener('scroll', rollen, { passive: true }); document.addEventListener('DOMContentLoaded', rollen);

  // Handy: Höhe der Tastatur messen, damit Fenster nie dahinter verschwinden
  const vv = window.visualViewport;
  if (vv) {
    const messen = () => {
      const unten = Math.max(0, Math.round(window.innerHeight - vv.height - vv.offsetTop));
      document.documentElement.style.setProperty('--ui-tastatur', unten + 'px');
      document.documentElement.style.setProperty('--ui-hoehe', Math.round(vv.height) + 'px');
    };
    vv.addEventListener('resize', messen); vv.addEventListener('scroll', messen); messen();
  }
  // Feld im Fenster angetippt: in die Mitte holen, damit es über der Tastatur steht
  document.addEventListener('focusin', (e) => {
    const el = e.target;
    if (!el.closest || !el.closest('dialog[open]') || !el.matches('input,select,textarea')) return;
    setTimeout(() => { try { el.scrollIntoView({ block: 'center', behavior: 'smooth' }); } catch {} }, 280);
  });

  const P = HTMLDialogElement && HTMLDialogElement.prototype;
  if (!P || P.__ui) return;
  P.__ui = true;
  const zeigen = P.showModal, zu = P.close;
  const sperreAktualisieren = () => document.documentElement.classList.toggle('ui-dialog-offen', !!document.querySelector('dialog[open]'));
  P.showModal = function () {
    // Schon offen? Nur Inhalt aktualisiert, nicht nochmals öffnen (das hat früher die Seite blockiert)
    if (!this.open) { try { zeigen.call(this); } catch (e) { try { this.setAttribute('open', ''); } catch {} } }
    // Eigenes × im Kopf vorhanden? Dann kein zweites
    if (!this.querySelector(':scope > .ui-zu') && !this.hasAttribute('data-ohne-x') && !this.querySelector('.dlg-kopf > .x')) {
      const b = document.createElement('button');
      b.type = 'button'; b.className = 'ui-zu'; b.setAttribute('aria-label', 'Schliessen'); b.textContent = '✕';
      b.addEventListener('click', (e) => { e.preventDefault(); e.stopPropagation(); this.close(); });
      this.prepend(b);
    }
    this.scrollTop = 0;
    sperreAktualisieren();
  };
  P.close = function (...a) { try { zu.apply(this, a); } catch { this.removeAttribute('open'); } sperreAktualisieren(); };
  // Tippen auf den abgedunkelten Hintergrund schliesst das Fenster
  document.addEventListener('click', (e) => {
    const d = e.target;
    if (!(d instanceof HTMLDialogElement) || !d.open || d.hasAttribute('data-fest')) return;
    const r = d.getBoundingClientRect();
    if (e.clientX < r.left || e.clientX > r.right || e.clientY < r.top || e.clientY > r.bottom) d.close();
  });
  document.addEventListener('close', () => setTimeout(sperreAktualisieren, 0), true);
  // Eigene Fenster für Fragen, Eingaben und Hinweise. Ersetzt confirm(), prompt() und alert() des Browsers:
  // die können auf dem iPhone (vor allem als App auf dem Home-Bildschirm) hängen und die Seite blockieren.
  const escH = (x) => String(x ?? '').replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
  function fenster({ titel = '', text = '', html = '', eingabe = null, ja = 'OK', nein = 'Abbrechen', gefahr = false, platzhalter = '', mehrzeilig = false }) {
    return new Promise((fertig) => {
      const d = document.createElement('dialog');
      d.className = 'ui-frage'; d.setAttribute('data-ohne-x', '');
      d.innerHTML = `<form method="dialog">${titel ? `<h3>${escH(titel)}</h3>` : ''}${html ? `<div class="ui-html">${html}</div>` : text ? `<p>${escH(text)}</p>` : ''}${eingabe !== null ? (mehrzeilig ? `<textarea rows="4" placeholder="${escH(platzhalter)}" style="width:100%;font:inherit;font-size:16px;border:1px solid color-mix(in srgb,var(--blau,#0B3B2E) 26%,transparent);border-radius:12px;padding:10px 12px;resize:vertical">${escH(eingabe)}</textarea>` : `<input value="${escH(eingabe)}" placeholder="${escH(platzhalter)}" autocomplete="off">`) : ''}<div class="ui-knoepfe">${nein ? `<button type="button" data-nein>${escH(nein)}</button>` : ''}<button class="ja ${gefahr ? 'gefahr' : ''}" value="ja">${escH(ja)}</button></div></form>`;
      document.body.appendChild(d);
      let wert;
      const ende = (w) => { wert = w; if (d.open) d.close(); };
      d.querySelector('[data-nein]') && (d.querySelector('[data-nein]').onclick = () => ende(eingabe !== null ? null : false));
      d.querySelector('form').onsubmit = (e) => { e.preventDefault(); ende(eingabe !== null ? d.querySelector('input,textarea').value : true); };
      d.addEventListener('cancel', () => { wert = eingabe !== null ? null : false; });
      d.addEventListener('close', () => { d.remove(); fertig(wert === undefined ? (eingabe !== null ? null : false) : wert); });
      d.showModal();
      const f = d.querySelector('input,textarea') || d.querySelector('.ja');
      setTimeout(() => { try { f.focus(); if (f.select) f.select(); } catch {} }, 60);
    });
  }
  window.UI = {
    // Ja/Nein: await UI.frage('Wirklich löschen?', { ja: 'Löschen', gefahr: true })
    frage: (text, o = {}) => {
      const weg = /lösch|entfern|beenden|zurücksetzen|ausschalten|festschreiben/i.test(String(text).split('\n')[0]);
      return fenster({ text, ja: o.ja || (weg ? (/lösch/i.test(String(text).split('\n')[0]) ? 'Löschen' : 'Ja') : 'OK'), nein: o.nein || 'Abbrechen', gefahr: o.gefahr ?? weg, titel: o.titel || '', html: o.html ? text : '' });
    },
    // Eingabe: await UI.eingabe('Name des Ordners', { vorgabe: '' }) → Text oder null
    eingabe: (text, o = {}) => fenster({ text, eingabe: o.vorgabe || '', ja: o.ja || 'OK', platzhalter: o.platzhalter || '', titel: o.titel || '', mehrzeilig: !!o.mehrzeilig }),
    // Hinweis mit einem Knopf
    hinweis: (text, o = {}) => fenster({ text, ja: o.ja || 'OK', nein: '', titel: o.titel || '', html: o.html ? text : '' }),
    // Übersicht anpassen: Teile mit data-teil="…" ein- oder ausblenden, pro Bereich auf dem Gerät gemerkt
    teile: {
      lesen: (bereich) => { try { return JSON.parse(localStorage.getItem('ordasio.teile.' + bereich) || '{}'); } catch { return {}; } },
      anwenden: (bereich) => {
        const aus = window.UI.teile.lesen(bereich);
        let st = document.getElementById('ui-teile'); if (!st) { st = document.createElement('style'); st.id = 'ui-teile'; document.head.appendChild(st); }
        st.textContent = Object.entries(aus).filter(([, an]) => an === false).map(([id]) => `[data-teil="${String(id).replace(/[^\w-]/g, '')}"]{display:none!important}`).join('\n');
      },
      dialog: (bereich, teile) => new Promise((fertig) => {
        const aus = window.UI.teile.lesen(bereich);
        const d = document.createElement('dialog'); d.className = 'ui-frage'; d.setAttribute('data-ohne-x', '');
        d.innerHTML = `<form method="dialog"><h3>Übersicht anpassen</h3><p>Wählen Sie, was hier angezeigt wird.</p>
          <div style="display:grid;gap:10px">${teile.map(([id, n]) => `<label style="display:flex;gap:10px;align-items:center;font-size:15px;color:#0A1F17"><input type="checkbox" data-t="${escH(id)}" ${aus[id] === false ? '' : 'checked'} style="width:20px;height:20px;accent-color:var(--blau,#0B3B2E)"> ${escH(n)}</label>`).join('')}</div>
          <div class="ui-knoepfe"><button type="button" data-nein>Abbrechen</button><button class="ja">Speichern</button></div></form>`;
        document.body.appendChild(d);
        d.querySelector('[data-nein]').onclick = () => d.close();
        d.querySelector('form').onsubmit = (e) => {
          e.preventDefault();
          const neu = {}; d.querySelectorAll('[data-t]').forEach((c) => { neu[c.dataset.t] = c.checked; });
          try { localStorage.setItem('ordasio.teile.' + bereich, JSON.stringify(neu)); } catch {}
          window.UI.teile.anwenden(bereich); d.close();
        };
        d.addEventListener('close', () => { d.remove(); fertig(); });
        d.showModal();
      }),
    },
    // Foto bearbeiten: drehen, zuschneiden, für schlecht eingescannte Dokumente heller und kräftiger machen
    bildBearbeiten: (src, o = {}) => bildBearbeiten(src, o),
  };

  function bildBearbeiten(src, { titel = 'Foto bearbeiten', max = 1800 } = {}) {
    return new Promise((fertig) => {
      const img = new Image();
      img.onload = () => {
        let dreh = 0, scan = false, r = { x: 0, y: 0, w: 1, h: 1 };
        const d = document.createElement('dialog');
        d.className = 'ui-frage ui-bild'; d.setAttribute('data-ohne-x', '');
        d.innerHTML = `<form method="dialog"><h3>${escH(titel)}</h3><p>Rahmen oder Ecken ziehen zum Zuschneiden.</p>
          <div class="ui-schnitt"><canvas></canvas><div class="ui-rahmen"><i data-e="nw"></i><i data-e="ne"></i><i data-e="sw"></i><i data-e="se"></i></div></div>
          <div class="ui-knoepfe" style="justify-content:flex-start"><button type="button" data-b="links">↺ Drehen</button><button type="button" data-b="rechts">↻ Drehen</button><button type="button" data-b="scan">Heller und schärfer</button><button type="button" data-b="alles">Ganzes Bild</button></div>
          <div class="ui-knoepfe"><button type="button" data-b="zu">Abbrechen</button><button class="ja" value="ja">Übernehmen</button></div></form>`;
        document.body.appendChild(d);
        const cv = d.querySelector('canvas'), box = d.querySelector('.ui-schnitt'), rahmen = d.querySelector('.ui-rahmen');
        // Bild gedreht (und auf Wunsch kontrastreicher) auf eine Leinwand malen
        const malen = (ziel, f = 1) => {
          const quer = dreh % 180 !== 0, w = img.naturalWidth * f, h = img.naturalHeight * f;
          ziel.width = Math.round(quer ? h : w); ziel.height = Math.round(quer ? w : h);
          const g = ziel.getContext('2d');
          g.save(); g.translate(ziel.width / 2, ziel.height / 2); g.rotate(dreh * Math.PI / 180);
          if (scan) g.filter = 'brightness(1.12) contrast(1.45) saturate(.85)';
          g.drawImage(img, -w / 2, -h / 2, w, h); g.restore();
        };
        const zeigen = () => {
          const f = Math.min(1, 900 / Math.max(img.naturalWidth, img.naturalHeight));
          malen(cv, f);
          Object.assign(rahmen.style, { left: r.x * 100 + '%', top: r.y * 100 + '%', width: r.w * 100 + '%', height: r.h * 100 + '%' });
        };
        zeigen();
        let zug = null;
        box.addEventListener('pointerdown', (e) => { if (!e.target.closest('.ui-rahmen')) return; e.preventDefault(); box.setPointerCapture(e.pointerId); zug = { e: e.target.dataset.e || 'm', x: e.clientX, y: e.clientY, r: { ...r } }; });
        box.addEventListener('pointermove', (e) => {
          if (!zug) return;
          const b = cv.getBoundingClientRect(), dx = (e.clientX - zug.x) / b.width, dy = (e.clientY - zug.y) / b.height, a = zug.r, m = 0.05;
          let { x, y, w, h } = a;
          if (zug.e === 'm') { x = Math.min(1 - w, Math.max(0, a.x + dx)); y = Math.min(1 - h, Math.max(0, a.y + dy)); }
          if (zug.e.includes('w')) { x = Math.min(a.x + a.w - m, Math.max(0, a.x + dx)); w = a.x + a.w - x; }
          if (zug.e.includes('e')) w = Math.min(1 - a.x, Math.max(m, a.w + dx));
          if (zug.e.includes('n')) { y = Math.min(a.y + a.h - m, Math.max(0, a.y + dy)); h = a.y + a.h - y; }
          if (zug.e.includes('s')) h = Math.min(1 - a.y, Math.max(m, a.h + dy));
          r = { x, y, w, h }; zeigen();
        });
        const los = () => { zug = null; };
        box.addEventListener('pointerup', los); box.addEventListener('pointercancel', los);
        let ergebnis = null;
        d.addEventListener('click', (e) => {
          const t = e.target.closest('[data-b]'); if (!t) return;
          const b = t.dataset.b;
          if (b === 'zu') { d.close(); return; }
          if (b === 'links' || b === 'rechts') { dreh = (dreh + (b === 'rechts' ? 90 : 270)) % 360; r = { x: 0, y: 0, w: 1, h: 1 }; }
          if (b === 'scan') { scan = !scan; t.classList.toggle('ja', scan); }
          if (b === 'alles') r = { x: 0, y: 0, w: 1, h: 1 };
          zeigen();
        });
        d.querySelector('form').onsubmit = (e) => {
          e.preventDefault();
          const voll = document.createElement('canvas'); malen(voll, 1);
          const sx = r.x * voll.width, sy = r.y * voll.height, sw = r.w * voll.width, sh = r.h * voll.height;
          const f = Math.min(1, max / Math.max(sw, sh));
          const aus = document.createElement('canvas'); aus.width = Math.max(1, Math.round(sw * f)); aus.height = Math.max(1, Math.round(sh * f));
          aus.getContext('2d').drawImage(voll, sx, sy, sw, sh, 0, 0, aus.width, aus.height);
          ergebnis = aus.toDataURL('image/jpeg', 0.86);
          d.close();
        };
        d.addEventListener('close', () => { d.remove(); fertig(ergebnis); });
        d.showModal();
      };
      img.onerror = () => fertig(null);
      img.src = src;
    });
  }

  // Neuer Inhalt per innerHTML entfernt das ✕: beim nächsten showModal wird es wieder eingesetzt.
  new MutationObserver(() => {
    for (const d of document.querySelectorAll('dialog[open]')) if (!d.querySelector(':scope > .ui-zu') && !d.hasAttribute('data-ohne-x')) d.showModal();
  }).observe(document.documentElement, { childList: true, subtree: true });
})();

// Rückgängig: nach einer Änderung erscheint unten kurz „Rückgängig“. Ein Tipp stellt den alten Stand wieder her.
(() => {
  if (window.Rueckgaengig) return;
  const stil = document.createElement('style');
  stil.textContent = `
  .rg-leiste{position:fixed;left:50%;bottom:calc(92px + env(safe-area-inset-bottom,0px));transform:translate(-50%,30px);opacity:0;z-index:2147483000;display:flex;align-items:center;gap:14px;background:#0A1F17;color:#fff;border-radius:100px;padding:10px 10px 10px 20px;font:600 15px 'League Spartan',-apple-system,system-ui,sans-serif;box-shadow:0 20px 50px -20px rgba(12,18,38,.7);transition:transform .3s,opacity .3s;pointer-events:none;max-width:calc(100vw - 24px)}
  .rg-leiste.da{transform:translate(-50%,0);opacity:1;pointer-events:auto}
  .rg-leiste span{white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
  .rg-leiste button{border:0;border-radius:100px;padding:9px 16px;background:#6EE7A8;color:#0A1F17;font:700 15px inherit;font-family:inherit;cursor:pointer;white-space:nowrap}
  @media(min-width:821px){.rg-leiste{bottom:28px}}`;
  document.head.appendChild(stil);
  let leiste, timer, aktuell = null;
  // Solange die Rückgängig-Leiste sichtbar ist, werden andere kurze Meldungen der Seite ausgeblendet (sonst liegen sie übereinander)
  let aktivBis = 0;
  new MutationObserver((liste) => {
    if (Date.now() > aktivBis) return;
    for (const m of liste) { const el = m.target; if (el.classList && (el.id === 'toast' || el.classList.contains('toast')) && /\b(da|zeigen)\b/.test(el.className)) el.classList.remove('da', 'zeigen'); }
  }).observe(document.documentElement, { attributes: true, attributeFilter: ['class'], subtree: true });
  function zeigen(text, rueckgaengig, ms = 9000) {
    aktivBis = Date.now() + ms;
    if (!leiste) { leiste = document.createElement('div'); leiste.className = 'rg-leiste'; leiste.setAttribute('role', 'status'); (document.body || document.documentElement).appendChild(leiste); }
    aktuell = rueckgaengig;
    leiste.innerHTML = `<span></span><button type="button">↶ Rückgängig</button>`;
    leiste.querySelector('span').textContent = text;
    leiste.querySelector('button').onclick = async () => {
      const f = aktuell; aktuell = null; leiste.classList.remove('da'); aktivBis = 0;
      if (!f) return;
      try { await f(); zeigenKurz('Rückgängig gemacht'); } catch (e) { zeigenKurz('Konnte nicht rückgängig gemacht werden'); }
    };
    requestAnimationFrame(() => leiste.classList.add('da'));
    clearTimeout(timer); timer = setTimeout(() => { leiste.classList.remove('da'); aktuell = null; }, ms);
  }
  function zeigenKurz(text) {
    if (!leiste) return;
    leiste.innerHTML = `<span></span>`; leiste.querySelector('span').textContent = '✓ ' + text;
    leiste.classList.add('da'); clearTimeout(timer); timer = setTimeout(() => leiste.classList.remove('da'), 2200);
  }
  window.Rueckgaengig = { zeigen };
})();

// Darstellung für die ganze App (nur optisch, pro Gerät): Akzentfarbe, Kopfzeile, Hintergrund, eigenes Bild, Schrift
(() => {
  const KEY = 'ordasio.darstellung', BILD = 'ordasio.hintergrundBild';
  const lies = () => { try { return JSON.parse(localStorage.getItem(KEY) || '{}'); } catch { return {}; } };
  // Akzentfarben: [id, Name, dunkel (Titel, Menü), kräftig (Knöpfe, Links)]
  const AKZENTE = [
    ['tanne', 'Tanne', '#0B3B2E', '#0E7A55'], ['smaragd', 'Smaragd', '#064E3B', '#059669'], ['petrol', 'Petrol', '#0B3F4A', '#0E7C86'],
    ['ozean', 'Ozean', '#0F2F6B', '#2457D6'], ['nachtblau', 'Nachtblau', '#0F1F3D', '#2B4C8C'], ['indigo', 'Indigo', '#2A1F6B', '#5B4BDB'],
    ['aubergine', 'Aubergine', '#3B1340', '#7E2E8C'], ['beere', 'Beere', '#5E0B3A', '#B8175A'], ['bordeaux', 'Bordeaux', '#4E0F22', '#8E1F3C'],
    ['rubin', 'Rubin', '#6B0D1C', '#C0122E'], ['koralle', 'Koralle', '#6E2615', '#C94E2A'], ['terrakotta', 'Terrakotta', '#5F2E1B', '#A84E2A'],
    ['gold', 'Gold', '#4F3A0B', '#9A6F08'], ['graphit', 'Graphit', '#1F2328', '#4B5563'],
  ];
  // Hintergründe: [id, Name, CSS, Gruppe]
  const HINTERGRUENDE = [
    ['standard', 'Passend', null, 'sanft'], ['weiss', 'Weiss', '#FAFAF8', 'sanft'], ['sand', 'Sand', '#F6F0E6', 'sanft'], ['salbei', 'Salbei', '#ECF2EA', 'sanft'],
    ['himmel', 'Himmel', '#EDF3FD', 'sanft'], ['lavendel', 'Lavendel', '#F2EFFA', 'sanft'], ['rose', 'Rosé', '#FAF0F0', 'sanft'], ['grau', 'Stein', '#EFF1F3', 'sanft'],
    ['morgen', 'Morgen', 'linear-gradient(160deg,#FFF1E6 0%,#F4FAF6 55%,#E6F6EE 100%)', 'sanft'], ['ozean', 'Ozean', 'linear-gradient(160deg,#E8F1FF 0%,#F2FAF7 60%,#E3F5EE 100%)', 'sanft'],
    ['abend', 'Abend', 'linear-gradient(160deg,#F3EEFC 0%,#FBF1F3 60%,#FFF6EC 100%)', 'sanft'], ['wald', 'Wald', 'linear-gradient(160deg,#E4F1EA 0%,#F4F7EF 60%,#EFF3E6 100%)', 'sanft'],
    ['verlauf', 'Akzent-Verlauf', 'akzent', 'kraeftig'],
    ['k-bordeaux', 'Bordeaux', 'linear-gradient(150deg,#E8BFCA 0%,#F4DCE2 50%,#EAC6BE 100%)', 'kraeftig'],
    ['k-sonne', 'Sonnenuntergang', 'linear-gradient(150deg,#FAD0B4 0%,#F7C3CE 50%,#E2C8F0 100%)', 'kraeftig'],
    ['k-pfirsich', 'Pfirsich', 'linear-gradient(150deg,#FFD6BD 0%,#FFE7D3 55%,#FBCBC1 100%)', 'kraeftig'],
    ['k-gold', 'Gold', 'linear-gradient(150deg,#F1DA9E 0%,#FAEECD 55%,#EBCD95 100%)', 'kraeftig'],
    ['k-smaragd', 'Smaragd', 'linear-gradient(150deg,#B6E5D0 0%,#DFF4EA 55%,#BCE3DB 100%)', 'kraeftig'],
    ['k-lagune', 'Lagune', 'linear-gradient(150deg,#B8E0E9 0%,#DFF1F4 55%,#BED6F1 100%)', 'kraeftig'],
    ['k-royal', 'Royal', 'linear-gradient(150deg,#C2D1FA 0%,#E2E9FD 55%,#CEC4F4 100%)', 'kraeftig'],
    ['k-aurora', 'Aurora', 'linear-gradient(150deg,#D5C3F4 0%,#EFE1FA 50%,#F5C9E0 100%)', 'kraeftig'],
    ['k-beere', 'Beere', 'linear-gradient(150deg,#EFBDD4 0%,#F8DDE8 55%,#E3C1EC 100%)', 'kraeftig'],
    ['k-schiefer', 'Schiefer', 'linear-gradient(150deg,#C6CFDA 0%,#E6EAF0 55%,#CFD4E0 100%)', 'kraeftig'],
  ];
  const KOPF = [['hell', 'Hell'], ['farbe', 'In Akzentfarbe'], ['verlauf', 'Farbverlauf']];
  // Farben rechnen (für die eigene Farbe und passende Hintergründe)
  const rgb = (h) => { h = String(h || '').replace('#', ''); if (h.length === 3) h = h.split('').map((c) => c + c).join(''); const n = parseInt(h, 16); return isNaN(n) ? [14, 122, 85] : [n >> 16 & 255, n >> 8 & 255, n & 255]; };
  const hex = (r) => '#' + r.map((x) => Math.max(0, Math.min(255, Math.round(x))).toString(16).padStart(2, '0')).join('');
  const misch = (a, b, t) => { const x = rgb(a), y = rgb(b); return hex(x.map((v, i) => v + (y[i] - v) * t)); };
  const hellig = (h) => { const [r, g, b] = rgb(h).map((v) => { v /= 255; return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4); }); return 0.2126 * r + 0.7152 * g + 0.0722 * b; };
  // Eigene Farbe: so weit abdunkeln, dass weisse Schrift darauf gut lesbar ist (Kontrast mind. 4.5 : 1)
  function eigene(farbe) {
    let k = farbe; for (let i = 0; i < 12 && hellig(k) > 0.18; i++) k = misch(k, '#000', 0.1);
    return [k, misch(k, '#000', 0.55)];
  }
  function akzent(d) {
    if (d.akzent === 'eigen' && d.eigeneFarbe) { const [k, dk] = eigene(d.eigeneFarbe); return { id: 'eigen', dunkel: dk, kraeftig: k }; }
    const a = AKZENTE.find((x) => x[0] === d.akzent) || AKZENTE[0];
    return { id: a[0], dunkel: a[2], kraeftig: a[3] };
  }
  const css = document.createElement('style'); css.id = 'ui-darstellung';
  document.head.appendChild(css);
  function anwenden() {
    const d = lies(), A = akzent(d), h = HINTERGRUENDE.find((x) => x[0] === (d.hintergrund || 'standard')) || HINTERGRUENDE[0];
    const eigen = A.id !== 'tanne';
    let bild = ''; if (d.hintergrund === 'bild') { try { bild = localStorage.getItem(BILD) || ''; } catch {} }
    const schleier = Math.min(0.92, Math.max(0.3, Number(d.schleier ?? 0.72)));
    let regeln = '';
    // Startseite mit eigenem Farbthema (z. B. dunkel) behält ihr Thema
    const B = 'body:is(:not([data-thema]),[data-thema=hell])';
    const papierPassend = eigen ? misch(A.kraeftig, '#FFFFFF', 0.95) : '#F4FAF6';
    if (eigen) regeln += `html:root{--blau:${A.dunkel};--elektrik:${A.kraeftig};--flaeche:${misch(A.kraeftig, '#FFFFFF', 0.88)};--papier:${papierPassend}}`;
    if (bild) regeln += `${B}{background:transparent!important}html{background:${papierPassend}}${B}::before{content:"";position:fixed;inset:0;z-index:-1;background:linear-gradient(rgba(250,252,251,${schleier}),rgba(250,252,251,${schleier})),url("${bild}") center/cover no-repeat;pointer-events:none}`;
    else if (h[0] === 'verlauf') {
      const v = `linear-gradient(155deg,${misch(A.kraeftig, '#FFFFFF', 0.72)} 0%,${misch(A.kraeftig, '#FFFFFF', 0.9)} 50%,${misch(A.dunkel, '#FFFFFF', 0.8)} 100%)`;
      regeln += `html:root{--papier:${misch(A.kraeftig, '#FFFFFF', 0.9)}}${B}{background:${v}!important;background-attachment:fixed!important}`;
    } else if (h[2]) {
      const flach = !h[2].startsWith('linear');
      regeln += `html:root{--papier:${flach ? h[2] : '#F6F8F7'}}${B}{background:${h[2]}!important;background-attachment:fixed!important}`;
    }
    // Kopfzeile in Akzentfarbe oder als Farbverlauf (weisse Schrift)
    const kopf = d.kopf || 'hell';
    if (kopf !== 'hell') {
      const K = '.nv-kopfzeile', H = 'header.kopfzeile', N = ':not(.su-knopf):not(.nv-knopf):not(.ordi-kopfknopf)';
      const bg = kopf === 'verlauf' ? `linear-gradient(110deg,${A.dunkel} 0%,${A.kraeftig} 100%)` : A.dunkel;
      regeln += `${K},${K}.nv-gerollt,${H},${H}.ui-gerollt{background:${bg}!important;box-shadow:0 10px 30px -18px ${A.dunkel}!important;-webkit-backdrop-filter:none!important;backdrop-filter:none!important}
        ${K} .nv-app-name,${K} .nv-rechts a${N},${K} .nv-rechts button${N},${H} .marke,${H} .tabs button,${H} a${N}{color:#fff!important}
        ${K} .nv-rechts a${N}:hover,${K} .nv-rechts button${N}:hover,${H} .tabs button:hover{background:rgba(255,255,255,.14)!important}
        ${H} .tabs button.an{background:#fff!important;color:${A.dunkel}!important}
        ${K} .nv-app-ic,${H} .marke i{background:rgba(255,255,255,.16)!important;box-shadow:none!important}
        ${K} .nv-bereich{background:rgba(255,255,255,.16)!important;color:#fff!important}
        ${K} .nv-logo img,${H} .nv-logo img{filter:brightness(0) invert(1)}${K} .nv-logo i,${H} .nv-logo i{background:#fff!important}
        ${K} .nv-knopf,${H} .nv-knopf,${K} .su-knopf,${H} .su-knopf{box-shadow:none!important;border-color:transparent!important}`;
    }
    if (d.schrift === 'gross') regeln += 'body{zoom:1.08}';
    css.textContent = regeln;
    // Statusleiste auf dem Handy passend einfärben
    try {
      let m = document.querySelector('meta[name=theme-color]'); if (!m) { m = document.createElement('meta'); m.name = 'theme-color'; document.head.appendChild(m); }
      m.content = kopf !== 'hell' ? A.dunkel : (h[2] && !String(h[2]).startsWith('linear') && h[2] !== 'akzent' ? h[2] : papierPassend);
    } catch {}
  }
  function verkleinern(datei) {
    return new Promise((ok, f) => { const url = URL.createObjectURL(datei), img = new Image();
      img.onload = () => { const s = Math.min(1, 1600 / Math.max(img.naturalWidth, img.naturalHeight)), c = document.createElement('canvas');
        c.width = Math.round(img.naturalWidth * s); c.height = Math.round(img.naturalHeight * s); c.getContext('2d').drawImage(img, 0, 0, c.width, c.height); URL.revokeObjectURL(url); ok(c.toDataURL('image/jpeg', 0.72)); };
      img.onerror = f; img.src = url; });
  }
  function dialog() {
    const dlg = document.createElement('dialog'); dlg.className = 'ui-frage ui-darst'; dlg.style.width = 'min(560px,calc(100vw - 24px))';
    const malen = () => {
      const d = lies(), A = akzent(d), hg = d.hintergrund || 'standard'; let hatBild = false; try { hatBild = !!localStorage.getItem(BILD); } catch {}
      const kachel = ([k, n, w]) => `<button type="button" data-hg="${k}" class="${hg === k ? 'an' : ''}"><i style="background:${k === 'standard' ? misch(A.kraeftig, '#FFFFFF', 0.93) : w === 'akzent' ? `linear-gradient(155deg,${misch(A.kraeftig, '#FFFFFF', 0.6)},${misch(A.kraeftig, '#FFFFFF', 0.88)} 50%,${misch(A.dunkel, '#FFFFFF', 0.7)})` : w}"></i>${n}</button>`;
      const f0 = dlg.querySelector('form'), oben = f0 ? f0.scrollTop : 0;
      dlg.innerHTML = `<form method="dialog"><h3>Darstellung</h3><p>Gilt für alle Bereiche auf diesem Gerät. Rechnungen und Vorlagen behalten die Farben Ihrer Firma.</p>
        <div class="ui-vorschau" style="--v1:${A.dunkel};--v2:${A.kraeftig}">
          <div class="ui-v-kopf ${d.kopf || 'hell'}"><span></span><b>Rechnungen</b></div>
          <div class="ui-v-inhalt"><i></i><i class="kurz"></i><button type="button" tabindex="-1">Neue Rechnung</button><em>Offen</em></div></div>
        <p class="ui-titel">Akzentfarbe <small>Knöpfe, Symbole, Menü, Markierungen</small></p>
        <div class="ui-akzente">${AKZENTE.map(([k, n, dk, kr]) => `<button type="button" data-akzent="${k}" title="${n}" class="${A.id === k ? 'an' : ''}"><i style="background:linear-gradient(135deg,${kr},${dk})"></i><span>${n}</span></button>`).join('')}
          <label class="${A.id === 'eigen' ? 'an' : ''}" title="Eigene Farbe"><i style="background:${A.id === 'eigen' ? `linear-gradient(135deg,${A.kraeftig},${A.dunkel})` : 'conic-gradient(#E5484D,#F5B53D,#22C55E,#0EA5E9,#6366F1,#C026D3,#E5484D)'}"></i><span>Eigene</span><input type="color" value="${d.eigeneFarbe || A.kraeftig}" data-akzent-eigen></label></div>
        <p class="ui-titel">Kopfzeile</p>
        <div class="ui-hg drei">${KOPF.map(([k, n]) => `<button type="button" data-kopf="${k}" class="${(d.kopf || 'hell') === k ? 'an' : ''}"><i style="background:${k === 'hell' ? '#F6F8F7' : k === 'farbe' ? A.dunkel : `linear-gradient(110deg,${A.dunkel},${A.kraeftig})`}"></i>${n}</button>`).join('')}</div>
        <p class="ui-titel">Hintergrund <small>Sanft</small></p>
        <div class="ui-hg">${HINTERGRUENDE.filter((x) => x[3] === 'sanft').map(kachel).join('')}</div>
        <p class="ui-titel">Kräftige Farbverläufe</p>
        <div class="ui-hg">${HINTERGRUENDE.filter((x) => x[3] === 'kraeftig').map(kachel).join('')}
          <label class="${hg === 'bild' ? 'an' : ''}" style="cursor:pointer"><i style="background:${hatBild && hg === 'bild' ? 'center/cover url(' + localStorage.getItem(BILD) + ')' : 'repeating-linear-gradient(45deg,#E8EEEB 0 8px,#F7FAF8 8px 16px)'}">${hatBild ? '' : '<span>＋</span>'}</i>Eigenes Bild<input type="file" accept="image/*" hidden data-hg-bild></label></div>
        ${hg === 'bild' ? `<label class="ui-regler">Bild heller oder kräftiger<input type="range" min="0.3" max="0.92" step="0.02" value="${d.schleier ?? 0.72}" data-hg-schleier></label>` : ''}
        <p class="ui-titel">Schrift</p><div class="ui-hg zwei">${[['normal', 'Normal'], ['gross', 'Etwas grösser']].map(([k, n]) => `<button type="button" data-schrift="${k}" class="${(d.schrift || 'normal') === k ? 'an' : ''}">${n}</button>`).join('')}</div>
        <p class="ui-titel">Hilfen</p><div class="ui-hg zwei">
          <button type="button" data-hilfe="tipps" class="${!window.Tipps || Tipps.istAn() ? 'an' : ''}">💡 Tipps in den Bereichen</button><button type="button" data-hilfe="ordi" class="${!window.Ordi || Ordi.istAn() ? 'an' : ''}">💬 Ordi, der Helfer</button></div>
        <div class="ui-knoepfe"><button type="button" class="nein" data-hg-zurueck>Zurücksetzen</button><button class="ja">Fertig</button></div></form>`;
      if (oben) dlg.querySelector('form').scrollTop = oben;
    };
    const setz = (neu) => { try { localStorage.setItem(KEY, JSON.stringify({ ...lies(), ...neu })); } catch {} anwenden(); malen(); };
    malen(); document.body.appendChild(dlg);
    dlg.addEventListener('click', (e) => {
      const h = e.target.closest('[data-hg]'); if (h) setz({ hintergrund: h.dataset.hg });
      const s = e.target.closest('[data-schrift]'); if (s) setz({ schrift: s.dataset.schrift });
      const ak = e.target.closest('[data-akzent]'); if (ak) setz({ akzent: ak.dataset.akzent });
      const ko = e.target.closest('[data-kopf]'); if (ko) setz({ kopf: ko.dataset.kopf });
      const hi = e.target.closest('[data-hilfe]');
      if (hi && hi.dataset.hilfe === 'tipps' && window.Tipps) { if (Tipps.istAn()) Tipps.aus(); else Tipps.an(); malen(); }
      if (hi && hi.dataset.hilfe === 'ordi' && window.Ordi) { if (Ordi.istAn()) Ordi.aus(); else Ordi.an(); malen(); }
      if (e.target.closest('[data-hg-zurueck]')) { try { localStorage.removeItem(KEY); localStorage.removeItem(BILD); } catch {} anwenden(); malen(); }
    });
    // Eigene Farbe: beim Ziehen sofort zeigen, beim Loslassen neu zeichnen
    dlg.addEventListener('input', (e) => { if (e.target.matches('[data-akzent-eigen]')) { try { localStorage.setItem(KEY, JSON.stringify({ ...lies(), akzent: 'eigen', eigeneFarbe: e.target.value })); } catch {} anwenden(); } });
    dlg.addEventListener('change', (e) => { if (e.target.matches('[data-akzent-eigen]')) malen(); });
    dlg.addEventListener('input', (e) => { if (e.target.matches('[data-hg-schleier]')) { try { localStorage.setItem(KEY, JSON.stringify({ ...lies(), schleier: Number(e.target.value) })); } catch {} anwenden(); } });
    dlg.addEventListener('change', async (e) => {
      if (!e.target.matches('[data-hg-bild]') || !e.target.files[0]) return;
      try { const b = await verkleinern(e.target.files[0]); localStorage.setItem(BILD, b); setz({ hintergrund: 'bild' }); }
      catch { if (window.UI) UI.hinweis('Das Bild ist zu gross für dieses Gerät. Bitte ein kleineres wählen.'); }
    });
    dlg.querySelector('form') && dlg.addEventListener('submit', (e) => { e.preventDefault(); dlg.close(); });
    dlg.addEventListener('close', () => dlg.remove());
    dlg.showModal();
  }
  const stil = document.createElement('style');
  stil.textContent = `.ui-hg{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:8px;margin-top:8px}.ui-hg.zwei{grid-template-columns:1fr 1fr}
  .ui-hg button,.ui-hg label{align-content:center}
  .ui-hg button,.ui-hg label{border:2px solid transparent;border-radius:14px;padding:6px;background:#fff;box-shadow:0 0 0 1px color-mix(in srgb,var(--blau,#0B3B2E) 14%,transparent);font:inherit;font-size:12.5px;color:#0A1F17;display:grid;gap:5px;text-align:center}
  .ui-hg i{display:grid;place-items:center;height:40px;border-radius:9px;box-shadow:inset 0 0 0 1px rgba(0,0,0,.06);font-style:normal;color:#7C8499;font-size:18px}
  .ui-darst form{max-height:min(84vh,780px);overflow:auto;overscroll-behavior:contain}
  .ui-titel{margin:14px 0 0;font-weight:700;color:#0A1F17}.ui-titel small{font-weight:400;color:#7C8499;margin-left:6px}
  .ui-hg.drei{grid-template-columns:repeat(3,minmax(0,1fr))}
  .ui-akzente{display:grid;grid-template-columns:repeat(5,minmax(0,1fr));gap:8px;margin-top:8px}
  .ui-akzente button,.ui-akzente label{border:0;background:none;padding:4px 0;display:grid;justify-items:center;gap:4px;font:inherit;font-size:11.5px;color:#3F5A4F;cursor:pointer;position:relative}
  .ui-akzente i{width:38px;height:38px;border-radius:50%;box-shadow:0 0 0 1px rgba(0,0,0,.08),0 6px 14px -8px rgba(0,0,0,.5);transition:transform .2s}
  .ui-akzente .an i{box-shadow:0 0 0 3px #fff,0 0 0 5px #0A1F17;transform:scale(1.04)}.ui-akzente .an span{color:#0A1F17;font-weight:700}
  .ui-akzente input[type=color]{position:absolute;inset:0;opacity:0;cursor:pointer;width:100%;height:100%}
  .ui-vorschau{margin-top:10px;border-radius:16px;overflow:hidden;box-shadow:0 0 0 1px rgba(0,0,0,.07);background:color-mix(in srgb,var(--v2) 5%,#fff)}
  .ui-v-kopf{display:flex;align-items:center;gap:8px;padding:10px 12px;font-weight:700;color:#0A1F17}
  .ui-v-kopf span{width:22px;height:22px;border-radius:7px;background:linear-gradient(160deg,var(--v2),var(--v1))}
  .ui-v-kopf.farbe{background:var(--v1);color:#fff}.ui-v-kopf.verlauf{background:linear-gradient(110deg,var(--v1),var(--v2));color:#fff}.ui-v-kopf:not(.hell) span{background:rgba(255,255,255,.2)}
  .ui-v-inhalt{display:flex;align-items:center;gap:8px;padding:12px;flex-wrap:wrap}.ui-v-inhalt i{height:9px;width:90px;border-radius:5px;background:color-mix(in srgb,var(--v1) 16%,#fff)}.ui-v-inhalt i.kurz{width:50px}
  .ui-v-inhalt button{margin-left:auto;border:0;border-radius:100px;padding:7px 12px;background:var(--v2);color:#fff;font:inherit;font-size:12px;font-weight:600}
  .ui-v-inhalt em{font-style:normal;font-size:11px;font-weight:600;border-radius:100px;padding:4px 8px;background:color-mix(in srgb,var(--v2) 12%,#fff);color:var(--v1)}
  @media(max-width:420px){.ui-akzente i{width:34px;height:34px}}
  .ui-hg .an{border-color:var(--elektrik,#0E7A55)}.ui-regler{display:grid;gap:4px;margin-top:10px;font-size:13px;color:#3F5A4F}.ui-regler input{width:100%;accent-color:var(--elektrik,#0E7A55)}
  @media(max-width:420px){.ui-hg{grid-template-columns:repeat(3,minmax(0,1fr))}}`;
  document.head.appendChild(stil);
  anwenden();
  addEventListener('storage', (e) => { if (e.key === KEY || e.key === BILD) anwenden(); });
  window.UI = Object.assign(window.UI || {}, { darstellung: dialog });
})();

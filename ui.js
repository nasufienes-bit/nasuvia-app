// Gemeinsame Bedienung für alle Bereiche: Fenster (dialog) erscheinen immer gut sichtbar,
// lassen sich mit ✕, Escape oder Tippen daneben schliessen und können die Seite nie blockieren.
(() => {
  const stil = document.createElement('style');
  stil.textContent = `
  dialog[open]{position:fixed;inset:0;margin:auto;max-height:calc(100dvh - 32px);overflow:auto;overscroll-behavior:contain;-webkit-overflow-scrolling:touch}
  dialog .ui-zu{position:sticky;float:right;top:10px;right:10px;margin:10px 10px -46px 0;z-index:5;width:36px;height:36px;border:0;border-radius:50%;background:#E8F4EE;color:#0B3B2E;font-size:18px;line-height:1;cursor:pointer;display:grid;place-items:center}
  dialog .ui-zu:hover{background:#E1E6F3}
  @media (max-width:640px){
    dialog[open]{inset:auto 0 var(--ui-tastatur,0px) 0;margin:0;width:100%!important;max-width:100%!important;max-height:calc(var(--ui-hoehe,100dvh) - 10px);border-radius:22px 22px 0 0!important;padding-bottom:env(safe-area-inset-bottom,0px);animation:uiHoch .28s cubic-bezier(.2,.9,.3,1)}
  }
  dialog.ui-frage{width:min(420px,calc(100vw - 24px));border:0;border-radius:18px;padding:0;background:#fff;color:#0A1F17;box-shadow:0 30px 80px -20px rgba(12,18,38,.45);font-family:'League Spartan',-apple-system,system-ui,sans-serif}
  dialog.ui-frage::backdrop{background:rgba(12,18,38,.4)}
  .ui-frage form{padding:22px;display:grid;gap:14px}
  .ui-frage h3{margin:0;font-size:19px;color:#0A1F17}
  .ui-frage p{margin:0;font-size:15px;line-height:1.5;color:#3F5A4F;white-space:pre-line}
  .ui-frage input{width:100%;padding:12px 14px;border:1px solid rgba(11,59,46,.26);border-radius:10px;font:inherit;font-size:16px}
  .ui-frage .ui-knoepfe{display:flex;gap:8px;justify-content:flex-end;flex-wrap:wrap}
  .ui-frage button{border:0;border-radius:100px;padding:11px 18px;font:600 15px inherit;font-family:inherit;cursor:pointer;background:#E8F4EE;color:#0B3B2E}
  .ui-frage button.ja{background:#0B3B2E;color:#fff}
  .ui-frage button.ja.gefahr{background:#E5484D}
  @media (max-width:640px){dialog.ui-frage[open]{border-radius:22px 22px 0 0!important}.ui-frage .ui-knoepfe button{flex:1}}
  dialog.ui-bild{width:min(760px,calc(100vw - 24px))}
  .ui-schnitt{position:relative;display:block;width:fit-content;max-width:100%;margin:0 auto;touch-action:none;user-select:none;overflow:hidden;border-radius:8px;background:#eef1f4}
  .ui-schnitt canvas{display:block;max-width:100%;max-height:55vh;width:auto;height:auto}
  .ui-rahmen{position:absolute;border:2px solid #0E7A55;box-shadow:0 0 0 9999px rgba(10,31,23,.45);cursor:move}
  .ui-rahmen i{position:absolute;width:20px;height:20px;background:#fff;border:2px solid #0E7A55;border-radius:50%}
  .ui-rahmen i[data-e=nw]{left:-3px;top:-3px;cursor:nwse-resize}.ui-rahmen i[data-e=ne]{right:-3px;top:-3px;cursor:nesw-resize}
  .ui-rahmen i[data-e=sw]{left:-3px;bottom:-3px;cursor:nesw-resize}.ui-rahmen i[data-e=se]{right:-3px;bottom:-3px;cursor:nwse-resize}
  .ui-bild .ui-knoepfe button[data-b].ja{background:#0E7A55;color:#fff}
  @keyframes uiHoch{from{transform:translateY(40px);opacity:.4}to{transform:none;opacity:1}}
  html.ui-dialog-offen,html.ui-dialog-offen body{overflow:hidden}
  /* Kopfzeile ohne Trennlinie: oben durchsichtig, beim Scrollen ruhiger Hintergrund in der Seitenfarbe */
  header.kopfzeile{background:transparent!important;backdrop-filter:none!important;-webkit-backdrop-filter:none!important;border:0!important;box-shadow:none!important;transition:background .25s}
  header.kopfzeile.ui-gerollt{background:rgba(244,250,246,.94)!important;backdrop-filter:blur(14px)!important;-webkit-backdrop-filter:blur(14px)!important}
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
    if (!this.querySelector(':scope > .ui-zu') && !this.hasAttribute('data-ohne-x')) {
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
  function fenster({ titel = '', text = '', eingabe = null, ja = 'OK', nein = 'Abbrechen', gefahr = false, platzhalter = '', mehrzeilig = false }) {
    return new Promise((fertig) => {
      const d = document.createElement('dialog');
      d.className = 'ui-frage'; d.setAttribute('data-ohne-x', '');
      d.innerHTML = `<form method="dialog">${titel ? `<h3>${escH(titel)}</h3>` : ''}${text ? `<p>${escH(text)}</p>` : ''}${eingabe !== null ? (mehrzeilig ? `<textarea rows="4" placeholder="${escH(platzhalter)}" style="width:100%;font:inherit;font-size:16px;border:1px solid rgba(11,59,46,.26);border-radius:12px;padding:10px 12px;resize:vertical">${escH(eingabe)}</textarea>` : `<input value="${escH(eingabe)}" placeholder="${escH(platzhalter)}" autocomplete="off">`) : ''}<div class="ui-knoepfe">${nein ? `<button type="button" data-nein>${escH(nein)}</button>` : ''}<button class="ja ${gefahr ? 'gefahr' : ''}" value="ja">${escH(ja)}</button></div></form>`;
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
      return fenster({ text, ja: o.ja || (weg ? (/lösch/i.test(String(text).split('\n')[0]) ? 'Löschen' : 'Ja') : 'OK'), nein: o.nein || 'Abbrechen', gefahr: o.gefahr ?? weg, titel: o.titel || '' });
    },
    // Eingabe: await UI.eingabe('Name des Ordners', { vorgabe: '' }) → Text oder null
    eingabe: (text, o = {}) => fenster({ text, eingabe: o.vorgabe || '', ja: o.ja || 'OK', platzhalter: o.platzhalter || '', titel: o.titel || '', mehrzeilig: !!o.mehrzeilig }),
    // Hinweis mit einem Knopf
    hinweis: (text, o = {}) => fenster({ text, ja: o.ja || 'OK', nein: '', titel: o.titel || '' }),
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
          <div style="display:grid;gap:10px">${teile.map(([id, n]) => `<label style="display:flex;gap:10px;align-items:center;font-size:15px;color:#0A1F17"><input type="checkbox" data-t="${escH(id)}" ${aus[id] === false ? '' : 'checked'} style="width:20px;height:20px;accent-color:#0B3B2E"> ${escH(n)}</label>`).join('')}</div>
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

// Darstellung für die ganze App (nur optisch, pro Gerät): Hintergrund, eigenes Bild, Schriftgrösse
(() => {
  const KEY = 'ordasio.darstellung', BILD = 'ordasio.hintergrundBild';
  const lies = () => { try { return JSON.parse(localStorage.getItem(KEY) || '{}'); } catch { return {}; } };
  const HINTERGRUENDE = [
    ['standard', 'Mint', '#F4FAF6'], ['weiss', 'Weiss', '#FAFAF8'], ['sand', 'Sand', '#F6F0E6'], ['salbei', 'Salbei', '#ECF2EA'],
    ['himmel', 'Himmel', '#EDF3FD'], ['lavendel', 'Lavendel', '#F2EFFA'], ['rose', 'Rosé', '#FAF0F0'], ['grau', 'Stein', '#EFF1F3'],
    ['morgen', 'Morgen', 'linear-gradient(160deg,#FFF1E6 0%,#F4FAF6 55%,#E6F6EE 100%)'], ['ozean', 'Ozean', 'linear-gradient(160deg,#E8F1FF 0%,#F2FAF7 60%,#E3F5EE 100%)'],
    ['abend', 'Abend', 'linear-gradient(160deg,#F3EEFC 0%,#FBF1F3 60%,#FFF6EC 100%)'], ['wald', 'Wald', 'linear-gradient(160deg,#E4F1EA 0%,#F4F7EF 60%,#EFF3E6 100%)'],
  ];
  const css = document.createElement('style'); css.id = 'ui-darstellung';
  document.head.appendChild(css);
  function anwenden() {
    const d = lies(), h = HINTERGRUENDE.find((x) => x[0] === d.hintergrund);
    let bild = ''; if (d.hintergrund === 'bild') { try { bild = localStorage.getItem(BILD) || ''; } catch {} }
    const schleier = Math.min(0.92, Math.max(0.3, Number(d.schleier ?? 0.72)));
    let regeln = '';
    // Startseite mit eigenem Farbthema (z. B. dunkel) behält ihr Thema
    const B = 'body:is(:not([data-thema]),[data-thema=hell])';
    if (bild) regeln += `${B}{background:transparent!important}html{background:#F4FAF6}${B}::before{content:"";position:fixed;inset:0;z-index:-1;background:linear-gradient(rgba(250,252,251,${schleier}),rgba(250,252,251,${schleier})),url("${bild}") center/cover no-repeat;pointer-events:none}`;
    else if (h && h[0] !== 'standard') {
      const flach = !h[2].startsWith('linear');
      regeln += `:root{--papier:${flach ? h[2] : '#F6F8F7'}}${B}{background:${h[2]}!important;background-attachment:fixed!important}`;
    }
    if (d.schrift === 'gross') regeln += 'body{zoom:1.08}';
    css.textContent = regeln;
  }
  function verkleinern(datei) {
    return new Promise((ok, f) => { const url = URL.createObjectURL(datei), img = new Image();
      img.onload = () => { const s = Math.min(1, 1600 / Math.max(img.naturalWidth, img.naturalHeight)), c = document.createElement('canvas');
        c.width = Math.round(img.naturalWidth * s); c.height = Math.round(img.naturalHeight * s); c.getContext('2d').drawImage(img, 0, 0, c.width, c.height); URL.revokeObjectURL(url); ok(c.toDataURL('image/jpeg', 0.72)); };
      img.onerror = f; img.src = url; });
  }
  function dialog() {
    const dlg = document.createElement('dialog'); dlg.className = 'ui-frage'; dlg.style.width = 'min(520px,calc(100vw - 24px))';
    const malen = () => {
      const d = lies(); let hatBild = false; try { hatBild = !!localStorage.getItem(BILD); } catch {}
      dlg.innerHTML = `<form method="dialog"><h3>Darstellung</h3><p>Gilt für alle Bereiche auf diesem Gerät. Nur das Aussehen ändert sich.</p>
        <div class="ui-hg">${HINTERGRUENDE.map(([k, n, w]) => `<button type="button" data-hg="${k}" class="${(d.hintergrund || 'standard') === k ? 'an' : ''}"><i style="background:${w}"></i>${n}</button>`).join('')}
          <label class="${d.hintergrund === 'bild' ? 'an' : ''}" style="cursor:pointer"><i style="background:${hatBild && d.hintergrund === 'bild' ? 'center/cover url(' + localStorage.getItem(BILD) + ')' : 'repeating-linear-gradient(45deg,#E8EEEB 0 8px,#F7FAF8 8px 16px)'}">${hatBild ? '' : '<span>＋</span>'}</i>Eigenes Bild<input type="file" accept="image/*" hidden data-hg-bild></label></div>
        ${d.hintergrund === 'bild' ? `<label class="ui-regler">Bild heller oder kräftiger<input type="range" min="0.3" max="0.92" step="0.02" value="${d.schleier ?? 0.72}" data-hg-schleier></label>` : ''}
        <p style="margin-top:10px"><b style="color:#0A1F17">Schrift</b></p><div class="ui-hg zwei">${[['normal', 'Normal'], ['gross', 'Etwas grösser']].map(([k, n]) => `<button type="button" data-schrift="${k}" class="${(d.schrift || 'normal') === k ? 'an' : ''}">${n}</button>`).join('')}</div>
        <div class="ui-knoepfe"><button type="button" class="nein" data-hg-zurueck>Zurücksetzen</button><button class="ja">Fertig</button></div></form>`;
    };
    const setz = (neu) => { try { localStorage.setItem(KEY, JSON.stringify({ ...lies(), ...neu })); } catch {} anwenden(); malen(); };
    malen(); document.body.appendChild(dlg);
    dlg.addEventListener('click', (e) => {
      const h = e.target.closest('[data-hg]'); if (h) setz({ hintergrund: h.dataset.hg });
      const s = e.target.closest('[data-schrift]'); if (s) setz({ schrift: s.dataset.schrift });
      if (e.target.closest('[data-hg-zurueck]')) { try { localStorage.removeItem(KEY); localStorage.removeItem(BILD); } catch {} anwenden(); malen(); }
    });
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
  .ui-hg button,.ui-hg label{border:2px solid transparent;border-radius:14px;padding:6px;background:#fff;box-shadow:0 0 0 1px rgba(11,59,46,.14);font:inherit;font-size:12.5px;color:#0A1F17;display:grid;gap:5px;text-align:center}
  .ui-hg i{display:grid;place-items:center;height:40px;border-radius:9px;box-shadow:inset 0 0 0 1px rgba(0,0,0,.06);font-style:normal;color:#7C8499;font-size:18px}
  .ui-hg .an{border-color:#0E7A55}.ui-regler{display:grid;gap:4px;margin-top:10px;font-size:13px;color:#3F5A4F}.ui-regler input{width:100%;accent-color:#0E7A55}
  @media(max-width:420px){.ui-hg{grid-template-columns:repeat(3,minmax(0,1fr))}}`;
  document.head.appendChild(stil);
  anwenden();
  addEventListener('storage', (e) => { if (e.key === KEY || e.key === BILD) anwenden(); });
  window.UI = Object.assign(window.UI || {}, { darstellung: dialog });
})();

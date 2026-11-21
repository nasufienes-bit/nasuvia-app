// Gemeinsame Bedienung für alle Bereiche: Fenster (dialog) erscheinen immer gut sichtbar,
// lassen sich mit ✕, Escape oder Tippen daneben schliessen und können die Seite nie blockieren.
(() => {
  const stil = document.createElement('style');
  stil.textContent = `
  dialog[open]{position:fixed;inset:0;margin:auto;max-height:calc(100dvh - 32px);overflow:auto;overscroll-behavior:contain;-webkit-overflow-scrolling:touch}
  dialog .ui-zu{position:sticky;float:right;top:10px;right:10px;margin:10px 10px -46px 0;z-index:5;width:36px;height:36px;border:0;border-radius:50%;background:#E8F4EE;color:#0B3B2E;font-size:18px;line-height:1;cursor:pointer;display:grid;place-items:center}
  dialog .ui-zu:hover{background:#E1E6F3}
  @media (max-width:640px){
    dialog[open]{inset:auto 0 0 0;margin:0;width:100%!important;max-width:100%!important;max-height:92dvh;border-radius:22px 22px 0 0!important;padding-bottom:env(safe-area-inset-bottom,0px);animation:uiHoch .28s cubic-bezier(.2,.9,.3,1)}
  }
  @keyframes uiHoch{from{transform:translateY(40px);opacity:.4}to{transform:none;opacity:1}}
  html.ui-dialog-offen,html.ui-dialog-offen body{overflow:hidden}
  /* iPhone zoomt beim Tippen in Felder mit Schrift unter 16px: auf Touch-Geräten immer 16px */
  @media (pointer:coarse){input:not([type=checkbox]):not([type=radio]):not([type=range]):not([type=color]),select,textarea{font-size:16px!important}}`;
  document.head.appendChild(stil);
  // Zusätzlich auf iPhone/iPad: kein automatisches Hineinzoomen beim Ausfüllen (Zwei-Finger-Zoom bleibt möglich)
  if (/iP(hone|ad|od)/.test(navigator.userAgent) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1)) {
    const vp = document.querySelector('meta[name=viewport]');
    if (vp && !/maximum-scale/.test(vp.content)) vp.content += ', maximum-scale=1';
  }

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
  // Neuer Inhalt per innerHTML entfernt das ✕: beim nächsten showModal wird es wieder eingesetzt.
  new MutationObserver(() => {
    for (const d of document.querySelectorAll('dialog[open]')) if (!d.querySelector(':scope > .ui-zu') && !d.hasAttribute('data-ohne-x')) d.showModal();
  }).observe(document.documentElement, { childList: true, subtree: true });
})();

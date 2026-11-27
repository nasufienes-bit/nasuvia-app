// Handy-Ansicht ruhig halten: nichts schiebt sich seitlich, kein Zoomen mit zwei Fingern.
// Grössere Schrift gibt es unter Menü › Darstellung.
(function () {
  var s = document.createElement('style');
  s.textContent = 'html,body{max-width:100%;overflow-x:hidden;overflow-x:clip;overscroll-behavior-x:none}' +
    'html{-webkit-text-size-adjust:100%;text-size-adjust:100%}' +
    'html,body{touch-action:manipulation}' +
    'img,video,canvas,svg,iframe,table,pre{max-width:100%}' +
    // Symbole auf Knöpfen immer mittig
    // :where() = tiefste Priorität: Knöpfe mit eigenem Stil (Symbol + Text, z. B. Seitenleiste) bleiben, wie sie sind
    ':where(button:has(> svg:only-child),button:has(> .oi:only-child),a:has(> svg:only-child)){display:inline-grid;place-items:center}' +
    ':where(button > svg:only-child,button > .oi:only-child){display:block;margin:auto}' +
    // iOS zoomt beim Tippen in Felder unter 16px: auf dem Handy mindestens 16px
    '@media (max-width:820px){input:not([type=checkbox]):not([type=radio]):not([type=range]),select,textarea{font-size:max(16px,1em)}}';
  (document.head || document.documentElement).appendChild(s);
  // Safari ignoriert user-scalable=no: Zwei-Finger-Zoom selbst abfangen (Unterschrift und Wischen bleiben möglich)
  var stopp = function (e) { e.preventDefault(); };
  document.addEventListener('gesturestart', stopp, { passive: false });
  document.addEventListener('gesturechange', stopp, { passive: false });
  document.addEventListener('touchmove', function (e) { if (e.touches && e.touches.length > 1) e.preventDefault(); }, { passive: false });
  // Doppeltipp-Zoom ist über touch-action:manipulation aus, ohne schnelle Doppelklicks auf Knöpfe zu schlucken

  // Seitliches Verschieben verhindern: Bereiche, die nach unten scrollen (Seitenleisten, Fenster, Listen), dürfen sich
  // nicht auch zur Seite schieben lassen, nur weil etwas darin ein paar Pixel zu breit ist. Absichtlich seitlich
  // scrollende Teile (Tabellen, Reiter, Karussells) haben eigene Hüllen und bleiben unberührt.
  var s2 = document.createElement('style');
  s2.textContent = 'dialog[open]{overflow-x:hidden}' +
    '@media (max-width:820px){:where(main,aside,section,article,form,.panel,.karte,.box){min-width:0}}';
  (document.head || document.documentElement).appendChild(s2);
  var ABSICHT = /(^|[\s_-])(band|tabs?|reiter|karussell|chips|tabelle|scroll|leiste|filter|tp-|zp-|nv-unten|unten)/i;
  function pruefen() {
    if (window.innerWidth > 820) return;
    var alle = document.querySelectorAll('body *');
    for (var i = 0; i < alle.length; i++) {
      var el = alle[i];
      if (el.__stabilOk || el.scrollWidth <= el.clientWidth + 1) continue;
      var cs = getComputedStyle(el);
      if (cs.overflowX !== 'auto' && cs.overflowX !== 'scroll') continue;
      if (cs.overflowY !== 'auto' && cs.overflowY !== 'scroll') continue; // nur Bereiche, die eigentlich nach unten scrollen
      if (ABSICHT.test(String(el.className)) || el.getAttribute('role') === 'tablist' || el.tagName === 'TABLE') { el.__stabilOk = true; continue; }
      var tab = el.querySelector(':scope > table, :scope > div > table');
      if (tab && tab.scrollWidth > el.clientWidth) { el.__stabilOk = true; continue; }
      el.style.overflowX = 'hidden';
      el.scrollLeft = 0;
    }
  }
  var warten = 0;
  function bald() { clearTimeout(warten); warten = setTimeout(pruefen, 250); }
  if (window.MutationObserver) {
    var start = function () { new MutationObserver(bald).observe(document.body, { childList: true, subtree: true }); bald(); };
    if (document.body) start(); else document.addEventListener('DOMContentLoaded', start);
  }
  window.addEventListener('resize', bald);
  window.addEventListener('orientationchange', bald);
})();

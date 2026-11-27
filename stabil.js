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
})();

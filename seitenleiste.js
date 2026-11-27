/* Seitenleiste: Die Unterpunkte eines Bereichs (z. B. Übersicht, Mitarbeiter, Aufträge) stehen am Computer
   links in einer Leiste, wie in der Buchhaltung. Auf dem Handy bleibt die Leiste unten.
   Die Seiten schreiben ihre Knöpfe weiterhin in <nav id="tabs">; dieses Element wird hier in die Leiste verschoben. */
(function () {
  var BREIT = 232;
  var ICON = {
    uebersicht: '<rect x="3" y="3" width="7" height="7" rx="1.5"/><rect x="14" y="3" width="7" height="7" rx="1.5"/><rect x="3" y="14" width="7" height="7" rx="1.5"/><rect x="14" y="14" width="7" height="7" rx="1.5"/>',
    pruefen: '<circle cx="12" cy="12" r="9"/><path d="m8 12 3 3 5-6"/>',
    ablage: '<path d="M3 7a2 2 0 0 1 2-2h4l2 2h8a2 2 0 0 1 2 2v9a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/>',
    personal: '<circle cx="9" cy="8" r="3.5"/><path d="M2.5 20a6.5 6.5 0 0 1 13 0"/><path d="M16 4.5a3.5 3.5 0 0 1 0 7M18 14.5a6 6 0 0 1 3.5 5.5"/>',
    mitteilungen: '<path d="M4 5h16v11H8l-4 4z"/>',
    antraege: '<rect x="5" y="4" width="14" height="17" rx="2"/><path d="M9 4V3h6v1M9 10h6M9 14h4"/>',
    bewerbungen: '<circle cx="10" cy="8" r="4"/><path d="M3 20a7 7 0 0 1 14 0M19 8v6M16 11h6"/>',
    projekte: '<rect x="3" y="7" width="18" height="13" rx="2"/><path d="M9 7V5h6v2M3 13h18"/>',
    kostenstellen: '<circle cx="12" cy="12" r="9"/><path d="M12 3v9h9"/>',
    rapporte: '<path d="M6 3h9l4 4v14H6z"/><path d="M14 3v5h5M9 13h7M9 17h5"/>',
    journal: '<path d="M6 3h9l4 4v14H6z"/><path d="M14 3v5h5M9 13h7M9 17h5"/>',
    abschluss: '<path d="M12 4v16M6 20h12M4 8h16"/><path d="M4 8l-2.5 6a2.5 2.5 0 0 0 5 0zM20 8l-2.5 6a2.5 2.5 0 0 0 5 0z"/>',
    salden: '<path d="M8 6h13M8 12h13M8 18h13M3 6h.01M3 12h.01M3 18h.01"/>',
    erfolg: '<path d="m3 17 6-6 4 4 8-8"/><path d="M15 7h6v6"/>',
    mwst: '<path d="M19 5 5 19"/><circle cx="7" cy="7" r="2.5"/><circle cx="17" cy="17" r="2.5"/>',
    buchungen: '<path d="M4 6h16M4 12h16M4 18h10"/>',
    fragen: '<circle cx="12" cy="12" r="9"/><path d="M9.5 9.5a2.5 2.5 0 1 1 3.5 2.3c-.6.3-1 .9-1 1.6V14M12 17.5v.01"/>',
    punkt: '<circle cx="12" cy="12" r="3.5"/>'
  };

  function start() {
    var tabs = document.getElementById('tabs');
    if (!tabs || !tabs.closest('.kopfzeile')) return;
    var kopf = tabs.closest('.kopfzeile');

    var css = document.createElement('style');
    css.textContent = [
      '.sl-leiste{display:none}',
      '@media (min-width:821px){',
      ' body.sl-an{padding-left:' + BREIT + 'px}',
      ' body.sl-an .kopfzeile{margin-left:-' + BREIT + 'px}',
      ' body.sl-an .kopfzeile>.wrap{max-width:none;padding-left:28px;padding-right:28px}',
      ' body.sl-an .sl-handy{display:none!important}',
      ' body.sl-an .sl-leiste{display:flex;flex-direction:column;gap:4px;position:fixed;left:0;top:var(--sl-oben,62px);bottom:0;width:' + BREIT + 'px;box-sizing:border-box;padding:18px 14px;overflow-y:auto;z-index:15;background:var(--flaeche,#EAF3EE);border-right:1px solid var(--linie,rgba(11,59,46,.1))}',
      ' .sl-leiste .tabs{display:flex!important;flex-direction:column;gap:4px;margin:0!important}',
      ' .sl-leiste .tabs button{display:flex;align-items:center;gap:11px;width:100%;justify-content:flex-start;text-align:left;border:0;background:none;padding:10px 12px;border-radius:10px;font-size:15px;font-weight:500;color:var(--text);box-shadow:none;cursor:pointer}',
      ' .sl-leiste .tabs button:hover{background:rgba(11,59,46,.06)}',
      ' .sl-leiste .tabs button.an{background:var(--karte,#fff);color:var(--blau,#0B3B2E);font-weight:600;box-shadow:var(--schatten,0 6px 18px -10px rgba(11,59,46,.35))}',
      ' .sl-leiste .tabs button svg{width:19px;height:19px;flex:none;margin:0;stroke:currentColor;fill:none;stroke-width:1.7;stroke-linecap:round;stroke-linejoin:round}',
      ' .sl-leiste .tabs button .marke-s{margin-left:auto!important}',
      '}',
      '@media print{body.sl-an{padding-left:0}.sl-leiste{display:none!important}}'
    ].join('\n');
    document.head.appendChild(css);

    var leiste = document.createElement('aside');
    leiste.className = 'sl-leiste';
    leiste.setAttribute('aria-label', 'Bereiche');
    // Platzhalter an der alten Stelle: schiebt Suche und Menü weiterhin nach rechts
    var platz = document.createElement('span');
    platz.className = 'sl-platz'; platz.style.marginLeft = 'auto';
    tabs.parentNode.insertBefore(platz, tabs);
    leiste.appendChild(tabs);
    document.body.appendChild(leiste);

    function icons() {
      Array.prototype.forEach.call(tabs.querySelectorAll('button'), function (b) {
        if (b.querySelector('svg')) return;
        var id = b.dataset.tab || b.dataset.ansicht || '';
        var unten = id && document.querySelector('#untenNav [data-tab="' + id + '"] svg');
        var svg;
        if (unten) svg = unten.cloneNode(true);
        else {
          svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
          svg.setAttribute('viewBox', '0 0 24 24');
          svg.innerHTML = ICON[id] || ICON.punkt;
        }
        svg.setAttribute('aria-hidden', 'true');
        b.insertBefore(svg, b.firstChild);
      });
    }
    function anpassen() {
      icons();
      document.body.classList.toggle('sl-an', tabs.querySelectorAll('button').length > 1);
      document.documentElement.style.setProperty('--sl-oben', Math.round(kopf.getBoundingClientRect().height) + 'px');
    }
    new MutationObserver(anpassen).observe(tabs, { childList: true });
    window.addEventListener('resize', anpassen);
    anpassen();
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', start); else start();
})();

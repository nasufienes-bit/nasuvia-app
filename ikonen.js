/* Ordasio – schlichte Linien-Symbole statt bunter Emojis.
   Ersetzt in der ganzen Oberfläche jedes Emoji durch ein einfarbiges Symbol (Farbe = Textfarbe),
   auch in Inhalten, die später erscheinen (Dialoge, Ordi, Hinweise). In Auswahllisten werden Emojis entfernt. */
(function () {
  'use strict';
  if (window.OrdasioIkonen) return;
  const P = {
    check: '<path d="M20 6 9 17l-5-5"/>',
    pin: '<path d="M12 21s-7-6.1-7-11a7 7 0 0 1 14 0c0 4.9-7 11-7 11z"/><circle cx="12" cy="10" r="2.5"/>',
    beleg: '<path d="M6 3h12v18l-3-2-3 2-3-2-3 2z"/><path d="M9 8h6M9 12h6"/>',
    warn: '<path d="M12 3 2 20h20z"/><path d="M12 9v5M12 17h.01"/>',
    mail: '<rect x="3" y="5" width="18" height="14" rx="2"/><path d="m3 7 9 6 9-6"/>',
    clip: '<path d="M21 11.5 12.5 20a5 5 0 0 1-7-7L14 4.5a3.3 3.3 0 0 1 4.7 4.7L10.2 17.7a1.7 1.7 0 0 1-2.4-2.4L15.5 7.6"/>',
    chat: '<path d="M21 12a8 8 0 0 1-11.6 7.1L4 20l1-4.6A8 8 0 1 1 21 12z"/>',
    ordner: '<path d="M3 7a2 2 0 0 1 2-2h4l2 2h8a2 2 0 0 1 2 2v9a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/>',
    person: '<circle cx="12" cy="8" r="4"/><path d="M4 21a8 8 0 0 1 16 0"/>',
    kalender: '<rect x="3" y="5" width="18" height="16" rx="2"/><path d="M3 10h18M8 3v4M16 3v4"/>',
    funken: '<path d="M12 3v4M12 17v4M3 12h4M17 12h4M6 6l2.5 2.5M15.5 15.5 18 18M6 18l2.5-2.5M15.5 8.5 18 6"/>',
    idee: '<path d="M9 18h6M10 21h4"/><path d="M12 3a6 6 0 0 0-3.5 10.9c.6.5 1 1.2 1 2.1h5c0-.9.4-1.6 1-2.1A6 6 0 0 0 12 3z"/>',
    stift: '<path d="M4 20h4L19 9l-4-4L4 16z"/><path d="m13.5 6.5 4 4"/>',
    kamera: '<path d="M4 8h3l2-3h6l2 3h3v11H4z"/><circle cx="12" cy="13" r="3.5"/>',
    sonne: '<circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M2 12h2M20 12h2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4"/>',
    team: '<circle cx="9" cy="8" r="3.2"/><path d="M3 20a6 6 0 0 1 12 0"/><circle cx="17" cy="9" r="2.5"/><path d="M15.5 14.2A5 5 0 0 1 21 19"/>',
    pokal: '<path d="M8 4h8v5a4 4 0 0 1-8 0z"/><path d="M8 6H5a3 3 0 0 0 3 4M16 6h3a3 3 0 0 1-3 4M12 13v4M8 21h8M9 17h6"/>',
    uhr: '<circle cx="12" cy="13" r="8"/><path d="M12 9v4l2.5 2M9 2h6"/>',
    koffer: '<rect x="3" y="7" width="18" height="13" rx="2"/><path d="M9 7V5a2 2 0 0 1 2-2h2a2 2 0 0 1 2 2v2M3 12h18"/>',
    dokument: '<path d="M6 3h9l4 4v14H6z"/><path d="M14 3v5h5M9 13h7M9 17h5"/>',
    kurve: '<path d="M3 17l6-6 4 4 8-8"/><path d="M15 7h6v6"/>',
    balken: '<path d="M4 20V10M10 20V4M16 20v-7M22 20H2"/>',
    ziel: '<circle cx="12" cy="12" r="9"/><circle cx="12" cy="12" r="5"/><circle cx="12" cy="12" r="1"/>',
    megafon: '<path d="M3 10v4l11 5V5z"/><path d="M14 8a4 4 0 0 1 0 8M6 14l1 5h3"/>',
    hand: '<path d="M7 11V6a1.5 1.5 0 0 1 3 0v5M10 10V4.5a1.5 1.5 0 0 1 3 0V10M13 10V5.5a1.5 1.5 0 0 1 3 0V12M16 12V8.5a1.5 1.5 0 0 1 3 0V14a7 7 0 0 1-7 7h-1a6 6 0 0 1-5-2.7L4 14.5a1.6 1.6 0 0 1 2.7-1.7L7 13"/>',
    schere: '<circle cx="6" cy="6" r="3"/><circle cx="6" cy="18" r="3"/><path d="M8.1 8.1 20 20M8.1 15.9 20 4"/>',
    haus: '<path d="M3 11 12 4l9 7"/><path d="M5 10v10h14V10"/><path d="M10 20v-5h4v5"/>',
    buch: '<path d="M4 5a2 2 0 0 1 2-2h13v16H6a2 2 0 0 0-2 2z"/><path d="M4 19a2 2 0 0 1 2-2h13"/>',
    geschenk: '<rect x="3" y="8" width="18" height="5" rx="1"/><path d="M5 13v8h14v-8M12 8v13M12 8S10 3 7.5 4.5 9 8 12 8zM12 8s2-5 4.5-3.5S15 8 12 8z"/>',
    bank: '<path d="M3 10 12 4l9 6"/><path d="M5 10v8M9.5 10v8M14.5 10v8M19 10v8M3 21h18"/>',
    zahnrad: '<circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.7 1.7 0 0 0 .3 1.8l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.7 1.7 0 0 0-2.8 1.2V21a2 2 0 1 1-4 0v-.1a1.7 1.7 0 0 0-2.8-1.2l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1A1.7 1.7 0 0 0 3.1 14H3a2 2 0 1 1 0-4h.1a1.7 1.7 0 0 0 1.2-2.8l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1A1.7 1.7 0 0 0 10 3.1V3a2 2 0 1 1 4 0v.1a1.7 1.7 0 0 0 2.8 1.2l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1A1.7 1.7 0 0 0 20.9 10H21a2 2 0 1 1 0 4h-.1a1.7 1.7 0 0 0-1.5 1z"/>',
    paket: '<path d="M3 8 12 3l9 5v8l-9 5-9-5z"/><path d="M3 8l9 5 9-5M12 13v8"/>',
    auto: '<path d="M3 16v-4l2-5h14l2 5v4"/><path d="M3 12h18"/><circle cx="7" cy="16" r="2"/><circle cx="17" cy="16" r="2"/>',
    schild: '<path d="M12 3 4 6v6c0 5 3.5 8 8 9 4.5-1 8-4 8-9V6z"/>',
    schloss: '<rect x="5" y="11" width="14" height="10" rx="2"/><path d="M8 11V8a4 4 0 0 1 8 0v3"/>',
    schluessel: '<circle cx="8" cy="15" r="4"/><path d="m11 12 9-9M17 6l3 3M15 8l2 2"/>',
    herz: '<path d="M12 20s-8-4.7-8-10.5A4.5 4.5 0 0 1 12 7a4.5 4.5 0 0 1 8 2.5C20 15.3 12 20 12 20z"/>',
    link: '<path d="M10 14a4 4 0 0 0 5.7 0l3-3a4 4 0 0 0-5.7-5.7l-1 1"/><path d="M14 10a4 4 0 0 0-5.7 0l-3 3a4 4 0 0 0 5.7 5.7l1-1"/>',
    glocke: '<path d="M6 8a6 6 0 0 1 12 0c0 7 3 8 3 8H3s3-1 3-8"/><path d="M10.3 20a1.9 1.9 0 0 0 3.4 0"/>',
    geld: '<rect x="2" y="6" width="20" height="12" rx="2"/><circle cx="12" cy="12" r="2.5"/><path d="M6 12h.01M18 12h.01"/>',
    karte: '<rect x="2" y="5" width="20" height="14" rx="2"/><path d="M2 10h20M6 15h4"/>',
    stern: '<path d="m12 3 2.7 5.6 6.1.9-4.4 4.3 1 6.1L12 17l-5.4 2.9 1-6.1L3.2 9.5l6.1-.9z"/>',
    palette: '<path d="M12 3a9 9 0 0 0 0 18c1.2 0 2-.8 2-1.8 0-1.4-1.6-1.6-1.6-3 0-1 .8-1.7 1.8-1.7H17a4 4 0 0 0 4-4C21 6.6 17 3 12 3z"/><circle cx="7.5" cy="11" r="1"/><circle cx="10" cy="7.5" r="1"/><circle cx="15" cy="7.5" r="1"/>',
    bild: '<rect x="3" y="4" width="18" height="16" rx="2"/><circle cx="9" cy="10" r="2"/><path d="m21 16-5-5-9 9"/>',
    drucker: '<path d="M6 9V3h12v6"/><rect x="3" y="9" width="18" height="8" rx="2"/><path d="M6 14h12v7H6z"/>',
    puls: '<path d="M3 12h4l3-7 4 14 3-7h4"/>',
    etikett: '<path d="M3 12V4h8l10 10-8 8z"/><circle cx="7.5" cy="7.5" r="1.3"/>',
    waage: '<path d="M12 4v17M7 21h10M5 7h14"/><path d="m5 7-3 7a3 3 0 0 0 6 0zM19 7l-3 7a3 3 0 0 0 6 0z"/>',
    telefon: '<path d="M5 4h4l2 5-2.5 1.5a11 11 0 0 0 5 5L15 13l5 2v4a2 2 0 0 1-2 2A16 16 0 0 1 3 6a2 2 0 0 1 2-2"/>',
    handy: '<rect x="7" y="2" width="10" height="20" rx="2"/><path d="M11 18h2"/>',
    pfeil: '<path d="M5 12h14M13 6l6 6-6 6"/>',
    plus: '<path d="M12 5v14M5 12h14"/>',
    puzzle: '<path d="M9 3h6v3a2 2 0 1 0 4 0h2v6h-3a2 2 0 1 0 0 4h3v5H3v-5h3a2 2 0 1 0 0-4H3V6h6z"/>',
    auge: '<path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7S2 12 2 12z"/><circle cx="12" cy="12" r="3"/>',
    wieder: '<path d="M4 12a8 8 0 0 1 14-5.3L20 9M20 4v5h-5"/><path d="M20 12a8 8 0 0 1-14 5.3L4 15M4 20v-5h5"/>',
    rechner: '<rect x="5" y="3" width="14" height="18" rx="2"/><path d="M8 7h8M8 12h.01M12 12h.01M16 12h.01M8 16h.01M12 16h.01M16 16h.01"/>',
    kompass: '<circle cx="12" cy="12" r="9"/><path d="m15.5 8.5-2 5-5 2 2-5z"/>',
    werkzeug: '<path d="M14.7 6.3a4 4 0 0 0-5.4 5.4L3 18l3 3 6.3-6.3a4 4 0 0 0 5.4-5.4l-2.6 2.6-2.4-.6-.6-2.4z"/>',
    blatt: '<path d="M5 19c0-8 6-14 15-14 0 9-6 15-14 15"/><path d="M5 19 13 11"/>',
    besteck: '<path d="M7 3v8a2 2 0 0 0 2 2v8M11 3v6M7 3v6M17 3c-2 2-2 6 0 9v9"/>',
    tasche: '<path d="M5 7h14l-1 14H6z"/><path d="M9 7a3 3 0 0 1 6 0"/>',
    rakete: '<path d="M12 15c-3-3-3-8 0-12 3 4 3 9 0 12z"/><path d="M9 12 5 14l1 4 3-2M15 12l4 2-1 4-3-2M12 15v6"/>',
    laecheln: '<circle cx="12" cy="12" r="9"/><path d="M8.5 14a4 4 0 0 0 7 0M9 9.5h.01M15 9.5h.01"/>',
    globus: '<circle cx="12" cy="12" r="9"/><path d="M3 12h18M12 3a14 14 0 0 1 0 18M12 3a14 14 0 0 0 0 18"/>',
    daumen: '<path d="M7 11v10H3V11zM7 11l4-8a2 2 0 0 1 2 2v4h6a2 2 0 0 1 2 2.3l-1.4 7A2 2 0 0 1 17.6 21H7"/>',
    gebaeude: '<rect x="5" y="3" width="14" height="18" rx="1"/><path d="M9 7h.01M15 7h.01M9 11h.01M15 11h.01M9 15h.01M15 15h.01M10 21v-3h4v3"/>',
    lineal: '<path d="m3 17 14-14 4 4L7 21z"/><path d="m7 13 2 2M10 10l2 2M13 7l2 2"/>',
    kreis: '<circle cx="12" cy="12" r="3"/>',
  };
  const MAP = {
    '✅': 'check', '✔': 'check', '📍': 'pin', '📌': 'pin', '🧾': 'beleg', '⚠': 'warn', '❗': 'warn', '❕': 'warn', '✉': 'mail', '📧': 'mail', '📨': 'mail', '📎': 'clip', '💬': 'chat',
    '📁': 'ordner', '📂': 'ordner', '🗂': 'ordner', '👤': 'person', '🧑': 'person', '👩': 'person', '👨': 'person', '🧑‍💼': 'person', '👥': 'team', '🗓': 'kalender', '📅': 'kalender', '📆': 'kalender',
    '✨': 'funken', '💡': 'idee', '📝': 'stift', '✍': 'stift', '✏': 'stift', '📷': 'kamera', '📸': 'kamera', '🏖': 'sonne', '🏝': 'sonne', '☀': 'sonne', '🌞': 'sonne', '🤝': 'team',
    '🎉': 'pokal', '🏆': 'pokal', '🥇': 'pokal', '⏰': 'uhr', '⏱': 'uhr', '⏳': 'uhr', '⌛': 'uhr', '🕘': 'uhr', '🕐': 'uhr', '💼': 'koffer', '📄': 'dokument', '📋': 'dokument', '📃': 'dokument', '🗒': 'dokument',
    '📈': 'kurve', '📉': 'kurve', '📊': 'balken', '🎯': 'ziel', '📣': 'megafon', '📢': 'megafon', '✂': 'schere', '🏠': 'haus', '🏡': 'haus', '🎓': 'buch', '📚': 'buch', '📘': 'buch', '📖': 'buch',
    '🎁': 'geschenk', '🏦': 'bank', '🏛': 'bank', '⚙': 'zahnrad', '🔧': 'werkzeug', '📦': 'paket', '🚗': 'auto', '🚚': 'auto', '🚐': 'auto', '🚲': 'auto', '✈': 'auto', '🛡': 'schild', '🔐': 'schloss', '🔒': 'schloss',
    '🔑': 'schluessel', '💚': 'herz', '❤': 'herz', '💍': 'herz', '🔗': 'link', '🔔': 'glocke', '💸': 'geld', '💰': 'geld', '💵': 'geld', '🪙': 'geld', '💳': 'karte', '⭐': 'stern', '🌟': 'stern',
    '🎨': 'palette', '🖼': 'bild', '🖨': 'drucker', '🩺': 'puls', '🏷': 'etikett', '⚖': 'waage', '📞': 'telefon', '☎': 'telefon', '📱': 'handy', '📲': 'handy', '➡': 'pfeil', '➕': 'plus', '🧩': 'puzzle',
    '👀': 'auge', '🔁': 'wieder', '🔄': 'wieder', '🧮': 'rechner', '🧭': 'kompass', '🔨': 'werkzeug', '🧰': 'werkzeug', '🛠': 'werkzeug', '🌿': 'blatt', '🌱': 'blatt', '🍽': 'besteck', '🛍': 'tasche', '🛒': 'tasche',
    '🚀': 'rakete', '😊': 'laecheln', '🙂': 'laecheln', '😀': 'laecheln', '🌐': 'globus', '👍': 'daumen', '🏢': 'gebaeude', '🏪': 'gebaeude', '📐': 'lineal', '⏲': 'uhr', '🖥': 'handy', '💻': 'handy', '🔍': 'auge', '🔎': 'auge',
  };
  // Typografische Zeichen bleiben (sind ohnehin einfarbig)
  const BLEIBT = new Set(['✓', '✕', '★', '↗', '↶', '↷', '↺', '↻', '⌘', '⏎', '☐', '→', '←', '↑', '↓', '↔', '›', '‹', '©', '®', '™', '·', '•']);
  const RE = /(?:\p{Extended_Pictographic}|[☀-➿])(?:️|‍(?:\p{Extended_Pictographic}|[☀-➿])️?)*/gu;
  const svg = (n) => `<svg class="oi" viewBox="0 0 24 24" aria-hidden="true" focusable="false">${P[n] || P.kreis}</svg>`;
  const stil = document.createElement('style');
  stil.textContent = '.oi{width:1.05em;height:1.05em;display:inline-block;vertical-align:-0.16em;fill:none;stroke:currentColor;stroke-width:1.8;stroke-linecap:round;stroke-linejoin:round;flex-shrink:0}';
  (document.head || document.documentElement).appendChild(stil);
  const AUS = 'SCRIPT,STYLE,TEXTAREA,INPUT,TITLE,NOSCRIPT,CODE,PRE,SVG';
  const name = (e) => { const k = e.replace(/️/g, ''); return MAP[k] || MAP[k.split('‍')[0]] || null; };
  function knoten(t) {
    const s = t.nodeValue; if (!s || !RE.test(s)) { RE.lastIndex = 0; return; }
    RE.lastIndex = 0;
    const el = t.parentElement; if (!el || el.closest(AUS) || el.closest('[contenteditable],[data-keine-ikonen]')) return;
    if (el.closest('option,optgroup,select')) { const neu = s.replace(RE, (m) => (BLEIBT.has(m.replace(/️/g, '')) ? m : '')).replace(/\s{2,}/g, ' ').replace(/^\s+/, ''); if (neu !== s) t.nodeValue = neu; return; }
    let html = '', pos = 0, geaendert = false, m;
    const esc = (x) => x.replace(/[&<>]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;' }[c]));
    while ((m = RE.exec(s))) {
      const roh = m[0].replace(/️/g, '');
      if (BLEIBT.has(roh)) continue;
      html += esc(s.slice(pos, m.index)) + (name(m[0]) ? svg(name(m[0])) : '');
      pos = m.index + m[0].length; geaendert = true;
    }
    if (!geaendert) return;
    html += esc(s.slice(pos));
    const span = document.createElement('span'); span.className = 'oi-text'; span.innerHTML = html;
    const frag = document.createDocumentFragment(); while (span.firstChild) frag.appendChild(span.firstChild);
    t.parentNode.replaceChild(frag, t);
  }
  function durch(wurzel) {
    if (!wurzel) return;
    if (wurzel.nodeType === 3) { knoten(wurzel); return; }
    if (wurzel.nodeType !== 1 || wurzel.matches(AUS)) return;
    const w = document.createTreeWalker(wurzel, NodeFilter.SHOW_TEXT), liste = [];
    while (w.nextNode()) liste.push(w.currentNode);
    liste.forEach(knoten);
    // auch title/aria-label/placeholder ohne Emojis
    if (wurzel.querySelectorAll) wurzel.querySelectorAll('[title],[aria-label],[placeholder]').forEach((e) => ['title', 'aria-label', 'placeholder'].forEach((a) => { const v = e.getAttribute(a); if (v && RE.test(v)) { RE.lastIndex = 0; e.setAttribute(a, v.replace(RE, (x) => (BLEIBT.has(x.replace(/️/g, '')) ? x : '')).trim()); } RE.lastIndex = 0; }));
  }
  let ruht = false;
  const beobachter = new MutationObserver((ms) => {
    if (ruht) return; ruht = true;
    try { for (const m of ms) { if (m.type === 'characterData') knoten(m.target); else m.addedNodes.forEach(durch); } } finally { ruht = false; }
  });
  function start() {
    durch(document.body);
    if (RE.test(document.title)) { RE.lastIndex = 0; document.title = document.title.replace(RE, '').trim(); }
    RE.lastIndex = 0;
    beobachter.observe(document.body, { childList: true, subtree: true, characterData: true });
  }
  if (document.body) start(); else document.addEventListener('DOMContentLoaded', start);
  window.OrdasioIkonen = { svg, P, durch };
})();

/* Ordasio – Postfach öffnen: passende Knöpfe nach der Registrierung (Gmail, iCloud, Outlook, Bluewin …).
   OrdasioPostfach.knoepfe(email) liefert HTML mit Links; Klassen kommen von der Seite (Standard: lz-knopf). */
(function () {
  'use strict';
  var ANBIETER = [
    { re: /^(gmail|googlemail)\./, name: 'Gmail', web: 'https://mail.google.com/mail/u/0/#search/from%3Aordasio.ch', ios: 'googlegmail://' },
    { re: /^(icloud|me|mac)\./, name: 'iCloud Mail', web: 'https://www.icloud.com/mail' },
    { re: /^(outlook|hotmail|live|msn)\./, name: 'Outlook', web: 'https://outlook.live.com/mail/0/', ios: 'ms-outlook://' },
    { re: /^bluewin\./, name: 'Bluewin', web: 'https://www.bluewin.ch/de/email/' },
    { re: /^gmx\./, name: 'GMX', web: 'https://www.gmx.ch/' },
    { re: /^(web\.de)$/, name: 'WEB.DE', web: 'https://web.de/' },
    { re: /^yahoo\./, name: 'Yahoo Mail', web: 'https://mail.yahoo.com/' },
    { re: /^(proton|protonmail|pm)\./, name: 'Proton Mail', web: 'https://mail.proton.me/' },
    { re: /^(sunrise|hispeed)\./, name: 'Sunrise Mail', web: 'https://www.sunrise.ch/de/webmail' },
  ];
  var esc = function (s) { return String(s == null ? '' : s).replace(/[&<>"]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]; }); };
  var ua = navigator.userAgent || '';
  var istIOS = /iPhone|iPad|iPod/.test(ua) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
  var istAndroid = /Android/.test(ua);
  function anbieter(email) {
    var d = String(email || '').split('@')[1] || '';
    d = d.toLowerCase();
    for (var i = 0; i < ANBIETER.length; i++) if (ANBIETER[i].re.test(d)) return ANBIETER[i];
    return null;
  }
  function knoepfe(email, opt) {
    opt = opt || {};
    var k1 = opt.haupt || 'lz-knopf', k2 = opt.zweit || 'lz-knopf zweit';
    var a = anbieter(email), html = [];
    var ziel = ' target="_blank" rel="noopener"';
    if (istIOS) {
      if (a && a.name === 'iCloud Mail') html.push('<a class="' + k1 + '" href="message://">Mail-App öffnen</a>');
      else if (a && a.ios) html.push('<a class="' + k1 + '" href="' + a.ios + '">' + esc(a.name) + '-App öffnen</a>', '<a class="' + k2 + '" href="message://">Apple Mail öffnen</a>');
      else html.push('<a class="' + k1 + '" href="message://">Mail-App öffnen</a>');
      if (a) html.push('<a class="' + k2 + '" href="' + a.web + '"' + ziel + '>' + esc(a.name) + ' im Browser</a>');
    } else if (istAndroid) {
      if (a && a.name === 'Gmail') html.push('<a class="' + k1 + '" href="intent://#Intent;package=com.google.android.gm;action=android.intent.action.MAIN;category=android.intent.category.LAUNCHER;end">Gmail-App öffnen</a>');
      html.push('<a class="' + (html.length ? k2 : k1) + '" href="intent://#Intent;action=android.intent.action.MAIN;category=android.intent.category.APP_EMAIL;end">E-Mail-App öffnen</a>');
      if (a) html.push('<a class="' + k2 + '" href="' + a.web + '"' + ziel + '>' + esc(a.name) + ' im Browser</a>');
    } else {
      if (a) html.push('<a class="' + k1 + '" href="' + a.web + '"' + ziel + '>' + esc(a.name) + ' öffnen</a>');

    }
    return html.join('');
  }
  window.OrdasioPostfach = { anbieter: anbieter, knoepfe: knoepfe, istIOS: istIOS, istAndroid: istAndroid };
})();

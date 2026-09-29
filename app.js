(function () {
  'use strict';

  /* ---------- Konfiguration & Supabase ---------- */
  var cfg = window.APP_CONFIG || {};
  var configured = !!(cfg.SUPABASE_URL && cfg.SUPABASE_ANON_KEY && cfg.SUPABASE_URL.indexOf('DEIN-PROJEKT') === -1);
  var sb = configured && window.supabase ? window.supabase.createClient(cfg.SUPABASE_URL, cfg.SUPABASE_ANON_KEY) : null;

  /* ---------- Hilfsfunktionen ---------- */
  var esc = function (s) {
    return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
    });
  };
  var pad = function (n) { return String(n).padStart(2, '0'); };
  var iso = function (d) { return d.getFullYear() + '-' + pad(d.getMonth() + 1) + '-' + pad(d.getDate()); };
  var parseIso = function (s) { var p = s.split('-').map(Number); return new Date(p[0], p[1] - 1, p[2]); };
  var hhmm = function (t) { return String(t || '').slice(0, 5); };
  var fmt = function (d, o) { return d.toLocaleDateString('de-CH', o); };
  var WEEKDAYS = [
    { v: 1, n: 'Montag' }, { v: 2, n: 'Dienstag' }, { v: 3, n: 'Mittwoch' },
    { v: 4, n: 'Donnerstag' }, { v: 5, n: 'Freitag' }, { v: 6, n: 'Samstag' }, { v: 0, n: 'Sonntag' }
  ];
  var wdName = function (v) { return WEEKDAYS.filter(function (w) { return w.v === v; })[0].n; };

  // Akzeptiert 079 123 45 67, +41 79 123 45 67, 0041 79 …; Leerschläge werden ignoriert.
  // Intern gespeichert wird immer das internationale Format (+41791234567).
  function normPhone(raw) {
    var d = String(raw).replace(/\(0\)/g, '').replace(/[^\d+]/g, '');
    if (d.indexOf('00') === 0) d = '+' + d.slice(2);
    else if (d.indexOf('0') === 0) d = '+41' + d.slice(1);
    else if (d.indexOf('+') !== 0) d = '+' + d;
    return /^\+\d{9,15}$/.test(d) ? d : null;
  }
  // Anzeige: Schweizer Nummern immer als 079 123 45 67
  function fmtPhone(p) {
    if (/^\+41\d{9}$/.test(p)) return '0' + p.slice(3, 5) + ' ' + p.slice(5, 8) + ' ' + p.slice(8, 10) + ' ' + p.slice(10);
    return p;
  }
  // Formatierung während der Eingabe im Feld
  function formatPhoneTyping(raw) {
    var v = String(raw).replace(/\(0\)/g, '').replace(/[^\d+]/g, '');
    if (v.indexOf('+41') === 0) v = '0' + v.slice(3);
    else if (v.indexOf('0041') === 0) v = '0' + v.slice(4);
    if (v.charAt(0) === '0' && v.charAt(1) !== '0') {
      var d = v.replace(/\D/g, '').slice(0, 10);
      return [d.slice(0, 3), d.slice(3, 6), d.slice(6, 8), d.slice(8, 10)].filter(Boolean).join(' ');
    }
    return v;
  }
  function defaultPin(p) { return String(p).replace(/\D/g, '').slice(-6); }
  function phoneToEmail(p) { return p.replace('+', '') + '@' + (cfg.EMAIL_DOMAIN || 'phone-login.app'); }

  /* ---------- Zustand ---------- */
  function freshState() {
    return {
      step: 'loading', mode: 'login', tab: 'trainings', phone: '', err: '', info: '',
      session: null, me: null, members: [],
      rules: [], extras: [], overrides: {}, cancelled: {}, events: [],
      tr: {}, ev: {}, open: {}, edit: null, busy: false, sec: {}, add: {}, showMore: false
    };
  }
  var S = freshState();
  var installPrompt = null;

  /* ---------- Daten laden ---------- */
  async function loadAll() {
    var tables = ['profiles', 'training_rules', 'training_extras', 'training_overrides', 'training_cancellations', 'events', 'training_responses', 'event_responses'];
    var res = await Promise.all(tables.map(function (t) { return sb.from(t).select('*'); }));
    var bad = res.filter(function (r) { return r.error; })[0];
    if (bad) throw bad.error;
    var d = res.map(function (r) { return r.data || []; });

    S.members = d[0].map(function (r) { return { id: r.id, name: r.name, phone: r.phone, isAdmin: r.is_admin }; })
      .sort(function (a, b) { return a.name.localeCompare(b.name, 'de'); });
    S.rules = d[1].map(function (r) { return { id: r.id, wd: r.weekday, time: hhmm(r.start_time), place: r.place }; })
      .sort(function (a, b) { return ((a.wd + 6) % 7) - ((b.wd + 6) % 7) || (a.time < b.time ? -1 : 1); });
    S.extras = d[2].map(function (r) { return { id: r.id, title: r.title, date: r.event_date, time: hhmm(r.start_time), place: r.place }; });
    S.overrides = {};
    d[3].forEach(function (r) { S.overrides[r.training_key] = { date: r.new_date, time: hhmm(r.new_time), place: r.new_place }; });
    S.cancelled = {};
    d[4].forEach(function (r) { S.cancelled[r.training_key] = true; });
    S.events = d[5].map(function (r) { return { id: r.id, title: r.title, date: r.event_date, time: hhmm(r.start_time), place: r.place, cancelled: r.cancelled }; });
    S.tr = {};
    d[6].forEach(function (r) { (S.tr[r.training_key] = S.tr[r.training_key] || {})[r.user_id] = r.status; });
    S.ev = {};
    d[7].forEach(function (r) { (S.ev[r.event_id] = S.ev[r.event_id] || {})[r.user_id] = r.status; });
    if (S.session) S.me = S.members.filter(function (m) { return m.id === S.session.user.id; })[0] || null;
  }

  /* ---------- Trainings berechnen ---------- */
  function prefix() { return cfg.CLUB_SHORT || 'FBRO'; }

  // Alle künftigen Termine: Serien-Termine für die nächsten 12 Monate, Spezial-Trainings ohne Zeitgrenze
  function getTrainings() {
    var now = new Date();
    var today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    var todayIso = iso(today);
    var nowT = pad(now.getHours()) + ':' + pad(now.getMinutes());
    var months = cfg.TRAININGS_HORIZON_MONTHS || 12;
    var last = new Date(today.getFullYear(), today.getMonth() + months + 1, 0);
    var span = Math.round((last - today) / 864e5);
    var list = [];
    var add = function (t) {
      var ov = S.overrides[t.key];
      if (ov) { t.iso = ov.date; t.time = ov.time; t.place = ov.place; t.changed = true; }
      t.date = parseIso(t.iso);
      if (t.iso < todayIso) return;                       // vergangene Termine ausblenden
      if (t.iso === todayIso && t.time < nowT) return;    // heute bereits begonnene ebenfalls
      list.push(t);
    };
    for (var i = 0; i <= span; i++) {
      var d = new Date(today); d.setDate(today.getDate() + i);
      var di = iso(d);
      S.rules.forEach(function (r) {
        if (r.wd === d.getDay()) add({ key: di + '#' + r.id, iso: di, time: r.time, place: r.place, title: 'Training', ruleId: r.id });
      });
    }
    S.extras.forEach(function (x) {
      add({ key: 'x#' + x.id, iso: x.date, time: x.time, place: x.place, title: x.title, extraId: x.id });
    });
    list.sort(function (a, b) { return (a.iso + a.time) < (b.iso + b.time) ? -1 : 1; });
    return list;
  }

  function getEvents() {
    var now = new Date();
    var todayIso = iso(now);
    var nowT = pad(now.getHours()) + ':' + pad(now.getMinutes());
    return S.events.filter(function (e) { return e.date > todayIso || (e.date === todayIso && e.time >= nowT); })
      .sort(function (a, b) { return (a.date + a.time) < (b.date + b.time) ? -1 : 1; });
  }

  /* ---------- Icons ---------- */
  var ICON = {
    one: '<svg class="ic" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" aria-hidden="true"><circle cx="12" cy="8" r="4"/><path d="M5 21c0-4 3-6 7-6s7 2 7 6"/></svg>',
    two: '<svg class="ic" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" aria-hidden="true"><circle cx="8" cy="8" r="3.5"/><circle cx="17" cy="9" r="3"/><path d="M2 20c0-3.5 2.5-5.5 6-5.5s6 2 6 5.5M15 15c3.5 0 7 1.5 7 5"/></svg>',
    star: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M12 3l2.7 5.6 6.1.9-4.4 4.3 1 6.1L12 17l-5.4 2.9 1-6.1L3.2 9.5l6.1-.9z"/></svg>',
    calplus: '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect x="3" y="5" width="18" height="16" rx="2"/><path d="M3 10h18M8 3v4M16 3v4M12 13v5M9.5 15.5h5"/></svg>',
    cal: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect x="3" y="5" width="18" height="16" rx="2"/><path d="M3 10h18M8 3v4M16 3v4"/></svg>',
    cog: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M4 6h10M18 6h2M4 12h4M12 12h8M4 18h12M20 18h0"/><circle cx="16" cy="6" r="2"/><circle cx="10" cy="12" r="2"/><circle cx="18" cy="18" r="2"/></svg>',
    user: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="12" cy="8" r="4"/><path d="M4 21c0-4 3.6-7 8-7s8 3 8 7"/></svg>',
    check: '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M5 12l5 5 9-10"/></svg>',
    x: '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" aria-hidden="true"><path d="M6 6l12 12M18 6L6 18"/></svg>',
    chev: '<svg class="chev" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M6 9l6 6 6-6"/></svg>'
  };

  /* ---------- Formular-Bausteine ---------- */
  function fld(label, inner) { return '<label class="field"><span>' + label + '</span>' + inner + '</label>'; }
  function grid(a, b) { return '<div class="grid2">' + a + b + '</div>'; }
  function wdOptions(sel) {
    return WEEKDAYS.map(function (w) { return '<option value="' + w.v + '"' + (w.v === sel ? ' selected' : '') + '>' + w.n + '</option>'; }).join('');
  }
  var inTime = function (v) { return '<input class="input" type="time" name="time" value="' + esc(v) + '" required>'; };
  var inPlace = function (v, ph) { return '<input class="input" name="place" value="' + esc(v) + '"' + (ph ? ' placeholder="' + esc(ph) + '"' : '') + ' required>'; };
  var inDate = function (v) { return '<input class="input" type="date" name="date" value="' + esc(v) + '" required>'; };
  var inTitle = function (v, ph) { return '<input class="input" name="title" value="' + esc(v) + '"' + (ph ? ' placeholder="' + esc(ph) + '"' : '') + ' required>'; };
  function editRow(kind, id, body, note, extraBtn) {
    return '<li class="editrow"><form class="editform" data-form="' + kind + '" data-id="' + esc(id) + '">' + body +
      (note ? '<p class="small muted" style="margin:-4px 0 12px">' + note + '</p>' : '') +
      '<div class="editbtns"><button class="btn inline" type="submit">Speichern</button>' +
      '<button class="btn ghost inline" type="button" data-act="edit-cancel">Abbrechen</button>' + (extraBtn || '') +
      '</div></form></li>';
  }

  /* ---------- Kalender-Export (.ics) ---------- */
  function icsText(t) {
    return String(t).replace(/\\/g, '\\\\').replace(/;/g, '\\;').replace(/,/g, '\\,').replace(/\r?\n/g, '\\n');
  }
  function icsLocal(d) {
    return d.getFullYear() + pad(d.getMonth() + 1) + pad(d.getDate()) + 'T' + pad(d.getHours()) + pad(d.getMinutes()) + '00';
  }
  function buildIcs(e) {
    var p = e.date.split('-').map(Number), tm = e.time.split(':').map(Number);
    var start = new Date(p[0], p[1] - 1, p[2], tm[0], tm[1]);
    var end = new Date(start.getTime() + (cfg.EVENT_DURATION_MIN || 120) * 60000);
    var n = new Date();
    var stamp = n.getUTCFullYear() + pad(n.getUTCMonth() + 1) + pad(n.getUTCDate()) + 'T' + pad(n.getUTCHours()) + pad(n.getUTCMinutes()) + pad(n.getUTCSeconds()) + 'Z';
    return [
      'BEGIN:VCALENDAR',
      'VERSION:2.0',
      'PRODID:-//Vereins-Training//DE',
      'CALSCALE:GREGORIAN',
      'METHOD:PUBLISH',
      'BEGIN:VEVENT',
      'UID:' + e.id + '@vereins-training',
      'DTSTAMP:' + stamp,
      'DTSTART:' + icsLocal(start),   // ohne Zeitzone: gilt in der Zeitzone des Handys
      'DTEND:' + icsLocal(end),
      'SUMMARY:' + icsText(e.title),
      'LOCATION:' + icsText(e.place),
      'DESCRIPTION:' + icsText((cfg.CLUB_NAME ? cfg.CLUB_NAME + ': ' : '') + e.title),
      'BEGIN:VALARM',
      'TRIGGER:-PT60M',
      'ACTION:DISPLAY',
      'DESCRIPTION:' + icsText(e.title),
      'END:VALARM',
      'END:VEVENT',
      'END:VCALENDAR'
    ].join('\r\n') + '\r\n';
  }
  async function addToCalendar(e) {
    var name = (e.title.replace(/[^\w\-äöüÄÖÜéèà ]+/g, '').trim().replace(/\s+/g, '-') || 'Event') + '.ics';
    var file = new File([buildIcs(e)], name, { type: 'text/calendar' });
    var isIos = /iphone|ipad|ipod/i.test(navigator.userAgent) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
    // iPhone: über das Teilen-Menü («Zum Kalender hinzufügen»)
    if (isIos && navigator.canShare && navigator.canShare({ files: [file] })) {
      try { await navigator.share({ files: [file], title: e.title }); return; }
      catch (err) { if (err && err.name === 'AbortError') return; /* sonst Download versuchen */ }
    }
    // Android und übrige: Datei laden, das Handy bietet dann «Kalender» zum Öffnen an
    var url = URL.createObjectURL(file);
    var a = document.createElement('a');
    a.href = url; a.download = name;
    document.body.appendChild(a); a.click(); a.remove();
    setTimeout(function () { URL.revokeObjectURL(url); }, 10000);
    toast('Öffne die Datei «' + name + '», um den Termin im Kalender zu speichern.');
  }

  /* ---------- Views ---------- */
  function viewSetup() {
    return '<div class="login"><h1>Einrichtung nötig</h1>' +
      '<p class="lead">Die App ist noch nicht mit Supabase verbunden.</p>' +
      '<ol class="steps"><li>Öffne die Datei <code>config.js</code>.</li>' +
      '<li>Trage <code>SUPABASE_URL</code> und <code>SUPABASE_ANON_KEY</code> aus deinem Supabase-Projekt ein.</li>' +
      '<li>Lade die Seite neu.</li></ol>' +
      '<p class="small muted">Die genaue Anleitung steht in der Datei README.md.</p></div>';
  }

  function viewLogin() {
    var reg = S.mode === 'register';
    var needCode = reg && cfg.CLUB_CODE_REQUIRED !== false;
    return '<div class="login">' +
      '<h1>' + esc(cfg.CLUB_NAME || 'Training') + '<br>Teilnahme</h1>' +
      '<p class="lead">' + (reg ? 'Erstelle dein Konto mit Name, Handynummer und Vereinscode. Dein PIN sind die letzten 6 Ziffern deiner Handynummer.' : 'Melde dich mit deiner Handynummer an.') + '</p>' +
      '<form data-form="auth">' +
      (reg ? fld('Vor- und Nachname', '<input class="input" name="name" autocomplete="name" required>') : '') +
      fld('Handynummer', '<input class="input" name="phone" type="tel" inputmode="tel" autocomplete="tel" placeholder="079 123 45 67" value="' + esc(S.phone) + '" required>') +
      (reg ? '' : fld('PIN (nur nötig, wenn du ihn geändert hast)', '<input class="input pin" name="pin" type="password" inputmode="numeric" pattern="[0-9]{6}" maxlength="6" autocomplete="current-password" placeholder="······">')) +
      (needCode ? fld('Vereinscode', '<input class="input" name="code" autocomplete="off" required>') : '') +
      (S.err ? '<p class="err">' + esc(S.err) + '</p>' : '') +
      '<button class="btn" type="submit"' + (S.busy ? ' disabled' : '') + '>' + (reg ? 'Konto erstellen' : 'Anmelden') + '</button>' +
      '</form>' +
      '<button class="linkbtn" data-act="mode" style="margin-top:12px">' + (reg ? 'Ich habe schon ein Konto' : 'Zum ersten Mal hier? Konto erstellen') + '</button>' +
      '</div>';
  }

  function monthList(items, cardFn) {
    var html = '', last = '';
    items.forEach(function (t) {
      var label = fmt(t.date, { month: 'long', year: 'numeric' });
      if (label !== last) { html += '<div class="week">' + esc(label) + '</div>'; last = label; }
      html += cardFn(t);
    });
    return html;
  }

  function viewTrainings() {
    var list = getTrainings();
    var n = cfg.TRAININGS_VISIBLE || 20;
    var first = list.slice(0, n), rest = list.slice(n);
    var html = '<div class="top"><div><h1>' + esc(prefix()) + '-Trainings</h1><p>Die nächsten ' + n + ' Termine</p></div></div>';
    if (!list.length) {
      return html + '<div class="empty"><p><b>Noch keine Trainings geplant.</b></p><p>' + (S.me.isAdmin ? 'Lege im Bereich «Verwalten» einen Trainingstag fest.' : 'Die Admins legen die Trainingstage fest.') + '</p></div>';
    }
    html += monthList(first, cardHtml);
    if (rest.length) {
      html += '<button class="morebtn" data-act="more-tr" aria-expanded="' + S.showMore + '"><span>Weitere Termine (' + rest.length + ')</span>' + ICON.chev + '</button>';
      if (S.showMore) html += monthList(rest, cardHtml);
    }
    return html;
  }

  function cardHtml(t) {
    var r = S.tr[t.key] || {};
    var off = !!S.cancelled[t.key];
    var yes = [], no = [], open = [];
    S.members.forEach(function (m) { (r[m.id] === 'yes' ? yes : r[m.id] === 'no' ? no : open).push(m); });
    var mine = r[S.me.id];
    var isOpen = !!S.open[t.key];
    return '<article class="card' + (off ? ' cancelled' : '') + '" title="' + esc(t.title + ', ' + t.time + ' Uhr, ' + t.place) + '">' +
      '<div class="row">' + dateBlock(t.date) +
      (off ? '<div class="off">Training abgesagt</div>' :
        '<div class="acts">' +
          '<button class="resp yes" data-act="resp" data-val="yes" data-key="' + esc(t.key) + '" aria-pressed="' + (mine === 'yes') + '">' + ICON.check + 'Dabei</button>' +
          '<button class="resp no" data-act="resp" data-val="no" data-key="' + esc(t.key) + '" aria-pressed="' + (mine === 'no') + '">' + ICON.x + 'Nicht dabei</button>' +
        '</div>' +
        '<button class="count' + (isOpen ? ' is-open' : '') + '" data-act="who" data-key="' + esc(t.key) + '" aria-expanded="' + isOpen + '" aria-label="' + yes.length + ' Teilnehmer, ' + no.length + ' nicht dabei. Teilnehmerliste ' + (isOpen ? 'schliessen' : 'öffnen') + '"><b>' + yes.length + '</b><small>Teilnehmer</small>' + ICON.chev + '</button>') +
      '</div>' +
      (!off && isOpen ? '<div class="who">' +
        '<div><h4>Dabei (' + yes.length + ')</h4><div class="chips">' + chips(yes, false) + '</div></div>' +
        '<div><h4>Nicht dabei (' + no.length + ')</h4><div class="chips">' + chips(no, false) + '</div></div>' +
        '<div><h4>Noch keine Antwort (' + open.length + ')</h4><div class="chips">' + chips(open, false) + '</div></div>' +
      '</div>' : '') +
    '</article>';
  }

  function dateBlock(d) {
    return '<div class="date"><span class="wd">' + esc(fmt(d, { weekday: 'short' }).replace('.', '')) + '</span><span class="dn">' + d.getDate() + '</span><span class="mo">' + esc(fmt(d, { month: 'short' }).replace('.', '')) + '</span></div>';
  }
  function chips(arr, plus) {
    return arr.length ? arr.map(function (m) {
      var me = m.id === S.me.id;
      return '<span class="chip' + (me ? ' me' : '') + '">' + esc(m.name) + (plus ? ' +1' : '') + (me ? ' (du)' : '') + '</span>';
    }).join('') : '<span class="small muted">Niemand</span>';
  }

  function viewEvents() {
    var list = getEvents();
    var html = '<div class="top"><div><h1>' + esc(prefix()) + '-Events</h1><p>Folgende Vereinsanlässe sind geplant</p></div></div>';
    if (!list.length) {
      return html + '<div class="empty"><p><b>Aktuell sind keine Events geplant.</b></p><p>' + (S.me.isAdmin ? 'Lege im Bereich «Verwalten» einen Event an.' : 'Die Admins legen neue Events an.') + '</p></div>';
    }
    html += monthList(list.map(function (e) { return { e: e, date: parseIso(e.date) }; }), function (w) { return eventCardHtml(w.e); });
    return html;
  }

  function eventCardHtml(e) {
    var r = S.ev[e.id] || {};
    var solo = [], duo = [], no = [], open = [];
    S.members.forEach(function (m) {
      (r[m.id] === 'solo' ? solo : r[m.id] === 'duo' ? duo : r[m.id] === 'no' ? no : open).push(m);
    });
    var persons = solo.length + 2 * duo.length;
    var mine = r[S.me.id];
    var isOpen = !!S.open['ev:' + e.id];
    var btn = function (val, cls, icon, label) {
      return '<button class="resp ' + cls + '" data-act="resp-ev" data-val="' + val + '" data-id="' + e.id + '" aria-pressed="' + (mine === val) + '">' + icon + label + '</button>';
    };
    return '<article class="card ev' + (e.cancelled ? ' cancelled' : '') + '">' +
      '<div class="row">' + dateBlock(parseIso(e.date)) +
        '<div class="einfo"><h3><span class="t">' + esc(e.title) + '</span>' + (e.cancelled ? '<span class="tag off">Abgesagt</span>' : '') + '</h3>' +
        '<p class="muted small">' + esc(e.time) + ' Uhr, ' + esc(e.place) + '</p>' +
        (e.cancelled ? '' : '<button class="calbtn" data-act="cal" data-id="' + e.id + '">' + ICON.calplus + 'Im Kalender speichern</button>') + '</div>' +
        (e.cancelled ? '' : '<button class="count' + (isOpen ? ' is-open' : '') + '" data-act="who-ev" data-id="' + e.id + '" aria-expanded="' + isOpen + '" aria-label="' + persons + ' Teilnehmer. Teilnehmerliste ' + (isOpen ? 'schliessen' : 'öffnen') + '"><b>' + persons + '</b><small>Teilnehmer</small>' + ICON.chev + '</button>') +
      '</div>' +
      (e.cancelled ? '' :
        '<div class="acts3">' + btn('solo', 'yes', ICON.one, 'Allein') + btn('duo', 'yes', ICON.two, 'Zu zweit') + btn('no', 'no', '', 'Nicht dabei') + '</div>' +
        (isOpen ? '<div class="who">' +
          '<div><h4>Allein dabei (' + solo.length + ')</h4><div class="chips">' + chips(solo, false) + '</div></div>' +
          '<div><h4>Zu zweit dabei (' + duo.length + ' Mitglieder, ' + (duo.length * 2) + ' Personen)</h4><div class="chips">' + chips(duo, true) + '</div></div>' +
          '<div><h4>Nicht dabei (' + no.length + ')</h4><div class="chips">' + chips(no, false) + '</div></div>' +
          '<div><h4>Noch keine Antwort (' + open.length + ')</h4><div class="chips">' + chips(open, false) + '</div></div>' +
        '</div>' : '')) +
    '</article>';
  }

  function accordion(id, title, count, body, canAdd) {
    var open = !!S.sec[id], adding = !!S.add[id];
    return '<section class="panel acc"><div class="acchead">' +
      '<button class="acctoggle" data-act="sec" data-id="' + id + '" aria-expanded="' + open + '">' +
      '<span class="t">' + title + (count != null ? ' <span class="cnt">(' + count + ')</span>' : '') + '</span>' + ICON.chev + '</button>' +
      (canAdd ? '<button class="plusbtn" data-act="add-toggle" data-id="' + id + '" aria-pressed="' + adding + '" aria-label="' + (adding ? 'Erfassung schliessen' : 'Neu erfassen') + '" title="' + (adding ? 'Erfassung schliessen' : 'Neu erfassen') + '"><span>+</span></button>' : '') +
      '</div>' + (open ? '<div class="accbody">' + body + '</div>' : '') + '</section>';
  }

  // Zeile (oder Bearbeiten-Formular) für einen einzelnen Trainingstermin
  function trRow(t) {
    var off = !!S.cancelled[t.key];
    if (S.edit === 'tr:' + t.key) {
      var body = (t.extraId ? fld('Bezeichnung', inTitle(t.title)) : '') + grid(fld('Datum', inDate(t.iso)), fld('Uhrzeit', inTime(t.time))) + fld('Ort', inPlace(t.place));
      var reset = S.overrides[t.key] ? '<button class="btn ghost inline" type="button" data-act="reset-tr" data-key="' + esc(t.key) + '">Zurücksetzen</button>' : '';
      return editRow('edit-tr', t.key, body, t.extraId ? '' : 'Gilt nur für diesen Termin. Die Antworten der Mitglieder bleiben erhalten.', reset);
    }
    return '<li><div class="l"><b>' + esc(fmt(t.date, { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' })) + ', ' + esc(t.time) + '</b>' +
      '<span>' + esc(t.title) + ', ' + esc(t.place) + (t.changed ? ' · geändert' : '') + (off ? ' · abgesagt' : '') + '</span></div>' +
      '<div class="btnrow"><button class="mini" data-act="edit" data-target="tr:' + esc(t.key) + '">Bearbeiten</button>' +
      '<button class="mini" data-act="cancel" data-key="' + esc(t.key) + '">' + (off ? 'Reaktivieren' : 'Absagen') + '</button>' +
      (t.extraId ? '<button class="mini del" data-act="del-extra" data-id="' + t.extraId + '">Löschen</button>' : '') + '</div></li>';
  }

  function viewAdmin() {
    var all = getTrainings();
    var series = all.filter(function (t) { return !t.extraId; });
    var extras = all.filter(function (t) { return !!t.extraId; });
    var html = '<div class="top"><div><h1>Verwalten</h1><p>Nur für Admins sichtbar</p></div></div>';
    var b;

    /* Montag Trainings */
    b = '<p>Standard-Trainings pro Woche</p>';
    if (S.add.rules) {
      b += '<form class="addform" data-form="rule">' + grid(fld('Wochentag', '<select class="input" name="wd">' + wdOptions(1) + '</select>'), fld('Uhrzeit', inTime('19:00'))) +
        fld('Ort', inPlace('', 'z. B. Turnhalle Schulhaus Nord')) +
        '<button class="btn" type="submit">Trainingstag hinzufügen</button></form>';
    }
    b += S.rules.length ? '<ul class="list">' + S.rules.map(function (r) {
      if (S.edit === 'rule:' + r.id) {
        return editRow('edit-rule', r.id, grid(fld('Wochentag', '<select class="input" name="wd">' + wdOptions(r.wd) + '</select>'), fld('Uhrzeit', inTime(r.time))) + fld('Ort', inPlace(r.place)));
      }
      return '<li><div class="l"><b>' + wdName(r.wd) + ', ' + esc(r.time) + ' Uhr</b><span>' + esc(r.place) + '</span></div>' +
        '<div class="btnrow"><button class="mini" data-act="edit" data-target="rule:' + r.id + '">Bearbeiten</button>' +
        '<button class="mini del" data-act="del-rule" data-id="' + r.id + '">Entfernen</button></div></li>';
    }).join('') + '</ul>' : '<p class="muted">Noch kein fester Trainingstag. Tippe auf «+», um einen zu erfassen.</p>';
    html += accordion('rules', 'Montag Trainings', S.rules.length, b, true);

    /* Weitere Trainings (zusätzliche Termine) */
    b = '<p>Folgende zusätzliche Trainings sind geplant</p>';
    b += extras.length ? '<ul class="list scroll" data-sc="extras">' + extras.map(trRow).join('') + '</ul>' : '<p class="muted">Keine zusätzlichen Trainings geplant.</p>';
    b += '<form class="addbox" data-form="extra">' + fld('Bezeichnung', inTitle('Zusatztraining')) +
      grid(fld('Datum', '<input class="input" type="date" name="date" required>'), fld('Uhrzeit', inTime('18:00'))) +
      fld('Ort', inPlace('', 'z. B. Sportanlage Süd')) +
      '<button class="btn" type="submit">Weiteres Training hinzufügen</button></form>';
    html += accordion('extra', 'Weitere Trainings', extras.length, b);

    /* Kommende Trainings (Termine der Serie) */
    b = series.length ? '<ul class="list scroll" data-sc="upcoming">' + series.map(trRow).join('') + '</ul>' : '<p class="muted">Keine kommenden Trainings.</p>';
    html += accordion('upcoming', 'Kommende Trainings', series.length, b);

    /* Events */
    var evs = getEvents();
    b = '<p>Folgende Vereinsanlässe sind geplant</p>';
    if (S.add.events) {
      b += '<form class="addform" data-form="event">' + fld('Bezeichnung', inTitle('', 'z. B. Fondue-Plausch')) +
        grid(fld('Datum', '<input class="input" type="date" name="date" required>'), fld('Uhrzeit', inTime('18:00'))) +
        fld('Ort', inPlace('', 'z. B. Vereinshaus')) +
        '<button class="btn" type="submit">Event hinzufügen</button></form>';
    }
    b += evs.length ? '<ul class="list scroll" data-sc="events">' + evs.map(function (e) {
      if (S.edit === 'ev:' + e.id) {
        return editRow('edit-ev', e.id, fld('Bezeichnung', inTitle(e.title)) + grid(fld('Datum', inDate(e.date)), fld('Uhrzeit', inTime(e.time))) + fld('Ort', inPlace(e.place)));
      }
      return '<li><div class="l"><b>' + esc(e.title) + '</b><span>' + esc(fmt(parseIso(e.date), { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' })) + ', ' + esc(e.time) + ', ' + esc(e.place) + (e.cancelled ? ' · abgesagt' : '') + '</span></div>' +
        '<div class="btnrow"><button class="mini" data-act="edit" data-target="ev:' + e.id + '">Bearbeiten</button>' +
        '<button class="mini" data-act="cancel-ev" data-id="' + e.id + '">' + (e.cancelled ? 'Reaktivieren' : 'Absagen') + '</button>' +
        '<button class="mini del" data-act="del-ev" data-id="' + e.id + '">Löschen</button></div></li>';
    }).join('') + '</ul>' : '<p class="muted">Noch keine Events. Tippe auf «+», um den ersten zu erfassen.</p>';
    html += accordion('events', 'Events', evs.length, b, true);

    /* Mitglieder */
    b = '<p>Tippe auf den Stern, um ein Mitglied zum Admin zu machen oder die Rechte zu entziehen. Der Standard-PIN sind die letzten 6 Ziffern der Handynummer.</p>';
    if (S.add.members) {
      b += '<form class="addform" data-form="member"><h3 style="margin-bottom:10px">Mitglied hinzufügen</h3>' +
        fld('Vor- und Nachname', '<input class="input" name="name" autocomplete="off" required>') +
        fld('Handynummer', '<input class="input" name="phone" type="tel" inputmode="tel" autocomplete="off" placeholder="079 123 45 67" required>') +
        '<p class="small muted" style="margin:-4px 0 12px">Das Mitglied meldet sich nur mit der Handynummer an. Der PIN sind die letzten 6 Ziffern.</p>' +
        '<button class="btn" type="submit">Mitglied hinzufügen</button></form>';
    }
    b += '<ul class="list scroll" data-sc="members">' + S.members.map(function (m) {
      var self = m.id === S.me.id;
      var label = self ? 'Du bist Admin. Du kannst dir die Rechte nicht selbst entziehen.' : (m.isAdmin ? 'Admin-Rechte entziehen: ' : 'Zum Admin machen: ') + m.name;
      return '<li><div class="l"><b>' + esc(m.name) + '</b><span>' + esc(fmtPhone(m.phone)) + (m.isAdmin ? ' · Admin' : '') + '</span></div>' +
        '<div class="btnrow">' +
        '<button class="starbtn" data-act="set-admin" data-id="' + m.id + '" data-val="' + (m.isAdmin ? '0' : '1') + '" aria-pressed="' + m.isAdmin + '" aria-label="' + esc(label) + '" title="' + esc(label) + '"' + (self ? ' disabled' : '') + '>' + ICON.star + '</button>' +
        (self ? '' : '<button class="mini" data-act="reset-pin" data-id="' + m.id + '">PIN zurücksetzen</button><button class="mini del" data-act="remove-member" data-id="' + m.id + '">Entfernen</button>') +
        '</div></li>';
    }).join('') + '</ul>';
    html += accordion('members', 'Mitglieder', S.members.length, b, true);
    return html;
  }

  function viewProfile() {
    var iosHint = /iphone|ipad|ipod/i.test(navigator.userAgent) && !window.navigator.standalone;
    var standalone = window.matchMedia && window.matchMedia('(display-mode: standalone)').matches;
    var install = '';
    if (!standalone) {
      if (installPrompt) install = '<section class="panel"><h2>App installieren</h2><p>Lege die App auf deinen Startbildschirm, dann öffnet sie sich im Vollbild.</p><button class="btn" data-act="install">Auf dem Startbildschirm speichern</button></section>';
      else if (iosHint) install = '<section class="panel"><h2>App installieren</h2><p>Tippe unten in Safari auf «Teilen» und dann auf «Zum Home-Bildschirm». Danach öffnet sich die App im Vollbild.</p></section>';
    }
    return '<div class="top"><div><h1>Profil</h1></div></div>' +
      '<section class="panel"><div class="profile-row"><span class="muted">Name</span><b>' + esc(S.me.name) + (S.me.isAdmin ? '<span class="badge">Admin</span>' : '') + '</b></div>' +
      '<div class="profile-row"><span class="muted">Handynummer</span><b>' + esc(fmtPhone(S.me.phone)) + '</b></div></section>' +
      install +
      '<section class="panel"><h2>Name ändern</h2><form data-form="name">' + fld('Vor- und Nachname', '<input class="input" name="name" value="' + esc(S.me.name) + '" required>') +
      '<button class="btn" type="submit">Name speichern</button></form></section>' +
      '<section class="panel"><h2>PIN ändern</h2><p>Standardmässig sind es die letzten 6 Ziffern deiner Handynummer. Wenn du den PIN änderst, musst du ihn bei der Anmeldung eintragen.</p><form data-form="pin">' +
      fld('Neuer PIN (6 Ziffern)', '<input class="input pin" name="pin" type="password" inputmode="numeric" pattern="[0-9]{6}" maxlength="6" autocomplete="new-password" required>') +
      '<button class="btn" type="submit">PIN speichern</button></form>' +
      '<button class="linkbtn" data-act="pin-default" style="margin-top:10px">Auf Standard-PIN zurücksetzen</button></section>' +
      '<button class="btn ghost" data-act="logout">Abmelden</button>';
  }

  function renderNav() {
    var nav = document.getElementById('nav');
    if (S.step !== 'app') { nav.hidden = true; return; }
    nav.hidden = false;
    var tabs = [{ id: 'trainings', label: 'Trainings', icon: ICON.cal }, { id: 'events', label: 'Events', icon: ICON.star }];
    if (S.me.isAdmin) tabs.push({ id: 'admin', label: 'Verwalten', icon: ICON.cog });
    tabs.push({ id: 'profile', label: 'Profil', icon: ICON.user });
    nav.innerHTML = '<div class="in">' + tabs.map(function (t) {
      return '<button class="tab" data-act="tab" data-tab="' + t.id + '"' + (S.tab === t.id ? ' aria-current="page"' : '') + '>' + t.icon + '<span>' + t.label + '</span></button>';
    }).join('') + '</div>';
  }

  function render() {
    var app = document.getElementById('app');
    var y = window.scrollY;
    var lts = {};
    document.querySelectorAll('.list.scroll').forEach(function (x) { lts[x.dataset.sc] = x.scrollTop; });
    if (S.step === 'setup') app.innerHTML = viewSetup();
    else if (S.step === 'loading') app.innerHTML = '<div class="login"><p class="muted">Lade …</p></div>';
    else if (S.step === 'login') app.innerHTML = viewLogin();
    else {
      if (S.tab === 'admin' && !S.me.isAdmin) S.tab = 'trainings';
      app.innerHTML = S.tab === 'admin' ? viewAdmin() : S.tab === 'events' ? viewEvents() : S.tab === 'profile' ? viewProfile() : viewTrainings();
    }
    renderNav();
    window.scrollTo(0, y);
    document.querySelectorAll('.list.scroll').forEach(function (x) { if (lts[x.dataset.sc]) x.scrollTop = lts[x.dataset.sc]; });
  }

  // Aktualisiert im Hintergrund, ohne eine laufende Eingabe zu stören
  function softRender() {
    var a = document.activeElement;
    if (a && /^(INPUT|SELECT|TEXTAREA)$/.test(a.tagName) && document.getElementById('app').contains(a)) return;
    render();
  }

  var toastTimer;
  function toast(msg) {
    var el = document.getElementById('toast');
    el.textContent = msg;
    el.classList.toggle('nonav', S.step !== 'app');
    el.classList.add('show');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(function () { el.classList.remove('show'); }, 2200);
  }

  /* ---------- Speichern ---------- */
  async function act(fn, okMsg) {
    try {
      var res = await fn();
      if (res && res.error) throw res.error;
      if (okMsg) toast(okMsg);
      return true;
    } catch (e) {
      console.error(e);
      toast('Das hat nicht geklappt' + (e && e.message ? ': ' + String(e.message).slice(0, 100) : '') + '.');
      return false;
    } finally {
      try { await loadAll(); render(); } catch (e2) { console.error(e2); }
    }
  }

  async function setResponse(table, keyCol, keyVal, val, msg) {
    var store = table === 'training_responses' ? S.tr : S.ev;
    var mine = (store[keyVal] || {})[S.me.id];
    store[keyVal] = store[keyVal] || {};
    var row = { user_id: S.me.id, status: val, updated_at: new Date().toISOString() };
    row[keyCol] = keyVal;
    if (mine === val) {
      delete store[keyVal][S.me.id];
      render();
      await act(function () { return sb.from(table).delete().eq(keyCol, keyVal).eq('user_id', S.me.id); }, 'Antwort zurückgezogen');
    } else {
      store[keyVal][S.me.id] = val;
      render();
      await act(function () { return sb.from(table).upsert(row); }, msg);
    }
  }

  async function addMember(name, phoneRaw) {
    var phone = normPhone(phoneRaw);
    if (!phone) { toast('Bitte gib eine gültige Handynummer ein, z. B. 079 123 45 67.'); return false; }
    if (S.members.some(function (m) { return m.phone === phone; })) { toast('Diese Nummer ist schon registriert.'); return false; }
    try {
      var code = await sb.rpc('get_club_code');
      if (code.error) throw code.error;
      // Eigener, kurzlebiger Client: die Sitzung des Admins bleibt unverändert
      var tmp = window.supabase.createClient(cfg.SUPABASE_URL, cfg.SUPABASE_ANON_KEY, {
        auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false }
      });
      var r = await tmp.auth.signUp({
        email: phoneToEmail(phone), password: defaultPin(phone),
        options: { data: { name: name, phone: phone, club_code: code.data || '' } }
      });
      if (r.error) throw r.error;
      toast(name + ' wurde hinzugefügt.');
      return true;
    } catch (e) {
      console.error(e);
      toast('Hinzufügen nicht möglich: ' + (/already/i.test(String(e.message)) ? 'Diese Nummer ist schon registriert.' : String(e.message || 'Unbekannter Fehler').slice(0, 100)));
      return false;
    } finally {
      try { await loadAll(); render(); } catch (e2) { console.error(e2); }
    }
  }

  /* ---------- Anmeldung ---------- */
  function authError(e) {
    var m = String((e && e.message) || '');
    if (/invalid login/i.test(m)) return 'Handynummer oder PIN stimmt nicht. Falls du deinen PIN geändert hast, trage ihn im Feld PIN ein.';
    if (/already registered|already been registered/i.test(m)) return 'Diese Nummer ist bereits registriert. Bitte melde dich an.';
    if (/database error|Ungültiger Vereinscode/i.test(m)) return 'Registrierung nicht möglich. Bitte prüfe den Vereinscode.';
    if (/rate limit|too many/i.test(m)) return 'Zu viele Versuche. Bitte warte einen Moment.';
    if (/password/i.test(m)) return 'Der PIN muss aus 6 Ziffern bestehen.';
    return 'Anmeldung fehlgeschlagen. Bitte versuche es erneut.';
  }

  async function handleAuth(g) {
    var phone = normPhone(g('phone'));
    S.phone = g('phone');
    if (!phone) { S.err = 'Bitte gib eine gültige Handynummer ein, z. B. 079 123 45 67.'; render(); return; }
    var custom = g('pin');
    if (custom && !/^\d{6}$/.test(custom)) { S.err = 'Der PIN muss aus genau 6 Ziffern bestehen.'; render(); return; }
    var pin = (S.mode === 'login' && custom) ? custom : defaultPin(phone);
    S.busy = true; S.err = ''; render();
    try {
      var res;
      if (S.mode === 'register') {
        res = await sb.auth.signUp({
          email: phoneToEmail(phone), password: pin,
          options: { data: { name: g('name'), phone: phone, club_code: g('code') } }
        });
        if (!res.error && !res.data.session) {
          throw new Error('Bitte schalte in Supabase «Confirm email» aus (siehe README).');
        }
      } else {
        res = await sb.auth.signInWithPassword({ email: phoneToEmail(phone), password: pin });
      }
      if (res.error) throw res.error;
      S.busy = false;
      await enter(res.data.session);
    } catch (e) {
      console.error(e);
      S.busy = false;
      S.err = /Confirm email/.test(e.message) ? e.message : authError(e);
      S.step = 'login';
      render();
    }
  }

  async function enter(session) {
    S.session = session;
    S.step = 'loading'; render();
    try {
      await loadAll();
      if (!S.me) throw new Error('Kein Profil gefunden');
      S.step = 'app'; S.tab = 'trainings'; S.err = '';
      subscribe();
      render();
      window.scrollTo(0, 0);
    } catch (e) {
      console.error(e);
      S.step = 'login';
      S.err = 'Die Daten konnten nicht geladen werden. Wurde das Datenbank-Schema ausgeführt?';
      render();
    }
  }

  /* ---------- Live-Aktualisierung ---------- */
  var channel = null, reloadTimer;
  function scheduleReload() {
    clearTimeout(reloadTimer);
    reloadTimer = setTimeout(async function () {
      if (S.step !== 'app') return;
      try { await loadAll(); softRender(); } catch (e) { console.error(e); }
    }, 400);
  }
  function subscribe() {
    if (channel || !sb) return;
    try {
      channel = sb.channel('vereins-daten').on('postgres_changes', { event: '*', schema: 'public' }, scheduleReload).subscribe();
    } catch (e) { console.error(e); }
  }
  document.addEventListener('visibilitychange', function () { if (document.visibilityState === 'visible') scheduleReload(); });

  /* ---------- Klicks ---------- */
  document.addEventListener('click', async function (e) {
    var el = e.target.closest('[data-act]');
    if (!el) return;
    var act_ = el.dataset.act;
    var D = el.dataset;

    if (act_ === 'mode') { S.mode = S.mode === 'login' ? 'register' : 'login'; S.err = ''; render(); return; }
    if (act_ === 'tab') { S.tab = D.tab; S.edit = null; render(); window.scrollTo(0, 0); return; }
    if (act_ === 'who') { S.open[D.key] = !S.open[D.key]; render(); return; }
    if (act_ === 'who-ev') { S.open['ev:' + D.id] = !S.open['ev:' + D.id]; render(); return; }
    if (act_ === 'sec') { S.sec[D.id] = !S.sec[D.id]; render(); return; }
    if (act_ === 'add-toggle') {
      S.add[D.id] = !S.add[D.id];
      if (S.add[D.id]) S.sec[D.id] = true;
      render();
      var af = document.querySelector('.addform');
      if (S.add[D.id] && af) af.scrollIntoView({ block: 'nearest' });
      return;
    }
    if (act_ === 'more-tr') { S.showMore = !S.showMore; render(); return; }
    if (act_ === 'edit') {
      S.edit = D.target;
      S.sec[D.target.indexOf('rule:') === 0 ? 'rules' : D.target.indexOf('ev:') === 0 ? 'events' : D.target.indexOf('tr:x#') === 0 ? 'extra' : 'upcoming'] = true;
      render();
      var ef = document.querySelector('.editform');
      if (ef) ef.scrollIntoView({ block: 'nearest' });
      return;
    }
    if (act_ === 'edit-cancel') { S.edit = null; render(); return; }
    if (act_ === 'install') {
      if (installPrompt) { installPrompt.prompt(); await installPrompt.userChoice; installPrompt = null; render(); }
      return;
    }
    if (act_ === 'logout') {
      try { await sb.auth.signOut(); } catch (err) { console.error(err); }
      if (channel) { try { sb.removeChannel(channel); } catch (err2) { /* ignorieren */ } channel = null; }
      S = freshState(); S.step = 'login'; render(); window.scrollTo(0, 0);
      return;
    }

    if (act_ === 'resp') return setResponse('training_responses', 'training_key', D.key, D.val, D.val === 'yes' ? 'Du bist dabei' : 'Du bist nicht dabei');
    if (act_ === 'resp-ev') return setResponse('event_responses', 'event_id', D.id, D.val, D.val === 'solo' ? 'Du kommst allein' : D.val === 'duo' ? 'Du kommst zu zweit' : 'Du bist nicht dabei');

    if (act_ === 'cal') {
      var ce = S.events.filter(function (x) { return x.id === D.id; })[0];
      if (ce) { try { await addToCalendar(ce); } catch (err) { console.error(err); toast('Der Kalendereintrag konnte nicht erstellt werden.'); } }
      return;
    }
    if (act_ === 'pin-default') {
      try {
        var pr = await sb.auth.updateUser({ password: defaultPin(S.me.phone) });
        if (pr.error) throw pr.error;
        toast('PIN auf Standard zurückgesetzt');
      } catch (err) { console.error(err); toast('PIN konnte nicht zurückgesetzt werden.'); }
      return;
    }

    /* Admin-Aktionen */
    if (!S.me || !S.me.isAdmin) return;
    if (act_ === 'del-rule') {
      if (!confirm('Diesen Trainingstag entfernen? Alle kommenden Termine der Serie verschwinden.')) return;
      return act(function () { return sb.from('training_rules').delete().eq('id', D.id); }, 'Trainingstag entfernt');
    }
    if (act_ === 'del-extra') {
      if (!confirm('Dieses Training löschen?')) return;
      return act(function () { return sb.from('training_extras').delete().eq('id', D.id); }, 'Training gelöscht');
    }
    if (act_ === 'del-ev') {
      if (!confirm('Diesen Event löschen? Auch alle Antworten werden gelöscht.')) return;
      return act(function () { return sb.from('events').delete().eq('id', D.id); }, 'Event gelöscht');
    }
    if (act_ === 'cancel') {
      var isOff = !!S.cancelled[D.key];
      return act(function () {
        return isOff ? sb.from('training_cancellations').delete().eq('training_key', D.key)
                     : sb.from('training_cancellations').upsert({ training_key: D.key });
      }, isOff ? 'Training wieder aktiv' : 'Training abgesagt');
    }
    if (act_ === 'cancel-ev') {
      var ev = S.events.filter(function (x) { return x.id === D.id; })[0];
      if (!ev) return;
      return act(function () { return sb.from('events').update({ cancelled: !ev.cancelled }).eq('id', D.id); }, ev.cancelled ? 'Event wieder aktiv' : 'Event abgesagt');
    }
    if (act_ === 'reset-tr') {
      S.edit = null;
      return act(function () { return sb.from('training_overrides').delete().eq('training_key', D.key); }, 'Änderung zurückgesetzt');
    }
    if (act_ === 'reset-pin') {
      var who = S.members.filter(function (m) { return m.id === D.id; })[0];
      if (!confirm('PIN von ' + (who ? who.name : 'diesem Mitglied') + ' auf die letzten 6 Ziffern der Handynummer zurücksetzen?')) return;
      return act(function () { return sb.rpc('reset_pin', { target: D.id }); }, 'PIN zurückgesetzt');
    }
    if (act_ === 'remove-member') {
      var rm = S.members.filter(function (m) { return m.id === D.id; })[0];
      if (!confirm((rm ? rm.name : 'Dieses Mitglied') + ' entfernen? Das Konto und alle Antworten werden gelöscht.')) return;
      return act(function () { return sb.rpc('remove_member', { target: D.id }); }, 'Mitglied entfernt');
    }
    if (act_ === 'set-admin') {
      return act(function () { return sb.rpc('set_admin', { target: D.id, make_admin: D.val === '1' }); }, D.val === '1' ? 'Admin-Rechte vergeben' : 'Admin-Rechte entzogen');
    }
  });

  /* ---------- Formulare ---------- */
  document.addEventListener('submit', async function (e) {
    var form = e.target.closest('[data-form]');
    if (!form) return;
    e.preventDefault();
    if (S.busy) return;
    var f = new FormData(form);
    var kind = form.dataset.form;
    var id = form.dataset.id;
    var g = function (k) { return String(f.get(k) || '').trim(); };
    var ok;

    if (kind === 'auth') return handleAuth(g);
    if (!S.me) return;

    if (kind === 'name') {
      return act(function () { return sb.from('profiles').update({ name: g('name') }).eq('id', S.me.id); }, 'Name gespeichert');
    }
    if (kind === 'pin') {
      if (!/^\d{6}$/.test(g('pin'))) { toast('Der PIN muss aus genau 6 Ziffern bestehen.'); return; }
      try {
        var r = await sb.auth.updateUser({ password: g('pin') });
        if (r.error) throw r.error;
        form.reset(); toast('PIN geändert');
      } catch (err) { console.error(err); toast('PIN konnte nicht geändert werden.'); }
      return;
    }
    if (!S.me.isAdmin) return;

    if (kind === 'member') {
      S.busy = true;
      var added = await addMember(g('name'), g('phone'));
      S.busy = false;
      if (added) { S.add.members = false; render(); }
      return;
    }
    if (kind === 'rule') {
      ok = await act(function () { return sb.from('training_rules').insert({ weekday: Number(g('wd')), start_time: g('time'), place: g('place') }); }, 'Trainingstag hinzugefügt');
    } else if (kind === 'extra') {
      ok = await act(function () { return sb.from('training_extras').insert({ title: g('title'), event_date: g('date'), start_time: g('time'), place: g('place') }); }, 'Training hinzugefügt');
    } else if (kind === 'event') {
      ok = await act(function () { return sb.from('events').insert({ title: g('title'), event_date: g('date'), start_time: g('time'), place: g('place') }); }, 'Event hinzugefügt');
    } else if (kind === 'edit-rule') {
      ok = await act(function () { return sb.from('training_rules').update({ weekday: Number(g('wd')), start_time: g('time'), place: g('place') }).eq('id', id); }, 'Trainingstag geändert');
      if (ok) S.edit = null;
    } else if (kind === 'edit-tr') {
      if (id.indexOf('x#') === 0) {
        ok = await act(function () { return sb.from('training_extras').update({ title: g('title'), event_date: g('date'), start_time: g('time'), place: g('place') }).eq('id', id.slice(2)); }, 'Training geändert');
      } else {
        ok = await act(function () { return sb.from('training_overrides').upsert({ training_key: id, new_date: g('date'), new_time: g('time'), new_place: g('place') }); }, 'Training geändert');
      }
      if (ok) S.edit = null;
    } else if (kind === 'edit-ev') {
      ok = await act(function () { return sb.from('events').update({ title: g('title'), event_date: g('date'), start_time: g('time'), place: g('place') }).eq('id', id); }, 'Event geändert');
      if (ok) S.edit = null;
    }
    if (ok && kind === 'rule') S.add.rules = false;
    if (ok && kind === 'event') S.add.events = false;
    if (ok) { render(); if (/^(extra)$/.test(kind)) { var nf = document.querySelector('[data-form="' + kind + '"]'); if (nf) nf.reset(); } }
  });

  document.addEventListener('input', function (e) {
    var t = e.target;
    if (!t || t.name !== 'phone' || !t.closest('[data-form="auth"],[data-form="member"]')) return;
    var pos = t.selectionStart, atEnd = pos === t.value.length;
    var before = t.value.slice(0, pos).replace(/\D/g, '').length;
    var f = formatPhoneTyping(t.value);
    if (f === t.value) return;
    t.value = f;
    if (atEnd) pos = f.length;
    else { var c = 0; pos = 0; while (pos < f.length && c < before) { if (/\d/.test(f.charAt(pos))) c++; pos++; } }
    try { t.setSelectionRange(pos, pos); } catch (x) { /* ignorieren */ }
  });

  /* ---------- Installation & Start ---------- */
  window.addEventListener('beforeinstallprompt', function (e) {
    e.preventDefault(); installPrompt = e;
    if (S.step === 'app' && S.tab === 'profile') softRender();
  });

  if ('serviceWorker' in navigator && location.protocol.indexOf('http') === 0) {
    window.addEventListener('load', function () { navigator.serviceWorker.register('sw.js').catch(function () { /* ignorieren */ }); });
  }

  async function init() {
    if (!sb) { S.step = 'setup'; render(); return; }
    render();
    try {
      var res = await sb.auth.getSession();
      if (res.data && res.data.session) { await enter(res.data.session); }
      else { S.step = 'login'; render(); }
    } catch (e) { console.error(e); S.step = 'login'; render(); }
    sb.auth.onAuthStateChange(function (event) {
      if (event === 'SIGNED_OUT' && S.step === 'app') { S = freshState(); S.step = 'login'; render(); }
    });
  }
  init();
})();

(function () {
  'use strict';

  var app = document.getElementById('app');
  var LIB = null, TEXTS = null, QA = null, THOUGHTS = null;
  var byId = {};

  /* ---------- storage helpers ---------- */
  function store(k, v) { try { if (v === undefined) return localStorage.getItem(k); localStorage.setItem(k, v); } catch (e) { return null; } }

  /* ---------- data loading ---------- */
  function getJSON(url) {
    return fetch(url).then(function (r) { if (!r.ok) throw new Error(url + ' ' + r.status); return r.json(); });
  }
  function loadLib() {
    if (LIB) return Promise.resolve();
    return Promise.all([getJSON('data/library.json'), getJSON('data/thoughts.json')]).then(function (r) {
      LIB = r[0]; THOUGHTS = r[1];
      LIB.articles.forEach(function (a, i) { a.i = i; byId[a.id] = a; });
    });
  }
  function loadTexts() { return TEXTS ? Promise.resolve() : getJSON('data/texts.json').then(function (t) { TEXTS = t; }); }
  function loadQA() { return QA ? Promise.resolve() : getJSON('data/qa.json').then(function (q) { QA = q; }); }

  /* ---------- small utils ---------- */
  function esc(s) { return String(s).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); }
  function fold(s) { return s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/[‘’]/g, "'").replace(/[“”]/g, '"'); }
  function catName(c) { var f = LIB.cats.filter(function (x) { return x[0] === c; })[0]; return f ? f[1] : c; }
  function readMins(w) { return Math.max(1, Math.round(w / 200)); }
  function setTitle(t) { document.title = t ? t + ' | Swami Pitambarananda' : 'Writings of Swami Pitambarananda'; }
  function setNav(n) {
    document.querySelectorAll('[data-nav]').forEach(function (a) {
      if (a.getAttribute('data-nav') === n) a.setAttribute('aria-current', 'page'); else a.removeAttribute('aria-current');
    });
  }
  var HI_DIG = '०१२३४५६७८९';
  function hiNum(n) { return String(n).replace(/\d/g, function (d) { return HI_DIG[+d]; }); }
  function metaLine(a) {
    var parts = [];
    if (a.source) parts.push(esc(a.source));
    if (a.lang === 'hi') return parts.concat('लगभग ' + hiNum(Math.max(1, Math.round(a.words / 180))) + ' मिनट').join(' · ');
    parts.push(readMins(a.words) + ' min read');
    return parts.join('. ');
  }

  /* ---------- Hindi renderer (line-based markup from the earlier Hindi app) ---------- */
  function hiInline(s) {
    return esc(s).replace(/\[(\*+)\]|\*{3,}/g, function (m) { return m.replace(/\*/g, '&#42;'); }).replace(/\*\*(.+?)\*\*/g, '<b>$1</b>');
  }
  function renderHi(body) {
    var L = body.split('\n'), out = [], verse = null;
    function endVerse() { if (verse) { out.push('<div class="verse hv">' + verse.join('') + '</div>'); verse = null; } }
    for (var i = 0; i < L.length; i++) {
      var l = L[i], m;
      if (!l.trim()) { endVerse(); continue; }
      if (l.charAt(0) === '|') {
        endVerse();
        var head = null, rows = [];
        while (i < L.length && L[i].charAt(0) === '|') {
          var r = L[i], cells = r.replace(/^\|\|?\s*/, '').split(' | ').map(function (c) { return c.trim(); });
          if (r.indexOf('||') === 0) head = cells; else rows.push(cells);
          i++;
        }
        i--;
        out.push('<div class="tbl"><table>' + (head ? '<thead><tr>' + head.map(function (c) { return '<th>' + esc(c) + '</th>'; }).join('') + '</tr></thead>' : '') +
          '<tbody>' + rows.map(function (rw) { return '<tr>' + rw.map(function (c) { return '<td>' + hiInline(c) + '</td>'; }).join('') + '</tr>'; }).join('') + '</tbody></table></div>');
        continue;
      }
      if ((m = l.match(/^@ (.*)/))) { (verse = verse || []).push('<span>' + hiInline(m[1]) + '</span>'); continue; }
      endVerse();
      if ((m = l.match(/^@@ (.*)/))) out.push('<p class="sutra">' + hiInline(m[1]) + '</p>');
      else if ((m = l.match(/^#C (.*)/))) out.push('<p class="ctr">' + hiInline(m[1]) + '</p>');
      else if ((m = l.match(/^## (.*)/))) out.push('<h4>' + hiInline(m[1]) + '</h4>');
      else if ((m = l.match(/^# (.*)/))) out.push('<h3>' + hiInline(m[1]) + '</h3>');
      else if ((m = l.match(/^>s (.*)/))) out.push('<p class="sa">' + hiInline(m[1]) + '</p>');
      else if ((m = l.match(/^>q (.*)/))) out.push('<blockquote class="quote">' + hiInline(m[1]) + '</blockquote>');
      else if ((m = l.match(/^>n (.*)/))) out.push('<p class="fn hn">' + hiInline(m[1]) + '</p>');
      else if ((m = l.match(/^>r (.*)/))) out.push('<p class="sign">' + hiInline(m[1]) + '</p>');
      else if ((m = l.match(/^> (.*)/))) out.push('<p class="pad">' + hiInline(m[1]) + '</p>');
      else out.push('<p>' + hiInline(l) + '</p>');
    }
    endVerse();
    return out.join('\n');
  }
  function plainOf(a, text) {
    return a.fmt === 'hi' ? text.replace(/^(@@|@|#C|##|#|>s|>q|>n|>r|>|\|\||\|) ?/gm, '').replace(/\[\*+\]/g, '').replace(/\*\*/g, '') : text;
  }

  /* ---------- text renderer ---------- */
  var LABEL = /^(Question\s*:|Answer\s*:|Reply\s*:|\*?\??Q\s*\.?\s*\d+\s*:?|Ans\s*:)\s*/;
  function inline(s) {
    var h = esc(s).replace(/\n/g, '<br>');
    var m = s.match(LABEL);
    if (m) h = '<span class="lbl">' + esc(m[0].trim()) + '</span>' + esc(s.slice(m[0].length)).replace(/\n/g, '<br>');
    return h;
  }
  function render(src, a) {
    var out = [];
    src.split(/\n{2,}/).forEach(function (block) {
      block = block.replace(/^\s+|\s+$/g, '');
      if (!block) return;
      if (block === '[[ORIG]]') {
        out.push('<div class="orig"><span>Verse in Sanskrit or Bengali, shown on the original page.</span>' +
          (a.pages ? '<button type="button" data-goto-pages>See original pages</button>' : '') + '</div>');
        return;
      }
      var pm = block.match(/^\[\[PAGE (\d+)\]\]$/);
      if (pm) {
        out.push('<figure><img loading="lazy" src="pages/' + a.id + '/' + pm[1] + '.webp" alt="Diagram on original page ' + pm[1] + '"><figcaption>Diagram from original page ' + pm[1] + '</figcaption></figure>');
        return;
      }
      var lines = block.split('\n');
      if (lines.every(function (l) { return /^## /.test(l); })) {
        lines.forEach(function (l) { out.push('<h3>' + esc(l.slice(3)) + '</h3>'); });
        return;
      }
      if (lines.every(function (l) { return /^> ?/.test(l); })) {
        out.push('<div class="verse">' + lines.map(function (l) { return '<span>' + esc(l.replace(/^> ?/, '')) + '</span>'; }).join('') + '</div>');
        return;
      }
      if (/^\^\^ /.test(block)) { out.push('<p class="fn">' + esc(block.slice(3)) + '</p>'); return; }
      // mixed block: leading heading lines, then paragraph
      var heads = [];
      while (lines.length && /^## /.test(lines[0])) heads.push(lines.shift());
      heads.forEach(function (l) { out.push('<h3>' + esc(l.slice(3)) + '</h3>'); });
      if (lines.length) out.push('<p>' + inline(lines.join('\n')) + '</p>');
    });
    return out.join('\n');
  }

  function highlight(root, q) {
    var terms = fold(q).split(/\s+/).filter(function (t) { return t.length > 1; });
    if (!terms.length) return null;
    var walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT, null);
    var nodes = []; var n;
    while ((n = walker.nextNode())) nodes.push(n);
    var first = null;
    nodes.forEach(function (node) {
      var text = node.nodeValue, f = fold(text);
      if (f.length !== text.length) return; // skip text whose folding changes length
      var ranges = [];
      terms.forEach(function (t) { var i = 0; while ((i = f.indexOf(t, i)) !== -1) { ranges.push([i, i + t.length]); i += t.length; } });
      if (!ranges.length) return;
      ranges.sort(function (x, y) { return x[0] - y[0]; });
      var frag = document.createDocumentFragment(), pos = 0;
      ranges.forEach(function (r) {
        if (r[0] < pos) return;
        frag.appendChild(document.createTextNode(text.slice(pos, r[0])));
        var m = document.createElement('mark'); m.textContent = text.slice(r[0], r[1]); frag.appendChild(m);
        if (!first) first = m;
        pos = r[1];
      });
      frag.appendChild(document.createTextNode(text.slice(pos)));
      node.parentNode.replaceChild(frag, node);
    });
    return first;
  }

  /* ---------- views ---------- */
  function todayThought(lang) {
    var d = new Date();
    var day = Math.floor((Date.UTC(d.getFullYear(), d.getMonth(), d.getDate())) / 86400000);
    var pool = THOUGHTS.filter(function (x) { return (x.l || 'en') === lang; });
    return pool[day % pool.length];
  }
  function homeHref(lang, cat) { return (lang === 'hi' ? '#/hi' : '#/') + (cat ? '?c=' + cat : ''); }

  var UI = {
    en: { thought: 'Thought for today', from: 'From', ph: 'Search all writings, e.g. meditation, Gayatri, friend', btn: 'Search',
          cont: 'Continue reading', all: 'All', topic: 'Show topic', piece: function (n) { return n + (n === 1 ? ' piece' : ' pieces'); } },
    hi: { thought: 'आज का विचार', from: 'स्रोत:', ph: 'सभी ग्रन्थों में खोजें… जैसे आत्मा, माया, भक्ति', btn: 'खोजें',
          cont: 'पढ़ना जारी रखें:', all: 'सभी', topic: 'विषय चुनें', piece: function (n) { return hiNum(n) + ' ग्रन्थ'; } }
  };

  function viewHome(params, lang) {
    lang = lang || 'en';
    var T = UI[lang];
    setNav(lang === 'hi' ? 'hi' : 'home'); setTitle(lang === 'hi' ? 'हिन्दी ग्रन्थ' : '');
    var t = todayThought(lang), ta = byId[t.a];
    var cat = params.get('c') || '';
    var cats = LIB.cats.filter(function (c) { return (c[2] || 'en') === lang; });
    var mine = LIB.articles.filter(function (a) { return (a.lang || 'en') === lang; });
    var h = '<div lang="' + lang + '">';
    h += '<section class="thought" aria-label="' + T.thought + '">' +
      '<p class="when">' + T.thought + '</p>' +
      '<blockquote>' + esc(t.t) + '</blockquote>' +
      '<p class="from">' + T.from + ' <a href="#/read/' + ta.id + '?q=' + encodeURIComponent(t.t.split(' ').slice(0, 5).join(' ')) + '">' + esc(ta.title) + '</a></p></section>';
    h += '<form class="searchbar" role="search" id="sf">' +
      '<input id="q" name="q" type="search" placeholder="' + T.ph + '" aria-label="' + T.btn + '" autocomplete="off">' +
      '<button type="submit">' + T.btn + '</button></form>';
    var last = store('last:' + lang);
    if (last && byId[last]) h += '<p class="continue">' + T.cont + ' <a href="#/read/' + last + '">' + esc(byId[last].title) + '</a></p>';
    h += '<div class="cats" role="group" aria-label="' + T.topic + '"><button type="button" data-c="" aria-pressed="' + (!cat) + '">' + T.all + ' ' + (lang === 'hi' ? hiNum(mine.length) : mine.length) + '</button>' +
      cats.map(function (c) { return '<button type="button" data-c="' + c[0] + '" aria-pressed="' + (cat === c[0]) + '">' + esc(c[1]) + '</button>'; }).join('') + '</div>';
    cats.forEach(function (c) {
      if (cat && cat !== c[0]) return;
      var items = mine.filter(function (a) { return a.cat === c[0]; });
      h += '<h2 class="group">' + esc(c[1]) + '</h2><p class="group-count">' + T.piece(items.length) + '</p><ol class="list">';
      items.forEach(function (a) {
        h += '<li><a class="item" href="#/read/' + a.id + '"><div class="t">' + esc(a.title) + '</div>' + (a.summary ? '<div class="s">' + esc(a.summary) + '</div>' : '') + '<div class="m">' + metaLine(a) + '</div></a></li>';
      });
      h += '</ol>';
    });
    app.innerHTML = h + '</div>';
    document.getElementById('sf').addEventListener('submit', function (e) {
      e.preventDefault(); var q = document.getElementById('q').value.trim();
      if (q) location.hash = '#/search?q=' + encodeURIComponent(q) + (lang === 'hi' ? '&l=hi' : '');
    });
    app.querySelectorAll('.cats button').forEach(function (b) {
      b.addEventListener('click', function () { location.hash = homeHref(lang, b.getAttribute('data-c')); });
    });
  }

  function viewRead(id, params) {
    var a = byId[id];
    if (!a) { app.innerHTML = '<p class="empty">This piece was not found. <a href="#/">Go to the library</a>.</p>'; return; }
    var hi = a.lang === 'hi';
    setNav(hi ? 'hi' : 'home'); setTitle(a.title);
    store('last:' + (a.lang || 'en'), id);
    var q = params.get('q') || '';
    var view = params.get('v') || (q ? 'text' : (store('view:' + id) || a.view));
    if (!a.pages) view = 'text';
    var sib = LIB.articles.filter(function (x) { return x.cat === a.cat; });
    var k = sib.indexOf(a), prev = sib[k - 1], next = sib[k + 1];
    var W = hi ? { text: 'पाठ', pages: 'मूल पृष्ठ', show: 'दिखाएँ', smaller: 'अक्षर छोटे करें', larger: 'अक्षर बड़े करें', prev: 'पिछला', next: 'अगला', more: 'इसी विषय में और' }
               : { text: 'Text', pages: 'Original pages', show: 'Show', smaller: 'Smaller text', larger: 'Larger text', prev: 'Previous', next: 'Next', more: 'More in this topic' };

    var h = '<div lang="' + (a.lang || 'en') + '"><a class="back" href="' + homeHref(a.lang, a.cat) + '">' + esc(catName(a.cat)) + '</a>';
    h += '<article class="reader' + (hi ? ' hi' : '') + '"><h1>' + esc(a.title) + '</h1><p class="meta">' + metaLine(a) + '</p>';
    h += '<div class="tools">';
    if (a.pages) h += '<div class="seg" role="group" aria-label="' + W.show + '"><button type="button" data-v="text" aria-pressed="' + (view === 'text') + '">' + W.text + '</button><button type="button" data-v="pages" aria-pressed="' + (view === 'pages') + '">' + W.pages + ' (' + a.pages + ')</button></div>';
    h += '<span class="spacer"></span>';
    if (view === 'text') h += '<button class="icon-btn" type="button" data-size="-1" aria-label="' + W.smaller + '">A−</button><button class="icon-btn" type="button" data-size="1" aria-label="' + W.larger + '">A+</button>';
    h += '</div>';
    if (view === 'pages') {
      h += '<div class="pages">';
      for (var i = 1; i <= a.pages; i++) h += '<figure><img loading="lazy" src="pages/' + a.id + '/' + i + '.webp" alt="' + (hi ? 'मूल पृष्ठ ' + i : 'Original page ' + i + ' of ' + esc(a.title)) + '" width="1100" height="1556"><figcaption>' + (hi ? 'पृष्ठ ' + i + ' / ' + a.pages : 'Page ' + i + ' of ' + a.pages) + '</figcaption></figure>';
      h += '</div>';
    } else {
      if (a.note) h += '<p class="note">' + esc(a.note) + '</p>';
      h += '<div class="text' + (hi ? ' hitext' : '') + '" id="txt">' + (a.fmt === 'hi' ? renderHi(TEXTS[id]) : render(TEXTS[id], a)) + '</div>';
    }
    h += '</article><nav class="pn" aria-label="' + W.more + '">' +
      (prev ? '<a href="#/read/' + prev.id + '"><small>' + W.prev + '</small>' + esc(prev.title) + '</a>' : '<span></span>') +
      (next ? '<a class="next" href="#/read/' + next.id + '"><small>' + W.next + '</small>' + esc(next.title) + '</a>' : '') + '</nav></div>';
    app.innerHTML = h;

    app.querySelectorAll('[data-v]').forEach(function (b) {
      b.addEventListener('click', function () { store('view:' + id, b.getAttribute('data-v')); location.hash = '#/read/' + id + '?v=' + b.getAttribute('data-v'); });
    });
    app.querySelectorAll('[data-goto-pages]').forEach(function (b) {
      b.addEventListener('click', function () { location.hash = '#/read/' + id + '?v=pages'; });
    });
    app.querySelectorAll('[data-size]').forEach(function (b) {
      b.addEventListener('click', function () {
        var cur = parseFloat(store('size') || '1.125');
        cur = Math.min(1.6, Math.max(0.9, cur + 0.0625 * parseInt(b.getAttribute('data-size'), 10)));
        store('size', String(cur)); document.documentElement.style.setProperty('--size', cur + 'rem');
      });
    });
    if (q && view === 'text') {
      var m = highlight(document.getElementById('txt'), q);
      if (m) setTimeout(function () { m.scrollIntoView({ block: 'center' }); }, 30);
    }
  }

  function snippet(text, f, terms) {
    var i = -1;
    for (var k = 0; k < terms.length && i < 0; k++) i = f.indexOf(terms[k]);
    if (i < 0) return '';
    var s = Math.max(0, i - 90), e = Math.min(text.length, i + 160);
    if (s > 0) { var sp = text.lastIndexOf(' ', s); s = sp >= 0 && i - sp < 140 ? sp + 1 : s; }
    if (e < text.length) { var ep = text.indexOf(' ', e); e = ep >= 0 && ep - e < 40 ? ep : e; }
    var piece = text.slice(s, e).replace(/\[\[(ORIG|PAGE \d+)\]\]/g, ' ').replace(/^#+ |\n#+ /g, ' ').replace(/\n> ?/g, ' ').replace(/\s+/g, ' ');
    var h = esc(piece);
    terms.forEach(function (t) {
      var re = new RegExp('(' + t.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + ')', 'gi');
      h = h.replace(re, '<mark>$1</mark>');
    });
    return (s > 0 ? '…' : '') + h + (e < text.length ? '…' : '');
  }

  function viewSearch(params) {
    setNav('home');
    var q = (params.get('q') || '').trim();
    setTitle(q ? 'Search: ' + q : 'Search');
    var fromHi = params.get('l') === 'hi';
    if (fromHi) setNav('hi');
    var h = '<a class="back" href="' + (fromHi ? '#/hi' : '#/') + '">' + (fromHi ? 'हिन्दी ग्रन्थ' : 'Library') + '</a>';
    h += '<form class="searchbar" role="search" id="sf"><input id="q" type="search" value="' + esc(q) + '" placeholder="Search all writings / सभी ग्रन्थों में खोजें" autocomplete="off" aria-label="Search all writings"><button type="submit">Search</button></form>';
    var terms = fold(q).split(/\s+/).filter(function (t) { return t.length > 1; });
    if (!terms.length) { app.innerHTML = h + '<p class="empty">Type a word or phrase to search all ' + LIB.articles.length + ' writings, English and Hindi.</p>'; bindSearch(); return; }
    var phrase = fold(q);
    var res = [];
    LIB.articles.forEach(function (a) {
      var text = plainOf(a, TEXTS[a.id]), f = fold(text), ft = fold(a.title + ' ' + a.summary + ' ' + (a.lang === 'hi' ? a.source : ''));
      var all = terms.every(function (t) { return f.indexOf(t) >= 0 || ft.indexOf(t) >= 0; });
      if (!all) return;
      var score = 0;
      terms.forEach(function (t) { var i = 0, c = 0; while ((i = f.indexOf(t, i)) !== -1) { c++; i += t.length; } score += Math.min(c, 40); if (ft.indexOf(t) >= 0) score += 30; });
      if (terms.length > 1 && f.indexOf(phrase) >= 0) score += 50;
      res.push({ a: a, score: score, snip: snippet(text, f, terms.length > 1 && f.indexOf(phrase) >= 0 ? [phrase] : terms) });
    });
    var pref = fromHi ? 'hi' : 'en';
    res.sort(function (x, y) {
      var px = (x.a.lang || 'en') === pref ? 0 : 1, py = (y.a.lang || 'en') === pref ? 0 : 1;
      return px - py || y.score - x.score;
    });
    h += '<p class="group-count">' + (res.length ? res.length + (res.length === 1 ? ' writing mentions' : ' writings mention') + ' “' + esc(q) + '”' : 'No writing mentions “' + esc(q) + '”. Try a shorter word, or a different spelling such as Brahman or Brahmacharya.') + '</p>';
    res.forEach(function (r) {
      h += '<div class="result"><a class="t" href="#/read/' + r.a.id + '?q=' + encodeURIComponent(q) + '">' + esc(r.a.title) + '</a>' +
        (r.snip ? '<p>' + r.snip + '</p>' : '') + '<div class="m">' + (r.a.lang === 'hi' ? 'हिन्दी · ' : 'English · ') + esc(catName(r.a.cat)) + '</div></div>';
    });
    app.innerHTML = h; bindSearch();
  }
  function bindSearch() {
    document.getElementById('sf').addEventListener('submit', function (e) {
      e.preventDefault(); var v = document.getElementById('q').value.trim();
      location.hash = '#/search?q=' + encodeURIComponent(v);
    });
  }

  function viewQA(params) {
    setNav('qa'); setTitle('Questions and answers');
    var f = params.get('f') || '';
    var h = '<h1 class="pagehead">Questions and answers</h1>' +
      '<p class="qa-intro">' + QA.length + ' questions put to the Swami by students, teachers and young people. Tap a question to read the answer.</p>' +
      '<form class="searchbar" id="qf" role="search"><input id="qi" type="search" value="' + esc(f) + '" placeholder="Filter questions, e.g. God, death, friend" aria-label="Filter questions" autocomplete="off"></form><div id="qlist" class="qa"></div>';
    app.innerHTML = h;
    var list = document.getElementById('qlist');
    function draw(filter) {
      var terms = fold(filter).split(/\s+/).filter(Boolean);
      var groups = {}, order = [], shown = 0;
      QA.forEach(function (it, i) {
        if (terms.length) {
          var fq = fold(it.q.join(' ') + ' ' + it.a.join(' '));
          if (!terms.every(function (t) { return fq.indexOf(t) >= 0; })) return;
        }
        if (!groups[it.s]) { groups[it.s] = []; order.push(it.s); }
        groups[it.s].push(i); shown++;
      });
      var out = '';
      if (!shown) out = '<p class="empty">No question matches “' + esc(filter) + '”. Try one word, such as God or meditation.</p>';
      order.forEach(function (s) {
        var a = byId[s];
        out += '<h2 class="group">' + esc(a.title) + '</h2><p class="group-count">' + esc(a.source) + '</p>';
        groups[s].forEach(function (i) {
          var it = QA[i];
          out += '<details><summary>' + it.q.map(function (x) { return '<span>' + esc(x) + '</span>'; }).join('') + '</summary><div class="ans text">' +
            render(it.a.join('\n\n'), a) + '<p class="src"><a href="#/read/' + a.id + '?q=' + encodeURIComponent(it.q[0].split(' ').slice(0, 5).join(' ')) + '">Read in the full text</a></p></div></details>';
        });
      });
      list.innerHTML = out;
    }
    draw(f);
    var tmr;
    document.getElementById('qi').addEventListener('input', function (e) {
      clearTimeout(tmr); var v = e.target.value;
      tmr = setTimeout(function () { draw(v); history.replaceState(null, '', '#/qa' + (v ? '?f=' + encodeURIComponent(v) : '')); }, 150);
    });
    document.getElementById('qf').addEventListener('submit', function (e) { e.preventDefault(); });
  }

  function viewAbout() {
    setNav('about'); setTitle('About');
    var pages = LIB.articles.reduce(function (s, a) { return s + a.pages; }, 0);
    var en = LIB.articles.filter(function (a) { return a.lang !== 'hi'; }).length, hiN = LIB.articles.length - en;
    app.innerHTML = '<div class="prose"><h1>About this collection</h1>' +
      '<p>Swami Pitambarananda is a monk of the Ramakrishna Order. These writings come from his years as Secretary of the Ramakrishna Mission Ashrama, Chandigarh, and later at the Ramakrishna Kutir, Mayakund, Rishikesh.</p>' +
      '<p>The collection holds ' + en + ' pieces in English, under <a href="#/">English</a>: seminar papers, studies of the Upanishads and hymns, articles from <i>Prabuddha Bharata</i> and <i>The Vedanta Kesari</i>, letters, and many answers to questions from students and young people.</p>' +
      '<p>Another ' + hiN + ' pieces are in Hindi, under <a href="#/hi">हिन्दी</a>: talks and essays, commentaries such as the Chatuhsutri with Shankara’s Bhashya, the Narada Bhakti Sutras and notes on the Sri Ramakrishna Vachanamrita, stotras and songs with their meaning, and letters. Their text was converted from old Hindi fonts, and every Hindi piece also shows its original pages.</p>' +
      '<p>Every piece is given in full. <b>Text</b> shows the words for easy reading and searching. <b>Original pages</b> shows all ' + pages + ' pages exactly as they appear in the source documents, including verses in Sanskrit and Bengali.</p>' +
      '<p>Articles scanned from magazines were read with text recognition and then checked against the page images. If you find an error, compare with the original pages.</p>' +
      '<p>The thought for today changes every day and is always quoted word for word from one of the writings.</p></div>';
  }

  /* ---------- router ---------- */
  function route() {
    var hash = location.hash.replace(/^#/, '') || '/';
    var qi = hash.indexOf('?');
    var path = qi >= 0 ? hash.slice(0, qi) : hash;
    var params = new URLSearchParams(qi >= 0 ? hash.slice(qi + 1) : '');
    var parts = path.split('/').filter(Boolean);
    var job;
    if (parts[0] === 'read') job = Promise.all([loadLib(), loadTexts()]).then(function () { viewRead(decodeURIComponent(parts[1] || ''), params); });
    else if (parts[0] === 'search') job = Promise.all([loadLib(), loadTexts()]).then(function () { viewSearch(params); });
    else if (parts[0] === 'qa') job = Promise.all([loadLib(), loadQA()]).then(function () { viewQA(params); });
    else if (parts[0] === 'about') job = loadLib().then(viewAbout);
    else if (parts[0] === 'hi') job = loadLib().then(function () { viewHome(params, 'hi'); });
    else job = loadLib().then(function () { viewHome(params, 'en'); });
    job.then(function () {
      if (!(parts[0] === 'read' && params.get('q'))) window.scrollTo(0, 0);
    }).catch(function (e) {
      app.innerHTML = '<p class="empty">The writings could not be loaded (' + esc(e.message) + '). Check your connection and reload the page.</p>';
    });
  }
  window.addEventListener('hashchange', route);
  route();

  /* ---------- theme ---------- */
  document.getElementById('theme').addEventListener('click', function () {
    var root = document.documentElement;
    var cur = root.getAttribute('data-theme') || (matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light');
    var next = cur === 'dark' ? 'light' : 'dark';
    root.setAttribute('data-theme', next); store('theme', next);
  });
})();

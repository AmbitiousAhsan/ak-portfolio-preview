/*
 * AK notes: "Show the thinking" on Ahsan Khan's sticky notes.
 *
 * One kit shared by every demo in the portfolio, so the notes look the same wherever they turn up:
 * lime paper, tape, a Newsreader italic title and an "— AK." signature with the editor-red full stop.
 * The canonical copy lives in ak-portfolio at public/ak-notes/; demos keep an identical copy.
 *
 * Usage, anywhere on a page:
 *   <script type="application/json" id="ak-notes">{"notes":[{"target":".hero","kicker":"Brand","title":"…","body":"…"}]}</script>
 *   <script src="…/ak-notes/ak-notes.js" defer></script>
 *
 * Config: notes[] (target selector, kicker, title, body, calm?), side ("left" | "right", default left),
 * lift (px above the bottom edge, for pages with their own floating buttons), case (case-study URL;
 * defaults to the page's own "Back to the case study" link). A calm note drops the tilt and the tape,
 * for sensitive parts of a page.
 *
 * Everything the kit draws sits in shadow roots, so a demo's own CSS can't restyle the notes and the
 * notes can't leak into the demo. The font file is fetched only when a note is first shown.
 */
(function () {
  'use strict';
  var script = document.currentScript;
  var source = document.getElementById('ak-notes');
  if (!script || !source) return;
  var config;
  try { config = JSON.parse(source.textContent || '{}'); } catch (e) { return; }
  var NOTES = (config.notes || []).filter(function (n) { return n && n.target && n.title; });
  if (!NOTES.length) return;

  var STORE = 'ak-notes-on';
  var reduced = matchMedia('(prefers-reduced-motion: reduce)');
  var fontUrl = new URL('newsreader-italic.woff2', script.src).href;
  var noise = "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='160' height='160'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='.9' numOctaves='2'/%3E%3CfeColorMatrix values='0 0 0 0 .2 0 0 0 0 .25 0 0 0 0 .1 0 0 0 .12 0'/%3E%3C/filter%3E%3Crect width='160' height='160' filter='url(%23n)'/%3E%3C/svg%3E\")";
  var sans = "system-ui,-apple-system,'Segoe UI',Roboto,Arial,sans-serif";
  var serif = "'AK Notes Serif',Georgia,'Times New Roman',serif";

  var CSS = [
    ':host{all:initial}',
    '*{box-sizing:border-box}',
    'button,a{font:inherit;-webkit-tap-highlight-color:transparent}',
    ':focus-visible{outline:2px solid #273222;outline-offset:3px}',
    '.paper{background:#c9e789 ' + noise + ';color:#273222}',
    '.toggle{position:fixed;bottom:calc(20px + var(--lift,0px) + env(safe-area-inset-bottom,0px));display:inline-flex;align-items:center;gap:10px;min-height:48px;padding:10px 16px 10px 12px;border:0;cursor:pointer;font:600 15px/1 ' + sans + ';rotate:-2deg;box-shadow:0 10px 24px rgba(20,24,20,.28),0 2px 3px rgba(20,24,20,.2);transition:translate .2s,rotate .2s}',
    '.toggle.left{left:20px}.toggle.right{right:20px;rotate:2deg}',
    '.toggle:hover{translate:0 -2px;rotate:0deg}',
    '.toggle .sw{position:relative;flex:none;width:36px;height:20px;border-radius:999px;background:rgba(39,50,34,.3);transition:background .2s}',
    '.toggle .sw::after{content:"";position:absolute;left:3px;top:3px;width:14px;height:14px;border-radius:50%;background:#f6f3ec;transition:transform .2s}',
    '.toggle[aria-pressed="true"] .sw{background:#273222}',
    '.toggle[aria-pressed="true"] .sw::after{transform:translateX(16px)}',
    '.pin{display:grid;place-items:center;width:32px;height:32px;padding:0;border:0;cursor:pointer;font:700 14px/1 ' + sans + ';rotate:-6deg;clip-path:polygon(0 0,100% 0,100% 70%,70% 100%,0 100%);animation:pin-in .3s cubic-bezier(.2,.7,.2,1) both}',
    '.pin.calm{rotate:0deg}',
    '.pin[aria-expanded="true"]{background:#273222;color:#c9e789}',
    '.card{position:relative;width:min(340px,calc(100vw - 32px));padding:26px 22px 16px;rotate:-1.4deg;box-shadow:0 18px 32px rgba(20,24,20,.28),0 2px 3px rgba(20,24,20,.2);animation:card-in .28s cubic-bezier(.2,.7,.2,1) both;font:400 15px/1.55 ' + sans + '}',
    '.card.tilt-r{rotate:1.2deg}',
    '.card::before{content:"";position:absolute;top:-12px;left:50%;width:92px;height:24px;translate:-50% 0;rotate:3deg;background:rgba(246,243,236,.74);border-inline:1px dashed rgba(39,50,34,.16)}',
    '.card.calm{rotate:0deg}.card.calm::before{display:none}',
    '.kicker{margin:0;font:700 11px/1.4 ' + sans + ';letter-spacing:.14em;text-transform:uppercase;color:#34491a}',
    'h2{margin:8px 0 10px;font:italic 400 25px/1.08 ' + serif + ';letter-spacing:-.02em;color:#1d2818}',
    'p.body{margin:0;color:#2f3b28}',
    '.foot{display:flex;justify-content:space-between;align-items:center;gap:12px;margin-top:14px;padding-top:10px;border-top:1px solid rgba(39,50,34,.2)}',
    '.nav{display:flex;gap:18px}',
    '.nav button{padding:8px 0;border:0;background:none;cursor:pointer;color:#273222;font:700 14px/1 ' + sans + '}',
    '.nav button:disabled{opacity:.4;cursor:default}',
    '.sig{font:italic 400 21px/1 ' + serif + ';color:#273222;white-space:nowrap}',
    '.sig span{font-style:normal;color:#e5533d}',
    '.credit{display:block;margin-top:14px;padding:11px 13px;background:rgba(39,50,34,.1);color:#1d2818;font:700 14px/1.35 ' + sans + ';text-decoration:none}',
    '.credit:hover{background:rgba(39,50,34,.18)}',
    '@keyframes pin-in{from{opacity:0;scale:.4}to{opacity:1;scale:1}}',
    '@keyframes card-in{from{opacity:0;translate:0 8px}to{opacity:1;translate:0 0}}',
    '@media (max-width:600px){.toggle{bottom:calc(14px + var(--lift,0px) + env(safe-area-inset-bottom,0px));min-height:44px;padding:8px 12px 8px 10px;font-size:14px}.toggle.left{left:14px}.toggle.right{right:14px}}',
    '@media (prefers-reduced-motion:reduce){*{animation:none!important;transition:none!important}}'
  ].join('');

  // Page-level rules: the font face (shadow roots can't declare one) and the dashed outline on
  // whatever a note is about.
  var pageStyle = document.createElement('style');
  pageStyle.textContent =
    "@font-face{font-family:'AK Notes Serif';src:url('" + fontUrl + "') format('woff2');font-style:italic;font-weight:200 800;font-display:swap}" +
    'html.akn-on [data-akn]{outline:2px dashed rgba(229,83,61,.62)!important;outline-offset:6px!important}';
  document.head.appendChild(pageStyle);

  function shadowHost(cls) {
    var host = document.createElement('div');
    host.className = cls;
    var root = host.attachShadow({mode: 'open'});
    var style = document.createElement('style');
    style.textContent = CSS;
    root.appendChild(style);
    return {host: host, root: root};
  }
  function el(tag, cls, text) {
    var node = document.createElement(tag);
    if (cls) node.className = cls;
    if (text != null) node.textContent = text;
    return node;
  }
  // A note counts when its target takes up space and isn't visibility-hidden. Its pin shows only
  // while the target can actually be seen, so sections that fade in on scroll keep their notes and
  // gain the pin once they appear.
  function visible(node, now) {
    var r = node.getBoundingClientRect();
    if (!(r.width > 0 && r.height > 0)) return false;
    if (!node.checkVisibility) return getComputedStyle(node).visibility !== 'hidden';
    return node.checkVisibility({visibilityProperty: true, opacityProperty: !!now});
  }

  var caseHref = config['case'] || (function () {
    var links = document.querySelectorAll('a[href*="work/"]');
    for (var i = 0; i < links.length; i++) if (/\/work\/[^/]/.test(links[i].pathname)) return links[i].href;
    return '';
  })();

  // The switch.
  var toggleHost = shadowHost('akn-toggle');
  toggleHost.host.style.cssText = 'position:fixed;z-index:2147483600';
  if (config.lift) toggleHost.host.style.setProperty('--lift', config.lift + 'px');
  var toggle = el('button', 'toggle paper ' + (config.side === 'right' ? 'right' : 'left'));
  toggle.type = 'button';
  toggle.setAttribute('aria-pressed', 'false');
  var sw = el('span', 'sw'); sw.setAttribute('aria-hidden', 'true');
  toggle.append(sw, document.createTextNode(config.label || 'Show the thinking'));
  toggleHost.root.appendChild(toggle);
  document.body.appendChild(toggleHost.host);

  // Pins sit in one layer on top of the page, placed from each target's box, so a target with
  // overflow hidden can't clip them and no target's own styles change.
  var layer = document.createElement('div');
  layer.className = 'akn-layer';
  layer.style.cssText = 'position:absolute;left:0;top:0;width:0;height:0;z-index:2147483500';
  var pins = [];   // {note, target, host, button}
  var card = null; // {host, index, side}

  // A fixed or sticky bar across the top of the screen, if the page has one showing.
  function topBar() {
    var stack = document.elementsFromPoint(innerWidth / 2, 2);
    for (var i = 0; i < stack.length; i++) {
      var node = stack[i];
      if (layer.contains(node) || /^akn-/.test(node.className || '')) continue;
      for (; node && node !== document.body && node !== document.documentElement; node = node.parentElement) {
        var pos = getComputedStyle(node).position;
        if (pos === 'fixed' || pos === 'sticky') {
          var bottom = node.getBoundingClientRect().bottom;
          return bottom > 0 && bottom < innerHeight / 2 ? {el: node, bottom: bottom} : null;
        }
      }
      return null;
    }
    return null;
  }

  function place() {
    var bar = topBar();
    pins.forEach(function (p) {
      var shown = visible(p.target, true);
      p.host.style.display = shown ? '' : 'none';
      if (!shown) return;
      var r = p.target.getBoundingClientRect();
      // The pin sits on the corner of the dashed outline, mostly outside the target, so it
      // doesn't hide the end of a short line of text.
      var left = Math.min(Math.max(8, r.right - 10), document.documentElement.clientWidth - 40);
      p.host.style.left = left + scrollX + 'px';
      p.host.style.top = Math.max(8, r.top + scrollY - 22) + 'px';
      // A pin whose target has scrolled under a sticky header hides rather than float over it.
      var under = bar && !bar.el.contains(p.target) && r.top - 22 < bar.bottom;
      p.host.style.visibility = under ? 'hidden' : '';
    });
    if (card) placeCard();
  }
  // The card sits below what it describes, or above it when there's no room below, so it never
  // covers the words it's about. Only a target taller than the screen gets the card on top of it.
  function chooseSide(target, height) {
    var r = target.getBoundingClientRect();
    var bar = topBar();
    if (r.bottom + 16 + height <= innerHeight - 12) return 'below';
    if (r.top - 16 - height >= (bar ? bar.bottom : 0) + 12) return 'above';
    return 'over';
  }
  function placeCard() {
    var pin = pins[card.index];
    var p = pin.host.getBoundingClientRect();
    var t = pin.target.getBoundingClientRect();
    var width = card.host.offsetWidth || 340;
    var height = card.host.offsetHeight || 240;
    var vw = document.documentElement.clientWidth;
    card.host.style.left = Math.max(16, Math.min(p.right - width, vw - width - 16)) + scrollX + 'px';
    var top = card.side === 'below' ? t.bottom + 16 : card.side === 'above' ? t.top - 16 - height : p.bottom + 12;
    card.host.style.top = top + scrollY + 'px';
  }
  // Bring a note's target to the upper part of the screen, below any sticky header, leaving room
  // for its card. Scrolls the window directly, so a page's own scroll margins don't move it.
  function bringIntoView(target) {
    var r = target.getBoundingClientRect();
    var bar = topBar();
    var room = Math.max((bar ? bar.bottom : 0) + 48, innerHeight * 0.22);
    var y = r.height + 300 < innerHeight - room ? r.top + scrollY - room : r.top + scrollY - Math.max(room, (innerHeight - r.height) / 2);
    y = Math.max(0, Math.min(y, document.documentElement.scrollHeight - innerHeight));
    if (Math.abs(y - scrollY) < 2) return false;
    scrollTo({top: y, behavior: reduced.matches ? 'auto' : 'smooth'});
    return true;
  }
  // Run once the scroll has settled, so the card is placed where the target ends up.
  function afterScroll(fn) {
    var done = false;
    var go = function () { if (done) return; done = true; removeEventListener('scrollend', go); fn(); };
    if ('onscrollend' in window) addEventListener('scrollend', go);
    setTimeout(go, 'onscrollend' in window ? 1200 : 650);
  }
  var queued = false;
  function schedule() { if (queued) return; queued = true; requestAnimationFrame(function () { queued = false; place(); }); }
  // Layout can move under the pins without a scroll or resize (images, fonts, opened panels).
  var watcher = 'ResizeObserver' in window ? new ResizeObserver(schedule) : null;

  function closeCard(focusPin) {
    if (!card) return;
    var index = card.index;
    card.host.remove();
    card = null;
    var pin = pins[index];
    if (pin) { pin.button.setAttribute('aria-expanded', 'false'); if (focusPin) pin.button.focus(); }
  }

  function openCard(index, scroll) {
    closeCard(false);
    var pin = pins[index];
    if (!pin) return;
    var show = function () {
      place();
      var note = pin.note;
      var last = index === pins.length - 1;
      var h = shadowHost('akn-card');
      h.host.style.cssText = 'position:absolute;z-index:2147483601';
      var box = el('section', 'card paper' + (note.calm ? ' calm' : index % 2 ? ' tilt-r' : ''));
      box.setAttribute('role', 'dialog');
      box.setAttribute('aria-label', 'Design note ' + (index + 1) + ': ' + note.title);
      box.appendChild(el('p', 'kicker', (index + 1) + ' of ' + pins.length + (note.kicker ? ' · ' + note.kicker : '')));
      box.appendChild(el('h2', '', note.title));
      box.appendChild(el('p', 'body', note.body));
      var foot = el('div', 'foot');
      var nav = el('div', 'nav');
      var prev = el('button', '', '← Previous'); prev.type = 'button'; prev.disabled = index === 0;
      var next = el('button', '', last ? 'Done' : 'Next →'); next.type = 'button';
      prev.addEventListener('click', function () { openCard(index - 1, true); });
      next.addEventListener('click', function () { last ? closeCard(true) : openCard(index + 1, true); });
      nav.append(prev, next);
      var sig = el('span', 'sig', '— AK');
      var stop = el('span', '', '.'); sig.appendChild(stop);
      foot.append(nav, sig);
      box.appendChild(foot);
      if (last && caseHref) {
        var credit = el('a', 'credit', 'Built by Ahsan Khan. See how it was made →');
        credit.href = caseHref;
        box.appendChild(credit);
      }
      h.root.appendChild(box);
      h.host.style.visibility = 'hidden';
      document.body.appendChild(h.host);
      card = {host: h.host, index: index, side: chooseSide(pin.target, h.host.offsetHeight)};
      placeCard();
      h.host.style.visibility = '';
      pin.button.setAttribute('aria-expanded', 'true');
      next.focus({preventScroll: true});
    };
    if (scroll) {
      if (bringIntoView(pin.target) && !reduced.matches) afterScroll(show);
      else show();
    } else show();
  }

  function enable(tour) {
    document.documentElement.classList.add('akn-on');
    document.body.appendChild(layer);
    var n = 0;
    NOTES.forEach(function (note) {
      var target = document.querySelector(note.target);
      if (!target || !visible(target)) return;
      target.setAttribute('data-akn', '');
      var h = shadowHost('akn-pin');
      h.host.style.cssText = 'position:absolute;filter:drop-shadow(0 4px 6px rgba(20,24,20,.3))';
      var button = el('button', 'pin paper' + (note.calm ? ' calm' : ''), String(++n));
      button.type = 'button';
      button.setAttribute('aria-label', 'Design note ' + n + ': ' + note.title);
      button.setAttribute('aria-expanded', 'false');
      var order = pins.length;
      button.addEventListener('click', function () { card && card.index === order ? closeCard(true) : openCard(order, false); });
      h.root.appendChild(button);
      layer.appendChild(h.host);
      pins.push({note: note, target: target, host: h.host, button: button});
    });
    place();
    if (watcher) { watcher.observe(document.body); pins.forEach(function (p) { watcher.observe(p.target); }); }
    addEventListener('scroll', schedule, {passive: true});
    addEventListener('resize', schedule);
    // Sections that fade in finish after the scroll that triggered them; check again when they do.
    document.addEventListener('transitionend', schedule, true);
    document.addEventListener('animationend', schedule, true);
    if (tour && pins.length) openCard(0, true);
  }

  function disable() {
    closeCard(false);
    document.documentElement.classList.remove('akn-on');
    pins.forEach(function (p) { p.target.removeAttribute('data-akn'); });
    pins = [];
    layer.textContent = '';
    layer.remove();
    if (watcher) watcher.disconnect();
    removeEventListener('scroll', schedule);
    removeEventListener('resize', schedule);
    document.removeEventListener('transitionend', schedule, true);
    document.removeEventListener('animationend', schedule, true);
  }

  function set(on, tour) {
    toggle.setAttribute('aria-pressed', String(on));
    on ? enable(tour) : disable();
    try { on ? sessionStorage.setItem(STORE, '1') : sessionStorage.removeItem(STORE); } catch (e) {}
  }

  toggle.addEventListener('click', function () { set(toggle.getAttribute('aria-pressed') !== 'true', true); });
  document.addEventListener('keydown', function (e) { if (e.key === 'Escape' && card) closeCard(true); });
  document.addEventListener('click', function (e) {
    if (!card) return;
    var path = e.composedPath ? e.composedPath() : [];
    // Clicks inside any note, pin or the switch are the kit's own (a card may already have been
    // replaced by the next one), so only clicks elsewhere on the page close the card.
    if (path.some(function (n) { return n && typeof n.className === 'string' && /^akn-/.test(n.className); })) return;
    closeCard(false);
  });

  // Moving between pages of the same demo keeps the notes on, without restarting the tour.
  var resume = false;
  try { resume = sessionStorage.getItem(STORE) === '1'; } catch (e) {}
  if (resume) {
    if (document.readyState === 'complete') set(true, false);
    else addEventListener('load', function () { set(true, false); }, {once: true});
  }
})();

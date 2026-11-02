// Cedarline Care: page interactions. All state lives in this page's memory or its URL; nothing is sent or stored.
(() => {
  const $ = (s, r = document) => r.querySelector(s), $$ = (s, r = document) => [...r.querySelectorAll(s)];
  const reduced = () => matchMedia('(prefers-reduced-motion: reduce)').matches;
  const data = (el) => { try { return JSON.parse(el.textContent); } catch { return null; } };
  const make = (tag, cls, text) => { const n = document.createElement(tag); if (cls) n.className = cls; if (text != null) n.textContent = text; return n; };
  const press = (btns, on) => btns.forEach(b => b.setAttribute('aria-pressed', String(b === on)));
  const focusEl = (el) => { if (!el) return; if (!el.hasAttribute('tabindex')) el.tabIndex = -1; el.focus({preventScroll: true}); };
  const bringIntoView = (el) => { const r = el.getBoundingClientRect(); if (r.top < 90 || r.top > innerHeight * .6) el.scrollIntoView({block: 'start', behavior: reduced() ? 'auto' : 'smooth'}); };
  const status = (t) => { const s = $('#global-status'); if (s) s.textContent = t; };

  // ---- patient view / clinic owner view, carried between pages as ?view=clinic ----
  const root = document.documentElement;
  const isClinic = () => root.classList.contains('view-clinic');
  const internal = (a) => { const h = a.getAttribute('href'); return h && !/^(?:[a-z]+:|#|\/\/)/i.test(h) && !h.startsWith('/work/') && !h.startsWith('/privacy/') && !h.startsWith('fonts/'); };
  const withView = (href) => {
    const [base, hash = ''] = href.split('#'), [p, q = ''] = base.split('?'), params = new URLSearchParams(q);
    if (isClinic()) params.set('view', 'clinic'); else params.delete('view');
    const qs = params.toString();
    return p + (qs ? '?' + qs : '') + (hash ? '#' + hash : '');
  };
  const syncLinks = () => $$('a[href]').forEach(a => { if (internal(a)) a.setAttribute('href', withView(a.getAttribute('href'))); });
  const setView = (clinic, announce) => {
    root.classList.toggle('view-clinic', clinic);
    $$('[data-view]').forEach(b => b.setAttribute('aria-pressed', String((b.dataset.view === 'clinic') === clinic)));
    syncLinks();
    try { history.replaceState(null, '', withView(location.pathname.split('/').pop() + location.search + location.hash)); } catch {}
    if (announce) status(clinic ? `Clinic owner view: ${$$('.owner-note').length} notes on this page.` : 'Patient view.');
  };
  $$('[data-view]').forEach(b => b.addEventListener('click', () => setView(b.dataset.view === 'clinic', true)));
  setView(isClinic(), false);

  // ---- phone menu ----
  const menu = $('.menu-btn'), nav = $('#site-nav');
  if (menu && nav) {
    const set = (open) => { menu.setAttribute('aria-expanded', String(open)); nav.classList.toggle('open', open); $('.menu-word', menu).textContent = open ? 'Close' : 'Menu'; };
    menu.addEventListener('click', () => set(menu.getAttribute('aria-expanded') !== 'true'));
    document.addEventListener('keydown', (e) => { if (e.key === 'Escape' && menu.getAttribute('aria-expanded') === 'true') { set(false); menu.focus(); } });
    matchMedia('(min-width: 1021px)').addEventListener('change', (m) => { if (m.matches) set(false); });
  }

  // ---- call panel (header button on wide screens, bottom bar on phones) ----
  const callBtns = $$('.call-btn, [data-call]'), callPanel = $('#call-panel');
  if (callBtns.length && callPanel) {
    let opener = callBtns[0];
    const set = (open, focus) => { callBtns.forEach(b => b.setAttribute('aria-expanded', String(open))); callPanel.hidden = !open; callPanel.classList.toggle('from-bar', open && opener.classList.contains('call-bar')); if (open) focusEl($('.cp-title', callPanel)); else if (focus) opener.focus(); };
    callBtns.forEach(b => b.addEventListener('click', () => { opener = b; set(callPanel.hidden); }));
    $('[data-call-close]', callPanel).addEventListener('click', () => set(false, true));
    document.addEventListener('keydown', (e) => { if (e.key === 'Escape' && !callPanel.hidden) set(false, true); });
    document.addEventListener('click', (e) => { if (!callPanel.hidden && !callPanel.contains(e.target) && !callBtns.some(b => b.contains(e.target))) set(false); });
  }

  // ---- "Which door?" sits behind the last "What brings you in?" tile ----
  const wdSection = $('[data-chooser-section]');
  if (wdSection) {
    const opens = $$('[data-open-chooser]');
    const open = (focus) => { wdSection.hidden = false; opens.forEach(o => o.setAttribute('aria-expanded', 'true')); if (focus) { wdSection.scrollIntoView({block: 'start', behavior: reduced() ? 'auto' : 'smooth'}); focusEl($('#wd-title')); } };
    opens.forEach(o => { o.setAttribute('aria-controls', 'which-door'); o.setAttribute('aria-expanded', 'false'); o.addEventListener('click', (ev) => { ev.preventDefault(); open(true); }); });
    if (location.hash === '#which-door') open(false); else wdSection.hidden = true;
    window.addEventListener('hashchange', () => { if (location.hash === '#which-door') open(true); });
  }

  // ---- "Which door?" chooser ----
  const chooser = $('[data-chooser]'), chooserData = $('#chooser-data');
  if (chooser && chooserData) {
    const cfg = data(chooserData), track = $$('[data-track]'), live = $('[data-wd-status]', chooser);
    const state = {need: null};
    const setTrack = (i, answer) => { $('[data-track-a]', track[i]).textContent = answer || 'Not answered'; };
    const marks = (current) => track.forEach((li, i) => { li.classList.toggle('is-current', i === current); li.classList.toggle('is-done', $('[data-track-a]', li).textContent !== 'Not answered' && i !== current); });
    const show = (key, current) => {
      $$('[data-wd]', chooser).forEach(s => { s.hidden = s.dataset.wd !== String(key); });
      marks(current);
      focusEl($$('.wd-q, h3', $(`[data-wd="${key}"]`, chooser)).find(h => !h.closest('[hidden]')));
      bringIntoView(chooser);
    };
    const reset = () => {
      state.need = null; [0, 1, 2].forEach(i => setTrack(i));
      $$('[aria-pressed]', chooser).forEach(b => b.setAttribute('aria-pressed', 'false'));
      show(0, 0); live.textContent = 'Chooser restarted. Question 1 of 3: is this an emergency?';
    };
    $$('[data-emerg]', chooser).forEach(b => b.addEventListener('click', () => {
      press($$('[data-emerg]', chooser), b);
      if (b.dataset.emerg === 'yes') {
        setTrack(0, 'Yes: call 911'); setTrack(1); setTrack(2);
        show('sos', -1); track[0].classList.add('is-current');
        live.textContent = 'Call 911 now. This website cannot help in an emergency.';
      } else { setTrack(0, 'No'); show(1, 1); live.textContent = 'Question 2 of 3: what is the visit about?'; }
    }));
    $$('[data-need]', chooser).forEach(b => b.addEventListener('click', () => {
      press($$('[data-need]', chooser), b);
      state.need = cfg.needs.find(n => n.id === b.dataset.need);
      setTrack(1, state.need.label); setTrack(2);
      $$('[data-detail]', chooser).forEach(d => { d.hidden = d.dataset.detail !== state.need.id; $$('[data-option]', d).forEach(o => o.setAttribute('aria-pressed', 'false')); });
      show(2, 2); live.textContent = 'Question 3 of 3: ' + state.need.q;
    }));
    $$('[data-option]', chooser).forEach(b => b.addEventListener('click', () => {
      const need = state.need, opt = need.options.find(o => o.id === b.dataset.option);
      press($$('[data-option]', b.parentElement), b);
      setTrack(2, opt.label);
      const box = $('[data-wd-result]', chooser); box.replaceChildren();
      const ticket = make('div', 'ticket');
      const plate = make('div', `ticket-plate ticket-${need.line}`, need.door); plate.setAttribute('aria-hidden', 'true'); plate.append(make('small', '', 'Door'));
      const body = make('div');
      body.append(make('p', 'ticket-kicker', `Your door · ${need.line === 'today' ? 'Today line' : 'Ongoing line'}`), make('h3', '', `Door ${need.door}: ${need.name}`));
      const cols = make('div', 'ticket-cols');
      const bring = make('div'); bring.append(make('h4', '', 'What to bring'));
      const ul = make('ul'); need.bring.forEach(x => ul.append(make('li', '', x))); ul.append(make('li', 'is-extra', opt.bring)); bring.append(ul);
      const next = make('div'); next.append(make('h4', '', 'What happens next'));
      const ol = make('ol'); need.expect.forEach((x, i) => { const li = make('li'); li.append(make('span', '', String(i + 1)), make('span', '', x)); ol.append(li); }); next.append(ol);
      cols.append(bring, next); body.append(cols);
      const ask = make('p', 'ticket-ask'); ask.append(make('strong', '', 'One more thing to ask: '), document.createTextNode(opt.next)); body.append(ask);
      ticket.append(plate, body); box.append(ticket);
      const door = $('[data-wd-door]', chooser);
      door.setAttribute('href', withView(need.service + '.html')); door.firstChild.textContent = `Go to Door ${need.door}`;
      $('[data-wd-plan]', chooser).setAttribute('href', withView(`visit.html?service=${need.service}&source=chooser${opt.note ? '&note=' + opt.note : ''}`));
      show(3, -1);
      live.textContent = `Door ${need.door}: ${need.name}. What to bring and what happens next are shown.`;
    }));
    $$('[data-wd-back]', chooser).forEach(b => b.addEventListener('click', () => { const to = Number(b.dataset.wdBack); show(to, to); }));
    $$('[data-wd-restart]', chooser).forEach(b => b.addEventListener('click', reset));
  }

  // ---- hours boards ----
  $$('[data-hours]').forEach(board => {
    const cfg = data($('script[type="application/json"]', board)); if (!cfg) return;
    let place = Number(board.dataset.place) || 0, day = 0;
    const closed = (t) => /^(Closed|At )/.test(t);
    const render = () => {
      const p = cfg.hours[place];
      $('[data-hb-caption]', board).textContent = `${p.place} · ${cfg.days[day]}`;
      $$('.hb-row', board).forEach((row, i) => {
        const r = p.rows[i], t = $('[data-hb-time]', row);
        t.textContent = r.times[day]; t.classList.toggle('is-closed', closed(r.times[day]));
        $('[data-hb-access]', row).textContent = closed(r.times[day]) && r.times[day] === 'Closed' ? 'Closed today' : r.access;
        if (!reduced()) { t.classList.remove('is-flip'); void t.offsetWidth; t.style.animationDelay = (i * 60) + 'ms'; t.classList.add('is-flip'); }
      });
    };
    $$('[data-hb-place]', board).forEach(b => b.addEventListener('click', () => { place = Number(b.dataset.hbPlace); press($$('[data-hb-place]', board), b); render(); }));
    $$('[data-hb-day]', board).forEach(b => b.addEventListener('click', () => { day = Number(b.dataset.hbDay); press($$('[data-hb-day]', board), b); render(); }));
    render();
  });

  // ---- wayfinding map ----
  const map = $('[data-map]');
  if (map) {
    const pins = $$('[data-map-pin]', map), btns = $$('[data-map-pick]', map);
    const pick = (i) => { press(btns, btns[i]); pins.forEach((p, k) => p.classList.toggle('is-on', k === i)); $$('[data-map-detail]', map).forEach((d, k) => { d.hidden = k !== i; }); };
    btns.forEach((b, i) => b.addEventListener('click', () => { pick(i); status(`${$('strong', b).textContent} highlighted on the map.`); }));
    pick(0);
  }

  // ---- cost question list ----
  const qList = $('[data-q-list]');
  if (qList) {
    const picked = new Set(), live = $('[data-q-status]');
    const text = (id) => { const el = $(`[data-q="${id}"]`); return ($('.surprise-q', el) || $('p', el)).textContent; };
    const render = () => {
      qList.replaceChildren();
      const ids = [...picked].sort();
      if (!ids.length) qList.append(make('li', 'desklist-empty', 'Add questions from the board. They stay on this page only.'));
      ids.forEach(id => qList.append(make('li', '', text(id))));
      $('[data-q-count]').textContent = String(ids.length);
      document.body.classList.toggle('has-picks', ids.length > 0);
    };
    $$('[data-q-add]').forEach(b => b.addEventListener('click', () => {
      const id = b.dataset.qAdd, on = !picked.has(id);
      on ? picked.add(id) : picked.delete(id);
      b.setAttribute('aria-pressed', String(on)); b.closest('[data-q]').classList.toggle('is-picked', on);
      render(); live.textContent = `${on ? 'Added' : 'Removed'} question ${id}. ${picked.size} on your list.`;
    }));
  }

  // ---- print + download ----
  $$('[data-print]').forEach(b => b.addEventListener('click', () => window.print()));
  const download = $('[data-download]'), guideData = $('#guide-data');
  if (download && guideData) download.addEventListener('click', () => {
    const g = data(guideData); let n = 0;
    const body = g.groups.map(grp => `${grp.title.toUpperCase()}\n${grp.items.map(x => `${++n}. ${x}`).join('\n')}`).join('\n\n');
    const text = `${g.brand}\n${g.title}\n${'='.repeat(g.title.length)}\n\n${body}\n\nWHAT TO SAY WHEN YOU CALL\n${g.call}\n\nEmergency? Call 911.\nFictional portfolio concept. General visit preparation, not medical advice. No appointment is created.\n`;
    const url = URL.createObjectURL(new Blob([text], {type: 'text/plain;charset=utf-8'})), a = document.createElement('a');
    a.href = url; a.download = `cedarline-${download.dataset.download}-guide.txt`; document.body.append(a); a.click(); a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
    $('#download-status').textContent = 'Your guide is ready. The download contains only this general guide.';
  });

  // ---- visit planner ----
  const planner = $('[data-planner]'), bookingData = $('#booking-data');
  if (planner && bookingData) {
    const cfg = data(bookingData), params = new URLSearchParams(location.search), live = $('#planner-status');
    const platforms = {instagram: 'Instagram', facebook: 'Facebook', linkedin: 'LinkedIn', tiktok: 'TikTok'};
    const preset = cfg.services.some(s => s.id === params.get('service')) ? params.get('service') : null;
    const defaults = () => ({
      service: preset,
      location: ['0', '1'].includes(params.get('location')) ? params.get('location') : (preset === 'urgent-care' ? '0' : null),
      time: null,
      note: cfg.notes.some(n => n.id === params.get('note')) ? params.get('note') : null,
    });
    let state = defaults(), step = 0;
    const first = preset ? 1 : 0, total = 4 - first;
    if (preset) {
      $('h1').textContent = 'Plan a sample visit in three taps.';
      $$('[data-vp-step]', planner).forEach(s => { const i = Number(s.dataset.vpStep); if (i < 4) { $('[data-vp-num]', s).textContent = String(i - first + 1); $('[data-vp-total]', s).textContent = String(total); } });
    }
    const source = params.get('source'), guide = cfg.guides.find(g => g.id === source);
    const sourceText = guide ? `From the guide: ${guide.title}` : platforms[source] ? `From Cedarline on ${platforms[source]}` : source === 'chooser' ? 'From “Which door?”' : params.get('context') === 'costs' ? 'From the costs page' : '';
    const service = () => cfg.services.find(s => s.id === state.service);
    if (sourceText || preset) { const s = $('[data-vp-source]'); s.textContent = [sourceText, preset ? `Door ${service().door} already chosen: ${service().name}` : ''].filter(Boolean).join(' · '); s.hidden = false; }
    const sync = () => {
      $$('[data-vp]', planner).forEach(b => b.setAttribute('aria-pressed', String(state[b.dataset.vp] === b.dataset.value)));
      $('[data-vp-desc]', planner).textContent = service() ? `Door ${service().door}: ${service().intro}` : 'Choose a door to continue.';
    };
    const handoff = () => {
      const s = service(), place = cfg.locations[Number(state.location)], note = cfg.notes.find(n => n.id === state.note);
      const box = $('[data-vp-summary]', planner); box.replaceChildren();
      const door = make('div', `summary-door summary-${s.line}`, s.door); door.setAttribute('aria-hidden', 'true'); door.append(make('small', '', 'Door'));
      const dl = make('dl');
      [['Visit', `Door ${s.door} · ${s.name}`], ['Place', place], ['Time', state.time + ' (a preference)'], ['Note', note.label], ['Read by', s.handoff.split(' → ')[0]]].forEach(([k, v]) => dl.append(make('dt', '', k), make('dd', '', v)));
      box.append(door, dl);
      const list = $('[data-vp-next-list]', planner); list.replaceChildren();
      const lines = [
        `The ${s.handoff.split(' → ')[0].toLowerCase()} at ${place} checks that ${place} offers Door ${s.door}${s.id === 'urgent-care' && state.location === '1' ? ' (it doesn’t: urgent care is at Market Street)' : ''}.`,
        state.note === 'new' ? 'You get a registration link first, then an actual time.' : state.note === 'urgent' ? 'They pull the notes from your urgent care visit before offering a time.' : state.note === 'same' ? 'They look for a time with the clinician you saw last.' : 'They offer an actual time and note that you may need a work or school note.',
        `Bring: ${s.bring.slice(0, 2).join('; ').toLowerCase()}.`,
      ];
      lines.forEach(t => list.append(make('li', '', t)));
    };
    const missing = (n) => ({0: 'service', 1: 'location', 2: 'time', 3: 'note'})[n];
    const show = (n, quiet = false) => {
      step = n;
      $$('[data-vp-step]', planner).forEach(p => { p.hidden = Number(p.dataset.vpStep) !== n; });
      $$('[data-vp-progress]', planner).forEach(li => { const k = Number(li.dataset.vpProgress); li.classList.toggle('is-done', k < n); li.classList.toggle('is-skipped', k < first); if (k === n) li.setAttribute('aria-current', 'step'); else li.removeAttribute('aria-current'); });
      if (n === 4) handoff();
      if (quiet) return;
      focusEl($(`[data-vp-step="${n}"] h2`, planner)); bringIntoView($('.vp-progress', planner));
      live.textContent = n === 4 ? 'Sample only. Nothing was sent.' : `Step ${n - first + 1} of ${total}.`;
    };
    $$('[data-vp]', planner).forEach(b => b.addEventListener('click', () => { state[b.dataset.vp] = b.dataset.value; sync(); }));
    $$('[data-vp-next]', planner).forEach(b => b.addEventListener('click', () => {
      const need = missing(step);
      if (need && !state[need]) { live.textContent = 'Choose one option to continue.'; focusEl($(`[data-vp-step="${step}"] [data-vp]`, planner)); return; }
      show(Math.min(4, step + 1));
    }));
    $$('[data-vp-back]', planner).forEach(b => b.addEventListener('click', () => show(Math.max(0, step - 1))));
    $('[data-vp-reset]', planner).addEventListener('click', () => { state = defaults(); sync(); show(first); });
    sync(); show(first, true);
  }
})();

// Shared channel previews (social-kit): post viewers, carousels, captioned players, follow/like/save.
// Everything lives in page memory; nothing is stored or sent.
(() => {
 const all = (s, r = document) => [...r.querySelectorAll(s)];
 const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
 const say = (el, t) => { const box = el.closest('[data-sx-post]'); const st = box && box.querySelector('[data-sx-status]'); if (st) st.textContent = t; };
 const toggle = b => { const on = b.getAttribute('aria-pressed') !== 'true'; b.setAttribute('aria-pressed', String(on)); return on; };
 // Follow buttons: per page, nothing is stored.
 all('[data-sx-follow]').forEach(b => { const base = b.textContent; b.addEventListener('click', () => { const on = toggle(b); b.textContent = on ? (base.startsWith('+') ? '✓ Following' : 'Following') : base; const st = document.querySelector('[data-sx-follow-status]'); if (st) st.textContent = on ? 'Following in this preview only. There is no real account.' : 'Unfollowed in this preview.'; }); });
 all('[data-sx-like]').forEach(b => b.addEventListener('click', () => say(b, toggle(b) ? 'Liked in this preview. No count is kept.' : 'Like removed.')));
 all('[data-sx-save]').forEach(b => b.addEventListener('click', () => say(b, toggle(b) ? 'Saved while this page is open.' : 'Removed from saved.')));
 all('[data-sx-say]').forEach(b => b.addEventListener('click', () => say(b, b.dataset.sxSay)));
 // Carousels: one slide visible, arrows, dots and a page count.
 all('[data-sx-car]').forEach(car => {
  const slides = all('.sx-slides>li', car), dots = all('.sx-dots span', car), prev = car.querySelector('[data-sx-prev]'), next = car.querySelector('[data-sx-next]'), count = car.querySelector('[data-sx-count]');
  if (!prev) return;
  const word = count.textContent.split(' ')[0]; let i = 0;
  const show = () => { slides.forEach((s, j) => { s.hidden = j !== i; }); dots.forEach((d, j) => d.classList.toggle('on', j === i)); count.textContent = `${word} ${i + 1} of ${slides.length}`; prev.disabled = i === 0; next.disabled = i === slides.length - 1; };
  prev.addEventListener('click', () => { if (i > 0) { i--; show(); } if (prev.disabled) next.focus(); });
  next.addEventListener('click', () => { if (i < slides.length - 1) { i++; show(); } if (next.disabled) prev.focus(); });
  car.addEventListener('keydown', ev => { if (ev.key === 'ArrowRight') next.click(); if (ev.key === 'ArrowLeft') prev.click(); });
 });
 // Captioned storyboards: play shows each caption in turn, made to be watched with the sound off.
 const players = all('[data-sx-frames]').map(pl => {
  const frames = JSON.parse(pl.dataset.sxFrames), cap = pl.querySelector('[data-sx-frame]'), bar = pl.querySelector('[data-sx-progress]'), btn = pl.querySelector('[data-sx-play]'), lab = btn.querySelector('span');
  let t = null, k = 0;
  const step = () => { cap.textContent = frames[k]; bar.style.width = ((k + 1) / frames.length * 100) + '%'; };
  const stop = () => { clearInterval(t); t = null; btn.setAttribute('aria-pressed', 'false'); lab.textContent = 'Play captions'; };
  btn.addEventListener('click', () => {
   if (t) { stop(); say(btn, 'Paused.'); return; }
   btn.setAttribute('aria-pressed', 'true'); lab.textContent = 'Pause'; k = 0; step(); say(btn, 'Playing the captioned storyboard.');
   t = setInterval(() => { k++; if (k >= frames.length) { stop(); k = 0; say(btn, 'Finished.'); return; } step(); }, reduce ? 4200 : 2600);
  });
  step();
  return {pl, stop};
 });
 // Post viewers: tiles open a modal dialog, like the platforms' own post view.
 all('[data-sx-open]').forEach(b => b.addEventListener('click', () => { const d = document.getElementById(b.dataset.sxOpen); if (d && d.showModal) d.showModal(); }));
 all('dialog.sx-dialog').forEach(d => {
  d.querySelectorAll('[data-sx-close]').forEach(c => c.addEventListener('click', () => d.close()));
  d.addEventListener('click', ev => { if (ev.target === d) d.close(); });
  d.addEventListener('close', () => players.filter(p => d.contains(p.pl)).forEach(p => p.stop()));
 });
})();

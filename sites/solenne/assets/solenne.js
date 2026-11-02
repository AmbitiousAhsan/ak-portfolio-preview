// Solenne Skin. Every state here lives in page memory; the only thing carried between pages is the
// door, as ?door= in the link itself.
(() => {
  const $ = (s, r = document) => r.querySelector(s), $$ = (s, r = document) => [...r.querySelectorAll(s)];
  const body = document.body, params = new URLSearchParams(location.search);
  const say = (text, id = 'sol-status') => { const el = document.getElementById(id); if (el) { el.textContent = ''; requestAnimationFrame(() => { el.textContent = text; }); } };
  const calm = () => matchMedia('(prefers-reduced-motion: reduce)').matches;

  // ---- Phone menu ----
  const menu = $('.menu-toggle'), nav = $('#site-nav');
  const setMenu = open => { menu.setAttribute('aria-expanded', String(open)); nav.classList.toggle('open', open); $('.mt-label', menu).textContent = open ? 'Close' : 'Menu'; };
  menu?.addEventListener('click', () => setMenu(menu.getAttribute('aria-expanded') !== 'true'));
  document.addEventListener('keydown', e => { if (e.key === 'Escape' && menu?.getAttribute('aria-expanded') === 'true') { setMenu(false); menu.focus(); } });

  // ---- The door switch ----
  const DOORS = ['medical', 'cosmetic', 'both'];
  const STATUS = {
    medical: 'Showing medical care only: what a visit for a skin concern involves, what insurance usually covers and how to prepare.',
    cosmetic: 'Showing cosmetic care only: what a consultation involves, what insurance usually does not cover and how to prepare.',
    both: 'Showing both kinds of care, side by side and kept apart.',
  };
  const SHORT = {medical: 'Medical care only', cosmetic: 'Cosmetic care only', both: 'Both, side by side'};
  const pageDoor = $('.kit-article') ? 'both' : (body.dataset.pageDoor || 'both');
  const links = $$('a[href]').filter(l => { const h = l.getAttribute('href'); return /^[a-z0-9-]+\.html/i.test(h); });
  links.forEach(l => { l.dataset.base = l.getAttribute('href'); });
  // A door the visitor chose (here, or on an earlier page) travels with every internal link.
  let explicit = DOORS.includes(params.get('door'));
  let door = explicit ? params.get('door') : pageDoor;

  // The owner view travels the same way, as ?view=clinic.
  let view = params.get('view') === 'clinic' ? 'clinic' : 'patient';
  function carry() {
    links.forEach(l => {
      const base = l.dataset.base, [path, hash = ''] = base.split('#'), add = [];
      if (explicit && !/[?&]door=/.test(path)) add.push('door=' + door);
      if (view === 'clinic' && !/[?&]view=/.test(path)) add.push('view=clinic');
      l.setAttribute('href', add.length ? `${path}${path.includes('?') ? '&' : '?'}${add.join('&')}${hash ? '#' + hash : ''}` : base);
    });
  }
  function syncUrl() {
    const url = new URL(location.href);
    if (explicit) url.searchParams.set('door', door); else url.searchParams.delete('door');
    if (view === 'clinic') url.searchParams.set('view', 'clinic'); else url.searchParams.delete('view');
    history.replaceState(null, '', url.pathname + url.search + url.hash);
  }
  function setView(next, announce = true) {
    view = next; body.dataset.view = view;
    $$('[data-view-set]').forEach(b => b.setAttribute('aria-pressed', String(b.dataset.viewSet === view)));
    carry(); syncUrl();
    if (announce) { const n = $$('.owner-note').length; say(view === 'clinic' ? `Clinic owner view: ${n} numbered notes on what each part of this page does for the practice.` : 'Patient view.'); }
  }
  $$('[data-view-set]').forEach(b => b.addEventListener('click', () => setView(b.dataset.viewSet)));
  function setDoor(next, {announce = true, scroll = false} = {}) {
    door = next;
    body.dataset.door = door;
    $$('[data-door-set]').forEach(b => b.setAttribute('aria-pressed', String(b.dataset.doorSet === door)));
    const status = $('#door-status'); if (status) status.textContent = SHORT[door];
    if (announce) say(STATUS[door]);
    // On the contents page, the menu item for the open door is the current page.
    if (body.classList.contains('p-contents')) $$('[data-nav="medical"],[data-nav="cosmetic"]').forEach(a => { if (a.dataset.nav === door) a.setAttribute('aria-current', 'page'); else a.removeAttribute('aria-current'); });
    carry(); syncUrl();
    document.dispatchEvent(new CustomEvent('solenne:door', {detail: door}));
    if (scroll) $('#doors')?.scrollIntoView({behavior: calm() ? 'auto' : 'smooth', block: 'start'});
  }
  document.addEventListener('click', e => {
    const b = e.target.closest('[data-door-set]'); if (!b) return;
    // Pressing the open door again on a home door card goes back to both.
    const next = b.dataset.doorSet === door && b.closest('.door') ? 'both' : b.dataset.doorSet;
    explicit = true;
    body.classList.add('door-turning'); setTimeout(() => body.classList.remove('door-turning'), 700);
    setDoor(next, {scroll: !!b.closest('.door')});
  });
  setDoor(door, {announce: false});
  setView(view, false);

  // ---- Call panel and Book menu (header and the phone action bar) ----
  const calls = $$('.btn-call, [data-call]'), panel = $('#call-panel'), book = $('.btn-book[aria-controls]'), bookMenu = $('#book-menu');
  let opener = null;
  const setCall = (open, from) => { calls.forEach(c => c.setAttribute('aria-expanded', String(open))); panel.hidden = !open; panel.classList.toggle('from-bar', !!from?.closest('.mobile-actions')); if (open) { opener = from; panel.querySelector('button').focus(); } };
  calls.forEach(c => c.addEventListener('click', () => setCall(c.getAttribute('aria-expanded') !== 'true', c)));
  $('[data-call-close]')?.addEventListener('click', () => { setCall(false); opener?.focus(); });
  const setBook = open => { book.setAttribute('aria-expanded', String(open)); bookMenu.hidden = !open; if (open) bookMenu.querySelector('a').focus(); };
  book?.addEventListener('click', () => setBook(book.getAttribute('aria-expanded') !== 'true'));
  document.addEventListener('click', e => { if (book && !e.target.closest('.book') && book.getAttribute('aria-expanded') === 'true') setBook(false); });
  document.addEventListener('keydown', e => {
    if (e.key !== 'Escape') return;
    if (!panel.hidden) { setCall(false); opener?.focus(); }
    if (book?.getAttribute('aria-expanded') === 'true') { setBook(false); book.focus(); }
  });

  // ---- Condition index: one condition at a time swaps the photo and two lines ----
  $$('[data-ci]').forEach(btn => btn.addEventListener('click', () => {
    $$('[data-ci]').forEach(b => b.setAttribute('aria-pressed', String(b === btn)));
    $$('[data-ci-card]').forEach(c => { c.hidden = c.dataset.ciCard !== btn.dataset.ci; });
  }));

  // ---- Print and download ----
  $$('[data-print]').forEach(b => b.addEventListener('click', () => window.print()));
  const download = $('[data-download]'), guideData = $('#guide-data');
  if (download && guideData) download.addEventListener('click', () => {
    const g = JSON.parse(guideData.textContent);
    let n = 0;
    const text = `${g.brand}\n${g.title}\n\n${g.groups.map(([h, items]) => `${h.toUpperCase()}\n${items.map(x => `${++n}. ${x}`).join('\n')}`).join('\n\n')}\n\nWHAT TO SAY WHEN YOU CALL\n"${g.call}"\n\nFictional portfolio concept. General visit preparation, not medical advice. No appointment is created.\n`;
    const url = URL.createObjectURL(new Blob([text], {type: 'text/plain;charset=utf-8'})), a = document.createElement('a');
    a.href = url; a.download = download.dataset.download + '-question-pack.txt'; document.body.append(a); a.click(); a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
    say('Your question pack is ready. The download contains only this generic guide.', 'download-status');
  });

  // ---- The consultation sheet ----
  const dataEl = $('#consult-data');
  if (dataEl) {
    const data = JSON.parse(dataEl.textContent);
    const first = d => (d === 'medical' ? data.services.find(s => s.id === 'skin-checks') : data.services.find(s => s.door === d)).id;
    const state = {door: 'medical', service: first('medical'), location: '0', time: 'Flexible', question: data.doors.medical.questions[0]};
    const svc = () => data.services.find(s => s.id === state.service);
    const pick = (group, value) => $$(`[data-choice="${group}"]`).forEach(b => b.setAttribute('aria-pressed', String(b.dataset.value === value)));
    // What the link already answered: a visit type (?service=) or a door (?door=). Those steps are skipped.
    const fromService = params.get('service'), fromDoor = params.get('door');
    let known = false;
    if (data.services.some(s => s.id === fromService)) { state.service = fromService; state.door = svc().door; known = true; }
    else if (['medical', 'cosmetic'].includes(fromDoor)) { state.door = fromDoor; state.service = first(fromDoor); known = true; }
    state.question = data.doors[state.door].questions[0];
    if (['0', '1'].includes(params.get('location'))) state.location = params.get('location');
    if (params.get('context') === 'costs') state.question = data.doors[state.door].questions[state.door === 'medical' ? 0 : 1];
    const source = params.get('source'), label = data.guides[source] ? `the pocket list “${data.guides[source]}”` : data.platforms[source] ? `${data.platforms[source]}` : null;
    if (label) { const n = $('#source-note'); n.textContent = `You came from ${label}, so the sheet starts there.`; n.hidden = false; }
    const stepDoor = $('#step-door'), doneDoor = $('#door-done'), stepService = $('#step-service');
    let skipService = !!data.services.some(s => s.id === fromService);

    function questions() {
      const box = $('#question-chips'); box.replaceChildren();
      data.doors[state.door].questions.forEach(q => { const b = document.createElement('button'); b.type = 'button'; b.className = 'chip'; b.dataset.choice = 'question'; b.dataset.value = q; b.textContent = q; box.append(b); });
    }
    function render(changed) {
      const s = svc();
      if (changed === undefined || changed === 'door') questions();
      stepDoor.hidden = known; doneDoor.hidden = !known; stepService.hidden = known && skipService;
      $('#door-done-text').textContent = skipService ? `${data.doors[state.door].name}: ${s.name}.` : `${data.doors[state.door].name}.`;
      for (const g of ['door', 'service', 'location', 'time', 'question']) pick(g, state[g]);
      $$('[data-choice="service"]').forEach(b => { b.hidden = b.dataset.doorTag !== state.door; });
      $('#service-intro').textContent = s.intro;
      $('[data-out="door"]').textContent = data.doors[state.door].name;
      $('[data-out="service"]').textContent = s.name;
      $('[data-out="location"]').textContent = data.locations[Number(state.location)] + ' (fictional)';
      $('[data-out="time"]').textContent = state.time + ', availability unconfirmed';
      $('[data-out="question"]').textContent = state.question;
      $('#reader-out').textContent = data.doors[state.door].reader;
      if (changed !== 'pack') {
        const list = $('#pack-list'); list.replaceChildren();
        s.bring.forEach(x => { const li = document.createElement('li'), b = document.createElement('button'); b.type = 'button'; b.className = 'pack-item'; b.setAttribute('aria-pressed', 'false'); b.textContent = x; li.append(b); list.append(li); });
        const ex = $('#expect-list'); ex.replaceChildren(...s.expect.map(x => { const li = document.createElement('li'); li.textContent = x; return li; }));
      }
      const items = $$('.pack-item'), done = items.filter(b => b.getAttribute('aria-pressed') === 'true').length;
      $('#packed-count').textContent = `${done} of ${items.length} ready`;
      $('#ack').hidden = true;
    }
    function chooseDoor(d) { state.door = d; state.service = first(d); state.question = data.doors[d].questions[0]; }
    $('.consult').addEventListener('click', e => {
      if (e.target.closest('[data-door-change]')) { known = false; skipService = false; render(); $('#step-door button[aria-pressed="true"]')?.focus(); return; }
      const c = e.target.closest('[data-choice]');
      if (c) {
        const g = c.dataset.choice;
        if (g === 'door') { chooseDoor(c.dataset.value); explicit = true; if (door !== state.door) setDoor(state.door, {announce: false}); } else state[g] = c.dataset.value;
        render(g);
        if (g === 'door') $('#step-door button[aria-pressed="true"]')?.focus();
        say(g === 'door' ? `${data.doors[state.door].name}. The sheet now prepares for ${svc().name}.` : `Sheet updated: ${c.textContent.trim()}.`, 'planner-status');
        return;
      }
      const p = e.target.closest('.pack-item');
      if (p) { const on = p.getAttribute('aria-pressed') !== 'true'; p.setAttribute('aria-pressed', String(on)); render('pack'); say(on ? `Ready: ${p.textContent}.` : `Not ready yet: ${p.textContent}.`, 'planner-status'); return; }
      if (e.target.closest('[data-finish]')) {
        const ack = $('#ack'); $('#ack-text').textContent = `${data.doors[state.door].reader} Nothing was sent.`;
        ack.hidden = false; ack.focus({preventScroll: true}); ack.scrollIntoView({block: 'nearest', behavior: calm() ? 'auto' : 'smooth'});
        say('Sample complete. Nothing was submitted.', 'planner-status'); return;
      }
      if (e.target.closest('[data-reset]')) { Object.assign(state, {location: '0', time: 'Flexible', question: data.doors[state.door].questions[0]}); render(); $('#sheet').focus(); say('A fresh sample sheet.', 'planner-status'); }
    });
    // The header switch and the sheet's first question are the same choice.
    document.addEventListener('solenne:door', e => { if (['medical', 'cosmetic'].includes(e.detail) && e.detail !== state.door) { chooseDoor(e.detail); render('door'); } });
    if (door !== state.door) setDoor(state.door, {announce: false});
    render();
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

// Reframe Orthopedics. Every interaction keeps its state in this page's memory only; the patient /
// clinic owner view travels between pages as ?view=clinic on internal links.
(() => {
  const $ = (s, r = document) => r.querySelector(s), $$ = (s, r = document) => [...r.querySelectorAll(s)];
  const status = $('#rf-status');
  const say = t => { if (status) { status.textContent = ''; setTimeout(() => { status.textContent = t; }, 30); } };
  const readJSON = id => { const el = document.getElementById(id); return el ? JSON.parse(el.textContent) : null; };
  const params = new URLSearchParams(location.search);

  // Patient / clinic owner view
  let view = params.get('view') === 'clinic' ? 'clinic' : 'patient';
  const site = location.pathname.replace(/[^/]*$/, '');
  const withView = a => {
    const raw = a.getAttribute('href');
    if (!raw || raw.startsWith('#') || /^(https?:|mailto:|tel:)/.test(raw)) return;
    const u = new URL(raw, location.href);
    if (u.origin !== location.origin || !u.pathname.startsWith(site)) return;
    if (view === 'clinic') u.searchParams.set('view', 'clinic'); else u.searchParams.delete('view');
    a.setAttribute('href', u.pathname.slice(site.length) + u.search + u.hash);
  };
  const applyView = (announce) => {
    document.body.classList.toggle('view-clinic', view === 'clinic');
    $$('[data-view]').forEach(b => b.setAttribute('aria-pressed', String(b.dataset.view === view)));
    $$('a[href]').forEach(withView);
    const u = new URL(location.href);
    if (view === 'clinic') u.searchParams.set('view', 'clinic'); else u.searchParams.delete('view');
    history.replaceState(null, '', u.pathname + u.search + u.hash);
    if (announce) say(view === 'clinic' ? `Clinic owner view. ${$$('.owner-note').length} numbered notes on this page.` : 'Patient view.');
  };
  $$('[data-view]').forEach(b => b.addEventListener('click', () => { view = b.dataset.view; applyView(true); }));
  applyView(false);

  // Call panel: a placeholder for a real number and booking link
  const callBtn = $('.call-btn'), callPanel = $('#call-panel');
  if (callBtn && callPanel) {
    const setCall = open => { [callBtn, ...$$('[data-call]')].forEach(b => b.setAttribute('aria-expanded', String(open))); callPanel.hidden = !open; if (open) $('[data-call-close]', callPanel).focus(); };
    callBtn.addEventListener('click', () => setCall(callBtn.getAttribute('aria-expanded') !== 'true'));
    $$('[data-call-open], [data-call]').forEach(b => b.addEventListener('click', ev => { ev.stopPropagation(); setCall(true); }));
    $('[data-call-close]', callPanel).addEventListener('click', () => { setCall(false); callBtn.focus(); });
    document.addEventListener('keydown', e => { if (e.key === 'Escape' && !callPanel.hidden) { setCall(false); callBtn.focus(); } });
    document.addEventListener('click', e => { if (!callPanel.hidden && !e.target.closest('.call-wrap')) setCall(false); });
  }

  // Phone menu
  const menu = $('.menu-btn'), nav = $('#site-nav');
  if (menu && nav) {
    const set = open => { menu.setAttribute('aria-expanded', String(open)); nav.classList.toggle('open', open); $('.menu-label', menu).textContent = open ? 'Close' : 'Menu'; };
    menu.addEventListener('click', () => set(menu.getAttribute('aria-expanded') !== 'true'));
    document.addEventListener('keydown', e => { if (e.key === 'Escape' && menu.getAttribute('aria-expanded') === 'true') { set(false); menu.focus(); } });
  }

  $$('[data-print]').forEach(b => b.addEventListener('click', () => window.print()));

  // Downloadable checklist, made in the browser
  const dl = $('[data-download]'), guide = readJSON('guide-data');
  if (dl && guide) dl.addEventListener('click', () => {
    const body = guide.groups.map(([h, items]) => `${h.toUpperCase()}\n${items.map(x => `[ ] ${x}`).join('\n')}`).join('\n\n');
    const text = `${guide.brand}\n${guide.title}\n\n${body}\n\nWHAT TO SAY WHEN YOU CALL\n${guide.call}\n\nFictional portfolio concept. General visit preparation, not medical advice. No appointment is created.\n`;
    const url = URL.createObjectURL(new Blob([text], {type: 'text/plain;charset=utf-8'}));
    const a = document.createElement('a'); a.href = url; a.download = 'reframe-' + dl.dataset.download + '-checklist.txt';
    document.body.append(a); a.click(); a.remove(); setTimeout(() => URL.revokeObjectURL(url), 1000);
    $('#download-status').textContent = 'Your checklist is ready. It contains only this general checklist.';
  });

  // Arrow keys move between buttons in a group, like a toolbar
  $$('.chips, .area-chips').forEach(group => group.addEventListener('keydown', e => {
    if (!['ArrowRight', 'ArrowLeft', 'ArrowDown', 'ArrowUp'].includes(e.key)) return;
    const items = $$('.chip', group), i = items.indexOf(document.activeElement); if (i < 0) return;
    e.preventDefault(); const n = items[(i + (['ArrowRight', 'ArrowDown'].includes(e.key) ? 1 : -1) + items.length) % items.length]; n.focus(); n.click();
  }));

  // Body map: area x situation -> usual first step
  const map = readJSON('rf-map-data'), root = $('.bodymap');
  if (map && root) {
    let area = $('.area-chips [aria-pressed="true"]', root)?.dataset.area || map.areas[0].id;
    let sit = map.situations[0].id;
    const out = k => $(`[data-out="${k}"]`, root);
    const fill = (ul, items) => { ul.replaceChildren(...items.map(t => { const li = document.createElement('li'); li.textContent = t; return li; })); };
    const render = (announce, pulse) => {
      const a = map.areas.find(x => x.id === area), s = map.situations.find(x => x.id === sit), svc = map.services[s.service];
      $$('.area-chips .chip', root).forEach(b => b.setAttribute('aria-pressed', String(b.dataset.area === area)));
      $$('[data-sit]', root).forEach(b => b.setAttribute('aria-pressed', String(b.dataset.sit === sit)));
      $$('.fig-lead', root).forEach(g => g.classList.toggle('on', g.dataset.for === area));
      $$('.fig-halo', root).forEach(c => { c.classList.remove('on'); if (c.dataset.for === area) { if (pulse) void c.getBoundingClientRect(); c.classList.add('on'); } });
      out('area').textContent = a.label;
      out('svc').textContent = svc.name;
      out('step').textContent = s.step.replace('{area}', a.label.toLowerCase());
      out('referral').textContent = s.referral;
      out('tell').textContent = a.tell;
      fill(out('back'), a.back);
      fill(out('bring'), [a.bring, ...svc.bring.slice(0, 2)]);
      out('plan').setAttribute('href', `visit.html?service=${s.service}&source=bodymap&area=${a.id}`);
      out('care').setAttribute('href', `${s.service}.html`);
      out('care').textContent = 'About ' + svc.name.toLowerCase();
      withView(out('plan')); withView(out('care'));
      if (announce) say(`${a.label}. ${s.label}. Usual first step: ${svc.name}.`);
    };
    $$('[data-area]', root).forEach(b => b.addEventListener('click', () => { area = b.dataset.area; render(true, true); }));
    $$('[data-sit]', root).forEach(b => b.addEventListener('click', () => { sit = b.dataset.sit; render(true, false); }));
    const start = params.get('area');
    if (map.areas.some(a => a.id === start)) area = start;
    render(false, false);
  }

  // Sample visit planner: preset choices only, nothing submitted
  const plan = readJSON('planner-data'), planner = $('#planner');
  if (plan && planner) {
    const fresh = () => ({sit: plan.situations[0].id, area: '', loc: '0', time: 'Early morning', q: plan.questions[0]});
    const state = fresh();
    const fromService = plan.situations.find(s => s.service === params.get('service'));
    if (fromService) state.sit = fromService.id;
    if (plan.areas.some(a => a.id === params.get('area'))) state.area = params.get('area');
    if (['0', '1'].includes(params.get('location'))) state.loc = params.get('location');
    if (params.get('context') === 'costs') state.q = plan.questions[1];
    const src = plan.sources[params.get('source')];
    const keys = {sit: 'data-pick-sit', area: 'data-pick-area', loc: 'data-pick-loc', time: 'data-pick-time', q: 'data-pick-q'};
    const service = () => plan.services.find(s => s.id === plan.situations.find(x => x.id === state.sit).service);
    const areaName = () => (plan.areas.find(a => a.id === state.area) || {}).label;
    const summary = () => {
      const rows = [['Visit', service().name], ['Body area', areaName() || 'Not chosen'], ['Place', plan.locations[Number(state.loc)] + ' (fictional)'], ['Time preference', state.time + ', not yet confirmed'], ['Your question', state.q]];
      $$('[data-summary]').forEach(dl => dl.replaceChildren(...rows.flatMap(([k, v]) => { const dt = document.createElement('dt'), dd = document.createElement('dd'); dt.textContent = k; dd.textContent = v; return [dt, dd]; })));
      const team = service().handoff.split(' → ')[0];
      $('[data-reader]').textContent = `${team[0].toUpperCase() + team.slice(1)} reads this request first.`;
      $('[data-next]').textContent = `Next, they ${service().next}`;
      $('[data-carried-text]', planner).textContent = [service().name, areaName()].filter(Boolean).join(' · ') + (src ? `, from ${src}` : '');
    };
    const sync = () => {
      for (const [k, attr] of Object.entries(keys)) $$(`[${attr}]`, planner).forEach(b => b.setAttribute('aria-pressed', String(b.getAttribute(attr) === state[k])));
      $('[data-desc]', planner).textContent = `${service().name}: ${service().intro}`;
      summary();
    };
    for (const [k, attr] of Object.entries(keys)) $$(`[${attr}]`, planner).forEach(b => b.addEventListener('click', () => { state[k] = b.getAttribute(attr); sync(); }));
    const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
    let carried = !!fromService;
    const show = (n, focus = true) => {
      if (n === 0) carried = false;
      $$('[data-step]', planner).forEach(s => { s.hidden = Number(s.dataset.step) !== n; });
      $('[data-carried]', planner).hidden = !(carried && n > 0 && n < 4);
      $$('[data-progress]', planner).forEach(li => { const k = Number(li.dataset.progress); li.classList.toggle('done', k < n || n === 4); if (k === Math.min(n, 3) && n < 4) li.setAttribute('aria-current', 'step'); else li.removeAttribute('aria-current'); });
      summary();
      if (!focus) return;
      const panel = $(`[data-step="${n}"]`, planner); panel.tabIndex = -1; panel.focus({preventScroll: true});
      planner.scrollIntoView({block: 'start', behavior: reduce ? 'auto' : 'smooth'});
      say(n === 4 ? 'Demonstration complete. Nothing was submitted.' : `Step ${n + 1} of 4.`);
    };
    $$('[data-go]', planner).forEach(b => b.addEventListener('click', () => show(Number(b.dataset.go))));
    $('[data-finish]', planner).addEventListener('click', () => {
      const chain = service().handoff.split(' → ');
      $('[data-relay]', planner).replaceChildren(...chain.map((c, i) => { const li = document.createElement('li'), n = document.createElement('span'), t = document.createElement('span'); n.className = 'relay-n'; n.textContent = i + 1; t.textContent = c[0].toUpperCase() + c.slice(1); li.append(n, t); return li; }));
      $('[data-handoff]', planner).textContent = `In a real practice, this goes first to: ${chain[0][0].toUpperCase() + chain[0].slice(1)}. They read it through an approved system, then ${service().next}`;
      show(4);
    });
    $('[data-reset]', planner).addEventListener('click', () => { Object.assign(state, fresh()); carried = false; sync(); show(0); });
    sync();
    // Arriving from the body map, a care page or a checklist: the starting point is already answered.
    if (fromService) show(1, false);
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

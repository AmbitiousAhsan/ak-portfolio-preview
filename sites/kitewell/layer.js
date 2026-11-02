'use strict';
// The proposal layer over the Kitewell clinic: Parent view (the site as a family sees it) and
// Clinic team view (a page brief, numbered notes and, on the inquiry, the intake queue item it
// would create). Also the cross-page guided tour, the header state and the gentle reveal motion.
// Data comes from the #kw-layer JSON that generate.mjs writes into every page (see notes.mjs).
(() => {
  const root = document.documentElement;
  const dataEl = document.getElementById('kw-layer');
  const data = dataEl ? JSON.parse(dataEl.textContent) : {notes: [], tour: []};
  const params = new URLSearchParams(location.search);
  const reduce = matchMedia('(prefers-reduced-motion: reduce)');
  const store = {get: k => {try {return localStorage.getItem(k);} catch {return null;}}, set: (k, v) => {try {localStorage.setItem(k, v);} catch {}}};
  const el = (tag, cls, html) => {const n = document.createElement(tag); if (cls) n.className = cls; if (html != null) n.innerHTML = html; return n;};
  const esc = s => String(s).replace(/[&<>"']/g, c => ({'&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'}[c]));
  const say = text => {const t = document.getElementById('toast'); if (!t) return; t.textContent = text; t.classList.add('visible'); clearTimeout(say.timer); say.timer = setTimeout(() => t.classList.remove('visible'), 3200);};
  const norm = s => s.replace(/\s+/g, ' ').trim().toLowerCase();
  // Ahsan Khan contact points (same as the portfolio's src/lib/site.ts).
  const BOOK = 'https://cal.com/ahsan-khan-8er8sd/30min';
  const EMAIL = 'ahsankhan.direct@gmail.com';
  const LINKEDIN = 'https://www.linkedin.com/in/ambitious-ahsan/';
  let quietUntil = 0; // the dock ignores scrolling we started ourselves
  const scrollTo = (node, block = 'center') => {quietUntil = performance.now() + 1200; node?.scrollIntoView({block, behavior: reduce.matches ? 'auto' : 'smooth'});};

  // Find a note's section by selector, or by the start of its heading text.
  function find(spec) {
    if (spec.sel) return document.querySelector(`main ${spec.sel}`) || document.querySelector(spec.sel);
    if (spec.h) {
      const want = norm(spec.h);
      const heading = [...document.querySelectorAll('main h1, main h2, main h3')].find(h => norm(h.textContent).startsWith(want));
      return heading?.closest('section, article') || heading?.parentElement || null;
    }
    return null;
  }

  const statusLabel = {built: 'Built · works in this demo', proposed: 'Proposed · needs a real clinic', assumption: 'Assumption · to confirm'};

  /* ---------- Clinic team view ---------- */
  let built = false, notes = [], pop, dock, openIndex = -1, lastPin = null;

  function buildClinicLayer() {
    if (built) return; built = true;
    const main = document.getElementById('main');
    if (data.brief && main) {
      const b = data.brief;
      const brief = el('section', 'kw-brief kw-layer');
      brief.setAttribute('aria-label', 'Clinic team view: behind this page');
      brief.innerHTML = `<div class="wrap"><div class="kw-brief-head"><span class="kw-chip">Clinic team view</span><h2>Behind this page</h2><p>My notes for clinic teams: what this page does for a family, and what it does for your clinic. Below the line is the page exactly as a parent sees it, with a numbered note above each decision.</p></div><dl class="kw-brief-grid"><div><dt>For the family</dt><dd>${esc(b.family)}</dd></div><div><dt>For the clinic</dt><dd>${esc(b.clinic)}</dd></div><div><dt>Where it points</dt><dd>${esc(b.next)}</dd></div><div><dt>Who answers next</dt><dd>${esc(b.owner)}</dd></div></dl><p class="kw-brief-foot"><a href="journey.html">See every proposed handoff, from ad to payment <span aria-hidden="true">↗</span></a></p></div>`;
      main.prepend(brief);
      // Where the notes stop and the parent's page starts.
      brief.after(el('div', 'kw-divider kw-layer', '<p><span aria-hidden="true">↓</span> Below: this page exactly as a parent sees it</p>'));
      briefDots(brief.querySelector('.kw-brief-grid'));
    }
    if (main) main.append(endCard());
    if (document.getElementById('intake')) buildMirror();

    notes = data.notes.map((n, i) => ({...n, i, target: find(n)})).filter(n => n.target);
    notes.forEach((n, k) => {
      n.k = k;
      n.target.classList.add('kw-noted');
      // Each note gets its own labelled lane above the section, so it never covers the content.
      const row = el('div', 'kw-pinrow kw-layer');
      const pin = el('button', 'kw-pin', `<span class="kw-pin-n" aria-hidden="true">${k + 1}</span><span class="kw-sr">Note ${k + 1}: </span><span class="kw-pin-t">${esc(n.title)}</span><span class="kw-pin-more" aria-hidden="true">Read note</span>`);
      pin.type = 'button';
      pin.setAttribute('aria-expanded', 'false');
      pin.setAttribute('aria-controls', 'kw-pop');
      pin.addEventListener('click', () => openIndex === k ? closeNote(true) : openNote(k, pin));
      n.pin = pin;
      row.append(pin);
      n.target.before(row);
    });

    pop = el('div', 'kw-pop kw-layer');
    pop.id = 'kw-pop';
    pop.setAttribute('role', 'dialog');
    pop.setAttribute('aria-modal', 'false');
    pop.setAttribute('aria-labelledby', 'kw-pop-title');
    pop.hidden = true;
    document.body.append(pop);
    pop.addEventListener('click', e => {
      const act = e.target.closest('[data-pop]')?.dataset.pop;
      if (act === 'close') closeNote(true);
      if (act === 'prev') step(-1);
      if (act === 'next') step(1);
    });
    addEventListener('resize', place, {passive: true});
    addEventListener('scroll', place, {passive: true});
  }

  // Phones show the four brief cards as a swipe row; the dots say there are more and jump to each.
  function briefDots(grid) {
    if (!grid) return;
    const cards = [...grid.children];
    grid.tabIndex = 0; // keyboard users can scroll the row with the arrow keys
    const dots = el('div', 'kw-brief-dots');
    cards.forEach((c, i) => {
      const d = el('button');
      d.type = 'button';
      d.setAttribute('aria-label', `Card ${i + 1} of ${cards.length}: ${c.querySelector('dt')?.textContent || ''}`);
      d.addEventListener('click', () => grid.scrollTo({left: c.offsetLeft - cards[0].offsetLeft, behavior: reduce.matches ? 'auto' : 'smooth'}));
      dots.append(d);
    });
    const mark = () => {
      const stepW = cards[1] ? cards[1].offsetLeft - cards[0].offsetLeft : 1;
      const at = Math.min(cards.length - 1, Math.round(grid.scrollLeft / stepW));
      [...dots.children].forEach((d, i) => d.setAttribute('aria-current', String(i === at)));
    };
    grid.addEventListener('scroll', mark, {passive: true});
    grid.after(dots); mark();
  }

  // The proposal's ending: what to do next if you run a clinic or are hiring.
  function endCard() {
    const end = el('section', 'kw-end kw-layer');
    end.setAttribute('aria-labelledby', 'kw-end-title');
    end.innerHTML = `<div class="wrap"><div class="kw-end-copy"><span class="kw-chip">From Ahsan Khan</span><h2 id="kw-end-title">Want this for your clinic?</h2><p>I design clinic websites, content and social profiles around the questions families actually ask, with handoffs your intake and billing teams can work with. Kitewell is a concept. Yours would start from your real services, locations and intake process.</p></div><div class="kw-end-actions"><a class="kw-end-main" href="${BOOK}" target="_blank" rel="noopener">Book a 30-minute call <span aria-hidden="true">↗</span></a><a href="mailto:${EMAIL}?subject=${encodeURIComponent('A website like Kitewell')}">Email ${EMAIL}</a><a href="${LINKEDIN}" target="_blank" rel="noopener">Connect on LinkedIn <span aria-hidden="true">↗</span></a><a href="../../work/kitewell/">Read the full case study</a></div></div>`;
    return end;
  }

  function openNote(k, from) {
    const n = notes[k]; if (!n) return;
    notes.forEach(m => m.pin.setAttribute('aria-expanded', String(m === n)));
    openIndex = k; lastPin = from || n.pin;
    pop.innerHTML = `<div class="kw-pop-top"><span class="kw-pop-num">${k + 1}<small>/${notes.length}</small></span><h2 id="kw-pop-title" tabindex="-1">${esc(n.title)}</h2><button type="button" class="kw-pop-close" data-pop="close" aria-label="Close note">×</button></div><dl><div><dt>For the family</dt><dd>${esc(n.family)}</dd></div><div><dt>For the clinic</dt><dd>${esc(n.clinic)}</dd></div><div><dt>Why I built it this way</dt><dd>${esc(n.why)}</dd></div></dl><p class="kw-status kw-status-${n.status}">${statusLabel[n.status] || n.status}</p><div class="kw-pop-nav"><button type="button" data-pop="prev" ${k === 0 ? 'disabled' : ''}>← Previous</button><button type="button" data-pop="next" ${k === notes.length - 1 ? 'disabled' : ''}>Next note →</button></div>`;
    pop.hidden = false;
    document.querySelectorAll('.kw-noted.kw-focus').forEach(t => t.classList.remove('kw-focus'));
    n.target.classList.add('kw-focus');
    place();
    pop.querySelector('h2').focus({preventScroll: true});
    updateDock();
  }
  function closeNote(returnFocus) {
    if (!pop || pop.hidden) return;
    pop.hidden = true;
    notes.forEach(m => m.pin.setAttribute('aria-expanded', 'false'));
    document.querySelectorAll('.kw-noted.kw-focus').forEach(t => t.classList.remove('kw-focus'));
    if (returnFocus) lastPin?.focus();
    openIndex = -1; updateDock();
  }
  function step(d) {
    const k = Math.max(0, Math.min(notes.length - 1, (openIndex < 0 ? -1 : openIndex) + d));
    scrollTo(notes[k].pin.parentElement, 'start');
    openNote(k);
    if (!reduce.matches) setTimeout(place, 420);
  }
  // Desktop: beside its pin, kept on screen. Phones: a sheet above the dock (CSS).
  function place() {
    if (!pop || pop.hidden || openIndex < 0) return;
    if (innerWidth < 760) {pop.style.left = pop.style.top = ''; return;}
    const r = notes[openIndex].pin.getBoundingClientRect();
    const w = pop.offsetWidth, h = pop.offsetHeight;
    let left = r.right + 12, top = r.top - 4;
    if (left + w > innerWidth - 16) left = Math.max(16, r.left - w - 12);
    top = Math.max(76, Math.min(innerHeight - h - 90, top));
    pop.style.left = `${left}px`; pop.style.top = `${top}px`;
  }

  /* ---------- The dock: a way in from Parent view, note navigation in Clinic view ---------- */
  function buildDock() {
    dock = el('div', 'kw-dock');
    dock.setAttribute('role', 'region');
    dock.setAttribute('aria-label', 'Website views');
    document.body.append(dock);
    let lastY = scrollY;
    addEventListener('scroll', () => {
      const y = scrollY, d = y - lastY; lastY = y;
      if (performance.now() < quietUntil || (pop && !pop.hidden) || y < 240) {dock.classList.remove('kw-away'); return;}
      if (d > 6) dock.classList.add('kw-away'); else if (d < -6) dock.classList.remove('kw-away');
    }, {passive: true});
    dock.addEventListener('focusin', () => dock.classList.remove('kw-away'));
    dock.addEventListener('click', e => {
      const act = e.target.closest('[data-dock]')?.dataset.dock;
      if (act === 'clinic') setLens('clinic', true);
      if (act === 'parent') setLens('parent', true);
      if (act === 'next') step(1);
      if (act === 'prev') step(-1);
    });
    updateDock();
  }
  function updateDock() {
    if (!dock) return;
    if (root.dataset.lens === 'clinic') {
      const count = notes.length;
      dock.className = 'kw-dock is-clinic';
      dock.innerHTML = `<span class="kw-dock-label"><span><span class="kw-dot" aria-hidden="true"></span><span class="kw-long">Clinic team view</span><span class="kw-short">Clinic view</span></span><small>${count ? `${count} ${count === 1 ? 'note' : 'notes'} on this page` : 'No notes on this page'}</small></span>${count ? `<button type="button" data-dock="prev" aria-label="Previous note" ${openIndex <= 0 ? 'disabled' : ''}>←</button><button type="button" data-dock="next" class="kw-dock-next">${openIndex < 0 ? '<span class="kw-long">Read the notes</span><span class="kw-short">Read notes</span>' : 'Next note'} <span aria-hidden="true">→</span></button>` : ''}<button type="button" data-dock="parent" class="kw-dock-exit" aria-label="Switch to Parent view">Parent view</button>`;
      if (openIndex >= notes.length - 1) dock.querySelector('[data-dock="next"]')?.setAttribute('disabled', '');
    } else {
      dock.className = 'kw-dock is-parent';
      dock.innerHTML = `<button type="button" data-dock="clinic"><img src="kite.svg" alt="" width="14" height="20"><span class="kw-pill-text"><small>You’re seeing what a family sees</small>See the clinic team view</span></button>`;
    }
  }

  /* ---------- Lens ---------- */
  function setLens(lens, announce) {
    root.dataset.lens = lens;
    store.set('kw-lens', lens);
    document.querySelectorAll('[data-lens-set]').forEach(b => b.setAttribute('aria-pressed', String(b.dataset.lensSet === lens)));
    if (lens === 'clinic') buildClinicLayer(); else closeNote();
    updateDock();
    if (announce) say(lens === 'clinic' ? `Clinic team view: ${notes.length} ${notes.length === 1 ? 'note' : 'notes'} on this page.` : 'Parent view: the website as a family sees it.');
  }
  document.querySelectorAll('[data-lens-set]').forEach(b => b.addEventListener('click', () => setLens(b.dataset.lensSet, true)));
  addEventListener('keydown', e => {
    if (e.key !== 'Escape') return;
    if (pop && !pop.hidden) {closeNote(true); return;}
    if (tourCard && !tourCard.hidden) endTour();
  });

  /* ---------- What the intake team would see ---------- */
  let mirror;
  function buildMirror() {
    mirror = el('section', 'kw-mirror kw-layer', '<div class="kw-mirror-inner"></div>');
    mirror.setAttribute('aria-label', 'Clinic team view: the intake queue item');
    const aside = document.querySelector('.contact-aside');
    (aside || document.querySelector('.contact-layout'))?.prepend(mirror);
    renderMirror(window.kwIntake);
  }
  function renderMirror(d) {
    if (!mirror || !d) return;
    const s = d.state, ref = s.route === 'referral', wait = s.location === 'Riverbend', done = d.step >= 4;
    const schedule = ref ? 'Referral review queue' : s.location === 'Northside' ? 'Northside assessment calendar' : wait ? 'Riverbend waitlist' : 'Intake suggests a location';
    const status = !done ? ['draft', 'Draft · not sent yet'] : ref ? ['new', 'New · referral review'] : wait ? ['wait', 'New · waitlist review'] : ['new', 'New · intake review'];
    mirror.querySelector('.kw-mirror-inner').innerHTML = `<div class="kw-mirror-top"><span>Intake queue · preview</span><span class="kw-chip">Proposed handoff · not connected</span></div><div class="kw-mirror-body"><p class="kw-mirror-ref">${ref ? 'REF' : 'SYN'}-0142 <span class="kw-state kw-state-${status[0]}">${status[1]}</span></p><dl><div><dt>Source</dt><dd>Website inquiry · step ${Math.min(d.step + 1, 4)} of 4</dd></div><div><dt>From</dt><dd>${ref ? 'Referring office' : 'Parent or caregiver'} · R. Sample (fictional)</dd></div><div><dt>Location</dt><dd>${esc(s.location)} → ${schedule}</dd></div><div><dt>Question</dt><dd>${esc(ref ? 'A professional referral' : s.topic)}</dd></div><div><dt>Owner</dt><dd>${esc(d.next[0])}</dd></div><div><dt>Next action</dt><dd>${esc(d.next[1])}</dd></div><div><dt>Contact window</dt><dd>${esc(s.availability)}</dd></div></dl><p class="kw-mirror-gap"><b>Not collected online:</b> insurance plan, diagnosis, documents. Intake asks for these later, through the clinic’s secure system.</p><p class="kw-mirror-foot">Marketing sees totals only: inquiries by route and topic. No names or details.</p></div>`;
  }
  document.addEventListener('kw:intake', e => renderMirror(e.detail));

  /* ---------- Guided tour ---------- */
  let tourCard, tourAt = 0;
  const tourStep = Number(params.get('tour')) || 0;
  function renderTour(n) {
    const stops = data.tour, stop = stops[n - 1];
    if (!stop) return;
    tourAt = n;
    if (!tourCard) {
      tourCard = el('section', 'kw-tour');
      tourCard.setAttribute('aria-label', 'Guided tour');
      document.body.append(tourCard);
      tourCard.addEventListener('click', e => {
        const act = e.target.closest('[data-tour]')?.dataset.tour;
        if (act === 'end') endTour();
        if (act === 'prev') go(tourAt - 1);
        if (act === 'next') go(tourAt + 1);
      });
    }
    root.dataset.tour = 'on';
    const here = stop.page === data.page;
    const dots = stops.map((_, i) => `<i class="${i < n - 1 ? 'done' : i === n - 1 ? 'here' : ''}"></i>`).join('');
    tourCard.hidden = false;
    tourCard.innerHTML = `<div class="kw-tour-top"><span>Guided tour · stop ${n} of ${stops.length}</span><span class="kw-tour-dots" aria-hidden="true">${dots}</span></div><h2 tabindex="-1">${esc(stop.title)}</h2><p>${esc(stop.body)}</p>${here ? '' : `<p class="kw-tour-away">You’ve left the tour route. <a href="${stop.page}?tour=${n}">Return to stop ${n}</a></p>`}<div class="kw-tour-actions">${n > 1 ? '<button type="button" data-tour="prev">← Back</button>' : ''}${stop.last ? `<a class="kw-tour-main" href="${BOOK}" target="_blank" rel="noopener">Book a call <span aria-hidden="true">↗</span></a><a href="../../work/kitewell/">Back to the case study</a>` : `<button type="button" class="kw-tour-main" data-tour="next">Next stop <span aria-hidden="true">→</span></button>`}<button type="button" data-tour="end" class="kw-tour-end">${stop.last ? 'Keep exploring' : 'End tour'}</button></div>`;
    document.querySelectorAll('.kw-spot').forEach(t => t.classList.remove('kw-spot'));
    if (here) {
      const target = find(stop);
      // Land on the section's top edge, just under the sticky header: in Clinic team view that is
      // the note lane above it, so the reader sees which note the stop is about. Centering a tall
      // section used to push its heading off screen and leave the tour card over the middle.
      const lane = target?.previousElementSibling?.classList.contains('kw-pinrow') ? target.previousElementSibling : target;
      // Full-width sections take the highlight inside their edge; narrower ones get it outside,
      // so the outline never runs through their text.
      if (target) target.classList.toggle('kw-spot-wide', target.offsetWidth >= innerWidth - 8);
      if (target) {target.classList.add('kw-spot'); setTimeout(() => scrollTo(lane, 'start'), 60);}
    }
    tourCard.querySelector('h2').focus({preventScroll: true});
  }
  function go(n) {
    const stop = data.tour[n - 1]; if (!stop) return;
    if (stop.page === data.page) {history.replaceState(null, '', `${location.pathname}?tour=${n}`); renderTour(n);}
    else location.href = `${stop.page}?tour=${n}`;
  }
  function endTour() {
    if (!tourCard) return;
    tourCard.hidden = true;
    delete root.dataset.tour;
    document.querySelectorAll('.kw-spot').forEach(t => t.classList.remove('kw-spot'));
    history.replaceState(null, '', location.pathname + location.hash);
    say('Tour ended. Both views stay available from the top bar.');
  }

  /* ---------- First visit: who's looking? ---------- */
  // One question, once per browser, so nobody has to work out the top-bar switch on their own.
  const canStore = (() => {try {localStorage.setItem('kw-probe', '1'); localStorage.removeItem('kw-probe'); return true;} catch {return false;}})();
  function welcome() {
    const dlg = el('dialog', 'kw-welcome');
    dlg.setAttribute('aria-labelledby', 'kw-welcome-title');
    dlg.innerHTML = `<img class="kw-welcome-kite" src="kite.svg" alt="" width="26" height="36"><p class="kw-welcome-eyebrow">A working proposal by Ahsan Khan</p><h2 id="kw-welcome-title" tabindex="-1">Welcome to Kitewell. Who’s visiting?</h2><p class="kw-welcome-lede">Kitewell is a fictional pediatric ABA clinic. You can see its website two ways: exactly as a family sees it, or with my notes on what each part does for the clinic.</p><div class="kw-welcome-options"><button type="button" data-welcome="parent"><b>A parent or caregiver</b><span>See the website exactly as a family would.</span></button><button type="button" data-welcome="clinic"><b>A clinic owner or doctor</b><span>The same pages, with my notes on what each part does for your clinic.</span></button><button type="button" data-welcome="tour"><b>Hiring, or reviewing my work</b><span>Take the guided tour: seven short stops across the site.</span></button></div><p class="kw-welcome-foot">Switch any time with <b>Parent</b> and <b>Clinic team</b> in the top bar.</p>`;
    document.body.append(dlg);
    const choose = v => {
      store.set('kw-welcomed', '1');
      dlg.close(); dlg.remove();
      if (v === 'tour') {setLens('clinic', false); go(1);} else setLens(v === 'clinic' ? 'clinic' : 'parent', true);
    };
    dlg.addEventListener('click', e => {
      const b = e.target.closest('[data-welcome]');
      if (b) choose(b.dataset.welcome); else if (e.target === dlg) choose('parent');
    });
    dlg.addEventListener('cancel', e => {e.preventDefault(); choose('parent');});
    dlg.showModal();
    // Start on the question, not on an answer: no option looks pre-selected.
    dlg.querySelector('h2').focus();
  }

  /* ---------- Header state and gentle reveals ---------- */
  const header = document.querySelector('.header');
  const onScroll = () => header?.classList.toggle('is-scrolled', scrollY > 24);
  addEventListener('scroll', onScroll, {passive: true}); onScroll();

  if ('IntersectionObserver' in window && !reduce.matches) {
    const picks = document.querySelectorAll('main .section-heading, main .care-story > *, main .place-grid > article, main .journal-grid > *, main .first-visit-teaser > *, main .process > article, main .faqs, main .location-cards > article, main .editorial-grid > *, main .hub-card, main .cta-band, main .resource-grid > *, main .team-role-matrix > *, .path-nav');
    const io = new IntersectionObserver(entries => entries.forEach(en => {if (en.isIntersecting) {en.target.classList.add('kw-in'); io.unobserve(en.target);}}), {rootMargin: '0px 0px -8% 0px', threshold: 0.08});
    picks.forEach(node => {if (node.getBoundingClientRect().top > innerHeight * 0.92) {node.classList.add('kw-reveal'); io.observe(node);}});
    // Anything reached by keyboard or a jump link shows at once.
    document.addEventListener('focusin', e => e.target.closest?.('.kw-reveal')?.classList.add('kw-in'));
    addEventListener('beforeprint', () => document.querySelectorAll('.kw-reveal').forEach(n => n.classList.add('kw-in')));
  }

  /* ---------- Start ---------- */
  // Every new page opens at its top. Browsers do this on their own, but when the site is shown
  // inside a frame that grows with the page (an embed or a hosted preview), the outer page keeps
  // its old scroll position, so a reader who clicked "Next" at the bottom landed at the bottom
  // of the next page. Links to a section (#anchor) still go to that section.
  const toSection = location.hash && !/^#(view-|tour-|welcome)/.test(location.hash);
  if (self !== top && !toSection && !tourStep) {
    try {document.body.scrollIntoView({block: 'start', behavior: 'instant'});} catch {}
  }
  const firstVisit = params.has('welcome') || (canStore && !tourStep && !params.get('view') && !store.get('kw-welcomed') && !store.get('kw-lens'));
  buildDock();
  const startLens = tourStep ? 'clinic' : (params.get('view') || store.get('kw-lens'));
  setLens(startLens === 'clinic' ? 'clinic' : 'parent', false);
  if (tourStep) renderTour(tourStep);
  else if (firstVisit && typeof HTMLDialogElement === 'function') welcome();
})();

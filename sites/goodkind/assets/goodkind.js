// Goodkind Dental: every interaction lives in this page's memory or its link. Nothing is sent anywhere.
(() => {
 const $ = (s, r = document) => r.querySelector(s);
 const $$ = (s, r = document) => [...r.querySelectorAll(s)];
 const readJSON = id => { const el = document.getElementById(id); try { return el ? JSON.parse(el.textContent) : null; } catch { return null; } };
 const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
 const saveFile = (blob, name) => { const url = URL.createObjectURL(blob); const a = document.createElement('a'); a.href = url; a.download = name; document.body.append(a); a.click(); a.remove(); setTimeout(() => URL.revokeObjectURL(url), 2000); };
 const pressed = el => el.getAttribute('aria-pressed') === 'true';
 const press = (el, on) => el.setAttribute('aria-pressed', String(on));
 const q = new URLSearchParams(location.search);
 const root = document.documentElement;

 // ---------- Patient view / clinic owner view, carried between pages as ?view=clinic ----------
 const isClinic = () => root.classList.contains('view-clinic');
 const internal = a => { const h = a.getAttribute('href'); return h && !/^(#|https?:|mailto:|tel:|data:|blob:|\/work\/|\/privacy\/|fonts\/)/.test(h); };
 const tagLink = a => {
  if (!internal(a)) return;
  const u = new URL(a.getAttribute('href'), location.href);
  if (isClinic()) u.searchParams.set('view', 'clinic'); else u.searchParams.delete('view');
  const rel = u.pathname.split('/').pop() + (u.search) + u.hash;
  a.setAttribute('href', rel);
 };
 const tagAll = () => $$('a[href]').forEach(tagLink);
 const setView = (clinic, announce) => {
  root.classList.toggle('view-clinic', clinic);
  $$('[data-view]').forEach(b => press(b, (b.dataset.view === 'clinic') === clinic));
  tagAll();
  const u = new URL(location.href); if (clinic) u.searchParams.set('view', 'clinic'); else u.searchParams.delete('view');
  history.replaceState(null, '', u);
  if (announce) $('#view-status').textContent = clinic ? `Clinic owner view: ${$$('.owner-note').length} numbered notes now show what each part of this page does for the practice.` : 'Patient view: the page as a patient sees it.';
 };
 $$('[data-view]').forEach(b => b.addEventListener('click', () => setView(b.dataset.view === 'clinic', true)));
 setView(q.get('view') === 'clinic', false);

 // ---------- Header: transparent over the homepage photo, solid once you scroll ----------
 const hdr = $('[data-header]');
 const solid = () => { if (hdr && hdr.classList.contains('over-hero')) hdr.classList.toggle('solid', scrollY > 30 || hdr.classList.contains('menu-open')); };
 addEventListener('scroll', solid, {passive: true}); solid();

 // ---------- Visit us: two locations, one card at a time ----------
 $$('[data-locs]').forEach(w => { const tabs = $$('[data-loc]', w); tabs.forEach(t => t.addEventListener('click', () => { tabs.forEach(x => press(x, x === t)); $$('[data-loc-pane]', w).forEach(p => p.classList.toggle('is-on', p.dataset.locPane === t.dataset.loc)); })); });

 // ---------- Phone menu ----------
 const toggle = $('.menu-toggle'), nav = $('#nav-links');
 if (toggle && nav) {
  const set = open => { toggle.setAttribute('aria-expanded', String(open)); nav.classList.toggle('open', open); if (hdr) { hdr.classList.toggle('menu-open', open); solid(); } };
  toggle.addEventListener('click', () => set(toggle.getAttribute('aria-expanded') !== 'true'));
  document.addEventListener('keydown', ev => { if (ev.key === 'Escape' && toggle.getAttribute('aria-expanded') === 'true') { set(false); toggle.focus(); } });
 }

 // ---------- Call panel: a real number and booking link would go here ----------
 const panel = $('#call-panel');
 if (panel) {
  let opener = null;
  const card = $('.call-card', panel);
  const set = (open, from) => {
   panel.hidden = !open;
   $$('[data-call]').forEach(b => b.setAttribute('aria-expanded', String(open)));
   if (open) { opener = from; window.scrollTo({top: 0, behavior: reduced ? 'auto' : 'smooth'}); card.focus({preventScroll: true}); } else if (opener) opener.focus();
  };
  $$('[data-call]').forEach(b => b.addEventListener('click', () => set(panel.hidden, b)));
  $('[data-call-close]', panel).addEventListener('click', () => set(false));
  document.addEventListener('keydown', ev => { if (ev.key === 'Escape' && !panel.hidden) set(false); });
 }

 // Print buttons
 $$('[data-print]').forEach(b => b.addEventListener('click', () => print()));

 // On phones the result (comfort card, visit plan) sits below a long menu: a small pill jumps to it.
 const jumpTo = target => {
  const a = document.createElement('a'); a.className = 'jump'; a.href = '#' + target.id; a.hidden = true; document.body.append(a);
  let inView = false, wanted = false;
  const sync = () => { a.hidden = !wanted || inView; };
  new IntersectionObserver(([en]) => { inView = en.isIntersecting; sync(); }, {rootMargin: '0px 0px -20% 0px'}).observe(target);
  a.addEventListener('click', ev => { ev.preventDefault(); target.scrollIntoView({behavior: reduced ? 'auto' : 'smooth', block: 'center'}); target.focus({preventScroll: true}); });
  return (text, on) => { a.textContent = text; wanted = on; sync(); };
 };

 // ---------- The comfort menu ----------
 const cm = $('[data-comfort]'), cdata = readJSON('gk-comfort');
 if (cm && cdata) {
  const byId = Object.fromEntries(cdata.options.map(o => [o.id, o]));
  const list = $('[data-card-list]', cm), empty = $('[data-card-empty]', cm), count = $('[data-card-count]', cm), status = $('[data-card-status]', cm), carry = $('[data-card-carry]', cm);
  const signalBox = $('.cm-signal', cm);
  let signal = cdata.signals.some(s => s.id === q.get('signal')) ? q.get('signal') : 'left';
  $$('[data-signal]', cm).forEach(x => press(x, x.dataset.signal === signal));
  const card = $('#comfort-card'); card.tabIndex = -1;
  const jump = jumpTo(card);
  // A card passed in from the planner (?comfort=) comes back pre-ticked.
  const incoming = (q.get('comfort') || '').split(',').filter(id => byId[id]);
  $$('.cm-opt', cm).forEach(b => press(b, incoming.includes(b.dataset.comfortId)));
  const chosen = () => $$('.cm-opt', cm).filter(pressed).map(b => b.dataset.comfortId);
  const lineFor = id => id === 'stop' ? cdata.signals.find(s => s.id === signal).card : byId[id].card;
  const render = () => {
   const ids = chosen();
   list.replaceChildren(...ids.map(id => { const li = document.createElement('li'); li.innerHTML = byId[id].svg.replace('<svg ', '<svg class="ic" aria-hidden="true" focusable="false" '); li.append(document.createTextNode(lineFor(id))); return li; }));
   empty.hidden = ids.length > 0;
   count.textContent = ids.length + ' picked';
   const u = new URLSearchParams();
   if (q.get('service')) u.set('service', q.get('service'));
   if (ids.length) u.set('comfort', ids.join(','));
   if (ids.includes('stop')) u.set('signal', signal);
   carry.setAttribute('href', 'visit.html' + (u.toString() ? '?' + u.toString().replace(/%2C/g, ',') : ''));
   tagLink(carry);
   if (signalBox) signalBox.hidden = !ids.includes('stop');
   jump(`See my comfort card (${ids.length})`, ids.length > 0);
  };
  $$('.cm-opt', cm).forEach(b => b.addEventListener('click', () => {
   press(b, !pressed(b)); render();
   const n = chosen().length;
   status.textContent = (pressed(b) ? 'Added to your card: ' : 'Removed from your card: ') + byId[b.dataset.comfortId].label + '. ' + n + (n === 1 ? ' thing' : ' things') + ' on your card.';
  }));
  $$('[data-signal]', cm).forEach(b => b.addEventListener('click', () => {
   signal = b.dataset.signal; $$('[data-signal]', cm).forEach(x => press(x, x === b)); render();
   status.textContent = 'Stop signal set: ' + b.textContent + '.';
  }));
  $('[data-card-clear]', cm).addEventListener('click', () => { $$('.cm-opt', cm).forEach(b => press(b, false)); render(); status.textContent = 'Your card is empty again.'; });
  $('[data-card-print]', cm).addEventListener('click', () => {
   if (!chosen().length) { status.textContent = 'Pick at least one thing first, then print your card.'; return; }
   root.classList.add('print-card'); print(); setTimeout(() => root.classList.remove('print-card'), 500);
  });

  // Draw the card on a canvas so it can be saved as a picture and shown on a phone.
  const loadImg = src => new Promise((ok, no) => { const i = new Image(); i.onload = () => ok(i); i.onerror = no; i.src = src; });
  const svgURL = s => 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(s);
  const wrapLines = (ctx, text, max) => { const words = text.split(' '), out = []; let line = ''; for (const w of words) { const t = line ? line + ' ' + w : w; if (ctx.measureText(t).width > max && line) { out.push(line); line = w; } else line = t; } if (line) out.push(line); return out; };
  const round = (ctx, x, y, w, h, r) => { ctx.beginPath(); ctx.roundRect(x, y, w, h, r); };
  $('[data-card-download]', cm).addEventListener('click', async () => {
   const ids = chosen();
   if (!ids.length) { status.textContent = 'Pick at least one thing first, then download your card.'; return; }
   status.textContent = 'Making your card…';
   try {
    await Promise.all([document.fonts.load('600 64px "GK Display"'), document.fonts.load('400 34px "GK Text"'), document.fonts.load('700 26px "GK Text"')]);
    const W = 1080, pad = 72, inner = W - pad * 2, textX = pad + 48 + 96 + 30, textW = W - textX - pad - 48;
    const probe = document.createElement('canvas').getContext('2d'); probe.font = '400 36px "GK Text"';
    const rows = ids.map(id => wrapLines(probe, lineFor(id), textW));
    const rowsH = rows.reduce((h, r) => h + Math.max(96, r.length * 48 + 24) + 18, 0);
    const H = Math.max(1350, 520 + rowsH + 230);
    const cv = document.createElement('canvas'); cv.width = W; cv.height = H; const ctx = cv.getContext('2d');
    ctx.fillStyle = '#E2F3D3'; ctx.fillRect(0, 0, W, H);
    ctx.fillStyle = 'rgba(19,42,57,.08)'; for (let y = 20; y < H; y += 34) for (let x = 20; x < W; x += 34) { ctx.beginPath(); ctx.arc(x, y, 2.4, 0, 7); ctx.fill(); }
    ctx.fillStyle = '#132A39'; round(ctx, pad, pad + 12, inner, H - pad * 2, 56); ctx.fill();
    ctx.fillStyle = '#FFFFFF'; ctx.strokeStyle = '#132A39'; ctx.lineWidth = 6; round(ctx, pad, pad, inner, H - pad * 2, 56); ctx.fill(); ctx.stroke();
    const markImg = await loadImg(svgURL(cdata.mark)); ctx.drawImage(markImg, pad + 48, pad + 52, 120, 120);
    ctx.fillStyle = '#245557'; ctx.font = '700 26px "GK Text"'; ctx.fillText('SHOW THIS AT THE FRONT DESK', pad + 196, pad + 96);
    ctx.fillStyle = '#132A39'; ctx.font = '600 76px "GK Display"'; ctx.fillText('My comfort card', pad + 192, pad + 168);
    ctx.font = '700 32px "GK Text"'; ctx.fillText('Name', pad + 48, pad + 290);
    ctx.fillRect(pad + 150, pad + 292, inner - 200, 4);
    ctx.setLineDash([14, 12]); ctx.strokeStyle = 'rgba(19,42,57,.3)'; ctx.lineWidth = 3; ctx.beginPath(); ctx.moveTo(pad + 48, pad + 220); ctx.lineTo(W - pad - 48, pad + 220); ctx.stroke(); ctx.setLineDash([]);
    let y = pad + 360;
    for (const [i, id] of ids.entries()) {
     const h = Math.max(96, rows[i].length * 48 + 24);
     ctx.fillStyle = '#E2F3D3'; round(ctx, pad + 48, y, 96, 96, 26); ctx.fill();
     const img = await loadImg(svgURL(byId[id].svg)); ctx.drawImage(img, pad + 58, y + 10, 76, 76);
     ctx.fillStyle = '#132A39'; ctx.font = '400 36px "GK Text"';
     const top = y + (h - rows[i].length * 48) / 2 + 36;
     rows[i].forEach((l, j) => ctx.fillText(l, textX, top + j * 48));
     y += h + 18;
    }
    ctx.setLineDash([14, 12]); ctx.strokeStyle = 'rgba(19,42,57,.3)'; ctx.beginPath(); ctx.moveTo(pad + 48, H - pad - 170); ctx.lineTo(W - pad - 48, H - pad - 170); ctx.stroke(); ctx.setLineDash([]);
    ctx.fillStyle = '#3F5361'; ctx.font = '400 27px "GK Text"';
    ['Please tell me which of these you can offer.', 'Goodkind Dental is a fictional practice. This card was made in', 'my browser and nothing on it was sent anywhere.'].forEach((l, j) => ctx.fillText(l, pad + 48, H - pad - 118 + j * 38));
    const blob = await new Promise(ok => cv.toBlob(ok, 'image/png'));
    saveFile(blob, 'goodkind-comfort-card.png');
    status.textContent = 'Your comfort card is downloading as a picture: goodkind-comfort-card.png.';
   } catch (err) {
    const text = 'My comfort card\n\n' + ids.map(id => '• ' + lineFor(id)).join('\n') + '\n\nPlease tell me which of these you can offer.\nGoodkind Dental is a fictional practice. Nothing was sent anywhere.\n';
    saveFile(new Blob([text], {type: 'text/plain'}), 'goodkind-comfort-card.txt');
    status.textContent = 'Your comfort card is downloading as a text file.';
   }
  });
  render();
 }

 // ---------- Pocket guide downloads ----------
 $$('[data-download]').forEach(b => b.addEventListener('click', () => {
  const d = readJSON('guide-data'), out = $('#download-status');
  if (!d) return;
  let n = 0;
  const body = d.groups.map(g => `${g.title.toUpperCase()}\n${g.items.map(x => `${++n}. ${x}`).join('\n')}`).join('\n\n');
  const text = `${d.title}\n${d.brand} (fictional practice): pocket guide\n\n${body}\n\nWHAT TO SAY WHEN YOU CALL\n“${d.call}”\n\nGeneral visit-preparation content. It does not provide a diagnosis, a treatment plan or a promise about care.\n`;
  saveFile(new Blob([text], {type: 'text/plain'}), `goodkind-${b.dataset.download}.txt`);
  if (out) out.textContent = 'Your question pack is downloading. It was made in your browser.';
 }));

 // ---------- Cost before the chair: the written plan, line by line ----------
 const plan = $('[data-plan]');
 if (plan) {
  // Wide screens: details sit beside the paper. Phones: the chosen line's detail opens right under it.
  const narrow = matchMedia('(max-width: 1020px)'), home = $('.plan-details', plan);
  const place = () => { const b = $('[data-line][aria-pressed="true"]', plan), d = $(`#pd-${b.dataset.line}`); if (narrow.matches) b.after(d); else home.append(d); };
  $$('[data-line]', plan).forEach(b => b.addEventListener('click', () => {
   $$('[data-line]', plan).forEach(x => press(x, x === b));
   $$('[data-detail]', plan).forEach(d => d.classList.toggle('is-on', d.dataset.detail === b.dataset.line));
   place();
  }));
  narrow.addEventListener('change', place); place();
 }

 // ---------- Sample visit plan: picks up the visit and the comfort card from the link ----------
 const planner = $('[data-planner]'), bd = readJSON('booking-data');
 if (planner && bd) {
  const state = {service: 'general-dentistry', location: '0', time: 'Flexible', question: bd.questions[0]};
  const svc = id => bd.services.find(s => s.id === id);
  const given = svc(q.get('service'));
  if (given) state.service = given.id;
  if (['0', '1'].includes(q.get('location'))) state.location = q.get('location');
  if (q.get('context') === 'costs') state.question = bd.questions[2];
  const comfortIds = (q.get('comfort') || '').split(',').filter(id => bd.comfort.some(c => c.id === id));
  const signal = q.get('signal');
  const signalLine = {left: 'If I raise my left hand, please stop and check in with me.', right: 'If I raise my right hand, please stop and check in with me.', tap: 'If I tap the arm of the chair, please stop and check in with me.'};
  const cardLine = id => id === 'stop' && signalLine[signal] ? signalLine[signal] : bd.comfort.find(c => c.id === id).card;
  const from = $('[data-from]');
  const src = bd.sources[q.get('source')] || (q.get('context') === 'costs' ? 'the costs page' : comfortIds.length ? 'your comfort card' : q.has('location') ? 'a location page' : null);
  if (src && from) { from.textContent = 'You came from ' + src + '. We’ve filled in what we can.'; from.hidden = false; }
  const status = $('#planner-status'), ticket = $('#ticket'); ticket.tabIndex = -1;
  const jump = jumpTo(ticket); let touched = false;

  // Step 1 already answered by the page you came from: show it, offer to change it.
  const done = $('[data-done]'), opts = $('[data-opts]'), change = $('[data-change]');
  if (given) { done.hidden = false; opts.hidden = true; }
  change.addEventListener('click', () => { const open = opts.hidden; opts.hidden = !open; change.setAttribute('aria-expanded', String(open)); change.textContent = open ? 'Done' : 'Change'; if (open) $('[data-pick="service"][aria-pressed="true"]', opts).focus(); });

  // Step 3: the comfort card, attached from the link, never asked again.
  const attached = $('[data-card-attached]'), none = $('[data-card-none]');
  if (comfortIds.length) {
   attached.hidden = false; none.hidden = true;
   $('[data-card-lines]').replaceChildren(...comfortIds.map(id => { const li = document.createElement('li'); li.textContent = cardLine(id); return li; }));
  }
  const sync = () => {
   jump('See my visit plan', touched);
   $$('[data-pick]', planner).forEach(b => press(b, state[b.dataset.pick] === b.dataset.value));
   const s = svc(state.service);
   $('[data-service-desc]').textContent = s.intro;
   $('[data-done-text]').textContent = `${s.label}: ${s.name}`;
   $('[data-t="service"]').textContent = s.name;
   $('[data-t="location"]').textContent = bd.locations[+state.location] + ' (sample)';
   $('[data-t="time"]').textContent = state.time;
   $('[data-t="comfort"]').textContent = comfortIds.length ? `Card attached: ${comfortIds.length} ${comfortIds.length === 1 ? 'request' : 'requests'}` : 'No card yet';
   $('[data-t="question"]').textContent = state.question;
   $('[data-t="owner"]').textContent = s.owner;
   const back = new URLSearchParams({service: state.service}); if (comfortIds.length) back.set('comfort', comfortIds.join(',')); if (signal) back.set('signal', signal);
   const edit = $('[data-card-edit]'), make = $('[data-card-make]');
   edit.setAttribute('href', 'team.html?' + back.toString().replace(/%2C/g, ',') + '#comfort'); tagLink(edit);
   make.setAttribute('href', 'team.html?service=' + state.service + '#comfort'); tagLink(make);
  };
  $$('[data-pick]', planner).forEach(b => b.addEventListener('click', () => { state[b.dataset.pick] = b.dataset.value; touched = true; sync(); status.textContent = 'Plan updated: ' + ($('strong', b) || b).textContent.trim() + '.'; }));
  const next = $('[data-next-step]');
  $('[data-show-next]').addEventListener('click', () => {
   const s = svc(state.service);
   $('[data-handoff]').replaceChildren(...s.chain.map(x => { const li = document.createElement('li'); li.textContent = x; return li; }));
   $('[data-handoff-text]').textContent = `The ${s.owner.toLowerCase()} reads your plan first and confirms what ${bd.locations[+state.location]} can offer${comfortIds.length ? ', including your comfort card' : ''}. Your question, “${state.question}”, goes to whoever can answer it.`;
   next.hidden = false; next.focus({preventScroll: true}); next.scrollIntoView({behavior: reduced ? 'auto' : 'smooth', block: 'start'});
   status.textContent = 'Sample next step shown below. Nothing was booked or sent.';
  });
  $('[data-reset]').addEventListener('click', () => {
   Object.assign(state, {service: given ? given.id : 'general-dentistry', location: '0', time: 'Flexible', question: bd.questions[0]});
   sync(); next.hidden = true; ticket.focus(); status.textContent = 'Started a fresh example.';
  });
  sync();
 }

 // ---------- Social previews ----------
 const follow = $('[data-follow]');
 if (follow) { const base = follow.textContent; follow.addEventListener('click', () => { const on = !pressed(follow); press(follow, on); follow.textContent = on ? 'Following' : base; $('#follow-status').textContent = on ? 'Following in this preview only. No real account exists.' : 'Unfollowed in this preview.'; }); }
 $$('.post').forEach(post => {
  const st = $('[data-post-status]', post), say = t => { if (st) st.textContent = t; };
  $$('[data-save]', post).forEach(save => { const base = save.textContent; save.addEventListener('click', () => { const on = !pressed(save); press(save, on); save.textContent = on ? 'Saved' : base; say(on ? 'Saved while this page is open.' : 'Removed from saved.'); }); });
  $$('[data-helpful]', post).forEach(h => h.addEventListener('click', () => { const on = !pressed(h); press(h, on); say(on ? 'Marked in this preview. No count is kept.' : 'Unmarked.'); }));
  const slides = $$('.ig-slide', post);
  if (slides.length) {
   let i = 0; const prev = $('[data-slide-prev]', post), nxt = $('[data-slide-next]', post), cnt = $('[data-slide-count]', post);
   const show = () => { slides.forEach((s, j) => s.classList.toggle('is-on', j === i)); cnt.textContent = `${i + 1} / ${slides.length}`; prev.disabled = i === 0; nxt.disabled = i === slides.length - 1; };
   prev.addEventListener('click', () => { if (i > 0) { i--; show(); say(`Slide ${i + 1} of ${slides.length}.`); } if (prev.disabled) nxt.focus(); });
   nxt.addEventListener('click', () => { if (i < slides.length - 1) { i++; show(); say(`Slide ${i + 1} of ${slides.length}.`); } if (nxt.disabled) prev.focus(); });
   show();
  }
  const play = $('[data-play]', post), screen = $('[data-frames]', post);
  if (play && screen) {
   const frames = JSON.parse(screen.dataset.frames), cap = $('[data-frame]', screen), bar = $('[data-progress]', screen);
   let t = null, k = 0;
   const stop = () => { clearInterval(t); t = null; press(play, false); play.textContent = 'Play'; };
   const step = () => { cap.textContent = frames[k]; bar.style.width = ((k + 1) / frames.length * 100) + '%'; };
   play.addEventListener('click', () => {
    if (t) { stop(); say('Storyboard paused.'); return; }
    press(play, true); play.textContent = 'Pause'; k = 0; step(); say('Playing the captioned storyboard.');
    t = setInterval(() => { k++; if (k >= frames.length) { stop(); say('Storyboard finished.'); return; } step(); }, reduced ? 4000 : 2600);
   });
  }
 });
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

// Juniper Women's Health (fictional practice). Everything here works in page memory only:
// nothing is sent, stored or shared. Downloads and prints are made by the visitor's own browser.
// The Patient / Clinic owner view travels in the link (?view=clinic), never in storage.
(() => {
  const $ = (s, el = document) => el.querySelector(s);
  const $$ = (s, el = document) => [...el.querySelectorAll(s)];
  const html = document.documentElement;
  const reduce = matchMedia('(prefers-reduced-motion: reduce)');
  const press = (btn, on) => btn.setAttribute('aria-pressed', on ? 'true' : 'false');
  const pressed = btn => btn.getAttribute('aria-pressed') === 'true';
  const say = (el, text) => { if (!el) return; el.textContent = ''; setTimeout(() => { el.textContent = text; }, 40); };
  const saveText = (name, text) => {
    const url = URL.createObjectURL(new Blob([text], {type: 'text/plain;charset=utf-8'}));
    const a = Object.assign(document.createElement('a'), {href: url, download: name});
    document.body.append(a); a.click(); a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  };

  // ---------- Patient view / Clinic owner view
  let clinic = html.classList.contains('view-clinic');
  const isLocal = href => href && !/^(?:[a-z]+:|\/|#)/i.test(href);
  // Add or remove ?view=clinic on a same-folder link, keeping its other parameters and hash.
  const withView = href => {
    if (!isLocal(href)) return href;
    const [pathAndQuery, hash = ''] = href.split('#');
    const [file, query = ''] = pathAndQuery.split('?');
    const q = new URLSearchParams(query); q.delete('view'); if (clinic) q.set('view', 'clinic');
    const qs = q.toString();
    return file + (qs ? '?' + qs.replace(/%2C/g, ',') : '') + (hash ? '#' + hash : '');
  };
  const relink = () => $$('a[href]').forEach(a => { const h = a.getAttribute('href'); if (isLocal(h)) a.setAttribute('href', withView(h)); });
  const setView = (on, announce) => {
    clinic = on; html.classList.toggle('view-clinic', on);
    $$('[data-view]').forEach(b => press(b, (b.dataset.view === 'clinic') === on));
    relink();
    const here = location.pathname.split('/').pop() || 'index.html';
    history.replaceState(null, '', withView(here + location.search + location.hash));
    if (announce) { const first = $('.owner-note'); if (on && first) first.scrollIntoView({behavior: reduce.matches ? 'auto' : 'smooth', block: 'center'}); }
  };
  $$('[data-view]').forEach(b => b.addEventListener('click', () => setView(b.dataset.view === 'clinic', true)));
  setView(clinic, false);

  // ---------- phone menu
  const menuButton = $('.menu-button'), menu = $('#site-menu');
  if (menuButton && menu) {
    const set = open => { menuButton.setAttribute('aria-expanded', String(open)); document.body.classList.toggle('menu-open', open); };
    menuButton.addEventListener('click', () => set(menuButton.getAttribute('aria-expanded') !== 'true'));
    document.addEventListener('keydown', ev => { if (ev.key === 'Escape' && menuButton.getAttribute('aria-expanded') === 'true') { set(false); menuButton.focus(); } });
    matchMedia('(min-width: 1101px)').addEventListener('change', () => set(false));
  }

  // ---------- care-area mega menus: one open at a time; Escape or a click elsewhere closes them
  const megaButtons = $$('.mega-button');
  const closeMegas = except => megaButtons.forEach(b => { if (b === except) return; b.setAttribute('aria-expanded', 'false'); document.getElementById(b.getAttribute('aria-controls')).hidden = true; });
  megaButtons.forEach(b => b.addEventListener('click', () => {
    const open = b.getAttribute('aria-expanded') !== 'true';
    closeMegas(b); b.setAttribute('aria-expanded', String(open)); document.getElementById(b.getAttribute('aria-controls')).hidden = !open;
  }));
  document.addEventListener('keydown', ev => {
    if (ev.key !== 'Escape') return;
    const open = megaButtons.find(b => b.getAttribute('aria-expanded') === 'true');
    if (open) { closeMegas(); open.focus(); }
  });
  document.addEventListener('click', ev => { if (!ev.target.closest('.has-mega')) closeMegas(); });

  // ---------- the Call panel (a placeholder for a real number and booking link); header and phone-bar buttons share it
  const callButtons = $$('.call-button, [data-call]'), callPanel = $('#call-panel');
  if (callButtons.length && callPanel) {
    let opener = callButtons[0];
    const setCall = (open, from) => { if (from) opener = from; callPanel.hidden = !open; callButtons.forEach(b => b.setAttribute('aria-expanded', String(open))); if (open) $('a, button', callPanel).focus(); };
    callButtons.forEach(b => b.addEventListener('click', () => setCall(callPanel.hidden, b)));
    $('[data-call-close]', callPanel).addEventListener('click', () => { setCall(false); opener.focus(); });
    document.addEventListener('keydown', ev => { if (ev.key === 'Escape' && !callPanel.hidden) { setCall(false); opener.focus(); } });
    document.addEventListener('click', ev => { if (!callPanel.hidden && !callPanel.contains(ev.target) && !callButtons.some(b => b.contains(ev.target))) setCall(false); });
  }

  // ---------- printing: a whole page, or only the conversation card
  $$('[data-print]').forEach(b => b.addEventListener('click', () => window.print()));
  addEventListener('afterprint', () => { html.classList.remove('print-card'); document.getElementById('print-root')?.remove(); });

  // ---------- guide downloads
  const pack = $('#guide-data');
  $$('[data-download]').forEach(btn => btn.addEventListener('click', () => {
    if (!pack) return;
    const d = JSON.parse(pack.textContent); let k = 0;
    const body = d.groups.map(g => `${g.name.toUpperCase()}\n${g.items.map(x => `${++k}. ${x}`).join('\n')}`).join('\n\n');
    saveText(`juniper-${btn.dataset.download}.txt`, `${d.title}\n${d.brand} (fictional practice) · guide\n\n${body}\n\nWhat to say when you call:\n“${d.call}”\n\nGeneral visit-preparation content. Not a diagnosis or treatment plan.\nMade in your browser. Nothing was sent anywhere.\n`);
    say($('#download-status'), 'Your browser has made a plain-text copy of this guide.');
  }));

  // ---------- the conversation card
  const dataEl = $('#card-data');
  if (dataEl) {
    const D = JSON.parse(dataEl.textContent);
    const topics = Object.fromEntries(D.groups.flatMap(g => g.topics.map(t => [t.id, {...t, service: g.service}])));
    const prefs = Object.fromEntries(D.preferences.map(p => [p.id, p]));
    const params = new URLSearchParams(location.search);

    $$('[data-card-builder]').forEach(root => {
      const full = root.dataset.cardBuilder === 'full';
      const state = {topics: [], prefs: [], setting: null, time: null};
      const status = $('[data-card-status]', root);
      const topicsEl = $('[data-card-topics]', root), prefsEl = $('[data-card-prefs]', root), settingEl = $('[data-card-setting]', root);
      const card = $('[data-card]', root);
      const empty = 'Tap a topic to begin. There’s no wrong place to start.';

      const settingText = () => {
        const s = state.setting === null ? '' : state.setting === 'either' ? 'Either setting is fine' : D.locations[+state.setting];
        const t = state.time ? (state.time === 'flexible' ? 'flexible on time' : `${state.time}s, if possible`) : '';
        return [s, t].filter(Boolean).join(', ') || 'No preference chosen.';
      };
      const li = (text, cls = '') => { const el = document.createElement('li'); el.textContent = text; if (cls) el.className = cls; return el; };
      const render = () => {
        topicsEl.replaceChildren(...(state.topics.length ? state.topics.map(id => li(topics[id].line)) : [li(empty, 'card-empty')]));
        if (prefsEl) prefsEl.replaceChildren(...(state.prefs.length ? state.prefs.map(id => li(prefs[id].line)) : [li('Nothing added yet, and that’s fine.', 'card-empty')]));
        if (settingEl) settingEl.textContent = settingText();
        if (card) card.classList.toggle('has-content', state.topics.length + state.prefs.length > 0);
        const peek = $('[data-card-peek-text]', root);
        if (peek) peek.textContent = state.topics.length + state.prefs.length ? `Your card: ${state.topics.length} topic${state.topics.length === 1 ? '' : 's'}, ${state.prefs.length} preference${state.prefs.length === 1 ? '' : 's'}` : 'Your card is empty';
        root.classList.toggle('has-picks', state.topics.length + state.prefs.length > 0);
        $$('[data-topic]', root).forEach(b => press(b, state.topics.includes(b.dataset.topic)));
        $$('[data-pref]', root).forEach(b => press(b, state.prefs.includes(b.dataset.pref)));
        $$('[data-setting]', root).forEach(b => press(b, state.setting === b.dataset.setting));
        $$('[data-time]', root).forEach(b => press(b, state.time === b.dataset.time));
        $$('[data-card-continue]', root).forEach(a => {
          const q = new URLSearchParams({source: 'home'});
          if (state.topics.length) q.set('topics', state.topics.join(','));
          a.setAttribute('href', withView('visit.html?' + q.toString() + (a.dataset.cardContinue === 'handoff' ? '#handoff' : '')));
        });
        if (full) { updateHandoff(); updateSummary(); }
      };
      const toggle = (list, id) => { const i = list.indexOf(id); if (i < 0) list.push(id); else list.splice(i, 1); return i < 0; };
      const count = () => full ? `${state.topics.length} topic${state.topics.length === 1 ? '' : 's'} and ${state.prefs.length} preference${state.prefs.length === 1 ? '' : 's'} on your card.` : `${state.topics.length} topic${state.topics.length === 1 ? '' : 's'} on your card.`;

      root.addEventListener('click', ev => {
        const b = ev.target.closest('button');
        if (!b || !root.contains(b)) return;
        if (b.dataset.topic) { const on = toggle(state.topics, b.dataset.topic); render(); say(status, `${on ? 'Added' : 'Removed'}: ${b.textContent.trim()}. ${count()}`); }
        else if (b.dataset.pref) { const on = toggle(state.prefs, b.dataset.pref); render(); say(status, `${on ? 'Added' : 'Removed'}: ${b.textContent.trim()}. ${count()}`); }
        else if (b.dataset.setting) { state.setting = state.setting === b.dataset.setting ? null : b.dataset.setting; render(); say(status, `Setting: ${settingText()}`); }
        else if (b.dataset.time) { state.time = state.time === b.dataset.time ? null : b.dataset.time; render(); say(status, `Time: ${settingText()}`); }
        else if ('topicToggle' in b.dataset) { const g = $('[data-topic-groups]', root); const open = g.hidden; g.hidden = !open; b.setAttribute('aria-expanded', String(open)); b.textContent = open ? 'Done' : 'Change topics'; }
        else if ('cardClear' in b.dataset) { Object.assign(state, {topics: [], prefs: [], setting: null, time: null}); render(); say(status, 'Your card is empty again.'); }
        else if ('cardPrint' in b.dataset) {
          document.getElementById('print-root')?.remove();
          const holder = Object.assign(document.createElement('div'), {id: 'print-root'});
          const copy = card.cloneNode(true); copy.removeAttribute('id'); copy.removeAttribute('tabindex'); copy.removeAttribute('aria-labelledby'); copy.querySelectorAll('[id]').forEach(el => el.removeAttribute('id'));
          holder.setAttribute('aria-hidden', 'true'); holder.append(copy); document.body.append(holder);
          html.classList.add('print-card'); window.print();
        } else if ('cardDownload' in b.dataset) {
          const lines = ['WHAT I’D LIKE TO TALK ABOUT', `${D.brand} (fictional practice) · conversation card`, '', 'Topics'];
          lines.push(...(state.topics.length ? state.topics.map((id, i) => `${i + 1}. ${topics[id].line}`) : ['(none chosen yet)']), '', 'What would help me');
          lines.push(...(state.prefs.length ? state.prefs.map(id => `- ${prefs[id].line}`) : ['(nothing added)']));
          lines.push('', `Where and when: ${settingText()}`, '', 'Made in your browser. Nothing was sent or saved.');
          saveText('juniper-conversation-card.txt', lines.join('\n') + '\n');
          say(status, 'Your browser has made a plain-text copy of the card.');
        }
      });

      function updateSummary() {
        const sum = $('[data-topic-summary]', root);
        if (!sum || sum.hidden) return;
        $('[data-topic-summary-text]', root).textContent = state.topics.length ? `On your card: ${state.topics.map(id => topics[id].label.toLowerCase()).join(', ')}.` : 'No topics on your card yet.';
      }
      function updateHandoff() {
        const team = $('[data-handoff-team]'), why = $('[data-handoff-why]'), pr = $('[data-handoff-prefs]');
        if (!team) return;
        const services = [...new Set(state.topics.map(id => topics[id].service))].filter(s => s !== 'imaging-coordination' || state.topics.includes('imaging'));
        team.textContent = services.length ? `It goes to ${services.map(s => D.teamFor[s]).join(', and ')}.` : 'It goes to the right care team.';
        why.textContent = services.length ? 'Based on the topics on your card. The practice confirms who you would see.' : 'Your topics decide who you would see. If you are not sure, the coordinator helps you choose.';
        pr.textContent = state.prefs.length ? `They would arrange: ${state.prefs.map(id => prefs[id].label.toLowerCase()).join(', ')}.` : 'Nothing to arrange yet. Add what would help, and it shows here.';
      }

      // Starting points carried in the link: ?service=, ?source=, ?topics=, ?prefs=, ?location=, ?context=
      if (full) {
        const svc = params.get('service') || D.guides[params.get('source')];
        if (svc && D.serviceTopic[svc]) state.topics.push(D.serviceTopic[svc]);
        (params.get('topics') || '').split(',').filter(id => topics[id] && !state.topics.includes(id)).forEach(id => state.topics.push(id));
        (params.get('prefs') || '').split(',').filter(id => prefs[id] && !state.prefs.includes(id)).forEach(id => state.prefs.push(id));
        if (params.get('context') === 'costs' && !state.prefs.includes('cost')) state.prefs.push('cost');
        const loc = params.get('location'); if (loc === '0' || loc === '1') state.setting = loc;
        // Step one is already answered: fold it and start at what would help.
        if (state.topics.length) { $('[data-topic-summary]', root).hidden = false; $('[data-topic-groups]', root).hidden = true; }
        const note = $('[data-source-note]'), src = D.sources[params.get('source')];
        const started = state.topics.length ? `Your topics are already on the card, so you can start with what would help.` : '';
        if (note && (src || started || state.setting !== null)) {
          note.textContent = [src ? `You came from ${src}.` : '', started, state.setting !== null ? `${D.locations[+state.setting]} is noted as your setting.` : ''].filter(Boolean).join(' ');
          note.hidden = false;
        }
      }
      render();
    });
  }

  // ---------- team: roles in the room
  const picker = $('.role-picker');
  if (picker) {
    const show = id => {
      $$('.role-button', picker).forEach(b => press(b, b.dataset.role === id));
      $$('[data-role-panel]').forEach(p => { p.hidden = p.dataset.rolePanel !== id; });
      $$('[data-seat]').forEach(s => s.classList.toggle('is-on', s.dataset.seat === id));
    };
    picker.addEventListener('click', ev => { const b = ev.target.closest('.role-button'); if (b) show(b.dataset.role); });
    document.body.classList.add('roles-ready');
    show($('.role-button', picker).dataset.role);
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

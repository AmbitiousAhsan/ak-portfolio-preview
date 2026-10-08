'use strict';
(() => {
  const $ = (s,root=document) => root.querySelector(s);
  const $$ = (s,root=document) => [...root.querySelectorAll(s)];
  const motion = matchMedia('(prefers-reduced-motion: reduce)');
  const track = (name, detail={}) => { document.dispatchEvent(new CustomEvent('mara:analytics',{detail:{event:name,...detail}})); };
  const toastEl=$('#toast'); let toastTimer;
  function toast(text){ clearTimeout(toastTimer);toastEl.textContent=text;toastEl.hidden=false;toastTimer=setTimeout(()=>toastEl.hidden=true,4500); }
  let lastFocus=null,breathTimer,breathComplete,breathCount=0;
  function closeDialog(d){ if(!d?.open)return;d.close(); }
  function openDialog(d,fromShortcut=false){
    lastFocus=document.activeElement;
    $$('dialog[open]').forEach(closeDialog);d.showModal();
    if(d.id==='breathing-dialog'){
      // Opened by typing "calm": say so, and offer the switch that turns the shortcut off (WCAG 2.1.4).
      $('.shortcut-note',d).hidden=!fromShortcut;
      // #breath-label is a polite live region, so each prompt is announced as it changes.
      breathCount=0;$('#breath-label').textContent='Breathe in…';
      breathTimer=setInterval(()=>{$('#breath-label').textContent=++breathCount%2?'…and out.':'Breathe in…';},4000);
      breathComplete=setTimeout(()=>{track('breathing_completed');$('#breath-label').textContent='One minute. Well done.';clearInterval(breathTimer);},60000);
    }
  }
  $$('dialog').forEach(d=>{
    d.addEventListener('close',()=>{
      if(d.id==='breathing-dialog'){clearInterval(breathTimer);clearTimeout(breathComplete);}
      if(d.id==='mobile-menu')$('.menu-toggle').setAttribute('aria-expanded','false');
      if(lastFocus?.isConnected)lastFocus.focus({preventScroll:true});
    });
    d.addEventListener('click',e=>{if(e.target===d&&d.id==='booking-dialog')closeDialog(d);});
    // Native modal dialogs make the rest of the page inert; keep keyboard focus inside as well.
    d.addEventListener('keydown',e=>{
      if(e.key!=='Tab')return;
      const focusables=$$('a[href],button,input,select,textarea,[tabindex="0"]',d).filter(x=>!x.disabled&&x.getClientRects().length&&!x.closest('[hidden],[inert]'));
      const first=focusables[0],last=focusables.at(-1);
      if(e.shiftKey&&document.activeElement===first){e.preventDefault();last?.focus();}
      else if(!e.shiftKey&&document.activeElement===last){e.preventDefault();first?.focus();}
    });
  });
  document.addEventListener('click',e=>{
    const b=e.target.closest('[data-book]');
    if(b){e.preventDefault();openDialog($('#booking-dialog'));track('book_click',{section:b.dataset.section||'page'});if(b.hasAttribute('data-origin-focus'))$('#modal-origin').focus();return;}
    if(e.target.closest('[data-close]'))closeDialog(e.target.closest('dialog'));
    if(e.target.closest('[data-calm-line]'))toast('A fictional calm line. Try PANIC? for a minute of breathing.');
  });
  $('.menu-toggle').addEventListener('click',()=>{openDialog($('#mobile-menu'));$('.menu-toggle').setAttribute('aria-expanded','true');});
  $$('#mobile-menu nav a').forEach(a=>a.addEventListener('click',()=>closeDialog($('#mobile-menu'))));
  $('#panic-button').addEventListener('click',()=>{openDialog($('#breathing-dialog'));track('panic_button_open');});

  const threats=['MILDLY CONCERNING','A GUY IS FLYING AGAIN','SKY IS FINE (FOR NOW)','UNSCHEDULED ECLIPSE','PORTAL IN A PARKING LOT'];
  const colors=['var(--beam)','var(--panic)','var(--nebula)','var(--paper)','var(--panic)'];let threatClicks=0;
  // The new level is announced through a polite live region; it is cleared first so a repeat is announced too.
  let threatAnnounce;const threatStatus=$('#threat-status');
  $('#threat').addEventListener('click',()=>{threatClicks++;const level=threatClicks>=10?"WE'RE AWARE. WE'RE ON IT.":threats[threatClicks%5];$('#threat-text').textContent=level;$('.dot').style.background=colors[threatClicks%5];$('#cape-count').textContent=3+threatClicks;
    clearTimeout(threatAnnounce);threatStatus.textContent='';threatAnnounce=setTimeout(()=>{threatStatus.textContent='Earth threat level: '+level.charAt(0)+level.slice(1).toLowerCase();},150);});
  let resetClicks=0;const resetLabels=['Reset. Again.','Still 0.','It is always 0.','Please stop.'];
  $('#incident-reset').addEventListener('click',()=>{const n=$('.odometer');n.classList.remove('roll');requestAnimationFrame(()=>n.classList.add('roll'));$('#reset-label').textContent=resetLabels[Math.min(resetClicks++,3)];});
  const incidents=['Sedan airborne over 5th & Main. Owner, we have a 3pm.','Unscheduled eclipse, Tuesday edition.','Man reports a ring asked him a question. We believe him.','Portal opened in a warehouse store. Closed. Membership still valid.',"Intern bitten by 'just a regular spider.' Monitoring.",'Very large lizard sighted near the harbor. Again.'];
  const ticker=$('#ticker');incidents.forEach((t,i)=>{const span=document.createElement('span');span.className='incident';const time=new Date(Date.now()-(incidents.length-1-i)*7*60000).toLocaleTimeString([],{hour:'2-digit',minute:'2-digit',hour12:false});span.textContent=time+' — '+t;ticker.append(span);});
  [...ticker.children].forEach(el=>{const copy=el.cloneNode(true);copy.setAttribute('aria-hidden','true');ticker.append(copy);});
  // Click or Space pauses the feed in addition to hover/focus.
  $('.feed').addEventListener('click',()=>document.body.classList.toggle('ticker-paused'));
  $('.feed').addEventListener('keydown',e=>{if(e.key===' '){e.preventDefault();document.body.classList.toggle('ticker-paused');}});

  $$('[data-flip]').forEach(btn=>btn.addEventListener('click',()=>{
    const card=btn.closest('.condition-card'),flipped=!card.classList.contains('flipped');card.classList.toggle('flipped',flipped);
    const front=$('.card-front',card),back=$('.card-back',card);front.inert=flipped;back.inert=!flipped;
    front.setAttribute('aria-hidden',String(flipped));back.setAttribute('aria-hidden',String(!flipped));$('[aria-expanded]',front).setAttribute('aria-expanded',String(flipped));
    $('button',flipped?back:front).focus({preventScroll:true});if(flipped)track('card_flip',{code:btn.dataset.flip});
  }));
  if(location.hash==='#TLF-06')setTimeout(()=>$('#TLF-06 .card-front button')?.click(),100);
  const answers=[null,null,null];
  const dx=[{code:'DX-00',title:'Regular Earth stress.',copy:'Still valid. Still treatable. We do those too — and nothing even exploded.'},{code:'DX-27',title:'Low-grade cosmic dread.',copy:'Very common since the second invasion. Highly treatable in six to eight sessions.'},{code:'DX-99',title:'Acute Extraterrestrial Stress Response.',copy:'You are in the right place. Come in — or stay under the desk and book online. Both count.'}];
  $$('.quiz-option').forEach(btn=>btn.addEventListener('click',()=>{
    const group=btn.closest('fieldset');answers[+group.dataset.question]=+btn.dataset.value;
    $$('button',group).forEach(x=>x.setAttribute('aria-pressed',String(x===btn)));btn.classList.remove('pressed');requestAnimationFrame(()=>btn.classList.add('pressed'));
    const n=answers.filter(x=>x!==null).length,result=$('#quiz-result');
    if(n<3){result.innerHTML='<p class="quiz-pending mono">'+n+' of 3 answered. Finish all three to see your (unofficial) diagnosis.</p>';return;}
    const score=answers.reduce((a,b)=>a+b,0),r=dx[score<2?0:score<5?1:2];
    result.innerHTML='<div class="quiz-result" data-dx="'+r.code+'"><span class="mono">UNOFFICIAL DIAGNOSIS · '+r.code+'</span><h3>'+r.title+'</h3><p>'+r.copy+'</p><a href="'+$('[data-book]').getAttribute('href')+'" class="button small secondary" data-book data-section="panic-meter">Book a session</a></div>';
    track('panic_meter_result',{dx:r.code});if(score>4&&!motion.matches){document.body.classList.add('edge-pulse');setTimeout(()=>document.body.classList.remove('edge-pulse'),1250);}
  }));

  $$('.intake-form').forEach(form=>{
    const box=form.closest('.intake-content');
    form.addEventListener('change',()=>{$('.selected-count',form).textContent=$$('input[name=incident]:checked',form).length;});
    const range=$('[type=range]',form);range.addEventListener('input',()=>{range.setAttribute('aria-valuetext',['Mild unease','A little uneasy','I check the sky a lot','Very uneasy','Under the desk'][+range.value]);});
    form.addEventListener('submit',e=>{
      e.preventDefault();const contact=$('[name=contact]',form),error=$('.form-error',form);
      if(!contact.value.trim()){error.hidden=false;contact.setAttribute('aria-invalid','true');contact.focus();return;}
      error.hidden=true;contact.removeAttribute('aria-invalid');$('.intake-fields',box).hidden=true;const success=$('.intake-success',box);success.hidden=false;success.focus();form.reset();$('.selected-count',form).textContent='0';
    });
    $('[data-reset-intake]',box).addEventListener('click',()=>{$('.intake-success',box).hidden=true;$('.intake-fields',box).hidden=false;$('input',form).focus();});
  });
  $('#dispatch')?.addEventListener('submit',e=>{e.preventDefault();$('#dispatch-status').textContent="You're on the (fictional) list. No email was saved or sent.";e.target.reset();});
  $$('.filter').forEach(btn=>btn.addEventListener('click',()=>{
    $$('.filter').forEach(b=>b.setAttribute('aria-pressed',String(b===btn)));let count=0;
    $$('.file-card').forEach(card=>{const show=btn.dataset.filter==='all'||card.dataset.category===btn.dataset.filter;card.hidden=!show;if(show)count++;});
    $('#filter-status').textContent=count+' case file'+(count===1?'':'s');
  }));
  $$('[data-page]').forEach(btn=>btn.addEventListener('click',()=>{if(btn.dataset.page==='1')toast('You are on page 1. All seven files are here.');else if(btn.dataset.page==='412')toast("Still Tuesday. You've read this page before.");else toast('That batch is still on Dr. Mara’s clipboard. The seven available files are here.');}));
  const slug=document.body.dataset.route;if(slug.startsWith('case-files/'))track('case_file_open',{slug:slug.split('/')[1]});

  const scene=$('.hero-scene');let skyTimer,shakeTimer,pass=1;
  function heroPass(){
    if(!scene||motion.matches||scene.classList.contains('paused'))return;
    $('#sky-status').textContent='WATCHING';clearTimeout(skyTimer);skyTimer=setTimeout(()=>$('#sky-status').textContent='UNEVENTFUL',10000);
    clearTimeout(shakeTimer);if(pass%5!==0)shakeTimer=setTimeout(()=>{if(scene.classList.contains('paused'))return;$('.window-box').classList.add('shake');setTimeout(()=>$('.window-box').classList.remove('shake'),450);},3800);
  }
  if(scene){
    const car=$('.flying-car'),cow=$('.flying-cow');
    car.addEventListener('animationiteration',()=>{pass++;scene.classList.toggle('cow-pass',pass%5===0);heroPass();});
    car.addEventListener('click',()=>toast('Still not covered.'));
    cow.addEventListener('click',()=>{toast("She's doing great.");track('cow_click');$('#abductees').classList.add('glow');setTimeout(()=>$('#abductees').classList.remove('glow'),2000);});
    new IntersectionObserver(entries=>entries.forEach(e=>{scene.classList.toggle('paused',!e.isIntersecting);if(e.isIntersecting)heroPass();}),{threshold:.05}).observe(scene);
  }
  let servingSeconds=0;setInterval(()=>{if(!document.hidden&&++servingSeconds%90===0)$('#now-serving').textContent=+$('#now-serving').textContent+1;},1000);
  let scrollPending=false,footerBeamed=false;
  const updateProgress=()=>{
    scrollPending=false;const length=document.documentElement.scrollHeight-innerHeight,progress=length>0?Math.max(0,Math.min(1,scrollY/length)):0;
    const bar=$('#reading-progress');bar.style.width=`calc(${progress*100}% - ${progress*14}px)`;bar.classList.toggle('has-progress',progress>.005);
    if(progress>.995&&!footerBeamed){footerBeamed=true;const mark=$('footer .brand>img');if(!motion.matches)mark.classList.add('footer-abducted');setTimeout(()=>mark.style.transform='rotate(-4deg)',1000);}
  };
  addEventListener('scroll',()=>{if(!scrollPending){scrollPending=true;requestAnimationFrame(updateProgress);}},{passive:true});addEventListener('resize',updateProgress);updateProgress();
  if(!motion.matches&&'IntersectionObserver'in window){
    const observer=new IntersectionObserver(entries=>entries.forEach(e=>{if(e.isIntersecting){e.target.classList.add('revealed');observer.unobserve(e.target);}}),{threshold:.04});
    $$('.section:not(.hero)>.container').forEach(x=>{if(x.getBoundingClientRect().top>innerHeight){x.classList.add('reveal-ready');observer.observe(x);}});
  }
  const beam=$('#cursor-beam');if(matchMedia('(pointer:fine)').matches){
    document.addEventListener('pointermove',e=>{if(motion.matches)return;beam.style.left=e.clientX+'px';beam.style.top=e.clientY+'px';beam.style.opacity=e.target.closest('.space')&&!e.target.closest('dialog')?'.045':'0';},{passive:true});
    document.addEventListener('pointerleave',()=>beam.style.opacity='0');
  }
  $('.diploma')?.addEventListener('click',e=>{const t=$('.diploma-text',e.currentTarget),hon=t.dataset.hon==='true';t.dataset.hon=String(!hon);t.textContent=hon?'Doctor of Medicine — Psychiatry':'Andromeda Institute of Feelings — Doctor of Calm (Hon.)';});
  const earring=$('.portrait-svg [data-earring]');earring?.addEventListener('mouseenter',()=>{if(!motion.matches)earring.animate([{transform:'rotate(0)'},{transform:'rotate(360deg)'}],{duration:700});});
  let whaleTimer;$('.language').addEventListener('click',()=>{
    if(whaleTimer)return;const headings=$$('h1,h2,h3'),originals=headings.map(h=>h.innerHTML);headings.forEach(h=>h.textContent='Oooooooo');
    whaleTimer=setTimeout(()=>{headings.forEach((h,i)=>h.innerHTML=originals[i]);toast('Sorry. Back to English.');whaleTimer=null;},4000);
  });
  // Typing "calm" opens the breathing exercise. It never listens while focus is in a form or a field, or while a
  // dialog is open, and the breathing dialog it opens has a switch to turn it off (remembered on this device).
  let typed='',konami=[];const sequence=['ArrowUp','ArrowUp','ArrowDown','ArrowDown','ArrowLeft','ArrowRight','ArrowLeft','ArrowRight','b','a'];
  const CALM_KEY='mara-calm-shortcut';let calmShortcut=true;try{calmShortcut=localStorage.getItem(CALM_KEY)!=='off';}catch(err){}
  const calmSwitch=$('[data-calm-shortcut]');
  calmSwitch?.addEventListener('click',()=>{calmShortcut=!calmShortcut;try{calmShortcut?localStorage.removeItem(CALM_KEY):localStorage.setItem(CALM_KEY,'off');}catch(err){}
    calmSwitch.textContent=calmShortcut?'Turn off the “calm” shortcut':'Shortcut off. Turn it back on';});
  const inField=el=>el instanceof Element&&(!!el.closest('input,textarea,select,form,[contenteditable]:not([contenteditable=false])')||el.isContentEditable);
  document.addEventListener('keydown',e=>{
    if(e.ctrlKey||e.altKey||e.metaKey||e.isComposing)return;
    if(inField(e.target)||inField(document.activeElement)){typed='';return;}
    if(calmShortcut&&!$('dialog[open]')){typed=(typed+(e.key.length===1?e.key.toLowerCase():'')).slice(-4);if(typed==='calm'){typed='';openDialog($('#breathing-dialog'),true);}}else typed='';
    konami.push(e.key.length===1?e.key.toLowerCase():e.key);konami=konami.slice(-10);
    if(JSON.stringify(konami)===JSON.stringify(sequence)){konami=[];track('konami');const b=$('#hero-book');if(b&&!motion.matches){b.classList.add('beamed-up');setTimeout(()=>{b.classList.remove('beamed-up');b.classList.add('slightly-crooked');toast('Sorry. They just wanted to look.');},3000);}else toast('Sorry. They just wanted to look.');}
  });
  let idleTimer;function resetIdle(){clearTimeout(idleTimer);idleTimer=setTimeout(()=>{if(!document.hidden&&!$('dialog[open]'))toast("Still with us? Blink twice if you're in a time loop.");},60000);}
  ['pointerdown','keydown','scroll'].forEach(x=>document.addEventListener(x,resetIdle,{passive:true}));resetIdle();
  const originalTitle=document.title;document.addEventListener('visibilitychange',()=>{document.title=document.hidden?'Come back. Nothing is falling.':originalTitle;if(scene)scene.classList.toggle('paused',document.hidden||scene.getBoundingClientRect().bottom<0);});
  let loadingTimer,loadingCycle;
  document.addEventListener('click',e=>{const a=e.target.closest('a[href]');if(!a||a.hasAttribute('data-book')||e.defaultPrevented||e.ctrlKey||e.metaKey||a.target==='_blank')return;const u=new URL(a.href);if(u.origin!==location.origin||u.pathname===location.pathname)return;
    loadingTimer=setTimeout(()=>{const loading=$('#loading');loading.hidden=false;let i=0;loadingCycle=setInterval(()=>{$('span:last-child',loading).textContent=['Calibrating calm…','Locating your universe…','Moving the tissues closer…'][++i%3];},1300);},400);
  });
  addEventListener('pageshow',()=>{clearTimeout(loadingTimer);clearInterval(loadingCycle);$('#loading').hidden=true;});
  // The floating buttons step aside so they never cover the page's heading: the panic button whenever it would sit on
  // the h1 (short or zoomed screens) and, on phones, until the hero's buttons have scrolled away; the portfolio's
  // "Show the thinking" switch (while the notes are off) whenever it would sit on the h1. Both return on keyboard focus.
  const panicButton=$('#panic-button'),heading=$('main h1'),heroActions=$('#hero-book')?.closest('.actions');
  const small=matchMedia('(max-width: 599px)');let heroVisible=false,stepPending=false;
  const overlaps=(a,b,pad=8)=>a.left-pad<b.right&&a.right+pad>b.left&&a.top-pad<b.bottom&&a.bottom+pad>b.top;
  // The panic button's resting box, ignoring the scale it shrinks to while tucked.
  const restingBox=el=>{const cs=getComputedStyle(el),w=el.offsetWidth,h=el.offsetHeight,vw=document.documentElement.clientWidth,vh=document.documentElement.clientHeight;
    const left=vw-parseFloat(cs.right)-w,top=vh-parseFloat(cs.bottom)-h;return {left,top,right:left+w,bottom:top+h};};
  function sideStep(){
    stepPending=false;const h1=heading?.getBoundingClientRect();
    if(panicButton)panicButton.classList.toggle('is-tucked',(small.matches&&heroVisible)||(!!h1&&h1.height>0&&overlaps(restingBox(panicButton),h1)));
    const notes=document.querySelector('.akn-toggle')?.shadowRoot?.querySelector('button');
    document.body.classList.toggle('notes-held',!!notes&&!!h1&&notes.getAttribute('aria-pressed')!=='true'&&overlaps(notes.getBoundingClientRect(),h1));
  }
  const step=()=>{if(!stepPending){stepPending=true;requestAnimationFrame(sideStep);}};
  if(heroActions&&'IntersectionObserver'in window)new IntersectionObserver(entries=>{heroVisible=entries.some(e=>e.isIntersecting);step();}).observe(heroActions);
  addEventListener('scroll',step,{passive:true});addEventListener('resize',step);addEventListener('load',step);small.addEventListener('change',step);
  document.addEventListener('DOMContentLoaded',step);document.addEventListener('click',step,true);document.fonts?.ready.then(step);step();
})();

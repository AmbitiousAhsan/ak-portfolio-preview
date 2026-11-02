(() => {
 const $=(s,r=document)=>r.querySelector(s), $$=(s,r=document)=>[...r.querySelectorAll(s)];
 const menu=$('.menu-toggle'),nav=$('.nav-links');
 menu?.addEventListener('click',()=>{const open=menu.getAttribute('aria-expanded')!=='true';menu.setAttribute('aria-expanded',String(open));nav.classList.toggle('open',open);menu.textContent=open?'Close':'Menu'});
 document.addEventListener('keydown',e=>{if(e.key==='Escape'&&menu?.getAttribute('aria-expanded')==='true'){menu.click();menu.focus()}});
 $$('[data-print]').forEach(b=>b.addEventListener('click',()=>window.print()));
 const download=$('[data-download]');
 download?.addEventListener('click',()=>{const g=JSON.parse($('#guide-data').textContent),text=`${g.brand}\n${g.title}\n\n${g.items.map((x,i)=>`${i+1}. ${x}`).join('\n\n')}\n\nFictional portfolio concept. General visit preparation, not medical advice. No appointment is created.\n`;const url=URL.createObjectURL(new Blob([text],{type:'text/plain;charset=utf-8'})),a=document.createElement('a');a.href=url;a.download=download.dataset.download+'-question-pack.txt';document.body.append(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(url),1000);$('#download-status').textContent='Your question pack is ready. The download contains only this generic guide.'});
 const planner=$('#visit-planner');
 if(planner){const data=JSON.parse($('#booking-data').textContent),params=new URLSearchParams(location.search),service=planner.elements.namedItem('service'),loc=planner.elements.namedItem('location'),time=planner.elements.namedItem('time'),question=planner.elements.namedItem('question');let step=0;
 if(data.services.some(s=>s.id===params.get('service')))service.value=params.get('service');
 if(['0','1'].includes(params.get('location')))loc.value=params.get('location');
 if(params.get('context')==='costs')question.selectedIndex=1;
 const chosen=()=>data.services.find(s=>s.id===service.value);
 const describe=()=>$('#visit-description').textContent=chosen().intro;describe();service.addEventListener('change',describe);
 function summary(){const pairs=[['Visit',chosen().name],['Location',data.locations[Number(loc.value)]+' (fictional)'],['Time preference',time.value+' — availability unconfirmed'],['Question',question.value],['Next team',chosen().handoff.split(' → ')[0]]];$$('[data-summary]').forEach(box=>{box.replaceChildren();const dl=document.createElement('dl');dl.className='summary-grid';pairs.forEach(([label,value])=>{const dt=document.createElement('dt'),dd=document.createElement('dd');dt.textContent=label;dd.textContent=value;dl.append(dt,dd)});box.append(dl)})}
 function show(n){step=n;$$('[data-step]').forEach(p=>p.hidden=Number(p.dataset.step)!==n);$$('[data-progress]').forEach(p=>{p.classList.toggle('active',Number(p.dataset.progress)<=n);if(Number(p.dataset.progress)===n)p.setAttribute('aria-current','step');else p.removeAttribute('aria-current')});summary();const panel=$(`[data-step="${n}"]`);panel.tabIndex=-1;panel.focus({preventScroll:true});panel.scrollIntoView({block:'start',behavior:matchMedia('(prefers-reduced-motion: reduce)').matches?'instant':'smooth'});$('#planner-status').textContent=n===3?'Demonstration complete. Nothing was submitted.':`Step ${n+1} of 4.`}
 $$('[data-next]',planner).forEach(b=>b.addEventListener('click',()=>show(Math.min(2,step+1))));$$('[data-back]',planner).forEach(b=>b.addEventListener('click',()=>show(Math.max(0,step-1))));
 planner.addEventListener('submit',e=>{e.preventDefault();if(step!==2)return;$('#handoff-text').textContent=chosen().handoff+'. In a real practice, the first team would review this request through an approved system and confirm the next step.';show(3)});
 $('[data-reset]',planner).addEventListener('click',()=>{planner.reset();describe();show(0)});
 }
 $('[data-follow]')?.addEventListener('click',e=>{const b=e.currentTarget,on=b.getAttribute('aria-pressed')!=='true';b.setAttribute('aria-pressed',String(on));b.textContent=on?'Following in preview':'Follow preview';$('#follow-status').textContent=on?'Preview state only. No social account was followed.':'Preview follow cleared.'});
 $$('[data-filter]').forEach(b=>b.addEventListener('click',()=>{$$('[data-filter]').forEach(x=>x.setAttribute('aria-pressed',String(x===b)));let count=0;$$('[data-topic]').forEach(p=>{p.hidden=b.dataset.filter!=='all'&&p.dataset.topic!==b.dataset.filter;if(!p.hidden)count++});$('#global-status').textContent=`${count} concept posts shown.`}));
 $$('.post').forEach(post=>{const art=$('.post-art',post),frames=JSON.parse(art.dataset.frames),frame=$('[data-frame]',post),status=$('[data-post-status]',post);let index=0,timer=null;const prev=$('[data-prev]',post),next=$('[data-next-card]',post),play=$('[data-play]',post);
 function render(){frame.textContent=frames[index];if(prev){prev.disabled=index===0;next.disabled=index===frames.length-1;$('[data-slide]',post).textContent=`${index+1} / ${frames.length}`;status.textContent=`Card ${index+1}: ${frames[index]}`}}
 prev?.addEventListener('click',()=>{index=Math.max(0,index-1);render()});next?.addEventListener('click',()=>{index=Math.min(frames.length-1,index+1);render()});
 const save=$('[data-save]',post);save.addEventListener('click',()=>{const on=save.getAttribute('aria-pressed')!=='true';save.setAttribute('aria-pressed',String(on));save.textContent=on?'Saved in preview ✓':'Save in this preview';status.textContent=on?'Saved for this page visit only.':'Preview save cleared.'});
 function stop(){clearInterval(timer);timer=null;art.classList.remove('playing');play?.setAttribute('aria-pressed','false');if(play)play.textContent='Replay storyboard ▷'}
 play?.addEventListener('click',()=>{if(timer){stop();status.textContent='Storyboard paused. Press replay to start again.';return}index=0;render();play.setAttribute('aria-pressed','true');play.textContent='Pause storyboard Ⅱ';art.classList.add('playing');status.textContent='Playing a three-card caption sequence. No audio.';timer=setInterval(()=>{index++;if(index>=frames.length){stop();status.textContent='Storyboard complete. Open the question pack for the full guide.';return}render()},4000)});
 document.addEventListener('visibilitychange',()=>{if(document.hidden&&timer)stop()});
 });
})();

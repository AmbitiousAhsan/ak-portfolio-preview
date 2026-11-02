// Native tab semantics: click, arrow keys, Home and End all reach the same content.
document.querySelectorAll('[role="tablist"]').forEach(list=>{
 const tabs=[...list.querySelectorAll('[role="tab"]')];
 const activate=tab=>{
  tabs.forEach(item=>{const active=item===tab;item.setAttribute('aria-selected',String(active));item.tabIndex=active?0:-1;const panel=document.getElementById(item.getAttribute('aria-controls'));if(panel)panel.hidden=!active;});
 };
 tabs.forEach((tab,index)=>{
  tab.addEventListener('click',()=>activate(tab));
  tab.addEventListener('keydown',event=>{
   let next=index;if(event.key==='ArrowRight')next=(index+1)%tabs.length;else if(event.key==='ArrowLeft')next=(index+tabs.length-1)%tabs.length;else if(event.key==='Home')next=0;else if(event.key==='End')next=tabs.length-1;else return;
   event.preventDefault();activate(tabs[next]);tabs[next].focus();
  });
 });
});
const packInputs=[...document.querySelectorAll('[data-pack-item]')];
const selectedQuestions=()=>packInputs.filter(input=>input.checked).map(input=>input.value);
function updatePack(){
 const questions=selectedQuestions();const preview=document.getElementById('pack-preview');if(!preview)return;
 preview.replaceChildren();for(const text of questions.length?questions:['Choose the questions you want to bring.']){const li=document.createElement('li');li.textContent=text;preview.append(li);}
 document.getElementById('pack-count').textContent=questions.length?`${questions.length} ${questions.length===1?'question':'questions'} in your pack.`:'No questions added yet.';
 document.querySelectorAll('[data-download-pack],[data-print-pack]').forEach(button=>button.disabled=questions.length===0);
}
packInputs.forEach(input=>input.addEventListener('change',updatePack));
document.querySelector('[data-download-pack]')?.addEventListener('click',()=>{
 const questions=selectedQuestions();if(!questions.length)return;
 const content=['MY LITTLE KITEWELL QUESTION PACK','',...questions.map((q,i)=>`${i+1}. ${q}`),'','Prepared with the fictional Kitewell guide. Confirm arrangements with your actual clinic.','No personal information was collected.'].join('\r\n');
 const url=URL.createObjectURL(new Blob([content],{type:'text/plain;charset=utf-8'}));const link=document.createElement('a');link.href=url;link.download='my-kitewell-question-pack.txt';document.body.append(link);link.click();link.remove();setTimeout(()=>URL.revokeObjectURL(url),1000);
 const status=document.getElementById('toast');if(status){status.textContent='Your question pack is ready to download.';status.classList.add('visible');setTimeout(()=>status.classList.remove('visible'),3500);}
});
document.querySelector('[data-print-pack]')?.addEventListener('click',()=>{
 const questions=selectedQuestions();if(!questions.length)return;const list=document.querySelector('#print-pack ul');list.replaceChildren();questions.forEach(q=>{const li=document.createElement('li');li.textContent=q;list.append(li);});document.body.classList.add('printing-pack');window.print();
});
window.addEventListener('afterprint',()=>document.body.classList.remove('printing-pack'));

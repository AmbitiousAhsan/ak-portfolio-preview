'use strict';

const scenarios = {
  northside: { location:'Northside', title:'Use the capacity that is available.', decision:'Test location-specific acquisition for Northside. Keep Riverbend’s waitlist visible and avoid promising a start date.', northside:'Assessment openings', riverbend:'Waitlist', ad:'Pediatric ABA in Northside', message:'Explore assessment availability. Meet the team and learn what happens before a first visit.', cta:'Start a sample inquiry', waitlist:false, rationale:'Confirm staffing, suitable service capacity and the clinic’s response process before increasing spend.' },
  full: { location:'Both locations', title:'Change the next step when both are full.', decision:'Reduce new-enrollment acquisition while reviewing capacity. Offer honest waitlist information and support recruitment or referral relationships where useful.', northside:'Waitlist', riverbend:'Waitlist', ad:'Plan your next step with Kitewell', message:'See the waitlist process and the information our intake team would need. Availability is illustrative.', cta:'Explore the sample waitlist', waitlist:true, rationale:'Brand search and other spend should be evaluated against real demand and goals; keeping it running is not an automatic rule.' },
  riverbend: { location:'Riverbend', title:'Offer new capacity to waiting families first.', decision:'Review the Riverbend waitlist before testing additional acquisition. New staff alone is not proof of usable capacity; scheduling and credentialing still need confirmation.', northside:'Limited capacity', riverbend:'New assessment capacity', ad:'Explore ABA at Riverbend', message:'A new opportunity to begin an assessment. Learn about availability and the intake process.', cta:'Start a sample inquiry', waitlist:false, rationale:'The landing page and campaign would change only after the clinic confirms it can support the new families.' }
};

const journey = [
 {title:'Inquiry to secure intake', owner:'Marketing design → intake team', from:'Clinic website', to:'Approved intake tool', design:true,
   description:'The family moves from the public clinic page into the proposed intake environment. A clear reference and assigned queue make the next action visible.',
   trigger:'A family chooses to start an inquiry or requests a phone-first route.', info:'Preferred contact method, location and only the initial details the intake team needs, collected in the restricted tool.',
   confirmation:'An intake reference appears in the queue with an assigned owner. The family sees the next step, without a promise of an appointment.',
   statuses:['Not checked','Not started','Not started','No appointment','None','None'],
   exceptionTitle:'A family needs another way to begin', exception:['Offer a phone-first intake route with the same privacy and record-handling process.','An intake coordinator searches for an existing inquiry before creating a record. A shared reference format alone does not prevent duplicates.','If the clinic has no capacity, record the waitlist status and agree an update process. Do not imply that the family is booked.'],
   recovery:'The coordinator confirms a single inquiry, records the preferred contact method and assigns the next follow-up.', exceptionStatuses:['Not checked','Not started','Not started','Intake or waitlist follow-up','None','None']},
 {title:'Intake to practice record', owner:'Intake coordinator + system administrator', from:'Secure intake queue', to:'Practice-management record',
   description:'The proposed handoff carries reviewed intake information into one practice record. A returned record identifier acknowledges the transfer.',
   trigger:'The intake coordinator has reviewed the required information and recorded the applicable permissions.', info:'The clinic-approved registration fields, source intake reference and reviewed identity-match information.',
   confirmation:'The receiving record identifier is recorded against the intake item. The transfer is acknowledged before downstream work starts.',
   statuses:['Not checked','Not started','Not started','No appointment','None','None'],
   exceptionTitle:'The transfer fails or a possible duplicate appears',exception:['Keep the item in “Transfer pending” and preserve the original reference.','Have authorized staff review the possible identity match. Matching a date of birth and phone number alone is not enough to auto-merge records.','Resolve the record, then retry or link the confirmed record. Log the action and prevent a duplicate transfer.'],
   recovery:'One confirmed destination record and an acknowledgement are written back to the intake item.',exceptionStatuses:['Waiting for record review','Not started','Not started','Transfer pending','None','None']},
 {title:'Benefits review',owner:'Billing team or billing partner',from:'Practice record',to:'Eligibility service / payer portal',
   description:'The billing team reviews a plan response and records the information the intake team can explain to the family. This check is separate from service authorization.',
   trigger:'A confirmed record has enough accurate plan information for a benefits inquiry.',info:'Payer and member details, relevant subscriber information and the service being investigated.',
   confirmation:'The response, review date and reference are recorded. Outstanding questions and estimated responsibility remain visible.',
   statuses:['Response reviewed','Not started','Not started','No appointment','None','None'],
   exceptionTitle:'A requirement for the next step is missing',exception:['Identify the specific document required by this illustrative plan, rather than treating every plan as identical.','Assign the intake coordinator to request it through an approved route, with an agreed follow-up date.','Keep the authorization task open and explain the delay to the family. Active eligibility alone does not clear the next step.'],
   recovery:'The missing requirement is resolved and the billing team confirms whether an authorization request can proceed.',exceptionStatuses:['Response reviewed','Waiting for required document','Not started','Not ready to book','None','None']},
 {title:'Assessment authorization',owner:'Billing partner, with clinical input',from:'Authorization work queue',to:'Payer review',
   description:'When the plan requires it, the billing partner submits an assessment authorization request with the clinical team’s supporting information.',
   trigger:'The plan-specific requirements for requesting an assessment are confirmed.',info:'Supporting documentation, provider information, requested service and units, and any required referral.',
   confirmation:'The payer’s decision, service, units, dates and reference are recorded. If authorization is not required, record that determination and its source.',
   statuses:['Response reviewed','Approved for assessment (sample)','Not started','Scheduling pending','None','None'],
   exceptionTitle:'The payer requests more information',exception:['Keep the request pending with the payer reference and outstanding requirements.','Billing and the clinical team respond within the applicable process. Any review or appeal is owned by the appropriate team.','Intake updates the family without predicting the payer’s decision or timing.'],
   recovery:'A documented payer decision or confirmed no-authorization-required determination is reviewed before scheduling.',exceptionStatuses:['Response reviewed','Pending payer information','Not started','Not ready to book','None','None']},
 {title:'Assessment readiness',owner:'Intake / scheduling + clinical team',from:'Authorization record',to:'Assessment calendar',
   description:'Scheduling combines the family’s availability, the appropriate clinician and the requirements for this assessment. A readiness check keeps each condition visible.',
   trigger:'The clinic confirms that assessment requirements and capacity are satisfied.',info:'Approved service dates and units where applicable, staff and family availability, location and completed registration requirements.',
   confirmation:'The assessment is scheduled and the checklist records what was checked, when and by whom. Recheck timing is a clinic-specific rule to validate.',
   statuses:['Rechecked (sample)','Current plan reviewed','Not started','Assessment ready (sample)','None','None'],
   exceptionTitle:'The plan changes before the appointment',exception:['Mark the appointment as needing review rather than carrying forward a “ready” label.','Billing verifies the new plan and reassesses whether the prior authorization still applies. The old plan’s approval cannot be assumed valid.','Intake explains options and coordinates any scheduling change under the clinic’s policy.'],
   recovery:'The current plan, relevant authorization and appointment requirements have been reviewed and the family has been updated.',exceptionStatuses:['New plan under review','Old approval; applicability unconfirmed','Not started','Needs readiness review','None','None']},
 {title:'Assessment to treatment plan',owner:'BCBA → billing partner',from:'Clinical record',to:'Treatment authorization process',
   description:'The clinician completes the assessment and proposes a treatment plan. Clinical recommendations and family scheduling preferences are recorded separately.',
   trigger:'The assessment and supporting clinical documentation are complete.',info:'The clinician’s proposed services, goals and supporting documentation, plus plan-specific authorization requirements.',
   confirmation:'The treatment decision is recorded with service-specific units, dates and limitations where applicable. This does not represent the separate billing of the assessment.',
   statuses:['Response reviewed','Assessment completed','Approved treatment (sample)','Treatment scheduling pending','Treatment claim not created','None'],
   exceptionTitle:'The payer approves a different amount of care',exception:['Record the actual decision, including limits, rather than overwriting the clinical recommendation.','The clinical team discusses appropriate next steps with the family and determines whether to seek review.','The scheduling team uses the approved plan and applicable clinic policy; it does not independently change the clinical recommendation.'],
   recovery:'The decision and agreed next steps are recorded by the responsible clinical and billing teams.',exceptionStatuses:['Response reviewed','Assessment completed','Partial approval; review open','Planning in progress','Treatment claim not created','None']},
 {title:'Treatment scheduling',owner:'Scheduling team, with clinical oversight',from:'Treatment plan + authorization',to:'Appointment calendar',
   description:'The recurring schedule reconciles appropriate staff, family availability and the approved service limits. A proposed capacity signal can inform future acquisition decisions.',
   trigger:'Treatment requirements have been reviewed and suitable staff are available.',info:'Service, dates, units, relevant staff assignment and family availability.',
   confirmation:'The agreed schedule is checked against authorization limits and clinic requirements. The family receives a clear explanation of the schedule.',
   statuses:['Current review recorded','Assessment completed','Approved limits recorded','Treatment scheduled (sample)','Treatment claim not created','None'],
   exceptionTitle:'Available times do not fit the plan',exception:['Flag the capacity or availability conflict and assign a scheduler.','Discuss appropriate options with the family and clinical team. Do not convert preferred time windows into a treatment recommendation.','Update the schedule only after the responsible teams agree the next step.'],
   recovery:'A feasible schedule is confirmed, or the unresolved constraint remains visible with an owner and follow-up.',exceptionStatuses:['Current review recorded','Assessment completed','Approved limits recorded','Scheduling conflict','Treatment claim not created','None']},
 {title:'Service documentation',owner:'Rendering provider + clinical team',from:'Completed treatment session',to:'Clinical record / billing queue',
   description:'The clinical team records the service and completes required documentation. The example follows one treatment claim; assessment billing is a separate workstream.',
   trigger:'The treatment session has occurred.',info:'Service date and duration, provider, relevant service details and required clinical documentation.',
   confirmation:'The clinic’s documentation and review requirements are complete before the item is released to the billing workflow.',
   statuses:['Review recorded','Assessment completed','Usage recorded','Session completed','Ready for billing review','None'],
   exceptionTitle:'The note needs completion or review',exception:['Hold the item in the appropriate documentation queue.','Notify the responsible clinician with the required action under clinic policy.','Release it only when the required documentation and review are complete. Marketing has no role in signing clinical records.'],
   recovery:'The responsible provider completes the documentation and the clinical release is recorded.',exceptionStatuses:['Review recorded','Assessment completed','Usage recorded','Session completed','Held: documentation incomplete','None']},
 {title:'Claim submission & receipt',owner:'Billing partner / clearinghouse / payer',from:'Billing system',to:'Clearinghouse → payer',
   description:'The billing team prepares and submits the claim. Clearinghouse acceptance and payer acknowledgement are separate checkpoints; neither is a payment decision.',
   trigger:'The billing team has completed its claim review.',info:'The required claim fields, service details, provider identifiers and applicable authorization reference.',
   confirmation:'Record each acknowledgement separately. In this sample snapshot, the clearinghouse accepted the claim and payer acknowledgement is still pending.',
   statuses:['Review recorded','Assessment completed','Usage recorded','Session completed','Clearinghouse accepted; payer receipt pending','No payer decision'],
   exceptionTitle:'The claim is rejected before payer review',exception:['Keep the rejection distinct from a payer denial after adjudication.','The billing partner corrects the identified issue and resubmits with the appropriate claim references.','If registration data contributed, send a reviewed process-level issue back to intake. Do not transmit patient information to marketing.'],
   recovery:'The corrected claim has the required acknowledgement; payer receipt and adjudication remain separate checks.',exceptionStatuses:['Review recorded','Assessment completed','Usage recorded','Session completed','Rejected; correction required','Not awaiting a payment decision']},
 {title:'Decision, posting & reconciliation',owner:'Payer decides · billing partner reconciles',from:'Payer acknowledgement + remittance',to:'Billing ledger + deposit reconciliation',
   description:'After payer receipt and adjudication, the billing partner reviews remittance information and reconciles any payment to the deposit. A received remittance alone does not prove payment was reconciled.',
   trigger:'The payer’s decision is available, with the relevant remittance and payment information.',info:'Claim references, adjustments, payment and responsibility amounts, reason codes and deposit information.',
   confirmation:'In the expected sample, the payer decision is recorded, payment is posted and the deposit is reconciled. Any remaining balance is handled under applicable policy.',
   statuses:['Review recorded','Assessment completed','Usage recorded','Session completed','Payer adjudicated (sample)','Posted + reconciled (sample)'],
   exceptionTitle:'The claim is denied or partly paid',exception:['Record the payer’s reason and separate any paid amount from the amount still under review.','Assign follow-up, correction or appeal to the billing team under the applicable process.','Report reviewed aggregate reason categories when useful for improving intake. Do not call the denied balance collected revenue.'],
   recovery:'The ledger reflects actual receipts and adjustments, while open follow-up remains assigned and visible.',exceptionStatuses:['Review recorded','Assessment completed','Usage recorded','Session completed','Adjudicated; follow-up open','Denied / partial; unresolved balance']}
];

const state={scenario:'northside',page:'home',enrollStep:0,availability:'After school',stage:0,path:'expected'};
const $=id=>document.getElementById(id);
const escapeHTML=value=>String(value).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const button=(text,action,cls='button dark')=>`<button type="button" class="${cls}" data-action="${action}">${text}</button>`;
const status=(text,cls='sage')=>`<span class="status-tag ${cls}">${text}</span>`;
function renderCapacity(){
  const s=scenarios[state.scenario];
  document.querySelectorAll('[data-scenario]').forEach(b=>b.setAttribute('aria-pressed',String(b.dataset.scenario===state.scenario)));
  $('capacity-summary').innerHTML=`<div class="capacity-locations"><span class="tiny-label">Assumed clinic capacity</span><div><b>Northside</b><span>${s.northside}</span></div><div><b>Riverbend</b><span>${s.riverbend}</span></div></div><div><span class="tiny-label">Proposed campaign decision</span><h3>${s.title}</h3><p>${s.decision}</p></div><div class="capacity-search"><span class="tiny-label">Illustrative search message</span><h3>${s.ad}</h3><p>${s.message}</p></div>`;
}
function renderClinic(){
  const s=scenarios[state.scenario];
  document.querySelectorAll('[data-clinic-page]').forEach(b=>b.setAttribute('aria-pressed',String(b.dataset.clinicPage===state.page)));
  const content=$('clinic-content');
  if(state.page==='enroll'){renderEnrollment();return;}
  if(state.page==='home'){
    content.innerHTML=`<div class="clinic-home"><div><span class="eyebrow">Pediatric ABA / ${s.location}</span><h3>Care planned<br>around <em>your family.</em></h3><p>Get to know the clinic, explore availability and see what happens before a first visit. The intake team would explain the next steps and the benefits information available for your plan.</p><div class="clinic-actions">${button(s.cta+' <span aria-hidden="true">→</span>','enroll')}${button('Talk to intake','phone','quiet-button')}</div></div><div class="availability-panel"><h4>Availability <span>SAMPLE</span></h4><div class="availability-row"><div><b>Northside</b>${status(s.northside,state.scenario==='full'?'honey':'sage')}</div><p>${state.scenario==='northside'?'Assessment openings shown for this concept. Timing needs confirmation.':state.scenario==='full'?'Waitlist inquiries only in this scenario. No start date promised.':'Limited capacity; intake would review each inquiry.'}</p></div><div class="availability-row"><div><b>Riverbend</b>${status(s.riverbend,state.scenario==='riverbend'?'sage':'honey')}</div><p>${state.scenario==='riverbend'?'Existing waitlisted families would be contacted first.':'A waitlist update would explain the next review and contact process.'}</p></div></div></div>`;
  } else if(state.page==='insurance'){
    content.innerHTML=`<div class="clinic-info"><span class="eyebrow">Before you start / Example content</span><h3>Get clarity about<br>the next step.</h3><p>Your plan’s benefits, authorization requirements and estimated costs need to be checked for your circumstances. A benefits response is not a guarantee of payment.</p><ul><li>The intake team would explain what information is needed and why.</li><li>The billing team would review plan-specific requirements and record outstanding questions.</li><li>If something is missing, the family would receive a clear next action and contact route.</li></ul><div class="info-notice">Concept copy. A real clinic’s clinical and billing teams would review this information before patient-facing use.</div><div class="clinic-actions">${button('Explore sample intake →','enroll')}${button('Back to the clinic','home','quiet-button')}</div></div>`;
  } else if(state.page==='referrals'){
    content.innerHTML=`<div class="clinic-info"><span class="eyebrow">For referring offices / Example route</span><h3>A referral with<br>a clear acknowledgement.</h3><p>A real referral would use the clinic’s approved secure channel. The required documents depend on the service, plan and clinic.</p><ol><li>Review the clinic’s current availability and referral requirements.</li><li>Submit the required documentation through the approved channel.</li><li>Receive a reference, an assigned intake contact and a clear next update.</li></ol><div class="info-notice">No referral is submitted here. This prototype shows the proposed handoff only.</div><div class="clinic-actions">${button('See a sample referral acknowledgement','referral-confirm')}${button('Back to the clinic','home','quiet-button')}</div></div>`;
  } else if(state.page==='phone'){
    content.innerHTML=`<div class="clinic-info"><span class="eyebrow">A phone-first option / Sample</span><h3>Start with a conversation.</h3><p>The clinic would publish a verified intake number and staffed hours. A coordinator would explain availability, search for an existing inquiry and guide the family through the approved intake process.</p><div class="info-notice">No call is placed or callback requested in this demo. Phone details and response times require a real clinic’s confirmation.</div><div class="clinic-actions">${button('Explore the online example →','enroll')}${button('Back to the clinic','home','quiet-button')}</div></div>`;
  } else if(state.page==='referral-confirm'){
    content.innerHTML=`<div class="enrollment-complete"><span class="checkmark" aria-hidden="true">✓</span><span class="eyebrow">Synthetic acknowledgement / REF-0142</span><h3>Referral received<br>for intake review.</h3><p>This sample assigns the referral to an intake coordinator. Receipt is separate from clinical review, coverage approval and appointment booking.</p><div class="info-notice">Simulation only. No referral or clinical record was created.</div>${button('Return to the clinic','home')}</div>`;
  }
}
function renderEnrollment(){
  const s=scenarios[state.scenario], n=state.enrollStep;
  if(n===4){
    $('clinic-content').innerHTML=`<div class="enrollment-complete"><span class="checkmark" aria-hidden="true">✓</span><span class="eyebrow">Sample reference / SYN-0142</span><h3>${s.waitlist?'A waitlist inquiry,<br>ready for review.':'An inquiry,<br>ready for intake review.'}</h3><p>${s.waitlist?'The proposed record would stay on a waitlist with an assigned coordinator. No appointment or treatment start is implied.':'The proposed intake queue would show one new item and an assigned coordinator. No appointment, eligibility check or authorization is completed by this screen.'}</p><div class="info-notice">Demo complete. Nothing was submitted or stored. The journey explorer shows separate illustrative snapshots of a sample record after any required capacity and review steps.</div>${button('Explore the sample handoffs ↓','journey')}<div>${button('Back to the clinic','home','text-link')}</div></div>`;
    return;
  }
  const headings=['A simple first step.','Why we ask about insurance.','When could your family attend?','Review the sample inquiry.'];
  const sub=['This example uses fixed, fictional contact details. A real inquiry would continue in the clinic’s approved intake tool.','These preset details illustrate what a billing team might need to begin a review. No benefits request is sent.','Choose a preset time window to try the interface. Availability informs scheduling; clinical recommendations follow assessment.','Review this fictional record before viewing the sample acknowledgement.'];
  let fields='';
  if(n===0)fields=`<dl class="preset-fields"><div><dt>Guardian</dt><dd>R. Sample</dd></div><div><dt>Child</dt><dd>M. Sample</dd></div><div><dt>Contact</dt><dd>sample@example.invalid</dd></div><div><dt>Location interest</dt><dd>${s.location}</dd></div></dl><div class="info-notice">Preset sample details cannot be edited. Do not enter real patient information.</div>`;
  if(n===1)fields=`<dl class="preset-fields"><div><dt>Plan</dt><dd>Example health plan</dd></div><div><dt>Member reference</dt><dd>SYN-000412</dd></div><div><dt>Subscriber</dt><dd>Parent · synthetic</dd></div><div><dt>Supporting document</dt><dd>Intake review needed</dd></div></dl><div class="info-notice"><b>Why these fields?</b> They illustrate identifying the relevant plan and outstanding requirements. Actual fields and requirements depend on the clinic and plan.</div>`;
  if(n===2)fields=`<div class="enroll-choice" role="group" aria-label="Select a sample availability window">${['After school','Mornings','Discuss with intake'].map(v=>`<button type="button" data-availability="${v}" aria-pressed="${state.availability===v}">${v}</button>`).join('')}</div><div class="info-notice">This is a scheduling preference. It does not select treatment hours or guarantee an appointment.</div><dl class="preset-fields"><div><dt>Location interest</dt><dd>${s.location}</dd></div><div><dt>Current route</dt><dd>${s.waitlist?'Waitlist review':'Intake review'}</dd></div></dl>`;
  if(n===3)fields=`<dl class="preset-fields"><div><dt>Family record</dt><dd>M. Sample / R. Sample</dd></div><div><dt>Location</dt><dd>${s.location}</dd></div><div><dt>Preferred window</dt><dd>${state.availability}</dd></div><div><dt>Next owner</dt><dd>Intake coordinator</dd></div></dl><div class="info-notice">${s.waitlist?'This scenario has no current capacity. The next step is waitlist review, not booking.':'The next step is an intake review. Coverage, required authorizations and suitable capacity would still need confirmation.'}</div>`;
  $('clinic-content').innerHTML=`<div class="enrollment"><div class="enrollment-header"><div class="enrollment-progress" aria-label="Sample intake progress">${['Contact','Insurance','Availability','Review'].map((v,i)=>`<span class="${i===n?'active':i<n?'done':''}" ${i===n?'aria-current="step"':''}>${i+1} · ${v}</span>`).join('')}</div><span>Step ${n+1} of 4</span></div><h3 tabindex="-1" id="intake-heading">${headings[n]}</h3><p>${sub[n]}</p>${fields}<div class="enrollment-footer">${button(n===0?'← Clinic':'← Back','enroll-back','back-link')}${button(n===3?'View sample acknowledgement →':'Next step →','enroll-next')}</div></div>`;
}
function workflowMarkup(item,index,path='expected',print=false){
  const isException=path==='exception';
  const statuses=isException?item.exceptionStatuses:item.statuses;
  const statusLabels=['Eligibility','Assessment authorization','Treatment authorization','Appointment','Claim','Payment'];
  if(print)return `<article class="print-stage"><h3>${String(index+1).padStart(2,'0')} · ${item.title}</h3><p><b>Owner:</b> ${item.owner}</p><p><b>Systems:</b> ${item.from} → ${item.to}</p><p>${item.description}</p><p><b>Trigger:</b> ${item.trigger}</p><p><b>Expected acknowledgement:</b> ${item.confirmation}</p><p><b>Exception:</b> ${item.exceptionTitle}</p><ol>${item.exception.map(x=>`<li>${x}</li>`).join('')}</ol><p><b>Required recovery confirmation:</b> ${item.recovery}</p></article>`;
  return `<article class="workflow-detail"><span class="tiny-label">Handoff ${String(index+1).padStart(2,'0')} / ${item.design?'My design contribution':'Clinic and partner operations'}</span><h3>${item.title}</h3><div class="path-switch" role="group" aria-label="Choose expected or exception path"><button type="button" data-path="expected" aria-pressed="${!isException}">Expected path</button><button type="button" data-path="exception" aria-pressed="${isException}">Needs attention</button></div><div class="system-route"><span>${item.from}</span><b aria-hidden="true">→</b><span>${item.to}</span></div><p class="workflow-description">${item.description}</p><dl class="workflow-facts"><div><dt>Responsible team</dt><dd>${item.owner}</dd></div><div><dt>Trigger</dt><dd>${item.trigger}</dd></div><div><dt>${isException?'Required recovery confirmation':'Expected acknowledgement'}</dt><dd>${isException?item.recovery:item.confirmation}</dd></div></dl>${isException?`<div class="exception-box"><h4>${item.exceptionTitle}</h4><ol>${item.exception.map(v=>`<li>${v}</li>`).join('')}</ol></div>`:''}<dl class="workflow-statuses">${statusLabels.map((v,i)=>`<div><dt>${v}</dt><dd class="${isException?'attention':''}">${statuses[i]}</dd></div>`).join('')}</dl></article>`;
}
function renderWorkflow(){
  $('workflow-nav').innerHTML=journey.map((v,i)=>`<button type="button" data-stage="${i}" ${i===state.stage?'aria-current="step"':''}><span>${String(i+1).padStart(2,'0')}</span><span>${v.title}<small>${i<2?'Intake & record':i<7?'Readiness & care':'Documentation & billing'}</small></span></button>`).join('');
  $('workflow-detail').innerHTML=workflowMarkup(journey[state.stage],state.stage,state.path);
  $('stage-position').textContent=`${state.stage+1} / ${journey.length}`;
  $('previous-stage').disabled=state.stage===0;
  $('next-stage').disabled=state.stage===journey.length-1;
}
function setStage(index){state.stage=Math.max(0,Math.min(journey.length-1,index));state.path='expected';renderWorkflow();}
function focusIntake(){const h=$('intake-heading')||$('clinic-content').querySelector('h3');if(h){h.tabIndex=-1;h.focus({preventScroll:true});h.scrollIntoView({block:'start',behavior:'instant'});}}

document.addEventListener('click',event=>{
 const b=event.target.closest('button');if(!b)return;
 if(b.dataset.scenario){state.scenario=b.dataset.scenario;state.page='home';state.enrollStep=0;renderCapacity();renderClinic();return;}
 if(b.dataset.clinicPage){state.page=b.dataset.clinicPage;renderClinic();return;}
 if(b.dataset.stage!==undefined){setStage(Number(b.dataset.stage));document.querySelector(`[data-stage="${state.stage}"]`).focus({preventScroll:true});return;}
 if(b.dataset.path){state.path=b.dataset.path;renderWorkflow();document.querySelector(`[data-path="${state.path}"]`).focus({preventScroll:true});return;}
 if(b.dataset.availability){state.availability=b.dataset.availability;renderEnrollment();document.querySelector(`[data-availability="${state.availability}"]`).focus({preventScroll:true});return;}
 const action=b.dataset.action;
 if(action==='enroll'){state.page='enroll';state.enrollStep=0;renderClinic();focusIntake();}
 if(['home','phone','referral-confirm'].includes(action)){state.page=action;renderClinic();focusIntake();}
 if(action==='enroll-next'){state.enrollStep=Math.min(4,state.enrollStep+1);renderEnrollment();focusIntake();}
 if(action==='enroll-back'){if(state.enrollStep===0){state.page='home';renderClinic();}else{state.enrollStep--;renderEnrollment();}focusIntake();}
 if(action==='journey'){setStage(0);$('journey').scrollIntoView({behavior:window.matchMedia('(prefers-reduced-motion: reduce)').matches?'auto':'smooth'});document.querySelector('[data-stage="0"]').focus({preventScroll:true});}
 if(b.id==='reset-demo'){state.scenario='northside';state.page='home';state.enrollStep=0;state.availability='After school';renderCapacity();renderClinic();}
 if(b.id==='previous-stage')setStage(state.stage-1);
 if(b.id==='next-stage')setStage(state.stage+1);
 if(b.id==='print-case')window.print();
});

document.addEventListener('keydown',event=>{
  const buttonElement=event.target.closest('[data-stage]');if(!buttonElement)return;
  let index=Number(buttonElement.dataset.stage);
  if(['ArrowDown','ArrowRight','ArrowUp','ArrowLeft','Home','End'].includes(event.key)){
    event.preventDefault();
    if(['ArrowDown','ArrowRight'].includes(event.key))index=Math.min(journey.length-1,index+1);
    if(['ArrowUp','ArrowLeft'].includes(event.key))index=Math.max(0,index-1);
    if(event.key==='Home')index=0;if(event.key==='End')index=journey.length-1;
    setStage(index);document.querySelector(`[data-stage="${index}"]`).focus();
  }
});

let originallyClosed=[];
window.addEventListener('beforeprint',()=>{originallyClosed=Array.from(document.querySelectorAll('details:not([open])'));originallyClosed.forEach(x=>x.open=true);});
window.addEventListener('afterprint',()=>{originallyClosed.forEach(x=>x.open=false);originallyClosed=[];});

renderCapacity();renderClinic();renderWorkflow();
$('print-workflow').innerHTML=`<p>All workflow stages and exception paths. These are independent synthetic snapshots; they do not record actual operational progress.</p>${journey.map((item,index)=>workflowMarkup(item,index,'expected',true)).join('')}`;

// /cellexia/ page script (ES module). Ported from the design artifact.
// The demo's policy checks come from the tested rules in lib/, so the numbers on screen follow real logic.
import { POLICY, LANE, NON_EU } from '../data/policy.js';
import { guaranteeCheck } from '../lib/triage.js';
import { parcelStatus } from '../lib/lanes.js';
import { spikeRatio, roas, suggestedCap, isSpike } from '../lib/ads.js';
import { tagTheme } from '../lib/voice.js';

/* ---------- analytics (GoatCounter, cookie-free) ----------
   Share links like https://itdhruvjain.github.io/cellexia/?ref=cellexia ; events become "cellexia-<name>--<ref>". */
let REF = '';
try {
  const q = (new URLSearchParams(location.search).get('ref') || '').toLowerCase().replace(/[^a-z0-9-]/g, '').slice(0, 40);
  if (q) sessionStorage.setItem('cx-ref', q);
  REF = q || sessionStorage.getItem('cx-ref') || '';
} catch (e) { REF = ''; }
const SENT = new Set();
function track(name, once = true) {
  const key = 'cellexia-' + name + (REF ? '--' + REF : '');
  if (once && SENT.has(key)) return; SENT.add(key);
  const go = () => { try { window.goatcounter.count({ path: key, title: name + (REF ? ' (' + REF + ')' : ''), event: true }); } catch (e) {} };
  if (window.goatcounter && window.goatcounter.count) go(); else addEventListener('load', () => setTimeout(go, 400), { once: true });
}
if (REF) track('visit');

const RM = matchMedia('(prefers-reduced-motion: reduce)').matches;
const $ = s=>document.querySelector(s), $$ = s=>[...document.querySelectorAll(s)];
const sleep = ms=>new Promise(r=>setTimeout(r, RM?0:ms));
const NS='http://www.w3.org/2000/svg';
const mk=(t,a={},p)=>{const e=document.createElementNS(NS,t);for(const k in a)e.setAttribute(k,a[k]);p&&p.appendChild(e);return e};
const ease=t=>t<.5?4*t*t*t:1-Math.pow(-2*t+2,3)/2;
const back=t=>{const c1=1.5,c3=c1+1;return 1+c3*Math.pow(t-1,3)+c1*Math.pow(t-1,2)};
const clamp=(v,a=0,b=1)=>Math.max(a,Math.min(b,v));
const lerp=(a,b,t)=>a+(b-a)*t;

/* ---------- theme ---------- */
const setTheme=(t,save)=>{document.documentElement.dataset.theme=t;$('#themeTxt').textContent=t==='dark'?'Light':'Dark';$('#themeIco').textContent=t==='dark'?'☀':'☾';$('#theme').setAttribute('aria-pressed',t==='dark');if(save){try{localStorage.setItem('dj-theme',t)}catch(e){}}};
let saved=null;try{saved=localStorage.getItem('dj-theme')}catch(e){}
setTheme(saved||(matchMedia('(prefers-color-scheme: dark)').matches?'dark':'light'));
$('#theme').onclick=()=>setTheme(document.documentElement.dataset.theme==='dark'?'light':'dark',true);

/* ---------- toast ---------- */
let tt;const toast=m=>{const t=$('#toast');t.textContent=m;t.classList.add('on');clearTimeout(tt);tt=setTimeout(()=>t.classList.remove('on'),2200)};

/* ---------- headline + lines ---------- */
const h1=$('#h1');
const words=[['Hydrogen','+'],['oxygen.'],['Do','you','get','water?']];
if(!h1.querySelector('.w'))words.forEach((ln,i)=>{ln.forEach(w=>{const s=document.createElement('span');s.className='w'+(w==='water?'?' q':'');s.textContent=w;s.setAttribute('aria-hidden','true');h1.appendChild(s);h1.append(' ')});if(i<words.length-1)h1.appendChild(document.createElement('br'))});
function introText(){
  const ws=$$('#h1 .w'), ls=$$('.line');
  ws.forEach(w=>w.classList.remove('in'));ls.forEach(l=>l.classList.remove('in'));
  ws.forEach((w,i)=>setTimeout(()=>w.classList.add('in'),RM?0:40+i*70));
  if(!SCRUB) ls.forEach((l,i)=>setTimeout(()=>l.classList.add('in'),RM?0:[1600,3000,4600,6400][i]));
}
/* ---------- scroll-driven hero: frame 1 = the question, frame 2 = the answer ---------- */
let SCRUB=false,HP=0,P0=0,HM={dx:0,dy:0,s:1};
function setMode(){
  SCRUB=!RM&&innerWidth>900;document.body.classList.toggle('scrub',SCRUB);
  const h=$('#h1'),st=$('.heroSticky');
  if(!SCRUB){h.style.transform='';['.ctas','#stage'].forEach(q=>{$(q).style.opacity='';$(q).style.transform=''});$$('.line').forEach(l=>{l.style.opacity='';l.style.transform='';l.classList.add('in')});return}
  h.style.transform='none';
  const r=h.getBoundingClientRect(),sr=st.getBoundingClientRect();
  const hx=r.left-sr.left+r.width/2,hy=r.top-sr.top+r.height/2;
  HM={dx:sr.width/2-hx,dy:sr.height/2-hy-20,s:Math.min(1.7,(sr.width*.82)/r.width,(sr.height*.62)/r.height)};
  applyScrub();
}
function heroP(){const s=$('#why');return clamp(-s.getBoundingClientRect().top/(s.offsetHeight-$('.heroSticky').offsetHeight))}
function applyScrub(){
  if(!SCRUB)return;HP=heroP();P0=HP;
  const e=ease(clamp((HP-.04)/.2));
  $('#h1').style.transform=`translate(${HM.dx*(1-e)}px,${HM.dy*(1-e)}px) scale(${lerp(HM.s,1,e)})`;
  {const ho=1-clamp(HP/.05),hn=$('#hint');hn.style.opacity=ho;hn.style.visibility=ho<.05?'hidden':'visible'}
  const sk=ease(clamp((HP-.12)/.12));const stg=$('#stage');stg.style.opacity=sk;stg.style.transform=`translateY(${40*(1-sk)}px) scale(${.94+.06*sk})`;
  $$('.line').forEach((l,i)=>{const k=ease(clamp((HP-(.3+i*.12))/.08));l.style.opacity=k;l.style.transform=`translateX(${-24*(1-k)}px)`;l.style.filter=`blur(${4*(1-k)}px)`});
  const ck=ease(clamp((HP-.8)/.08));const c=$('.ctas');c.style.opacity=ck;c.style.transform=`translateY(${16*(1-ck)}px)`;c.style.pointerEvents=ck>.5?'auto':'none';
}
addEventListener('scroll',applyScrub,{passive:true});
addEventListener('resize',()=>{setMode()});

/* ---------- hero molecule -> team animation ---------- */
const svg=$('#mol'), C={x:250,y:230};
const ROLES=[['Founder',250,72],['Operations',388,128],['Ads & media',400,268],['SEO',322,372],['IT',178,372],['Support',100,268],['VAs',118,128]];
const MSGS=[
  [5,1,'Support → Operations · refund checked against the 60-day guarantee'],
  [2,0,'Ads → Founder · daily return on spend per market, no spreadsheet'],
  [1,5,'Operations → Support · stuck parcel flagged before the customer writes'],
  [6,2,'VAs → Ads · competitor ads collected and tagged automatically'],
  [4,1,'IT → Operations · new order webhook connected'],
  [3,0,'SEO → Founder · top landing pages and what changed'],
  [5,0,'Support → Founder · this week\'s review themes'],
  [2,1,'Ads → Operations · spend spike, cap suggested'],
];
let atoms,bonds,mol,core,pills=[],spokes=[],pulses=[],t0,raf,lastSpawn=0,flows=0,capStage=-1,msgIdx=0;
function build(){
  svg.innerHTML='';pills=[];spokes=[];pulses=[];flows=0;$('#flowCount').textContent='0';
  const defs=mk('defs',{},svg);
  const g=mk('radialGradient',{id:'glow'},defs);mk('stop',{offset:'0%','stop-color':'var(--navy)','stop-opacity':'.18'},g);mk('stop',{offset:'100%','stop-color':'var(--navy)','stop-opacity':'0'},g);
  mk('circle',{cx:C.x,cy:C.y,r:200,fill:'url(#glow)',id:'halo',opacity:0},svg);
  const sg=mk('g',{},svg);
  ROLES.forEach(()=>spokes.push(mk('line',{class:'spoke',x1:C.x,y1:C.y,x2:C.x,y2:C.y,opacity:0},sg)));
  mol=mk('g',{},svg);
  bonds=[mk('line',{stroke:'var(--navy)','stroke-width':6,'stroke-linecap':'round',opacity:0},mol),mk('line',{stroke:'var(--navy)','stroke-width':6,'stroke-linecap':'round',opacity:0},mol)];
  const mkAtom=(cls,lbl,r)=>{const a=mk('g',{opacity:0},mol);mk('circle',{r,class:cls},a);const t=mk('text',{class:'atom-t',fill:cls==='atom-o'?'#fff':'var(--ink)'},a);t.textContent=lbl;return a};
  atoms=[mkAtom('atom-o','O',34),mkAtom('atom-h','H',22),mkAtom('atom-h','H',22)];
  mk('text',{id:'h2o',x:C.x,y:325,'text-anchor':'middle','font-size':22,'font-weight':800,fill:'var(--navy)',opacity:0},mol).textContent='H₂O';
  core=mk('g',{class:'core',opacity:0},svg);
  mk('circle',{r:64,fill:'var(--navy)'},core);
  mk('circle',{r:64,fill:'none',stroke:'var(--navy)','stroke-width':2,opacity:.4,id:'coreRing'},core);
  const ct=mk('text',{y:-4},core);ct.textContent='The person';
  const ct2=mk('text',{y:16},core);ct2.textContent='who connects';
  const pg=mk('g',{},svg);
  ROLES.forEach(([n])=>{const p=mk('g',{class:'pill',opacity:0},pg);const w=n.length*8.6+34;mk('rect',{x:-w/2,y:-19,width:w,height:38,rx:19},p);const t=mk('text',{'text-anchor':'middle','dominant-baseline':'central'},p);t.textContent=n;pills.push(p)});
  svg.__pulseLayer=mk('g',{},svg);
}
const CAPS=['Two gases. Each fine on its own.','Add a bond, and you get something new: water.','A team works the same way.','Every role connected through one person who builds the links.'];
function cap(i){if(i===capStage)return;capStage=i;const c=$('#cap');c.style.opacity=0;setTimeout(()=>{c.textContent=CAPS[i];c.style.opacity=1},RM?0:250)}
const start=[[330,170],[150,310],[380,335]], water=[[250,205],[187,258],[313,258]];
function frame(now){
  const t=RM?20:SCRUB?clamp((HP-.16)/.64)*7.4:(now-t0)/1000;const tf=now/1000;const live=SCRUB?HP>.82:t>7;
  // phase A: atoms appear and float
  atoms.forEach((a,i)=>{
    const appear=clamp((t-.2-i*.2)/.6);
    const bond=ease(clamp((t-1.8)/1.1));
    const fl=(1-bond)*6;
    const x=lerp(start[i][0],water[i][0],bond)+Math.sin(tf*1.6+i*2)*fl;
    const y=lerp(start[i][1],water[i][1],bond)+Math.cos(tf*1.3+i)*fl;
    a.setAttribute('transform',`translate(${x},${y}) scale(${back(appear)||0.001})`);
    a.setAttribute('opacity',appear);a.__p=[x,y];
  });
  t<1.8?cap(0):t<4.2?cap(1):t<6.4?cap(2):cap(3);
  const bd=ease(clamp((t-2.4)/.8));
  bonds.forEach((b,i)=>{const o=atoms[0].__p,h=atoms[i+1].__p;b.setAttribute('x1',o[0]);b.setAttribute('y1',o[1]);b.setAttribute('x2',lerp(o[0],h[0],bd));b.setAttribute('y2',lerp(o[1],h[1],bd));b.setAttribute('opacity',bd?1:0)});
  $('#h2o').setAttribute('opacity',clamp((t-3)/.5));
  // phase D: molecule collapses into core
  const col=ease(clamp((t-4.4)/.8));
  mol.setAttribute('transform',`translate(${C.x} ${C.y}) scale(${1-col*.85}) translate(${-C.x} ${-C.y+col*20})`);
  mol.setAttribute('opacity',1-col);
  const cg=clamp((t-4.7)/.7);
  core.setAttribute('transform',`translate(${C.x},${C.y}) scale(${cg?back(cg):0.001})`);core.setAttribute('opacity',cg);
  $('#halo').setAttribute('opacity',cg);
  if(cg>=1&&!RM){const r=64+((tf*30)%40);const ring=$('#coreRing');ring.setAttribute('r',r);ring.setAttribute('opacity',.45*(1-(r-64)/40))}
  // phase E: roles fly out
  ROLES.forEach(([n,x,y],i)=>{
    const p=clamp((t-5.2-i*.12)/.9),e=back(p);
    const px=lerp(C.x,x,e),py=lerp(C.y,y,e);
    pills[i].setAttribute('transform',`translate(${px},${py}) scale(${p?Math.min(1,.4+p):0.001})`);pills[i].setAttribute('opacity',clamp(p*2));
    spokes[i].setAttribute('x2',px);spokes[i].setAttribute('y2',py);spokes[i].setAttribute('opacity',p?1:0);
    pills[i].__p=[x,y];
  });
  // phase F: pulses
  if(!live&&pulses.length){pulses.forEach(p=>p.el.remove());pulses=[];capStage=-1}
  if(live&&!RM){
    if(now-lastSpawn>1100){lastSpawn=now;spawn(now)}
    pulses=pulses.filter(p=>{
      const k=(now-p.t)/1400;
      if(k>=1){p.el.remove();pills[p.to].classList.add('hot');setTimeout(()=>pills[p.to].classList.remove('hot'),500);return false}
      const [ax,ay]=pills[p.from].__p,[bx,by]=pills[p.to].__p;
      let x,y;if(k<.5){const q=ease(k*2);x=lerp(ax,C.x,q);y=lerp(ay,C.y,q)}else{const q=ease((k-.5)*2);x=lerp(C.x,bx,q);y=lerp(C.y,by,q)}
      p.el.setAttribute('cx',x);p.el.setAttribute('cy',y);return true;
    });
  }
  if(!RM)raf=requestAnimationFrame(frame);
}
function spawn(now){
  const [from,to,txt]=MSGS[msgIdx++%MSGS.length];
  pills[from].classList.add('hot');setTimeout(()=>pills[from].classList.remove('hot'),400);
  const el=mk('circle',{r:6,fill:'var(--navy)',stroke:'var(--surface)','stroke-width':2},svg.__pulseLayer);
  pulses.push({from,to,t:now,el});
  flows++;$('#flowCount').textContent=flows;
  const c=$('#cap');c.style.opacity=0;setTimeout(()=>{c.textContent=txt;c.style.opacity=1},200);capStage=99;
}
function playHero(){cancelAnimationFrame(raf);build();capStage=-1;t0=performance.now();lastSpawn=0;introText();RM?frame(0):raf=requestAnimationFrame(frame)}
$('#replay').onclick=()=>{track('why_replay',false);scrollTo({top:0,behavior:'instant'});playHero()};
setMode();playHero();
if(document.fonts&&document.fonts.ready)document.fonts.ready.then(()=>setMode());

/* ---------- nav ink + scrollspy + progress ---------- */
const links=$$('nav.tabs a'), ink=$('#ink');
const moveInk=a=>{ink.style.left=a.offsetLeft+'px';ink.style.width=a.offsetWidth+'px'};
moveInk(links[0]);
const secs=links.map(a=>$(a.getAttribute('href')));
addEventListener('scroll',()=>{
  const y=scrollY+140;let cur=0;secs.forEach((s,i)=>{if(s.offsetTop<=y)cur=i});
  if(innerHeight+scrollY>=document.body.scrollHeight-4)cur=secs.length-1;
  links.forEach((a,i)=>a.classList.toggle('on',i===cur));moveInk(links[cur]);
  $('#progress').style.width=(scrollY/(document.body.scrollHeight-innerHeight)*100)+'%';
  // plan track
  const plan=$('#plan').getBoundingClientRect();const k=clamp((innerHeight*.8-plan.top)/(plan.height+innerHeight*.2));
  $('#trackFill').style.width=k*100+'%';
  $$('.wk').forEach((w,i)=>w.classList.toggle('lit',k>i/4+.05));
},{passive:true});
addEventListener('resize',()=>moveInk($('nav.tabs a.on')));

/* ---------- reveal + counters ---------- */
const io=new IntersectionObserver(es=>es.forEach(e=>{if(!e.isIntersecting)return;const el=e.target;
  const sib=[...el.parentElement.children].filter(c=>c.classList.contains('rv'));const d=Math.max(0,sib.indexOf(el))*90;
  setTimeout(()=>el.classList.add('in'),RM?0:d);
  el.querySelectorAll('[data-count]').forEach(countUp);io.unobserve(el)}),{threshold:.15});
$$('.rv').forEach(e=>io.observe(e));
function countUp(el){const to=+el.dataset.count,dec=+(el.dataset.dec||0),t0=performance.now();
  const f=n=>{const k=RM?1:clamp((n-t0)/1400);el.textContent=(to*ease(k)).toFixed(dec);if(k<1)requestAnimationFrame(f)};requestAnimationFrame(f)}
$$('.find').forEach(c=>c.addEventListener('pointermove',e=>{const r=c.getBoundingClientRect();c.style.setProperty('--mx',e.clientX-r.left+'px');c.style.setProperty('--my',e.clientY-r.top+'px')}));

/* ---------- ops hub scenario ---------- */

/* ---------- the rules behind each step (lib/, unit-tested) ---------- */
const NOW=Date.now(), DAY=864e5, HR=36e5;
const g1=guaranteeCheck({deliveredAt:new Date(NOW-21*DAY-HR)},new Date(NOW),POLICY);
const p3=parcelStatus({o:'CX-DEMO-10455',m:'CA',shippedAt:new Date(NOW-9*DAY-HR),lastScanAt:new Date(NOW-4*DAY-HR)},LANE.CA,new Date(NOW));
const ad4={n:'ELS_US_Video_60Day_V4',spend:1520,rev:3040,today:1520,avg7:724};
const th5=tagTheme('The cream feels lovely, but the cooling feeling makes my eyes water.');
const R={
  refund:[g1.ok?'ok':'bad',`Delivered ${g1.day} days ago, ${g1.ok?'within':'outside'} the ${POLICY.guaranteeDays}-day guarantee`],
  fee:[NON_EU.has('US')?'warn':'ok',NON_EU.has('US')?'Import charges may be collected by the courier (illustrative rule)':'Inside the EU: no import charges'],
  late:[p3.pastPromise?'bad':'ok',`Day ${p3.sinceShip} since dispatch: ${p3.sinceShip-LANE.CA.max} days past the ${LANE.CA.min}–${LANE.CA.max} day window`],
  stuck:[p3.stuck?'warn':'ok',`No carrier scan for ${p3.sinceScan} days (limit ${p3.limit})`],
  spike:[isSpike(ad4)?'bad':'ok',`Spend ${spikeRatio(ad4).toFixed(1)}× its 7-day average`],
  cap:suggestedCap(ad4),
  theme:th5.key==='menthol'?'menthol sensitivity':th5.key,
};
const STEPS=[
 {src:['✉','Support inbox','Marta G. · Spain · 07:02'],subj:'Refund please',
  body:'Hola, I used the eye serum for three weeks. It stings my eyes and I don\'t see a difference. I\'d like my money back as your guarantee says.',
  intent:'Refund under guarantee',conf:94,
  checks:[['ok','Order CX-DEMO-10391 found in Shopify'],R.refund,['warn','Mentions stinging: logged as an irritation theme'],['ok','Return RMA-2291 created, refund ready on approval']],
  draft:'Hi Marta, I\'m sorry the serum didn\'t suit you, and thank you for telling us about the stinging. You\'re on day 21 of our 60-day guarantee, so you\'re fully covered. Your return number is RMA-2291, and your refund goes out as soon as we receive it.',
  approver:'Support · one click',log:'refund triaged · policy ok · RMA-2291 created',k:[1,0,6,0]},
 {src:['⚡','Shopify webhook','orders/create · 07:15'],subj:'New order · United States · $151.30',
  body:'Deep Wrinkle Filler Gel ×2, shipping from the EU warehouse to Ohio, US.',
  intent:'Cross-border order',conf:99,
  checks:[['ok','Ships from the EU to a non-EU country'],R.fee,['ok','Customer not yet told about possible fees'],['ok','"What to expect at delivery" email queued']],
  draft:'Hi Jane, thank you for your order! It ships from our European warehouse. Depending on US rules at the time, the courier may collect import charges on delivery. Here\'s what to expect and who to contact if you have questions.',
  approver:'Template approved once',log:'US order · fee notice queued before dispatch',k:[1,1,4,0]},
 {src:['📦','Carrier tracking','FedEx · Canada · 08:40'],subj:'Parcel CX-DEMO-10455 has stopped moving',
  body:'Last scan "Clearance delay" 4 days ago. Day 9 since dispatch against a promised window of 5–7 days.',
  intent:'Late delivery',conf:97,
  checks:[R.late,R.stuck,['ok','No ticket from the customer yet'],['ok','Apology email drafted, carrier claim prepared']],
  draft:'Hi Ruth, a quick heads-up before you have to ask: your parcel is held at customs clearance, so it\'s running a little late. We\'re on it with FedEx and expect it within 3 working days. Thank you for your patience.',
  approver:'Support · one click',log:'late parcel caught · customer told first',k:[1,1,5,0]},
 {src:['◎','Meta Ads','daily check · 09:10'],subj:'ELS_US_Video_60Day_V4 spent 2.1× its usual',
  body:'Yesterday €1,520 spend for €3,040 revenue: a return of 2.0, against 3.3 for the US account average.',
  intent:'Spend anomaly',conf:92,
  checks:[R.spike,['warn',`Return ${roas(ad4).toFixed(1)} against an account average of 3.3`],['ok','Creative frequency checked: 4.1, likely fatigue'],['ok',`Suggested daily cap €${R.cap} sent to the media buyer`]],
  draft:`#ads-alerts · ELS_US_Video_60Day_V4 overspent overnight (${spikeRatio(ad4).toFixed(1)}× usual, return ${roas(ad4).toFixed(1)}). Suggest capping at €${R.cap}/day and testing a fresh hook. Approve the cap?`,
  approver:'Media buyer decides',log:'spend spike flagged · cap suggested',k:[1,0,3,820]},
 {src:['★','Trustpilot','new review · 09:30'],subj:'2★ "Too strong for my eyes"',
  body:'The cream feels lovely, but the cooling feeling makes my eyes water. Wish this was mentioned on the page.',
  intent:'Product irritation',conf:90,
  checks:[['ok',`Theme matched: ${R.theme} (7 this month)`],['ok','Public reply drafted in brand voice'],['ok','Support team asked to contact the customer privately'],['ok','Weekly theme report updated for product']],
  draft:'Thank you for being honest with us. Some of our formulas include a cooling ingredient that sensitive eyes can react to. We\'ll make that clearer on the page. Our team is emailing you now to arrange a refund under our 60-day guarantee.',
  approver:'Support · one click',log:'review answered · theme +1 → product',k:[1,0,5,0]},
];
const tot=[0,0,0,0];let running=false,runId=0;
const view=$('#view'),log=$('#log');
const addLog=s=>{const d=document.createElement('div');const t=['07:02','07:15','08:40','09:10','09:30'];d.innerHTML=s;log.prepend(d);while(log.children.length>8)log.lastChild.remove()};
function bump(i,v){tot[i]+=v;const el=$('#k'+i);const b=el.querySelector('b');const from=tot[i]-v,to=tot[i],t0=performance.now();
  const fmt=n=>i===2?Math.round(n)+' min':i===3?'€'+Math.round(n).toLocaleString():Math.round(n);
  const f=n=>{const k=RM?1:clamp((n-t0)/700);b.textContent=fmt(from+(to-from)*ease(k));if(k<1)requestAnimationFrame(f)};requestAnimationFrame(f);
  el.classList.remove('bump');void el.offsetWidth;el.classList.add('bump')}
async function type(el,text,id,speed=12){el.classList.add('caret');el.textContent='';
  if(RM){el.textContent=text;el.classList.remove('caret');return}
  for(let i=0;i<text.length;i+=2){if(id!==runId)return;el.textContent=text.slice(0,i+2);await sleep(speed)}el.classList.remove('caret')}
async function runStep(i,id){
  const s=STEPS[i];$$('.step').forEach((b,j)=>{b.classList.toggle('run',j===i)});
  view.innerHTML=`
   <div class="panel"><h4><span>Incoming</span><span>${s.src[2].split('·').pop().trim()}</span></h4>
     <div class="src"><div class="ico">${s.src[0]}</div><div><b>${s.subj}</b><span>${s.src[1]} · ${s.src[2]}</span></div></div>
     <div class="msg" id="msg"></div></div>
   <div class="panel"><h4><span>Checks</span><span id="intent"></span></h4><ul class="checks" id="checks">${s.checks.map(([k,t])=>`<li><span class="k ${k}">${k==='ok'?'✓':k==='warn'?'!':'✕'}</span><span>${t}</span></li>`).join('')}</ul></div>
   <div class="panel draft"><h4><span>Drafted ${i===3?'alert':'reply'}</span><span>AI draft · needs approval</span></h4>
     <div class="msg" id="draft"></div>
     <div class="actions"><button class="mini go" id="approve" disabled>Approve & send</button><button class="mini">Edit</button><button class="mini">Escalate</button><span class="who">${s.approver}</span></div></div>`;
  await type($('#msg'),s.body,id,16);if(id!==runId)return;
  await sleep(250);$('#intent').innerHTML=`${s.intent}<span class="tag">${s.conf}%</span>`;
  for(const li of $$('#checks li')){if(id!==runId)return;await sleep(520);li.classList.add('in')}
  await sleep(400);await type($('#draft'),s.draft,id,14);if(id!==runId)return;
  const ap=$('#approve');ap.disabled=false;await sleep(700);if(id!==runId)return;
  ap.classList.add('pressing');ap.textContent='Sent ✓';toast(i===3?'Alert sent to the media buyer':'Approved · sent to customer');
  addLog(`[${['07:02','07:15','08:40','09:10','09:30'][i]}] <b>✓</b> ${s.log}`);
  s.k.forEach((v,j)=>v&&bump(j,v));
  $$('.step')[i].classList.remove('run');$$('.step')[i].classList.add('done');
  await sleep(2200);
}
async function playAll(){track('demo_play',false);const id=++runId;tot.fill(0);['0','0','0 min','€0'].forEach((v,i)=>$('#k'+i+' b').textContent=v);
  $$('.step').forEach(b=>b.classList.remove('done','run'));log.innerHTML='<div>ops-hub ready · 5 events queued</div>';
  $('#play').textContent='⏸ Running…';
  for(let i=0;i<STEPS.length;i++){if(id!==runId)return;await runStep(i,id)}
  if(id!==runId)return;$('#play').textContent='↻ Play again';
  view.innerHTML=`<div class="empty"><div><div class="big">09:31</div>Five issues handled before the team's first meeting.<br><b>${tot[2]} minutes</b> of manual work saved, and every customer message was approved by a person.</div></div>`;
}
$('#play').onclick=playAll;
$$('.step').forEach(b=>b.onclick=async()=>{track('step_'+b.dataset.i,false);const id=++runId;$$('.step').forEach(x=>x.classList.remove('run'));$('#play').textContent='▶ Play the whole morning';await runStep(+b.dataset.i,id)});
// auto-play when the hub first scrolls into view
const hio=new IntersectionObserver(es=>{if(es[0].isIntersecting){hio.disconnect();setTimeout(playAll,500)}},{threshold:.45});hio.observe($('.window'));

/* ---------- architecture ---------- */
const AB=$('#archBoxes'),AF=$('#archFlows');
const srcs=['Shopify','Helpdesk','Carriers','Meta · YouTube','Trustpilot'];
const box=(x,y,w,h,t,cls='')=>{const g=mk('g',{class:'box '+cls},AB);mk('rect',{x:x-w/2,y:y-h/2,width:w,height:h,rx:12},g);const lines=t.split('\n');lines.forEach((l,i)=>mk('text',{x,y:y+5+(i-(lines.length-1)/2)*17},g).textContent=l);return g};
srcs.forEach((s,i)=>{const y=34+i*58;box(90,y,150,40,s);mk('path',{class:'flow',d:`M165 ${y} C 250 ${y}, 260 150, 340 150`},AF)});
box(420,150,160,70,'Ops service\nchecks · rules','main');
mk('path',{class:'flow',d:'M500 150 L 570 150'},AF);
box(640,150,130,54,'AI drafts\nreply / alert');
mk('path',{class:'flow',d:'M705 150 L 765 150'},AF);
box(835,150,130,54,'Person\napproves','human');
[70,150,230].forEach(y=>mk('path',{class:'flow',d:`M900 150 C 925 150, 920 ${y}, 945 ${y}`},AF));
// labels for outputs
[['Email',70],['Slack',150],['Shopify',230]].forEach(([t,y])=>{const g=mk('g',{class:'box'},AB);mk('rect',{x:945,y:y-16,width:52,height:32,rx:9},g);mk('text',{x:971,y:y+5,'font-size':11},g).textContent=t});

/* ---------- contact ---------- */
$('#copyMail').onclick=async()=>{track('cta_copy_email',false);try{await navigator.clipboard.writeText('hello.dhruvjain@gmail.com');toast('Email copied: hello.dhruvjain@gmail.com')}catch(e){toast('hello.dhruvjain@gmail.com')}};
// sparks: bonding particles
const cv=$('#sparks'),cx=cv.getContext('2d');let P=[];
function sizeCv(){cv.width=cv.offsetWidth*devicePixelRatio;cv.height=cv.offsetHeight*devicePixelRatio;P=Array.from({length:46},()=>({x:Math.random()*cv.width,y:Math.random()*cv.height,vx:(Math.random()-.5)*.4*devicePixelRatio,vy:(Math.random()-.5)*.4*devicePixelRatio}))}
sizeCv();addEventListener('resize',sizeCv);
(function sp(){cx.clearRect(0,0,cv.width,cv.height);const col=document.documentElement.dataset.theme==='dark'?'16,17,24':'255,255,255';
  P.forEach(p=>{p.x+=p.vx;p.y+=p.vy;if(p.x<0||p.x>cv.width)p.vx*=-1;if(p.y<0||p.y>cv.height)p.vy*=-1;cx.fillStyle=`rgba(${col},.9)`;cx.beginPath();cx.arc(p.x,p.y,2*devicePixelRatio,0,7);cx.fill()});
  const D=120*devicePixelRatio;for(let i=0;i<P.length;i++)for(let j=i+1;j<P.length;j++){const d=Math.hypot(P[i].x-P[j].x,P[i].y-P[j].y);if(d<D){cx.strokeStyle=`rgba(${col},${.5*(1-d/D)})`;cx.lineWidth=devicePixelRatio;cx.beginPath();cx.moveTo(P[i].x,P[i].y);cx.lineTo(P[j].x,P[j].y);cx.stroke()}}
  if(!RM)requestAnimationFrame(sp)})();

document.addEventListener('click',e=>{if(e.target.closest('a[href^="mailto:"]'))track('cta_email',false)});

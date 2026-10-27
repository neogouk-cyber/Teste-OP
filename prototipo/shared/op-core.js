/* Núcleo comum das três versões da Central de Orientações Pedagógicas.
   Lê os dados (window.OP_DB, OP_META, OP_DESTAQUES), interpreta datas e responsáveis,
   monta cartões, leitor, calendário, busca e exportação para agenda (.ics e Google Agenda). */
(function(){
'use strict';
const CONFIG=Object.assign({
  /* Endereços da versão final. Vazios no protótipo: o site usa a cópia local. */
  dataUrl:'',        // JSON gerado do Google Drive (Apps Script ou GitHub Action)
  destaquesCsv:'',   // planilha "Destaques" publicada como CSV
  siteUrl:'https://neogouk-cyber.github.io/Teste-OP/'
},window.OP_CONFIG||{});

let DB=window.OP_DB||[], META=window.OP_META||{}, DEST=window.OP_DESTAQUES||[];
const $=(s,r)=>(r||document).querySelector(s), $$=(s,r)=>[...(r||document).querySelectorAll(s)];
const esc=s=>String(s==null?'':s).replace(/[&<>"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));
const norm=s=>String(s).normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase();
const pad=n=>String(n).padStart(2,'0');
const MON=['janeiro','fevereiro','março','abril','maio','junho','julho','agosto','setembro','outubro','novembro','dezembro'];
const MON3=['JAN','FEV','MAR','ABR','MAI','JUN','JUL','AGO','SET','OUT','NOV','DEZ'];
const WD=['Domingo','Segunda-feira','Terça-feira','Quarta-feira','Quinta-feira','Sexta-feira','Sábado'];
const WD3=['dom','seg','ter','qua','qui','sex','sáb'];

/* "Hoje" pode ser simulado na apresentação com ?hoje=2026-10-20 */
const NOW=(()=>{const q=/[?&]hoje=(\d{4})-(\d{2})-(\d{2})/.exec(location.search);return q?new Date(+q[1],+q[2]-1,+q[3]):new Date()})();
const store={get(k){try{return localStorage.getItem(k)}catch(e){return null}},set(k,v){try{localStorage.setItem(k,v)}catch(e){}}};

/* ---------- ícones (traço, 24px) ---------- */
const P={
 book:'<path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z"/><path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z"/>',
 clock:'<circle cx="12" cy="12" r="10"/><path d="M12 6v6l4 2"/>',
 sprout:'<path d="M7 20h10"/><path d="M10 20c5.5-2.5.8-6.4 3-10"/><path d="M9.5 9.4c1.1.8 1.8 2.2 2.3 3.7-2 .4-3.5.4-4.8-.3-1.2-.6-2.3-1.9-3-4.2 2.8-.5 4.4 0 5.5.8z"/><path d="M14.1 6a7 7 0 0 0-1.1 4c1.9-.1 3.3-.6 4.3-1.4 1-1 1.6-2.3 1.7-4.6-2.7.1-4 1-4.9 2z"/>',
 shapes:'<path d="M8.3 10 12 3l3.7 7z"/><rect x="3" y="14" width="7" height="7" rx="1"/><circle cx="17.5" cy="17.5" r="3.5"/>',
 pen:'<path d="M17 3a2.85 2.83 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5z"/>',
 search:'<circle cx="11" cy="11" r="8"/><path d="m21 21-4.3-4.3"/>',
 cap:'<path d="M22 10v6"/><path d="m2 10 10-5 10 5-10 5z"/><path d="M6 12v5c3 3 9 3 12 0v-5"/>',
 heart:'<path d="M19 14c1.49-1.46 3-3.21 3-5.5A5.5 5.5 0 0 0 16.5 3c-1.76 0-3 .5-4.5 2-1.5-1.5-2.74-2-4.5-2A5.5 5.5 0 0 0 2 8.5c0 2.3 1.5 4.05 3 5.5l7 7z"/>',
 globe:'<circle cx="12" cy="12" r="10"/><path d="M12 2a14.5 14.5 0 0 0 0 20 14.5 14.5 0 0 0 0-20"/><path d="M2 12h20"/>',
 bulb:'<path d="M15 14c.2-1 .7-1.7 1.5-2.5 1-.9 1.5-2.2 1.5-3.5A6 6 0 0 0 6 8c0 1 .2 2.2 1.5 3.5.7.7 1.3 1.5 1.5 2.5"/><path d="M9 18h6"/><path d="M10 22h4"/>',
 trophy:'<path d="M6 9H4.5a2.5 2.5 0 0 1 0-5H6"/><path d="M18 9h1.5a2.5 2.5 0 0 0 0-5H18"/><path d="M4 22h16"/><path d="M10 14.66V17c0 .55-.47.98-.97 1.21C7.85 18.75 7 20.24 7 22"/><path d="M14 14.66V17c0 .55.47.98.97 1.21C16.15 18.75 17 20.24 17 22"/><path d="M18 2H6v7a6 6 0 0 0 12 0z"/>',
 monitor:'<rect x="2" y="3" width="20" height="14" rx="2"/><path d="M8 21h8"/><path d="M12 17v4"/>',
 cal:'<rect x="3" y="4" width="18" height="18" rx="2"/><path d="M16 2v4M8 2v4M3 10h18"/>',
 calplus:'<rect x="3" y="4" width="18" height="18" rx="2"/><path d="M16 2v4M8 2v4M3 10h18M12 14v5M9.5 16.5h5"/>',
 users:'<path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M22 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/>',
 teacher:'<path d="M2 3h20"/><path d="M21 3v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V3"/><path d="m7 21 5-5 5 5"/>',
 compass:'<circle cx="12" cy="12" r="10"/><path d="m16.24 7.76-2.12 6.36-6.36 2.12 2.12-6.36z"/>',
 home:'<path d="m3 9 9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><path d="M9 22V12h6v10"/>',
 smile:'<circle cx="12" cy="12" r="10"/><path d="M8 14s1.5 2 4 2 4-2 4-2"/><path d="M9 9h.01M15 9h.01"/>',
 building:'<rect x="4" y="2" width="16" height="20" rx="2"/><path d="M9 22v-4h6v4"/><path d="M8 6h.01M12 6h.01M16 6h.01M8 10h.01M12 10h.01M16 10h.01M8 14h.01M12 14h.01M16 14h.01"/>',
 pin:'<path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0z"/><circle cx="12" cy="10" r="3"/>',
 link:'<path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"/><path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"/>',
 chevL:'<path d="m15 18-6-6 6-6"/>', chevR:'<path d="m9 18 6-6-6-6"/>', up:'<path d="m18 15-6-6-6 6"/>', down:'<path d="m6 9 6 6 6-6"/>',
 arrow:'<path d="M5 12h14"/><path d="m13 6 6 6-6 6"/>',
 out:'<path d="M7 17 17 7"/><path d="M7 7h10v10"/>',
 print:'<path d="M6 9V2h12v7"/><path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2"/><rect x="6" y="14" width="12" height="8"/>',
 share:'<path d="M4 12v8a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-8"/><path d="m16 6-4-4-4 4"/><path d="M12 2v13"/>',
 type:'<path d="M4 7V4h16v3"/><path d="M9 20h6"/><path d="M12 4v16"/>',
 list:'<path d="M8 6h13M8 12h13M8 18h13M3 6h.01M3 12h.01M3 18h.01"/>',
 x:'<path d="M18 6 6 18"/><path d="m6 6 12 12"/>',
 sun:'<circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M6.34 17.66l-1.41 1.41M19.07 4.93l-1.41 1.41"/>',
 moon:'<path d="M12 3a6 6 0 0 0 9 9 9 9 0 1 1-9-9z"/>',
 repeat:'<path d="m17 2 4 4-4 4"/><path d="M3 11v-1a4 4 0 0 1 4-4h14"/><path d="m7 22-4-4 4-4"/><path d="M21 13v1a4 4 0 0 1-4 4H3"/>',
 info:'<circle cx="12" cy="12" r="10"/><path d="M12 16v-4M12 8h.01"/>',
 flag:'<path d="M4 15s1-1 4-1 5 2 8 2 4-1 4-1V3s-1 1-4 1-5-2-8-2-4 1-4 1z"/><path d="M4 22v-7"/>',
 download:'<path d="M12 15V3"/><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><path d="m7 10 5 5 5-5"/>',
 refresh:'<path d="M3 12a9 9 0 0 1 9-9 9.75 9.75 0 0 1 6.74 2.74L21 8"/><path d="M21 3v5h-5"/><path d="M21 12a9 9 0 0 1-9 9 9.75 9.75 0 0 1-6.74-2.74L3 16"/><path d="M8 16H3v5"/>',
 cloud:'<path d="M17.5 19H9a7 7 0 1 1 6.71-9h1.79a4.5 4.5 0 1 1 0 9Z"/>',
 megaphone:'<path d="m3 11 18-5v12L3 14v-3z"/><path d="M11.6 16.8a3 3 0 1 1-5.8-1.6"/>',
 star:'<path d="m12 2 3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01z"/>',
 bell:'<path d="M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9"/><path d="M10.3 21a1.94 1.94 0 0 0 3.4 0"/>',
 user:'<circle cx="12" cy="8" r="5"/><path d="M20 21a8 8 0 0 0-16 0"/>',
 sliders:'<path d="M4 21v-7M4 10V3M12 21v-9M12 8V3M20 21v-5M20 12V3M1 14h6M9 8h6M17 16h6"/>',
 check:'<path d="M20 6 9 17l-5-5"/>',
 file:'<path d="M14.5 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5z"/><path d="M14 2v6h6"/>',
 grid:'<rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/><rect x="14" y="14" width="7" height="7" rx="1"/><rect x="3" y="14" width="7" height="7" rx="1"/>'
};
const ic=(n,c)=>`<svg class="ic ${c||''}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${P[n]||''}</svg>`;

/* ---------- seções ---------- */
const SM={ef:['book','Ensino Fundamental','EF'],emti:['clock','Tempo Integral','EMTI'],emei:['sprout','EMEI','EMEI'],ei:['shapes','Educação Infantil','EI'],eja:['pen','EJA','EJA'],busca:['search','Busca Ativa','BA'],form:['cap','Formações','FOR'],inc:['heart','Inclusão','INC'],neabi:['globe','NEABI','NEABI'],geripe:['bulb','Inovação','INOV'],desp:['trophy','Desporto','DESP'],nec:['monitor','Conexão Escola','NEC']};
const sIco=k=>(SM[k]||['book'])[0], sShort=k=>(SM[k]||[0,k])[1];
const ETAPAS=[
  {id:'ei',label:'Educação Infantil',keys:['ei','emei'],ico:'shapes'},
  {id:'ef',label:'Ensino Fundamental',keys:['ef','emti'],ico:'book'},
  {id:'eja',label:'EJA',keys:['eja'],ico:'pen'}
];
const TRANSV=['busca','form','inc','neabi','geripe','desp','nec'];
const PERFIS=[
  {id:'prof',label:'Professor(a)',ico:'teacher',re:/professor|regente|docente|pedagogo|profissionais da educa/i},
  {id:'coord',label:'Coordenação pedagógica',ico:'compass',re:/coordenador|equipe gestora|profissionais da educa/i},
  {id:'gestao',label:'Direção e equipe gestora',ico:'building',re:/equipe gestora|gestor|diretor|secret[aá]rio|unidades? educaciona|profissionais da educa/i},
  {id:'apoio',label:'Apoio, AEE e auxiliares',ico:'heart',re:/auxiliar|apoio|AEE|inclus|profissionais da educa/i},
  {id:'cre',label:'CRE e equipes da SME',ico:'users',re:/./}
];
function matchPerfil(ev,pid){
  const p=PERFIS.find(x=>x.id===pid); if(!p||pid==='cre')return true;
  const r=(ev.a.resp||'').trim(); if(!r||r.length<4)return true;
  return p.re.test(r);
}

/* ---------- texto e links ---------- */
function hostLabel(u){
  try{const x=new URL(u),h=x.hostname.replace(/^www\./,''),p=x.pathname;
    if(h==='drive.google.com')return /\/folders\//.test(p)?'Pasta no Drive':'Arquivo no Drive';
    if(h==='docs.google.com')return /forms/.test(p)?'Formulário':/spreadsheets/.test(p)?'Planilha':/presentation/.test(p)?'Apresentação':'Documento';
    if(h==='forms.gle')return 'Formulário'; if(/youtu/.test(h))return 'YouTube'; if(/canva/.test(h))return 'Canva';
    if(/classroom\.google/.test(h))return 'Google Classroom'; return h;}catch(e){return 'Link'}
}
function linkLabel(label,u){
  const t=(label||'').replace(/^[^\wÀ-ú]+/,'').trim();
  if(t.length<4||/^(aqui|link|clique aqui|clique|acesse|acesse aqui|abrir)\b/i.test(t)||/^https?:/i.test(t)) return hostLabel(u);
  return t.length>42?t.slice(0,40)+'…':t;
}
function shortUrl(t){try{const x=new URL(t.replace(/[.,;)]+$/,''));let r=x.hostname.replace(/^www\./,'')+x.pathname;return r.length>38?r.slice(0,36)+'…':r}catch(e){return t.slice(0,38)}}

/* ---------- datas ---------- */
function splitDate(str){
  str=(str||'').replace(/\s+/g,' ').trim();
  const loc=/Local\s*:?\s*(.*?)(?=\s*Hor[áa]rio|$)/i.exec(str), hr=/Hor[áa]rio\s*:?\s*(.*)$/i.exec(str);
  const d=str.replace(/\s*(Local|Hor[áa]rio)\s*:?.*$/i,'').trim();
  return {date:d,local:loc?loc[1].trim():'',hora:hr?hr[1].trim():''};
}
function parseWhen(str){
  let s=(str||'').replace(/(\d{1,2})\s*(?:º|°)?\s+de\s+(janeiro|fevereiro|mar[çc]o|abril|maio|junho|julho|agosto|setembro|outubro|novembro|dezembro)(?:\s+de\s+\d{4})?/gi,(x,d,mm)=>d+'/'+(MON.findIndex(n=>n.replace('ç','c')===mm.toLowerCase().replace('ç','c'))+1)).replace(/\(?\bturma\s*\d+\)?/gi,' ').replace(/(\d{1,2}\/\d{1,2})\/(?:20)?\d{2}\b/g,'$1').replace(/\b20\d\d\b/g,' ');
  const info={text:str||'',cont:/cont[ií]nua|permanente/i.test(s),from:false,until:false,items:[]};
  const re=/(\d{1,2})(?:\/(\d{1,2}))?/g; let m; const tk=[];
  while((m=re.exec(s))){
    const pv=s[m.index-1]||'', nx=s[re.lastIndex]||'';
    if(/[\d\/]/.test(pv)||/[\dº°ª\/h:]/i.test(nx))continue;
    const d=+m[1],mo=m[2]?+m[2]:null; if(d<1||d>31||(mo&&mo>12))continue;
    tk.push({d,mo,i:m.index,e:re.lastIndex});
  }
  if(!tk.length)return info;
  const pre=s.slice(0,tk[0].i); info.from=/a partir/i.test(pre); info.until=/\baté\b/i.test(pre);
  for(let i=tk.length-1;i>=0;i--) if(tk[i].mo==null) tk[i].mo=(i<tk.length-1&&tk[i+1].mo)?tk[i+1].mo:null;
  for(let i=0;i<tk.length;i++){
    const a=tk[i],b=tk[i+1];
    if(b&&/^\s*(a|até|à|–|-|—)\s*$/i.test(s.slice(a.e,b.i))){info.items.push({t:'r',d1:a.d,m1:a.mo,d2:b.d,m2:b.mo});i++;}
    else info.items.push({t:'s',d:a.d,m:a.mo});
  }
  return info;
}
function daysFor(info,mo,dim){
  const out=new Map(); const set=(d,r)=>{if(d>=1&&d<=dim&&(!out.has(d)||r!=='mid'))out.set(d,r)};
  info.items.forEach(it=>{
    if(it.t==='s'){ const m=it.m==null?mo:it.m; if(m===mo)set(it.d,info.from?'start':info.until?'end':'one'); }
    else{
      const m1=it.m1==null?(it.m2==null?mo:it.m2):it.m1, m2=it.m2==null?m1:it.m2;
      if(m1===mo&&m2===mo){ if(it.d2-it.d1<=7){for(let d=it.d1;d<=it.d2;d++)set(d,d===it.d1?'start':d===it.d2?'end':'mid');}else{set(it.d1,'start');set(it.d2,'end');} }
      else if(m1===mo&&m2>mo){set(it.d1,'start')}
      else if(m2===mo&&m1<mo){set(it.d2,'end')}
    }
  });
  return out;
}
/* Intervalos reais (Date) de uma ação, para agenda e "próximos dias" */
function ranges(ev,m){
  const y=m.year||2026, mo=m.mnum, out=[];
  ev.when.items.forEach(it=>{
    if(it.t==='s'){const mm=it.m==null?mo:it.m; const d=new Date(y,mm-1,it.d); out.push({s:d,e:d,until:ev.when.until,from:ev.when.from});}
    else{const m1=it.m1==null?(it.m2==null?mo:it.m2):it.m1, m2=it.m2==null?m1:it.m2; out.push({s:new Date(y,m1-1,it.d1),e:new Date(y,m2-1,it.d2)});}
  });
  return out;
}
const dayKey=d=>d.getFullYear()*10000+(d.getMonth()+1)*100+d.getDate();
const sameDay=(a,b)=>dayKey(a)===dayKey(b);
const addDays=(d,n)=>new Date(d.getFullYear(),d.getMonth(),d.getDate()+n);

/* ---------- ações ---------- */
const ROLES=[[/professor/i,'teacher','Professores'],[/equipe gestora|\bgestora\b/i,'users','Equipe gestora'],[/diretor/i,'building','Diretores'],[/coordenador/i,'compass','Coordenadores'],[/pedagogo/i,'cap','Pedagogos'],[/auxiliar/i,'users','Auxiliares'],[/fam[ií]lia|\bpais\b/i,'home','Famílias'],[/estudante|aluno|crian[çc]a/i,'smile','Estudantes'],[/\bCRE\b|Coordenadoria/,'building','CRE']];
const ORGS=/\b(GERDES|Gereja|GEREJA|GERIPE|Geripe|GERINC|Gerinc|GERFOR|Gerfor|NEABI|NEEAV|Sebrae|CAEd|Suped|CCJ|SEDICAS|SENAR|Junior Achievement|AMMA|IFG)\b/g;
function rolesOf(resp){
  const out=[]; ROLES.forEach(([re,i,l])=>{if(re.test(resp))out.push([i,l])});
  const seen=new Set(); let m; ORGS.lastIndex=0;
  while((m=ORGS.exec(resp))){const k=m[1].toUpperCase(); if(!seen.has(k)){seen.add(k);out.push(['building',m[1].length<=6?m[1].toUpperCase():m[1]])}}
  return out.slice(0,5);
}
const PLACES=[
 [/Teatro [A-ZÀ-Ú][\wÀ-ú]*(?:\s(?:[A-ZÀ-Ú][\wÀ-ú]*|de|da|do)){0,4}/,null],
 [/PUC[\s-]*Goi[aá]s(?:\s*-\s*C[aâ]mpus\s*\w+)?/i,null],
 [/Audit[oó]rio [A-ZÀ-Ú][\wÀ-ú]*(?:\s(?:[A-ZÀ-Ú][\wÀ-ú]*|de|da|do)){0,3}/,null],
 [/\bAVA\s*Moodle\b|\bMoodle\b/i,'AVA Moodle'],[/Google Class(?:room)?/i,'Google Classroom'],[/YouTube/i,'YouTube'],
 [/\bpresencial\b/i,'Presencial'],[/[àa] dist[âa]ncia|\bEaD\b|\bonline\b|\bvirtual\b/i,'Online / a distância'],
 [/\b(?:CMEI|EMEI|EM)\s+(?:Prof(?:essor|essora|ª|\.)?\s+)?[A-ZÀ-Ú][\wÀ-ú'’]*(?:\s+(?:de|da|do|dos|das|[A-ZÀ-Ú][\wÀ-ú'’]*)){0,4}/,null]
];
function placeOf(ev){
  if(ev.sd.local) return [ev.sd.local.replace(/\s+/g,' ').slice(0,90)];
  const txt=ev.a.action+' '+ev.a.date+' '+ev.a.resp, out=[];
  PLACES.forEach(([re,fix])=>{const m=re.exec(txt); if(m){const v=(fix||m[0]).trim(); if(!out.includes(v)&&out.length<2)out.push(v)}});
  return out;
}
function parseEvents(m){
  if(m._ev)return m._ev;
  const dim=new Date(m.year||2026,m.mnum,0).getDate(), ev=[];
  m.sections.forEach(s=>s.agenda.forEach((a,i)=>{
    let t=(a.action||'').replace(/\s+/g,' ').trim(); const parts=t.split(/\s[●○■▪•]\s?/); t=parts[0].trim(); const details=parts.slice(1).map(x=>x.trim()).filter(Boolean);
    let anos=''; const am=/\(([^()]*\banos?\b[^()]*)\)/i.exec(t);
    if(am){anos=am[1].trim();t=t.replace(am[0],'').replace(/\s+/g,' ').replace(/[\s:–-]+$/,'').trim();}
    if(!anos){const r=/(\d{1,2}\s?[ºo°]?(?:\s*(?:,|e|ao|a)\s*\d{1,2}\s?[ºo°]?)*\s*anos?)/i.exec(a.resp||''); if(r&&r[1].length<40)anos=r[1];}
    const sd=splitDate(a.date), when=parseWhen(sd.date), days=daysFor(when,m.mnum,dim);
    const e={m,s,a,i,id:m.id+'-'+s.key+'-'+i,title:t||a.action,details,anos,sd,when,days};
    e.rg=ranges(e,m);
    ev.push(e);
  }));
  return m._ev=ev;
}
const allEvents=()=>DB.flatMap(parseEvents);

/* ---------- texto completo da seção ---------- */
const DOC={};
function sectionDoc(m,s){
  const k=m.id+'|'+s.key; if(DOC[k])return DOC[k];
  const box=document.createElement('div'); box.innerHTML=s.html||'';
  const heads=[],links=[],seen=new Set();
  $$('h4',box).forEach((h,i)=>{
    const t=h.textContent.trim(); h.id='h'+i;
    const lvl=/^\d+\.\d+/.test(t)?2:/^\d+[\.\)\s-]/.test(t)?1:0; h.dataset.l=lvl;
    if(/^(aten[cç][aã]o|importante)\s*[!:]*$/i.test(t))h.classList.add('warn');
    heads.push({id:h.id,t,lvl});
  });
  $$('a[href]',box).forEach(a=>{
    const u=a.getAttribute('href'); if(!/^https?:/i.test(u))return;
    a.target='_blank';a.rel='noopener noreferrer';
    const txt=a.textContent.trim().replace(/^🔗\s*/,'');
    if(/^https?:\/\//i.test(txt)){a.classList.add('url');a.title=txt;a.textContent=shortUrl(txt);}
    if(!seen.has(u)){seen.add(u);
      const par=a.closest('p,td,li,.chips'); let ctx='';
      if(par){const pt=par.textContent,ix=pt.indexOf(a.textContent.replace(/^🔗\s*/,'').slice(0,12)); ctx=pt.slice(Math.max(0,ix-90),Math.max(0,ix)).trim().split(/\s+/).slice(-9).join(' ').replace(/[:\-–]+$/,'');}
      links.push({u,label:linkLabel(txt,u),ctx});}
  });
  const toc=heads.filter(h=>h.lvl>0); const tocl=toc.length?toc:heads.filter(h=>h.t.length>3).slice(0,12);
  return DOC[k]={html:box.innerHTML,heads,toc:tocl,links,has:box.textContent.trim().length>0};
}
const STOP=new Set(['para','com','dos','das','que','uma','nos','nas','ano','anos','por','sobre']);
function matchHead(m,s,ev){
  const d=sectionDoc(m,s); if(!d.heads.length)return null;
  const tk=t=>norm(t.replace(/\([^)]*\)/g,' ')).replace(/[^a-z0-9 ]/g,' ').split(/\s+/).filter(w=>w.length>2&&!STOP.has(w));
  const A=new Set(tk(ev.title)); if(!A.size)return null; let best=null,bs=0;
  d.heads.forEach(h=>{const B=tk(h.t.replace(/^\d+(\.\d+)*[\.\)]?\s*/,'')); if(!B.length)return; let n=0;B.forEach(w=>{if(A.has(w))n++}); const sc=n/Math.min(A.size,B.length); if(sc>bs){bs=sc;best=h}});
  return bs>=0.6?best:null;
}

/* ---------- cartão de ação ---------- */
function dateBlock(ev){
  const w=ev.when, mo=ev.m.mnum; let first=null;
  for(const it of w.items){ if(it.t==='s'){first={d:it.d,m:it.m==null?mo:it.m};break} else {const m1=it.m1==null?mo:it.m1; first={d:it.d1,m:m1,end:{d:it.d2,m:it.m2==null?m1:it.m2}};break} }
  if(first){
    const pre=w.from?'a partir de':w.until?'até':'';
    const post=first.end?`até ${pad(first.end.d)}/${pad(first.end.m)}`:'';
    const more=w.items.length>1?`+${w.items.length-1} data${w.items.length>2?'s':''}`:'';
    return `<div class="dblk">${pre?`<small>${pre}</small>`:''}<b>${pad(first.d)}</b><span>${MON3[first.m-1]}</span>${post?`<small>${post}</small>`:more?`<small>${more}</small>`:''}</div>`;
  }
  if(w.cont) return `<div class="dblk txt">${ic('repeat')}<small>Ação contínua</small></div>`;
  const t=ev.sd.date.trim();
  if(t) return `<div class="dblk txt">${ic('cal')}<small>${esc(t.length>26?t.slice(0,24)+'…':t)}</small></div>`;
  return `<div class="dblk txt">${ic('cal')}<small>Sem data</small></div>`;
}
/* hrefFn(mid,secKey,headId) é dado por cada versão, pois as rotas mudam */
function card(ev,o){
  o=o||{}; const m=ev.m, s=ev.s, H=o.href||((a,b,c)=>'#/'+a+(b?'/'+b:'')+(c?'/'+c:''));
  const h=matchHead(m,s,ev), hasDoc=sectionDoc(m,s).has;
  const to=h?H(m.id,s.key,h.id):hasDoc?H(m.id,s.key):'';
  const roles=rolesOf(ev.a.resp||''), places=placeOf(ev);
  const lks=(ev.a.links||[]).slice(0,3).map(l=>`<a class="lk" href="${esc(l.uri)}" target="_blank" rel="noopener noreferrer" data-x>${ic('link')}<span>${esc(linkLabel(l.label,l.uri))}</span></a>`).join('');
  const canCal=ev.rg.length>0;
  return `<article class="card ${o.compact?'compact':''} tone-${s.color}" ${to?`data-go="${to}" tabindex="0" role="link"`:''} aria-label="${esc(ev.title)}">
    ${dateBlock(ev)}
    <div class="cbody">
      ${o.src?`<span class="srcchip">${ic(sIco(s.key))}${esc(sShort(s.key))}</span>`:''}
      <h3>${esc(ev.title)}</h3>
      ${ev.anos?`<div class="row">${ic('cap')}<div class="rt"><div class="chips"><span class="chip">${esc(ev.anos)}</span></div></div></div>`:''}
      ${roles.length?`<div class="row">${ic('teacher')}<div class="rt"><div class="chips roles">${roles.map(r=>`<span class="chip ghost">${ic(r[0])}${esc(r[1])}</span>`).join('')}</div></div></div>`:''}
      ${ev.a.resp&&!o.compact?`<div class="resp">${esc(ev.a.resp)}</div>`:''}
      ${places.length?`<div class="row">${ic('pin')}<div class="rt">${places.map(esc).join(' · ')}</div></div>`:''}
      ${ev.sd.hora?`<div class="row">${ic('clock')}<div class="rt">${esc(ev.sd.hora)}</div></div>`:''}
      ${ev.details.length&&!o.compact?`<ul class="det">${ev.details.slice(0,3).map(d=>`<li>${esc(d)}</li>`).join('')}</ul>`:''}
      ${lks?`<div class="links">${lks}</div>`:''}
      <div class="cfoot">
        ${to?`<span class="cta">${h?'Ler orientação':'Abrir seção'}${ic('arrow')}</span>`:'<span></span>'}
        ${canCal?`<button class="addcal" data-x data-add="${esc(ev.id)}" aria-label="Adicionar à minha agenda">${ic('calplus')}<span>Agenda</span></button>`:''}
      </div>
    </div></article>`;
}
function bindCards(root){
  $$('[data-go]',root).forEach(c=>{
    const go=()=>{location.hash=c.dataset.go};
    c.onclick=e=>{ if(e.target.closest('[data-x]'))return; go() };
    c.onkeydown=e=>{ if((e.key==='Enter'||e.key===' ')&&e.target===c){e.preventDefault();go()} };
  });
  $$('[data-add]',root).forEach(b=>b.onclick=e=>{e.stopPropagation();const ev=findEv(b.dataset.add);if(ev)addMenu(b,[ev],ev.title)});
}
const EVIDX={}; function findEv(id){if(!EVIDX[id])allEvents().forEach(e=>EVIDX[e.id]=e);return EVIDX[id]}

/* ---------- exportar para agenda ---------- */
const ymd=d=>d.getFullYear()+pad(d.getMonth()+1)+pad(d.getDate());
function icsEsc(t){return String(t||'').replace(/\\/g,'\\\\').replace(/;/g,'\\;').replace(/,/g,'\\,').replace(/\r?\n/g,'\\n')}
function fold(line){const out=[];while(line.length>72){out.push(line.slice(0,72));line=' '+line.slice(72)}out.push(line);return out.join('\r\n')}
function evText(ev){
  const L=[ev.s.title+' · OP nº '+pad(ev.m.op)+' ('+ev.m.name+' 2026)'];
  if(ev.a.date)L.push('Quando: '+ev.a.date.replace(/\s+/g,' '));
  if(ev.a.resp)L.push('Quem: '+ev.a.resp.replace(/\s+/g,' '));
  (ev.a.links||[]).slice(0,4).forEach(l=>L.push(linkLabel(l.label,l.uri)+': '+l.uri));
  L.push('Ler na Central: '+CONFIG.siteUrl+'#/'+ev.m.id+'/'+ev.s.key);
  return L.join('\n');
}
function buildIcs(evs,name){
  const st=new Date(), stamp=st.getUTCFullYear()+pad(st.getUTCMonth()+1)+pad(st.getUTCDate())+'T'+pad(st.getUTCHours())+pad(st.getUTCMinutes())+'00Z';
  const L=['BEGIN:VCALENDAR','VERSION:2.0','PRODID:-//SME Goiania//Orientacoes Pedagogicas 2026//PT-BR','CALSCALE:GREGORIAN','METHOD:PUBLISH','X-WR-CALNAME:'+icsEsc(name||'Orientações Pedagógicas 2026'),'X-WR-TIMEZONE:America/Sao_Paulo'];
  evs.forEach(ev=>ev.rg.forEach((r,k)=>{
    L.push('BEGIN:VEVENT','UID:'+ev.id+'-'+k+'@op2026.sme.goiania','DTSTAMP:'+stamp,
      'DTSTART;VALUE=DATE:'+ymd(r.s),'DTEND;VALUE=DATE:'+ymd(addDays(r.e,1)),
      fold('SUMMARY:'+icsEsc((r.until?'Prazo: ':'')+ev.title+' ('+sShort(ev.s.key)+')')),
      fold('DESCRIPTION:'+icsEsc(evText(ev))),'CATEGORIES:'+icsEsc(sShort(ev.s.key)),'TRANSP:TRANSPARENT','END:VEVENT');
  }));
  L.push('END:VCALENDAR'); return L.join('\r\n');
}
function downloadIcs(evs,name,file){
  const blob=new Blob([buildIcs(evs,name)],{type:'text/calendar;charset=utf-8'});
  const a=document.createElement('a'); a.href=URL.createObjectURL(blob); a.download=(file||'op2026')+'.ics';
  document.body.appendChild(a); a.click(); setTimeout(()=>{URL.revokeObjectURL(a.href);a.remove()},500);
  toast(evs.length+(evs.length===1?' ação exportada':' ações exportadas'));
}
function gcalUrl(ev){
  const r=ev.rg[0]; if(!r)return '';
  return 'https://calendar.google.com/calendar/render?action=TEMPLATE&text='+encodeURIComponent(ev.title+' ('+sShort(ev.s.key)+')')+'&dates='+ymd(r.s)+'/'+ymd(addDays(r.e,1))+'&details='+encodeURIComponent(evText(ev));
}
function addMenu(anchor,evs,label){
  closeMenu();
  const one=evs.length===1, g=one?gcalUrl(evs[0]):'';
  const box=document.createElement('div'); box.className='calmenu'; box.setAttribute('role','dialog'); box.setAttribute('aria-label','Adicionar à agenda');
  box.innerHTML=`<b>${one?'Adicionar esta ação':'Exportar '+evs.length+' ações'}</b><small>${esc(label||'')}</small>
    ${one?`<a href="${esc(g)}" target="_blank" rel="noopener">${ic('calplus')}Google Agenda</a>`:''}
    <button data-ics>${ic('download')}Baixar .ics <em>Outlook, iPhone</em></button>
    ${one?'':`<p>Abra o arquivo baixado no celular ou no computador e confirme a importação. No Google Agenda: Configurações, Importar e exportar.</p>`}
    <button class="cm-x" aria-label="Fechar">${ic('x')}</button>`;
  document.body.appendChild(box);
  const r=anchor.getBoundingClientRect(), w=Math.min(300,innerWidth-24);
  box.style.width=w+'px'; box.style.left=Math.max(12,Math.min(innerWidth-w-12,r.right-w))+'px';
  const below=r.bottom+box.offsetHeight+12<innerHeight; box.style.top=(below?r.bottom+6:Math.max(12,r.top-box.offsetHeight-6))+'px';
  $('[data-ics]',box).onclick=()=>{downloadIcs(evs,label,one?'acao-'+evs[0].id:'op2026-'+norm(label||'agenda').replace(/[^a-z0-9]+/g,'-').slice(0,40));closeMenu()};
  $('.cm-x',box).onclick=closeMenu;
  /* fecha ao clicar fora ou ao rolar de verdade (o foco do toque pode gerar um scroll pequeno) */
  const y0=scrollY, onScroll=()=>{if(Math.abs(scrollY-y0)>60)closeMenu()};
  setTimeout(()=>{document.addEventListener('click',outside);addEventListener('scroll',onScroll,{passive:true})},50);
  function outside(e){if(!box.contains(e.target))closeMenu()}
  closeMenu.f=outside; closeMenu.s=onScroll;
}
function closeMenu(){const b=$('.calmenu');if(b)b.remove();if(closeMenu.f)document.removeEventListener('click',closeMenu.f);if(closeMenu.s)removeEventListener('scroll',closeMenu.s)}

/* ---------- busca ---------- */
let IDX=null;
function buildIdx(){IDX=[];DB.forEach(m=>m.sections.forEach(s=>{const t=(s.title+' '+s.agenda.map(a=>a.action+' '+a.date+' '+a.resp).join(' ')+' '+(s.html||'').replace(/<[^>]+>/g,' ').replace(/&amp;/g,'&').replace(/&lt;/g,'<').replace(/&gt;/g,'>')).replace(/\s+/g,' ');IDX.push({m,s,txt:t,n:norm(t)})}))}
function mkRe(t){const map={a:'[aáàâãä]',e:'[eéèêë]',i:'[iíìîï]',o:'[oóòôõö]',u:'[uúùûü]',c:'[cç]'};return new RegExp(t.replace(/[.*+?^${}()|[\]\\]/g,'\\$&').replace(/[aeiouc]/g,x=>map[x]),'gi')}
function search(q){
  if(!IDX)buildIdx(); const terms=norm(q).split(/\s+/).filter(t=>t.length>1), hits=[];
  if(!terms.length)return hits;
  IDX.forEach(r=>{if(terms.every(t=>r.n.includes(t))){let c=0;terms.forEach(t=>{let i=-1;while((i=r.n.indexOf(t,i+1))>-1&&c<999)c++});
    const i=r.n.indexOf(terms[0]),a=Math.max(0,i-70);let h=esc(r.txt.slice(a,i+170));terms.forEach(t=>{h=h.replace(mkRe(t),x=>`<mark>${x}</mark>`)});
    hits.push({m:r.m,s:r.s,c,snip:(a>0?'… ':'')+h+' …'})}});
  return hits.sort((a,b)=>(b.m.mnum-a.m.mnum)*0.001+(b.c-a.c));
}
function highlight(root,q){
  if(!root||!q)return; const terms=norm(q).split(/\s+/).filter(t=>t.length>1); if(!terms.length)return;
  const re=new RegExp(terms.map(t=>mkRe(t).source).join('|'),'gi'), w=document.createTreeWalker(root,NodeFilter.SHOW_TEXT), nodes=[]; let n,cnt=0; while((n=w.nextNode()))nodes.push(n);
  nodes.forEach(nd=>{if(cnt>80)return;const t=nd.nodeValue;re.lastIndex=0;if(!re.test(t))return;re.lastIndex=0;const f=document.createDocumentFragment();let last=0,m;
    while((m=re.exec(t))){if(!m[0].length){re.lastIndex++;continue}f.append(t.slice(last,m.index));const mk=document.createElement('mark');mk.textContent=m[0];f.append(mk);last=m.index+m[0].length;cnt++}
    f.append(t.slice(last));nd.parentNode.replaceChild(f,nd)});
}

/* ---------- leitor (texto da OP) ---------- */
function readerHTML(m,s,H){
  const d=sectionDoc(m,s), evs=parseEvents(m).filter(e=>e.s===s);
  const toc=d.toc.length?`<details class="toc-inline"><summary>${ic('list')}Nesta seção <span class="muted">· ${d.toc.length} tópicos</span>${ic('chevR')}</summary><nav>${d.toc.map(h=>`<a href="${H(m.id,s.key,h.id)}" class="${h.lvl===2?'l2':''}">${esc(h.t)}</a>`).join('')}</nav></details>`:'';
  const ag=evs.length?`<details class="rblock" id="agenda" ${d.has?'':'open'}><summary>${ic('cal')}Agenda desta seção <span class="chip">${evs.length}</span><span class="chev">${ic('chevR')}</span></summary><div class="cards one">${evs.map(e=>card(e,{href:H})).join('')}</div></details>`:'';
  const doc=d.has?`<section class="rblock" id="texto"><div class="paper"><article class="doc">${d.html}</article></div></section>`:'<p class="empty">O texto desta seção não veio na extração do PDF. Consulte o PDF oficial.</p>';
  const lk=d.links.length?`<section class="rblock" id="links"><h2>${ic('link')}Links desta seção <span class="chip">${d.links.length}</span></h2><div class="rlinks">${d.links.map(l=>`<a class="rl" href="${esc(l.u)}" target="_blank" rel="noopener noreferrer">${ic('out')}<div><b>${esc(l.label)}</b><small>${esc(l.ctx||hostLabel(l.u))}</small></div></a>`).join('')}</div></section>`:'';
  return {toc:d.toc,html:`${toc}${ag}${doc}${lk}`,evs,d};
}
function bindReader(root,m,s,hid,hl){
  $$('[data-s]',root).forEach(a=>a.onclick=e=>{e.preventDefault();const t=document.getElementById(a.dataset.s);if(t){if(t.tagName==='DETAILS')t.open=true;t.scrollIntoView({behavior:'smooth'})}});
  bindCards(root);
  if(hl)highlight($('.doc',root),hl);
  setTimeout(()=>{ if(hid){const t=document.getElementById(hid);if(t)t.scrollIntoView({behavior:'smooth',block:'start'})} else if(hl){const f=$('.doc mark',root);if(f)f.scrollIntoView({block:'center'})} },40);
}
function fontTools(){
  const fs=()=>parseInt(store.get('opfs')||'18',10);
  const setfs=v=>{v=Math.max(15,Math.min(26,v));document.documentElement.style.setProperty('--fs',v+'px');store.set('opfs',v)};
  setfs(fs()); return {minus:()=>setfs(fs()-1),plus:()=>setfs(fs()+1)};
}
async function share(title){
  const url=location.href;
  try{if(navigator.share){await navigator.share({title,url});return}}catch(e){if(e&&e.name==='AbortError')return}
  try{await navigator.clipboard.writeText(url);toast('Link copiado')}catch(e){toast('Copie o endereço do navegador')}
}

/* ---------- calendário (grade) ---------- */
function monthGrid(m,opts){
  opts=opts||{}; const mo=m.mnum, y=m.year||2026, dim=new Date(y,mo,0).getDate(), first=new Date(y,mo-1,1).getDay();
  const evs=parseEvents(m).filter(opts.filter||(()=>true)), byDay={}, und=[];
  evs.forEach(e=>{ if(e.days.size)e.days.forEach((r,d)=>(byDay[d]=byDay[d]||[]).push({e,r})); else und.push(e); });
  const today=(NOW.getFullYear()===y&&NOW.getMonth()+1===mo)?NOW.getDate():0;
  let cells=WD3.map((w,i)=>`<div class="h"><span class="l">${WD[i].replace('-feira','')}</span><span class="s">${w.slice(0,1).toUpperCase()}</span></div>`).join('');
  for(let i=0;i<first;i++)cells+='<div class="cd off"></div>';
  for(let d=1;d<=dim;d++){
    const arr=byDay[d]||[], wk=[0,6].includes(new Date(y,mo-1,d).getDay()), sh=arr.slice(0,opts.pills||3);
    const cols=[...new Set(arr.map(x=>x.e.s.color))];
    cells+=`<button class="cd${arr.length?' has':''}${wk?' wk':''}${d===today?' today':''}" data-d="${d}" aria-pressed="${opts.sel===d}" aria-label="${d} de ${MON[mo-1]}, ${arr.length} ${arr.length===1?'ação':'ações'}"><span class="dn">${d}</span><span class="dots">${cols.slice(0,5).map(c=>`<i class="tone-${c}"></i>`).join('')}</span><span class="pills">${sh.map(x=>`<span class="pill tone-${x.e.s.color}" title="${esc(x.e.title)}">${x.r==='start'?'▸ ':x.r==='end'?'◂ ':''}${esc(x.e.title)}</span>`).join('')}</span>${arr.length>sh.length?`<span class="more">+${arr.length-sh.length}</span>`:''}</button>`;
  }
  return {html:`<div class="cg">${cells}</div>`,byDay,und,evs,today,dim,dayList:Object.keys(byDay).map(Number).sort((a,b)=>a-b)};
}

/* ---------- próximos dias ---------- */
function upcoming(evs,from,days){
  const end=addDays(from,days), out=[];
  evs.forEach(ev=>ev.rg.forEach(r=>{
    const s=r.s, e=r.e; if(e<from||s>=end)return;
    const k=s<from?from:s; out.push({ev,date:k,start:s,end:e,ongoing:s<from});
  }));
  const seen=new Set();
  return out.sort((a,b)=>a.date-b.date||a.ongoing-b.ongoing).filter(x=>{const k=x.ev.id;if(seen.has(k))return false;seen.add(k);return true});
}
function currentMonth(){
  const cm=DB.find(m=>m.year===NOW.getFullYear()&&m.mnum===NOW.getMonth()+1);
  return cm||DB[DB.length-1];
}
function rangeLabel(x){
  const s=x.start,e=x.end;
  if(sameDay(s,e))return `${pad(s.getDate())}/${pad(s.getMonth()+1)}`;
  return `${pad(s.getDate())}/${pad(s.getMonth()+1)} a ${pad(e.getDate())}/${pad(e.getMonth()+1)}`;
}

/* ---------- destaques ---------- */
const ART={
  orange:['#E07A2A','#F2C230','#2F6E34'],blue:['#4F7DB5','#8CC3E8','#1E4620'],red:['#C8321E','#E07A2A','#F2C230'],
  green:['#2F6E34','#93B649','#F2C230'],lime:['#93B649','#2F6E34','#8CC3E8'],sky:['#8CC3E8','#4F7DB5','#E07A2A']
};
/* Ilustração geométrica no estilo do brasão (faixas, semicírculos e ondas). Substituída por foto quando houver. */
function art(cor,seed){
  const c=ART[cor]||ART.green, k=(seed||0)%4;
  const shapes=[
    `<rect width="160" height="100" fill="${c[0]}"/><circle cx="128" cy="100" r="46" fill="${c[1]}"/><path d="M0 70q20-14 40 0t40 0 40 0 40 0v30H0z" fill="${c[2]}"/><path d="M0 84q20-14 40 0t40 0 40 0 40 0" stroke="#fff" stroke-width="5" fill="none" opacity=".75"/>`,
    `<rect width="160" height="100" fill="${c[1]}"/><path d="M0 0h70v100H0z" fill="${c[0]}"/><circle cx="70" cy="50" r="30" fill="${c[2]}"/><path d="M70 20a30 30 0 0 1 0 60z" fill="#fff" opacity=".85"/>`,
    `<rect width="160" height="100" fill="${c[2]}"/><path d="M0 100 80 0h80v100z" fill="${c[0]}"/><circle cx="40" cy="34" r="18" fill="${c[1]}"/><rect x="104" y="58" width="40" height="30" rx="4" fill="#fff" opacity=".85"/>`,
    `<rect width="160" height="100" fill="${c[0]}"/><path d="M0 40q20-14 40 0t40 0 40 0 40 0v60H0z" fill="${c[1]}"/><path d="M0 64q20-14 40 0t40 0 40 0 40 0v36H0z" fill="${c[2]}"/><circle cx="124" cy="24" r="14" fill="#fff" opacity=".85"/>`
  ];
  return `<svg class="art" viewBox="0 0 160 100" preserveAspectRatio="xMidYMid slice" aria-hidden="true">${shapes[k]}</svg>`;
}
/* Foto do destaque (post do Instagram, por exemplo) ou a ilustração geométrica quando não houver. */
function pic(d,seed){return d.foto?`<img class="art foto" src="${esc(d.foto)}" alt="${esc(d.alt||d.titulo)}" loading="lazy">`:art(d.cor,seed)}
function destaques(){
  const t=dayKey(NOW);
  const act=DEST.filter(d=>!d.fim||dayKey(new Date(d.fim+'T12:00'))>=t);
  return (act.length?act:DEST);
}
function destRoute(d){const p=(d.link||'').replace(/^#\/?/,'').split('/');return {mid:p[0],sec:p[1]}}
const fmtShort=iso=>{const d=new Date(iso+'T12:00');return pad(d.getDate())+'/'+pad(d.getMonth()+1)};

/* ---------- carregamento e sincronização ---------- */
function updatedLabel(){
  const d=META.atualizado?new Date(META.atualizado):null;
  return d&&!isNaN(d)?`${pad(d.getDate())}/${pad(d.getMonth()+1)}/${d.getFullYear()}, ${pad(d.getHours())}:${pad(d.getMinutes())}`:'';
}
function parseCsv(t){const rows=[];let row=[],f='',q=false;for(let i=0;i<t.length;i++){const c=t[i];if(q){if(c==='"'){if(t[i+1]==='"'){f+='"';i++}else q=false}else f+=c}else if(c==='"')q=true;else if(c===','){row.push(f);f=''}else if(c==='\n'||c==='\r'){if(c==='\r'&&t[i+1]==='\n')i++;row.push(f);rows.push(row);row=[];f=''}else f+=c}if(f||row.length){row.push(f);rows.push(row)}const h=rows.shift()||[];return rows.filter(r=>r.some(Boolean)).map(r=>Object.fromEntries(h.map((k,i)=>[k.trim().toLowerCase(),(r[i]||'').trim()])))}
async function sync(){
  /* Na versão final: busca o JSON publicado a partir do Drive e a planilha de destaques. */
  let changed=false;
  if(CONFIG.dataUrl){try{const r=await fetch(CONFIG.dataUrl,{cache:'no-store'});const j=await r.json();if(j&&j.months){DB=j.months;META=j.meta||META;changed=true;IDX=null;for(const k in DOC)delete DOC[k];for(const k in EVIDX)delete EVIDX[k]}}catch(e){}}
  if(CONFIG.destaquesCsv){try{const r=await fetch(CONFIG.destaquesCsv,{cache:'no-store'});const rows=parseCsv(await r.text());if(rows.length){DEST=rows;changed=true}}catch(e){}}
  return {changed,configured:!!(CONFIG.dataUrl||CONFIG.destaquesCsv)};
}

/* ---------- utilidades de interface ---------- */
/* aviso discreto quando a data está simulada (?hoje=) */
if(/[?&]hoje=/.test(location.search))addEventListener('DOMContentLoaded',()=>{const b=document.createElement('div');b.style.cssText='position:fixed;right:8px;bottom:84px;pointer-events:none;z-index:95;background:#F2C230;color:#1F1206;font:600 12px Lexend,sans-serif;padding:4px 10px;border-radius:8px;box-shadow:0 4px 12px rgba(0,0,0,.2)';b.textContent='Data simulada: '+pad(NOW.getDate())+'/'+pad(NOW.getMonth()+1)+'/'+NOW.getFullYear();document.body.appendChild(b)});
function toast(t){let e=$('#toast');if(!e){e=document.createElement('div');e.id='toast';e.className='toast';e.setAttribute('role','status');e.setAttribute('aria-live','polite');document.body.appendChild(e)}e.textContent=t;e.classList.add('on');clearTimeout(toast.t);toast.t=setTimeout(()=>e.classList.remove('on'),2200)}
function theme(btn){
  const set=t=>{document.documentElement.dataset.theme=t;store.set('opthm',t);if(btn)btn.innerHTML=ic(t==='dark'?'sun':'moon')};
  set(store.get('opthm')||(matchMedia('(prefers-color-scheme:dark)').matches?'dark':'light'));
  if(btn)btn.onclick=()=>set(document.documentElement.dataset.theme==='dark'?'light':'dark');
}

window.OPCore={
  get DB(){return DB},get META(){return META},CONFIG,NOW,store,
  $,$$,esc,norm,pad,MON,MON3,WD,WD3,ic,P,SM,sIco,sShort,ETAPAS,TRANSV,PERFIS,matchPerfil,
  hostLabel,linkLabel,parseEvents,allEvents,sectionDoc,matchHead,rolesOf,placeOf,ranges,dayKey,sameDay,addDays,
  dateBlock,card,bindCards,findEv,buildIcs,downloadIcs,gcalUrl,addMenu,closeMenu,
  search,highlight,readerHTML,bindReader,fontTools,share,monthGrid,upcoming,currentMonth,rangeLabel,
  art,pic,destaques,destRoute,fmtShort,updatedLabel,sync,toast,theme
};
})();

/* ============================================================
   Doprovázení CRM – sdílený engine (prototyp)
   Data + helpery + tabulkový engine + rail + drawer + témata
   ============================================================ */
const App = (() => {

  /* ---------- BARVY / ČÍSELNÍKY ---------- */
  const NEUTRAL = 'var(--avatar-neutral)';
  // [0]=třída prstence, [1]=popisek, [2]=barva, [3]=světlé pozadí, [4]=roční hodiny vzdělávání
  const CARE = {
    long:['care-long','Dlouhodobá','var(--care-long)','var(--care-long-soft)',24],
    temp:['care-temp','Přechodná','var(--care-temp)','var(--care-temp-soft)',24],
    kin: ['care-kin','Příbuzenská','var(--care-kin)','var(--care-kin-soft)',18],
  };
  const STATUS = { ok:['ok','V pořádku'], warn:['warn','Pozornost'], due:['due','Po termínu'] };

  /* ---------- MASTER DATA (smyšlené) ---------- */
  const PIC = n => `https://i.pravatar.cc/96?img=${n}`;
  // datum jako ISO (řazení/seskupení), čas zvlášť
  // do = doprovázející organizace, worker = klíčová osoba (KO)
  const households = [
    { id:1, name:'Domácnost Novákových', city:'Brno', district:'Brno-střed', do:'Doprovázení, z.s.', worker:'M. Dvořák', phone:'+420 602 111 222', photo:PIC(12),
      fosters:[{id:'f1',n:'Jana Nováková',photo:PIC(5),isFoster:true,eduDone:16,periodStart:'2025-09-01'},
               {id:'f2',n:'Petr Novák',photo:PIC(13),isFoster:true,eduDone:22,periodStart:'2025-09-01'}],
      kids:[{id:'k1',n:'Tereza Marková',age:9,care:'long',photo:PIC(26),relatives:3},
            {id:'k2',n:'Adam Beneš',age:6,care:'long',relatives:1}],
      next:{iso:'2026-06-25',time:'14:00'}, last:{iso:'2026-05-28',time:'15:30'}, status:'ok', note:'Stabilní, pravidelné návštěvy.' },
    { id:2, name:'Domácnost Svobodové', city:'Kuřim', district:'', do:'Doprovázení, z.s.', worker:'L. Horáková', phone:'+420 603 333 444',
      fosters:[{id:'f3',n:'Marie Svobodová',isFoster:true,eduDone:6,periodStart:'2025-11-01'}],
      kids:[{id:'k3',n:'Lukáš Dohnal',age:12,care:'temp',relatives:2}],
      next:{iso:'2026-06-21',time:'10:00'}, last:{iso:'2026-05-14',time:'11:00'}, status:'due', note:'Návštěva po termínu – kontaktovat.' },
    { id:3, name:'Domácnost Veselých', city:'Blansko', district:'', do:'Spolu dětem, o.p.s.', worker:'M. Dvořák', phone:'+420 604 555 666', photo:PIC(32),
      fosters:[{id:'f4',n:'Eva Veselá',photo:PIC(45),isFoster:true,eduDone:9,periodStart:'2025-12-01'},
               {id:'f5',n:'Jan Veselý',isFoster:false}],
      kids:[{id:'k4',n:'Nela Kratochvílová',age:4,care:'long',relatives:0},
            {id:'k5',n:'Matěj Říha',age:7,care:'temp',relatives:2},
            {id:'k6',n:'Klára Šťastná',age:10,care:'long',photo:PIC(20),relatives:4}],
      next:{iso:'2026-06-30',time:'09:30'}, last:{iso:'2026-06-02',time:'16:00'}, status:'ok', note:'Manžel není pěstoun. Děti v různých typech péče.' },
    { id:4, name:'Domácnost Procházkové', city:'Brno', district:'Brno-Líšeň', do:'Doprovázení, z.s.', worker:'L. Horáková', phone:'+420 605 777 888',
      fosters:[{id:'f6',n:'Hana Procházková (babička)',isFoster:true,eduDone:11,periodStart:'2025-08-15'}],
      kids:[{id:'k7',n:'Denis Sedláček',age:14,care:'kin',relatives:1}],
      next:{iso:'2026-07-02',time:'13:00'}, last:{iso:'2026-05-30',time:'14:00'}, status:'warn', note:'Příbuzenská péče. Řešíme přechod na SŠ.' },
    { id:5, name:'Domácnost Kučerových', city:'Vyškov', district:'', do:'Spolu dětem, o.p.s.', worker:'M. Dvořák', phone:'+420 606 999 000', photo:PIC(15),
      fosters:[{id:'f7',n:'Petra Kučerová',photo:PIC(9),isFoster:true,eduDone:24,periodStart:'2025-07-01'},
               {id:'f8',n:'Tomáš Kučera',isFoster:false}],
      kids:[{id:'k8',n:'Eliška Marešová',age:8,care:'temp',relatives:1},
            {id:'k9',n:'Filip Tichý',age:5,care:'long',relatives:0}],
      next:{iso:'2026-06-27',time:'11:30'}, last:{iso:'2026-06-05',time:'10:30'}, status:'ok', note:'' },
  ];

  /* ---------- DERIVACE ---------- */
  const byId = id => households.find(h=>h.id===id);
  function careTypesOf(h){ return [...new Set(h.kids.map(k=>k.care))]; }
  function careGroupLabel(h){ const t=careTypesOf(h); return t.length>1?'Smíšená péče':CARE[t[0]][1]; }
  // povinné roční hodiny pěstouna = 24 pokud má v domácnosti dítě v dlouhodobé/přechodné, jinak 18
  function eduRequiredFor(h){ const t=careTypesOf(h); return (t.includes('long')||t.includes('temp'))?24:18; }
  function allFosters(){ return households.flatMap(h => h.fosters.filter(p=>p.isFoster).map(p => ({...p, household:h, req:eduRequiredFor(h)}))); }
  function allChildren(){ return households.flatMap(h => h.kids.map(k => ({...k, household:h}))); }

  // sdílené dokumenty napříč kontakty (DMS)
  const DOCS = [
    {name:'Dohoda o výkonu PP – Novákovi', kind:'PDF', date:'2023-09-01', etype:'pestoun', eid:'f1', ename:'Jana Nováková', cat:'smlouva'},
    {name:'Rozsudek o svěření do PP – Tereza', kind:'PDF', date:'2023-08-15', etype:'dite', eid:'k1', ename:'Tereza Marková', cat:'soud'},
    {name:'Zpráva pro OSPOD 1. pol. 2026 – Tereza', kind:'PDF', date:'2026-06-05', etype:'dite', eid:'k1', ename:'Tereza Marková', cat:'report'},
    {name:'Vysvědčení 2025-26 – Klára', kind:'PDF', date:'2026-06-30', etype:'dite', eid:'k6', ename:'Klára Šťastná', cat:'skola'},
    {name:'Potvrzení o vzdělávání 04-2026 – Petr N.', kind:'PDF', date:'2026-04-10', etype:'pestoun', eid:'f2', ename:'Petr Novák', cat:'vzdelavani'},
    {name:'Foto z tábora 2025', kind:'JPG', date:'2025-07-20', etype:'dite', eid:'k6', ename:'Klára Šťastná', cat:'foto'},
    {name:'Roční vyúčtování SPVPP – Kučerovi', kind:'XLSX', date:'2026-05-02', etype:'pestoun', eid:'f7', ename:'Petra Kučerová', cat:'report'},
    {name:'Individuální plán ochrany – Denis', kind:'DOCX', date:'2026-03-12', etype:'dite', eid:'k7', ename:'Denis Sedláček', cat:'report'},
  ];
  function allDocs(){ return DOCS; }
  const DOC_CATS = {smlouva:'Smlouvy a dohody', soud:'Soudní', report:'Reporty a plány', skola:'Škola', vzdelavani:'Vzdělávání', foto:'Fotky', jine:'Jiné'};

  /* ---------- FORMÁT ---------- */
  const MM=['led','úno','bře','dub','kvě','čvn','čvc','srp','zář','říj','lis','pro'];
  function fmtDate(iso){ if(!iso) return '—'; const [y,m,d]=iso.split('-'); return `${+d}. ${+m}. ${y}`; }
  function fmtDateTime(o){ return o?`${fmtDate(o.iso)}${o.time?` v ${o.time}`:''}`:'—'; }
  const todayISO='2026-06-20';
  function dayDiff(iso){ return Math.round((Date.parse(iso)-Date.parse(todayISO))/86400000); }
  function dateBucket(iso){ if(!iso) return 'Bez termínu'; const d=dayDiff(iso);
    if(d<0) return 'Po termínu'; if(d===0) return 'Dnes'; if(d<=7) return 'Tento týden'; if(d<=31) return 'Tento měsíc'; return 'Později'; }

  /* ---------- HELPERY UI ---------- */
  const ini = s => s.replace(/\(.*?\)/,'').trim().split(' ').map(w=>w[0]).join('').slice(0,2).toUpperCase();
  // shape: 'sq' = čtvercový (pěstoun, ostatní), jinak kruhový (dítě / výchozí)
  function avatar(name,care,photo,size,shape){
    const sq = shape==='sq'?' sq':'';
    const st = size?`style="width:${size}px;height:${size}px;font-size:${Math.round(size*0.36)}px;`:'style="';
    if(photo) return `<span class="avatar photo${sq} ${care?CARE[care][0]:''}" ${st}"><img src="${photo}" alt=""></span>`;
    const bg = care?CARE[care][2]:NEUTRAL;
    return `<span class="avatar${sq}" ${st}background:${bg}">${ini(name)}</span>`;
  }
  function careBadge(c){ return `<span class="badge" style="background:${CARE[c][3]};color:${CARE[c][2]}">${CARE[c][1]}</span>`; }
  function statusBadge(s){ return `<span class="badge ${STATUS[s][0]}">${STATUS[s][1]}</span>`; }
  function careMix(h){ const t=careTypesOf(h); return t.length<=1?careBadge(t[0])
    : `<span class="caremix">${t.map(c=>`<span class="cdot" style="background:${CARE[c][2]}" title="${CARE[c][1]}"></span>`).join('')}<span class="muted" style="font-size:12px">smíšená</span></span>`; }
  // Vzdělávací kapacita pěstouna
  function eduBar(done,req,mini){
    const pct=Math.min(100,Math.round(done/req*100));
    const cls = done>=req?'ok':(pct>=60?'mid':'low');
    return `<div class="edu ${mini?'mini':''}"><div class="edu-bar"><i class="${cls}" style="width:${pct}%"></i></div>
      <span class="edu-lbl">${done} / ${req} h</span></div>`;
  }
  // Upozornění (dříve „Alert“) – [typ, titulek, popis]; typ: ok|warn|due
  function upozIcon(t){ return t==='ok'
    ? '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M20 6 9 17l-5-5"/></svg>'
    : '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M10.3 3.9 2.4 18a2 2 0 0 0 1.7 3h15.8a2 2 0 0 0 1.7-3L13.7 3.9a2 2 0 0 0-3.4 0z"/><path d="M12 9v4M12 17h.01"/></svg>'; }
  function upoz(items){ if(!items.length) items=[['ok','Žádná upozornění','Vše v pořádku.']];
    return items.map(([t,ti,de])=>`<div class="alert ${t}">${upozIcon(t)}<div><div class="a-t">${ti}</div><div>${de}</div></div><span class="a-x">✕</span></div>`).join(''); }

  const cbSvg = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3"><path d="M5 12l5 5L20 7"/></svg>';
  // překlápění avatar↔checkbox (první sloupec tabulky)
  function swap(avatarHtml, cbHtml){ return `<span class="av-wrap">${avatarHtml}${cbHtml}</span>`; }

  /* ---------- RAIL (navigace mezi obrazovkami) ---------- */
  const RAIL = [
    ['prehled.html','Přehled','M3 3h8v8H3zM13 3h8v5h-8zM13 12h8v9h-8zM3 15h8v6H3z'],
    ['pestouni.html','Pěstouni','M12 8a3.5 3.5 0 1 0 0-7 3.5 3.5 0 0 0 0 7zM5 20c0-3.5 3-6 7-6s7 2.5 7 6'],
    ['deti.html','Děti','M12 7a3 3 0 1 0 0-6 3 3 0 0 0 0 6zM7 21v-4a5 5 0 0 1 10 0v4'],
    ['ostatni.html','Ostatní','M4 4h16v12H8l-4 4zM8 9h8M8 12h5'],
    ['kalendar.html','Kalendář','M3 5h18v16H3zM3 9h18M8 3v4M16 3v4'],
    ['ukoly.html','Úkoly','M9 5H7a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V7a2 2 0 0 0-2-2h-2M9 5a2 2 0 0 1 4 0M9 13l2 2 4-4'],
    ['dokumenty.html','Dokumenty','M6 2h8l4 4v16H6zM14 2v4h4'],
  ];
  function renderRail(active){
    const items = RAIL.map(([href,title,d])=>`
      <a class="rail-ico ${title===active?'active':''} ${href==='#'?'soon':''}" href="${href}" title="${title}${href==='#'?' (připravujeme)':''}">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="${d}"/></svg><span class="rl">${title}</span></a>`).join('');
    const nc=buildNotifs().length;
    return `<a class="logo" href="prehled.html" id="railLogo">D</a>${items}
      <div class="rail-spacer"></div>
      <div class="rail-ico" title="Upozornění" onclick="App.openNotifs()"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M18 8a6 6 0 1 0-12 0c0 7-3 9-3 9h18s-3-2-3-9M13.7 21a2 2 0 0 1-3.4 0"/></svg>${nc?`<span class="rail-badge">${nc}</span>`:''}</div>
      <a class="rail-ico ${active==='Nastavení'?'active':''}" href="nastaveni.html" title="Nastavení"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="3"/><path d="M12 2v3M12 19v3M2 12h3M19 12h3M5 5l2 2M17 17l2 2M19 5l-2 2M7 17l-2 2"/></svg></a>
      <a class="rail-ico" href="login.html" title="Účet / odhlásit"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="8" r="4"/><path d="M4 21c0-4 3.5-7 8-7s8 3 8 7"/></svg></a>`;
  }

  /* ---------- KALENDÁŘ: ISO týden, svátky/jmeniny, integrace ---------- */
  function isoWeek(s){ const [y,mo,d]=s.split('-').map(Number); const dt=new Date(Date.UTC(y,mo-1,d));
    const day=(dt.getUTCDay()+6)%7; dt.setUTCDate(dt.getUTCDate()-day+3);
    const ft=new Date(Date.UTC(dt.getUTCFullYear(),0,4)); const fd=(ft.getUTCDay()+6)%7; ft.setUTCDate(ft.getUTCDate()-fd+3);
    return 1+Math.round((dt-ft)/(7*864e5)); }
  // jmeniny – červen (prototyp; ostatní měsíce doplníme stejně)
  const NAMEDAYS_06=['','Laura','Jarmil','Tamara','Dalibor','Dobroslav','Norbert','Iveta','Medard','Stanislava','Gita','Bruno','Antonie','Antonín','Roland','Vít','Zbyněk','Adolf','Milan','Leoš','Květa','Alois','Pavla','Zdeňka','Jan','Ivan','Adriana','Ladislav','Lubomír','Petr a Pavel','Šárka'];
  // státní svátky ČR 2026 (sdílený kalendář napříč organizacemi)
  const STATE_HOLIDAYS={'2026-01-01':'Nový rok','2026-04-03':'Velký pátek','2026-04-06':'Velikonoční pondělí','2026-05-01':'Svátek práce','2026-05-08':'Den vítězství','2026-07-05':'Cyril a Metoděj','2026-07-06':'Jan Hus','2026-09-28':'Den české státnosti','2026-10-28':'Vznik ČSR 1918','2026-11-17':'Den boje za svobodu','2026-12-24':'Štědrý den','2026-12-25':'1. svátek vánoční','2026-12-26':'2. svátek vánoční'};
  function holidaysFor(iso){ const [,mo,dd]=iso.split('-').map(Number);
    const nameday = mo===6 ? (NAMEDAYS_06[dd]||'') : '';
    const state = STATE_HOLIDAYS[iso]||'';
    // letní prázdniny (zjednodušeně celostátní); jarní se liší dle regionu – řešeno per region jinde
    const school = (iso>='2026-07-01'&&iso<='2026-08-31') ? 'Letní prázdniny' : '';
    return { nameday, state, school }; }
  // integrace kalendáře (per uživatel) – uloženo v prohlížeči
  function integLoad(){ try{ return Object.assign({google:false,outlook:false},JSON.parse(localStorage.getItem('crm-integ')||'{}')); }catch(e){ return {google:false,outlook:false}; } }
  function integSave(o){ try{ localStorage.setItem('crm-integ',JSON.stringify(o)); }catch(e){} }
  // úkoly = zápis s termínem (deadline), bez přesného času – sdílené
  const TASKS=[
    {id:'t1',title:'Připravit zprávu pro OSPOD',due:'2026-06-25',owner:'M. Dvořák',etype:'dite',eid:'k1',ename:'Tereza Marková'},
    {id:'t2',title:'Doplnit vzdělávání (chybí 2 h)',due:'2026-06-21',owner:'L. Horáková',etype:'pestoun',eid:'f3',ename:'Marie Svobodová'},
    {id:'t3',title:'Roční vyhodnocení dohody',due:'2026-06-30',owner:'M. Dvořák',etype:'pestoun',eid:'f4',ename:'Eva Veselá'},
  ];
  function allTasks(){ return TASKS; }
  // celá jména KO (zobrazení)
  const WORKER_FULL={'M. Dvořák':'Michal Dvořák','L. Horáková':'Lucie Horáková'};
  function workerFull(n){ return WORKER_FULL[n]||n; }
  // barvy kalendářů (KO) per uživatel
  function calColorsLoad(){ try{ return JSON.parse(localStorage.getItem('crm-calcolors')||'{}'); }catch(e){ return {}; } }
  function calColorsSave(o){ try{ localStorage.setItem('crm-calcolors',JSON.stringify(o)); }catch(e){} }
  // dovolená KO (kdy nemá mít návštěvy)
  const VACATIONS=[{owner:'L. Horáková',from:'2026-06-22',to:'2026-06-24',label:'Dovolená'}];
  function vacations(){ return VACATIONS; }

  /* ---------- UPOZORNĚNÍ (zvonek v railu) ---------- */
  function buildNotifs(){
    const n=[];
    households.forEach(h=>{ const fid=(h.fosters.find(x=>x.isFoster)||{}).id;
      if(h.status==='due') n.push({t:'due',title:'Návštěva po termínu',desc:h.name,href:`hub.html?typ=pestoun&id=${fid}`}); });
    allFosters().forEach(p=>{ if(p.eduDone<p.req*0.6) n.push({t:'warn',title:'Vzdělávání pod plánem',desc:`${p.n} · ${p.eduDone}/${p.req} h`,href:`hub.html?typ=pestoun&id=${p.id}`}); });
    n.push({t:'warn',title:'Blíží se roční vyhodnocení',desc:'Domácnost Veselých · do 30. 6. 2026',href:'pestouni.html'});
    return n;
  }
  function openNotifs(){
    let bg=document.getElementById('notifBg');
    if(!bg){ bg=document.createElement('div'); bg.id='notifBg'; bg.className='notif-bg'; bg.innerHTML='<div class="notif" id="notifPanel"></div>'; document.body.appendChild(bg);
      bg.addEventListener('click',e=>{ if(e.target===bg) bg.classList.remove('open'); }); }
    const list=buildNotifs();
    const ic=t=>`<span class="ni-ic" style="background:${t==='due'?'var(--alert-due-soft)':'var(--alert-warn-soft)'};color:${t==='due'?'var(--alert-due)':'var(--alert-warn)'}"><svg viewBox="0 0 24 24" width="17" height="17" fill="none" stroke="currentColor" stroke-width="2"><path d="M10.3 3.9 2.4 18a2 2 0 0 0 1.7 3h15.8a2 2 0 0 0 1.7-3L13.7 3.9a2 2 0 0 0-3.4 0zM12 9v4M12 17h.01"/></svg></span>`;
    document.getElementById('notifPanel').innerHTML=`<h4>Upozornění · ${list.length}</h4>`+
      (list.map(x=>`<a class="notif-item" href="${x.href}">${ic(x.t)}<div><div class="nt">${x.title}</div><div class="nd">${x.desc}</div></div></a>`).join('')||'<div class="notif-item">Žádná upozornění 🎉</div>');
    bg.classList.add('open');
  }
  function closeNotifs(){ const b=document.getElementById('notifBg'); if(b) b.classList.remove('open'); }

  /* ---------- TÉMA ---------- */
  function initTheme(host){
    if(!host) return;
    host.addEventListener('click',e=>{ const b=e.target.closest('button'); if(!b)return;
      host.querySelectorAll('button').forEach(x=>x.classList.remove('on')); b.classList.add('on');
      document.body.dataset.theme=b.dataset.theme; });
  }

  /* ---------- DRAWER ---------- */
  function ensureDrawer(){
    if(document.getElementById('drawer')) return;
    const bg=document.createElement('div'); bg.className='drawer-bg'; bg.id='dbg'; bg.onclick=closeDrawer;
    const dr=document.createElement('div'); dr.className='drawer'; dr.id='drawer';
    document.body.append(bg,dr);
  }
  function openDrawer(html){ ensureDrawer(); document.getElementById('drawer').innerHTML=html;
    document.getElementById('drawer').classList.add('open'); document.getElementById('dbg').classList.add('open'); }
  function closeDrawer(){ const d=document.getElementById('drawer'); if(d) d.classList.remove('open');
    const b=document.getElementById('dbg'); if(b) b.classList.remove('open'); }

  /* ---------- TABULKOVÝ ENGINE ---------- */
  /* config: { mount, items, columns:[{key,label,w,on,locked}], cell(item,key,idx),
     groupers:{key:{label,fn}}, onOpen(item) } */
  const isMobile = () => window.matchMedia('(max-width:760px)').matches;

  function Table(cfg){
    let view=isMobile()?'cards':'table', density='comfortable', groupBy='', selected=new Set();
    const visCols = () => cfg.columns.filter(c=>c.on);
    const gridCols = () => visCols().map(c=>c.w).join(' ');
    const allSel = () => selected.size===cfg.items.length && cfg.items.length>0;

    function famCell(item,idx){ // první sloupec se swapem avatar↔checkbox (page dodá .av v cell)
      return cfg.cell(item,'__fam__',idx,{selected:selected.has(item.id), cb:cbHtml(item)});
    }
    function cbHtml(item){ return `<span class="cb ${selected.has(item.id)?'on':''}" onclick="App._t.toggleSel(event,'${cfg.id}','${item.id}')">${cbSvg}</span>`; }

    function rowHtml(item,idx){
      return `<div class="row ${selected.has(item.id)?'sel':''}" style="grid-template-columns:${gridCols()}" onclick="App._t.open('${cfg.id}','${item.id}')">
        ${visCols().map(c=>`<div>${cfg.cell(item,c.key,idx,{selected:selected.has(item.id),cb:cbHtml(item)})}</div>`).join('')}</div>`;
    }
    function headHtml(){
      return `<div class="list-head" style="grid-template-columns:${gridCols()}">
        ${visCols().map((c,i)=>i===0
          ? `<div class="selall" onclick="App._t.toggleAll(event,'${cfg.id}')"><span class="cb ${allSel()?'on':''}">${cbSvg}</span> ${c.label}</div>`
          : `<div>${c.label}</div>`).join('')}</div>`;
    }
    function groupData(){ const fn=cfg.groupers[groupBy].fn; const g={};
      cfg.items.forEach(it=>{ const k=fn(it); (g[k]=g[k]||[]).push(it); }); return g; }
    function tableBody(){
      const dens=density==='compact'?'compact':'';
      if(groupBy){ const g=groupData(); return Object.entries(g).map(([k,rows])=>
        `<div class="group-head">${k} <span class="pill">${rows.length}</span></div><div class="list ${dens}">${headHtml()}${rows.map((r,i)=>rowHtml(r,i)).join('')}</div>`).join(''); }
      return `<div class="list ${dens}">${headHtml()}${cfg.items.map((r,i)=>rowHtml(r,i)).join('')}</div>`;
    }
    function cardsBody(){
      const make=list=>`<div class="cards">${list.map((it,i)=>cfg.card(it,i,{selected:selected.has(it.id),cb:cbHtml(it)})).join('')}</div>`;
      if(groupBy){ const g=groupData(); return Object.entries(g).map(([k,rows])=>`<div class="group-head">${k} <span class="pill">${rows.length}</span></div>${make(rows)}`).join(''); }
      return make(cfg.items);
    }

    function render(){
      const groupOpts = `<div class="opt" data-g="">Bez seskupení</div>`+Object.entries(cfg.groupers).map(([k,g])=>`<div class="opt" data-g="${k}">${g.label}</div>`).join('');
      const colOpts = cfg.columns.map(c=>`<div class="opt" data-col="${c.key}" style="${c.locked?'opacity:.5;pointer-events:none':''}"><span class="cb ${c.on?'on':''}">${cbSvg}</span><span>${c.label}</span><span class="grip">${c.locked?'🔒':'⠿'}</span></div>`).join('');
      cfg.mount.innerHTML = `
        <div class="toolbar">
          <div class="seg" data-seg="view">
            <button class="${view==='table'?'on':''}" data-v="table"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M3 6h18M3 12h18M3 18h18"/></svg> Tabulka</button>
            <button class="${view==='cards'?'on':''}" data-v="cards"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="3" width="7" height="7" rx="1.5"/><rect x="14" y="3" width="7" height="7" rx="1.5"/><rect x="3" y="14" width="7" height="7" rx="1.5"/><rect x="14" y="14" width="7" height="7" rx="1.5"/></svg> Karty</button>
          </div>
          <div class="dd"><button class="chip" data-dd="g">Seskupit ▾</button><div class="dd-menu" data-menu="g"><div class="head">Seskupit podle</div>${groupOpts}</div></div>
          <div class="dd"><button class="chip" data-dd="c">Sloupce ▾</button><div class="dd-menu" data-menu="c"><div class="head">Zobrazené sloupce</div>${colOpts}</div></div>
          <div class="sep"></div>
          <div class="seg" data-seg="dens">
            <button class="${density==='comfortable'?'on':''}" data-d="comfortable" title="Pohodlné"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M4 6h16M4 12h16M4 18h16"/></svg></button>
            <button class="${density==='compact'?'on':''}" data-d="compact" title="Kompaktní"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M4 5h16M4 9h16M4 13h16M4 17h16"/></svg></button>
          </div>
        </div>
        <div class="bulkbar ${selected.size?'show':''}">
          <span class="cb on" data-clear><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3"><path d="M5 12h14"/></svg></span>
          <span class="n">${selected.size} vybráno</span><div class="sep"></div>
          <div class="bb">Přiřadit pracovníka</div><div class="bb">Hromadná zpráva</div><div class="bb">Export</div>
        </div>
        <div data-body>${view==='cards'&&cfg.card?cardsBody():tableBody()}</div>`;
      wire();
    }
    function wire(){
      const m=cfg.mount;
      m.querySelector('[data-seg="view"]').onclick=e=>{const b=e.target.closest('button');if(!b)return;view=b.dataset.v;render();};
      m.querySelector('[data-seg="dens"]').onclick=e=>{const b=e.target.closest('button');if(!b)return;density=b.dataset.d;render();};
      m.querySelectorAll('[data-dd]').forEach(btn=>btn.onclick=e=>{e.stopPropagation();const k=btn.dataset.dd;
        m.querySelectorAll('.dd-menu').forEach(x=>{if(x.dataset.menu!==k)x.classList.remove('open');});
        m.querySelector(`[data-menu="${k}"]`).classList.toggle('open');});
      m.querySelector('[data-menu="g"]').onclick=e=>{const o=e.target.closest('.opt');if(!o)return;groupBy=o.dataset.g;render();};
      m.querySelector('[data-menu="c"]').onclick=e=>{const o=e.target.closest('.opt');if(!o)return;const c=cfg.columns.find(x=>x.key===o.dataset.col);if(c.locked)return;c.on=!c.on;render();};
      const cl=m.querySelector('[data-clear]'); if(cl) cl.onclick=()=>{selected.clear();render();};
    }
    const api = {
      open:(id)=>cfg.onOpen(cfg.items.find(x=>String(x.id)===String(id))),
      toggleSel:(e,id)=>{e.stopPropagation();selected.has(id)?selected.delete(id):selected.add(id);render();},
      toggleAll:(e)=>{e.stopPropagation();allSel()?selected.clear():cfg.items.forEach(it=>selected.add(it.id));render();},
      setItems:(arr)=>{cfg.items=arr;selected.clear();render();},
    };
    // registrace pro onclick v HTML
    App._t = App._t || {};
    const wrap = {
      open:(tid,id)=>api.open(id),
      toggleSel:(e,tid,id)=>api.toggleSel(e,id),
      toggleAll:(e,tid)=>api.toggleAll(e),
    };
    App._t = wrap;
    render();
    return api;
  }

  /* ---------- BRANDING (Nastavení) – barvy/logo přes CSS proměnné ---------- */
  const BRAND_DEFAULTS = { orgName:'Doprovázení, z.s.', branch:'Pobočka Brno', logo:'D',
    accent:'#FFDB4D', careLong:'#3380FF', careTemp:'#FF7F4D', careKin:'#22C55E',
    alertOk:'#15914B', alertWarn:'#B7791F', alertDue:'#D43A28', neutral:'#8A8D98' };
  function loadBrand(){ try{ return Object.assign({}, BRAND_DEFAULTS, JSON.parse(localStorage.getItem('crm-brand')||'{}')); }catch(e){ return {...BRAND_DEFAULTS}; } }
  function saveBrand(b){ try{ localStorage.setItem('crm-brand', JSON.stringify(b)); }catch(e){} }
  const _h2r = h => { h=h.replace('#',''); if(h.length===3)h=h.split('').map(c=>c+c).join(''); return [0,2,4].map(i=>parseInt(h.slice(i,i+2),16)); };
  const _r2h = a => '#'+a.map(x=>Math.max(0,Math.min(255,Math.round(x))).toString(16).padStart(2,'0')).join('');
  function mix(h1,h2,t){ const a=_h2r(h1),b=_h2r(h2); return _r2h(a.map((x,i)=>x+(b[i]-x)*t)); }
  const soft = h => mix(h,'#FFFFFF',0.86);
  function applyBrand(b){ b=b||loadBrand(); const r=document.documentElement.style;
    r.setProperty('--accent',b.accent); r.setProperty('--accent-hover',mix(b.accent,'#000000',0.12));
    r.setProperty('--care-long',b.careLong); r.setProperty('--care-long-soft',soft(b.careLong));
    r.setProperty('--care-temp',b.careTemp); r.setProperty('--care-temp-soft',soft(b.careTemp));
    r.setProperty('--care-kin',b.careKin);   r.setProperty('--care-kin-soft',soft(b.careKin));
    r.setProperty('--alert-ok',b.alertOk);   r.setProperty('--alert-ok-soft',soft(b.alertOk));
    r.setProperty('--alert-warn',b.alertWarn);r.setProperty('--alert-warn-soft',soft(b.alertWarn));
    r.setProperty('--alert-due',b.alertDue); r.setProperty('--alert-due-soft',soft(b.alertDue));
    r.setProperty('--avatar-neutral',b.neutral);
    // textové prvky, pokud na stránce jsou
    document.querySelectorAll('.org-logo,#railLogo,.rail .logo').forEach(el=>el.textContent=b.logo);
    document.querySelectorAll('.org-meta .t').forEach(el=>el.textContent=b.orgName);
    document.querySelectorAll('.org-meta .s').forEach(el=>el.textContent=b.branch);
  }

  /* zavření dropdownů kliknutím mimo */
  document.addEventListener('click',e=>{ if(!e.target.closest('.dd')) document.querySelectorAll('.dd-menu').forEach(x=>x.classList.remove('open')); });

  /* aplikuj branding hned (a po vykreslení railu/sidebaru) */
  function bootBrand(){ applyBrand(); }
  if(document.readyState!=='loading') bootBrand(); else document.addEventListener('DOMContentLoaded', bootBrand);

  /* ---------- RYCHLÉ HLEDÁNÍ (Ctrl/Cmd + K) ---------- */
  let palIdx=null, palSel=0, palItems=[];
  function buildIndex(){
    const idx=[];
    [['Přehled','prehled.html'],['Pěstouni','pestouni.html'],['Děti','deti.html'],['Ostatní kontakty','ostatni.html'],['Kalendář','kalendar.html'],['Úkoly','ukoly.html'],['Nastavení','nastaveni.html']].forEach(([l,h])=>idx.push({l,h,s:'Stránka',shape:'sq',care:null}));
    allFosters().forEach(p=>idx.push({l:p.n,h:`hub.html?typ=pestoun&id=${p.id}`,s:'Pěstoun',shape:'sq',care:null,photo:p.photo}));
    allChildren().forEach(k=>idx.push({l:k.n,h:`hub.html?typ=dite&id=${k.id}`,s:'Dítě · '+CARE[k.care][1],shape:'',care:k.care,photo:k.photo}));
    return idx;
  }
  function ensurePalette(){
    if(document.getElementById('cmdk')) return;
    const bg=document.createElement('div'); bg.className='cmdk-bg'; bg.id='cmdkBg';
    bg.innerHTML=`<div class="cmdk" id="cmdk"><input id="cmdkInput" placeholder="Hledat kartu, osobu nebo stránku…" autocomplete="off"><div class="cmdk-list" id="cmdkList"></div><div class="cmdk-hint">↑↓ pohyb · ↵ otevřít · Esc zavřít</div></div>`;
    document.body.appendChild(bg);
    bg.addEventListener('click',e=>{ if(e.target===bg) closePalette(); });
    bg.querySelector('#cmdkInput').addEventListener('input',()=>{palSel=0;renderPalette();});
    bg.querySelector('#cmdkInput').addEventListener('keydown',e=>{
      if(e.key==='ArrowDown'){e.preventDefault();palSel=Math.min(palSel+1,palItems.length-1);renderPalette();}
      else if(e.key==='ArrowUp'){e.preventDefault();palSel=Math.max(palSel-1,0);renderPalette();}
      else if(e.key==='Enter'){e.preventDefault();const it=palItems[palSel];if(it)location.href=it.h;}
      else if(e.key==='Escape'){closePalette();}
    });
  }
  function renderPalette(){
    const q=(document.getElementById('cmdkInput').value||'').toLowerCase().trim();
    palItems=(palIdx||[]).filter(it=>!q||it.l.toLowerCase().includes(q)||it.s.toLowerCase().includes(q)).slice(0,30);
    document.getElementById('cmdkList').innerHTML=palItems.map((it,i)=>`<a class="cmdk-item ${i===palSel?'sel':''}" href="${it.h}">${it.s==='Stránka'?'<span class="cmdk-ic">▸</span>':avatar(it.l,it.care,it.photo,26,it.shape)}<span>${it.l}</span><span class="s">${it.s}</span></a>`).join('')||'<div class="cmdk-item" style="color:var(--text-3)">Nic nenalezeno</div>';
  }
  function openPalette(){ ensurePalette(); palIdx=buildIndex(); palSel=0; document.getElementById('cmdkBg').classList.add('open'); const i=document.getElementById('cmdkInput'); i.value=''; renderPalette(); setTimeout(()=>i.focus(),0); }
  function closePalette(){ const b=document.getElementById('cmdkBg'); if(b) b.classList.remove('open'); }
  document.addEventListener('keydown',e=>{ if((e.ctrlKey||e.metaKey)&&(e.key==='k'||e.key==='K')){ e.preventDefault(); const b=document.getElementById('cmdkBg'); (b&&b.classList.contains('open'))?closePalette():openPalette(); } });

  /* ---------- MOBILNÍ MENU (hamburger + výsuvný sidebar) ---------- */
  function initMobile(){
    const topbar=document.querySelector('.topbar'), side=document.querySelector('.side');
    if(!topbar||!side||document.getElementById('burger')) return;
    const burger=document.createElement('button');
    burger.id='burger'; burger.className='burger';
    burger.innerHTML='<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M3 6h18M3 12h18M3 18h18"/></svg>';
    topbar.insertBefore(burger, topbar.firstChild);
    const bg=document.createElement('div'); bg.className='side-backdrop'; document.body.appendChild(bg);
    const close=()=>{ side.classList.remove('open'); bg.classList.remove('open'); };
    burger.onclick=()=>{ side.classList.toggle('open'); bg.classList.toggle('open'); };
    bg.onclick=close;
    side.addEventListener('click',e=>{ if(e.target.closest('.nav-item,.org,.cat')) close(); });
  }
  if(document.readyState!=='loading') initMobile();
  else document.addEventListener('DOMContentLoaded', initMobile);

  return { households, byId, allFosters, allChildren, allDocs, DOC_CATS, CARE, STATUS,
    careTypesOf, careGroupLabel, eduRequiredFor, ini, avatar, careBadge, statusBadge, careMix, eduBar, upoz,
    fmtDate, fmtDateTime, dateBucket, dayDiff, cbSvg, swap, renderRail, initTheme, openDrawer, closeDrawer, Table,
    BRAND_DEFAULTS, loadBrand, saveBrand, applyBrand, openNotifs, closeNotifs,
    isoWeek, holidaysFor, integLoad, integSave, allTasks, calColorsLoad, calColorsSave, vacations, workerFull, _t:{} };
})();

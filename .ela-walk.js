const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');

const navRx=/^(next|back|.*review the lesson|again|back to)/i;
const clean=s=>s.replace(/\s+/g,' ').trim();
const passAnswers={
  'lesson-ss1-map-skills.html':['South','Look it up in the legend','B4','3 miles','North is fixed'],
  'lesson-ss2-us-regions.html':['The Midwest','Midwest','They share land','Southwest','Regions go by what states share'],
  'lesson-ss3-states-capitals-landforms.html':['It’s where the state’s government','The capital is often NOT','The Rocky Mountains','The Great Plains','Ask where Texas’s government sits'],
  'lesson-ss4-geography-shapes-life.html':['Water to drink','Fishing and shipping','People brought water','Building a dam','Cities cluster along coasts'],
  'lesson-ss5-rules-laws.html':['Fair, safe, predictable','A law is made by government','The rules weren’t agreed','Books slowly stop coming back','The fun parts of town life']
};

if(process.argv[2]==='--layout'){
  (async()=>{const browser=await chromium.launch({headless:true});
    for(const file of process.argv.slice(3)){const page=await browser.newPage({viewport:{width:1280,height:800}});await page.goto('file:///'+path.join(process.cwd(),file).replace(/\\/g,'/'));const start=page.getByRole('button',{name:/Start lesson/i});if(await start.count())await start.click();await page.waitForTimeout(100);const result=await page.evaluate(()=>{const bad=[...document.querySelectorAll('button,a,input,textarea,svg,table')].filter(e=>{const r=e.getBoundingClientRect();const s=getComputedStyle(e);return s.display!=='none'&&s.visibility!=='hidden'&&(r.right>document.documentElement.clientWidth+1||r.left<-1)}).map(e=>({tag:e.tagName,text:(e.innerText||e.getAttribute('aria-label')||'').trim().slice(0,80),left:e.getBoundingClientRect().left,right:e.getBoundingClientRect().right}));return {horizontal:document.documentElement.scrollWidth>document.documentElement.clientWidth+1,width:document.documentElement.scrollWidth,bad};});console.log(file,JSON.stringify(result));await page.close();}await browser.close();})();
  return;
}

if(process.argv[2]==='--summary'){
  for(const file of process.argv.slice(3)){
    const p=path.join(process.cwd(),'.ela-audit',file.replace(/\.html$/,''),'log.json');
    const a=JSON.parse(fs.readFileSync(p,'utf8'));
    console.log('\n### '+file);
    let gotChallenge=false;const tags=new Set(),qs=new Set();
    for(const e of a){const t=e.text.replace(/\r/g,'');
      if(!gotChallenge&&/\nCHALLENGE\n/.test(t)){gotChallenge=true;console.log('\n[CHALLENGE]\n'+t);continue;}
      const tm=t.match(/\n(WHAT JUST HAPPENED|PREDICT FIRST|WHY|CATCH THE MISTAKE)\n([^\n]+)/);
      if(tm&&!tags.has(tm[1])){tags.add(tm[1]);console.log('\n['+tm[1]+']\n'+t);continue;}
      const qm=t.match(/QUESTION (\d+) OF \d+/);
      if(qm&&!qs.has(qm[1])){qs.add(qm[1]);console.log('\n[Q'+qm[1]+']\n'+t);}
    }
  }
  process.exit(0);
}

(async()=>{
  const file=process.argv[2];
  const auditWidth=parseInt(process.env.SS_WIDTH||'1280',10);
  const out=path.join(process.cwd(),'.ela-audit',file.replace(/\.html$/,'')+(auditWidth===1280?'':'-'+auditWidth));
  fs.mkdirSync(out,{recursive:true});
  const browser=await chromium.launch({headless:true});
  const context=await browser.newContext({viewport:{width:auditWidth,height:800}});
  const page=await context.newPage();
  await page.goto('file:///'+path.join(process.cwd(),file).replace(/\\/g,'/'));
  let n=0, reviewed=process.env.SS_PASS==='1', reviewing=false, finished=false, mythClicks=0, timelineClicks=0;
  const tried=new Map(), seen=new Set(), log=[];
  async function body(){return await page.locator('body').innerText();}
  async function snap(label){
    const txt=await body(), key=clean(txt);
    if(!seen.has(key)){
      seen.add(key);n++;
      const base=String(n).padStart(2,'0')+'-'+label.replace(/[^a-z0-9-]/gi,'-');
      await page.screenshot({path:path.join(out,base+'.png'),fullPage:true});
      fs.writeFileSync(path.join(out,base+'.txt'),txt,'utf8');
      log.push({n,label,text:txt,buttons:await page.getByRole('button').allTextContents()});
    }
    return txt;
  }
  function identity(txt){
    const q=txt.match(/QUESTION\s+\d+\s+OF\s+\d+/i);if(q)return q[0].toUpperCase();
    const activeCard=txt.match(/(?:PEN PAL|POSTCARD|CASE|CHALLENGE)\s*#?\s*(\d+)[\s\S]{0,120}?(?:MATCHING NOW|NOW)/i);
    if(activeCard){const p=txt.match(/P\.\s*\d+\s*\/\s*\d+/i);return (p?p[0]+' ':'')+'ACTIVE '+activeCard[1];}
    const now=txt.match(/(?:PATIENT|CHALLENGE|ROUND|CASE|PASSAGE|STEP|SENTENCE|CARD|EXAMPLE)\s+\d+[\s\S]{0,180}?\bnow\b/i);if(now)return clean(now[0]);
    const sciencePage=txt.match(/P\.\s*\d+\s*\/\s*\d+/i);if(sciencePage)return sciencePage[0].toUpperCase()+' '+txt.length+' '+clean(txt).slice(-120);
    return clean(txt).slice(0,420).replace(/(?:Correct|Not quite|Try again|No\.).*$/i,'');
  }
  for(let turn=0;turn<180&&!finished;turn++){
    const txt=await snap('screen');
    if(/Lesson complete|Worth one more pass/i.test(txt)){
      const again=page.getByRole('button',{name:/^(?:↻\s*)?Again$/i});
      if(await again.count()){await again.click();await page.waitForTimeout(350);await snap('restart');}
      finished=true;break;
    }
    const start=page.getByRole('button',{name:/Start lesson/i});
    if(await start.count()){await start.click();await page.waitForTimeout(350);continue;}

    // Exercise Review once, then walk forward normally until the quiz returns.
    if(!reviewed&&/QUESTION\s+1\s+OF/i.test(txt)){
      const review=page.getByRole('button',{name:/Review the lesson/i});
      if(await review.count()){reviewed=true;reviewing=true;await review.click();await page.waitForTimeout(350);continue;}
    }
    if(reviewing){
      if(/QUESTION\s+1\s+OF/i.test(txt)){reviewing=false;continue;}
      const nx=page.getByRole('button',{name:/^Next/i});
      if(await nx.count()&&await nx.isEnabled()){await nx.click();await page.waitForTimeout(350);continue;}
    }

    if(false&&/P\. 1 \/ 11/i.test(txt)&&(/MARCUS GETS EVERY JOB|RIGHTS-ONLY DAY/i.test(txt))&&timelineClicks<3){
      const labels=/MARCUS GETS EVERY JOB/i.test(txt)
        ? ['3:00 PM — MARCUS MAKES THE RULES','3:10 PM — MARCUS ENFORCES THE RULES','3:15 PM — YOU APPEAL… TO MARCUS']
        : ['9:00 AM — YOU HAVE THE RIGHT TO SPEAK','3:00 PM — YOU HAVE THE RIGHT TO YOUR STUFF','3:30 PM — YOU ASK WHO’LL MAKE IT RIGHT'];
      const loc=page.getByText(labels[timelineClicks],{exact:true}).first();
      if(await loc.count()&&await loc.isVisible()){const box=await loc.boundingBox();if(box){await page.mouse.click(box.x+Math.min(40,box.width/2),box.y+box.height/2);timelineClicks++;await page.waitForTimeout(400);continue;}}
    }

    // Visible-text fallbacks for controls whose custom markup has no usable
    // accessibility role in these social-studies lessons.
    if(/P\. 1 \/ 11/i.test(txt)&&(/MARCUS GETS EVERY JOB|RIGHTS-ONLY DAY/i.test(txt))){
      const nxText=page.getByText(/^Next\s*→?$/i,{exact:false}).last();
      if(await nxText.count()&&await nxText.isVisible()&&await nxText.isEnabled()){await nxText.click();await page.waitForTimeout(400);continue;}
      if(await nxText.count()&&await nxText.isVisible()){await page.waitForTimeout(2600);if(await nxText.isEnabled()){await nxText.click();await page.waitForTimeout(400);continue;}}
    }
    if(/A warm coat, with winter coming/i.test(txt)&&!/A warm coat, with winter coming\s*✓/i.test(txt)){
      const need=page.getByText('Need',{exact:true}).first();if(await need.count()&&await need.isVisible()){await need.click();await page.waitForTimeout(400);continue;}
    }
    if(/The lemonade stand/i.test(txt)&&!/The lemonade stand\s*✓/i.test(txt)){
      const good=page.getByText('A good',{exact:true}).last();if(await good.count()&&await good.isVisible()){await good.click();await page.waitForTimeout(400);continue;}
    }

    const roll=page.getByRole('button',{name:/Roll/i});
    if(await roll.count()&&await roll.isVisible()&&await roll.isEnabled()){
      await roll.click();await page.waitForTimeout(900);continue;
    }

    // Fill visible writing fields with a plausible fourth-grade response.
    const fields=page.locator('textarea:visible,input:visible');
    const fc=await fields.count();
    for(let i=0;i<fc;i++){
      const f=fields.nth(i);
      if(!(await f.inputValue()))await f.fill('The text gives a clear detail that supports this idea.');
    }

    const buttons=page.getByRole('button');
    const count=await buttons.count(), candidates=[];
    for(let i=0;i<count;i++){
      const b=buttons.nth(i), name=clean(await b.innerText());
      const box=await b.boundingBox();
      if(await b.isVisible()&&await b.isEnabled()&&!navRx.test(name)&&box&&(auditWidth<=500||box.x>280))candidates.push({b,name,key:'btn-'+i+'-'+name});
    }
    if(/Click each card to open its myth/i.test(txt)){
      if(mythClicks<3){
        const names=['MIDAS TOUCH','ACHILLES HEEL','TROJAN HORSE'];
        await page.getByText(names[mythClicks],{exact:true}).click();mythClicks++;
        await page.waitForTimeout(300);continue;
      }
      const mythNext=page.getByRole('button',{name:/^Next/i});
      if(await mythNext.count()&&await mythNext.isEnabled()){await mythNext.click();await page.waitForTimeout(350);continue;}
    }
    const id=identity(txt), used=tried.get(id)||new Set();
    const visibleTaps=[];
    let tapChoice;
    for(const label of visibleTaps){
      if(used.has('tap-'+label))continue;
      const loc=page.getByText(label,{exact:true}).first();
      if(await loc.count()&&await loc.isVisible()){tapChoice={b:loc.locator('..'),name:label,key:'tap-'+label,quick:true};break;}
    }
    let choice;
    if(process.env.SS_PASS==='1'){
      const qm=txt.match(/QUESTION\s+(\d+)\s+OF/i), wanted=qm&&passAnswers[file]?.[Number(qm[1])-1];
      if(wanted)choice=candidates.find(x=>x.name.startsWith(wanted));
    }
    if(!choice)choice=tapChoice||candidates.find(x=>!used.has(x.key||x.name));
    if(choice){
      used.add(choice.key||choice.name);tried.set(id,used);
      await choice.b.click();await page.waitForTimeout(choice.quick?350:3000);continue;
    }
    const readyNext=page.getByRole('button',{name:/^Next/i});
    if(await readyNext.count()&&await readyNext.isEnabled()){await readyNext.click();await page.waitForTimeout(400);continue;}
    // Last-resort kid-style exploration of a visible diagram: click a grid of
    // points inside the largest SVG, just as a student would tap map regions.
    const svgs=page.locator('svg:visible');
    let best=null;
    for(let i=0;i<await svgs.count();i++){
      const s=svgs.nth(i), b=await s.boundingBox();
      if(b&&(auditWidth<=500||b.x>280)&&(!best||b.width*b.height>best.box.width*best.box.height))best={s,box:b};
    }
    if(best){
      for(let gy=0;gy<9&&!choice;gy++)for(let gx=0;gx<9&&!choice;gx++){
        const name='svg-'+gx+'-'+gy;
        if(!used.has(name))choice={b:best.s,name,pos:{x:best.box.width*(gx+.5)/9,y:best.box.height*(gy+.5)/9}};
      }
    }
    if(choice&&choice.pos){
      used.add(choice.name);tried.set(id,used);
      await choice.b.click({position:choice.pos});await page.waitForTimeout(180);continue;
    }
    // Generic lesson controls that are not semantic buttons (map cells,
    // legend rows, region tiles, and SVG groups). Interact through visible
    // locators only; never call lesson functions directly.
    const extras=page.locator('[data-cell]:visible,.leg-row:visible,.rgn-row:visible,[role="button"]:visible,svg [onclick]:visible,svg path:visible,svg polygon:visible,svg rect:visible');
    const ec=await extras.count();
    for(let i=0;i<ec;i++){
      const e=extras.nth(i), box=await e.boundingBox();
      if(!box||(auditWidth>500&&box.x<=280))continue;
      const name=clean((await e.innerText().catch(()=>''))||await e.getAttribute('data-cell')||await e.getAttribute('aria-label')||('extra-'+i));
      if(!used.has(name)){choice={b:e,name,quick:true};break;}
    }
    if(choice){
      used.add(choice.name);tried.set(id,used);
      await choice.b.click({force:!!choice.quick});await page.waitForTimeout(choice.quick?180:3000);continue;
    }
    const nx=page.getByRole('button',{name:/^Next/i});
    if(await nx.count()&&await nx.isEnabled()){await nx.click();await page.waitForTimeout(400);continue;}
    const back=page.getByRole('button',{name:/^Back/i});
    if(await back.count()&&await back.isEnabled()){await snap('stuck');throw new Error('Stuck with only Back available');}
    await snap('stuck');throw new Error('No usable control found');
  }
  fs.writeFileSync(path.join(out,'log.json'),JSON.stringify(log,null,2),'utf8');
  console.log(JSON.stringify({file,screens:n,finished,reviewed,last:(await body()).slice(0,240)}));
  await Promise.race([browser.close(),new Promise(resolve=>setTimeout(resolve,2000))]);
  process.exit(finished?0:2);
})().catch(e=>{console.error(e);process.exit(1)});

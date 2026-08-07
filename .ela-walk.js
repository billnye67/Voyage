const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');

const navRx=/^(next|back|.*review the lesson|again|back to)/i;
const clean=s=>s.replace(/\s+/g,' ').trim();

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
  const out=path.join(process.cwd(),'.ela-audit',file.replace(/\.html$/,''));
  fs.mkdirSync(out,{recursive:true});
  const browser=await chromium.launch({headless:true});
  const context=await browser.newContext({viewport:{width:1280,height:800}});
  const page=await context.newPage();
  await page.goto('file:///'+path.join(process.cwd(),file).replace(/\\/g,'/'));
  let n=0, reviewed=false, reviewing=false, finished=false, mythClicks=0;
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
    const now=txt.match(/(?:PATIENT|CHALLENGE|ROUND|CASE|PASSAGE|STEP|SENTENCE|CARD|EXAMPLE)\s+\d+[\s\S]{0,180}?\bnow\b/i);if(now)return clean(now[0]);
    const sciencePage=txt.match(/P\.\s*\d+\s*\/\s*\d+/i);if(sciencePage)return sciencePage[0].toUpperCase();
    return clean(txt).slice(0,420).replace(/(?:Correct|Not quite|Try again|No\.).*$/i,'');
  }
  for(let turn=0;turn<180&&!finished;turn++){
    const txt=await snap('screen');
    if(/Lesson complete|Worth one more pass/i.test(txt)){
      const again=page.getByRole('button',{name:/Again/i});
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
      if(await b.isVisible()&&await b.isEnabled()&&!navRx.test(name)&&box&&box.x>280)candidates.push({b,name});
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
    let choice=candidates.find(x=>!used.has(x.name));
    if(choice){
      used.add(choice.name);tried.set(id,used);
      await choice.b.click();await page.waitForTimeout(3000);continue;
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

// Walks every screen of each lesson and reports every rendered text element
// whose EFFECTIVE size is below the floor. Usage: node .sci-textscan.js [--floor 13.5] file...
const { chromium } = require('playwright');
const path = require('path');

const navRx=/^(next|back|.*review the lesson|again|back to)/i;
const clean=s=>s.replace(/\s+/g,' ').trim();
let argv=process.argv.slice(2), FLOOR=13.5;
if(argv[0]==='--floor'){FLOOR=parseFloat(argv[1]);argv=argv.slice(2);}

async function measure(page){
  return await page.evaluate((FLOOR)=>{
    const out=[];
    const vis=e=>{const r=e.getBoundingClientRect();const s=getComputedStyle(e);
      return s.display!=='none'&&s.visibility!=='hidden'&&r.width>0&&r.height>0;};
    // SVG text: effective px = computed font-size (user units) * CTM scale
    for(const t of document.querySelectorAll('svg text, svg tspan')){
      if(!vis(t.closest('text')||t))continue;
      const fs=parseFloat(getComputedStyle(t).fontSize);
      const svg=t.ownerSVGElement; if(!svg)continue;
      const ctm=(t.closest('text')||t).getScreenCTM(); if(!ctm)continue;
      const eff=fs*Math.hypot(ctm.a,ctm.b);
      if(eff<FLOOR)out.push({kind:'svg',eff:Math.round(eff*10)/10,decl:fs,text:(t.textContent||'').trim().slice(0,70)});
    }
    // HTML text: leaf-ish elements inside the stage card
    const stage=document.getElementById('stage')||document.body;
    for(const e of stage.querySelectorAll('*')){
      if(e.closest('svg'))continue;
      if(!vis(e))continue;
      const own=[...e.childNodes].filter(n=>n.nodeType===3&&n.textContent.trim()).map(n=>n.textContent.trim()).join(' ');
      if(!own)continue;
      const fs=parseFloat(getComputedStyle(e).fontSize);
      if(fs<FLOOR-1.5)out.push({kind:'html',eff:fs,cls:e.className&&e.className.baseVal!==undefined?e.className.baseVal:String(e.className||''),tag:e.tagName,text:own.slice(0,70)});
    }
    // text crossing an INTERNAL panel/box border (partially inside, partially outside)
    for(const t of document.querySelectorAll('svg text')){
      if(!vis(t))continue;
      const rt=t.getBoundingClientRect();
      const svg=t.ownerSVGElement; if(!svg)continue;
      for(const r of svg.querySelectorAll('rect')){
        const rr=r.getBoundingClientRect();
        if(rr.width<40||rr.height<30)continue;           // ignore small glyph-ish rects
        const stroke=r.getAttribute('stroke')||getComputedStyle(r).stroke;
        const sw=parseFloat(r.getAttribute('stroke-width')||getComputedStyle(r).strokeWidth)||0;
        if(!stroke||stroke==='none'||sw<=0)continue;      // unbordered fill: not a perceived box
        const svgBox=svg.getBoundingClientRect();
        if(rr.width>svgBox.width*0.94&&rr.height>svgBox.height*0.94)continue; // full-figure backdrop
        const ix=Math.min(rt.right,rr.right)-Math.max(rt.left,rr.left);
        const iy=Math.min(rt.bottom,rr.bottom)-Math.max(rt.top,rr.top);
        if(ix<=1||iy<=1)continue;                        // no meaningful intersection
        const inside=rt.left>=rr.left-1&&rt.right<=rr.right+1&&rt.top>=rr.top-1&&rt.bottom<=rr.bottom+1;
        if(!inside)
          out.push({kind:'crosses',eff:0,text:(t.textContent||'').trim().slice(0,50)+' ⟷ panel'});
      }
    }
    // collisions: two SVG text boxes overlapping, or text spilling outside its svg
    const texts=[...document.querySelectorAll('svg text')].filter(vis);
    for(let i=0;i<texts.length;i++){
      const a=texts[i], ra=a.getBoundingClientRect();
      const svg=a.ownerSVGElement;
      if(svg){
        const rs=svg.getBoundingClientRect();
        if(ra.left<rs.left-1||ra.right>rs.right+1||ra.top<rs.top-1||ra.bottom>rs.bottom+1)
          out.push({kind:'spill',eff:0,text:(a.textContent||'').trim().slice(0,60)});
      }
      for(let j=i+1;j<texts.length;j++){
        const rb=texts[j].getBoundingClientRect();
        const ox=Math.min(ra.right,rb.right)-Math.max(ra.left,rb.left);
        const oy=Math.min(ra.bottom,rb.bottom)-Math.max(ra.top,rb.top);
        if(ox>1.5&&oy>1.5)
          out.push({kind:'overlap',eff:0,text:((a.textContent||'').trim().slice(0,32))+' ⟂ '+((texts[j].textContent||'').trim().slice(0,32))});
        // side-by-side labels that don't intersect but sit too close to read as separate words
        else if(oy>1.5&&ox<0&&Math.abs(ox)<9)
          out.push({kind:'merge',eff:0,text:((a.textContent||'').trim().slice(0,28))+' ▸◂ '+((texts[j].textContent||'').trim().slice(0,28))+' (gap '+Math.round(-ox)+'px)'});
        // (vertical box gaps are just normal line leading — stacked lines read fine)
      }
    }
    return out;
  },FLOOR);
}

(async()=>{
  const browser=await chromium.launch({headless:true});
  const report={};
  for(const file of argv){
    const context=await browser.newContext({viewport:{width:1280,height:800}});
    const page=await context.newPage();
    await page.goto('file:///'+path.join(process.cwd(),file).replace(/\\/g,'/'));
    let finished=false, mythClicks=0;
    const tried=new Map(), seen=new Set(), viol=new Map();
    async function body(){return await page.locator('body').innerText();}
    function identity(txt){
      const q=txt.match(/QUESTION\s+\d+\s+OF\s+\d+/i);if(q)return q[0].toUpperCase();
      const now=txt.match(/(?:PATIENT|CHALLENGE|ROUND|CASE|PASSAGE|STEP|SENTENCE|CARD|EXAMPLE)\s+\d+[\s\S]{0,180}?\bnow\b/i);if(now)return clean(now[0]);
      const p=txt.match(/P\.\s*\d+\s*\/\s*\d+/i);if(p)return p[0].toUpperCase();
      return clean(txt).slice(0,420).replace(/(?:Correct|Not quite|Try again|No\.).*$/i,'');
    }
    async function scanHere(txt){
      const key=clean(txt);
      if(seen.has(key))return; seen.add(key);
      const page_id=(txt.match(/p\.\s*\d+\s*\/\s*\d+/i)||['intro/done'])[0];
      for(const v of await measure(page)){
        const k=v.kind+'|'+(v.text||'')+'|'+v.eff;
        if(!viol.has(k))viol.set(k,{...v,screens:new Set()});
        viol.get(k).screens.add(page_id);
      }
    }
    for(let turn=0;turn<200&&!finished;turn++){
      const txt=await body();
      await scanHere(txt);
      if(/Lesson complete|Worth one more pass/i.test(txt)){finished=true;break;}
      const start=page.getByRole('button',{name:/Start lesson/i});
      if(await start.count()){await start.click();await page.waitForTimeout(300);continue;}
      const fields=page.locator('textarea:visible,input:visible');
      const fc=await fields.count();
      for(let i=0;i<fc;i++){const f=fields.nth(i);
        if(!(await f.inputValue()))await f.fill('The test gives a clear result that supports this idea.');}
      const buttons=page.getByRole('button');
      const count=await buttons.count(), candidates=[];
      for(let i=0;i<count;i++){
        const b=buttons.nth(i), name=clean(await b.innerText());
        const box=await b.boundingBox();
        if(await b.isVisible()&&await b.isEnabled()&&!navRx.test(name)&&box&&box.x>280)candidates.push({b,name});
      }
      const id=identity(txt), used=tried.get(id)||new Set();
      let choice=candidates.find(x=>!used.has(x.name));
      if(choice){used.add(choice.name);tried.set(id,used);
        await choice.b.click();await page.waitForTimeout(2600);continue;}
      const nx=page.getByRole('button',{name:/^Next/i});
      if(await nx.count()&&await nx.isEnabled()){await nx.click();await page.waitForTimeout(350);continue;}
      break;
    }
    const list=[...viol.values()].map(v=>({...v,screens:[...v.screens].join(',')}))
      .sort((a,b)=>a.eff-b.eff);
    report[file]={finished,violations:list};
    console.log('== '+file+' :: finished='+finished+' :: '+list.length+' undersized');
    for(const v of list)console.log('   '+(v.kind==='overlap'||v.kind==='spill'||v.kind==='crosses'||v.kind==='merge'?'['+v.kind.toUpperCase()+']':v.eff+'px '+(v.kind==='svg'?'[svg]':'[html '+(v.cls||v.tag)+']'))+' "'+v.text+'" @'+v.screens);
    await context.close();
  }
  await browser.close();
})().catch(e=>{console.error(e);process.exit(1)});

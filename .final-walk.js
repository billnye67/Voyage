const { chromium } = require('playwright');
const fs = require('fs');

const safe = s => s.replace(/[^a-z0-9]+/gi, '-').replace(/^-|-$/g, '').slice(0, 55);

async function snap(page, dir, n, tag) {
  const text = await page.locator('body').innerText();
  fs.appendFileSync(`${dir}/transcript.txt`, `\n\n===== ${n} ${tag} =====\n${text}`);
  await page.screenshot({ path: `${dir}/${String(n).padStart(3,'0')}-${safe(tag)}.png`, fullPage: true });
}

(async () => {
  const file = process.argv[2], width = Number(process.argv[3] || 1280);
  const dir = `.final-audit/${file.replace('.html','')}/${width}`;
  fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(`${dir}/transcript.txt`, '');
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({ viewport: { width, height: 800 } });
  const page = await context.newPage();
  await page.goto(`http://127.0.0.1:8123/${file}`, { waitUntil: 'networkidle' });
  let n=0; await snap(page,dir,n++,'intro');
  await page.getByRole('button',{name:/Start lesson/i}).click();
  for (let screen=1; screen<=25; screen++) {
    await page.waitForTimeout(300);
    await snap(page,dir,n++,`screen-${screen}-initial`);
    let advanced=false;
    const seen = new Map();
    for (let attempt=0; attempt<40 && !advanced; attempt++) {
      const main = page.locator('body');
      const next = main.getByRole('button',{name:/^(Next|Finish|See results)/i}).last();
      if (await next.count() && await next.isVisible() && !await next.isDisabled()) {
        await next.click(); advanced=true; break;
      }
      const buttons = main.getByRole('button');
      let acted=false;
      for (let i=0;i<await buttons.count();i++) {
        const b=buttons.nth(i); if (!await b.isVisible() || await b.isDisabled()) continue;
        const box=await b.boundingBox(); if(!box || (width > 600 && box.x < 300)) continue;
        const label=(await b.innerText()).trim();
        if (/^(Next|Back|Finish|See results|Review|Again)/i.test(label) || label === '✓') continue;
        if ((seen.get(label)||0) >= 2) continue;
        seen.set(label,(seen.get(label)||0)+1);
        await b.click(); await page.waitForTimeout(2300);
        await snap(page,dir,n++,`screen-${screen}-clicked-${label}`);
        acted=true; break;
      }
      if (!acted) {
        const inputs=main.locator('input:visible');
        if(await inputs.count()){ await inputs.first().fill(String((attempt%12)+1)); acted=true; }
      }
      if(!acted) break;
    }
    if(!advanced) { fs.appendFileSync(`${dir}/transcript.txt`,`\n\nSOFTLOCK screen ${screen}`); break; }
    const body=await page.locator('body').innerText();
    if(/Again|Start over|completed|lesson complete/i.test(body) && screen>5){await snap(page,dir,n++,'done');break;}
  }
  const storage = await page.context().storageState();
  fs.writeFileSync(`${dir}/storage.json`,JSON.stringify(storage,null,2));
  await browser.close();
})();

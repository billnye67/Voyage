const { chromium } = require('playwright');
const path = require('path');

(async()=>{
  const file=process.argv[2];
  const actions=process.argv[3]?JSON.parse(Buffer.from(process.argv[3],'base64').toString('utf8')):[];
  const browser=await chromium.launch({headless:true});
  const context=await browser.newContext({viewport:{width:1280,height:800}});
  const page=await context.newPage();
  await page.goto('file:///'+path.join(process.cwd(),file).replace(/\\/g,'/'));
  for(const a of actions){
    if(a.wait)await page.waitForTimeout(a.wait);
    else if(a.button)await page.getByRole('button',{name:a.button,exact:false}).first().click();
    else if(a.link)await page.getByRole('link',{name:a.link,exact:false}).first().click();
    else if(a.text)await page.getByText(a.text,{exact:false}).first().click();
    else if(a.fill!==undefined)await page.locator('input,textarea').nth(a.i||0).fill(a.fill);
  }
  await page.waitForTimeout(300);
  console.log(await page.locator('body').innerText());
  console.log('\nBUTTONS',await page.getByRole('button').allTextContents());
  console.log('INPUTS',await page.locator('input,textarea').count());
  await page.screenshot({path:'.ela-check.png',fullPage:true});
  await browser.close();
})().catch(e=>{console.error(e);process.exit(1)});

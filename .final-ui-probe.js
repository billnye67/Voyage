const { chromium } = require('playwright');
const fs = require('fs');

(async () => {
  const file = process.argv[2];
  const width = Number(process.argv[3] || 1280);
  const out = process.argv[4] || '.final-audit';
  fs.mkdirSync(out, { recursive: true });
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({ viewport: { width, height: 800 } });
  const page = await context.newPage();
  await page.goto(`http://127.0.0.1:8123/${file}`, { waitUntil: 'networkidle' });
  await page.screenshot({ path: `${out}/${file}-${width}-intro.png`, fullPage: true });
  if (process.argv[5] === 'start') {
    await page.getByRole('button', { name: /Start lesson/i }).click();
    await page.waitForTimeout(250);
    await page.screenshot({ path: `${out}/${file}-${width}-started.png`, fullPage: true });
  }
  process.stdout.write((await page.locator('body').innerText()) + '\n---CONTROLS---\n');
  for (const el of await page.getByRole('button').all()) {
    process.stdout.write(`${await el.innerText()} [disabled=${await el.isDisabled()}]\n`);
  }
  await browser.close();
})();

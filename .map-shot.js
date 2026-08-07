// Screenshot just the map SVG of a lesson beat for visual review.
const { chromium } = require('playwright');
const path = require('path');
(async () => {
  const [file, mode] = [process.argv[2], process.argv[3] || 'hook'];
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage({ viewport: { width: 900, height: 900 } });
  await page.goto('file:///' + path.join(process.cwd(), file).replace(/\\/g, '/'));
  await page.getByRole('button', { name: /Start lesson/i }).click();
  await page.waitForTimeout(200);
  if (mode && mode !== 'hook') await page.evaluate(s => { maxStep = TOTAL; goStep(+s); }, mode);
  await page.waitForTimeout(200);
  await page.locator('.mapwrap').first().screenshot({ path: process.argv[4] || '.map-shot.png' });
  await browser.close();
  console.log('shot saved');
})();

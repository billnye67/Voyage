// For each lesson: unlock all steps, visit each one, and print
// "sidebar title  ||  actual on-screen heading" so a human can compare.
const { chromium } = require('playwright');
const path = require('path');
(async () => {
  const browser = await chromium.launch({ headless: true });
  for (const file of process.argv.slice(2)) {
    const page = await browser.newPage({ viewport: { width: 1280, height: 800 } });
    await page.goto('file:///' + path.join(process.cwd(), file).replace(/\\/g, '/'));
    const s = page.getByRole('button', { name: /Start lesson/i });
    if (await s.count()) { await s.click(); await page.waitForTimeout(300); }
    const rows = await page.evaluate(async () => {
      const out = [];
      const flat = OUTLINE.flatMap(p => p.items.map(i => ({ s: i.s, n: i.n, ph: p.phase })));
      maxStep = TOTAL;                      // unlock everything for inspection
      for (const it of flat) {
        goStep(it.s);
        const tag = document.querySelector('.card .tag, #stage .tag');
        const h2 = document.querySelector('.card h2, #stage h2');
        out.push(it.ph + ' / ' + it.n + '  ||  [' + (tag ? tag.innerText.trim() : '-') + '] ' + (h2 ? h2.innerText.trim() : '(no heading)'));
      }
      return out;
    });
    console.log('\n=== ' + file);
    rows.forEach(r => console.log('  ' + r));
    await page.close();
  }
  await browser.close();
})();

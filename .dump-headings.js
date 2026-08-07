// Old-style lessons: set step directly and render, dumping tag + h2 per step.
const { chromium } = require('playwright');
const path = require('path');
(async () => {
  const browser = await chromium.launch({ headless: true });
  for (const file of process.argv.slice(2)) {
    const page = await browser.newPage({ viewport: { width: 1280, height: 800 } });
    await page.goto('file:///' + path.join(process.cwd(), file).replace(/\\/g, '/'));
    const rows = await page.evaluate(() => {
      const out = [];
      const intro = document.querySelector('#intro .tag');
      const h1 = document.querySelector('#intro h1');
      out.push('META  code="' + (intro ? intro.innerText.trim() : '?') + '"  title="' + (h1 ? h1.innerText.trim() : '?') + '"  TOTAL=' + TOTAL);
      startLesson();
      for (let s = 0; s < TOTAL; s++) {
        step = s; if (typeof qIndex !== 'undefined' && s >= 5 && s < TOTAL - 1) qIndex = 0;
        try { render(); } catch (e) { out.push(s + ': RENDER ERROR ' + e); continue; }
        const tag = document.querySelector('#stage .tag, #lesson .tag');
        const h2 = document.querySelector('#stage h2, #lesson h2');
        out.push(s + ': [' + (tag ? tag.innerText.trim() : '-') + '] ' + (h2 ? h2.innerText.trim() : '(no h2)'));
      }
      return out;
    });
    console.log('\n=== ' + file);
    rows.forEach(r => console.log('  ' + r));
    await page.close();
  }
  await browser.close();
})();

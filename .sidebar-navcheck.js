// Sidebar shell verification via direct navigation (for lessons whose
// challenges a blind clicker can't solve). Checks the same shell contracts
// as .sidebar-check.js minus organic playthrough: OUTLINE integrity, lock
// behavior, per-step TOC sync, headings render, progress bar, storage key,
// restart, mobile, JS errors.
const { chromium } = require('playwright');
const path = require('path');
(async () => {
  const browser = await chromium.launch({ headless: true });
  let failed = 0;
  for (const file of process.argv.slice(2)) {
    const issues = [];
    const page = await browser.newPage({ viewport: { width: 1280, height: 800 } });
    const jsErrors = [];
    page.on('pageerror', e => jsErrors.push(String(e).slice(0, 150)));
    page.on('console', m => { if (m.type() === 'error' && !/net::|ERR_|font/i.test(m.text())) jsErrors.push(m.text().slice(0, 150)); });
    await page.goto('file:///' + path.join(process.cwd(), file).replace(/\\/g, '/'));
    const start = page.getByRole('button', { name: /Start lesson/i });
    if (!(await start.count())) { console.log('FAIL  ' + file + ' — no Start button'); failed++; await page.close(); continue; }
    await start.click(); await page.waitForTimeout(300);

    const r = await page.evaluate(() => {
      const probs = [];
      const flat = OUTLINE.flatMap(p => p.items.map(i => ({ s: i.s, n: i.n })));
      const want = Array.from({ length: TOTAL }, (_, i) => i);
      if (JSON.stringify(flat.map(x => x.s)) !== JSON.stringify(want)) probs.push('OUTLINE steps != 0..' + (TOTAL - 1));
      const qn = flat.filter(x => /^Question \d+$/.test(x.n)).length;
      if (typeof QUESTIONS !== 'undefined' && qn !== QUESTIONS.length) probs.push('TOC ' + qn + ' questions vs QUESTIONS ' + QUESTIONS.length);
      // locked at start: goStep beyond maxStep must be a no-op
      const before = step; goStep(TOTAL - 2);
      if (step !== before) probs.push('locked goStep jumped to ' + step);
      // walk every step with everything unlocked
      maxStep = TOTAL;
      for (let s = 0; s < TOTAL; s++) {
        goStep(s);
        const items = [...document.querySelectorAll('.toc-item')];
        const curIx = items.findIndex(i => i.classList.contains('cur'));
        const nCur = items.filter(i => i.classList.contains('cur')).length;
        if (nCur !== 1) probs.push('step ' + s + ': ' + nCur + ' cur items');
        if (curIx !== s) probs.push('step ' + s + ': cur highlights ' + curIx);
        if (!document.querySelector('#stage h2') && s !== TOTAL - 1) probs.push('step ' + s + ': no h2 rendered');
        const pageno = document.getElementById('pageno');
        if (!pageno || pageno.innerText.toLowerCase().indexOf('p. ' + (s + 1) + ' / ' + TOTAL) < 0) probs.push('step ' + s + ': bad page counter');
      }
      // done screen state
      goStep(TOTAL - 1);
      const pf = parseFloat(document.getElementById('pfill').style.width) || 0;
      if (pf < 99) probs.push('done screen pfill ' + pf + '%');
      const undone = [...document.querySelectorAll('.toc-item')].filter(i => !i.classList.contains('done') && !i.classList.contains('cur')).length;
      if (undone) probs.push(undone + ' TOC items not done at wrap-up');
      // storage path
      if (typeof markCourseDone === 'function') markCourseDone();
      let key = null;
      for (let i = 0; i < localStorage.length; i++) if (/progress/.test(localStorage.key(i))) key = localStorage.key(i);
      if (!key) probs.push('markCourseDone wrote no progress key');
      // restart resets shell state
      restart();
      if (step !== 0 || maxStep !== 0) probs.push('restart left step=' + step + ' maxStep=' + maxStep);
      return { probs, key };
    });
    issues.push(...r.probs);
    await page.close();

    const mp = await browser.newPage({ viewport: { width: 390, height: 800 } });
    mp.on('pageerror', e => jsErrors.push('mobile: ' + String(e).slice(0, 120)));
    await mp.goto('file:///' + path.join(process.cwd(), file).replace(/\\/g, '/'));
    const ms = mp.getByRole('button', { name: /Start lesson/i });
    if (await ms.count()) { await ms.click(); await mp.waitForTimeout(250); }
    const mob = await mp.evaluate(() => ({
      overflow: document.documentElement.scrollWidth > document.documentElement.clientWidth + 1,
      sideH: (document.querySelector('.side') || { getBoundingClientRect: () => ({ height: -1 }) }).getBoundingClientRect().height,
    }));
    if (mob.overflow) issues.push('mobile: horizontal overflow');
    if (mob.sideH > 400) issues.push('mobile: sidebar not collapsed (' + Math.round(mob.sideH) + 'px)');
    await mp.close();

    if (jsErrors.length) issues.push('JS errors: ' + [...new Set(jsErrors)].slice(0, 3).join(' | '));
    if (issues.length) { failed++; console.log('FAIL  ' + file); issues.forEach(i => console.log('        - ' + i)); }
    else console.log('PASS  ' + file + '  [' + r.key + ']');
  }
  await browser.close();
  process.exit(failed ? 1 : 0);
})();

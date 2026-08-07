// Organic playthrough of lesson-ss2-us-regions.html + screenshots of the map.
const { chromium } = require('playwright');
const path = require('path');
(async () => {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage({ viewport: { width: 1280, height: 800 } });
  const errs = [];
  page.on('pageerror', e => errs.push(String(e).slice(0, 200)));
  const fail = m => { console.log('FAIL: ' + m); process.exitCode = 1; };
  const expectText = async (t, m) => { if (!(await page.locator('body').innerText()).includes(t)) fail(m + ' — missing "' + t + '"'); };
  const rgnClick = k => page.evaluate(k2 => pcPick(k2), k);

  await page.goto('file:///' + path.join(process.cwd(), 'lesson-ss2-us-regions.html').replace(/\\/g, '/'));
  await page.getByRole('button', { name: /Start lesson/i }).click();

  // beat 0: postcard 1 wrong (NE) then right (SE); 2 right (MW); 3 right (SW)
  await page.screenshot({ path: '.ss2-shot-hook.png' });
  await rgnClick('NE');
  await expectText('Not that one', 'postcard wrong feedback');
  await rgnClick('SE');
  await expectText('Matched!', 'postcard 1 solved');
  await rgnClick('MW');
  await rgnClick('SW');
  await expectText('using nothing but the land and the weather', 'postcards complete');
  await page.locator('#nx').click();

  // beat 1: tour all five
  for (let i = 0; i < 5; i++) { await page.locator('.rgn-row').nth(i).click(); await page.waitForTimeout(100); }
  await expectText('five handshakes', 'tour complete');
  await page.screenshot({ path: '.ss2-shot-tour.png' });
  await page.locator('#nx').click();

  // beat 2: wrong job then farming
  await page.getByRole('button', { name: 'Ski resorts' }).click();
  await expectText('Ski resorts need mountains', 'job wrong feedback');
  await page.getByRole('button', { name: 'Farming' }).click();
  await expectText('bread basket', 'job correct');
  await page.locator('#nx').click();

  // beat 3: wrong then NE
  await page.getByRole('button', { name: 'Southeast' }).click();
  await expectText('mild', 'january wrong feedback');
  await page.getByRole('button', { name: 'Northeast' }).click();
  await expectText('bundle of good guesses', 'january correct');
  await page.locator('#nx').click();

  // beat 4: Leo
  await page.getByRole('button', { name: /Check Leo/ }).click();
  await expectText('matched the word, not the land', 'Leo reveal');
  await page.locator('#nx').click();

  // quiz: all correct except Q3 wrong-first? (one deliberate wrong overall → 4/5)
  for (let q = 0; q < 5; q++) {
    const correct = await page.evaluate(i => QUESTIONS[i].correct, q);
    if (q === 2) { await page.locator('#ch' + ((correct + 1) % 4)).click(); await expectText('Not quite', 'Q3 wrong feedback'); }
    else { await page.locator('#ch' + correct).click(); await expectText('Yes.', 'Q' + (q + 1) + ' correct'); }
    await page.locator('#nx').click();
  }
  await expectText('Lesson complete', 'done screen');
  await expectText('4 of 5', 'score');
  const store = await page.evaluate(() => JSON.parse(localStorage.getItem('voyage_g4ss_progress') || '{}'));
  if (!store.done || !store.done['SS.4.G.2']) fail('progress key missing SS.4.G.2: ' + JSON.stringify(store));

  if (errs.length) fail('JS errors: ' + errs.join(' | '));
  console.log(process.exitCode ? 'PLAYTHROUGH HAD FAILURES' : 'PLAYTHROUGH PASS');
  await browser.close();
})();

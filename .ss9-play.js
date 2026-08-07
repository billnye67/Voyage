// Organic playthrough of lesson-ss9-needs-wants.html.
const { chromium } = require('playwright');
const path = require('path');
(async () => {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage({ viewport: { width: 1280, height: 800 } });
  const errs = [];
  page.on('pageerror', e => errs.push(String(e).slice(0, 200)));
  const fail = m => { console.log('FAIL: ' + m); process.exitCode = 1; };
  const expectText = async (t, m) => { if (!(await page.locator('body').innerText()).includes(t)) fail(m + ' — missing "' + t + '"'); };

  await page.goto('file:///' + path.join(process.cwd(), 'lesson-ss9-needs-wants.html').replace(/\\/g, '/'));
  await page.getByRole('button', { name: /Start lesson/i }).click();

  // beat 0: overspend first (all items = $82), run, get rejected
  for (const k of ['water','food','batt','socks','game','candy','slime','comic']) await page.evaluate(kk => toggleItem(kk), k);
  await page.getByRole('button', { name: /Run the weekend/ }).click();
  await expectText('cashier shakes her head', 'over-budget feedback');
  // wants-only run: drop needs, keep wants ($46) -> bad weekend
  for (const k of ['water','food','batt','socks','game']) await page.evaluate(kk => toggleItem(kk), k);
  await page.getByRole('button', { name: /Run the weekend/ }).click();
  await expectText('Rough weekend', 'wants-only feedback');
  await expectText('no drinking water', 'missing needs listed');
  // correct run: needs + candy ($46)
  for (const k of ['slime','comic','water','food','batt','socks']) await page.evaluate(kk => toggleItem(kk), k);
  await page.getByRole('button', { name: /Run the weekend/ }).click();
  await expectText('The weekend goes fine', 'winning run');
  await expectText('needs handled first', 'win extras note');
  await page.locator('#nx').click();

  // beat 1: sort with one wrong
  await page.evaluate(() => pickSort(0, 'want'));
  await expectText('actually harmed', 'sort wrong feedback');
  await page.evaluate(() => pickSort(0, 'need'));
  await page.evaluate(() => pickSort(1, 'need'));
  await page.evaluate(() => pickSort(2, 'want'));
  await expectText('The test never lies', 'sort complete');
  await page.locator('#nx').click();

  // beat 2: wrong then extra
  await page.getByRole('button', { name: /whole \$95 is a need/ }).click();
  await expectText('need test on the glow', 'upgrade wrong feedback');
  await page.getByRole('button', { name: /extra \$65 of glow/ }).click();
  await expectText('which dollars are doing which job', 'upgrade correct');
  await page.locator('#nx').click();

  // beat 3: wrong then trade
  await page.getByRole('button', { name: /Nothing — the ticket/ }).click();
  await expectText('Check your savings jar', 'trade wrong feedback');
  await page.getByRole('button', { name: /skateboard — it’s now weeks/ }).click();
  await expectText('hidden price', 'trade correct');
  await page.locator('#nx').click();

  // beat 4: Mia
  await page.getByRole('button', { name: /Check Mia/ }).click();
  await expectText('hijacked Mia’s order', 'Mia reveal');
  await page.locator('#nx').click();

  // quiz: 4/5 (deliberate wrong on Q5)
  for (let q = 0; q < 5; q++) {
    const correct = await page.evaluate(i => QUESTIONS[i].correct, q);
    if (q === 4) { await page.locator('#ch' + ((correct + 1) % 4)).click(); await expectText('Not quite', 'Q5 wrong feedback'); }
    else { await page.locator('#ch' + correct).click(); await expectText('Yes.', 'Q' + (q + 1) + ' correct'); }
    await page.locator('#nx').click();
  }
  await expectText('Lesson complete', 'done screen');
  await expectText('4 of 5', 'score');
  const store = await page.evaluate(() => JSON.parse(localStorage.getItem('voyage_g4ss_progress') || '{}'));
  if (!store.done || !store.done['SS.4.E.1']) fail('progress key missing SS.4.E.1');

  if (errs.length) fail('JS errors: ' + errs.join(' | '));
  console.log(process.exitCode ? 'PLAYTHROUGH HAD FAILURES' : 'PLAYTHROUGH PASS');
  await browser.close();
})();

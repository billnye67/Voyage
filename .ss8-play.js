// Organic playthrough of lesson-ss8-rights-responsibilities.html.
const { chromium } = require('playwright');
const path = require('path');
(async () => {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage({ viewport: { width: 1280, height: 800 } });
  const errs = [];
  page.on('pageerror', e => errs.push(String(e).slice(0, 200)));
  const fail = m => { console.log('FAIL: ' + m); process.exitCode = 1; };
  const expectText = async (t, m) => { if (!(await page.locator('body').innerText()).includes(t)) fail(m + ' — missing "' + t + '"'); };

  await page.goto('file:///' + path.join(process.cwd(), 'lesson-ss8-rights-responsibilities.html').replace(/\\/g, '/'));
  await page.getByRole('button', { name: /Start lesson/i }).click();

  // beat 0: three moments
  await page.locator('#mombtn').click();
  await expectText('reaches no one', 'moment 1');
  await page.locator('#mombtn').click();
  await expectText('Jordan', 'moment 2');
  await page.locator('#mombtn').click();
  await expectText('None of them work', 'moment 3');
  await expectText('both sides, or neither works', 'hook reveal');
  await page.locator('#nx').click();

  // beat 1: open all five rights
  for (let i = 0; i < 5; i++) { await page.locator('.rightcard').nth(i).click(); await page.waitForTimeout(70); }
  await expectText('Five freedoms, automatically yours', 'rights complete');
  await page.locator('#nx').click();

  // beat 2: pairs — wrong on pair 1 first
  await page.evaluate(() => pickPair(0, 'hands'));
  await expectText('why did your announcement fail', 'pair wrong feedback');
  await page.evaluate(() => pickPair(0, 'listen'));
  await page.evaluate(() => pickPair(1, 'hands'));
  await page.evaluate(() => pickPair(2, 'follow'));
  await expectText('rights stay standing', 'pairs complete');
  await page.locator('#nx').click();

  // beat 3: wrong then jury-fair
  await page.getByRole('button', { name: /work for free/ }).click();
  await expectText('not about the money', 'jury wrong feedback');
  await page.getByRole('button', { name: /judged by regular people/ }).click();
  await expectText('Judged by your equals', 'jury correct');
  await page.locator('#nx').click();

  // beat 4: Devon
  await page.getByRole('button', { name: /Test Devon/ }).click();
  await expectText('left out half the deal', 'Devon reveal');
  await page.locator('#nx').click();

  // quiz: 4/5 (deliberate wrong on Q2)
  for (let q = 0; q < 5; q++) {
    const correct = await page.evaluate(i => QUESTIONS[i].correct, q);
    if (q === 1) { await page.locator('#ch' + ((correct + 1) % 4)).click(); await expectText('Not quite', 'Q2 wrong feedback'); }
    else { await page.locator('#ch' + correct).click(); await expectText('Yes.', 'Q' + (q + 1) + ' correct'); }
    await page.locator('#nx').click();
  }
  await expectText('Lesson complete', 'done screen');
  await expectText('4 of 5', 'score');
  const store = await page.evaluate(() => JSON.parse(localStorage.getItem('voyage_g4ss_progress') || '{}'));
  if (!store.done || !store.done['SS.4.C.4']) fail('progress key missing SS.4.C.4');

  if (errs.length) fail('JS errors: ' + errs.join(' | '));
  console.log(process.exitCode ? 'PLAYTHROUGH HAD FAILURES' : 'PLAYTHROUGH PASS');
  await browser.close();
})();

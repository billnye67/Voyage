// Full organic playthrough of lesson-ss1-map-skills.html: does every
// interaction the intended way, wrong-answers Q2 on purpose to test feedback,
// then verifies score, done screen, and progress key.
const { chromium } = require('playwright');
const path = require('path');
(async () => {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage({ viewport: { width: 1280, height: 800 } });
  const errs = [];
  page.on('pageerror', e => errs.push(String(e).slice(0, 200)));
  const fail = m => { console.log('FAIL: ' + m); process.exitCode = 1; };
  const expectText = async (t, m) => { if (!(await page.locator('body').innerText()).includes(t)) fail(m + ' — missing "' + t + '"'); };

  await page.goto('file:///' + path.join(process.cwd(), 'lesson-ss1-map-skills.html').replace(/\\/g, '/'));
  await page.getByRole('button', { name: /Start lesson/i }).click();

  // beat 0: dig twice, second reveals the idea + unlocks Next
  await page.locator('[data-cell="A1"]').click();
  await expectText('sand', 'dig 1 feedback');
  await page.locator('[data-cell="E5"]').click();
  await expectText('You weren’t digging. You were guessing', 'dig reveal');
  await page.locator('#nx').click();

  // beat 1: wrong direction first, then N
  await page.getByRole('button', { name: 'South', exact: true }).click();
  await expectText('Check the rose', 'compass wrong-answer feedback');
  await page.getByRole('button', { name: 'North', exact: true }).click();
  await expectText('no matter which way the captain is facing', 'compass correct feedback');
  await page.locator('#nx').click();

  // beat 2: click all 5 legend rows
  for (let i = 0; i < 5; i++) { await page.locator('.leg-row').nth(i).click(); await page.waitForTimeout(120); }
  await expectText('Decoded', 'legend completion');
  await page.locator('#nx').click();

  // beat 3: wrong cell then D2
  await page.locator('[data-cell="B3"]').click();
  await expectText('That square is B3', 'grid wrong-cell feedback');
  await page.locator('[data-cell="D2"]').click();
  await expectText('D2 it is', 'grid correct');
  await page.locator('#nx').click();

  // beat 4: wrong miles then 3
  await page.getByRole('button', { name: '2 miles' }).click();
  await expectText('Count the hops', 'scale wrong feedback');
  await page.getByRole('button', { name: '3 miles' }).click();
  await expectText('You already stood on the answer', 'scale payoff');
  await page.locator('#nx').click();

  // beat 5: Mira
  await page.getByRole('button', { name: /Check Mira/ }).click();
  await expectText('trusted her face instead of the compass', 'Mira reveal');
  await page.locator('#nx').click();

  // quiz: correct on all but Q2 (deliberate wrong to test feedback) → 4/5 pass
  for (let q = 0; q < 5; q++) {
    const correct = await page.evaluate(i => QUESTIONS[i].correct, q);
    if (q === 1) {
      await page.locator('#ch' + ((correct + 1) % 4)).click();
      await expectText('Not quite', 'Q2 wrong feedback');
    } else {
      await page.locator('#ch' + correct).click();
      await expectText('Yes.', 'Q' + (q + 1) + ' correct feedback');
    }
    await page.locator('#nx').click();
  }

  await expectText('Lesson complete', 'done screen (passed)');
  await expectText('4 of 5', 'score display');
  const store = await page.evaluate(() => localStorage.getItem('voyage_g4ss_progress'));
  if (!store || !JSON.parse(store).done['SS.4.G.1']) fail('progress key not written: ' + store);

  // review button flow: restart via Again, reach quiz, hit Review
  await page.getByRole('button', { name: /Again/ }).click();
  const atStart = await page.evaluate(() => step === 0 && maxStep === 0);
  if (!atStart) fail('Again did not reset');

  if (errs.length) fail('JS errors: ' + errs.join(' | '));
  console.log(process.exitCode ? 'PLAYTHROUGH HAD FAILURES' : 'PLAYTHROUGH PASS — 4/5 path, all interactions, progress key ok');
  await browser.close();
})();

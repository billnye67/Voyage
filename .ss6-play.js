// Organic playthrough of lesson-ss6-democracy.html.
const { chromium } = require('playwright');
const path = require('path');
(async () => {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage({ viewport: { width: 1280, height: 800 } });
  const errs = [];
  page.on('pageerror', e => errs.push(String(e).slice(0, 200)));
  const fail = m => { console.log('FAIL: ' + m); process.exitCode = 1; };
  const expectText = async (t, m) => { if (!(await page.locator('body').innerText()).includes(t)) fail(m + ' — missing "' + t + '"'); };

  await page.goto('file:///' + path.join(process.cwd(), 'lesson-ss6-democracy.html').replace(/\\/g, '/'));
  await page.getByRole('button', { name: /Start lesson/i }).click();

  // beat 0: try all three deciders
  await page.evaluate(() => tryDecider('loud'));
  await expectText('nobody remembers agreeing to let Deacon choose', 'loud outcome');
  await page.evaluate(() => tryDecider('fave'));
  await expectText('Never asked', 'fave outcome');
  await page.evaluate(() => tryDecider('vote'));
  await expectText('Extra recess wins, 14 of 24', 'vote outcome');
  await expectText('That system has a name', 'hook idea');
  await page.locator('#nx').click();

  // beat 1: 12 wrong, 24 wrong, 13 right
  await page.getByRole('button', { name: '12 votes' }).click();
  await expectText('12 is exactly half', 'majority 12 feedback');
  await page.getByRole('button', { name: '24 votes' }).click();
  await expectText('everyone agrees', 'majority 24 feedback');
  await page.getByRole('button', { name: '13 votes' }).click();
  await expectText('first number that clears the bar', 'majority correct');
  await page.locator('#nx').click();

  // beat 2: all-vote wrong then reps
  await page.getByRole('button', { name: /all 50,000 vote/ }).click();
  await expectText('collapses by lunch', 'rep wrong feedback');
  await page.getByRole('button', { name: /Elect a few people/ }).click();
  await expectText('representative democracy', 'rep correct');
  await page.locator('#nx').click();

  // beat 3: block wrong then campaign
  await page.getByRole('button', { name: /Block the door/ }).click();
  await expectText('punishes everyone for voting', 'lose wrong feedback');
  await page.getByRole('button', { name: /convincing classmates/ }).click();
  await expectText('never your voice', 'lose correct');
  await page.locator('#nx').click();

  // beat 4: Jae
  await page.getByRole('button', { name: /what “fair” actually measures/ }).click();
  await expectText('measured fairness by the result', 'Jae reveal');
  await page.locator('#nx').click();

  // quiz: 4/5 (deliberate wrong on Q3)
  for (let q = 0; q < 5; q++) {
    const correct = await page.evaluate(i => QUESTIONS[i].correct, q);
    if (q === 2) { await page.locator('#ch' + ((correct + 1) % 4)).click(); await expectText('Not quite', 'Q3 wrong feedback'); }
    else { await page.locator('#ch' + correct).click(); await expectText('Yes.', 'Q' + (q + 1) + ' correct'); }
    await page.locator('#nx').click();
  }
  await expectText('Lesson complete', 'done screen');
  await expectText('4 of 5', 'score');
  const store = await page.evaluate(() => JSON.parse(localStorage.getItem('voyage_g4ss_progress') || '{}'));
  if (!store.done || !store.done['SS.4.C.2']) fail('progress key missing SS.4.C.2');

  if (errs.length) fail('JS errors: ' + errs.join(' | '));
  console.log(process.exitCode ? 'PLAYTHROUGH HAD FAILURES' : 'PLAYTHROUGH PASS');
  await browser.close();
})();

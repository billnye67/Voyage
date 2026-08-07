// Organic playthrough of lesson-ss7-three-branches.html.
const { chromium } = require('playwright');
const path = require('path');
(async () => {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage({ viewport: { width: 1280, height: 800 } });
  const errs = [];
  page.on('pageerror', e => errs.push(String(e).slice(0, 200)));
  const fail = m => { console.log('FAIL: ' + m); process.exitCode = 1; };
  const expectText = async (t, m) => { if (!(await page.locator('body').innerText()).includes(t)) fail(m + ' — missing "' + t + '"'); };

  await page.goto('file:///' + path.join(process.cwd(), 'lesson-ss7-three-branches.html').replace(/\\/g, '/'));
  await page.getByRole('button', { name: /Start lesson/i }).click();

  // beat 0: click through the three Marcus moments
  await page.locator('#mombtn').click();
  await expectText('red team gets four outs', 'moment 1');
  await page.locator('#mombtn').click();
  await expectText('Rule-breaker', 'moment 2');
  await page.locator('#mombtn').click();
  await expectText('I find myself correct', 'moment 3');
  await expectText('places to turn', 'hook reveal');
  await page.locator('#nx').click();

  // beat 1: open all three branches
  for (let i = 0; i < 3; i++) { await page.locator('.branch').nth(i).click(); await page.waitForTimeout(80); }
  await expectText('Nobody referees their own kickball call', 'branches complete');
  await page.locator('#nx').click();

  // beat 2: sort — wrong on moment 2 first
  await page.evaluate(() => pickSort(0, 'leg'));
  await page.evaluate(() => pickSort(1, 'jud'));
  await expectText('put into ACTION', 'sort wrong feedback');
  await page.evaluate(() => pickSort(1, 'exe'));
  await page.evaluate(() => pickSort(2, 'jud'));
  await expectText('three-branch life', 'sort complete');
  await page.locator('#nx').click();

  // beat 3: wrong twice then veto
  await page.getByRole('button', { name: /Secretly delete/ }).click();
  await expectText('Marcus behavior', 'check wrong 1');
  await page.getByRole('button', { name: /Fire everyone/ }).click();
  await expectText('impeachment', 'check wrong 2');
  await page.getByRole('button', { name: /Veto it/ }).click();
  await expectText('polite tug-of-war', 'check correct');
  await page.locator('#nx').click();

  // beat 4: Nora
  await page.getByRole('button', { name: /Check Nora/ }).click();
  await expectText('described a king', 'Nora reveal');
  await page.locator('#nx').click();

  // quiz: 4/5 (deliberate wrong on Q4)
  for (let q = 0; q < 5; q++) {
    const correct = await page.evaluate(i => QUESTIONS[i].correct, q);
    if (q === 3) { await page.locator('#ch' + ((correct + 1) % 4)).click(); await expectText('Not quite', 'Q4 wrong feedback'); }
    else { await page.locator('#ch' + correct).click(); await expectText('Yes.', 'Q' + (q + 1) + ' correct'); }
    await page.locator('#nx').click();
  }
  await expectText('Lesson complete', 'done screen');
  await expectText('4 of 5', 'score');
  const store = await page.evaluate(() => JSON.parse(localStorage.getItem('voyage_g4ss_progress') || '{}'));
  if (!store.done || !store.done['SS.4.C.3']) fail('progress key missing SS.4.C.3');

  if (errs.length) fail('JS errors: ' + errs.join(' | '));
  console.log(process.exitCode ? 'PLAYTHROUGH HAD FAILURES' : 'PLAYTHROUGH PASS');
  await browser.close();
})();

// Organic playthrough of lesson-ss5-rules-laws.html.
const { chromium } = require('playwright');
const path = require('path');
(async () => {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage({ viewport: { width: 1280, height: 800 } });
  const errs = [];
  page.on('pageerror', e => errs.push(String(e).slice(0, 200)));
  const fail = m => { console.log('FAIL: ' + m); process.exitCode = 1; };
  const expectText = async (t, m) => { if (!(await page.locator('body').innerText()).includes(t)) fail(m + ' — missing "' + t + '"'); };

  await page.goto('file:///' + path.join(process.cwd(), 'lesson-ss5-rules-laws.html').replace(/\\/g, '/'));
  await page.getByRole('button', { name: /Start lesson/i }).click();

  // beat 0: roll 3 rounds of the rigged game
  await page.getByRole('button', { name: /Roll/ }).click();
  await expectText('house rule', 'remy rule 1');
  await page.getByRole('button', { name: /Roll/ }).click();
  await expectText('speed bonus', 'remy rule 2');
  await page.getByRole('button', { name: /Roll/ }).click();
  await expectText('You never had a chance', 'game reveal');
  await page.locator('#nx').click();

  // beat 1: sort 3 rules, wrong on rule 3 first
  await page.evaluate(() => pickJob(0, 'fair'));
  await page.evaluate(() => pickJob(1, 'safe'));
  await page.evaluate(() => pickJob(2, 'fair'));
  await expectText('Left side or right side', 'job wrong feedback');
  await page.evaluate(() => pickJob(2, 'pred'));
  await expectText('find its job', 'jobs complete');
  await page.locator('#nx').click();

  // beat 2: dinner wrong then seatbelt
  await page.getByRole('button', { name: /No phones/ }).click();
  await expectText('Run the checklist', 'law wrong feedback');
  await page.getByRole('button', { name: /seatbelt/ }).click();
  await expectText('leveled all the way up', 'law correct');
  await page.locator('#nx').click();

  // beat 3: wrong then ignore
  await page.getByRole('button', { name: /obeys it anyway/ }).click();
  await expectText('Some would — for a while', 'cons wrong feedback');
  await page.getByRole('button', { name: /start ignoring/ }).click();
  await expectText('promise-keeper', 'cons correct');
  await page.locator('#nx').click();

  // beat 4: Zoe
  await page.getByRole('button', { name: /zero-law town/ }).click();
  await expectText('confused laws with bossiness', 'Zoe reveal');
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
  if (!store.done || !store.done['SS.4.C.1']) fail('progress key missing SS.4.C.1');

  if (errs.length) fail('JS errors: ' + errs.join(' | '));
  console.log(process.exitCode ? 'PLAYTHROUGH HAD FAILURES' : 'PLAYTHROUGH PASS');
  await browser.close();
})();

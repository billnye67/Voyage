// Organic playthrough of lesson-ss14-symbols-landmarks.html.
const { chromium } = require('playwright');
const path = require('path');
(async () => {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage({ viewport: { width: 1280, height: 800 } });
  const errs = [];
  page.on('pageerror', e => errs.push(String(e).slice(0, 200)));
  const fail = m => { console.log('FAIL: ' + m); process.exitCode = 1; };
  const expectText = async (t, m) => { if (!(await page.locator('body').innerText()).includes(t)) fail(m + ' — missing "' + t + '"'); };

  await page.goto('file:///' + path.join(process.cwd(), 'lesson-ss14-symbols-landmarks.html').replace(/\\/g, '/'));
  await page.getByRole('button', { name: /Start lesson/i }).click();

  // beat 0: decode stars (wrong then right), then stripes (wrong then right)
  await page.evaluate(() => decodeStars());
  await page.getByRole('button', { name: /year of history/ }).click();
  await expectText('older than 50 years', 'stars wrong feedback');
  await page.getByRole('button', { name: /One star per state/ }).click();
  await expectText('Hawaii joined in 1959', 'stars correct');
  await page.evaluate(() => decodeStripes());
  await page.getByRole('button', { name: /first 13 presidents/ }).click();
  await expectText('very FIRST flag', 'stripes wrong feedback');
  await page.getByRole('button', { name: /13 original colonies/ }).click();
  await expectText('baby picture', 'stripes correct');
  await expectText('pack a big story into a small picture', 'hook idea');
  await page.locator('#nx').click();

  // beat 1: match symbols with one wrong
  await page.evaluate(() => pickSym(0, 'love'));
  await page.evaluate(() => pickSym(1, 'love'));
  await expectText('warning', 'sym wrong feedback');
  await page.evaluate(() => pickSym(1, 'danger'));
  await page.evaluate(() => pickSym(2, 'america'));
  await expectText('how fast you read them', 'syms complete');
  await page.locator('#nx').click();

  // beat 2: open all five famous symbols
  for (let i = 0; i < 5; i++) { await page.locator('.symcard').nth(i).click(); await page.waitForTimeout(70); }
  await expectText('one mountain', 'famous five complete');
  await page.locator('#nx').click();

  // beat 3: wrong then stands-for
  await page.getByRole('button', { name: /look nice on TV/ }).click();
  await expectText('nothing’s on screen', 'land wrong feedback');
  await page.getByRole('button', { name: /stands for what happens inside/ }).click();
  await expectText('The dome IS the message', 'land correct');
  await page.locator('#nx').click();

  // beat 4: Jade
  await page.getByRole('button', { name: /Check Jade/ }).click();
  await expectText('invented meanings that sounded right', 'Jade reveal');
  await page.locator('#nx').click();

  // quiz: 4/5 (deliberate wrong on Q3)
  for (let q = 0; q < 5; q++) {
    const correct = await page.evaluate(i => QUESTIONS[i].correct, q);
    if (q === 2) { await page.locator('#ch' + ((correct + 1) % 4)).click(); await expectText('Not quite', 'Q3 wrong feedback'); }
    else { await page.locator('#ch' + correct).click(); await expectText('Yes.', 'Q' + (q + 1) + ' correct'); }
    await page.locator('#nx').click();
  }
  await expectText('Course complete', 'done screen');
  await expectText('4 of 5', 'score');
  const store = await page.evaluate(() => JSON.parse(localStorage.getItem('voyage_g4ss_progress') || '{}'));
  if (!store.done || !store.done['SS.4.H.3']) fail('progress key missing SS.4.H.3');

  if (errs.length) fail('JS errors: ' + errs.join(' | '));
  console.log(process.exitCode ? 'PLAYTHROUGH HAD FAILURES' : 'PLAYTHROUGH PASS');
  await browser.close();
})();

// Organic playthrough of lesson-ss13-communities-change.html.
const { chromium } = require('playwright');
const path = require('path');
(async () => {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage({ viewport: { width: 1280, height: 800 } });
  const errs = [];
  page.on('pageerror', e => errs.push(String(e).slice(0, 200)));
  const fail = m => { console.log('FAIL: ' + m); process.exitCode = 1; };
  const expectText = async (t, m) => { if (!(await page.locator('body').innerText()).includes(t)) fail(m + ' — missing "' + t + '"'); };

  await page.goto('file:///' + path.join(process.cwd(), 'lesson-ss13-communities-change.html').replace(/\\/g, '/'));
  await page.getByRole('button', { name: /Start lesson/i }).click();

  // beat 0: wrong first placement, then correct order b, a, c
  await page.evaluate(() => placePhoto('c'));
  await expectText('Horses came before cars', 'photo wrong feedback');
  await page.evaluate(() => placePhoto('b'));
  await page.evaluate(() => placePhoto('a'));
  await page.evaluate(() => placePhoto('c'));
  await expectText('a clock hiding in plain sight', 'photos ordered');
  await expectText('the oak tree', 'continuity teaser');
  await page.locator('#nx').click();

  // beat 1: wrong then travel
  await page.getByRole('button', { name: /work & shop/ }).click();
  await expectText('getting around', 'cat wrong feedback');
  await page.getByRole('button', { name: /How people travel/ }).click();
  await expectText('drag everything else along', 'cat correct');
  await page.locator('#nx').click();

  // beat 2: wrong then dries up
  await page.getByRole('button', { name: /booms/ }).click();
  await expectText('Follow the customers', 'why wrong feedback');
  await page.getByRole('button', { name: /dries up/ }).click();
  await expectText('emptied hundreds of American main streets', 'why correct');
  await page.locator('#nx').click();

  // beat 3: timeline — wrong first, then in order
  await page.evaluate(() => placeTl('hwy'));
  await expectText('earliest year', 'timeline wrong feedback');
  await page.evaluate(() => placeTl('store'));
  await page.evaluate(() => placeTl('rail'));
  await page.evaluate(() => placeTl('hwy'));
  await page.evaluate(() => placeTl('apt'));
  await expectText('chain of causes', 'timeline complete');
  await page.locator('#nx').click();

  // beat 4: Milo
  await page.getByRole('button', { name: /Walk Milo/ }).click();
  await expectText('snapshot for the whole album', 'Milo reveal');
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
  if (!store.done || !store.done['SS.4.H.2']) fail('progress key missing SS.4.H.2');

  if (errs.length) fail('JS errors: ' + errs.join(' | '));
  console.log(process.exitCode ? 'PLAYTHROUGH HAD FAILURES' : 'PLAYTHROUGH PASS');
  await browser.close();
})();

// Organic playthrough of lesson-ss10-goods-services.html.
const { chromium } = require('playwright');
const path = require('path');
(async () => {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage({ viewport: { width: 1280, height: 800 } });
  const errs = [];
  page.on('pageerror', e => errs.push(String(e).slice(0, 200)));
  const fail = m => { console.log('FAIL: ' + m); process.exitCode = 1; };
  const expectText = async (t, m) => { if (!(await page.locator('body').innerText()).includes(t)) fail(m + ' — missing "' + t + '"'); };

  await page.goto('file:///' + path.join(process.cwd(), 'lesson-ss10-goods-services.html').replace(/\\/g, '/'));
  await page.getByRole('button', { name: /Start lesson/i }).click();

  // beat 0: sort 6 shops, wrong on the barber first
  await page.evaluate(() => pickShop(0, 'good'));
  await page.evaluate(() => pickShop(1, 'good'));
  await expectText('You paid for someone’s WORK', 'shop wrong feedback');
  await page.evaluate(() => pickShop(1, 'service'));
  await page.evaluate(() => pickShop(2, 'good'));
  await page.evaluate(() => pickShop(3, 'service'));
  await page.evaluate(() => pickShop(4, 'good'));
  await page.evaluate(() => pickShop(5, 'service'));
  await expectText('no exceptions', 'shops complete');
  await page.locator('#nx').click();

  // beat 1: pizza wrong then both
  await page.getByRole('button', { name: /Just a good/ }).click();
  await expectText('who cooked it', 'bundle wrong feedback');
  await page.getByRole('button', { name: /Both — a good/ }).click();
  await expectText('buying the work too', 'bundle correct');
  await page.locator('#nx').click();

  // beat 2: roles with one wrong
  await page.evaluate(() => pickRole(0, 'producer'));
  await page.evaluate(() => pickRole(1, 'consumer'));
  await page.evaluate(() => pickRole(2, 'consumer'));
  await expectText('Providing a service counts', 'role wrong feedback');
  await page.evaluate(() => pickRole(2, 'producer'));
  await expectText('four words that describe', 'roles complete');
  await page.locator('#nx').click();

  // beat 3: producer wrong then consumer
  await page.getByRole('button', { name: /Still a producer/ }).click();
  await expectText('not baking', 'both wrong feedback');
  await page.getByRole('button', { name: /Consumer — buying a service/ }).click();
  await expectText('Roles aren’t name tags', 'both correct');
  await page.locator('#nx').click();

  // beat 4: Theo
  await page.getByRole('button', { name: /Check Theo/ }).click();
  await expectText('forgot half of what money buys', 'Theo reveal');
  await page.locator('#nx').click();

  // quiz: 4/5 (deliberate wrong on Q1)
  for (let q = 0; q < 5; q++) {
    const correct = await page.evaluate(i => QUESTIONS[i].correct, q);
    if (q === 0) { await page.locator('#ch' + ((correct + 1) % 4)).click(); await expectText('Not quite', 'Q1 wrong feedback'); }
    else { await page.locator('#ch' + correct).click(); await expectText('Yes.', 'Q' + (q + 1) + ' correct'); }
    await page.locator('#nx').click();
  }
  await expectText('Lesson complete', 'done screen');
  await expectText('4 of 5', 'score');
  const store = await page.evaluate(() => JSON.parse(localStorage.getItem('voyage_g4ss_progress') || '{}'));
  if (!store.done || !store.done['SS.4.E.2']) fail('progress key missing SS.4.E.2');

  if (errs.length) fail('JS errors: ' + errs.join(' | '));
  console.log(process.exitCode ? 'PLAYTHROUGH HAD FAILURES' : 'PLAYTHROUGH PASS');
  await browser.close();
})();

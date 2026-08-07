// Organic playthrough of lesson-ss11-money-trade.html.
const { chromium } = require('playwright');
const path = require('path');
(async () => {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage({ viewport: { width: 1280, height: 800 } });
  const errs = [];
  page.on('pageerror', e => errs.push(String(e).slice(0, 200)));
  const fail = m => { console.log('FAIL: ' + m); process.exitCode = 1; };
  const expectText = async (t, m) => { if (!(await page.locator('body').innerText()).includes(t)) fail(m + ' — missing "' + t + '"'); };

  await page.goto('file:///' + path.join(process.cwd(), 'lesson-ss11-money-trade.html').replace(/\\/g, '/'));
  await page.getByRole('button', { name: /Start lesson/i }).click();

  // beat 0: the trade chain
  await page.getByRole('button', { name: /Offer your sandwich/ }).click();
  await expectText('I want an apple', 'Deacon appears');
  await page.getByRole('button', { name: /sandwich for the apple/ }).click();
  await expectText('Sandwich acquired', 'Rosa trade');
  await page.getByRole('button', { name: /apple for the comic/ }).click();
  await expectText('Comic’s yours', 'Deacon trade');
  await page.getByRole('button', { name: /comic for the markers/ }).click();
  await expectText('after THREE trades', 'chain complete');
  await expectText('barter', 'hook names barter');
  await page.locator('#nx').click();

  // beat 1: wrong half then right
  await page.getByRole('button', { name: /didn’t have markers/ }).click();
  await expectText('Priya definitely had the markers', 'barter wrong feedback');
  await page.getByRole('button', { name: /didn’t want what you had/ }).click();
  await expectText('three-trade scavenger hunt', 'barter correct');
  await page.locator('#nx').click();

  // beat 2: two wrongs then right
  await page.getByRole('button', { name: /pretty/ }).click();
  await expectText('Looks have nothing', 'money wrong 1');
  await page.getByRole('button', { name: /illegal/ }).click();
  await expectText('perfectly legal', 'money wrong 2');
  await page.getByRole('button', { name: /everyone accepts it/ }).click();
  await expectText('guaranteed before you even ask', 'money correct');
  await page.locator('#nx').click();

  // beat 3: wrong then up
  await page.getByRole('button', { name: /snow makes everything cheaper/ }).click();
  await expectText('Run the two dials', 'price wrong feedback');
  await page.getByRole('button', { name: /It climbs/ }).click();
  await expectText('what’s scarce shouts', 'price correct');
  await page.locator('#nx').click();

  // beat 4: Ava
  await page.getByRole('button', { name: /Test Ava/ }).click();
  await expectText('treated dollars like sandwiches', 'Ava reveal');
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
  if (!store.done || !store.done['SS.4.E.3']) fail('progress key missing SS.4.E.3');

  if (errs.length) fail('JS errors: ' + errs.join(' | '));
  console.log(process.exitCode ? 'PLAYTHROUGH HAD FAILURES' : 'PLAYTHROUGH PASS');
  await browser.close();
})();

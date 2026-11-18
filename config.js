/* The Bond Desk: FINAN III week 4 (bonds). Config for the shared desk engine (desk-engine.js in this folder, copied from the
   FINAN IV no-identifier engine, 2026-11-16: random desk code, no name or email; receipt and verify.html check from the code).
   Built 2026-11-17 to COURSE-SPEC.md "Week 4" (eleven steps, in the spec's order) and w04/TEACHING-MAP.md (the lesson of each
   step in one sentence; tests/core_test.js asserts the desk shows each one). Model: FINAN IV u09/desk/config.js.
   - The page "IOUs You Can Sell" teaches what a bond is and the seesaw in words. This desk teaches every number: quotes,
     duration, spreads, percent change. Each calculation: problem first, worked example in the same table, then own numbers.
   - Step 3 is a yield slider over two real bond prices (annual coupons, bondPrice below). The same function prices the slider,
     the answer key and the tests, so the screen and the judge cannot disagree.
   - No new fictional names: Great Lakes Community Bank and Dragovia are the course's fixed fictions (COURSE-SPEC rule 16), so no
     case_reuse sweep was needed. Real cases: Puerto Rico 2017, Silicon Valley Bank (w04/sources/FACTS.md).
   Version 1, seedVersion 1. */
(function (root) {
  'use strict';

  // ---------------- bond math (also used by the slider and the tests) ----------------
  // Price of a bond with face value $1,000, coupon rate c, n years to maturity, at yield y (annual coupons).
  function bondPrice(c, n, y) { const F = 1000, C = c * F; if (Math.abs(y) < 1e-12) return C * n + F; const v = Math.pow(1 + y, -n); return C * (1 - v) / y + F * v; }
  const SLIDER = { coupon: 0.04, short: 2, long: 30, min: 1, max: 9, step: 0.25, start: 4 };

  const QUIZ = [
    { title: 'Back to 2022',
      q: 'Your Fed Brief packet showed the 2-year Treasury rate going from 0.78% to 4.41% during 2022, and the 10-year from 1.63% to 3.88%. Which rose more, and what shape did that leave the yield curve in at the end of the year?',
      options: ['The 2-year rose more, and the curve ended the year inverted, with the 2-year rate above the 10-year',
        'The 10-year rose more, and the curve ended the year normal', 'Both rose by the same amount, so the curve stayed flat',
        'The 2-year rose more, and the curve ended the year normal'],
      answer: 0,
      why: ['Right. The 2-year rose 363 basis points and the 10-year 225, so by December the 2-year paid 53 basis points more than the 10-year: an inverted curve.',
        'The 10-year rose 225 basis points (1.63% to 3.88%); the 2-year rose 363 (0.78% to 4.41%).',
        'The 2-year rose 363 basis points and the 10-year 225. The bigger rise in the 2-year turned the curve upside down.',
        'The 2-year did rise more, and it ended above the 10-year (4.41% against 3.88%). A curve with the 2-year on top is inverted.'] },
    { title: 'Old bond, new rates',
      q: 'Your bank owns a $1,000 bond that pays 3% a year. Rates on new bonds rise to 5%. What happens to the price of the bond your bank owns?',
      options: ['It falls, because nobody pays $1,000 for $30 a year when a new bond pays $50', 'It rises, because rates went up',
        'It stays at $1,000, because its coupon is fixed', 'It stays at $1,000 until the bond matures'],
      answer: 0,
      why: ['Right. The coupon is fixed, so the price has to fall until a buyer earns about 5% on the old bond too.',
        'Higher rates on new bonds make the old bond less attractive, so its price falls.',
        'The coupon is fixed, but the price is not. A buyer compares $30 a year with the $50 a new bond pays.',
        'Your bank gets $1,000 back at maturity, but the bond is worth less today. If the bank sells it now, it sells for less.'] },
    { title: 'Which loses most?',
      q: 'Rates rise 1 point. Which bond’s price falls the most?',
      options: ['A 30-year bond with duration 17', 'A 10-year bond with duration 8', 'A 2-year bond with duration 2', 'All three fall the same, because rates rose by the same amount'],
      answer: 0,
      why: ['Right. Duration 17 means about 17% off the price, against about 8% and 2% for the others. That is the 30-year bond you watched on the slider.',
        'Duration 8 loses about 8%. A bond with duration 17 loses about 17%.',
        'Duration 2 loses the least, about 2%. Short bonds are repaid soon, so a rate change touches only a few coupons.',
        'The same rise in rates moves prices by different amounts. A bond loses about its duration in percent: 17%, 8% or 2%.'] },
    { title: 'Dragovia',
      q: 'Dragovia, a small country, has sold bonds with a fixed coupon. A journalist reports that its president has been embezzling tax money, and lenders now fear they will not be repaid. A bond’s yield is the yearly return a buyer earns at the price paid. What happens to Dragovia’s bonds?',
      options: ['Their price falls and their yield rises', 'Their price falls and their yield falls', 'Nothing changes, because the coupon is fixed', 'Their price rises, because Dragovia must now pay more'],
      answer: 0,
      why: ['Right. Buyers will only take on the risk at a discount. Paying less for the same coupons means each dollar paid earns more, so the yield rises.',
        'The price does fall. A lower price for the same coupons means each dollar a buyer pays earns more, so the yield rises.',
        'The coupon is fixed, but the price is not. Buyers who fear they will not be repaid will only buy at a discount.',
        'The bonds already sold keep the same coupon. Fear of not being repaid makes buyers pay less, not more.'] },
  ];

  const STEPS = [
    { id: 'q1', label: 'Back to 2022', kind: 'check', quiz: 0 },
    { id: 'quote', label: 'Read a quote', kind: 'task' },
    { id: 'seesaw', label: 'The seesaw', kind: 'task' },
    { id: 'q2', label: 'Old bond, new rates', kind: 'check', quiz: 1 },
    { id: 'dur1', label: 'Duration', kind: 'task' },
    { id: 'q3', label: 'Which loses most?', kind: 'check', quiz: 2 },
    { id: 'spread', label: 'Spread over Treasuries', kind: 'task' },
    { id: 'q4', label: 'Dragovia', kind: 'check', quiz: 3 },
    { id: 'pr', label: 'One sentence', kind: 'task' },
    { id: 'bridge', label: 'A bank’s big bet', kind: 'task' },
    { id: 'note', label: 'Your note', kind: 'note' },
  ];

  // ---------------- seeded numbers ----------------
  // Round numbers (rule 20). No answer may equal its worked example's answer.
  const QUOTES = [91.25, 92.5, 93.75, 94.5, 95.25, 96.5, 97.75, 99.5, 101.25, 102.5, 103.75, 104.5, 106.25];
  const TARGETS = [5, 5.5, 6, 6.5, 7, 7.5];
  function buildTasks(rng, h) {
    const T = [];
    // quote: a percent of the $1,000 face value. Example 98.25.
    { const q = h.pick(rng, QUOTES); T.push({ id: 'quote', q, answer: q * 10 }); }
    // seesaw: a target yield above the 4% coupon; the student reads the 30-year price off the slider.
    { const y = h.pick(rng, TARGETS) / 100; const p30 = Math.round(bondPrice(SLIDER.coupon, SLIDER.long, y)), p2 = Math.round(bondPrice(SLIDER.coupon, SLIDER.short, y));
      T.push({ id: 'seesaw', y, p30, p2, answer: p30, decision: 'long' }); }
    // dur1 (faded): duration × rise in points = percent fall; × amount = dollars. Example: 7 × 0.5 on $10,000.
    { let D, dy; do { D = h.pick(rng, [3, 4, 5, 6, 8, 9, 10]); dy = h.pick(rng, [0.5, 1, 1.5, 2]); } while (D * dy < 1.5 || D * dy > 16 || D * dy === 3.5);
      const A = h.pick(rng, [1, 2, 4, 5, 8]) * 1e6;
      T.push({ id: 'dur1', D, dy, A, pct: D * dy / 100, answer: A * D * dy / 100 }); }
    // spread: corporate yield − Treasury yield, in points, then basis points. Example: 6.10% − 4.35% = 175.
    { const tsy = h.pick(rng, [3.8, 3.95, 4.1, 4.2, 4.45, 4.6]), bps = h.pick(rng, [80, 95, 120, 140, 160, 210, 240, 290, 330]);
      const corp = Math.round((tsy + bps / 100) * 100) / 100;
      T.push({ id: 'spread', tsy, corp, pts: bps / 100, bps, answer: bps }); }
    // pr: real numbers, the same for everyone (Puerto Rico's 2035 bond, October 3 to 4, 2017).
    T.push({ id: 'pr', p0: 44, p1: 30, cents: 14, answer: 14 / 44, decision: 'recover' });
    // bridge (own numbers): a bank's bonds, in billions. Example: $4 billion, duration 5, up 2 points.
    { let A, D, dy; do { A = h.pick(rng, [5, 6, 8, 10, 12, 15, 20]); D = h.pick(rng, [5, 6, 7]); dy = h.pick(rng, [2, 3]); } while (A === 4);
      T.push({ id: 'bridge', A, D, dy, pct: D * dy / 100, answer: Math.round(A * D * dy) / 100 }); }
    return T;
  }

  // ---------------- formatting and input parsing ----------------
  const H = () => root.DeskEngine.h;
  const fix = (x, dp) => String(+Number(x).toFixed(dp == null ? 2 : dp));
  const pc = (x) => fix(x * 100, 2) + '%';
  const p2d = (x) => Number(x).toFixed(2) + '%';      // a yield or a quote printed with two decimals, like 4.35%
  const mm = (x) => (Math.abs(x - Math.round(x)) < 1e-9 ? H().money(x) : H().money(x, 2));
  const SHOW = {
    pct: pc, money: mm, text: (v) => String(v),
    pts: (v) => fix(v) + ' points', bps: (v) => fix(v, 0) + ' basis points', cents: (v) => fix(v) + ' cents', bil: (v) => '$' + fix(v) + ' billion',
  };
  // A percent typed as 7.5%, 7.5 or 0.075 all mean 7.5%. Every percent answer on this desk is at least 1.5%.
  const pctIn = (h, s) => { const v = h.parseMoney(s); if (!isFinite(v)) return v; return (!/%/.test(String(s)) && Math.abs(v) >= 1) ? v / 100 : v; };
  const strip = (s, re) => String(s == null ? '' : s).replace(re, '').trim();
  const PARSE = {
    pct: pctIn,
    money: (h, s) => h.parseMoney(s),
    pts: (h, s) => h.parseMoney(strip(s, /\s*(%|percentage points?|points?|pts?)\s*$/i)),
    bps: (h, s) => h.parseMoney(strip(s, /\s*(basis points?|bps?)\s*$/i)),
    cents: (h, s) => h.parseMoney(strip(s, /\s*(cents?|¢|c)\s*$/i)),
    bil: (h, s) => { const v = h.parseMoney(strip(s, /\s*(billions?|bn|b)\s*$/i)); return isFinite(v) && Math.abs(v) >= 1e5 ? v / 1e9 : v; },
  };
  const TOL = { pct: () => 0.0006, money: (v) => Math.max(2, 0.003 * Math.abs(v)), pts: () => 0.006, bps: () => 0.6, cents: () => 0.06, bil: (v) => Math.max(0.006, 0.003 * Math.abs(v)) };
  const PLACEHOLDER_FMT = { pct: 'pct', money: 'money', pts: 'num', bps: 'num', cents: 'num', bil: 'num' };
  const UNREADABLE = { pct: 'Type a percentage, like 7.5%.', money: 'Type a dollar amount, like 150,000.', pts: 'Type the number of percentage points, like 1.25.',
    bps: 'Type a whole number of basis points, like 125.', cents: 'Type the number of cents, like 20.', bil: 'Type the loss in billions of dollars, like 1.2.' };

  // One function per task draws both the worked example and the student's table, so the two always match (rule 29).
  // A line: { label, calc, num (the right value), kind, input }.
  const LINES = {
    quote: (q) => [
      { label: 'Quote', calc: 'a percent of the $1,000 face value', num: p2d(q).replace('%', ''), kind: 'text' },
      { label: 'Price of one bond', calc: `${p2d(q)} × $1,000`, num: q * 10, kind: 'money', input: true }],
    dur: (D, dy, A, faded) => [
      { label: 'Price falls by', calc: faded ? `${D} × ${fix(dy)} ${dy === 1 ? "point" : "points"}` : 'duration × rise in rates', num: D * dy / 100, kind: 'pct', input: true },
      { label: 'Dollars lost', calc: faded ? `price fall × ${mm(A)}` : 'price fall × amount held', num: A * D * dy / 100, kind: 'money', input: true }],
    bridge: (A, D, dy) => [
      { label: 'Price falls by', calc: 'duration × rise in rates', num: D * dy / 100, kind: 'pct', input: true },
      { label: 'Loss, in billions of dollars', calc: 'price fall × amount held', num: Math.round(A * D * dy) / 100, kind: 'bil', input: true }],
    spread: (corp, tsy, pts) => [
      { label: 'Spread in percentage points', calc: `${p2d(corp)} − ${p2d(tsy)}`, num: pts, kind: 'pts', input: true },
      { label: 'Spread in basis points', calc: 'spread in points × 100', num: Math.round(pts * 100), kind: 'bps', input: true }],
    pct: (p0, p1) => [
      { label: 'Fall, in cents on the dollar', calc: `${p0} − ${p1}`, num: p0 - p1, kind: 'cents', input: true },
      { label: 'Percent fall', calc: 'fall ÷ starting price', num: (p0 - p1) / p0, kind: 'pct', input: true, tol: 0.006 }],
  };
  // The engine's ladder() draws text as given; filled lines and given lines show their value, input lines show a box.
  const toLadder = (lines, filled) => lines.map((l) => ((filled || !l.input)
    ? { label: l.label, calc: l.calc, value: l.kind === 'text' ? l.num : SHOW[l.kind](l.num), fmt: 'text', input: l.input }
    : { label: l.label, calc: l.calc, value: l.num, fmt: PLACEHOLDER_FMT[l.kind], input: true }));

  function linesFor(t) {
    if (t.id === 'quote') return LINES.quote(t.q);
    if (t.id === 'dur1') return LINES.dur(t.D, t.dy, t.A, true);
    if (t.id === 'bridge') return LINES.bridge(t.A, t.D, t.dy);
    if (t.id === 'spread') return LINES.spread(t.corp, t.tsy, t.pts);
    if (t.id === 'pr') return LINES.pct(t.p0, t.p1);
    return [];
  }
  const EXAMPLES = {
    quote: { cap: 'A bond is quoted at 98.25.', lines: () => LINES.quote(98.25) },
    dur1: { cap: 'You hold $10,000 of a bond with duration 7, and rates rise 0.5 point.', lines: () => LINES.dur(7, 0.5, 10000, true) },
    spread: { cap: 'A company’s 10-year bond yields 6.10% and the 10-year Treasury yields 4.35%.', lines: () => LINES.spread(6.10, 4.35, 1.75) },
    pr: { cap: 'A bond falls from 80 to 60 cents on the dollar.', lines: () => LINES.pct(80, 60) },
    bridge: { cap: 'A bank holds $4 billion of bonds with duration 5, and rates rise 2 points.', lines: () => LINES.bridge(4, 5, 2) },
  };

  // ---------------- the slider (step 3) ----------------
  function sliderHtml(t) {
    const p = (n) => bondPrice(SLIDER.coupon, n, SLIDER.start / 100);
    const row = (id, name, n) => `<tr><td class="lbl">${name}</td><td><span class="bar" aria-hidden="true" style="position:relative;display:inline-block;vertical-align:middle;width:9rem;max-width:30vw;height:.8rem;background:var(--line);border-radius:3px;overflow:hidden"><span id="${id}Bar" style="display:block;height:100%;width:${(p(n) / 18).toFixed(1)}%;background:var(--brand)"></span><span title="$1,000" style="position:absolute;top:0;bottom:0;left:55.6%;width:2px;background:var(--ink)"></span></span></td><td><output id="${id}P">${H().money(p(n))}</output></td><td><output id="${id}D">$0</output></td></tr>`;
    return `<div class="seesaw" style="margin:.4rem 0 1rem">
      <label for="ySlider" style="display:block;font-weight:700">Yield on new bonds: <output id="yOut">${p2d(SLIDER.start)}</output></label>
      <input type="range" id="ySlider" min="${SLIDER.min}" max="${SLIDER.max}" step="${SLIDER.step}" value="${SLIDER.start}" style="width:100%;max-width:44rem;accent-color:var(--brand)" aria-valuetext="${p2d(SLIDER.start)}">
      <div class="tw"><table class="cf" aria-live="polite"><thead><tr><th scope="col">Bond</th><th scope="col"><span class="sr-only">Price bar</span></th><th scope="col">Price</th><th scope="col">Change from $1,000</th></tr></thead>
      <tbody>${row('s', '2-year bond', SLIDER.short)}${row('l', '30-year bond', SLIDER.long)}</tbody></table></div><p class="small" style="margin:0">The line in each bar marks $1,000.</p></div>`;
  }
  function wireSlider($) {
    const s = $('#ySlider'); if (!s) return;
    const signed = (x) => (Math.round(x) === 0 ? '$0' : (x > 0 ? '+' : '') + H().money(x));
    const upd = () => {
      const y = Number(s.value) / 100; $('#yOut').textContent = p2d(Number(s.value)); s.setAttribute('aria-valuetext', p2d(Number(s.value)));
      [['s', SLIDER.short], ['l', SLIDER.long]].forEach(([id, n]) => {
        const pr = bondPrice(SLIDER.coupon, n, y);
        $('#' + id + 'P').textContent = H().money(pr); $('#' + id + 'D').textContent = signed(Math.round(pr) - 1000);
        $('#' + id + 'Bar').style.width = Math.min(100, pr / 18).toFixed(1) + '%';
      });
    };
    s.addEventListener('input', upd); upd();
  }

  // ---------------- step text ----------------
  const PROBLEM = {
    quote: (t) => ({ title: 'Read a quote', place: 'A dealer offers your bank a bond.',
      body: `<p>Bond prices are quoted as a percent of the $1,000 face value. The dealer quotes this bond at <b>${p2d(t.q).replace('%', '')}</b>. What does one bond cost?</p>` }),
    seesaw: (t) => ({ title: 'The seesaw', place: 'Your bank owns two bonds. Watch their prices as the yield moves.',
      body: `<p>Each bond pays <b>$40</b> a year on <b>$1,000</b>. One is repaid in 2 years, the other in 30. At a 4% yield, both sell for $1,000. Slide the yield up to <b>${p2d(t.y * 100)}</b>.</p>` }),
    dur1: (t) => ({ title: 'Duration', place: 'Duration is one number that says how far a bond’s price moves when rates move. Longer bonds have bigger durations.',
      body: `<p>Rule of thumb: when rates rise 1 point, a bond’s price falls by about its <b>duration</b>, in percent. Your bank holds <b>${mm(t.A)}</b> of a bond with duration <b>${t.D}</b>. Rates rise <b>${fix(t.dy)}</b> ${t.dy === 1 ? 'point' : 'points'}. About how much does it lose?</p>` }),
    spread: (t) => ({ title: 'Spread over Treasuries', place: 'Why does a company pay more to borrow than the government?',
      body: `<p>A <b>spread</b> is the extra yield a borrower pays over a Treasury bond of the same length. It pays lenders for the risk of not being repaid. A company’s 10-year bond yields <b>${p2d(t.corp)}</b>; the 10-year Treasury yields <b>${p2d(t.tsy)}</b>. What is the spread?</p>` }),
    pr: (t) => ({ title: 'One sentence that moved a market', place: 'It is October 2017. Hurricane Maria has devastated Puerto Rico, which was already in a form of bankruptcy.',
      body: `<p>The U.S. president says Puerto Rico’s debt will have to be wiped out. Its main bond has been trading at <b>${t.p0}</b> cents on the dollar. The next day it trades as low as about <b>${t.p1}</b>. By what percent had it fallen at that low?</p>`,
      choice: { legend: 'Why did one sentence move the price so much?', options: [
        ['recover', 'Lenders now expected to get back less of what they were owed'], ['rate', 'Puerto Rico had raised the interest rate on its bonds'], ['fed', 'The Fed raised interest rates that day']] } }),
    bridge: (t) => ({ title: 'A bank’s big bet', place: 'The same calculation as the Duration step, with a bank’s numbers. This time the middle column names each line in words.',
      body: `<p>In 2021, a bank put <b>$${t.A} billion</b> of its depositors’ money into bonds with duration <b>${t.D}</b>. Then rates rose <b>${fix(t.dy)}</b> points. About how much did the bonds lose?</p>` }),
  };
  const SOURCES = {
    quote: '<p>FINRA, <a href="https://www.finra.org/investors/investing/investment-products/bonds" target="_blank" rel="noopener">Bonds</a>: bond quotes are a percentage of face value.</p>',
    dur1: '<p>FINRA, <a href="https://www.finra.org/investors/insights/bonds-interest-rate-changes-duration" target="_blank" rel="noopener">Brush Up on Bonds: Interest Rate Changes and Duration</a>.</p>',
    pr: '<p>The Bond Buyer, <a href="https://www.bondbuyer.com/news/puerto-rico-municipal-bonds-fall-after-trumps-debt-forgiveness-remarks" target="_blank" rel="noopener">Puerto Rico municipal bonds fall after Trump’s debt forgiveness remarks</a>, October 4, 2017 (the general obligation 8% bonds of 2035). Fortune, <a href="https://fortune.com/2017/10/04/puerto-rico-donald-trump-debt-bankruptcy" target="_blank" rel="noopener">October 4, 2017</a>.</p>',
    bridge: '<p>Board of Governors of the Federal Reserve System, <a href="https://www.federalreserve.gov/publications/files/svb-review-20230428.pdf" target="_blank" rel="noopener">Review of the Federal Reserve’s Supervision and Regulation of Silicon Valley Bank</a>, April 2023, page 22.</p>',
  };

  function taskView(t, L, h) {
    const P = PROBLEM[t.id](t);
    if (t.id === 'seesaw') {
      return { title: P.title, place: P.place, body: P.body, example: '', table: '',
        parts: [{ html: sliderHtml(t), field: 'value' }, { html: '', field: 'choice' }],
        value: { label: `What does the 30-year bond sell for at ${p2d(t.y * 100)}?`, placeholder: '$0', help: '' },
        choice: { legend: 'Which bond’s price moved further from $1,000?', options: [['long', 'The 30-year bond'], ['short', 'The 2-year bond']] },
        noCalc: true, wire: ($) => wireSlider($), helpLabels: ['Show me how to read it', 'Show me the answer'] };
    }
    const E = EXAMPLES[t.id];
    const example = h.ladder(toLadder(E.lines(), true), { filled: true, caption: E.cap });
    const lines = linesFor(t);
    const table = h.ladder(toLadder(lines, false), { rows: L.rows, caption: 'Your turn' })
      + (lines.some((l) => l.input && l.kind === 'pct') ? '<p class="small">Type a percentage like 7.5%.</p>' : '');
    const parts = [{ html: '', field: 'table' }];
    if (P.choice) parts.push({ html: '', field: 'choice' });
    return { title: P.title, place: P.place, body: P.body, example, table, parts, choice: P.choice, sources: SOURCES[t.id] || '',
      helpLabels: ['Show me the first blank', 'Show me every line'] };
  }

  // ---------------- judging ----------------
  // Common slips, per line, phrased with the student's own numbers (rule 3). Values are in the line's own units.
  function diagFor(t, l) {
    const D = [];
    if (t.id === 'quote') D.push([t.q, 'quote', `That is the quote itself, a percent. The price is ${p2d(t.q)} of $1,000: ${p2d(t.q)} × $1,000.`],
      [t.q * 100, 'hundred', `That multiplies by 100. A quote of ${p2d(t.q).replace('%', '')} means ${p2d(t.q)} of $1,000.`], [t.q / 100, 'frac', 'Now multiply by the $1,000 face value.'],
      [1000, 'face', `That is the face value. A quote of ${p2d(t.q).replace('%', '')} means the bond sells for ${p2d(t.q)} of it.`]);
    if ((t.id === 'dur1' || t.id === 'bridge') && l.kind === 'pct') D.push([t.D / 100, 'dur', `That is the duration alone. Multiply it by the rise in rates: ${t.D} × ${fix(t.dy)}.`],
      [(t.D + t.dy) / 100, 'plus', `Multiply the duration by the rise in rates, ${t.D} × ${fix(t.dy)}, don’t add them.`], [t.dy / 100, 'rise', 'That is the rise in rates. Multiply it by the duration.']);
    if (t.id === 'dur1' && l.kind === 'money') D.push([t.D * t.dy, 'pctpts', `Turn the percent into dollars: ${pc(t.pct)} × ${mm(t.A)}.`], [t.A - t.answer, 'left', `That is what the bonds are worth after the fall. The question asks how much they lose: ${pc(t.pct)} × ${mm(t.A)}.`],
      [t.A * t.D * t.dy, 'units', `Write the percent as a decimal first: ${pc(t.pct)} = ${fix(t.pct, 4)}.`]);
    if (t.id === 'bridge' && l.kind === 'bil') D.push([t.A - t.answer, 'left', `That is what the bonds are worth after the fall. The loss is ${pc(t.pct)} × $${t.A} billion.`],
      [t.A * t.D * t.dy, 'units', `Write the percent as a decimal first: ${pc(t.pct)} = ${fix(t.pct, 4)}.`], [t.D * t.dy, 'pctpts', `That is the percent. Turn it into billions: ${pc(t.pct)} × $${t.A} billion.`]);
    if (t.id === 'spread' && l.kind === 'pts') D.push([t.corp + t.tsy, 'plus', 'Subtract the Treasury yield from the company’s yield, don’t add them.'], [-t.pts, 'flip', 'Take the company’s yield minus the Treasury’s, so the spread is positive.'], [t.pts * 100, 'bps', 'That is already in basis points. This line wants percentage points.']);
    if (t.id === 'spread' && l.kind === 'bps') D.push([t.pts, 'pts', 'That is the spread in percentage points. One point is 100 basis points, so multiply by 100.'], [t.pts * 10, 'ten', 'Multiply by 100, not 10: one point is 100 basis points.'], [-t.bps, 'flip', 'The spread is positive: the company pays more than the Treasury.']);
    if (t.id === 'pr' && l.kind === 'cents') D.push([t.p0 + t.p1, 'plus', `Subtract: ${t.p0} − ${t.p1}.`], [t.p1 - t.p0, 'flip', `Take the starting price minus the new one: ${t.p0} − ${t.p1}.`]);
    if (t.id === 'pr' && l.kind === 'pct') D.push([t.cents / t.p1, 'base', `Divide by the starting price, ${t.p0}, not the new price.`], [t.p1 / t.p0, 'ratio', `That is how much is left. The fall is ${t.cents} ÷ ${t.p0}.`],
      [t.cents / 100, 'hundred', `Divide by the starting price, ${t.p0} cents, not by 100.`]);
    return D;
  }
  const plain = (s) => String(s).replace(/<[^>]+>/g, '');

  function judgeSeesaw(t, e, h) {
    const v = h.parseMoney(e.value);
    const diag = [[t.p2, 'short', `That is the 2-year bond’s price. Read the 30-year bond’s price at ${p2d(t.y * 100)}.`],
      [1000, 'start', `That is the price at 4%. Move the slider to ${p2d(t.y * 100)} first.`],
      [2000 - t.p30, 'mirror', 'That price moved the wrong way. When the yield rises, the price falls. Read it off the slider.']];
    for (let y = SLIDER.min; y <= SLIDER.max + 1e-9; y += SLIDER.step) {
      if (Math.abs(y / 100 - t.y) > 1e-9 && Math.abs(y - 4) > 1e-9) diag.push([Math.round(bondPrice(SLIDER.coupon, SLIDER.long, y / 100)), 'pos', `That is the price at ${p2d(y)}. Move the slider to ${p2d(t.y * 100)}.`]);
    }
    const r = h.judgeNumber(v, t.p30, diag, { tol: 1.5, scale: t.p30, unreadable: 'Type the price shown, like 850.', closeMsg: 'Close. Type the price exactly as the table shows it.', otherMsg: `Move the slider to ${p2d(t.y * 100)} and read the 30-year bond’s price.` });
    if (!r.ok) return { ok: false, msg: r.msg };
    if (e.choice !== t.decision) {
      if (!e.choice) return { ok: false, msg: 'Now answer the question under the price.' };
      return { ok: false, msg: `Compare the changes: the 2-year bond moved ${h.money(1000 - t.p2)}, the 30-year bond ${h.money(1000 - t.p30)}.` };
    }
    return { ok: true };
  }

  function judgeTask(t, e, h) {
    if (t.id === 'seesaw') return judgeSeesaw(t, e, h);
    const lines = linesFor(t), rows = e.rows || [], rowRes = [];
    lines.forEach((l, i) => {
      if (!l.input) return;
      rowRes[i] = h.judgeNumber(PARSE[l.kind](h, rows[i]), l.num, diagFor(t, l),
        { tol: l.tol != null ? l.tol : TOL[l.kind](l.num), scale: Math.abs(l.num), unreadable: UNREADABLE[l.kind],
          closeMsg: l.kind === 'pct' ? `${plain(l.calc)}.` : 'Close. Check the arithmetic and round only at the end.', otherMsg: `${plain(l.calc)}.` });
    });
    const bad = rowRes.findIndex((x) => x && !x.ok);
    if (bad >= 0) return { ok: false, rowRes, msg: `${plain(lines[bad].label)}: ${rowRes[bad].msg}` };
    if (t.decision && e.choice !== t.decision) {
      if (!e.choice) return { ok: false, rowRes, msg: 'Now answer the question under the table.' };
      return { ok: false, rowRes, msg: 'The coupon on the old bonds did not change, and the Fed did not move that day. What changed was how much lenders expected to get back.' };
    }
    return { ok: true, rowRes };
  }

  function helpText(t, lvl) {
    if (t.id === 'seesaw') return lvl === 1
      ? `Drag the slider until it reads ${p2d(t.y * 100)}. Then read the 30-year bond’s price in the table, and compare how far each price moved from $1,000.`
      : `At ${p2d(t.y * 100)}, the 30-year bond sells for ${H().money(t.p30)} and the 2-year bond for ${H().money(t.p2)}. The 30-year bond moved further from $1,000.`;
    const lines = linesFor(t), blanks = lines.filter((l) => l.input);
    const say = (l) => `${l.label}: ${l.calc} = ${l.kind === 'text' ? l.num : SHOW[l.kind](l.num)}`;
    return lvl === 1 ? say(blanks[0]) : lines.map(say).join('<br>') + (t.decision ? '<br>Lenders now expected to get back less, so they would pay less.' : '');
  }
  function praise(t) {
    const h = H();
    if (t.id === 'quote') return `A quote of ${p2d(t.q).replace('%', '')} means ${p2d(t.q)} of face value: ${h.money(t.answer, 2)} for one bond.${t.q > 100 ? ' This one sells above its face value.' : ''}`;
    if (t.id === 'seesaw') return `The yield rose and both prices fell. The 30-year bond lost ${h.money(1000 - t.p30)}; the 2-year bond lost only ${h.money(1000 - t.p2)}. The longer the bond, the further its price swings.`;
    if (t.id === 'dur1') return `A ${fix(t.dy)}-point rise takes about ${pc(t.pct)} off a duration-${t.D} bond: about ${mm(t.answer)} on ${mm(t.A)}.`;
    if (t.id === 'spread') return `Lenders want ${t.bps} basis points more from the company than from the government, as pay for the risk of not being repaid.`;
    if (t.id === 'pr') return `At its low, a fall of about ${Math.round(t.answer * 100)}% in a day, and the bond still ended the day well below ${t.p0}. Nothing about its coupon changed. Lenders expected to get back less.`;
    if (t.id === 'bridge') return `The bonds lost about $${fix(t.answer)} billion, and no borrower missed a payment. You meet a real bank that made this bet in the next reading: Silicon Valley Bank. At the end of 2022, its long-term bonds had a duration of about 6.`;
  }
  const fmtIn = (l, x) => (l.kind === 'pct' ? fix(x * 100, 3) + '%' : String(Math.round(x * 1000) / 1000));
  function selfAnswer(t) {
    if (t.id === 'seesaw') return { value: String(t.p30), choice: 'long', rows: null };
    const rows = []; linesFor(t).forEach((l, i) => { if (l.input) rows[i] = fmtIn(l, l.num); });
    return { rows, choice: t.decision || null };
  }
  function selfWrong(t) {
    if (t.id === 'seesaw') return { value: String(Math.round(t.p30 * 1.3)), choice: 'short', rows: null };
    const rows = []; linesFor(t).forEach((l, i) => { if (l.input) rows[i] = fmtIn(l, l.num * 1.3); });
    return { rows, choice: t.decision || null };
  }

  root.DESK = {
    app: 'finan3-w04-bond-desk', version: 1, seedVersion: 1, salt: 'rize-finan3-w04-bond:82b268', points: 60,
    storageKey: 'rize-finan3-w04-bond-v1', filePrefix: 'BondDesk',
    verifyUrl: 'https://rizecomputerscience.github.io/finan3-bond-desk/verify.html',
    calcPlaceholder: '0.075*2000000',
    calcHint: '',
    story: { title: 'The Bond Desk', kicker: 'Financial Markets and Institutions, Unit 4', company: 'Great Lakes Community Bank', team: 'Bond Desk',
      from: '', fromTitle: '',
      dek: 'Great Lakes Community Bank keeps part of its depositors’ money in bonds, which it can sell any day if depositors want their cash back. You help manage those bonds. Each step asks what a bond is worth today, and why that number moves.',
      whatBox: '',
      stepsLine: 'Eleven short steps. Each calculation shows a worked example in the same table you fill in, then you do the same calculation with your own numbers.' },
    steps: STEPS, quiz: QUIZ, walk: null, buildTasks, taskView, judgeTask, helpText, praise, selfAnswer, selfWrong,
    note: { title: 'Bonds or shares?', label: 'Your note', minWords: 30, receiptHeading: 'Note: bonds or shares for $50 million?',
      prompt: 'A company needs $50 million. Give one advantage and one drawback of raising it by selling bonds, and one advantage and one drawback of raising it by selling shares.' },
    // For tests and the lesson check (not used by the engine).
    bondPrice, SLIDER, linesFor,
  };
})(typeof window !== 'undefined' ? window : globalThis);

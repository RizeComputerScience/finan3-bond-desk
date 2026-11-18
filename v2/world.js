/* The Bond Desk, version 2: the world's math and data, with no DOM, so the page, the lesson test and the playthrough all
   use the same functions. Loads after config.js (DESK.bondPrice) and data.js (BOND_DATA). Facts: ../FACTS.md. */
(function (root) {
  'use strict';
  const DESK = root.DESK, DATA = root.BOND_DATA;
  const P = DESK.bondPrice, S = DESK.SLIDER;

  // Modified duration by central difference, on the same price function the desk judges with.
  function modDur(c, n, y) { const e = 1e-5; return -(P(c, n, y + e) - P(c, n, y - e)) / (2 * e) / P(c, n, y); }

  // ---------------- the beam ----------------
  // The price arm is graduated in duration (0 to 20). A rate change of dy points tilts the beam by tan(theta) = TILT * dy,
  // so a bond riding at distance d drops d * dy percent of its price: the duration rule of thumb, drawn as a lever.
  const BEAM = { scaleMax: 20, tilt: 0.08, coupon: S.coupon, yMin: S.min, yMax: S.max, step: S.step, start: S.start };
  const leverDropPct = (d, dy) => d * dy;                      // percent of price, the rule of thumb
  const beamTan = (dy) => BEAM.tilt * dy;
  // The two seesaw bonds ride at their own durations (4% coupon, priced at 4%): about 1.9 and 17.3.
  const SEESAW_BONDS = [
    { id: 'short', years: S.short, d: modDur(S.coupon, S.short, S.coupon), label: '2-year bond' },
    { id: 'long', years: S.long, d: modDur(S.coupon, S.long, S.coupon), label: '30-year bond' }];
  const seesawPrice = (years, yieldPct) => Math.round(P(S.coupon, years, yieldPct / 100));
  const snapYield = (y) => Math.min(S.max, Math.max(S.min, Math.round(y / S.step) * S.step));
  // What the receipt stores when the student taps a bond on the beam: the price shown on its tag and which bond it was.
  function seesawEntry(yieldPct, bondId) { const b = SEESAW_BONDS.find((x) => x.id === bondId); return { value: String(seesawPrice(b.years, snapYield(yieldPct))), choice: bondId, rows: null }; }
  // "Which loses most?": the 2-, 10- and 30-year 4% bonds, at their durations, which round to 2, 8 and 17.
  const DUR_BONDS = [
    { quizText: /duration 17/, years: 30, d: modDur(0.04, 30, 0.04), label: 'Duration 17', sub: '30-year bond' },
    { quizText: /duration 8/, years: 10, d: modDur(0.04, 10, 0.04), label: 'Duration 8', sub: '10-year bond' },
    { quizText: /duration 2/, years: 2, d: modDur(0.04, 2, 0.04), label: 'Duration 2', sub: '2-year bond' }];

  // ---------------- the bank's gauge (step 10) ----------------
  // Value of the bank's bonds, in billions, after rates have risen r points: the rule of thumb, linear in r.
  const gaugeValue = (A, D, r) => A * (1 - D * r / 100);
  const gaugeLoss = (A, D, r) => A * D * r / 100;

  // ---------------- 2022 ----------------
  // The Fed's 2022 decisions (FOMC decision dates; the target range after each). Source: FACTS.md.
  const FED_2022 = [
    { date: '2022-01-03', label: 'Jan 3', lo: 0, hi: 0.25, note: 'Start of the year' },
    { date: '2022-03-16', label: 'Mar 16', lo: 0.25, hi: 0.5, note: 'Up 0.25 point' },
    { date: '2022-05-04', label: 'May 4', lo: 0.75, hi: 1, note: 'Up 0.50 point' },
    { date: '2022-06-15', label: 'Jun 15', lo: 1.5, hi: 1.75, note: 'Up 0.75 point' },
    { date: '2022-07-27', label: 'Jul 27', lo: 2.25, hi: 2.5, note: 'Up 0.75 point' },
    { date: '2022-09-21', label: 'Sep 21', lo: 3, hi: 3.25, note: 'Up 0.75 point' },
    { date: '2022-11-02', label: 'Nov 2', lo: 3.75, hi: 4, note: 'Up 0.75 point' },
    { date: '2022-12-14', label: 'Dec 14', lo: 4.25, hi: 4.5, note: 'Up 0.50 point' },
    { date: '2022-12-30', label: 'Dec 30', lo: 4.25, hi: 4.5, note: 'End of the year' }];
  const T22 = DATA ? DATA.treasury2022 : [];
  const dayIndex = (iso) => { let k = 0; for (let i = 0; i < T22.length; i++) if (T22[i][0] <= iso) k = i; return k; };
  const rangeOn = (iso) => { let r = FED_2022[0]; for (const m of FED_2022) if (m.date <= iso) r = m; return r; };

  // Dick's Sporting Goods 4.10% notes due January 15, 2052 (coupons twice a year). Three values are real: the issue price
  // (99.760% of face, January 2022 prospectus) and the fair value Dick's reported at its fiscal year ends of January 29,
  // 2022 ($711.3 million on $750 million) and January 28, 2023 ($525.12 million). The daily line between them is an
  // ESTIMATE: the bond priced at that day's 30-year Treasury par yield plus a spread that moves in a straight line
  // between the spreads implied at those three dates (the Treasury yield of the last trading day on or before each).
  const DKS = { coupon: 0.041, maturity: '2052-01-15', anchors: [
    { date: '2022-01-14', price: 997.6, t30: null, label: 'issue price' },
    { date: '2022-01-28', price: 948.4, t30: null, label: 'annual report, Jan 29, 2022' },
    { date: '2023-01-27', price: 700.16, t30: 3.64, label: 'annual report, Jan 28, 2023' }] };
  const yearsBetween = (a, b) => (Date.parse(b) - Date.parse(a)) / (365.25 * 864e5);
  function semiPrice(c, years, y) { const k = y / 2, n = 2 * years, C = c * 1000 / 2; return C * (1 - Math.pow(1 + k, -n)) / k + 1000 * Math.pow(1 + k, -n); }
  function solveSpread(price, t30, years) { let lo = -0.05, hi = 0.2; for (let i = 0; i < 100; i++) { const m = (lo + hi) / 2; if (semiPrice(DKS.coupon, years, t30 / 100 + m) > price) lo = m; else hi = m; } return (lo + hi) / 2; }
  let dksCache = null;
  function dicksPath() {
    if (dksCache) return dksCache;
    if (!T22.length) return (dksCache = []);
    const A = DKS.anchors.map((a) => { const t30 = a.t30 != null ? a.t30 : T22[dayIndex(a.date)][3]; return { t: Date.parse(a.date), s: solveSpread(a.price, t30, yearsBetween(a.date, DKS.maturity)) }; });
    const spreadAt = (t) => { for (let k = 0; k < A.length - 1; k++) if (t <= A[k + 1].t) return A[k].s + (A[k + 1].s - A[k].s) * Math.max(0, (t - A[k].t) / (A[k + 1].t - A[k].t)); return A[A.length - 1].s; };
    dksCache = T22.filter((r) => r[0] >= DKS.anchors[0].date).map((r) => {
      const s = spreadAt(Date.parse(r[0]));
      return [r[0], semiPrice(DKS.coupon, yearsBetween(r[0], DKS.maturity), r[3] / 100 + s), r[3] + s * 100];
    });
    return dksCache;
  }
  function dicksOn(iso) { const p = dicksPath(); let v = null; for (const r of p) if (r[0] <= iso) v = r; return v; }

  // ---------------- Dragovia (illustrative numbers) ----------------
  // A 10-year Dragovia bond with a 6% coupon trades at $1,000 (yield 6%) beside a 4% Treasury at $1,000. After the
  // headline, Dragovia's price falls to $800, which pushes its yield to about 9.2%. The Treasury does not move.
  const DRAGOVIA = { coupon: 0.06, years: 10, before: 1000, after: 800, tsy: 4 };
  function yieldAt(price, c, n) { let lo = -0.5, hi = 2; for (let k = 0; k < 200; k++) { const m = (lo + hi) / 2; if (P(c, n, m) > price) lo = m; else hi = m; } return (lo + hi) / 2; }

  // ---------------- Puerto Rico, October 3 to 4, 2017 (FACTS.md) ----------------
  const PR = { before: 44, low: 30.25, lowRounded: 30, late: 37.5 };

  // Quiz options in the same shuffled order as version 1's engine (a hash of the question and the option index).
  const optOrder = (q) => { const hs = (s) => { let x = 2166136261; for (let i = 0; i < s.length; i++) { x ^= s.charCodeAt(i); x = Math.imul(x, 16777619) >>> 0; } return x; }; return q.options.map((_, j) => j).sort((a, b) => hs(q.q + '|' + a) - hs(q.q + '|' + b)); };

  root.WORLD = { P, modDur, BEAM, leverDropPct, beamTan, SEESAW_BONDS, seesawPrice, snapYield, seesawEntry, DUR_BONDS,
    gaugeValue, gaugeLoss, FED_2022, T22, dayIndex, rangeOn, DKS, semiPrice, dicksPath, dicksOn, DRAGOVIA, yieldAt, PR, optOrder };
})(typeof window !== 'undefined' ? window : globalThis);

/* The Bond Desk, version 2 (FINAN III Unit 4). One instrument under one lamp: a beam graduated in duration.
   Grading, seeding, receipts and verification are version 1's (config.js + the engine core in desk-engine.js, loaded with
   DESK_NO_UI so only DeskEngine.make runs). This file is the interface: the stage (SVG scenes), the console, the receipt.
   Design: ../DESIGN.md. Facts: ../FACTS.md. Tests: ../tests/. */
(function () {
  'use strict';
  const D = DeskEngine.make(window.DESK), C = D.C, h = DeskEngine.h, W0 = window.WORLD;
  window.Desk = D;
  // Images: public domain, logged in ../FACTS.md.
  window.BOND_IMG = { liberty: true, libertyAlt: 'A 1918 United States $50 Liberty Loan bond, with rows of interest coupons along its left side and bottom.', libertyCap: 'A real bond: a $50 U.S. Liberty Loan bond from 1918. The rows of small squares are its coupons, one for each interest payment. U.S. Treasury, public domain.', maria: 'Yuisa Rios/FEMA, public domain.' };
  const $ = (s, el) => (el || document).querySelector(s);
  const $$ = (s, el) => [...(el || document).querySelectorAll(s)];
  const esc = (s) => String(s == null ? '' : s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const KEY = 'rize-finan3-w04-bond-v2';
  const store = { get(k) { try { return JSON.parse(localStorage.getItem(k)); } catch (e) { return null; } }, set(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); } catch (e) { /* private mode */ } } };
  const RM = !!(window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches);
  const fix = (x, dp) => String(+Number(x).toFixed(dp == null ? 2 : dp));
  const p2 = (x) => Number(x).toFixed(2) + '%';
  const money = (x, dp) => h.money(x, dp);
  const mm = (x) => (Math.abs(x - Math.round(x)) < 1e-9 ? money(x) : money(x, 2));
  const signed = (x) => (Math.round(x) === 0 ? '$0' : (x > 0 ? '+' : '') + money(x));
  const SHOW = { pct: (v) => fix(v * 100, 2) + '%', money: mm, pts: (v) => fix(v) + ' percentage points', bps: (v) => fix(v, 0) + ' basis points', cents: (v) => fix(v), bil: (v) => '$' + fix(v) + ' billion', text: (v) => String(v) };
  const PH = { pct: '0.0%', money: '$0', pts: '0.00', bps: '0', cents: '0', bil: '0.0' };
  const UNIT = { pct: '', money: '', pts: 'points', bps: 'basis points', cents: 'cents', bil: 'billion' };
  const words = (s) => (String(s || '').trim().match(/\S+/g) || []).length;

  // ======================= sound (off by default; short synthesized cues) =======================
  const Sound = (() => {
    let ac = null, on = false, creakG = null, creakSrc = null, lastTick = 0;
    function ctx() { if (!ac) { const A = window.AudioContext || window.webkitAudioContext; if (!A) return null; ac = new A(); } if (ac.state === 'suspended') ac.resume(); return ac; }
    function env(node, t, a, d, peak) { const g = ac.createGain(); g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(peak, t + a); g.gain.exponentialRampToValueAtTime(0.0001, t + a + d); node.connect(g); g.connect(ac.destination); return g; }
    function tone(f, dur, type, peak, when) { if (!on || !ctx()) return; const t = ac.currentTime + (when || 0); const o = ac.createOscillator(); o.type = type || 'sine'; o.frequency.setValueAtTime(f, t); env(o, t, 0.006, dur, peak || 0.08); o.start(t); o.stop(t + dur + 0.05); }
    function noiseBuf() { const b = ac.createBuffer(1, ac.sampleRate * 1, ac.sampleRate), d = b.getChannelData(0); for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1; return b; }
    return {
      get on() { return on; },
      set(v) { on = v; if (on) ctx(); if (!on && creakG) creakG.gain.value = 0; },
      tick() { const n = performance.now(); if (n - lastTick < 28) return; lastTick = n; tone(2300, 0.025, 'square', 0.025); },
      detent() { tone(180, 0.06, 'triangle', 0.12); tone(900, 0.03, 'square', 0.03); },
      chime() { tone(660, 0.5, 'sine', 0.09); tone(990, 0.6, 'sine', 0.06, 0.09); },
      miss() { tone(220, 0.18, 'triangle', 0.08); tone(196, 0.22, 'triangle', 0.06, 0.08); },
      thud() { tone(70, 0.35, 'sine', 0.2); },
      creak(vel) {
        if (!on || !ctx()) return;
        if (!creakSrc) { creakSrc = ac.createBufferSource(); creakSrc.buffer = noiseBuf(); creakSrc.loop = true; const f = ac.createBiquadFilter(); f.type = 'bandpass'; f.frequency.value = 340; f.Q.value = 9; creakG = ac.createGain(); creakG.gain.value = 0; creakSrc.connect(f); f.connect(creakG); creakG.connect(ac.destination); creakSrc.start(); }
        creakG.gain.setTargetAtTime(Math.min(0.07, Math.abs(vel) * 0.02), ac.currentTime, 0.05);
      },
    };
  })();
  const soundBtn = $('#soundBtn');
  function setSound(v) { Sound.set(v); soundBtn.setAttribute('aria-pressed', String(v)); $('#soundLbl').textContent = v ? 'Sound on' : 'Sound off'; $('#soundWaves').setAttribute('opacity', v ? '1' : '.35'); store.set(KEY + ':sound', v); }
  soundBtn.addEventListener('click', () => setSound(!Sound.on));
  setSound(false);

  // Desmos opens in a window beside the desk (version 1 behaviour); a blocked popup falls back to the link's new tab.
  document.addEventListener('click', (e) => {
    const a = e.target.closest && e.target.closest('a.desmos-open'); if (!a) return;
    const Wd = 440, sc = window.screen || {}, aw = sc.availWidth || 1280, ah = sc.availHeight || 800; let w = null;
    try { w = window.open(a.href, 'desmos', `popup,width=${Wd},height=${Math.min(ah, 760)},left=${Math.max(0, (sc.availLeft || 0) + aw - Wd)},top=${sc.availTop || 0}`); } catch (err) { w = null; }
    if (w) { e.preventDefault(); try { w.opener = null; w.focus(); } catch (err) { /* cross-origin */ } }
  });

  // ======================= svg kit =======================
  const NS = 'http://www.w3.org/2000/svg';
  const svg = $('#world'), stage = $('#stage'), overlay = $('#overlay'), stageDesc = $('#stageDesc');
  function E(tag, attrs, parent) { const e = document.createElementNS(NS, tag); if (attrs) for (const k in attrs) if (attrs[k] != null) e.setAttribute(k, attrs[k]); if (parent) parent.appendChild(e); return e; }
  function T(parent, x, y, text, attrs) { const t = E('text', Object.assign({ x, y }, attrs || {}), parent); t.textContent = text; return t; }
  let uid = 0; const nid = (p) => (p || 'i') + (++uid);
  let defs;
  function baseDefs() {
    defs = E('defs', {}, svg);
    defs.innerHTML = `
      <linearGradient id="steelG" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#5A7590"/><stop offset=".45" stop-color="#2E4560"/><stop offset="1" stop-color="#14243A"/></linearGradient>
      <linearGradient id="fulcG" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#2C4560"/><stop offset="1" stop-color="#0E1B2D"/></linearGradient>
      <linearGradient id="paperG" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#EEF3F7"/><stop offset="1" stop-color="#C9D5DF"/></linearGradient>
      <linearGradient id="liquidG" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#FFC56E"/><stop offset="1" stop-color="#C7802A"/></linearGradient>
      <linearGradient id="floorG" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stop-color="#2B425C" stop-opacity="0"/><stop offset=".5" stop-color="#2B425C"/><stop offset="1" stop-color="#2B425C" stop-opacity="0"/></linearGradient>
      <radialGradient id="poolG"><stop offset="0" stop-color="#FFB447" stop-opacity=".16"/><stop offset="1" stop-color="#FFB447" stop-opacity="0"/></radialGradient>
      <pattern id="hatchP" width="7" height="7" patternUnits="userSpaceOnUse" patternTransform="rotate(45)"><line x1="0" y1="0" x2="0" y2="7" stroke="#FFB447" stroke-opacity=".3" stroke-width="1.6"/></pattern>
      <pattern id="gridP" width="32" height="32" patternUnits="userSpaceOnUse"><path d="M32 0H0V32" fill="none" stroke="#1A2C42" stroke-width="1"/></pattern>
      <filter id="glow" x="-50%" y="-50%" width="200%" height="200%"><feGaussianBlur stdDeviation="5" result="b"/><feMerge><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge></filter>`;
  }
  // Rolling numbers: each digit is a column of 0 to 9 behind a clip, eased to its new place.
  function Odo(parent, o) {
    o = o || {}; const size = o.size || 28, lh = size * 1.12;
    const g = E('g', { class: 'odo ' + (o.cls || ''), style: `font-size:${size}px` }, parent);
    const cid = nid('clip'); const cp = E('clipPath', { id: cid }, defs); const cr = E('rect', {}, cp);
    const inner = E('g', { 'clip-path': `url(#${cid})` }, g);
    let slots = [], str = null, width = 0;
    const adv = (ch) => (/\d/.test(ch) ? size * 0.5 : ch === ',' || ch === '.' ? size * 0.22 : ch === '$' ? size * 0.44 : ch === '%' ? size * 0.62 : /[−+-]/.test(ch) ? size * 0.42 : ch === '?' ? size * 0.45 : size * 0.28);
    function shape(s) { return s.replace(/\d/g, '0'); }
    function build(s) {
      inner.innerHTML = ''; slots = []; let x = 0;
      for (const ch of s) {
        const w = adv(ch);
        if (/\d/.test(ch)) { const col = E('g', {}, inner); for (let d = 0; d < 10; d++) T(col, x + w / 2, d * lh, String(d), { 'text-anchor': 'middle', class: o.tcls || 'disp' }); const v = +ch; col.setAttribute('transform', `translate(0 ${-v * lh})`); slots.push({ col, cur: v, tgt: v }); }
        else T(inner, x + w / 2, 0, ch, { 'text-anchor': 'middle', class: o.tcls || 'disp' });
        x += w;
      }
      width = x; cr.setAttribute('x', -2); cr.setAttribute('y', -size * 0.86); cr.setAttribute('width', width + 4); cr.setAttribute('height', size * 1.08);
      inner.setAttribute('transform', `translate(${o.anchor === 'end' ? -width : o.anchor === 'middle' ? -width / 2 : 0} 0)`);
    }
    const api = {
      g, get width() { return width; },
      set(s, snap) { s = String(s); if (str === null || shape(s) !== shape(str)) { build(s); str = s; return; } let k = 0; for (const ch of s) { if (/\d/.test(ch)) { slots[k].tgt = +ch; if (snap || RM) { slots[k].cur = +ch; } k++; } } str = s; api.frame(0); },
      at(x, y) { g.setAttribute('transform', `translate(${x} ${y})`); return api; },
      frame(dt) { let moving = false; for (const s of slots) { if (Math.abs(s.cur - s.tgt) > 0.002) { s.cur += (s.tgt - s.cur) * Math.min(1, dt * 13); moving = true; } else s.cur = s.tgt; s.col.setAttribute('transform', `translate(0 ${(-s.cur * lh).toFixed(2)})`); } if (moving) Sound.tick(); },
    };
    if (o.value != null) api.set(o.value, true);
    return api;
  }
  function spring(st, target, dt, k, c) { if (RM) { st.x = target; st.v = 0; return; } k = k || 150; c = c || 15; const n = Math.max(1, Math.ceil(dt / 0.008)); const s = dt / n; for (let i = 0; i < n; i++) { const a = -k * (st.x - target) - c * st.v; st.v += a * s; st.x += st.v * s; } }
  // A bond certificate, drawn upright, its bottom centre at (0,0).
  function cert(parent, w, hgt, title, sub, o) {
    o = o || {}; const g = E('g', { class: 'cert' }, parent);
    E('rect', { class: 'focusring', x: -w / 2 - 6, y: -hgt - 6, width: w + 12, height: hgt + 12, rx: 6, fill: 'none', stroke: '#FFB447', 'stroke-width': 2.5 }, g);
    if (o.stack) for (let k = 3; k >= 1; k--) E('rect', { x: -w / 2 + k * 4, y: -hgt - k * 5, width: w, height: hgt, rx: 3, fill: '#B9C7D3', stroke: '#0A1524', 'stroke-width': 1 }, g);
    E('rect', { x: -w / 2, y: -hgt, width: w, height: hgt, rx: 3, fill: 'url(#paperG)' }, g);
    E('rect', { x: -w / 2 + 3.5, y: -hgt + 3.5, width: w - 7, height: hgt - 7, rx: 2, fill: 'none', stroke: '#0A1524', 'stroke-width': 1 }, g);
    E('rect', { x: -w / 2 + 6, y: -hgt + 6, width: w - 12, height: hgt - 12, rx: 1.5, fill: 'none', stroke: '#0A1524', 'stroke-width': 0.6, 'stroke-dasharray': '1.5 2' }, g);
    const fs = Math.max(10, Math.min(22, w * 0.2, (w - 14) / (String(title).length * 0.48)));
    T(g, 0, -hgt / 2 + (sub ? 0 : fs * 0.35), title, { 'text-anchor': 'middle', class: 'disp night', style: `font-size:${fs}px;font-weight:800` });
    if (sub) T(g, 0, -hgt / 2 + fs * 0.95, sub, { 'text-anchor': 'middle', class: 'night', style: `font-size:${Math.max(9, fs * 0.5)}px` });
    return g;
  }
  function backdrop(W, H, o) {
    o = o || {};
    E('rect', { x: 0, y: 0, width: W, height: H, fill: 'url(#gridP)', opacity: 0.55 }, svg);
    if (o.cone) {
      // one lamp over the desk: a shade at the top and a cone of sodium light falling to the instrument
      const [cx, by, hw] = o.cone, cid = nid('cone');
      E('linearGradient', { id: cid, x1: 0, y1: 0, x2: 0, y2: 1 }, defs).innerHTML = '<stop offset="0" stop-color="#FFB447" stop-opacity=".13"/><stop offset=".75" stop-color="#FFB447" stop-opacity=".045"/><stop offset="1" stop-color="#FFB447" stop-opacity="0"/>';
      E('path', { d: `M${cx - 26} 10 L${cx + 26} 10 L${cx + hw} ${by} L${cx - hw} ${by} Z`, fill: `url(#${cid})` }, svg);
      E('path', { d: `M${cx - 34} 10 L${cx + 34} 10 L${cx + 22} -4 L${cx - 22} -4 Z`, fill: '#1D3149', stroke: '#2B425C' }, svg);
      E('rect', { x: cx - 30, y: 9, width: 60, height: 2.5, rx: 1, fill: '#FFB447', filter: 'url(#glow)' }, svg);
    }
    if (o.pool) E('ellipse', { cx: o.pool[0], cy: o.pool[1], rx: o.pool[2], ry: o.pool[2] * 0.36, fill: 'url(#poolG)' }, svg);
  }

  // ======================= the beam =======================
  // The price arm is graduated in duration. Tilt: tan(theta) = WORLD.BEAM.tilt * (rise in rates, points).
  function Beam(o) {
    const B = { st: { x: o.dy || 0, v: 0 }, dyT: o.dy || 0, tokens: o.tokens || [], scaleOn: o.scale ? 1 : 0, scaleT: o.scale ? 1 : 0, annos: {}, sel: null };
    let G, beamG, tokG = {}, odos = [], readout, annoG, hit, knob, ring, geo, targetG;
    B.build = (parent, px, py, armL, armR, W, H) => {
      geo = { px, py, armL, armR, u: armR / W0.BEAM.scaleMax, narrow: W < 600 };
      G = E('g', { class: 'beam' }, parent); odos = []; tokG = {};
      const fh = Math.min(70, H * 0.13);
      E('ellipse', { cx: px + (armR - armL) / 2, cy: py + fh + 2, rx: (armL + armR) * 0.55, ry: 9, fill: '#050C16', opacity: 0.75 }, G);
      E('rect', { x: 0, y: py + fh, width: W, height: 1, fill: 'url(#floorG)' }, G);
      E('path', { d: `M${px} ${py} L${px - fh * 0.55} ${py + fh} L${px + fh * 0.55} ${py + fh} Z`, fill: 'url(#fulcG)', stroke: '#3C5674', 'stroke-width': 1 }, G);
      // yield scale (static) or rise readout
      if (o.yieldScale) {
        const sx = px - armL - (geo.narrow ? 32 : 50); const sg = E('g', { class: 'yscale' }, G);
        for (let y = W0.BEAM.yMin; y <= W0.BEAM.yMax; y++) {
          const yy = py - armL * Math.sin(Math.atan(W0.beamTan(y - 4)));
          E('line', { x1: sx, x2: sx + (y === 4 ? 16 : 9), y1: yy, y2: yy, stroke: y === 4 ? '#E9EEF2' : '#4A6580', 'stroke-width': y === 4 ? 2 : 1 }, sg);
          if (!geo.narrow || y === 1 || y === 4 || y === 9) T(sg, sx - 5, yy + 4, y === 4 && !geo.narrow ? 'coupon 4%' : y + '%', { 'text-anchor': 'end', class: y === 4 ? '' : 'fog', style: `font-size:${geo.narrow ? 10.5 : 12}px` });
        }
        if (!geo.narrow) T(sg, sx - 4, py - armL * Math.sin(Math.atan(W0.beamTan(W0.BEAM.yMax - 4))) - 18, 'Yield', { 'text-anchor': 'middle', class: 'fog', style: 'font-size:12px' });
        if (o.target != null) {
          const ty = py - armL * Math.sin(Math.atan(W0.beamTan(o.target - 4)));
          targetG = E('g', {}, sg);
          E('rect', { x: sx - 2, y: ty - 1.5, width: 20, height: 3, fill: '#FFB447' }, targetG);
          T(targetG, sx - 4, py - armL * Math.sin(Math.atan(W0.beamTan(W0.BEAM.yMax - 4))) - (geo.narrow ? 20 : 38), 'Target ' + p2(o.target), { 'text-anchor': 'middle', class: 'sod disp', style: `font-size:${geo.narrow ? 14 : 18}px` });
        }
      }
      beamG = E('g', {}, G);
      E('rect', { x: px - armL - 16, y: py - 6, width: armL + armR + 32, height: 12, rx: 6, fill: 'url(#steelG)', stroke: '#6F8AA6', 'stroke-width': 0.6 }, beamG);
      E('line', { x1: px - armL - 10, x2: px + armR + 10, y1: py - 4, y2: py - 4, stroke: '#9DB4CB', 'stroke-opacity': 0.5, 'stroke-width': 1 }, beamG);
      const scaleG = E('g', { class: 'dscale' }, beamG); B._scaleG = scaleG;
      for (let d = 0; d <= W0.BEAM.scaleMax; d++) {
        const x = px + d * geo.u, big = d % 5 === 0;
        E('line', { x1: x, x2: x, y1: py + 6, y2: py + (big ? 15 : 10), stroke: '#9DB0C2', 'stroke-width': big ? 1.4 : 0.8 }, scaleG);
        if (big && d > 0) T(scaleG, x, py + 28, String(d), { 'text-anchor': 'middle', class: 'fog disp', style: 'font-size:14px' });
      }
      T(scaleG, px + armR + 4, py + 44, 'duration', { 'text-anchor': 'end', class: 'fog', style: 'font-size:12px' });
      scaleG.setAttribute('opacity', B.scaleOn);
      E('circle', { cx: px, cy: py, r: 7, fill: '#0A1524', stroke: '#9DB4CB', 'stroke-width': 1.5 }, G);
      annoG = E('g', { class: 'anno' }, G);
      // tokens
      for (const tk of B.tokens) {
        const w = tk.kind === 'block' ? (geo.narrow ? 88 : 140) : tk.wide ? (geo.narrow ? 86 : 108) : (geo.narrow ? 56 : 88), hh = tk.kind === 'block' ? (geo.narrow ? 54 : 84) : (geo.narrow ? 40 : 58);
        const g = E('g', { class: 'token' + (tk.tap ? ' tappable' : '') }, G);
        if (tk.tap) { g.setAttribute('tabindex', '0'); g.setAttribute('role', 'button'); g.setAttribute('aria-label', tk.aria || tk.label); g.addEventListener('click', () => o.onTap && o.onTap(tk.id)); g.addEventListener('keydown', (e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); o.onTap && o.onTap(tk.id); } }); }
        if (tk.tap) E('rect', { x: -w / 2 - 8, y: -hh - (tk.tag ? (geo.narrow ? 46 : 58) : 8), width: w + 16, height: hh + (tk.tag ? (geo.narrow ? 54 : 66) : 16), fill: 'transparent' }, g);
        const c = cert(g, w, hh, tk.label, tk.sub, { stack: tk.kind === 'block' });
        const tag = tk.tag ? Odo(g, { size: geo.narrow ? 19 : 25, anchor: 'middle' }).at(0, -hh - (geo.narrow ? 24 : 30)) : null;
        const sub = tk.tag ? T(g, 0, -hh - (geo.narrow ? 8 : 11), '', { 'text-anchor': 'middle', style: `font-size:${geo.narrow ? 10.5 : 12.5}px` }) : null;
        tokG[tk.id] = { g, c, tag, sub, w, hh, tk }; if (tag) odos.push(tag);
      }
      // the yield grip
      if (o.handle) {
        hit = E('g', { class: 'grab', tabindex: '0', role: 'slider', 'aria-label': 'Yield on new bonds', 'aria-valuemin': W0.BEAM.yMin, 'aria-valuemax': W0.BEAM.yMax }, G);
        E('circle', { class: 'focusring', r: 27, fill: 'none', stroke: '#FFB447', 'stroke-width': 2 }, hit);
        E('circle', { r: 34, fill: 'transparent' }, hit);
        ring = E('circle', { r: 22, fill: 'none', stroke: '#FFB447', 'stroke-opacity': 0.4, 'stroke-width': 2 }, hit);
        knob = E('circle', { r: 14, fill: '#FFB447', filter: 'url(#glow)' }, hit);
        for (const dx of [-4, 0, 4]) E('line', { x1: dx, x2: dx, y1: -5, y2: 5, stroke: '#0A1524', 'stroke-width': 1.4, 'stroke-linecap': 'round' }, hit);
        readout = Odo(G, { size: geo.narrow ? 20 : 26, anchor: 'middle', cls: 'sodium-odo', tcls: 'disp sod' });
        const fromPointer = (e) => { const r = svg.getBoundingClientRect(); const yy = e.clientY - r.top; const s = Math.max(-0.95, Math.min(0.95, (py - yy) / armL)); const dy = Math.tan(Math.asin(s)) / W0.BEAM.tilt; let y = W0.snapYield(4 + dy); if (o.magnet != null && Math.abs(y - o.magnet) <= 0.25 + 1e-9) y = o.magnet; B.setYield(y, true); };
        hit.addEventListener('pointerdown', (e) => { e.preventDefault(); hit.setPointerCapture(e.pointerId); B.drag = true; hit.focus({ preventScroll: true }); fromPointer(e); });
        hit.addEventListener('pointermove', (e) => { if (B.drag) fromPointer(e); });
        hit.addEventListener('pointerup', () => { B.drag = false; }); hit.addEventListener('pointercancel', () => { B.drag = false; });
        hit.addEventListener('keydown', (e) => {
          const y = 4 + B.dyT, st = W0.BEAM.step; let n = null;
          if (e.key === 'ArrowUp' || e.key === 'ArrowRight') n = y + st; else if (e.key === 'ArrowDown' || e.key === 'ArrowLeft') n = y - st;
          else if (e.key === 'PageUp') n = y + 1; else if (e.key === 'PageDown') n = y - 1; else if (e.key === 'Home') n = W0.BEAM.yMin; else if (e.key === 'End') n = W0.BEAM.yMax;
          if (n != null) { e.preventDefault(); B.setYield(W0.snapYield(n), true); }
        });
      } else if (o.riseLabel) {
        readout = Odo(G, { size: geo.narrow ? 18 : 24, anchor: 'middle', tcls: 'disp sod' });
        B._riseCap = T(G, 0, 0, 'rates', { 'text-anchor': 'middle', class: 'fog', style: 'font-size:12px' });
      }
      B.refresh(true); B.frame(0); if (hit) B.lock(B.locked);
    };
    B.setYield = (y, user) => {
      const dy = y - 4; if (Math.abs(dy - B.dyT) < 1e-9) return; B.dyT = dy;
      if (user) { Sound.detent(); hint(false); } B.refresh(); if (o.onYield) o.onYield(y, user);
    };
    B.setRise = (r) => { B.dyT = r; B.refresh(); };
    B.locked = !!o.locked;
    B.lock = (v) => { B.locked = v; if (hit) { hit.classList.toggle('disabled', v); hit.setAttribute('tabindex', v ? '-1' : '0'); hit.setAttribute('aria-disabled', String(v)); } };
    B.showScale = (v) => { B.scaleT = v ? 1 : 0; };
    B.select = (id) => { B.sel = id; for (const k in tokG) tokG[k].g.classList.toggle('sel', k === id); };
    B.anno = (id, lines) => { B.annos[id] = lines; };
    B.clearAnnos = () => { B.annos = {}; };
    let hinting = false; function hint(v) { hinting = v; }
    B.hint = hint;
    B.refresh = (snap) => {
      for (const k in tokG) { const t = tokG[k]; if (!t.tag) continue; const r = t.tk.tag(B.dyT); t.tag.set(r.price, snap); t.sub.textContent = r.sub || ''; t.sub.setAttribute('class', r.subCls || 'fog'); }
      if (readout) readout.set(o.handle ? p2(4 + B.dyT) : '+' + Number(B.dyT).toFixed(2), snap);
      if (hit) { hit.setAttribute('aria-valuenow', String(4 + B.dyT)); hit.setAttribute('aria-valuetext', p2(4 + B.dyT)); }
    };
    let t0 = 0;
    B.frame = (dt) => {
      if (!geo) return; t0 += dt;
      const prev = B.st.x; spring(B.st, B.dyT, dt, 120, 11); if (dt > 0) Sound.creak((B.st.x - prev) / dt);
      B.scaleOn += (B.scaleT - B.scaleOn) * (RM ? 1 : Math.min(1, dt * 3)); B._scaleG.setAttribute('opacity', B.scaleOn.toFixed(3));
      const th = Math.atan(W0.beamTan(B.st.x)), cs = Math.cos(th), sn = Math.sin(th), { px, py, armL, u } = geo;
      beamG.setAttribute('transform', `rotate(${(th * 180 / Math.PI).toFixed(3)} ${px} ${py})`);
      for (const k in tokG) { const t = tokG[k]; const d = t.tk.d * u; t.x = px + d * cs + 6 * sn; t.y = py + d * sn - 6 * cs; t.g.setAttribute('transform', `translate(${t.x.toFixed(2)} ${t.y.toFixed(2)})`); if (t.tag) t.tag.frame(dt); }
      const lx = px - armL * cs, ly = py - armL * sn;
      if (hit) { hit.setAttribute('transform', `translate(${lx.toFixed(2)} ${ly.toFixed(2)})`); ring.setAttribute('r', hinting && !RM ? 22 + 5 * Math.abs(Math.sin(t0 * 2.6)) : 22); }
      if (readout) { readout.at(lx, ly - (o.handle ? 40 : 26)); readout.frame(dt); if (B._riseCap) { B._riseCap.setAttribute('x', lx); B._riseCap.setAttribute('y', ly - (geo.narrow ? 46 : 54)); B._riseCap.textContent = 'rates up, percentage points'; } }
      // drop annotations: a level line at the pivot's height, a bracket beside the bond, and the arithmetic under the beam
      annoG.innerHTML = '';
      for (const id in B.annos) {
        const t = tokG[id]; if (!t) continue; const lines = B.annos[id]; const bx = px + t.tk.d * u * cs, by = py + t.tk.d * u * sn, ex = bx + t.w / 2 + 10;
        E('line', { x1: px, x2: ex + 6, y1: py, y2: py, stroke: '#9DB0C2', 'stroke-dasharray': '3 4', 'stroke-width': 1 }, annoG);
        if (Math.abs(by - py) > 2) { E('line', { x1: ex, x2: ex, y1: py, y2: by, stroke: '#FF8A7A', 'stroke-width': 2 }, annoG); E('path', { d: `M${ex - 4} ${by - 5} L${ex} ${by} L${ex + 4} ${by - 5}`, fill: 'none', stroke: '#FF8A7A', 'stroke-width': 2 }, annoG); }
        const ty = Math.max(py, by) + (geo.narrow ? 66 : 78);
        lines.forEach((ln, i) => T(annoG, bx, ty + i * (geo.narrow ? 17 : 24), ln.text, { 'text-anchor': 'middle', class: (ln.cls || '') + ' disp', style: `font-size:${geo.narrow ? (ln.big ? 17 : 14) : (ln.big ? 26 : 19)}px` }));
      }
    };
    B.tokenAt = (id) => tokG[id];
    return B;
  }

  // ======================= the Fed dial =======================
  function Dial(o) {
    const Dl = { i: o.i || 0, st: { x: 0, v: 0 }, enabled: o.enabled !== false };
    let g, knobG, geo, hitEl, ticks = [];
    const ang = (i) => o.from + (o.to - o.from) * i / (o.n - 1);
    Dl.st.x = ang(Dl.i);
    Dl.build = (parent, cx, cy, R) => {
      geo = { cx, cy, R }; g = E('g', { class: 'dial' + (Dl.enabled ? '' : ' disabled') }, parent); ticks = [];
      E('circle', { cx, cy, r: R + 14, fill: '#0E1B2D', stroke: '#2B425C', 'stroke-width': 1 }, g);
      for (let i = 0; i < o.n; i++) {
        const a = ang(i) * Math.PI / 180, big = o.major ? o.major(i) : true;
        const l = E('line', { x1: cx + Math.sin(a) * (R + 4), y1: cy - Math.cos(a) * (R + 4), x2: cx + Math.sin(a) * (R + (big ? 12 : 8)), y2: cy - Math.cos(a) * (R + (big ? 12 : 8)), stroke: '#4A6580', 'stroke-width': big ? 2 : 1 }, g);
        ticks.push(l);
        const lab = o.label && o.label(i); if (lab) T(g, cx + Math.sin(a) * (R + 26), cy - Math.cos(a) * (R + 26) + 4, lab, { 'text-anchor': 'middle', class: 'fog', style: `font-size:${o.labelSize || 11}px` });
      }
      hitEl = E('g', { class: 'grab', tabindex: Dl.enabled ? '0' : '-1', role: 'slider', 'aria-label': o.aria, 'aria-valuemin': 0, 'aria-valuemax': o.n - 1 }, g);
      E('circle', { class: 'focusring', cx, cy, r: R + 4, fill: 'none', stroke: '#FFB447', 'stroke-width': 2 }, hitEl);
      E('circle', { cx, cy, r: R + 16, fill: 'transparent' }, hitEl);
      knobG = E('g', {}, hitEl);
      E('circle', { cx, cy, r: R, fill: 'url(#steelG)', stroke: '#6F8AA6', 'stroke-width': 1 }, knobG);
      for (let k = 0; k < 36; k++) { const a = k * 10 * Math.PI / 180; E('line', { x1: cx + Math.sin(a) * R * 0.82, y1: cy - Math.cos(a) * R * 0.82, x2: cx + Math.sin(a) * R * 0.96, y2: cy - Math.cos(a) * R * 0.96, stroke: '#0A1524', 'stroke-width': 1.2, 'stroke-opacity': 0.55 }, knobG); }
      E('circle', { cx, cy, r: R * 0.62, fill: '#132338', stroke: '#2B425C' }, knobG);
      E('line', { x1: cx, y1: cy - R * 0.18, x2: cx, y2: cy - R * 0.78, stroke: '#FFB447', 'stroke-width': 4, 'stroke-linecap': 'round', filter: 'url(#glow)' }, knobG);
      const fromPointer = (e) => { const r = svg.getBoundingClientRect(); const x = e.clientX - r.left - cx, y = e.clientY - r.top - cy; let a = Math.atan2(x, -y) * 180 / Math.PI; let best = 0, bd = 1e9; for (let i = 0; i < o.n; i++) { const d = Math.abs(ang(i) - a); if (d < bd) { bd = d; best = i; } } Dl.set(best, true); };
      hitEl.addEventListener('pointerdown', (e) => { if (!Dl.enabled) return; e.preventDefault(); hitEl.setPointerCapture(e.pointerId); Dl.drag = true; hitEl.focus({ preventScroll: true }); fromPointer(e); });
      hitEl.addEventListener('pointermove', (e) => { if (Dl.drag) fromPointer(e); });
      hitEl.addEventListener('pointerup', () => { Dl.drag = false; }); hitEl.addEventListener('pointercancel', () => { Dl.drag = false; });
      hitEl.addEventListener('keydown', (e) => { if (!Dl.enabled) return; let n = null; if (e.key === 'ArrowUp' || e.key === 'ArrowRight') n = Dl.i + 1; else if (e.key === 'ArrowDown' || e.key === 'ArrowLeft') n = Dl.i - 1; else if (e.key === 'Home') n = 0; else if (e.key === 'End') n = o.n - 1; if (n != null) { e.preventDefault(); Dl.set(Math.max(0, Math.min(o.n - 1, n)), true); } });
      Dl.aria(); Dl.frame(0);
    };
    Dl.aria = () => { if (!hitEl) return; hitEl.setAttribute('aria-valuenow', Dl.i); hitEl.setAttribute('aria-valuetext', o.valueText(Dl.i)); hitEl.setAttribute('aria-disabled', String(!Dl.enabled)); ticks.forEach((t, i) => t.setAttribute('stroke', i <= Dl.i ? '#FFB447' : '#4A6580')); };
    Dl.set = (i, user) => { i = Math.max(0, Math.min(o.n - 1, i)); if (i === Dl.i) return; Dl.i = i; if (user) Sound.detent(); Dl.aria(); if (o.onChange) o.onChange(i, user); };
    Dl.enable = (v) => { Dl.enabled = v; if (g) { g.classList.toggle('disabled', !v); hitEl.setAttribute('tabindex', v ? '0' : '-1'); Dl.aria(); } };
    let t0 = 0;
    Dl.frame = (dt) => { t0 += dt; if (!geo) return; spring(Dl.st, ang(Dl.i), dt, 160, 16); knobG.setAttribute('transform', `rotate(${Dl.st.x.toFixed(2)} ${geo.cx} ${geo.cy})`); };
    Dl.focus = () => hitEl && hitEl.focus({ preventScroll: true });
    return Dl;
  }

  // ======================= stage plumbing =======================
  let scene = null, W = 800, H = 600;
  function setBg(src, alt) { const bg = $('#stageBg'); if (src) { bg.src = src; bg.alt = alt || ''; bg.classList.add('on'); $('#stageShade').classList.add('on'); } else { bg.classList.remove('on', 'dim'); $('#stageShade').classList.remove('on'); bg.alt = ''; } }
  function mount(sc) {
    if (scene && scene.destroy) scene.destroy();
    scene = sc; overlay.innerHTML = ''; setBg(null); stage.classList.toggle('tallstage', !!sc.tall); layoutStage();
  }
  function layoutStage() {
    const r = stage.getBoundingClientRect(); W = Math.max(300, Math.round(r.width)); H = Math.max(260, Math.round(r.height));
    svg.setAttribute('viewBox', `0 0 ${W} ${H}`); svg.innerHTML = ''; baseDefs();
    if (scene) scene.layout(W, H);
  }
  function describe(s) { stageDesc.textContent = s; }
  let lastT = performance.now();
  function loop(t) { const dt = Math.min(0.05, (t - lastT) / 1000); lastT = t; if (scene && scene.frame) scene.frame(dt); requestAnimationFrame(loop); }
  requestAnimationFrame(loop);
  let rT = null; new ResizeObserver(() => { clearTimeout(rT); rT = setTimeout(layoutStage, 60); }).observe(stage);
  // "Example" and "Your numbers" switch for steps with a worked example on the stage.
  function modeSwitch(sc, cur) {
    const wrap = document.createElement('div'); wrap.className = 'showing'; wrap.setAttribute('role', 'group'); wrap.setAttribute('aria-label', 'What the stage shows');
    wrap.innerHTML = `<button type="button" data-m="example">Worked example</button><button type="button" data-m="mine">Your numbers</button>`;
    overlay.appendChild(wrap);
    const set = (m) => { $$('button', wrap).forEach((b) => b.setAttribute('aria-pressed', String(b.dataset.m === m))); };
    $$('button', wrap).forEach((b) => b.addEventListener('click', () => { sc.show(b.dataset.m, true); }));
    set(cur); return set;
  }

  // ======================= state =======================
  // Round three (2026-11-19): one flow, eleven steps, the receipt. A practice-and-check tool for what Unit 4's pages teach.
  let S = { code: '', tasks: [], log: {}, memo: '', notes: {}, at: 'start', practice: 0 };
  const blankLog = () => { const l = {}; D.STEPS.forEach((s) => { l[s.id] = { done: false, attempts: 0, help: 0 }; }); return l; };
  function save() { if (S.practice || !S.code) return; store.set(KEY + ':' + D.seedFor(S.code), { code: S.code, log: S.log, memo: S.memo, notes: S.notes, at: S.at }); store.set(KEY + ':last', S.code); }
  function startFor(code) {
    S.code = h.normCode(code); S.tasks = D.buildTasks(S.code); S.practice = 0;
    const saved = store.get(KEY + ':' + D.seedFor(S.code));
    S.log = saved && saved.log ? saved.log : blankLog(); D.STEPS.forEach((s) => { if (!S.log[s.id]) S.log[s.id] = { done: false, attempts: 0, help: 0 }; });
    S.memo = saved && saved.memo ? saved.memo : ''; S.notes = saved && saved.notes ? saved.notes : {};
    S.at = saved && saved.at ? saved.at : D.STEPS[0].id; save();
  }
  const doneCount = () => D.STEPS.filter((s) => S.log[s.id] && S.log[s.id].done).length;
  const idx = (id) => D.STEPS.findIndex((x) => x.id === id);
  const task = (id) => S.tasks.find((t) => t.id === id);
  function markDone(id) { const L = S.log[id]; if (!L.done) { L.done = true; L.at = new Date().toISOString(); } save(); renderTape(); }
  const nextId = (id) => { const i = idx(id); return i >= 0 && i < D.STEPS.length - 1 ? D.STEPS[i + 1].id : 'receipt'; };
  const TITLES = { q1: 'Back to 2022', quote: 'Read a Quote', seesaw: 'Which Way the Price Moves', q2: 'Old Bond, New Rates', dur1: 'Duration', q3: 'Which Loses Most?', spread: 'Spread over Treasuries', q4: 'Dragovia', pr: 'One Sentence That Moved a Market', bridge: 'A Bank’s Big Bet', note: 'Bonds or Shares?' };
  const nextLabel = (id) => { const n = nextId(id); return n === 'receipt' ? 'Go to your receipt' : 'Next: ' + TITLES[n]; };

  // ======================= the progress bar (named steps) =======================
  function renderTape() {
    const ol = $('#tape'); ol.innerHTML = '';
    $('#codeNote').innerHTML = S.code ? `Desk code <b class="code">${h.fmtCode(S.code)}</b>` : '';
    if (!S.code) return;
    [...D.STEPS, { id: 'receipt' }].forEach((s, i) => {
      const li = document.createElement('li'); const b = document.createElement('button'); b.type = 'button'; b.className = 'notch';
      const isR = s.id === 'receipt', done = isR ? doneCount() === D.STEPS.length : S.log[s.id].done, name = isR ? 'Receipt' : TITLES[s.id];
      if (done) b.classList.add('done'); if (S.at === s.id) b.setAttribute('aria-current', 'step');
      b.setAttribute('aria-label', isR ? 'Receipt' : `Step ${i + 1}, ${name}${done ? ', finished' : ', not finished yet'}`);
      b.title = name; b.innerHTML = `<span aria-hidden="true">${isR ? '✓' : done ? '✓' : i + 1}</span>`;
      b.addEventListener('click', () => go(s.id)); li.appendChild(b); ol.appendChild(li);
    });
    const cur = $('#stepName'); if (cur) cur.textContent = S.at === 'receipt' ? 'Receipt' : TITLES[S.at] || '';
  }

  // ======================= the treasurer (one recurring person, where she makes a question clearer) =======================
  function portraitBody(who) {
    const sk = '#C9A27E', rim = '#E8A33D';
    return {
      boss: `<path d="M8 64c2-14 11-20 24-20s22 6 24 20z" fill="#2E4A6B"/><path d="M26 45l6 9 6-9" fill="#F4F6F8"/><ellipse cx="32" cy="28" rx="10" ry="12" fill="${sk}"/><path d="M21 30c-1-12 6-17 11-17s13 4 11 17c-2-6-6-9-11-9s-9 3-11 9z" fill="#2B2420"/><g fill="none" stroke="#14233A" stroke-width="1.4"><circle cx="28" cy="29" r="3.2"/><circle cx="36.5" cy="29" r="3.2"/><path d="M31.2 29h2.1"/></g>`,
      minister: `<path d="M8 64c2-14 11-20 24-20s22 6 24 20z" fill="#16263A"/><path d="M16 50l30 12" stroke="#D9534F" stroke-width="5"/><ellipse cx="32" cy="28" rx="10" ry="12" fill="${sk}"/><path d="M22 26c0-8 4-11 10-11s10 3 10 11c-3-4-6-5-10-5s-7 1-10 5z" fill="#3B3B3B"/><rect x="29" y="50" width="6" height="14" rx="2" fill="#0A1524"/><circle cx="32" cy="50" r="4" fill="#0A1524" stroke="#9DB0C2"/>`,
    }[who] || '';
  }
  const portrait = (who, size) => `<svg class="portrait" viewBox="0 0 64 64" width="${size || 52}" height="${size || 52}" aria-hidden="true"><circle cx="32" cy="32" r="31" fill="#DCE6EF"/><g style="clip-path:circle(31px at 32px 32px)">${portraitBody(who)}</g></svg>`;
  const speaker = (line) => `<div class="speaker" id="spk">${portrait('boss')}<div><p class="who">The treasurer, your boss</p><p class="say" id="say">${line}</p></div></div>`;
  function say(line) { const p = $('#say'); if (p) p.innerHTML = line; }

  // ======================= the console: one question per screen, the same layout every time =======================
  const con = $('#console');
  const fb = (html, ok) => { const f = $('#fb'); f.className = 'fb ' + (ok == null ? '' : ok ? 'ok' : 'bad'); f.innerHTML = html; };
  const SHOWV = (l) => SHOW[l.kind](l.num);
  // number boxes from version 1's lines: label, the box, a mark, and the formula printed under it
  const boxesHtml = (lines, rows, words) => `<div class="boxes">${lines.map((l, i) => (!l.input ? '' : `<div class="nbox"><label for="r${i}">${esc((words && words[i] && words[i][0]) || l.label)}</label><div class="inrow"><input id="r${i}" class="rowin" data-row="${i}" inputmode="decimal" autocomplete="off" placeholder="${PH[l.kind]}" value="${rows && rows[i] != null ? esc(rows[i]) : ''}"><span class="mark" id="mk${i}" aria-live="polite"></span></div><p class="formula">${esc((words && words[i] && words[i][1]) || l.calc)}</p></div>`)).join('')}</div>`;
  const exampleHtml = (ex) => `<details class="worked" open><summary>Worked example: ${esc(ex.cap)}</summary><div class="wcards">${ex.cards.map(([a, b, c]) => `<div class="wcard"><p class="wl">${esc(a)}</p><p class="wv">${esc(b)}</p><p class="wf">${esc(c)}</p></div>`).join('')}</div></details>`;
  const chips = (name, opts, cur) => `<div class="tickets" role="radiogroup">${opts.map(([v, tx]) => `<label class="ticket"><input type="radio" name="${name}" value="${esc(v)}" ${String(cur) === String(v) ? 'checked' : ''}><span>${tx}</span></label>`).join('')}</div>`;
  // Worked examples in the words of Reading a Bond's Numbers (w04/drafts/resource-howto.md), except Puerto Rico's
  // percent fall, which no page teaches, so the desk teaches it here.
  const EX = {
    quote: { cap: 'a bond quoted at 102.25', cards: [['Quote', '102.25', 'its price as a percentage of face value'], ['Price of one bond', '$1,022.50', '102.25 ÷ 100 × $1,000']] },
    dur1: (t) => (t.D * t.dy === 16 ? { cap: '$10,000 of bonds with a duration of 7; rates rise 0.5 percentage point', cards: [['Percent the price falls', 'about 3.5%', 'duration × rise in rates = 7 × 0.5'], ['Dollars lost', 'about $350', '3.5% × $10,000']] }
      : { cap: '$10,000 of bonds with a duration of 8; rates rise 2 percentage points', cards: [['Percent the price falls', 'about 16%', 'duration × rise in rates = 8 × 2'], ['Dollars lost', 'about $1,600', '16% × $10,000']] }),
    spread: { cap: 'Dick’s 30-year bonds yielded 4.11%; a 30-year Treasury, 2.11%', cards: [['In percentage points', '2.00', 'Dick’s yield − Treasury yield = 4.11 − 2.11'], ['In basis points', '200', '2.00 × 100']] },
    pr: { cap: 'a bond’s quote falls from 80 to 60', cards: [['Fall in the quote', '20', 'starting quote − new quote = 80 − 60'], ['Percent fall', '25%', 'fall ÷ starting quote = 20 ÷ 80']] },
    bridge: { cap: 'a bank holds $4 billion of bonds with a duration of 5; rates rise 2 percentage points', cards: [['Percent the price falls', '10%', '5 × 2'], ['Loss, in billions', '$0.4 billion', '10% × $4 billion']] },
  };
  // One screen: step number, title, the scene in one line, the treasurer if she helps, what to do, the question, Check
  // and a hint that is always there, the worked example open, what happened, and the button to the next step.
  function screen(s, o) {
    const L = S.log[s.id];
    con.innerHTML = `${S.practice ? `<p class="practice"><b>Practice round ${S.practice}.</b> New numbers, not graded.</p>` : ''}<p class="kicker">Step ${idx(s.id) + 1} of ${D.STEPS.length}</p><h2 id="t">${esc(TITLES[s.id])}</h2>
      ${o.scene ? `<p class="scene">${o.scene}</p>` : ''}${o.boss ? speaker(o.boss) : ''}${o.ask ? `<p class="ask">${o.ask}</p>` : ''}
      <div id="controls">${o.body || ''}</div>
      ${o.example ? exampleHtml(o.example) : ''}
      <div class="actions" id="actRow">${o.check === false ? '' : `<button class="btn" type="button" id="checkBtn">${o.checkLabel || 'Check'}</button>`}${o.hint ? `<button class="btn quiet" type="button" id="hintBtn">${o.hintLabel || 'Show me the first blank'}</button>` : ''}</div>
      <div class="fb" id="fb" aria-live="polite"></div><div class="helpbox" id="helpBox" aria-live="polite"></div>
      <div class="actions" id="nextRow" ${L.done ? '' : 'hidden'}><button class="btn go" type="button" id="nextBtn">${esc(nextLabel(s.id))}</button></div>
      <nav class="pager" aria-label="Previous and next step">${idx(s.id) > 0 ? `<button type="button" data-go="${D.STEPS[idx(s.id) - 1].id}">Back</button>` : '<span></span>'}<button type="button" data-go="${nextId(s.id)}">Skip for now</button></nav>`;
    $$('[data-go]', con).forEach((b) => b.addEventListener('click', () => go(b.dataset.go)));
    $('#nextBtn').addEventListener('click', () => go(nextId(s.id)));
    if (o.hint) $('#hintBtn').addEventListener('click', () => { const lvl = Math.min(2, (L.help || 0) + 1); L.help = Math.max(L.help || 0, lvl); save(); $('#helpBox').innerHTML = o.hint(lvl); $('#hintBtn').textContent = o.hintLabel ? 'Show me the answer' : 'Show me every line'; });
  }
  const showNext = () => { const r = $('#nextRow'); r.hidden = false; setTimeout(() => r.scrollIntoView({ block: 'nearest', behavior: RM ? 'auto' : 'smooth' }), 60); };
  // Number steps: judge the rows (and a choice, when the step has one), mark each box, say what went wrong for that slip.
  function wireRows(s, o) {
    const t = task(s.id), L = S.log[s.id], lines = C.linesFor(t);
    const rowsNow = () => { const r = []; $$('.rowin', con).forEach((x) => { r[Number(x.dataset.row)] = x.value; }); return r; };
    $$('.rowin', con).forEach((x) => x.addEventListener('input', () => { if (!L.done) { L.rows = rowsNow(); save(); } if (o.onInput) o.onInput(rowsNow()); }));
    const mark = (res) => (res.rowRes || []).forEach((rr, i) => { const x = $(`.rowin[data-row="${i}"]`), mk = $('#mk' + i); if (!x || rr == null) return; x.classList.toggle('good', rr.ok); x.classList.toggle('wrong', !rr.ok); mk.className = 'mark ' + (rr.ok ? 'ok' : 'no'); mk.textContent = rr.ok ? '✓' : '✗'; mk.setAttribute('aria-label', rr.ok ? 'right' : 'not yet'); });
    const run = () => {
      const rows = rowsNow(), ch = o.choice ? (($(`input[name=${o.choice}]:checked`, con) || {}).value || null) : null;
      const res = C.judgeTask(t, { rows, choice: ch, value: null }, h); L.attempts = (L.attempts || 0) + 1;
      if (res.ok || !L.done) { L.rows = rows; L.choice = ch; L.value = null; }
      mark(res); if (o.onRows) o.onRows(res.rowRes || [], res.ok, rows);
      if (res.ok) { markDone(s.id); Sound.chime(); fb('<b>Right.</b> ' + (o.praise ? o.praise(t) : C.praise(t, h)), true); showNext(); if (o.onDone) o.onDone(); }
      else { L.fails = (L.fails || 0) + 1; Sound.miss(); let msg = res.msg || 'Check your numbers.'; const bad = (res.rowRes || []).findIndex((x) => x && !x.ok), w = o.words && o.words[bad];
        if (w) msg = res.rowRes[bad].code === 'other' || res.rowRes[bad].code === 'close' ? `${w[0]}: ${w[1]}.` : msg.replace(/^[^:]+:/, w[0] + ':');
        fb('<b>Not yet.</b> ' + esc(msg), false); if (o.onMiss) o.onMiss(rows); }
      save();
    };
    $('#checkBtn').addEventListener('click', run);
    $$('.rowin', con).forEach((x) => x.addEventListener('keydown', (e) => { if (e.key === 'Enter') { e.preventDefault(); run(); } }));
    if (L.done && L.rows) { const res = C.judgeTask(t, { rows: L.rows, choice: L.choice }, h); mark(res); if (o.onRows) o.onRows(res.rowRes || [], res.ok, L.rows); fb('<b>Right.</b> ' + (o.praise ? o.praise(t) : C.praise(t, h)), true); }
    if (o.onInput) o.onInput(L.rows || []);
  }
  // Choice steps: version 1's one-question checks, wrong-answer text written for each option.
  function wireQuiz(s, onAnswer, onPick) {
    const L = S.log[s.id], q = C.quiz[s.quiz];
    if (onPick) $$('input[name=q]', con).forEach((r) => r.addEventListener('change', () => onPick(Number(r.value))));
    $('#checkBtn').addEventListener('click', () => {
      const c = $('input[name=q]:checked', con); if (!c) { fb('Choose an answer first.', false); return; }
      const pick = Number(c.value); L.attempts = (L.attempts || 0) + 1; const ok = D.judgeQuiz(s.quiz, pick).ok;
      if (ok || !L.done) L.choice = pick; if (ok) { markDone(s.id); Sound.chime(); showNext(); } else Sound.miss();
      fb((ok ? '<b>Right.</b> ' : '<b>Not yet.</b> ') + esc(q.why[pick].replace(/^Right\.\s*/, '')) + (!ok && L.done ? ' Your earlier right answer is still saved.' : ''), ok); save();
      if (onAnswer) onAnswer(pick, ok);
    });
    if (L.done) fb('<b>Right.</b> ' + esc(q.why[q.answer].replace(/^Right\.\s*/, '')), true);
  }
  const quizHtml = (s) => { const L = S.log[s.id], q = C.quiz[s.quiz]; return chips('q', W0.optOrder(q).map((j) => [j, esc(q.options[j])]), L.choice); };

  const SOURCES = '<p>U.S. Treasury, <a href="https://home.treasury.gov/resource-center/data-chart-center/interest-rates/TextView?type=daily_treasury_yield_curve&field_tdr_date_value=2022" target="_blank" rel="noopener">Daily Treasury Par Yield Curve Rates</a>, 2022. Federal Reserve, <a href="https://www.federalreserve.gov/monetarypolicy/openmarket.htm" target="_blank" rel="noopener">2022 rate decisions</a>. Dick’s Sporting Goods, <a href="https://www.sec.gov/cgi-bin/browse-edgar?action=getcompany&CIK=0001089063&type=10-K" target="_blank" rel="noopener">annual reports</a> (the daily line for its bond is an estimate between reported values). FINRA, <a href="https://www.finra.org/investors/investing/investment-products/bonds" target="_blank" rel="noopener">Bonds</a> and <a href="https://www.finra.org/investors/insights/bonds-interest-rate-changes-duration" target="_blank" rel="noopener">Interest Rate Changes and Duration</a>. The Bond Buyer, <a href="https://www.bondbuyer.com/news/puerto-rico-municipal-bonds-fall-after-trumps-debt-forgiveness-remarks" target="_blank" rel="noopener">October 4, 2017</a>. Federal Reserve, <a href="https://www.federalreserve.gov/publications/files/svb-review-20230428.pdf" target="_blank" rel="noopener">Review of the Supervision of Silicon Valley Bank</a>, page 22. Photos: U.S. Treasury (1918 bond), Yuisa Rios/FEMA (Puerto Rico), Federal Reserve Board (Eccles Building), all public domain.</p>';

  // ======================= scenes =======================
  const NARROW = () => W < 600;
  const seesawTokens = (tap) => W0.SEESAW_BONDS.map((b) => ({ id: b.id, d: b.d, label: b.id === 'short' ? '2-year' : '30-year', sub: '4% coupon', tap, aria: b.label,
    tag: (dy) => { const pr = W0.seesawPrice(b.years, 4 + dy); return { price: money(pr), sub: pr === 1000 ? 'at face value' : signed(pr - 1000), subCls: pr < 1000 ? 'coral' : pr > 1000 ? 'sod' : 'fog' }; } }));
  function beamLayout(Wd, Hd, o) {
    const n = Wd < 600; o = o || {};
    const px = Wd * (n ? 0.45 : 0.42), py = Hd * (o.py || (n ? 0.56 : 0.55)), armL = n ? px - 74 : Wd * 0.26, armR = Math.min(Wd - px - (n ? 32 : 70), 640);
    return { px, py, armL, armR };
  }
  function seesawCaption(y) {
    if (y < 4) return 'Both prices are above $1,000, because new bonds now pay less than these bonds’ 4% coupon.';
    if (y > 4) return 'Both prices are below $1,000, because new bonds now pay more than these bonds’ 4% coupon.';
    return 'At a 4% yield, new bonds pay the same as these bonds’ 4% coupon, so both sell for their $1,000 face value.';
  }
  // A verdict stamped on the stage, so the result lands where the player is looking (and on a phone, where the stage is).
  function stamp(text, ok) { $$('.stamp', overlay).forEach((x) => x.remove()); const el = document.createElement('div'); el.className = 'stamp ' + (ok ? 'ok' : 'no'); el.textContent = text; el.setAttribute('aria-hidden', 'true'); overlay.appendChild(el); setTimeout(() => el.remove(), RM ? 1800 : 2300); }
  function capEl(html) { const p = document.createElement('p'); p.className = 'cap'; p.innerHTML = html; overlay.appendChild(p); return p; }

  // ---- start: the beam as a toy ----
  function sceneStart() {
    const ten = { id: 'ten', d: W0.modDur(0.04, 10, 0.04), label: '10-year', sub: '4% coupon',
      tag: (dy) => { const pr = W0.seesawPrice(10, 4 + dy); return { price: money(pr), sub: pr === 1000 ? 'at face value' : signed(pr - 1000), subCls: pr < 1000 ? 'coral' : pr > 1000 ? 'sod' : 'fog' }; } };
    const startCap = (y) => (y < 4 ? 'The price is above $1,000, because new bonds now pay less than this bond’s 4% coupon.' : y > 4 ? 'The price is below $1,000, because new bonds now pay more than this bond’s 4% coupon.' : 'At a 4% yield, new bonds pay the same as this bond’s 4% coupon, so it sells for its $1,000 face value.');
    const beam = Beam({ tokens: [ten], handle: true, yieldScale: true, onYield: (y) => { cap.textContent = startCap(y); describeBeam(y); } });
    let cap; beam.hint(true);
    const describeBeam = (y) => describe(`A beam on a pivot with one 10-year bond. Yield ${p2(y)}. The bond sells for ${money(W0.seesawPrice(10, y))}.`);
    return {
      layout(Wd, Hd) {
        const g = beamLayout(Wd, Hd, { py: NARROW() ? 0.6 : 0.6 }); backdrop(Wd, Hd, { pool: [g.px + g.armR * 0.3, g.py + 60, g.armR * 1.1], cone: [g.px + g.armR * 0.35, g.py + 40, g.armR * 0.85] });
        beam.build(svg, g.px, g.py, g.armL, g.armR, Wd, Hd);
        overlay.innerHTML = ''; cap = capEl(startCap(4 + beam.dyT)); if (NARROW()) cap.style.display = 'none';
        if (!NARROW() && Hd > 560) {
          const fig = document.createElement('figure'); fig.style.cssText = 'position:absolute;margin:0;right:4%;top:5%;width:min(19%,190px);transform:rotate(2deg);pointer-events:auto';
          fig.innerHTML = `<img src="img/liberty-bond.webp" alt="${esc(BOND_IMG.libertyAlt)}" style="width:100%;display:block;filter:sepia(.2) brightness(.9);box-shadow:0 22px 40px rgba(0,0,0,.6)"><figcaption style="margin-top:10px;color:var(--fog);font-size:12px;line-height:1.4;transform:rotate(-2deg)">${esc(BOND_IMG.libertyCap)}</figcaption>`;
          overlay.appendChild(fig);
        }
        const hintT = T(svg, g.px - g.armL - 16, g.py + (NARROW() ? 84 : 100), 'Drag the gold grip up or down', { class: 'sod disp', style: `font-size:${NARROW() ? 17 : 22}px` });
        describeBeam(4 + beam.dyT); this._hintT = hintT;
      },
      frame(dt) { beam.frame(dt); if (this._hintT) this._hintT.setAttribute('opacity', beam.dyT === 0 ? 1 : 0); },
    };
  }

  // ---- step 1: replay 2022 ----
  function sceneReplay(s, hooks, full) {
    const F = W0.FED_2022, T22 = W0.T22, L = S.log[s.id];
    let reveal = L.done || full ? T22.length - 1 : 0, i0 = L.done || full ? F.length - 1 : 0;
    const dial = Dial({ n: F.length, i: i0, from: -125, to: 125, aria: 'Fed meeting dial, 2022', label: (i) => (W >= 600 && (i === 0 || i === F.length - 1) ? F[i].label : ''),
      valueText: (i) => `${F[i].label}, 2022. Fed range ${p2(F[i].lo)} to ${p2(F[i].hi)}`, onChange: (i) => { update(i); hooks.onDial(i); } });
    let G, pth2, pth10, band, dot2, dot10, lab2, lab10, odo, dksSub, date, range, note, X, Y, chart, dksG;
    function tgtIdx(i) { return i === F.length - 1 ? T22.length - 1 : W0.dayIndex(F[i].date); }
    function update(i) {
      date.textContent = F[i].label + ', 2022'; range.textContent = `Fed’s range ${p2(F[i].lo)} to ${p2(F[i].hi)}`; note.textContent = F[i].note;
      describe(`${F[i].label}, 2022. The Fed’s range is ${p2(F[i].lo)} to ${p2(F[i].hi)}. The 2-year Treasury rate is ${p2(T22[tgtIdx(i)][1])} and the 10-year is ${p2(T22[tgtIdx(i)][2])}.`);
    }
    function pathTo(col, k) { let d = ''; for (let j = 0; j <= k; j++) d += (j ? 'L' : 'M') + X(j).toFixed(1) + ' ' + Y(T22[j][col]).toFixed(1); return d; }
    return {
      dial,
      layout(Wd, Hd) {
        const n = Wd < 600; backdrop(Wd, Hd);
        chart = n ? { x0: 36, x1: Wd - 92, y0: 26, y1: Hd - 150 } : { x0: 56, x1: Wd - 150, y0: 44, y1: Hd - 230 };
        setBg('img/eccles-2011.webp', ''); $('#stageBg').classList.add('dim');
        X = (j) => chart.x0 + (chart.x1 - chart.x0) * j / (T22.length - 1); Y = (v) => chart.y1 - (chart.y1 - chart.y0) * v / 5;
        G = E('g', {}, svg);
        for (let v = 0; v <= 5; v++) { E('line', { x1: chart.x0, x2: chart.x1, y1: Y(v), y2: Y(v), stroke: '#1E3149', 'stroke-width': 1 }, G); T(G, chart.x0 - 8, Y(v) + 4, v + '%', { 'text-anchor': 'end', class: 'fog', style: 'font-size:11px' }); }
        const months = n ? 'JFMAMJJASOND' : null; ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'].forEach((m, k) => { const j = W0.dayIndex(`2022-${String(k + 1).padStart(2, '0')}-01`) + (k ? 1 : 0); T(G, X(j), chart.y1 + 16, n ? months[k] : m, { 'text-anchor': 'start', class: 'fog', style: 'font-size:11px' }); });
        band = E('path', { fill: '#2B425C', 'fill-opacity': 0.55 }, G);
        pth10 = E('path', { fill: 'none', stroke: '#9DB0C2', 'stroke-width': 2, 'stroke-dasharray': '6 4' }, G);
        pth2 = E('path', { fill: 'none', stroke: '#E9EEF2', 'stroke-width': 2.6 }, G);
        dot2 = E('circle', { r: 4.5, fill: '#E9EEF2' }, G); dot10 = E('circle', { r: 4, fill: '#0A1524', stroke: '#9DB0C2', 'stroke-width': 2 }, G);
        lab2 = T(G, 0, 0, '', { class: 'disp', style: `font-size:${n ? 13 : 16}px` }); lab10 = T(G, 0, 0, '', { class: 'disp fog', style: `font-size:${n ? 13 : 16}px` });
        this._fedLab = T(G, 0, 0, 'Fed’s range', { 'text-anchor': 'end', class: 'fog', style: 'font-size:11px' });
        // dial and readout
        const R = n ? 30 : 50, cx = n ? 50 : 104, cy = n ? Hd - 62 : Hd - 108;
        dial.build(svg, cx, cy, R);
        if (full && !n) { const c = capEl('Turn the Fed’s dial to replay 2022.'); c.style.textAlign = 'right'; }
        const rx = cx + R + (n ? 30 : 48);
        date = T(svg, rx, cy - (n ? 14 : 18), '', { class: 'disp', style: `font-size:${n ? 24 : 34}px;font-weight:800` });
        range = T(svg, rx, cy + (n ? 6 : 10), '', { style: `font-size:${n ? 12.5 : 15}px` });
        note = T(svg, rx, cy + (n ? 22 : 30), '', { class: 'sod', style: `font-size:${n ? 12 : 14}px` });
        // Dick's bond
        dksG = E('g', {}, svg);
        const dx = n ? Wd - 14 : Wd - 40, dy = n ? Hd - 40 : Hd - 100;
        T(dksG, dx, dy - (n ? 36 : 52), n ? 'Dick’s 30-year bond' : 'Dick’s Sporting Goods 30-year bond', { 'text-anchor': 'end', class: 'fog', style: `font-size:${n ? 11.5 : 13.5}px` });
        odo = Odo(dksG, { size: n ? 26 : 44, anchor: 'end' }).at(dx, dy);
        this._dksPre = T(dksG, dx, dy - 4, 'Sold on January 14', { 'text-anchor': 'end', class: 'disp', style: `font-size:${n ? 18 : 26}px` });
        dksSub = T(dksG, dx, dy + (n ? 16 : 22), '', { 'text-anchor': 'end', class: 'fog', style: `font-size:${n ? 10.5 : 12.5}px` });
        this._sold = null; update(dial.i);
        this.frame(0);
      },
      frame(dt) {
        if (!pth2) return; dial.frame(dt);
        const tgt = tgtIdx(dial.i); reveal += (tgt - reveal) * (RM ? 1 : Math.min(1, dt * 2.6)); if (Math.abs(tgt - reveal) < 0.3) reveal = tgt;
        const k = Math.max(0, Math.round(reveal));
        pth2.setAttribute('d', pathTo(1, k)); pth10.setAttribute('d', pathTo(2, k));
        // Fed band: stepped, up to day k
        let top = '', bot = ''; for (let j = 0; j <= k; j++) { const r = W0.rangeOn(T22[j][0]); top += (j ? 'L' : 'M') + X(j).toFixed(1) + ' ' + Y(r.hi).toFixed(1); bot = 'L' + X(j).toFixed(1) + ' ' + Y(r.lo).toFixed(1) + bot; }
        band.setAttribute('d', top + bot + 'Z');
        const a = T22[k], y2 = Y(a[1]), y10 = Y(a[2]);
        dot2.setAttribute('cx', X(k)); dot2.setAttribute('cy', y2); dot10.setAttribute('cx', X(k)); dot10.setAttribute('cy', y10);
        const sep = 16, up2 = y2 <= y10; let l2 = y2 + 5, l10 = y10 + 5; if (Math.abs(y2 - y10) < sep) { if (up2) { l2 = Math.min(y2, y10) - 2; l10 = l2 + sep; } else { l10 = Math.min(y2, y10) - 2; l2 = l10 + sep; } }
        lab2.setAttribute('x', X(k) + 9); lab2.setAttribute('y', l2); lab2.textContent = `2-year ${p2(a[1])}`;
        lab10.setAttribute('x', X(k) + 9); lab10.setAttribute('y', l10); lab10.textContent = `10-year ${p2(a[2])}`;
        const dv = W0.dicksOn(a[0]);
        odo.g.setAttribute('opacity', dv ? 1 : 0); this._dksPre.setAttribute('opacity', dv ? 0 : 1);
        if (!dv) dksSub.textContent = '';
        else { odo.set(money(dv[1]), false); dksSub.textContent = k >= T22.length - 1 ? (NARROW() ? 'per $1,000, estimated' : 'per $1,000, estimated. Annual report, Jan 28, 2023: $700.16') : 'per $1,000, estimated'; }
        const fr = W0.rangeOn(a[0]); this._fedLab.setAttribute('x', X(k) - 8); this._fedLab.setAttribute('y', Y(fr.lo) + 14); this._fedLab.setAttribute('opacity', fr.hi > 0.6 ? 1 : 0);
        odo.frame(dt);
      },
    };
  }

  // ---- step 2: read a quote. A ruler marked in quote points above and dollars below; the marker follows the typed price. ----
  function sceneQuote(s) {
    const t = task(s.id); let typed = null, right = S.log[s.id].done, G, R, mk = { x: 1000, v: 0 };
    const LO = 880, HI = 1080;
    const sc = {
      update(rows) { const v = h.parseMoney(rows[1]); typed = isFinite(v) && v >= LO && v <= HI ? v : null; describe(`A bond quoted at ${t.q.toFixed(2)}. ${typed != null ? 'Your price: ' + money(typed, 2) + '.' : ''}`); },
      reveal(ok) { right = ok; },
      layout(Wd, Hd) {
        const n = Wd < 600; backdrop(Wd, Hd, { pool: [Wd / 2, Hd * 0.62, Wd * 0.5] });
        const cx = Wd / 2, x0 = n ? 22 : Wd * 0.1, x1 = n ? Wd - 22 : Wd * 0.9, ry = Hd * 0.56; R = { x0, x1, ry, n };
        T(svg, cx, Hd * 0.3 - (n ? 62 : 104), 'The dealer’s quote', { 'text-anchor': 'middle', class: 'fog', style: `font-size:${n ? 14 : 17}px` });
        Odo(svg, { size: n ? 64 : 104, anchor: 'middle', tcls: 'disp sod', value: t.q.toFixed(2) }).at(cx, Hd * 0.3);
        const X = (v) => x0 + (x1 - x0) * (v - LO) / (HI - LO); this._X = X;
        E('rect', { x: x0, y: ry - 14, width: x1 - x0, height: 28, rx: 4, fill: '#0E1B2D', stroke: '#4A6580' }, svg);
        for (let v = LO; v <= HI; v += 10) { const big = v % 50 === 0; E('line', { x1: X(v), x2: X(v), y1: ry - (big ? 22 : 18), y2: ry - 14, stroke: '#9DB0C2', 'stroke-width': big ? 1.5 : 0.8 }, svg); E('line', { x1: X(v), x2: X(v), y1: ry + 14, y2: ry + (big ? 22 : 18), stroke: '#9DB0C2', 'stroke-width': big ? 1.5 : 0.8 }, svg);
          if (big && (!n || v % 100 === 0 || v === 950 || v === 1050)) { T(svg, X(v), ry - 28, String(v / 10), { 'text-anchor': 'middle', class: 'disp sod', style: `font-size:${n ? 15 : 19}px` }); T(svg, X(v), ry + 42, money(v), { 'text-anchor': 'middle', class: 'disp', style: `font-size:${n ? 15 : 19}px` }); } }
        T(svg, x0, ry - 52, 'quote, in percent of $1,000', { class: 'fog', style: 'font-size:13px' }); T(svg, x0, ry + 66, 'price of one $1,000 bond', { class: 'fog', style: 'font-size:13px' });
        E('line', { x1: X(1000), x2: X(1000), y1: ry - 14, y2: ry + 14, stroke: '#E9EEF2', 'stroke-width': 2 }, svg);
        this._fill = E('rect', { x: x0, y: ry - 12, height: 24, rx: 3, fill: 'url(#liquidG)', opacity: 0.85 }, svg);
        this._hd = E('g', {}, svg); E('path', { d: 'M0 -24 L12 -12 L12 12 L0 24 L-12 12 L-12 -12 Z', fill: '#FFB447', filter: 'url(#glow)' }, this._hd);
        this._price = T(svg, cx, ry + (n ? 120 : 150), '', { 'text-anchor': 'middle', class: 'disp', style: `font-size:${n ? 40 : 60}px;font-weight:800` });
        mk.x = typed != null ? typed : 1000; this.frame(0);
      },
      frame(dt) {
        if (!this._hd) return; const on = typed != null; spring(mk, on ? typed : mk.x, dt, 110, 15); const x = this._X(mk.x);
        this._hd.setAttribute('transform', `translate(${x.toFixed(1)} ${R.ry})`); this._hd.setAttribute('opacity', on ? 1 : 0); this._fill.setAttribute('width', on ? Math.max(0, x - R.x0).toFixed(1) : 0);
        this._price.textContent = on ? `One bond: ${money(typed, 2)}${right ? '  ✓' : ''}` : 'One bond: $?';
      },
    };
    return sc;
  }

  // ---- step 3: which way the price moves. Pull the yield to the target, tap the bond that moved further. ----
  function sceneSeesaw(s, hooks) {
    const t = task(s.id), L = S.log[s.id], target = t.y * 100;
    const beam = Beam({ tokens: seesawTokens(true), handle: true, yieldScale: true, target, magnet: target, dy: L.done ? target - 4 : 0,
      onYield: (y) => { describeBeam(y); hooks.onYield(y); }, onTap: (id) => hooks.onTap(id, 4 + beam.dyT) });
    if (!L.done) beam.hint(true);
    const describeBeam = (y) => describe(`A beam on a pivot. Yield ${p2(y)}; target ${p2(target)}. The 2-year bond sells for ${money(W0.seesawPrice(2, y))} and the 30-year bond for ${money(W0.seesawPrice(30, y))}.`);
    return {
      beam,
      layout(Wd, Hd) {
        const g = beamLayout(Wd, Hd); backdrop(Wd, Hd, { pool: [g.px + g.armR * 0.3, g.py + 60, g.armR * 1.1], cone: [g.px + g.armR * 0.35, g.py + 40, g.armR * 0.85] });
        beam.build(svg, g.px, g.py, g.armL, g.armR, Wd, Hd); overlay.innerHTML = ''; describeBeam(4 + beam.dyT); if (L.done) beam.select('long');
      },
      frame(dt) { beam.frame(dt); },
    };
  }

  // ---- step 4: old bond, new rates ----
  function sceneCoupons(s) {
    const L = S.log[s.id]; let revealed = L.done, coins = [], tAcc = 0, odo, g, geo;
    const oldPrice = Math.round(W0.P(0.03, 10, 0.05));
    return {
      answered(ok) { if (ok) { revealed = true; odo.set(money(oldPrice)); this._note.textContent = 'if it has 10 years left'; describe(`The old bond’s price falls to about ${money(oldPrice)} if it has 10 years left.`); } },
      layout(Wd, Hd) {
        const n = Wd < 600; backdrop(Wd, Hd, { pool: [Wd / 2, Hd * 0.5, Wd * 0.5] }); coins = [];
        const cw = n ? 130 : 210, ch = n ? 84 : 124, xs = [Wd * 0.3, Wd * 0.7], top = n ? Hd * 0.3 : Hd * 0.34;
        geo = { xs, top, ch, base: Hd * (n ? 0.86 : 0.84), n }; g = E('g', {}, svg);
        const c1 = E('g', { transform: `translate(${xs[0]} ${top + ch})` }, svg); cert(c1, cw, ch, 'Your bank’s bond', '3% coupon', {});
        const c2 = E('g', { transform: `translate(${xs[1]} ${top + ch})` }, svg); cert(c2, cw, ch, 'A new bond', '5% coupon', {});
        T(svg, xs[0], top - (n ? 44 : 58), 'Price', { 'text-anchor': 'middle', class: 'fog', style: 'font-size:13px' });
        odo = Odo(svg, { size: n ? 30 : 44, anchor: 'middle' }).at(xs[0], top - (n ? 12 : 16)); odo.set(revealed ? money(oldPrice) : '$1,000', true);
        this._note = T(svg, xs[0], top + ch + (n ? 18 : 24), revealed ? 'if it has 10 years left' : '', { 'text-anchor': 'middle', class: 'fog', style: 'font-size:12px' });
        T(svg, xs[1], top - (n ? 44 : 58), 'Price', { 'text-anchor': 'middle', class: 'fog', style: 'font-size:13px' });
        Odo(svg, { size: n ? 30 : 44, anchor: 'middle', value: '$1,000' }).at(xs[1], top - (n ? 12 : 16));
        T(svg, xs[0], geo.base + (n ? 18 : 24), '$30 a year', { 'text-anchor': 'middle', class: 'disp', style: `font-size:${n ? 18 : 24}px` });
        T(svg, xs[1], geo.base + (n ? 18 : 24), '$50 a year', { 'text-anchor': 'middle', class: 'disp sod', style: `font-size:${n ? 18 : 24}px` });
        E('line', { x1: xs[0] - 50, x2: xs[0] + 50, y1: geo.base, y2: geo.base, stroke: '#2B425C' }, svg); E('line', { x1: xs[1] - 50, x2: xs[1] + 50, y1: geo.base, y2: geo.base, stroke: '#2B425C' }, svg);
        describe(`Your bank’s bond pays $30 a year. A new bond pays $50 a year. Both say $1,000 on their face.${revealed ? ` The old bond’s price falls to about ${money(oldPrice)}.` : ''}`);
      },
      frame(dt) {
        if (!g) return; odo.frame(dt); if (RM) return; tAcc += dt;
        // coins: $10 each; 3 a cycle from the old bond, 5 from the new
        if (tAcc > 0.36) { tAcc = 0; const cyc = (this._k = (this._k || 0) + 1) % 5; [[0, 3], [1, 5]].forEach(([b, k]) => { if (cyc < k) coins.push({ b, x: geo.xs[b] + (Math.random() - 0.5) * 30, y: geo.top + geo.ch + 6, v: 0, el: E('circle', { r: geo.n ? 5 : 7, fill: b ? '#FFB447' : '#E9EEF2', opacity: 0.95 }, g) }); }); }
        coins = coins.filter((c) => { c.v += 900 * dt; c.y += c.v * dt; if (c.y > geo.base - 7) { c.el.remove(); return false; } c.el.setAttribute('cx', c.x); c.el.setAttribute('cy', c.y); return true; });
      },
    };
  }

  // ---- step 5: duration. The bond sits at its duration on the beam, tipped by the rise in rates; the arithmetic fills in under it. ----
  function sceneDuration(s) {
    const t = task(s.id); let got = S.log[s.id].done ? [true, true] : [false, false];
    const beam = Beam({ tokens: [{ id: 'b', d: t.D, label: mm(t.A), sub: 'duration ' + t.D, wide: true }], riseLabel: true, scale: true, dy: 0 });
    function apply() {
      beam.anno('b', [{ text: got[0] ? `${t.D} × ${fix(t.dy)} = ${fix(t.D * t.dy)}%` : `${t.D} × ${fix(t.dy)} = ?%`, cls: 'coral', big: true }, { text: got[1] ? `${mm(t.A * t.D * t.dy / 100)} lost` : '$? lost', cls: '' }]);
      describe(`A bond with duration ${t.D} sits ${t.D} marks from the pivot. Rates rise ${fix(t.dy)} percentage points and the beam tips. ${got[0] ? `Its price falls about ${fix(t.D * t.dy)}%.` : ''}`);
    }
    return {
      reveal(rr) { if (rr[0] && rr[0].ok) got[0] = true; if (rr[1] && rr[1].ok) got[1] = true; apply(); },
      layout(Wd, Hd) {
        const g = beamLayout(Wd, Hd, { py: 0.5 }); backdrop(Wd, Hd, { pool: [g.px + g.armR * 0.3, g.py + 60, g.armR * 1.1], cone: [g.px + g.armR * 0.35, g.py + 40, g.armR * 0.85] });
        beam.build(svg, g.px, g.py, g.armL, g.armR, Wd, Hd);
        T(svg, NARROW() ? Wd / 2 : g.px + g.armR * 0.5, Hd - (NARROW() ? 22 : 36), 'A bond’s distance from the pivot is its duration.', { 'text-anchor': 'middle', class: 'fog', style: `font-size:${NARROW() ? 13 : 16}px` });
        overlay.innerHTML = ''; apply(); setTimeout(() => beam.setRise(t.dy), RM ? 0 : 500);
      },
      frame(dt) { beam.frame(dt); },
    };
  }

  // ---- step 6: which loses most? ----
  function sceneWhich(s, hooks) {
    const L = S.log[s.id], q = C.quiz[s.quiz];
    const tok = W0.DUR_BONDS.map((b, k) => ({ id: 'd' + k, d: b.d, label: b.label, sub: b.sub, tap: true, aria: `${b.label}, ${b.sub}`, quiz: q.options.findIndex((o) => b.quizText.test(o)) }));
    const beam = Beam({ tokens: tok, riseLabel: true, scale: true, onTap: (id) => { const t = tok.find((x) => x.id === id); beam.select(id); hooks.onPick(t.quiz); } });
    function tilt() { beam.setRise(1); tok.forEach((t) => beam.anno(t.id, [{ text: `about ${Math.round(t.d)}%`, cls: 'coral' }])); describe('Rates rose 1 percentage point. Duration 2 loses about 2%, duration 8 about 8%, duration 17 about 17%.'); }
    return {
      selectQuiz(j) { const t = tok.find((x) => x.quiz === j); beam.select(t ? t.id : null); },
      answered() { tilt(); },
      layout(Wd, Hd) {
        const g = beamLayout(Wd, Hd, { py: 0.52 }); backdrop(Wd, Hd, { pool: [g.px + g.armR * 0.3, g.py + 60, g.armR * 1.1], cone: [g.px + g.armR * 0.35, g.py + 40, g.armR * 0.85] });
        tok.forEach((t, k) => { const b = W0.DUR_BONDS[k]; t.label = NARROW() ? String(Math.round(b.d)) : b.label; t.sub = NARROW() ? b.sub.replace(' bond', '') : b.sub; });
        beam.build(svg, g.px, g.py, g.armL, g.armR, Wd, Hd); overlay.innerHTML = '';
        if (L.done) tilt(); else describe('Three bonds on the beam, at durations 2, 8 and 17. Rates are about to rise 1 point.');
        if (L.choice != null) this.selectQuiz(Number(L.choice));
      },
      frame(dt) { beam.frame(dt); },
    };
  }

  // ---- step 7: spread. Two yield lines; the bracket between them fills to the spread the player types. ----
  function sceneSpread(s) {
    const t = task(s.id); let typed = S.log[s.id].done ? t.bps : 0, right = S.log[s.id].done, Y, geo, br = { x: 0, v: 0 };
    const sc = {
      update(rows) { const b = h.parseMoney(String(rows[1] || '').replace(/basis points?|bps?/i, '')), p = h.parseMoney(String(rows[0] || '').replace(/points?|%/i, '')); typed = isFinite(b) && b > 0 && b < 600 ? b : isFinite(p) && p > 0 && p < 6 ? p * 100 : 0; },
      reveal(ok) { right = ok; if (ok) typed = t.bps; },
      layout(Wd, Hd) {
        const n = Wd < 600; backdrop(Wd, Hd);
        geo = { x0: n ? 40 : Wd * 0.1, x1: n ? Wd - 136 : Wd * 0.66, y0: n ? 40 : 70, y1: Hd - (n ? 26 : 60), n };
        Y = (v) => geo.y1 - (geo.y1 - geo.y0) * (v - 3) / 5;
        for (let v = 3; v <= 8; v++) { E('line', { x1: geo.x0, x2: geo.x1, y1: Y(v), y2: Y(v), stroke: '#1E3149' }, svg); T(svg, geo.x0 - 8, Y(v) + 4, v + '%', { 'text-anchor': 'end', class: 'fog', style: 'font-size:12px' }); }
        this._dyn = E('g', {}, svg); describe(`The company’s 10-year bond yields ${p2(t.corp)}; the 10-year Treasury yields ${p2(t.tsy)}. The gap between the lines is the spread.`); this.frame(0);
      },
      frame(dt) {
        if (!this._dyn) return; spring(br, typed, dt, 110, 15);
        const g = this._dyn; g.innerHTML = ''; const n = geo.n; const yc = Y(t.corp), yt = Y(t.tsy), bx = n ? geo.x1 - 14 : geo.x1 - 30, ytop = Y(t.tsy + br.x / 100);
        E('rect', { x: geo.x0, y: yc, width: bx - geo.x0, height: Math.max(0, yt - yc), fill: 'url(#hatchP)', opacity: 0.6 }, g);
        E('line', { x1: geo.x0, x2: geo.x1, y1: yc, y2: yc, stroke: '#FFB447', 'stroke-width': 3 }, g);
        E('line', { x1: geo.x0, x2: geo.x1, y1: yt, y2: yt, stroke: '#E9EEF2', 'stroke-width': 3 }, g);
        T(g, geo.x0 + 8, yc - 10, `Company’s 10-year bond ${p2(t.corp)}`, { class: 'disp sod', style: `font-size:${n ? 16 : 21}px` });
        T(g, geo.x0 + 8, yt + (n ? 20 : 27), `10-year Treasury ${p2(t.tsy)}`, { class: 'disp', style: `font-size:${n ? 16 : 21}px` });
        if (br.x > 1) { E('line', { x1: bx, x2: bx, y1: ytop, y2: yt, stroke: right ? '#FFB447' : '#E9EEF2', 'stroke-width': 2 }, g);
          for (let k = 0; k * 25 <= br.x + 0.01; k++) { const yy = Y(t.tsy + k * 0.25); E('line', { x1: bx - (k % 4 ? 5 : 10), x2: bx + (k % 4 ? 5 : 10), y1: yy, y2: yy, stroke: '#E9EEF2', 'stroke-width': k % 4 ? 1 : 1.6 }, g); }
          const tx = bx + (n ? 14 : 26), my = (ytop + yt) / 2;
          T(g, tx, my - 4, `${Math.round(br.x)} basis points`, { class: 'disp sod', style: `font-size:${n ? 15 : 23}px` }); T(g, tx, my + (n ? 15 : 22), `= ${fix(br.x / 100)} percentage points`, { class: 'disp', style: `font-size:${n ? 13 : 18}px` });
          T(g, tx, my + (n ? 30 : 42), 'each tick: 25 basis points', { class: 'fog', style: `font-size:${n ? 11 : 13}px` }); }
      },
    };
    return sc;
  }

  // ---- step 8: Dragovia. A press conference: the news, the minister's promise, the lenders walking out, then the prices. ----
  const DRAG_NEWS = ['Dragovia’s president accused of embezzling tax money'];
  const dragNews = () => DRAG_NEWS[h.fnv1a('news|' + S.code) % DRAG_NEWS.length];
  function sceneDragovia(s) {
    const L = S.log[s.id], DG = W0.DRAGOVIA; let after = L.done, figs = [], t0 = 0, hl = { x: L.done ? 1 : 0, v: 0 }, geo, dOdo, dyOdo, spreadG, odos = [];
    const yAfter = W0.yieldAt(DG.after, DG.coupon, DG.years) * 100; let shown = { x: after ? 1 : 0, v: 0 };
    const sc = {
      answered(ok) { if (ok && !after) { after = true; dOdo.set(money(DG.after)); dyOdo.set(p2(yAfter)); Sound.thud(); describe(`Dragovia’s price falls to ${money(DG.after)} and its yield rises to about ${p2(yAfter)}. The Treasury stays at $1,000 and 4.00%. The spread opens.`); } },
      layout(Wd, Hd) {
        const n = Wd < 600; backdrop(Wd, Hd); figs = []; odos = [];
        geo = { n, Wd, Hd, px: Wd * (n ? 0.27 : 0.27), cx: Wd * (n ? 0.74 : 0.74), top: n ? 64 : 92, chartTop: Hd * (n ? 0.74 : 0.75) };
        // headline
        const hlG = E('g', {}, svg); this._hl = hlG; const hw = Math.min(Wd - 24, 660), hx = (Wd - hw) / 2, hh = n ? 50 : 62;
        E('rect', { x: hx, y: 0, width: hw, height: hh, fill: '#E9EEF2', rx: 2 }, hlG); E('rect', { x: hx, y: 0, width: 6, height: hh, fill: '#FF8A7A' }, hlG);
        T(hlG, hx + 16, n ? 18 : 22, 'Breaking news', { class: 'night', style: `font-size:${n ? 10.5 : 12}px;font-weight:600` });
        T(hlG, hx + 16, n ? 40 : 50, dragNews(), { class: 'disp night', style: `font-size:${n ? 16 : 25}px;font-weight:800` }); this._hlH = hh;
        // the minister, live on television
        const tvW = n ? 150 : 300, tvH = n ? 118 : 222, tvX = geo.px - tvW / 2, tvY = geo.top + (n ? 4 : 10), cid = nid('tv');
        E('clipPath', { id: cid }, defs).innerHTML = `<rect x="${tvX}" y="${tvY}" width="${tvW}" height="${tvH}" rx="8"/>`;
        E('rect', { x: tvX - 5, y: tvY - 5, width: tvW + 10, height: tvH + 10, rx: 11, fill: '#16263A', stroke: '#4A6580' }, svg);
        const tv = E('g', { 'clip-path': `url(#${cid})` }, svg);
        E('rect', { x: tvX, y: tvY, width: tvW, height: tvH, fill: '#1D3149' }, tv);
        for (let k = 0; k < 3; k++) E('rect', { x: tvX, y: tvY + k * tvH / 9, width: tvW, height: tvH / 18, fill: k === 1 ? '#FF8A7A' : '#2B425C', opacity: 0.35 }, tv);
        const bsc = tvH * 0.95 / 64, mG = E('g', { transform: `translate(${geo.px - 32 * bsc} ${tvY + tvH - 64 * bsc + tvH * 0.04}) scale(${bsc})` }, tv); mG.innerHTML = portraitBody('minister');
        for (const dx of [-0.16, 0, 0.16]) { E('line', { x1: geo.px + dx * tvW, y1: tvY + tvH, x2: geo.px + dx * tvW * 0.6, y2: tvY + tvH * 0.72, stroke: '#0A1524', 'stroke-width': n ? 3 : 5 }, tv); E('circle', { cx: geo.px + dx * tvW * 0.6, cy: tvY + tvH * 0.72, r: n ? 4 : 7, fill: '#0A1524' }, tv); }
        E('rect', { x: tvX, y: tvY + tvH - (n ? 22 : 34), width: tvW, height: n ? 22 : 34, fill: '#0A1524', opacity: 0.85 }, tv);
        T(tv, tvX + 8, tvY + tvH - (n ? 8 : 12), 'Finance minister: “We will pay.”', { class: 'disp', style: `font-size:${n ? 11 : 17}px` });
        E('rect', { x: tvX + 8, y: tvY + 8, width: n ? 30 : 40, height: n ? 14 : 18, rx: 3, fill: '#FF8A7A' }, tv); T(tv, tvX + (n ? 23 : 28), tvY + (n ? 18.5 : 21.5), 'LIVE', { 'text-anchor': 'middle', class: 'night disp', style: `font-size:${n ? 10 : 13}px` });
        // lenders in the room, who leave once the news lands
        const nF = n ? 5 : 8, fy = geo.chartTop - (n ? 10 : 16); for (let k = 0; k < nF; k++) {
          const g = E('g', {}, svg); E('circle', { cx: 0, cy: -22, r: 5, fill: '#9DB0C2' }, g); E('path', { d: 'M-7 0 Q-7 -15 0 -15 Q7 -15 7 0 Z', fill: '#9DB0C2' }, g);
          figs.push({ g, x: geo.px + (k - (nF - 1) / 2) * (n ? 18 : 26), y: fy, dir: k % 2 ? 1 : -1, delay: 0.9 + k * 0.12, gone: L.done });
        }
        // the two bonds' prices
        const cw = n ? 104 : 168, ch = n ? 46 : 70;
        [[0, 'U.S. Treasury', '4% coupon', 1000, 4, geo.top + (n ? 4 : 24)], [1, 'Dragovia', '6% coupon', after ? DG.after : 1000, after ? yAfter : 6, geo.top + (n ? 96 : 176)]].forEach(([k, a, b, pr, y, ty]) => {
          const g = E('g', { transform: `translate(${geo.cx} ${ty + ch + (n ? 26 : 38)})` }, svg); cert(g, cw, ch, a, b, {});
          const po = Odo(svg, { size: n ? 20 : 30, anchor: 'end', value: money(pr) }).at(geo.cx + cw / 2, ty + (n ? 18 : 26));
          const yo = Odo(svg, { size: n ? 14 : 18, anchor: 'start', value: p2(y), tcls: 'disp fog' }).at(geo.cx - cw / 2, ty + (n ? 18 : 26));
          odos.push(po, yo); if (k) { dOdo = po; dyOdo = yo; }
        });
        T(svg, geo.cx - cw / 2, geo.top - (n ? 4 : 2), 'yield', { class: 'fog', style: 'font-size:11px' }); T(svg, geo.cx + cw / 2, geo.top - (n ? 4 : 2), 'price', { 'text-anchor': 'end', class: 'fog', style: 'font-size:11px' });
        this._gy = { x0: n ? 30 : Wd * 0.08, x1: n ? Wd - 20 : Wd * 0.92, y0: geo.chartTop + 6, y1: Hd - (n ? 14 : 26) }; spreadG = E('g', {}, svg);
        describe(after ? `Dragovia’s price has fallen to ${money(DG.after)} and its yield risen to about ${p2(yAfter)}; the Treasury has not moved.` : `Breaking news: ${dragNews()}. Dragovia’s finance minister promises to pay. The lenders in the room walk out. Both bonds sit at $1,000.`);
        t0 = 0; this.frame(0);
      },
      frame(dt) {
        if (!spreadG) return; t0 += dt; odos.forEach((o) => o.frame(dt));
        spring(hl, 1, dt, 70, 12); this._hl.setAttribute('transform', `translate(0 ${(-this._hlH + (this._hlH + 8) * Math.min(1, hl.x)).toFixed(1)})`);
        figs.forEach((f) => { let off = 0, op = 1; if (f.gone || (RM && t0 > f.delay)) { off = 999; op = 0; } else if (t0 > f.delay) { const u = t0 - f.delay; off = 160 * u * u; op = Math.max(0, 1 - u / 1.3); if (op === 0) f.gone = true; } f.g.setAttribute('transform', `translate(${f.x + f.dir * off} ${f.y + Math.sin(t0 * 14 + f.x) * (off ? 1.5 : 0)})`); f.g.setAttribute('opacity', op); });
        spring(shown, after ? 1 : 0, dt, 40, 10);
        const gy = this._gy, Yv = (v) => gy.y1 - (gy.y1 - gy.y0) * (v - 3) / 7, X = (u) => gy.x0 + (gy.x1 - gy.x0) * u, g = spreadG; g.innerHTML = '';
        const dragY = (u) => 6 + (u > 0.5 ? (yAfter - 6) * shown.x * Math.min(1, (u - 0.5) * 5) : 0);
        let dd = '', td = '', area = ''; for (let k = 0; k <= 40; k++) { const u = k / 40; dd += (k ? 'L' : 'M') + X(u).toFixed(1) + ' ' + Yv(dragY(u)).toFixed(1); td += (k ? 'L' : 'M') + X(u).toFixed(1) + ' ' + Yv(4).toFixed(1); }
        for (let k = 40; k >= 0; k--) area += 'L' + X(k / 40).toFixed(1) + ' ' + Yv(4).toFixed(1);
        E('path', { d: dd + area + 'Z', fill: 'url(#hatchP)' }, g);
        E('path', { d: td, fill: 'none', stroke: '#E9EEF2', 'stroke-width': 2 }, g); E('path', { d: dd, fill: 'none', stroke: '#FFB447', 'stroke-width': 2.4 }, g);
        T(g, gy.x0, gy.y0 - 4, 'Yields', { class: 'fog', style: 'font-size:11px' });
        T(g, X(1), Yv(4) + 13, 'Treasury', { 'text-anchor': 'end', style: 'font-size:11px' });
        T(g, X(1), Yv(dragY(1)) - 5, 'Dragovia', { 'text-anchor': 'end', class: 'sod', style: 'font-size:11px' });
        if (shown.x > 0.05) T(g, X(0.76), (Yv(4) + Yv(dragY(1))) / 2 + 4, `spread ${Math.round((dragY(1) - 4) * 100)} basis points`, { 'text-anchor': 'middle', style: `font-size:${geo.n ? 11 : 13}px` });
      },
    };
    return sc;
  }

  // ---- step 9: Puerto Rico ----
  function scenePR(s) {
    const L = S.log[s.id]; let mode = 'mine', got = L.done ? [true, true] : [false, false], setSw, G, geo, bars = { a: { x: 0, v: 0 }, b: { x: 0, v: 0 } }, tgt = { a: 80, b: 60 };
    function apply() {
      const c = mode === 'example' ? { a: 80, b: 60, ok: [true, true], who: 'Worked example', la: 'Before', lb: 'After' } : { a: 44, b: 30, ok: got, who: 'Puerto Rico’s bond, its quote', la: 'October 3', lb: 'October 4, at its low' };
      tgt = { a: c.a, b: c.b }; this._c = c; if (setSw) setSw(mode);
      describe(`${c.who}: ${c.a}, then ${c.b}. ${c.ok[0] ? `A fall of ${c.a - c.b} cents` : 'The fall is not filled in yet'}${c.ok[1] ? `, about ${fix(100 * (c.a - c.b) / c.a, 1)}%` : ''}.`);
    }
    const sc = {
      show(m) { mode = m; apply.call(sc); },
      rows(rr) { if (rr[0] && rr[0].ok) got[0] = true; if (rr[1] && rr[1].ok) got[1] = true; mode = 'mine'; apply.call(sc); },
      layout(Wd, Hd) {
        const n = Wd < 600; setBg('img/maria-pr-2017.webp', ''); geo = { n, base: Hd - (n ? 54 : 78), top: n ? 104 : 150, Wd, Hd };
        overlay.innerHTML = '';
        // the scene line sits in the question panel; the photo carries the place
        capEl(`Photo: a home in Loíza, Puerto Rico, on September 21, 2017, the day after Hurricane Maria. ${esc(BOND_IMG.maria)}`);
        G = E('g', {}, svg); bars.a.x = tgt.a; bars.b.x = tgt.b; apply.call(sc); this.frame(0);
      },
      frame(dt) {
        if (!G) return; spring(bars.a, tgt.a, dt, 80, 13); spring(bars.b, tgt.b, dt, 80, 13);
        const g = G; g.innerHTML = ''; const c = this._c, n = geo.n, bw = n ? 64 : 96, xa = geo.Wd * (n ? 0.2 : 0.3), xb = xa + bw + (n ? 60 : 90);
        const Yp = (v) => geo.base - (geo.base - geo.top) * v / 100;
        E('line', { x1: xa - 30, x2: xb + bw + 30, y1: geo.base, y2: geo.base, stroke: '#9DB0C2' }, g);
        [[xa, bars.a.x, c.a, c.la, '#E9EEF2'], [xb, bars.b.x, c.b, c.lb, '#FF8A7A']].forEach(([x, v, lab, cap, col]) => {
          E('rect', { x, y: Yp(v), width: bw, height: geo.base - Yp(v), fill: col, 'fill-opacity': 0.9 }, g);
          T(g, x + bw / 2, Yp(v) - 10, String(lab), { 'text-anchor': 'middle', class: 'disp', style: `font-size:${n ? 26 : 38}px;font-weight:800` });
          T(g, x + bw / 2, geo.base + 18, cap, { 'text-anchor': 'middle', class: 'fog', style: `font-size:${n ? 11 : 13}px` });
        });
        // the fall, bracketed
        const ya = Yp(bars.a.x), yb = Yp(bars.b.x), bx = xb + bw + 14;
        if (mode === 'mine' && c.ok[1]) { const yl = Yp(37.5); E('line', { x1: xb - 6, x2: xb + bw + 6, y1: yl, y2: yl, stroke: '#E9EEF2', 'stroke-width': 1.5, 'stroke-dasharray': '4 3' }, g); T(g, xb + bw / 2, yl - 6, n ? 'late: 37.50' : 'late that day: 37.50', { 'text-anchor': 'middle', style: `font-size:${n ? 10.5 : 12.5}px` }); }
        E('line', { x1: xa + bw, x2: bx, y1: ya, y2: ya, stroke: '#E9EEF2', 'stroke-dasharray': '3 4' }, g);
        E('line', { x1: bx, x2: bx, y1: ya, y2: yb, stroke: '#FF8A7A', 'stroke-width': 2 }, g);
        T(g, bx + 8, (ya + yb) / 2, c.ok[0] ? `fall ${c.a - c.b}` : 'fall ?', { class: 'disp', style: `font-size:${n ? 16 : 22}px` });
        T(g, bx + 8, (ya + yb) / 2 + (n ? 17 : 24), c.ok[1] ? `${fix(100 * (c.a - c.b) / c.a, 1)}% of ${c.a}` : `?% of ${c.a}`, { class: 'disp coral', style: `font-size:${n ? 15 : 20}px` });
      },
      destroy() { setBg(null); },
    };
    return sc;
  }

  // ---- step 10: a bank's big bet ----
  function sceneBridge(s, hooks) {
    const t = task(s.id), L = S.log[s.id]; let mode = 'mine', setSw, ready = L.done, landed = false;
    const ex = { A: 4, D: 5, dy: 2 };
    const steps = Math.round(t.dy / 0.25);
    const dial = Dial({ n: steps + 1, i: 0, from: -120, to: 120, enabled: ready, aria: 'Fed rate dial', major: (i) => i % 4 === 0, label: (i) => (i % 4 === 0 ? '+' + i / 4 : ''), labelSize: 12,
      valueText: (i) => `Rates up ${fix(i * 0.25)} percentage points`, onChange: (i) => { beam.setRise(i * 0.25); hooks.onDial(i * 0.25); } });
    const beam = Beam({ tokens: [{ id: 'blk', d: t.D, label: `$${t.A} billion`, sub: `duration ${t.D}`, kind: 'block' }], riseLabel: true, scale: true });
    let G, gauge = { lvl: { x: 1, v: 0 } }, geo, valOdo, lossOdo;
    let armed = null, guessing = false, gset = null; // the loss the player typed or dragged, in billions: the mark the gauge is tested against
    function cur() { return mode === 'example' ? Object.assign({ who: 'Worked example' }, ex, { r: ex.dy, mark: ex.A * ex.D * ex.dy / 100 }) : { who: 'Your bank', A: t.A, D: t.D, dy: t.dy, r: dial.i * 0.25, mark: ready ? (L.done ? t.answer : armed) : (guessing ? armed : null) }; }
    function apply() {
      const c = cur(); beam.tokens[0].d = c.D; const tk = beam.tokenAt('blk'); if (tk) { tk.c.remove(); tk.c = cert(tk.g, tk.w, tk.hh, `$${c.A} billion`, `duration ${c.D}`, { stack: true }); }
      beam.setRise(c.r); dial.enable(mode === 'mine' && ready);
      if (setSw) setSw(mode);
    }
    const sc = {
      dial,
      show(m) { mode = m; apply.call(sc); },
      unlock() { ready = true; mode = 'mine'; landed = false; dial.set(0); apply.call(sc); dial.focus(); if (NARROW()) stage.scrollIntoView({ behavior: RM ? 'auto' : 'smooth' }); },
      arm(v) { armed = v; ready = true; mode = 'mine'; landed = false; dial.set(0); apply.call(sc); if (NARROW()) setTimeout(() => stage.scrollIntoView({ behavior: RM ? 'auto' : 'smooth' }), 900); },
      get landed() { return landed; },
      guess(st) { guessing = true; gset = st; armed = st.v; mode = 'mine'; st.on((v) => { armed = v; }); },
      lock() { guessing = false; ready = true; mode = 'mine'; landed = false; dial.set(0); apply.call(sc); if (this._gh) this._gh.remove(); this._gh = null; dial.focus(); if (NARROW()) stage.scrollIntoView({ behavior: RM ? 'auto' : 'smooth' }); },
      layout(Wd, Hd) {
        const n = Wd < 600; backdrop(Wd, Hd);
        const g = { px: Wd * (n ? 0.32 : 0.3), py: Hd * (n ? 0.4 : 0.44), armL: Wd * (n ? 0.12 : 0.1), armR: Math.min(Wd * (n ? 0.46 : 0.46), 540) };
        E('ellipse', { cx: g.px + g.armR * 0.3, cy: g.py + 60, rx: g.armR, ry: g.armR * 0.3, fill: 'url(#poolG)' }, svg);
        beam.build(svg, g.px, g.py, g.armL, g.armR, Wd, Hd);
        // gauge
        geo = n ? { x: Wd - 58, y: 48, w: 40, h: Hd * 0.5 } : { x: Wd - 120, y: 96, w: 60, h: Hd * 0.5 };
        G = E('g', {}, svg);
        const R = n ? 34 : 58, dcx = n ? 62 : g.px, dcy = n ? Hd - 60 : Math.min(Hd - 100, g.py + 230); dial.build(svg, dcx, dcy, R);
        this._dialLab = T(svg, dcx + R + (n ? 26 : 44), dcy - (n ? 8 : 12), 'The Fed’s dial', { class: 'fog', style: `font-size:${n ? 12 : 15}px` });
        this._dialHint = T(svg, dcx + R + (n ? 26 : 44), dcy + (n ? 10 : 14), '', { class: 'sod disp', style: `font-size:${n ? 15 : 22}px` });
        this._final = T(svg, n ? 16 : 32, n ? Hd * 0.72 : Hd - 40, '', { class: 'disp', style: `font-size:${n ? 18 : 26}px;font-weight:800` });
        valOdo = Odo(svg, { size: n ? 18 : 28, anchor: 'end' }).at(geo.x + geo.w, geo.y - (n ? 10 : 14));
        lossOdo = Odo(svg, { size: n ? 16 : 24, anchor: 'end', tcls: 'disp coral' }).at(geo.x + geo.w, geo.y + geo.h + (n ? 24 : 34));
        this._who = T(svg, Wd - 16, Hd - 12, '', { 'text-anchor': 'end', class: 'fog', style: 'font-size:12px' });
        overlay.innerHTML = ''; apply.call(sc);
        if (guessing) { const hd = E('g', {}, svg); this._gh = hd; E('rect', { class: 'focusring', x: -16, y: -14, width: geo.w + 32, height: 28, rx: 6, fill: 'none', stroke: '#FFB447', 'stroke-width': 2 }, hd); E('rect', { x: -20, y: -18, width: geo.w + 40, height: 36, fill: 'transparent' }, hd); E('path', { d: 'M-4 0 l-12 -8 v16 z', fill: '#FFB447', filter: 'url(#glow)' }, hd); E('rect', { x: 0, y: -2, width: geo.w, height: 4, fill: '#FFB447' }, hd);
          gset.handle(hd, (cx2, cy2) => { const r = svg.getBoundingClientRect(); return t.A * 0.3 * (cy2 - r.top - geo.y) / geo.h; }, true); }
        this.frame(0);
      },
      frame(dt) {
        if (!G) return; beam.frame(dt); dial.frame(dt);
        const c = cur(); const frac = 1 - c.D * c.r / 100; spring(gauge.lvl, frac, dt, 40, 10);
        const g = G; g.innerHTML = ''; const { x, y, w, h: gh } = geo, n = NARROW();
        // tank: shows the top 30% of the bonds' value so the drain reads clearly; labelled
        const Ys = (f) => y + gh * (1 - f) / 0.3; const lvlY = Math.min(y + gh, Ys(gauge.lvl.x));
        E('rect', { x, y, width: w, height: gh, rx: 8, fill: '#0E1B2D', stroke: '#4A6580' }, g);
        const wave = RM ? 0 : 2.5; let d = `M${x} ${lvlY}`; for (let k = 0; k <= 12; k++) d += `L${(x + w * k / 12).toFixed(1)} ${(lvlY + Math.sin(performance.now() / 300 + k) * wave * (Math.abs(gauge.lvl.v) > 0.002 ? 1 : 0.3)).toFixed(1)}`; d += `L${x + w} ${y + gh}L${x} ${y + gh}Z`;
        E('path', { d, fill: 'url(#liquidG)', 'clip-path': null }, g);
        for (let k = 0; k <= 6; k++) { const f = 1 - k * 0.05, yy = Ys(f); E('line', { x1: x + w, x2: x + w + 6, y1: yy, y2: yy, stroke: '#4A6580' }, g); if (!n) T(g, x + w + 9, yy + 4, `${100 - k * 5}%`, { class: 'fog', style: 'font-size:10.5px' }); }
        T(g, x + w, y - (n ? 30 : 46), 'Value of the bonds', { 'text-anchor': 'end', class: 'fog', style: `font-size:${n ? 11 : 13}px` });
        if (c.mark != null && isFinite(c.mark)) { const my = Math.max(y - 8, Math.min(y + gh + 8, Ys(1 - c.mark / c.A))); E('line', { x1: x - (n ? 10 : 18), x2: x + w + 6, y1: my, y2: my, stroke: '#E9EEF2', 'stroke-width': 2, 'stroke-dasharray': '5 3' }, g); T(g, x - (n ? 12 : 22), my - 6, mode === 'example' ? 'the rule' : S.friend ? 'your guess' : 'your answer', { 'text-anchor': 'end', style: `font-size:${n ? 10.5 : 12.5}px` }); }
        valOdo.set('$' + (c.A * frac).toFixed(2) + 'B'); lossOdo.set('−$' + (c.A * (1 - frac)).toFixed(2) + 'B'); valOdo.frame(dt); lossOdo.frame(dt);
        if (mode === 'mine' && ready && dial.i === steps && Math.abs(gauge.lvl.x - frac) < 0.0015 && !landed) { landed = true; Sound.thud(); if (L.done) hooks.onLanded(); else hooks.onMiss(armed); }
        this._final.textContent = landed && mode === 'mine' && L.done ? `The bonds lost $${fix(t.answer)} billion, and no borrower missed a payment.` : '';
        if (n) this._final.textContent = landed && mode === 'mine' && L.done ? `The bonds lost $${fix(t.answer)} billion.` : '';
        this._dialHint.textContent = mode === 'mine' ? (ready ? (dial.i < steps ? `Turn it up to +${fix(t.dy)}` : `Rates up ${fix(t.dy)} percentage points`) : (S.friend ? 'Lock in your guess first' : 'Check your answer to unlock it')) : '';
        if (this._gh) this._gh.setAttribute('transform', `translate(${x} ${(y + gh * (armed / t.A) / 0.3).toFixed(1)})`);
        describe(`${c.who}: $${c.A} billion of bonds with duration ${c.D}. Rates up ${fix(c.r)} percentage points. Value about $${(c.A * frac).toFixed(2)} billion.`);
      },
    };
    return sc;
  }

  // ---- step 11: the ledger ----
  function sceneLedger() {
    return {
      layout(Wd, Hd) {
        backdrop(Wd, Hd); overlay.innerHTML = '';
        const d = document.createElement('div'); d.className = 'stageledger'; d.setAttribute('aria-hidden', 'true');
        const v = (k) => (S.notes[k] ? esc(S.notes[k]) : '<em>not written yet</em>');
        d.innerHTML = `<h3>Selling bonds</h3><h3>Selling shares</h3><div><i>Advantage</i>${v('ba')}</div><div><i>Advantage</i>${v('sa')}</div><div><i>Drawback</i>${v('bd')}</div><div><i>Drawback</i>${v('sd')}</div>`;
        overlay.appendChild(d); describe('A ledger with two columns, selling bonds and selling shares, each with an advantage and a drawback.');
      },
      update() { this.layout(W, H); },
    };
  }

  // ======================= steps =======================
  function showStep(s) {
    const L = S.log[s.id], t = s.kind === 'task' ? task(s.id) : null;
    const hintFor = (tk) => (lvl) => C.helpText(tk, lvl, h);
    if (s.id === 'q1') {
      const sc = sceneReplay(s, { onDial: () => {} }, true); mount(sc);
      screen(s, { scene: 'In Unit 3 you followed the Fed through 2022. The yield curve is inverted when the 2-year rate sits above the 10-year.',
        ask: 'Your Fed Brief packet showed the 2-year Treasury rate going from 0.78% to 4.41% during 2022, and the 10-year from 1.63% to 3.88%. Which rose more, and what shape did that leave the yield curve in at the end of the year?', body: quizHtml(s) });
      wireQuiz(s); return;
    }
    if (s.id === 'quote') {
      const W_quote = { 1: ['Price of one bond', `${t.q.toFixed(2)} ÷ 100 × $1,000`] };
      const sc = sceneQuote(s); mount(sc);
      screen(s, { scene: 'A dealer offers your bank a bond.', ask: `The dealer quotes it at <b>${t.q.toFixed(2)}</b>. A quote is the bond’s price as a percentage of its face value. What does one $1,000 bond cost?`,
        body: boxesHtml(C.linesFor(t), L.rows, W_quote), example: EX.quote, hint: hintFor(t) });
      wireRows(s, { words: W_quote, onInput: (r) => sc.update(r), onRows: (rr, ok) => sc.reveal(ok) }); return;
    }
    if (s.id === 'seesaw') {
      const target = t.y * 100; let sc;
      const judge = (id, y) => {
        const e = W0.seesawEntry(y, id), res = C.judgeTask(t, e, h); L.attempts = (L.attempts || 0) + 1; const p2y = W0.seesawPrice(2, y), p30 = W0.seesawPrice(30, y);
        if (res.ok) { L.value = e.value; L.choice = e.choice; markDone(s.id); Sound.chime(); fb('<b>Right.</b> ' + C.praise(t, h), true); showNext(); }
        else { if (!L.done) { L.value = e.value; L.choice = e.choice; } L.fails = (L.fails || 0) + 1; Sound.miss();
          fb('<b>Not yet.</b> ' + esc(Math.abs(y - target) > 1e-9 ? (Math.abs(y - 4) < 1e-9 ? `At 4% both bonds sit at $1,000. Pull the yield up to ${p2(target)} first.` : `The yield reads ${p2(y)}. Pull it to ${p2(target)}, then tap a bond.`)
            : `You tapped the 2-year bond. It moved ${money(1000 - p2y)} from $1,000; the 30-year bond moved ${money(1000 - p30)}. Tap the one that moved further.`), false); }
        save();
      };
      sc = sceneSeesaw(s, { onYield: () => {}, onTap: (id, y) => { sc.beam.select(id); judge(id, y); } }); mount(sc);
      screen(s, { scene: 'Your bank owns two bonds. Each pays $40 a year on $1,000. One is repaid in 2 years, the other in 30.',
        ask: `At a 4% yield both sell for $1,000. Pull the gold grip up to <b>${p2(target)}</b>. Then tap the bond whose price moved further from $1,000.`, check: false, hintLabel: 'Show me how',
        hint: (lvl) => (lvl === 1 ? `Drag the gold grip on the left end of the beam until it reads ${p2(target)}. Then compare how far each price tag moved from $1,000.` : `At ${p2(target)}, the 30-year bond sells for ${money(t.p30)} and the 2-year bond for ${money(t.p2)}. The 30-year bond moved further from $1,000, so tap it.`) });
      if (L.done) fb('<b>Right.</b> ' + C.praise(t, h), true); return;
    }
    if (s.id === 'q2') {
      const sc = sceneCoupons(s); mount(sc);
      screen(s, { scene: 'The coins show what each bond pays every year.', ask: esc(C.quiz[s.quiz].q), body: quizHtml(s) });
      wireQuiz(s, (pick, ok) => { sc.answered(ok); if (ok) fb(`<b>Right.</b> ${esc(C.quiz[s.quiz].why[pick].replace(/^Right\.\s*/, ''))} If it has 10 years left, that is about ${money(W0.P(0.03, 10, 0.05))}.`, true); }); return;
    }
    if (s.id === 'dur1') {
      const W_dur1 = { 0: ['Percent the price falls', `duration × rise in rates = ${t.D} × ${fix(t.dy)}`], 1: ['Dollars lost', `percent fall × ${mm(t.A)}`] };
      const q = task('quote'); const sc = sceneDuration(s); mount(sc);
      screen(s, { scene: `The bond the dealer quoted at ${q.q.toFixed(2)} in step 2 has a duration of <b>${t.D}</b>. Your bank’s holding of it is worth <b>${mm(t.A)}</b>.`,
        ask: `Rates rise <b>${fix(t.dy)}</b> percentage ${t.dy === 1 ? 'point' : 'points'}. Use the rule of thumb: about how much does the bank lose?`,
        body: boxesHtml(C.linesFor(t), L.rows, W_dur1), example: EX.dur1(t), hint: hintFor(t) });
      wireRows(s, { words: W_dur1, onRows: (rr) => sc.reveal(rr) }); return;
    }
    if (s.id === 'q3') {
      const d = task('dur1'); let sc;
      sc = sceneWhich(s, { onPick: (j) => { const r = $(`input[name=q][value="${j}"]`, con); if (r) r.checked = true; } }); mount(sc);
      screen(s, { scene: `Your bond in step 5 had duration ${d.D}. Here are three bonds, each sitting at its duration on the beam.`, ask: `${esc(C.quiz[s.quiz].q)} Tap it on the beam or choose below, then check and watch the beam tip.`, body: quizHtml(s) });
      wireQuiz(s, () => sc.answered(), (j) => sc.selectQuiz(j)); return;
    }
    if (s.id === 'spread') {
      const W_spread = { 0: ['In percentage points', `company’s yield − Treasury yield = ${t.corp.toFixed(2)} − ${t.tsy.toFixed(2)}`], 1: ['In basis points', 'percentage points × 100'] };
      const sc = sceneSpread(s); mount(sc);
      screen(s, { scene: 'Lenders treat the U.S. government as the borrower most sure to repay, so a company pays a higher yield.', ask: `A company’s 10-year bond yields <b>${p2(t.corp)}</b>. A 10-year Treasury bond, the U.S. government’s own IOU, yields <b>${p2(t.tsy)}</b>. What is the company’s spread?`,
        body: boxesHtml(C.linesFor(t), L.rows, W_spread), example: EX.spread, hint: hintFor(t) });
      wireRows(s, { words: W_spread, onInput: (r) => sc.update(r), onRows: (rr, ok) => sc.reveal(ok), praise: () => `${C.praise(t, h)} On $1,000,000 of the bond, that is ${money(100 * t.bps)} a year more than a Treasury pays.` }); return;
    }
    if (s.id === 'q4') {
      const sc = sceneDragovia(s); mount(sc); const DG = W0.DRAGOVIA, yA = W0.yieldAt(DG.after, DG.coupon, DG.years) * 100;
      screen(s, { scene: 'The news comes in. Dragovia’s finance minister promises on TV to pay every coupon; the lenders walk out.', ask: esc(C.quiz[s.quiz].q), body: quizHtml(s) });
      wireQuiz(s, (pick, ok) => { sc.answered(ok); if (ok) fb(`<b>Right.</b> ${esc(C.quiz[s.quiz].why[pick].replace(/^Right\.\s*/, ''))} Doubt is what widens a spread: Dragovia’s spread over the Treasury went from ${Math.round((6 - 4) * 100)} to about ${Math.round((yA - 4) * 100)} basis points, while the Treasury did not move.`, true); }); return;
    }
    if (s.id === 'pr') {
      const W_pr = { 0: ['Fall in the quote', `${t.p0} − ${t.p1}`], 1: ['Percent fall', `fall ÷ starting quote, ${t.p0}`] };
      const sc = scenePR(s); mount(sc);
      const REASONS = [['recover', 'Lenders now expected to get back less of what they were owed'], ['rate', 'Puerto Rico had raised the interest rate on its bonds'], ['fed', 'The Fed raised interest rates that day']];
      screen(s, { scene: 'It is October 2017. Hurricane Maria has devastated Puerto Rico, which was already in a form of bankruptcy.',
        ask: `The U.S. president says its debt will have to be wiped out. Puerto Rico’s main bond had a quote of <b>${t.p0}</b>; the next day it fell as low as about <b>${t.p1}</b>. A percent fall is the fall divided by the starting price. By what percent had it fallen at that low?`,
        body: boxesHtml(C.linesFor(t), L.rows, W_pr) + `<fieldset class="why" id="whyBox" ${L.done || L.choice ? '' : 'hidden'}><legend>Why did one sentence move the price so much?</legend>${chips('dec', REASONS, L.choice)}</fieldset>`, example: EX.pr, hint: hintFor(t) });
      wireRows(s, { words: W_pr, choice: 'dec', onRows: (rr) => sc.rows(rr), onMiss: () => { const rr = C.judgeTask(t, { rows: L.rows, choice: 'recover' }, h); if (rr.ok && !$('input[name=dec]:checked', con)) { $('#whyBox').hidden = false; const ex = $('details.worked', con); if (ex) ex.open = false; fb('<b>Both numbers are right.</b> Now choose why one sentence moved the price so much, and check again.', null); } } }); return;
    }
    if (s.id === 'bridge') {
      const W_bridge = { 0: ['Percent the price falls', 'duration × rise in rates'], 1: ['Loss, in billions of dollars', 'percent fall × what the bonds were worth'] };
      let sc; const parseBil = (v) => { const x = h.parseMoney(String(v == null ? '' : v).replace(/\s*(billions?|bn|b)\s*$/i, '')); return isFinite(x) && Math.abs(x) >= 1e5 ? x / 1e9 : x; };
      sc = sceneBridge(s, { onDial: () => {}, onLanded: () => { fb(`<b>The gauge landed on your number.</b> The bonds lost about $${fix(t.answer)} billion, and no borrower missed a payment. <b>In Unit 5 you meet that bank: Silicon Valley Bank.</b> At the end of 2022, its long-term bonds had a duration of about 6.`, true); showNext(); },
        onMiss: (v) => fb(`<b>Off your mark.</b> The gauge stopped at a loss of about $${fix(t.answer)} billion; your answer said $${fix(v)} billion. Check the two lines and try again.`, false) });
      mount(sc);
      screen(s, { scene: 'The same calculation as the Duration step, with a bank’s numbers.', ask: `In 2021, a bank put <b>$${t.A} billion</b> of its depositors’ money into bonds with duration <b>${t.D}</b>. Then rates rose <b>${fix(t.dy)}</b> percentage points. About how much did the bonds lose?`,
        body: boxesHtml(C.linesFor(t), L.rows, W_bridge), example: EX.bridge, hint: hintFor(t) });
      wireRows(s, { words: W_bridge, praise: () => `About $${fix(t.answer)} billion. Now turn the Fed’s dial on the left up ${fix(t.dy)} percentage points and watch the gauge drain.`, onDone: () => { $('#nextRow').hidden = true; sc.unlock(); },
        onMiss: (rows) => { const v = parseBil(rows[1]); if (isFinite(v) && v > 0) { sc.arm(v); fb($('#fb').innerHTML + ' You can also turn the Fed’s dial to test your number on the gauge.', false); } } });
      if (L.done) { sc.unlock(); showNext(); }
      return;
    }
    if (s.id === 'note') {
      const sc = sceneLedger(); mount(sc); const N = C.note, n = S.notes;
      const f = (k, lab) => `<div><label for="n_${k}">${lab}</label><textarea id="n_${k}" data-k="${k}" rows="2">${esc(n[k] || '')}</textarea></div>`;
      screen(s, { boss: esc(N.prompt), body: `<div class="ledger">${f('ba', 'Bonds: an advantage')}${f('bd', 'Bonds: a drawback')}${f('sa', 'Shares: an advantage')}${f('sd', 'Shares: a drawback')}</div><p class="wc" id="wc" aria-live="polite"></p>`, check: false });
      const compose = () => ['ba', 'bd', 'sa', 'sd'].map((k) => `${{ ba: 'Bonds, advantage', bd: 'Bonds, drawback', sa: 'Shares, advantage', sd: 'Shares, drawback' }[k]}: ${String(n[k] || '').trim().replace(/[.\s]+$/, '')}.`).join(' ');
      const own = () => ['ba', 'bd', 'sa', 'sd'].reduce((a, k) => a + words(n[k]), 0), all4 = () => ['ba', 'bd', 'sa', 'sd'].every((k) => words(n[k]) > 0);
      const upd = () => { const w = own(), ok = w >= N.minWords && all4();
        $('#wc').textContent = ok ? `${w} words. Saved; your note prints on your receipt.` : `${w} of ${N.minWords} words, across all four boxes. It saves itself.`;
        if (ok) { S.memo = compose(); if (!L.done) { L.attempts = Math.max(L.attempts || 0, 1); markDone(s.id); showNext(); } } else if (!L.done) S.memo = compose(); save(); sc.update(); };
      $$('.ledger textarea', con).forEach((ta) => ta.addEventListener('input', () => { n[ta.dataset.k] = ta.value; upd(); })); upd(); return;
    }
  }

  // ======================= navigation =======================
  function go(id) {
    if (!S.code) return showStart();
    S.at = id; save(); renderTape();
    if (id === 'receipt') showReceipt(); else showStep(D.STEPS[idx(id)]);
    con.scrollTop = 0; window.scrollTo(0, 0);
    const t = $('#t', con) || con; t.setAttribute('tabindex', '-1'); t.focus({ preventScroll: true });
  }

  function showStart() {
    S.at = 'start'; renderTape();
    const last = store.get(KEY + ':last'); const saved = last ? store.get(KEY + ':' + D.seedFor(last)) : null;
    mount(sceneStart());
    con.innerHTML = `<p class="kicker">Financial Markets and Institutions, Unit 4</p><h1 id="t">The Bond Desk</h1>
      <p class="lead">Practice the bond numbers from this unit at Great Lakes Community Bank, which keeps part of its depositors’ money in bonds.</p>
      <ul class="plan"><li>Read a bond quote.</li><li>See which way a bond’s price moves when rates rise.</li><li>Estimate a loss with duration.</li><li>Measure a spread, and see what widens it.</li><li>Work out what rising rates cost a real bank.</li></ul>
      <p>Eleven short steps, one question each. Every calculation has a worked example beside it, and a hint is always there.</p>
      <p class="credit"><b>Finish all eleven steps and download your receipt to earn the 60 points.</b> A wrong answer never costs anything.</p>
      <div class="actions"><button class="btn go" type="button" id="goBtn">${saved ? 'Continue where you left off' : 'Start'}</button></div>`;
    $('#goBtn').addEventListener('click', () => { startFor(saved ? last : h.newCode()); const first = D.STEPS.find((s) => !S.log[s.id].done); go(saved && S.at && S.at !== 'start' ? S.at : (first ? first.id : 'receipt')); });
  }
  // Housekeeping, out of the way: continuing on another computer lives in the footer.
  function wireResume() {
    const d = $('#resume'); if (!d) return;
    $('#codeForm').addEventListener('submit', (e) => { e.preventDefault(); const v = $('#dc').value; if (!h.validCode(v)) { $('#startErr').textContent = 'A desk code is 8 letters and numbers, like ABCD-2345.'; $('#dc').focus(); return; } startFor(v); const first = D.STEPS.find((s) => !S.log[s.id].done); go(S.at && S.at !== 'start' ? S.at : (first ? first.id : 'receipt')); d.open = false; });
  }
  wireResume();

  // ======================= receipt =======================
  function wrapLines(g, text, maxW, maxLines) { const ws = String(text).replace(/\s+/g, ' ').trim().split(' '); const lines = []; let cur = ''; for (const w of ws) { const t2 = cur ? cur + ' ' + w : w; if (g.measureText(t2).width > maxW && cur) { lines.push(cur); cur = w; } else cur = t2; } if (cur) lines.push(cur); if (lines.length > maxLines) { lines.length = maxLines; lines[maxLines - 1] += ' …'; } return lines; }
  async function makeReceiptBlob() {
    try { await Promise.all([document.fonts.load('800 60px "Big Shoulders Display"'), document.fonts.load('700 30px "Big Shoulders Display"'), document.fonts.load('400 20px "Public Sans"'), document.fonts.load('600 20px "Public Sans"')]); } catch (e) { /* system fonts */ }
    const payload = D.makePayload(S.code, S.log, S.memo); const done = doneCount(), pts = D.pointsFor(done), n = D.STEPS.length;
    const cols = 4, rowsN = Math.ceil(n / cols), boxW = Math.floor((1040 - (cols - 1) * 12) / cols);
    const cv = document.createElement('canvas'); cv.width = 1200; cv.height = 1010 + rowsN * 84; const g = cv.getContext('2d'); const Hh = cv.height;
    const DISP = '"Big Shoulders Display", "Arial Narrow", sans-serif', TXT = '"Public Sans", Arial, sans-serif';
    g.fillStyle = '#F3F6F8'; g.fillRect(0, 0, 1200, Hh);
    g.fillStyle = '#0A1524'; g.fillRect(0, 0, 1200, 250);
    // the beam mark
    g.strokeStyle = '#FFB447'; g.lineWidth = 8; g.lineCap = 'round'; g.beginPath(); g.moveTo(940, 92); g.lineTo(1120, 128); g.stroke();
    g.fillStyle = '#E9EEF2'; g.beginPath(); g.moveTo(1012, 108); g.lineTo(990, 160); g.lineTo(1034, 160); g.closePath(); g.fill();
    g.fillStyle = '#9DB0C2'; g.font = `400 22px ${TXT}`; g.fillText('Great Lakes Community Bank. Financial Markets and Institutions, Unit 4', 80, 76);
    g.fillStyle = '#E9EEF2'; g.font = `800 78px ${DISP}`; g.fillText('The Bond Desk', 80, 158);
    g.fillStyle = '#FFB447'; g.font = `700 34px ${DISP}`; g.fillText('Desk code ' + h.fmtCode(S.code), 80, 212);
    g.fillStyle = done === n ? '#0A1524' : '#8A5A00'; g.fillRect(80, 290, 1040, 104);
    g.fillStyle = done === n ? '#FFB447' : '#FFFFFF'; g.font = `800 56px ${DISP}`; g.fillText('Points: ' + pts + ' / ' + D.POINTS, 110, 362);
    g.fillStyle = '#FFFFFF'; g.font = `400 22px ${TXT}`; g.textAlign = 'right'; g.fillText(done + ' of ' + n + ' steps complete. Graded on completion.', 1092, 352); g.textAlign = 'left';
    D.STEPS.forEach((s, k) => {
      const x = 80 + (k % cols) * (boxW + 12), y = 420 + Math.floor(k / cols) * 84, l = S.log[s.id];
      g.fillStyle = l.done ? '#E2EAF0' : '#FBE7E4'; g.fillRect(x, y, boxW, 70);
      g.fillStyle = l.done ? '#0A1524' : '#A8261E'; g.font = `600 19px ${TXT}`; let tl = (l.done ? '✓ ' : '✗ ') + s.label; while (g.measureText(tl).width > boxW - 24 && tl.length > 6) tl = tl.slice(0, -2) + '…';
      g.fillText(tl, x + 14, y + 31); g.fillStyle = '#4C5A67'; g.font = `400 16px ${TXT}`; g.fillText(l.done ? 'complete' : 'not finished', x + 14, y + 55);
    });
    const ny = 420 + rowsN * 84 + 44; g.fillStyle = '#0A1524'; g.font = `800 30px ${DISP}`; g.fillText(C.note.receiptHeading, 80, ny);
    g.font = `400 20px ${TXT}`; g.fillStyle = '#1B2733'; (S.memo.trim() ? wrapLines(g, S.memo, 1040, 9) : ['(no note yet)']).forEach((ln, i) => g.fillText(ln, 80, ny + 36 + i * 29));
    g.fillStyle = '#4C5A67'; g.font = `400 19px ${TXT}`; g.fillText('Issued ' + new Date(payload.issued).toLocaleString('en-US', { dateStyle: 'long', timeStyle: 'short' }), 80, Hh - 138);
    g.fillStyle = '#0A1524'; g.font = `700 30px ${DISP}`; g.fillText('Verification code  ' + D.shortCode(payload.sum), 80, Hh - 98);
    g.fillStyle = '#4C5A67'; g.font = `400 17px ${TXT}`; g.fillText('Instructors: enter the points shown above. To spot-check, open ' + C.verifyUrl.replace('https://', ''), 80, Hh - 60);
    const blob = await new Promise((res) => cv.toBlob(res, 'image/png')); const bytes = new Uint8Array(await blob.arrayBuffer());
    return { blob: new Blob([D.addTextChunk(bytes, D.encodeReceipt(payload))], { type: 'image/png' }), url: cv.toDataURL('image/png'), payload, pts, done };
  }
  function startPractice() { const k = KEY + ':practice:' + D.seedFor(S.code); const r = (Number(store.get(k)) || 0) + 1; store.set(k, r); S.practice = r; S.tasks = D.buildTasks(S.code + 'P' + r); S.log = blankLog(); go('quote'); }
  function endPractice() { const c = S.code; startFor(c); go('receipt'); }
  async function showReceipt() {
    if (S.practice) {
      const tasks = D.STEPS.filter((s) => s.kind === 'task'), dn = tasks.filter((s) => S.log[s.id].done).length;
      mount(sceneStart());
      con.innerHTML = `<p class="practice"><b>Practice round ${S.practice}.</b> New numbers, not graded.</p><h2 id="t">You solved ${dn} of ${tasks.length} problems with new numbers.</h2><p>Practice rounds are never graded. Your graded receipt is exactly as you left it.</p><div class="actions"><button class="btn" type="button" id="again">Practice again with new numbers</button><button class="btn quiet" type="button" id="back">Back to my graded receipt</button></div>`;
      $('#again').addEventListener('click', startPractice); $('#back').addEventListener('click', endPractice); return;
    }
    const r = await makeReceiptBlob(); const all = r.done === D.STEPS.length; const fileName = C.filePrefix + '_' + h.fmtCode(S.code) + '.png';
    mount({ layout(Wd, Hd) { backdrop(Wd, Hd, { pool: [Wd / 2, Hd / 2, Wd * 0.5] }); overlay.innerHTML = `<img class="slip" src="${r.url}" alt="Receipt preview: desk code ${h.fmtCode(S.code)}, ${r.pts} of ${D.POINTS} points, ${r.done} of ${D.STEPS.length} steps complete, verification code ${D.shortCode(r.payload.sum)}.">`; describe('Your receipt, a printed confirmation slip.'); } });
    con.innerHTML = `<p class="kicker">Your receipt</p><p class="points">${r.pts} <small>/ ${D.POINTS} points</small></p><h2 id="t">${all ? 'Every step is complete.' : 'A few steps are still open.'}</h2>
      <p>${all ? 'Download your receipt and upload it to the assignment page.' : 'This assignment is graded on completion. Finish the open steps below for full credit, then download your receipt.'}</p>
      ${all ? '' : `<ul class="openlist">${D.STEPS.filter((s) => !S.log[s.id].done).map((s) => `<li><span>${esc(TITLES[s.id])}</span><button class="btn small quiet" type="button" data-go="${s.id}">Go to this step</button></li>`).join('')}</ul>`}
      <div class="actions"><a class="btn" id="dl" download="${fileName}" href="#">Download your receipt</a></div>
      <p class="hint">The file is named ${esc(fileName)}. Upload the downloaded file itself, not a screenshot: your instructor’s checker reads data stored inside the file. If you finish more steps later, download a new receipt.</p>
      <p style="margin-top:22px"><b>Want more practice?</b> Work the problems again with new numbers. Practice rounds are not graded and do not change this receipt.</p><div class="actions"><button class="btn quiet small" type="button" id="practice">Practice with new numbers</button></div>`;
    $('#practice').addEventListener('click', startPractice);
    $('#dl').href = URL.createObjectURL(r.blob);
    $$('[data-go]', con).forEach((b) => b.addEventListener('click', () => go(b.dataset.go)));
  }

  // ======================= boot =======================
  const last = store.get(KEY + ':last'); const lastSaved = last ? store.get(KEY + ':' + D.seedFor(last)) : null;
  if (lastSaved && lastSaved.code) { startFor(lastSaved.code); go(S.at && S.at !== 'start' ? S.at : D.STEPS[0].id); } else showStart();

  // ======================= self-checks (interactive-health contract) =======================
  const checks = []; const reg = (name, fn) => checks.push({ name, fn });
  window.__selfCheck = async () => { const out = []; for (const c of checks) { try { const r = await c.fn(); out.push(r === true || r === undefined ? { name: c.name, ok: true } : r === false ? { name: c.name, ok: false } : { name: c.name, ok: !!r.ok, detail: r.detail }); } catch (e) { out.push({ name: c.name, ok: false, detail: String(e) }); } } return { ok: out.every((x) => x.ok), checks: out }; };
  reg('tasks generate for a desk code', () => D.buildTasks('SELFCHEK').length === D.STEPS.filter((s) => s.kind === 'task').length || { ok: false, detail: 'task count mismatch' });
  reg('each task accepts its own answer and rejects a wrong one', () => { for (const t of D.buildTasks('SELFCHEK')) { if (!C.judgeTask(t, C.selfAnswer(t, h), h).ok) return { ok: false, detail: t.id + ' rejects its own answer' }; if (C.judgeTask(t, C.selfWrong(t, h), h).ok) return { ok: false, detail: t.id + ' accepts a wrong answer' }; } return true; });
  reg('every check grades its right answer right and the others wrong', () => { for (const s of D.STEPS.filter((x) => x.kind === 'check')) { const q = C.quiz[s.quiz]; for (let j = 0; j < 4; j++) if (D.judgeQuiz(s.quiz, j).ok !== (j === q.answer)) return { ok: false, detail: `${s.id} option ${j}` }; } return true; });
  reg('the beam: tapping the 30-year bond at the target passes, the 2-year fails', () => { const t = D.buildTasks('SELFCHEK').find((x) => x.id === 'seesaw'); const y = t.y * 100; const a = C.judgeTask(t, W0.seesawEntry(y, 'long'), h).ok, b = C.judgeTask(t, W0.seesawEntry(y, 'short'), h).ok, c = C.judgeTask(t, W0.seesawEntry(4, 'long'), h).ok; return (a && !b && !c) || { ok: false, detail: `long ${a}, short ${b}, at 4% ${c}` }; });
  reg('2022 data present: 249 trading days, 2-year 0.78 to 4.41, Fed range ends 4.25 to 4.50', () => { const T = W0.T22; return (T.length === 249 && T[0][1] === 0.78 && T[T.length - 1][1] === 4.41 && W0.FED_2022[W0.FED_2022.length - 1].hi === 4.5) || { ok: false, detail: `days ${T.length}` }; });
  reg('the stage drew something', () => svg.childElementCount > 1 || overlay.childElementCount > 0 || { ok: false, detail: 'stage is empty' });
  reg('the beam draws two bonds and the grip moves their prices', () => {
    const before = defs.childElementCount, g = E('g', {}); const bm = Beam({ tokens: seesawTokens(false), handle: true, yieldScale: true });
    try { bm.build(g, 300, 300, 150, 400, 800, 600); bm.setYield(6.5); const toks = g.querySelectorAll('.token').length; const p30 = W0.seesawPrice(30, 4 + bm.dyT);
      return (toks === 2 && Math.abs(bm.dyT - 2.5) < 1e-9 && p30 < 1000) || { ok: false, detail: `tokens ${toks}, rise ${bm.dyT}, 30-year price ${p30}` };
    } finally { while (defs.childElementCount > before) defs.lastChild.remove(); }
  });
  reg('a step view rendered', () => con.textContent.trim().length > 150 || { ok: false, detail: 'console is empty' });
  reg('receipt PNG round-trips its payload', async () => {
    const code = 'SELFCHEK'; const tasks = D.buildTasks(code); const log = {};
    D.STEPS.forEach((s) => { if (s.kind === 'check') log[s.id] = { done: true, choice: C.quiz[s.quiz].answer }; else if (s.kind === 'task') log[s.id] = Object.assign({ done: true }, C.selfAnswer(tasks.find((t) => t.id === s.id), h)); else log[s.id] = { done: true }; });
    const p = D.makePayload(code, log, 'word '.repeat(C.note.minWords + 5));
    const cv2 = document.createElement('canvas'); cv2.width = 20; cv2.height = 20; const blob = await new Promise((res) => cv2.toBlob(res, 'image/png'));
    const v = D.verifyPayload(D.decodeReceipt(D.readTextChunk(D.addTextChunk(new Uint8Array(await blob.arrayBuffer()), D.encodeReceipt(p)))));
    return (v.checksumOk && v.done === D.STEPS.length && v.points === D.POINTS) || { ok: false, detail: JSON.stringify(v.problems) };
  });
  window.__bond = { go, S: () => S, scene: () => scene, task };
})();

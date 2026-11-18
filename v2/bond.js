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
  const SHOW = { pct: (v) => fix(v * 100, 2) + '%', money: mm, pts: (v) => fix(v) + ' points', bps: (v) => fix(v, 0) + ' basis points', cents: (v) => fix(v) + ' cents', bil: (v) => '$' + fix(v) + ' billion', text: (v) => String(v) };
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
          if (!geo.narrow) { E('path', { d: `M${sx - 30} ${ty - 6} l9 6 l-9 6 z`, fill: '#FFB447' }, targetG); T(targetG, sx - 36, ty + 5, 'pull to ' + p2(o.target), { 'text-anchor': 'end', class: 'sod disp', style: 'font-size:15px' }); }
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
        const w = tk.kind === 'block' ? (geo.narrow ? 88 : 140) : (geo.narrow ? 56 : 88), hh = tk.kind === 'block' ? (geo.narrow ? 54 : 84) : (geo.narrow ? 40 : 58);
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
      if (readout) { readout.at(lx, ly - (o.handle ? 40 : 26)); readout.frame(dt); if (B._riseCap) { B._riseCap.setAttribute('x', lx); B._riseCap.setAttribute('y', ly - (geo.narrow ? 46 : 54)); B._riseCap.textContent = 'rates up, points'; } }
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
  // Two ways to play. Class mode is the graded desk (eleven steps, receipt). Friend mode is the seven calls with no
  // arithmetic, a fresh random desk each time, nothing saved, ending on the scorecard.
  let S = { code: '', tasks: [], log: {}, memo: '', notes: {}, calls: {}, at: 'start', practice: 0, friend: false };
  const blankLog = () => { const l = {}; D.STEPS.forEach((s) => { l[s.id] = { done: false, attempts: 0, help: 0 }; }); return l; };
  function save() { if (S.practice || S.friend || !S.code) return; store.set(KEY + ':' + D.seedFor(S.code), { code: S.code, log: S.log, memo: S.memo, notes: S.notes, calls: S.calls, at: S.at }); store.set(KEY + ':last', S.code); }
  function startFor(code) {
    S.code = h.normCode(code); S.tasks = D.buildTasks(S.code); S.practice = 0; S.friend = false;
    const saved = store.get(KEY + ':' + D.seedFor(S.code));
    S.log = saved && saved.log ? saved.log : blankLog(); D.STEPS.forEach((s) => { if (!S.log[s.id]) S.log[s.id] = { done: false, attempts: 0, help: 0 }; });
    S.memo = saved && saved.memo ? saved.memo : ''; S.notes = saved && saved.notes ? saved.notes : {}; S.calls = saved && saved.calls ? saved.calls : {}; renderCalls();
    S.at = saved && saved.at ? saved.at : D.STEPS[0].id; save();
  }
  function startFriend() { S = { code: h.newCode(), tasks: [], log: blankLog(), memo: '', notes: {}, calls: {}, at: 'q1', practice: 0, friend: true }; S.tasks = D.buildTasks(S.code + 'F'); renderCalls(); go('q1'); }
  const doneCount = () => D.STEPS.filter((s) => S.log[s.id] && S.log[s.id].done).length;
  const idx = (id) => D.STEPS.findIndex((x) => x.id === id);
  const task = (id) => S.tasks.find((t) => t.id === id);
  function markDone(id) { const L = S.log[id]; if (!L.done) { L.done = true; L.at = new Date().toISOString(); } save(); renderTape(); }
  const SEQ_CLASS = ['q1', 'quote', 'seesaw', 'q2', 'dur1', 'q3', 'spread', 'q4', 'pr', 'bridge', 'score', 'note', 'receipt'];
  const SEQ_FRIEND = ['q1', 'seesaw', 'q2', 'q3', 'q4', 'bridge', 'score'];
  const seq = () => (S.friend ? SEQ_FRIEND : SEQ_CLASS);
  const nextId = (id) => { const q = seq(), i = q.indexOf(id); return i >= 0 && i < q.length - 1 ? q[i + 1] : (S.friend ? 'score' : 'receipt'); };
  const TITLES = { q1: 'Back to 2022', quote: 'Read a Quote', seesaw: 'The Seesaw', q2: 'Old Bond, New Rates', dur1: 'Duration', q3: 'Which Loses Most?', spread: 'Spread over Treasuries', q4: 'Dragovia', pr: 'One Sentence That Moved a Market', bridge: 'A Bank’s Big Bet', note: 'Bonds or Shares?' };
  const nextLabel = (id) => { const n = nextId(id); return n === 'receipt' ? 'Go to your receipt' : n === 'score' ? 'See how your calls went' : 'Next: ' + TITLES[n]; };
  // Calls: what the player commits to before the world answers. Only the first try counts. Never graded or on the receipt.
  const CALL_LABELS = { bet22: 'Where Dick’s bond ended 2022', q1: 'Which rate rose more in 2022', quote: 'What a quoted bond really costs', seesaw: 'Which bond falls further', q2: 'What a fixed coupon does when rates rise', dur1: 'How far the bond’s price falls', q3: 'Which bond loses most', spread: 'How big the spread is', q4: 'What Dragovia’s bonds do', pr: 'How much Puerto Rico’s bond lost', bridge: 'How much the bank loses' };
  const callIds = () => (S.friend ? ['bet22', 'q1', 'seesaw', 'q2', 'q3', 'q4', 'bridge'] : ['bet22', 'q1', 'quote', 'seesaw', 'q2', 'dur1', 'q3', 'spread', 'q4', 'pr', 'bridge']);
  function recordCall(id, ok) { if (S.practice || !S.code || S.calls[id] != null) return; S.calls[id] = !!ok; save(); renderCalls(true); }
  function renderCalls(bump) { const b = document.getElementById('callsBadge'); if (!b) return; const made = callIds().filter((k) => S.calls && S.calls[k] != null), right = made.filter((k) => S.calls[k]).length; b.hidden = !S.code || !made.length; b.innerHTML = `Calls <b>${right}</b> of ${made.length}`; b.setAttribute('aria-label', `Your calls so far: ${right} right of ${made.length}`); if (bump && !RM) { b.classList.remove('bump'); void b.offsetWidth; b.classList.add('bump'); } }

  // ======================= the tape (step navigation) =======================
  function renderTape() {
    const ol = $('#tape'); ol.innerHTML = '';
    $('#codeNote').innerHTML = S.code && !S.friend ? `Desk code <b class="code">${h.fmtCode(S.code)}</b>. Use it to continue on another computer.` : '';
    if (!S.code) return;
    const items = S.friend ? SEQ_FRIEND.map((id) => ({ id })) : [...D.STEPS, { id: 'receipt' }];
    items.forEach((s, i) => {
      const li = document.createElement('li'); const b = document.createElement('button'); b.type = 'button'; b.className = 'notch';
      const isEnd = s.id === 'receipt' || s.id === 'score';
      const done = s.id === 'receipt' ? doneCount() === D.STEPS.length : s.id === 'score' ? false : S.log[s.id].done;
      if (done) b.classList.add('done'); if (S.at === s.id) b.setAttribute('aria-current', 'step');
      const name = s.id === 'receipt' ? 'Receipt' : s.id === 'score' ? 'Scorecard' : TITLES[s.id];
      b.setAttribute('aria-label', isEnd ? name : `Step ${i + 1}, ${name}${done ? ', finished' : ', not finished yet'}`);
      b.title = name; b.innerHTML = `<span aria-hidden="true">${s.id === 'receipt' ? 'R' : s.id === 'score' ? '★' : i + 1}</span><span class="tick" aria-hidden="true"></span>`;
      b.addEventListener('click', () => go(s.id)); li.appendChild(b); ol.appendChild(li);
    });
  }

  // ======================= the people at the desk =======================
  // Drawn in the night-desk style: busts in steel and sodium, no facial detail. Each has a role and a voice.
  const PEOPLE = {
    boss: { role: 'The treasurer, your boss' },
    sales: { role: 'A bond salesman on the phone' },
    customer: { role: 'A customer at the front desk' },
    minister: { role: 'Dragovia’s finance minister' },
    colleague: { role: 'The colleague who bought them' },
    news: { role: 'The news, October 2017' },
  };
  function portraitBody(who) {
    const sk = '#3C5672', rim = '#FFB447';
    return {
      boss: `<path d="M8 64c2-14 11-20 24-20s22 6 24 20z" fill="#1D3149"/><path d="M26 45l6 9 6-9" fill="#E9EEF2"/><ellipse cx="32" cy="28" rx="10" ry="12" fill="${sk}"/><path d="M21 30c-1-12 6-17 11-17s13 4 11 17c-2-6-6-9-11-9s-9 3-11 9z" fill="#0A1524"/><g fill="none" stroke="${rim}" stroke-width="1.4"><circle cx="28" cy="29" r="3.2"/><circle cx="36.5" cy="29" r="3.2"/><path d="M31.2 29h2.1"/></g>`,
      sales: `<path d="M8 64c2-14 11-20 24-20s22 6 24 20z" fill="#2B425C"/><path d="M28 44h8l-4 20z" fill="${rim}"/><ellipse cx="32" cy="28" rx="10" ry="12" fill="${sk}"/><path d="M22 25c0-9 6-12 11-12 6 0 10 3 10 10-4-4-10-5-21 2z" fill="#0A1524"/><path d="M42 26c4 0 5 9 1 11" fill="none" stroke="#9DB0C2" stroke-width="1.6"/><circle cx="41" cy="38" r="2" fill="#9DB0C2"/>`,
      customer: `<path d="M8 64c2-14 11-20 24-20s22 6 24 20z" fill="#3A4B5E"/><path d="M24 46l8 10 8-10" fill="none" stroke="#9DB0C2" stroke-width="1.5"/><ellipse cx="32" cy="29" rx="10" ry="12" fill="${sk}"/><path d="M21 28c0-10 5-14 11-14s11 4 11 14c-2-5-5-6-11-6s-9 1-11 6z" fill="#E9EEF2"/>`,
      minister: `<path d="M8 64c2-14 11-20 24-20s22 6 24 20z" fill="#16263A"/><path d="M16 50l30 12" stroke="#FF8A7A" stroke-width="5"/><ellipse cx="32" cy="28" rx="10" ry="12" fill="${sk}"/><path d="M22 26c0-8 4-11 10-11s10 3 10 11c-3-4-6-5-10-5s-7 1-10 5z" fill="#2B425C"/><rect x="29" y="50" width="6" height="14" rx="2" fill="#0A1524"/><circle cx="32" cy="50" r="4" fill="#0A1524" stroke="#9DB0C2"/>`,
      colleague: `<path d="M8 64c2-14 11-20 24-20s22 6 24 20z" fill="#24384F"/><path d="M22 44c3 6 17 6 20 0" fill="none" stroke="#0A1524" stroke-width="2"/><ellipse cx="32" cy="29" rx="10" ry="12" fill="${sk}"/><path d="M20 27c-1-11 6-15 12-15s14 4 12 15c-1-2-2-3-3-3-2 0-3 2-4 2-2 0-3-3-5-3s-3 3-5 3c-1 0-2-2-4-2-1 0-2 1-3 3z" fill="#0A1524"/><rect x="44" y="50" width="8" height="10" rx="1.5" fill="${rim}"/>`,
      news: `<rect x="12" y="16" width="40" height="32" rx="2" fill="#E9EEF2"/><rect x="16" y="21" width="32" height="5" fill="#0A1524"/><path d="M16 31h32M16 36h32M16 41h20" stroke="#5A7590" stroke-width="2"/>`,
    }[who] || '';
  }
  function portrait(who, size) {
    const s = size || 56;
    return `<svg class="portrait" viewBox="0 0 64 64" width="${s}" height="${s}" aria-hidden="true"><circle cx="32" cy="32" r="31" fill="#0E1B2D" stroke="#2B425C"/><g style="clip-path:circle(31px at 32px 32px)">${portraitBody(who)}</g></svg>`;
  }
  const speaker = (who, line) => `<div class="speaker" id="spk">${portrait(who)}<div><p class="who" id="spkWho">${esc(PEOPLE[who].role)}</p><p class="say" id="say">${line}</p></div></div>`;
  function say(who, line, mood) {
    const spk = $('#spk'); if (!spk) return; spk.querySelector('svg').outerHTML = portrait(who); $('#spkWho').textContent = PEOPLE[who].role; const p = $('#say'); p.innerHTML = line;
    spk.className = 'speaker' + (mood ? ' ' + mood : ''); if (!RM) { spk.classList.remove('pop'); void spk.offsetWidth; spk.classList.add('pop'); }
  }

  // ======================= console helpers =======================
  const con = $('#console');
  const kicker = (id) => `${S.practice ? `<p class="practice"><b>Practice round ${S.practice}.</b> New numbers, not graded.</p>` : ''}<p class="kicker">${S.friend ? 'Friend mode' : `Step ${idx(id) + 1} of ${D.STEPS.length}`}</p>`;
  const pager = (id) => { const q = seq(), i = q.indexOf(id); const prev = i > 0 ? q[i - 1] : null; const nxt = nextId(id); return `<nav class="pager" aria-label="Previous and next step">${prev ? `<button type="button" data-go="${prev}">Back</button>` : '<span></span>'}<button type="button" data-go="${nxt}">${nxt === 'receipt' ? 'Receipt' : nxt === 'score' ? 'Skip to the scorecard' : 'Skip this step'}</button></nav>`; };
  function wireCommon(id) { $$('[data-go]', con).forEach((b) => b.addEventListener('click', () => go(b.dataset.go))); const nb = $('#nextBtn'); if (nb) nb.addEventListener('click', () => go(nextId(id))); }
  // When a step is done, its controls give way to the way on, so the next action is always on screen.
  function showNext(keep) { const r = $('#nextRow'); if (r) r.hidden = false; const c = $('#controls'); if (c && !keep) { c.hidden = true; $('#helpRow').hidden = true; $('#helpBox').innerHTML = ''; } }
  const nextRow = (id, done) => `<div class="actions" id="nextRow" ${done ? '' : 'hidden'}><button class="btn" type="button" id="nextBtn">${esc(nextLabel(id))}</button></div>`;
  // One step's console: title, the person who wants something, the controls, what happened, and the way on.
  function shell(s, o) {
    con.innerHTML = `${kicker(s.id)}<h2 id="t">${esc(TITLES[s.id])}</h2>${speaker(o.who, o.line)}
      <div id="controls">${o.controls || ''}</div><div class="fb" id="fb" aria-live="polite"></div><div class="actions" id="helpRow" hidden></div><div class="helpbox" id="helpBox" aria-live="polite"></div>
      ${nextRow(s.id, o.done)}${pager(s.id)}`;
    wireCommon(s.id);
  }
  // Answers you tap: a set of styled radios. Returns the selected value through onPick.
  const chips = (name, opts, cur, cls) => `<div class="tickets ${cls || ''}" role="radiogroup">${opts.map(([v, tx]) => `<label class="ticket"><input type="radio" name="${name}" value="${esc(v)}" ${String(cur) === String(v) ? 'checked' : ''}><span>${tx}</span></label>`).join('')}</div>`;
  function onChips(name, fn) { $$(`input[name="${name}"]`, con).forEach((r) => r.addEventListener('change', () => fn(r.value))); }
  // A number the player sets by dragging on the stage, with − and + here for touch and keyboard.
  function Setter(o) {
    const st = { v: o.value, listeners: [] };
    st.snap = (v) => Math.min(o.max, Math.max(o.min, Math.round((v - o.min) / o.step) * o.step + o.min));
    st.set = (v, user) => { v = +st.snap(v).toFixed(6); if (v === st.v) return; st.v = v; const r = $('#setVal'); if (r) r.innerHTML = o.fmt(v); st.listeners.forEach((f) => f(v, user)); if (user) Sound.tick(); };
    st.on = (f) => st.listeners.push(f);
    st.html = () => `<div class="setter" role="group" aria-label="${esc(o.label)}"><button type="button" class="step" data-d="-1" aria-label="Less">−</button><output id="setVal" aria-live="polite">${o.fmt(st.v)}</output><button type="button" class="step" data-d="1" aria-label="More">+</button></div>`;
    st.wire = () => { $$('.setter .step', con).forEach((b) => { let rep = null; const go1 = () => st.set(st.v + Number(b.dataset.d) * o.step, true);
      b.addEventListener('click', go1); b.addEventListener('pointerdown', () => { rep = setTimeout(function r() { go1(); rep = setTimeout(r, 70); }, 380); }); ['pointerup', 'pointerleave', 'pointercancel'].forEach((ev) => b.addEventListener(ev, () => clearTimeout(rep))); }); };
    // a stage handle: pointer drag through toVal(clientX, clientY), and arrow keys
    st.handle = (el, toVal, flipV) => { // flipV: the value grows downward on screen, so Down means more
      el.setAttribute('tabindex', '0'); el.setAttribute('role', 'slider'); el.setAttribute('aria-label', o.label); el.setAttribute('aria-valuemin', o.min); el.setAttribute('aria-valuemax', o.max); el.classList.add('grab');
      const aria = () => { el.setAttribute('aria-valuenow', st.v); el.setAttribute('aria-valuetext', String(o.fmt(st.v)).replace(/<[^>]+>/g, '')); }; aria(); st.on(aria);
      el.addEventListener('pointerdown', (e) => { e.preventDefault(); el.setPointerCapture(e.pointerId); st.drag = true; el.focus({ preventScroll: true }); st.set(toVal(e.clientX, e.clientY), true); });
      el.addEventListener('pointermove', (e) => { if (st.drag) st.set(toVal(e.clientX, e.clientY), true); });
      el.addEventListener('pointerup', () => { st.drag = false; }); el.addEventListener('pointercancel', () => { st.drag = false; });
      el.addEventListener('keydown', (e) => { const k = e.key; const d = k === 'ArrowRight' ? 1 : k === 'ArrowLeft' ? -1 : k === 'ArrowUp' ? (flipV ? -1 : 1) : k === 'ArrowDown' ? (flipV ? 1 : -1) : k === 'PageUp' ? (flipV ? -10 : 10) : k === 'PageDown' ? (flipV ? 10 : -10) : 0; if (d) { e.preventDefault(); st.set(st.v + d * o.step, true); } });
    };
    return st;
  }
  // The help ladder for calculation steps: after a miss, show the first line; after two, every line (version 1's text).
  function helpLadder(t, L) {
    const row = $('#helpRow'); const fails = L.fails || 0; if (!fails || L.done) { row.hidden = true; return; }
    row.hidden = false; row.innerHTML = ['Show me how to start', 'Show me the answer'].slice(0, Math.min(2, fails)).map((lab, i) => `<button class="btn small quiet" type="button" data-l="${i + 1}">${lab}</button>`).join('');
    $$('button[data-l]', row).forEach((b) => b.addEventListener('click', () => { const lvl = Number(b.dataset.l); L.help = Math.max(L.help || 0, lvl); save(); $('#helpBox').innerHTML = C.helpText(t, lvl, h); }));
  }
  // Judge a calculation task from rows the player set or chose; record the attempt, the call and the receipt fields.
  function judgeRows(s, rows, choice) {
    const t = task(s.id), L = S.log[s.id]; const res = C.judgeTask(t, { rows, choice: choice || null, value: null }, h);
    L.attempts = (L.attempts || 0) + 1; recordCall(s.id, res.ok);
    if (res.ok || !L.done) { L.rows = rows; L.choice = choice || null; L.value = null; }
    if (res.ok) { markDone(s.id); Sound.chime(); $('#helpRow').hidden = true; } else { L.fails = (L.fails || 0) + 1; Sound.miss(); helpLadder(t, L); }
    save(); stamp(res.ok ? (L.attempts === 1 ? 'Called it' : 'Right') : 'Not yet', res.ok); return res;
  }
  const fb = (html, ok) => { const f = $('#fb'); f.className = 'fb ' + (ok == null ? '' : ok ? 'ok' : 'bad'); f.innerHTML = html; };
  // A one-question check from version 1's quiz, answered with chips; the scene can mirror and react.
  function quizChips(s, onAnswer) {
    const L = S.log[s.id], q = C.quiz[s.quiz]; const order = W0.optOrder(q);
    return { html: chips('q', order.map((j) => [j, esc(q.options[j])]), L.choice) + `<div class="actions"><button class="btn" type="button" id="checkBtn">Lock it in</button></div>`,
      wire(onPick) {
        if (onPick) onChips('q', (v) => onPick(Number(v)));
        $('#checkBtn').addEventListener('click', () => {
          const c = $('input[name=q]:checked', con); if (!c) { fb('Pick an answer first.', false); return; }
          const pick = Number(c.value); L.attempts = (L.attempts || 0) + 1; const ok = D.judgeQuiz(s.quiz, pick).ok; recordCall(s.id, ok);
          if (ok || !L.done) L.choice = pick; if (ok) { markDone(s.id); Sound.chime(); showNext(); } else Sound.miss();
          stamp(ok ? (L.attempts === 1 ? 'Called it' : 'Right') : 'Not yet', ok); save(); onAnswer(pick, ok, q.why[pick].replace(/^Right\.\s*/, ''));
        });
      } };
  }

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
  function sceneReplay(s, hooks) {
    const F = W0.FED_2022, T22 = W0.T22, L = S.log[s.id];
    let reveal = L.done ? T22.length - 1 : 0, i0 = L.done ? F.length - 1 : 0;
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

  // ---- step 2: read a quote. A ruler marked in quote points above and dollars below; the player sets the price. ----
  function sceneQuote(s, setter) {
    const t = task(s.id); let mode = S.log[s.id].done ? 'mine' : 'example', setSw, G, R, qOdo, pOdo, mk = { x: 1000, v: 0 };
    const LO = 880, HI = 1080;
    const cur = () => (mode === 'example' ? { q: 98.25, v: 982.5 } : { q: t.q, v: setter.v });
    function apply(snap) { const c = cur(); qOdo.set(c.q.toFixed(2), snap); pOdo.set(money(c.v, 2), snap); if (setSw) setSw(mode); describe(`${mode === 'example' ? 'Worked example' : 'Your bond'}: quoted at ${c.q.toFixed(2)}. Marker at ${money(c.v, 2)}.`); }
    setter.on(() => { if (mode !== 'mine') { mode = 'mine'; } apply(); });
    const sc = {
      show(m) { mode = m; apply(); },
      layout(Wd, Hd) {
        const n = Wd < 600; backdrop(Wd, Hd, { pool: [Wd / 2, Hd * 0.62, Wd * 0.5] }); G = E('g', {}, svg);
        const cx = Wd / 2, x0 = n ? 22 : Wd * 0.1, x1 = n ? Wd - 22 : Wd * 0.9, ry = Hd * 0.56; R = { x0, x1, ry, n };
        T(svg, cx, Hd * 0.27 - (n ? 58 : 100), 'Dealer quote', { 'text-anchor': 'middle', class: 'fog', style: `font-size:${n ? 13 : 15}px` });
        qOdo = Odo(svg, { size: n ? 58 : 100, anchor: 'middle', tcls: 'disp sod' }).at(cx, Hd * 0.27);
        const X = (v) => x0 + (x1 - x0) * (v - LO) / (HI - LO);
        E('rect', { x: x0, y: ry - 14, width: x1 - x0, height: 28, rx: 4, fill: '#0E1B2D', stroke: '#4A6580' }, svg);
        for (let v = LO; v <= HI; v += 10) { const big = v % 50 === 0; E('line', { x1: X(v), x2: X(v), y1: ry - (big ? 22 : 18), y2: ry - 14, stroke: '#9DB0C2', 'stroke-width': big ? 1.5 : 0.8 }, svg); E('line', { x1: X(v), x2: X(v), y1: ry + 14, y2: ry + (big ? 22 : 18), stroke: '#9DB0C2', 'stroke-width': big ? 1.5 : 0.8 }, svg);
          if (big && (!n || v % 100 === 0 || v === 950 || v === 1050)) { T(svg, X(v), ry - 28, String(v / 10), { 'text-anchor': 'middle', class: 'disp sod', style: `font-size:${n ? 14 : 18}px` }); T(svg, X(v), ry + 40, money(v), { 'text-anchor': 'middle', class: 'disp', style: `font-size:${n ? 14 : 18}px` }); } }
        T(svg, x0, ry - 50, 'quote', { class: 'fog', style: 'font-size:12px' }); T(svg, x0, ry + 62, 'price of one $1,000 bond', { class: 'fog', style: 'font-size:12px' });
        E('line', { x1: X(1000), x2: X(1000), y1: ry - 14, y2: ry + 14, stroke: '#E9EEF2', 'stroke-width': 2 }, svg);
        this._fill = E('rect', { x: x0, y: ry - 12, height: 24, rx: 3, fill: 'url(#liquidG)', opacity: 0.85 }, svg);
        const hd = E('g', {}, svg); this._hd = hd; E('rect', { class: 'focusring', x: -18, y: -28, width: 36, height: 56, rx: 6, fill: 'none', stroke: '#FFB447', 'stroke-width': 2 }, hd);
        E('rect', { x: -22, y: -34, width: 44, height: 68, fill: 'transparent' }, hd); E('path', { d: 'M0 -24 L12 -12 L12 12 L0 24 L-12 12 L-12 -12 Z', fill: '#FFB447', filter: 'url(#glow)' }, hd); E('path', { d: 'M-4 -6v12M0 -6v12M4 -6v12', stroke: '#0A1524', 'stroke-width': 1.4 }, hd);
        setter.handle(hd, (cx2) => { const r = svg.getBoundingClientRect(); return LO + (cx2 - r.left - x0) / (x1 - x0) * (HI - LO); });
        this._X = X;
        T(svg, cx, ry + (n ? 100 : 128), 'One bond costs', { 'text-anchor': 'middle', class: 'fog', style: `font-size:${n ? 13 : 15}px` });
        pOdo = Odo(svg, { size: n ? 44 : 64, anchor: 'middle' }).at(cx, ry + (n ? 146 : 196));
        mk.x = cur().v; overlay.innerHTML = ''; setSw = modeSwitch(sc, mode); apply(true);
      },
      frame(dt) { if (!this._hd) return; qOdo.frame(dt); pOdo.frame(dt); spring(mk, cur().v, dt, 110, 15); const x = this._X(mk.x); this._hd.setAttribute('transform', `translate(${x.toFixed(1)} ${R.ry})`); this._fill.setAttribute('width', Math.max(0, x - R.x0).toFixed(1)); },
    };
    return sc;
  }

  // ---- step 3: the seesaw, as a bet ----
  // The grip stays locked until the student bets on which bond will fall further; reaching the target settles the bet.
  function sceneSeesaw(s, hooks) {
    const t = task(s.id), L = S.log[s.id], target = t.y * 100;
    const st = { bet: L.done ? 'long' : (L.bet || null) };
    const beam = Beam({ tokens: seesawTokens(true), handle: true, yieldScale: true, target, magnet: target, dy: L.done ? target - 4 : 0, locked: !st.bet,
      onYield: (y) => { if (cap) cap.textContent = seesawCaption(y); describeBeam(y); hooks.onYield(y); }, onTap: (id) => hooks.onTap(id, 4 + beam.dyT) });
    let cap, betT;
    const describeBeam = (y) => describe(`A beam on a pivot. Yield ${p2(y)}; target ${p2(target)}. ${st.bet ? `Your bet: the ${st.bet === 'long' ? '30-year' : '2-year'} bond.` : 'No bet yet.'} The 2-year bond sells for ${money(W0.seesawPrice(2, y))} and the 30-year bond for ${money(W0.seesawPrice(30, y))}.`);
    return {
      beam, st,
      setBet(id) { st.bet = id; beam.select(id); beam.lock(false); beam.hint(true); describeBeam(4 + beam.dyT); },
      layout(Wd, Hd) {
        const g = beamLayout(Wd, Hd); backdrop(Wd, Hd, { pool: [g.px + g.armR * 0.3, g.py + 60, g.armR * 1.1], cone: [g.px + g.armR * 0.35, g.py + 40, g.armR * 0.85] });
        beam.build(svg, g.px, g.py, g.armL, g.armR, Wd, Hd); overlay.innerHTML = ''; cap = capEl(seesawCaption(4 + beam.dyT)); describeBeam(4 + beam.dyT);
        betT = T(svg, 0, 0, 'your bet', { 'text-anchor': 'middle', class: 'sod disp', style: `font-size:${NARROW() ? 13 : 16}px` });
        if (st.bet) beam.select(st.bet);
      },
      frame(dt) {
        beam.frame(dt);
        const tk = st.bet && beam.tokenAt(st.bet); if (betT) { betT.setAttribute('opacity', tk ? 1 : 0); if (tk) { betT.setAttribute('x', tk.x); betT.setAttribute('y', tk.y + (NARROW() ? 22 : 30)); } }
      },
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

  // ---- step 5: duration. The bond sits at its duration; the player marks how far its price will fall, then tips the beam. ----
  function sceneDuration(s, setter) {
    const t = task(s.id); const L = S.log[s.id]; let mode = L.done ? 'mine' : 'example', tipped = L.done, setSw, RU, mk = { x: 0, v: 0 }, rule = { x: 0, v: 0 };
    const ex = { D: 7, dy: 0.5, A: 10000 };
    const beam = Beam({ tokens: [{ id: 'b', d: ex.D, label: '', sub: '' }], riseLabel: true, scale: true });
    const cur = () => (mode === 'example' ? Object.assign({ who: 'Worked example', mark: ex.D * ex.dy, shown: true }, ex) : { who: 'Your bond', D: t.D, dy: t.dy, A: t.A, mark: setter.v, shown: tipped });
    function apply() {
      const c = cur(); beam.tokens[0].d = c.D; const tk = beam.tokenAt('b'); if (tk) { tk.c.remove(); tk.c = cert(tk.g, NARROW() ? 74 : 104, NARROW() ? 40 : 52, mm(c.A), 'duration ' + c.D); }
      beam.setRise(c.shown ? c.dy : 0);
      beam.anno('b', [{ text: c.shown ? `${c.D} × ${fix(c.dy)} = ${fix(c.D * c.dy)}%` : `${c.D} × ${fix(c.dy)} = ?`, cls: 'coral', big: true }]);
      if (setSw) setSw(mode);
      describe(`${c.who}: a bond with duration ${c.D}; rates up ${fix(c.dy)} points. Your mark: price falls ${fix(c.mark)}%.${c.shown ? ` The beam shows ${fix(c.D * c.dy)}%.` : ''}`);
    }
    setter.on(() => { if (mode !== 'mine') mode = 'mine'; apply(); });
    const sc = {
      show(m) { mode = m; apply(); },
      tip() { tipped = true; mode = 'mine'; apply(); },
      layout(Wd, Hd) {
        const n = Wd < 600, g = beamLayout(Wd, Hd, { py: 0.46 });
        const gg = { px: g.px - (n ? 10 : 30), py: g.py, armL: g.armL * 0.7, armR: Math.min(g.armR, Wd - g.px - (n ? 96 : 150)) };
        backdrop(Wd, Hd, { pool: [gg.px + gg.armR * 0.3, gg.py + 60, gg.armR * 1.1], cone: [gg.px + gg.armR * 0.35, gg.py + 40, gg.armR * 0.85] });
        beam.build(svg, gg.px, gg.py, gg.armL, gg.armR, Wd, Hd);
        // the price ruler: 0% at the top to 20% at the bottom
        const x = Wd - (n ? 70 : 118), y0 = n ? 46 : 70, y1 = Hd - (n ? 40 : 70); RU = { x, y0, y1, Y: (p) => y0 + (y1 - y0) * p / 20 };
        T(svg, x, y0 - (n ? 22 : 30), 'price falls', { 'text-anchor': 'middle', class: 'fog', style: `font-size:${n ? 11 : 13}px` });
        E('rect', { x: x - 8, y: y0, width: 16, height: y1 - y0, rx: 8, fill: '#0E1B2D', stroke: '#4A6580' }, svg);
        for (let p = 0; p <= 20; p++) { const big = p % 5 === 0; E('line', { x1: x - (big ? 16 : 12), x2: x - 8, y1: RU.Y(p), y2: RU.Y(p), stroke: '#9DB0C2', 'stroke-width': big ? 1.4 : 0.8 }, svg); if (big) T(svg, x - 20, RU.Y(p) + 4, p + '%', { 'text-anchor': 'end', class: 'fog', style: `font-size:${n ? 10.5 : 12}px` }); }
        this._rule = E('g', {}, svg); E('path', { d: 'M10 0 l12 -7 v14 z', fill: '#FF8A7A' }, this._rule); this._ruleT = T(this._rule, 26, 5, '', { class: 'disp coral', style: `font-size:${n ? 14 : 18}px` });
        const hd = E('g', {}, svg); this._hd = hd; E('rect', { class: 'focusring', x: -40, y: -14, width: 56, height: 28, rx: 6, fill: 'none', stroke: '#FFB447', 'stroke-width': 2 }, hd);
        E('rect', { x: -60, y: -18, width: 76, height: 36, fill: 'transparent' }, hd); E('path', { d: 'M-10 0 l-14 -9 v18 z', fill: '#FFB447', filter: 'url(#glow)' }, hd); E('rect', { x: -9, y: -2, width: 18, height: 4, fill: '#FFB447' }, hd);
        this._hdT = T(hd, -30, -14, '', { 'text-anchor': 'end', class: 'disp sod', style: `font-size:${n ? 15 : 20}px` });
        setter.handle(hd, (cx2, cy2) => { const r = svg.getBoundingClientRect(); return (cy2 - r.top - y0) / (y1 - y0) * 20; }, true);
        mk.x = cur().mark; rule.x = 0; overlay.innerHTML = ''; setSw = modeSwitch(sc, mode); apply();
      },
      frame(dt) {
        beam.frame(dt); if (!this._hd) return; const c = cur();
        spring(mk, c.mark, dt, 120, 16); this._hd.setAttribute('transform', `translate(${RU.x} ${RU.Y(mk.x).toFixed(1)})`); this._hdT.textContent = fix(c.mark, 1) + '%';
        spring(rule, c.shown ? c.D * c.dy : 0, dt, 50, 11); this._rule.setAttribute('transform', `translate(${RU.x} ${RU.Y(rule.x).toFixed(1)})`); this._rule.setAttribute('opacity', c.shown ? 1 : 0); this._ruleT.textContent = 'beam: ' + fix(rule.x, 1) + '%';
      },
    };
    return sc;
  }

  // ---- step 6: which loses most? ----
  function sceneWhich(s, hooks) {
    const L = S.log[s.id], q = C.quiz[s.quiz];
    const tok = W0.DUR_BONDS.map((b, k) => ({ id: 'd' + k, d: b.d, label: b.label, sub: b.sub, tap: true, aria: `${b.label}, ${b.sub}`, quiz: q.options.findIndex((o) => b.quizText.test(o)) }));
    const beam = Beam({ tokens: tok, riseLabel: true, scale: true, onTap: (id) => { const t = tok.find((x) => x.id === id); beam.select(id); hooks.onPick(t.quiz); } });
    function tilt() { beam.setRise(1); tok.forEach((t) => beam.anno(t.id, [{ text: `about ${Math.round(t.d)}%`, cls: 'coral' }])); describe('Rates rose 1 point. Duration 2 loses about 2%, duration 8 about 8%, duration 17 about 17%.'); }
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

  // ---- step 7: spread. Two yield lines; the player drags a bracket up from the Treasury line to measure the gap. ----
  function sceneSpread(s, setter) {
    const t = task(s.id), L = S.log[s.id]; let mode = L.done ? 'mine' : 'example', setSw, Y, geo, br = { x: 0, v: 0 };
    const cur = () => (mode === 'example' ? { corp: 6.10, tsy: 4.35, bps: 175 } : { corp: t.corp, tsy: t.tsy, bps: setter.v });
    function apply() { const c = cur(); if (setSw) setSw(mode); describe(`${mode === 'example' ? 'Worked example' : 'Your numbers'}: company ${p2(c.corp)}, Treasury ${p2(c.tsy)}. Bracket at ${c.bps} basis points.`); }
    setter.on(() => { if (mode !== 'mine') mode = 'mine'; apply(); });
    const sc = {
      show(m) { mode = m; apply(); },
      layout(Wd, Hd) {
        const n = Wd < 600; backdrop(Wd, Hd);
        geo = { x0: n ? 40 : Wd * 0.1, x1: n ? Wd - 120 : Wd * 0.66, y0: n ? 56 : 70, y1: Hd - (n ? 30 : 60), n };
        Y = (v) => geo.y1 - (geo.y1 - geo.y0) * (v - 3) / 5;
        for (let v = 3; v <= 8; v++) { E('line', { x1: geo.x0, x2: geo.x1, y1: Y(v), y2: Y(v), stroke: '#1E3149' }, svg); T(svg, geo.x0 - 8, Y(v) + 4, v + '%', { 'text-anchor': 'end', class: 'fog', style: 'font-size:11px' }); }
        this._dyn = E('g', {}, svg);
        const hd = E('g', {}, svg); this._hd = hd; E('rect', { class: 'focusring', x: -26, y: -14, width: 52, height: 28, rx: 6, fill: 'none', stroke: '#FFB447', 'stroke-width': 2 }, hd);
        E('rect', { x: -34, y: -20, width: 68, height: 40, fill: 'transparent' }, hd); E('rect', { x: -20, y: -5, width: 40, height: 10, rx: 5, fill: '#FFB447', filter: 'url(#glow)' }, hd);
        setter.handle(hd, (cx2, cy2) => { const r = svg.getBoundingClientRect(); const v = 3 + (geo.y1 - (cy2 - r.top)) / (geo.y1 - geo.y0) * 5; return (v - cur().tsy) * 100; });
        br.x = cur().bps; overlay.innerHTML = ''; setSw = modeSwitch(sc, mode); apply(); this.frame(0);
      },
      frame(dt) {
        if (!this._dyn) return; const c = cur(); spring(br, c.bps, dt, 110, 15);
        const g = this._dyn; g.innerHTML = ''; const n = geo.n; const yc = Y(c.corp), yt = Y(c.tsy), bx = n ? geo.x1 - 14 : geo.x1 - 30, ytop = Y(c.tsy + br.x / 100);
        E('rect', { x: geo.x0, y: Math.min(ytop, yt), width: bx - geo.x0, height: Math.abs(yt - ytop), fill: 'url(#hatchP)' }, g);
        E('line', { x1: geo.x0, x2: geo.x1, y1: yc, y2: yc, stroke: '#FFB447', 'stroke-width': 3 }, g);
        E('line', { x1: geo.x0, x2: geo.x1, y1: yt, y2: yt, stroke: '#E9EEF2', 'stroke-width': 3 }, g);
        T(g, geo.x0 + 8, yc - 10, `Company’s 10-year bond ${p2(c.corp)}`, { class: 'disp sod', style: `font-size:${n ? 15 : 20}px` });
        T(g, geo.x0 + 8, yt + (n ? 20 : 26), `10-year Treasury ${p2(c.tsy)}`, { class: 'disp', style: `font-size:${n ? 15 : 20}px` });
        E('line', { x1: bx, x2: bx, y1: ytop, y2: yt, stroke: '#E9EEF2', 'stroke-width': 1.5 }, g);
        for (let k = 0; k * 25 <= br.x + 0.01; k++) { const yy = Y(c.tsy + k * 0.25); E('line', { x1: bx - (k % 4 ? 5 : 10), x2: bx + (k % 4 ? 5 : 10), y1: yy, y2: yy, stroke: '#E9EEF2', 'stroke-width': k % 4 ? 1 : 1.6 }, g); }
        const tx = bx + (n ? 16 : 30), my = (ytop + yt) / 2;
        T(g, tx, my - 4, `${Math.round(br.x)} basis points`, { class: 'disp sod', style: `font-size:${n ? 16 : 24}px` });
        T(g, tx, my + (n ? 15 : 22), `= ${fix(br.x / 100)} points`, { class: 'disp', style: `font-size:${n ? 13 : 18}px` });
        this._hd.setAttribute('transform', `translate(${bx} ${ytop.toFixed(1)})`);
      },
    };
    return sc;
  }

  // ---- step 8: Dragovia. A press conference: the news, the minister's promise, the lenders walking out, then the prices. ----
  const DRAG_NEWS = ['Dragovia’s president has embezzled tax money', 'Dragovia admits it hid $4 billion of debt', 'Dragovia’s central bank is running out of dollars'];
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
        if (shown.x > 0.05) T(g, X(0.76), (Yv(4) + Yv(dragY(1))) / 2 + 4, `spread ${fix(dragY(1) - 4, 1)} points`, { 'text-anchor': 'middle', style: `font-size:${geo.n ? 11 : 13}px` });
      },
    };
    return sc;
  }

  // ---- step 9: Puerto Rico ----
  function scenePR(s) {
    const L = S.log[s.id]; let mode = L.done ? 'mine' : 'example', got = L.done ? [true, true] : [false, false], setSw, G, geo, bars = { a: { x: 0, v: 0 }, b: { x: 0, v: 0 } }, tgt = { a: 80, b: 60 };
    function apply() {
      const c = mode === 'example' ? { a: 80, b: 60, ok: [true, true], who: 'Worked example', la: 'Before', lb: 'After' } : { a: 44, b: 30, ok: [true, got[1]], who: 'Puerto Rico’s bond, cents on the dollar', la: 'October 3', lb: 'October 4, at its low' };
      tgt = { a: c.a, b: c.b }; this._c = c; if (setSw) setSw(mode);
      describe(`${c.who}: ${c.a} cents, then ${c.b}. ${c.ok[0] ? `A fall of ${c.a - c.b} cents` : 'The fall is not filled in yet'}${c.ok[1] ? `, about ${fix(100 * (c.a - c.b) / c.a, 1)}%` : ''}.`);
    }
    const sc = {
      show(m) { mode = m; apply.call(sc); },
      rows(rr) { if (rr[0] && rr[0].ok) got[0] = true; if (rr[1] && rr[1].ok) got[1] = true; mode = 'mine'; apply.call(sc); },
      layout(Wd, Hd) {
        const n = Wd < 600; setBg('img/maria-pr-2017.webp', ''); geo = { n, base: Hd - (n ? 54 : 78), top: n ? 104 : 150, Wd, Hd };
        overlay.innerHTML = '';
        const story = document.createElement('div'); story.style.cssText = `position:absolute;left:${n ? 16 : 28}px;top:${n ? 54 : 64}px;right:${n ? 16 : 28}px;max-width:560px`;
        story.innerHTML = `<p style="margin:0;font:800 ${n ? 21 : 30}px/1.05 var(--display);color:var(--chalk)">Hurricane Maria has devastated Puerto Rico, which was already in a form of bankruptcy.</p>`;
        overlay.appendChild(story);
        setSw = modeSwitch(sc, mode);
        capEl(`Photo: a home in Loíza, Puerto Rico, on September 21, 2017, the day after Hurricane Maria. ${esc(BOND_IMG.maria)}`);
        G = E('g', {}, svg); bars.a.x = tgt.a; bars.b.x = tgt.b; apply.call(sc); this.frame(0);
      },
      frame(dt) {
        if (!G) return; spring(bars.a, tgt.a, dt, 80, 13); spring(bars.b, tgt.b, dt, 80, 13);
        const g = G; g.innerHTML = ''; const c = this._c, n = geo.n, bw = n ? 64 : 96, xa = geo.Wd * (n ? 0.28 : 0.56), xb = xa + bw + (n ? 60 : 90);
        const Yp = (v) => geo.base - (geo.base - geo.top) * v / 100;
        E('line', { x1: xa - 30, x2: xb + bw + 30, y1: geo.base, y2: geo.base, stroke: '#9DB0C2' }, g);
        [[xa, bars.a.x, c.a, c.la, '#E9EEF2'], [xb, bars.b.x, c.b, c.lb, '#FF8A7A']].forEach(([x, v, lab, cap, col]) => {
          E('rect', { x, y: Yp(v), width: bw, height: geo.base - Yp(v), fill: col, 'fill-opacity': 0.9 }, g);
          T(g, x + bw / 2, Yp(v) - 10, String(lab), { 'text-anchor': 'middle', class: 'disp', style: `font-size:${n ? 26 : 38}px;font-weight:800` });
          T(g, x + bw / 2, geo.base + 18, cap, { 'text-anchor': 'middle', class: 'fog', style: `font-size:${n ? 11 : 13}px` });
        });
        // the fall, bracketed
        const ya = Yp(bars.a.x), yb = Yp(bars.b.x), bx = xb + bw + 14;
        if (mode === 'mine' && c.ok[1]) { const yl = Yp(37.5); E('line', { x1: xb - 6, x2: xb + bw + 6, y1: yl, y2: yl, stroke: '#E9EEF2', 'stroke-width': 1.5, 'stroke-dasharray': '4 3' }, g); T(g, xb - 10, yl + 4, n ? 'late: 37.50' : 'late that day: 37.50', { 'text-anchor': 'end', style: `font-size:${n ? 10.5 : 12.5}px` }); }
        E('line', { x1: xa + bw, x2: bx, y1: ya, y2: ya, stroke: '#E9EEF2', 'stroke-dasharray': '3 4' }, g);
        E('line', { x1: bx, x2: bx, y1: ya, y2: yb, stroke: '#FF8A7A', 'stroke-width': 2 }, g);
        T(g, bx + 8, (ya + yb) / 2, c.ok[0] ? `${c.a - c.b} cents` : '? cents', { class: 'disp', style: `font-size:${n ? 16 : 22}px` });
        T(g, bx + 8, (ya + yb) / 2 + (n ? 17 : 24), c.ok[1] ? `${fix(100 * (c.a - c.b) / c.a, 1)}% of ${c.a}` : `?% of ${c.a}`, { class: 'disp coral', style: `font-size:${n ? 15 : 20}px` });
      },
      destroy() { setBg(null); },
    };
    return sc;
  }

  // ---- step 10: a bank's big bet ----
  function sceneBridge(s, hooks) {
    const t = task(s.id), L = S.log[s.id]; let mode = L.done ? 'mine' : 'example', setSw, ready = L.done, landed = false;
    const ex = { A: 4, D: 5, dy: 2 };
    const steps = Math.round(t.dy / 0.25);
    const dial = Dial({ n: steps + 1, i: 0, from: -120, to: 120, enabled: ready, aria: 'Fed rate dial', major: (i) => i % 4 === 0, label: (i) => (i % 4 === 0 ? '+' + i / 4 : ''), labelSize: 12,
      valueText: (i) => `Rates up ${fix(i * 0.25)} points`, onChange: (i) => { beam.setRise(i * 0.25); hooks.onDial(i * 0.25); } });
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
        overlay.innerHTML = ''; if (!S.friend) setSw = modeSwitch(sc, mode); apply.call(sc);
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
        this._dialHint.textContent = mode === 'mine' ? (ready ? (dial.i < steps ? `Turn it up to +${fix(t.dy)} points` : `Rates up ${fix(t.dy)} points`) : (S.friend ? 'Lock in your guess first' : 'Check your answer to unlock it')) : '';
        if (this._gh) this._gh.setAttribute('transform', `translate(${x} ${(y + gh * (armed / t.A) / 0.3).toFixed(1)})`);
        describe(`${c.who}: $${c.A} billion of bonds with duration ${c.D}. Rates up ${fix(c.r)} points. Value about $${(c.A * frac).toFixed(2)} billion.`);
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
    const L = S.log[s.id];
    // ---- 1. Back to 2022: bet on Dick's bond, turn the Fed's dial through the year, then the curve call ----
    if (s.id === 'q1') {
      let sc; const F = W0.FED_2022;
      const BETS = [['up', 'Above $1,000'], ['900', '$900 to $1,000'], ['800', '$800 to $900'], ['low', 'Below $800']];
      const endV = W0.dicksOn('2022-12-30')[1], endBet = endV >= 1000 ? 'up' : endV >= 900 ? '900' : endV >= 800 ? '800' : 'low';
      const atEnd = () => sc.dial.i === F.length - 1;
      const askCurve = () => {
        const qc = quizChips(s, (pick, ok, why) => { say('boss', (ok ? '' : 'Not quite. ') + esc(why), ok ? 'ok' : 'bad'); });
        $('#controls').innerHTML = qc.html; qc.wire();
        say('boss', 'Now the curve. The 2-year went from 0.78% to 4.41% in 2022, the 10-year from 1.63% to 3.88%. Which rose more, and what shape did that leave the curve in?');
      };
      const settle = () => {
        const right = L.bet1 === endBet; recordCall('bet22', right); stamp(right ? 'Called it' : 'Missed', right); if (right) Sound.chime(); else Sound.miss();
        say('boss', `${right ? 'You called it.' : 'Worse than you bet.'} By December each $1,000 of Dick’s bond was worth about ${money(endV)}, and Dick’s never missed a payment.`, right ? 'ok' : 'bad');
        $('#controls').innerHTML = `<div class="actions"><button class="btn" type="button" id="curveBtn">Next call</button></div>`; $('#curveBtn').addEventListener('click', askCurve);
      };
      sc = sceneReplay(s, { onDial: () => { if (atEnd() && !sc.settled && L.bet1 && !L.done) { sc.settled = true; setTimeout(settle, RM ? 0 : 900); } const b = $('#dialNext'); if (b) b.disabled = atEnd(); } });
      mount(sc); sc.dial.enable(L.done || !!L.bet1);
      shell(s, { who: 'boss', done: L.done, line: L.done ? 'That was 2022. Every rate we cared about went up.' : 'In 2022 the Fed raised its rate seven times. Dick’s Sporting Goods had just sold a 30-year bond for about $1,000. Where will it be by December?',
        controls: L.done ? '' : chips('bet1', BETS, L.bet1, 'two') + `<div class="actions"><button class="btn" type="button" id="dialNext" ${L.bet1 ? '' : 'disabled'}>Next Fed meeting</button></div>` });
      if (!L.done) {
        onChips('bet1', (v) => { if (sc.settled) return; L.bet1 = v; save(); sc.dial.enable(true); $('#dialNext').disabled = atEnd(); say('boss', 'Now play 2022: press Next Fed meeting, or turn the dial.'); if (NARROW()) setTimeout(() => stage.scrollIntoView({ behavior: RM ? 'auto' : 'smooth' }), 250); });
        $('#dialNext').addEventListener('click', () => sc.dial.set(sc.dial.i + 1, true));
        if (L.bet1 && atEnd()) askCurve();
      }
      return;
    }
    // ---- 2. Read a quote: a salesman pads the price; set what one bond really costs ----
    if (s.id === 'quote') {
      const t = task(s.id), pad = t.q * 10 + 25; const setter = Setter(Object.assign({}, W0.SETTERS.quote, { value: L.done ? t.answer : 1000, fmt: (v) => money(v, 2), label: 'Price of one bond' }));
      const sc = sceneQuote(s, setter); mount(sc);
      shell(s, { who: 'sales', done: L.done, line: `Evening! I have a bond quoted at <b>${t.q.toFixed(2)}</b>. For you, ${money(pad)} a bond.`,
        controls: `<p class="ask">A quote is a percent of the $1,000 face value. Drag the gold marker to what one bond costs.</p>${setter.html()}<div class="actions"><button class="btn" type="button" id="goBtn2">Pay this price</button></div>` });
      setter.wire(); autoSwitch(sc, s);
      $('#goBtn2').addEventListener('click', () => {
        const v = setter.v, res = judgeRows(s, [null, String(v)]);
        if (res.ok) { say('boss', `${money(v, 2)} is the real price. ${C.praise(t, h)}`, 'ok'); showNext(); }
        else if (Math.abs(v - pad) < 0.01) say('boss', `That’s his number, not the quote’s. ${t.q.toFixed(2)} means ${t.q.toFixed(2)}% of $1,000.`, 'bad');
        else say('boss', esc(res.msg.replace(/^Price of one bond: /, '')), 'bad');
      });
      return;
    }
    // ---- 3. The seesaw: bet on a bond, then pull the yield ----
    if (s.id === 'seesaw') {
      const t = task(s.id), target = t.y * 100; let sc;
      const judge = (id, y, settling) => {
        const e = W0.seesawEntry(y, id); const res = C.judgeTask(t, e, h); L.attempts = (L.attempts || 0) + 1; if (settling) recordCall('seesaw', res.ok);
        stamp(res.ok ? (settling ? 'Called it' : 'Right') : (settling ? 'Not this time' : 'Not yet'), res.ok);
        const p2y = W0.seesawPrice(2, y), p30 = W0.seesawPrice(30, y);
        if (res.ok) { L.value = e.value; L.choice = e.choice; markDone(s.id); Sound.chime(); say('boss', `${settling ? 'You called it. ' : ''}${C.praise(t, h)} Thirty years locked into $40 a year is a long time to be stuck below the market.`, 'ok'); showNext(); }
        else { if (!L.done) { L.value = e.value; L.choice = e.choice; } L.fails = (L.fails || 0) + 1; Sound.miss(); say('boss', `The 2-year moved ${money(1000 - p2y)}; the 30-year moved ${money(1000 - p30)}. Tap the one that moved further.`, 'bad'); }
        save();
      };
      sc = sceneSeesaw(s, {
        onYield: (y) => { if (!L.done && sc.st.bet && Math.abs(y - target) < 1e-9 && !sc.settled) { sc.settled = true; setTimeout(() => judge(sc.st.bet, 4 + sc.beam.dyT, true), RM ? 0 : 650); } },
        onTap: (id, y) => {
          if (L.done) { sc.beam.select(id); return; }
          if (!sc.settled) { sc.st.bet = id; L.bet = id; save(); sc.setBet(id); Sound.detent(); say('boss', `Your bet: the ${id === 'long' ? '30-year' : '2-year'}. Now pull the gold grip up to ${p2(target)}.`); return; }
          sc.beam.select(id); if (Math.abs(y - target) > 1e-9) { say('boss', `Pull the yield back to ${p2(target)}, then tap a bond.`, 'bad'); return; } judge(id, y, false);
        } });
      mount(sc);
      shell(s, { who: 'boss', done: L.done, line: L.done ? `New bonds now pay ${p2(target)}. ${C.praise(t, h)}` : `New bonds are about to pay <b>${p2(target)}</b> instead of 4%. Ours pay $40 a year: one for 2 more years, one for 30. Which takes the bigger hit? Tap your bet.` });
      return;
    }
    // ---- 4. Old bond, new rates: a customer at the front desk ----
    if (s.id === 'q2') {
      const sc = sceneCoupons(s); mount(sc);
      const qc = quizChips(s, (pick, ok, why) => { sc.answered(ok); say('boss', ok ? `${esc(why)} Nobody pays $1,000 for $30 a year when $1,000 buys $50 a year. With 10 years left it sells for about ${money(W0.P(0.03, 10, 0.05))}.` : esc(why), ok ? 'ok' : 'bad'); });
      shell(s, { who: 'customer', done: L.done, line: 'My bond pays $30 a year. New ones pay $50. Mine still says $1,000 on it, so it’s worth $1,000, isn’t it?', controls: qc.html }); qc.wire();
      return;
    }
    // ---- 5. Duration: mark how far the price falls, tip the beam, then pick the dollars ----
    if (s.id === 'dur1') {
      const t = task(s.id); const setter = Setter(Object.assign({}, W0.SETTERS.dur1, { value: L.done ? t.D * t.dy : 0, fmt: (v) => `price falls ${fix(v, 1)}%`, label: 'How far the price falls, in percent' }));
      const sc = sceneDuration(s, setter); mount(sc);
      const dollars = () => W0.durDollarOptions(t).sort((a, b) => h.fnv1a(S.code + a[1]) - h.fnv1a(S.code + b[1])).map(([v]) => [String(v), mm(v)]);
      const askDollars = () => {
        $('#controls').innerHTML = `<p class="ask">How many dollars is that on ${mm(t.A)}?</p>${chips('dol', dollars(), null, 'two')}<div class="actions"><button class="btn" type="button" id="dolBtn">Tell the treasurer</button></div>`;
        $('#dolBtn').addEventListener('click', () => { const c = $('input[name=dol]:checked', con); if (!c) { fb('Pick an amount first.', false); return; }
          const res = judgeRows(s, [fix(setter.v, 2) + '%', c.value]); fb('', null);
          if (res.ok) { say('boss', `${C.praise(t, h)} That’s what I tell the board.`, 'ok'); showNext(); } else say('boss', esc(res.msg.replace(/^Dollars lost: /, '')), 'bad'); });
      };
      shell(s, { who: 'boss', done: L.done, line: L.done ? C.praise(t, h) : `We hold <b>${mm(t.A)}</b> of a bond with duration <b>${t.D}</b>, and rates just rose <b>${fix(t.dy)}</b> ${t.dy === 1 ? 'point' : 'points'}. How far does its price fall?`,
        controls: L.done ? '' : `<p class="ask">Rule of thumb: price falls by about duration × rise in rates, in percent. Drag the gold marker, then tip the beam.</p>${setter.html()}<div class="actions"><button class="btn" type="button" id="tipBtn">Tip the beam</button></div>` });
      if (!L.done) {
        setter.wire(); autoSwitch(sc, s);
        $('#tipBtn').addEventListener('click', () => {
          sc.tip(); const ok = Math.abs(setter.v - t.D * t.dy) < 1e-9; Sound.thud();
          if (!ok) { L.attempts = (L.attempts || 0) + 1; recordCall('dur1', false); L.fails = (L.fails || 0) + 1; save(); helpLadder(t, L); stamp('Off the mark', false); say('boss', `The beam says ${fix(t.D * t.dy)}%: ${t.D} × ${fix(t.dy)}. Move your marker there.`, 'bad'); return; }
          stamp('Right on it', true); say('boss', `${t.D} × ${fix(t.dy)} = ${fix(t.D * t.dy)}%. Now the dollars.`, 'ok'); setTimeout(askDollars, RM ? 0 : 500);
        });
      }
      return;
    }
    // ---- 6. Which loses most? ----
    if (s.id === 'q3') {
      let qc; const sc = sceneWhich(s, { onPick: (j) => { const r = $(`input[name=q][value="${j}"]`, con); if (r) { r.checked = true; } } }); mount(sc);
      qc = quizChips(s, (pick, ok, why) => { sc.answered(); say('boss', esc(why), ok ? 'ok' : 'bad'); });
      shell(s, { who: 'boss', done: L.done, line: 'Rates go up 1 point tomorrow. Each bond sits at its duration. Which one loses the most? Tap it, then lock it in.', controls: qc.html }); qc.wire((j) => sc.selectQuiz(j));
      return;
    }
    // ---- 7. Spread: the salesman calls it free money; measure what it pays for ----
    if (s.id === 'spread') {
      const t = task(s.id); const setter = Setter(Object.assign({}, W0.SETTERS.spread, { value: L.done ? t.bps : 0, fmt: (v) => `${v} basis points = ${fix(v / 100)} points`, label: 'Spread in basis points' }));
      const sc = sceneSpread(s, setter); mount(sc);
      shell(s, { who: 'sales', done: L.done, line: `This company’s 10-year bond yields <b>${p2(t.corp)}</b>. The 10-year Treasury pays <b>${p2(t.tsy)}</b>. That’s free money!`,
        controls: `<p class="ask">The <b>spread</b> is the extra yield over a Treasury of the same length. Drag the bracket up to the company’s line.</p>${setter.html()}<div class="actions"><button class="btn" type="button" id="spBtn">That’s the spread</button></div>` });
      setter.wire(); autoSwitch(sc, s);
      $('#spBtn').addEventListener('click', () => {
        const v = setter.v, res = judgeRows(s, [fix(v / 100), String(v)]);
        if (res.ok) { say('boss', `${v} basis points. On $1,000,000 that’s ${money(100 * v)} a year more than a Treasury pays. It isn’t free: it pays us for the chance that the company, unlike the U.S. government, never pays us back.`, 'ok'); showNext(); }
        else say('boss', `Not yet. The gap is ${p2(t.corp)} − ${p2(t.tsy)}. Each tick on the bracket is 25 basis points.`, 'bad');
      });
      return;
    }
    // ---- 8. Dragovia: the minister's press conference ----
    if (s.id === 'q4') {
      const sc = sceneDragovia(s); mount(sc); const DG = W0.DRAGOVIA, yA = W0.yieldAt(DG.after, DG.coupon, DG.years) * 100;
      const qc = quizChips(s, (pick, ok, why) => { sc.answered(ok); say('boss', ok ? `${esc(why)} Buyers now pay $800 for the same $60 a year: about ${fix(yA, 1)}% a year, counting the $1,000 at the end.` : esc(why), ok ? 'ok' : 'bad'); });
      shell(s, { who: 'minister', done: L.done, line: 'Dragovia will pay every coupon on every bond. Every one!', controls: `<p class="ask">Lenders don’t believe him. What happens to Dragovia’s bonds? (A bond’s <b>yield</b> is the yearly return a buyer earns at the price paid.)</p>${qc.html}` }); qc.wire();
      return;
    }
    // ---- 9. Puerto Rico: one sentence ----
    if (s.id === 'pr') {
      const t = task(s.id); const sc = scenePR(s); mount(sc);
      const pcts = W0.prPctOptions(t).sort((a, b) => h.fnv1a('pr' + a[1]) - h.fnv1a('pr' + b[1])).map(([v]) => [fix(v * 100, 3) + '%', fix(v * 100, 1) + '%']);
      const REASONS = [['recover', 'Lenders now expected to get back less of what they were owed'], ['rate', 'Puerto Rico had raised the interest rate on its bonds'], ['fed', 'The Fed raised interest rates that day']];
      const askWhy = (pct) => {
        $('#controls').innerHTML = `<p class="ask">Why did one sentence move it so much?</p>${chips('dec', REASONS, null)}<div class="actions"><button class="btn" type="button" id="whyBtn">Lock it in</button></div>`;
        $('#whyBtn').addEventListener('click', () => { const c = $('input[name=dec]:checked', con); if (!c) { fb('Pick a reason first.', false); return; } fb('', null);
          const res = judgeRows(s, [String(t.cents), pct], c.value);
          if (res.ok) { sc.rows([{ ok: true }, { ok: true }]); say('boss', C.praise(t, h), 'ok'); showNext(); } else say('boss', 'Its coupon didn’t change, and the Fed didn’t move that day. What changed was how much lenders expected to get back.', 'bad'); });
      };
      shell(s, { who: 'news', done: L.done, line: L.done ? C.praise(t, h) : 'October 2017. The U.S. president says on TV that Puerto Rico’s debt will have to be wiped out. Its main bond had traded at <b>44</b> cents on the dollar; the next day it traded as low as about <b>30</b>.',
        controls: L.done ? '' : `<p class="ask">By what percent had it fallen at that low? The fall is 14 cents.</p>${chips('pct', pcts, null, 'two')}<div class="actions"><button class="btn" type="button" id="pctBtn">Lock it in</button></div>` });
      if (!L.done) {
        autoSwitch(sc, s);
        $('#pctBtn').addEventListener('click', () => { const c = $('input[name=pct]:checked', con); if (!c) { fb('Pick a percent first.', false); return; } fb('', null);
          const ok = Math.abs(parseFloat(c.value) / 100 - t.cents / t.p0) < 0.001;
          if (!ok) { L.attempts = (L.attempts || 0) + 1; recordCall('pr', false); L.fails = (L.fails || 0) + 1; save(); helpLadder(t, L); stamp('Not yet', false); Sound.miss();
            const v = parseFloat(c.value) / 100; say('boss', Math.abs(v - t.cents / t.p1) < 0.001 ? 'Divide the fall by where it started, 44, not by 30.' : Math.abs(v - t.p1 / t.p0) < 0.001 ? 'That’s how much was left. The fall is 14 ÷ 44.' : 'Divide the 14-cent fall by the starting price, 44 cents.', 'bad'); return; }
          sc.rows([{ ok: true }, { ok: true }]); stamp('Right', true); Sound.chime(); say('boss', `${fix(100 * t.cents / t.p0, 1)}% gone at the low.`, 'ok'); setTimeout(() => askWhy(c.value), RM ? 0 : 400); });
      }
      return;
    }
    // ---- 10. A bank's big bet: the colleague who bought them ----
    if (s.id === 'bridge') {
      const t = task(s.id); let sc;
      const parseBil = (v) => { const x = h.parseMoney(String(v == null ? '' : v).replace(/\s*(billions?|bn|b)\s*$/i, '')); return isFinite(x) && Math.abs(x) >= 1e5 ? x / 1e9 : x; };
      const coda = () => { const line = `The bonds lost about $${fix(t.answer)} billion, and not one borrower missed a payment. In Unit 5 you meet a real bank that made this bet: Silicon Valley Bank.`;
        say('colleague', line, 'ok'); showNext(); };
      sc = sceneBridge(s, { onDial: () => {}, onLanded: () => coda(),
        onMiss: (v) => {
          if (S.friend) { const ok = W0.friendClose(v, t.answer); recordCall('bridge', ok); stamp(ok ? 'Called it' : 'Off the mark', ok); if (ok) Sound.chime(); else Sound.miss();
            say('colleague', `${ok ? 'Close enough to sting.' : `You guessed $${fix(v)} billion.`} It was about $${fix(t.answer)} billion: ${t.D} × ${t.dy} = ${fix(t.D * t.dy)}% of $${t.A} billion. And not one borrower missed a payment.`, ok ? 'ok' : 'bad'); showNext(); return; }
          stamp('Off the mark', false); Sound.miss(); say('colleague', `The gauge stopped at about $${fix(t.answer)} billion. Your mark said $${fix(v)} billion. Check the percent and the multiplication, then mark it again.`, 'bad'); } });
      mount(sc);
      const line = `I bought these in 2021: <b>$${t.A} billion</b> of the bank’s money, duration <b>${t.D}</b>. Rates are up <b>${fix(t.dy)}</b> points since. How much did I lose?`;
      if (S.friend) {
        const setter = Setter({ min: 0, max: Math.round(t.A * 3) / 10, step: 0.1, value: Math.round(t.A) / 10, fmt: (v) => `$${fix(v, 1)} billion`, label: 'Your guess at the loss' });
        sc.guess(setter); layoutStage();
        shell(s, { who: 'colleague', done: false, line, controls: `<p class="ask">Drag the gold mark on the gauge to your guess, then turn the Fed’s dial.</p>${setter.html()}<div class="actions"><button class="btn" type="button" id="lockBtn">Lock in my guess</button></div>` });
        setter.wire(); $('#lockBtn').addEventListener('click', () => { sc.lock(); say('colleague', `Now turn the Fed’s dial up ${fix(t.dy)} points.`); $('#controls').innerHTML = ''; });
        return;
      }
      const opts = W0.bridgePctOptions(t).sort((a, b) => h.fnv1a(S.code + a[1]) - h.fnv1a(S.code + b[1])).map(([v]) => [String(v), fix(v) + '%']);
      shell(s, { who: 'colleague', done: L.done, line: L.done ? `The bonds lost about $${fix(t.answer)} billion. Turn the dial again if you want to watch it.` : line,
        controls: L.done ? '' : `<p class="ask">First, how far did their price fall?</p>${chips('bp', opts, null, 'two')}<p class="ask">Then the loss, in billions of dollars:</p><div class="typein"><span>$</span><input id="loss" inputmode="decimal" autocomplete="off" placeholder="0.0" aria-label="Loss in billions of dollars"><span>billion</span></div><div class="actions"><button class="btn" type="button" id="markBtn">Mark it on the gauge</button></div>` });
      if (L.done) { sc.unlock(); return; }
      autoSwitch(sc, s);
      $('#markBtn').addEventListener('click', () => {
        const c = $('input[name=bp]:checked', con); if (!c) { fb('Pick how far the price fell first.', false); return; } fb('', null);
        const lossTxt = $('#loss').value, v = parseBil(lossTxt); if (!isFinite(v) || v <= 0) { fb('Type the loss in billions, like 1.2.', false); return; }
        const res = judgeRows(s, [c.value + '%', lossTxt]);
        if (res.ok) { sc.unlock(); say('colleague', `$${fix(v)} billion. Now turn the Fed’s dial up ${fix(t.dy)} points and watch it go.`, 'ok'); }
        else { sc.arm(v); say('colleague', `${esc(res.msg.replace(/^[^:]+: /, ''))} Or turn the dial and see where the gauge stops.`, 'bad'); }
      });
      return;
    }
    // ---- 11. The note (class only) ----
    if (s.id === 'note') {
      const sc = sceneLedger(); mount(sc);
      const N = C.note, n = S.notes;
      const f = (k, lab) => `<div><label for="n_${k}">${lab}</label><textarea id="n_${k}" data-k="${k}" rows="2">${esc(n[k] || '')}</textarea></div>`;
      shell(s, { who: 'boss', done: L.done, line: 'A company needs $50 million. Should it sell bonds or shares? Give me one advantage and one drawback of each.',
        controls: `<div class="ledger">${f('ba', 'Bonds: an advantage')}${f('bd', 'Bonds: a drawback')}${f('sa', 'Shares: an advantage')}${f('sd', 'Shares: a drawback')}</div><p class="wc" id="wc" aria-live="polite"></p>` });
      const compose = () => ['ba', 'bd', 'sa', 'sd'].map((k) => `${{ ba: 'Bonds, advantage', bd: 'Bonds, drawback', sa: 'Shares, advantage', sd: 'Shares, drawback' }[k]}: ${String(n[k] || '').trim().replace(/[.\s]+$/, '')}.`).join(' ');
      const own = () => ['ba', 'bd', 'sa', 'sd'].reduce((a, k) => a + words(n[k]), 0);
      const all4 = () => ['ba', 'bd', 'sa', 'sd'].every((k) => words(n[k]) > 0);
      const upd = () => {
        const w = own(), ok = w >= N.minWords && all4();
        $('#wc').textContent = ok ? `${w} words. Saved; it prints on your receipt.` : `${w} of ${N.minWords} words.`;
        if (ok) { S.memo = compose(); if (!L.done) { L.attempts = Math.max(L.attempts || 0, 1); markDone(s.id); showNext(true); } } else if (!L.done) S.memo = compose();
        save(); sc.update();
      };
      $$('.ledger textarea', con).forEach((ta) => ta.addEventListener('input', () => { n[ta.dataset.k] = ta.value; upd(); }));
      upd(); $('#nextBtn').textContent = 'Go to your receipt'; return;
    }
  }
  // Steps with a worked example open on it, then move to the player's numbers (unless the player moves first).
  function autoSwitch(sc, s) {
    if (S.log[s.id].done) return; const at = S.at; let moved = false;
    con.addEventListener('pointerdown', () => { moved = true; }, { once: true });
    setTimeout(() => { if (!moved && S.at === at && scene === sc) sc.show('mine'); }, RM ? 4500 : 3200);
  }

  // ======================= navigation =======================
  function go(id) {
    if (!S.code) return showStart();
    S.at = id; save(); renderTape();
    if (id === 'receipt') showReceipt(); else if (id === 'score') showScore(); else showStep(D.STEPS[idx(id)]);
    con.scrollTop = 0; if (window.innerWidth > 900) window.scrollTo(0, 0); else window.scrollTo(0, 0);
    const t = $('#t', con) || con; t.setAttribute('tabindex', '-1'); t.focus({ preventScroll: true });
  }

  function showStart() {
    S.at = 'start'; S.friend = false; renderTape(); renderCalls();
    const last = store.get(KEY + ':last'); const saved = last ? store.get(KEY + ':' + D.seedFor(last)) : null;
    mount(sceneStart());
    con.innerHTML = `<p class="kicker">Financial Markets and Institutions, Unit 4</p><h1 id="t">The Bond Desk</h1>
      <p class="lead">A bond is a loan built to be resold, and its price moves whenever interest rates do. Make the calls at Great Lakes Community Bank’s bond desk and see whether you were right.</p>
      <div class="actions"><button class="btn" type="button" id="goBtn">${saved ? 'Continue the desk' : 'Play for class'}</button><button class="btn quiet" type="button" id="friendBtn">Just play: 7 calls, no math</button></div>
      <p class="credit">For class: reach the end and download your receipt. That is the whole grade.${saved ? ` Your desk code is <b class="code">${h.fmtCode(last)}</b>.` : ''}</p>
      <details class="resume"><summary>Started on another computer?</summary>
        <form id="codeForm" novalidate><label for="dc">Your desk code</label><input type="text" id="dc" autocomplete="off" autocapitalize="characters" spellcheck="false" placeholder="ABCD-2345" aria-describedby="dcHelp">
        <p id="dcHelp">It is on your receipt and at the bottom of the desk.</p><p class="err" id="startErr" role="alert"></p>
        <div class="actions"><button class="btn quiet small" type="submit">Continue with this code</button></div></form></details>`;
    $('#goBtn').addEventListener('click', () => { startFor(saved ? last : h.newCode()); const first = D.STEPS.find((s) => !S.log[s.id].done); go(saved && S.at && S.at !== 'start' ? S.at : (first ? first.id : 'receipt')); });
    $('#friendBtn').addEventListener('click', startFriend);
    $('#codeForm').addEventListener('submit', (e) => { e.preventDefault(); const v = $('#dc').value; if (!h.validCode(v)) { $('#startErr').textContent = 'A desk code is 8 letters and numbers, like ABCD-2345.'; $('#dc').focus(); return; } startFor(v); const first = D.STEPS.find((s) => !S.log[s.id].done); go(S.at && S.at !== 'start' ? S.at : (first ? first.id : 'receipt')); });
  }

  // ======================= the scorecard (end of the game; for class, the note and receipt follow) =======================
  function shareUrl() { return location.href.split('#')[0].split('?')[0].replace(/index\.html$/, ''); }
  function scoreData() {
    const ids = callIds(), right = ids.filter((k) => S.calls[k]).length, bt = task('bridge');
    const line = `When rates rose ${fix(bt.dy)} points, a bank’s $${bt.A} billion of bonds lost about $${fix(bt.answer)} billion, and nobody missed a payment.`;
    return { ids, right, line, text: `I called ${right} of ${ids.length} at The Bond Desk. ${line} Can you call it better? ${shareUrl()}` };
  }
  function showScore() {
    const d = scoreData();
    mount({ tall: true, layout(Wd, Hd) {
      backdrop(Wd, Hd, { cone: [Wd / 2, Hd * 0.95, Wd * 0.42] }); overlay.innerHTML = '';
      const card = document.createElement('div'); card.className = 'scorecard' + (d.ids.length > 8 ? ' long' : '');
      card.innerHTML = `<p class="sc-k">The Bond Desk</p><p class="sc-big">${d.right}<span> of ${d.ids.length}</span></p><p class="sc-sub">calls right on the first try</p>
        <ul>${d.ids.map((k) => `<li class="${S.calls[k] == null ? 'na' : S.calls[k] ? 'y' : 'n'}"><span aria-hidden="true">${S.calls[k] == null ? '·' : S.calls[k] ? '✓' : '✗'}</span>${esc(CALL_LABELS[k])}<span class="sr-only">${S.calls[k] == null ? ', not called' : S.calls[k] ? ', right' : ', missed'}</span></li>`).join('')}</ul>
        <p class="sc-line">${esc(d.line)}</p>`;
      overlay.appendChild(card); describe(`Scorecard: ${d.right} of ${d.ids.length} calls right on the first try. ${d.line}`);
    } });
    renderTape();
    con.innerHTML = `<p class="kicker">The game is over</p><h2 id="t">You called ${d.right} of ${d.ids.length}.</h2>
      ${speaker('boss', d.right >= d.ids.length - 1 ? 'You read this desk better than most people on it.' : d.right >= d.ids.length / 2 ? 'Not bad. The beam fooled you a few times.' : 'The market got you tonight. Play it again and see.')}
      <div class="actions"><button class="btn" type="button" id="shareBtn">Send this to a friend</button>${S.friend ? '<button class="btn quiet" type="button" id="againBtn">Play again</button>' : ''}<span class="attempts" id="shareNote" aria-live="polite"></span></div>
      ${S.friend ? '<p class="credit">Taking the class? Go back to the first screen and choose Play for class.</p>' : `<div class="coda"><p style="margin:0 0 6px">For class: a short note, then your receipt.</p><button class="btn quiet" type="button" id="toNote">Write your note</button></div>`}`;
    $('#shareBtn').addEventListener('click', async () => {
      const note = $('#shareNote');
      try { if (navigator.share) { await navigator.share({ title: 'The Bond Desk', text: d.text }); note.textContent = ''; return; } } catch (e) { if (e && e.name === 'AbortError') return; }
      try { await navigator.clipboard.writeText(d.text); note.textContent = 'Copied. Paste it into a text.'; } catch (e) { note.textContent = d.text; }
    });
    if ($('#toNote')) $('#toNote').addEventListener('click', () => go('note'));
    if ($('#againBtn')) $('#againBtn').addEventListener('click', startFriend);
  }

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
      <p style="margin-top:22px"><button class="btn quiet small" type="button" data-go="score">See your calls again</button></p><p style="margin-top:22px"><b>Want more practice?</b> Work the problems again with new numbers. Practice rounds are not graded and do not change this receipt.</p><div class="actions"><button class="btn quiet small" type="button" id="practice">Practice with new numbers</button></div>`;
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

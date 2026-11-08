// Small shared helpers.

export const $ = (sel, root = document) => root.querySelector(sel);
export const $$ = (sel, root = document) => [...root.querySelectorAll(sel)];

export const REDUCED = matchMedia("(prefers-reduced-motion: reduce)");
export const reduced = () => REDUCED.matches;

export function esc(s = "") {
  return String(s).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]);
}

export const short = (a = "") => (a ? `${a.slice(0, 6)}…${a.slice(-4)}` : "");
export const shorter = (a = "") => (a ? `${a.slice(0, 4)}…${a.slice(-3)}` : "");
export const fmt = (n) => Number(n || 0).toLocaleString("en-US");
export const isAddr = (a) => /^0x[0-9a-fA-F]{40}$/.test(a || "");
export const sameAddr = (a, b) => !!a && !!b && a.toLowerCase() === b.toLowerCase();
export const ZERO = "0x0000000000000000000000000000000000000000";

export const byteLen = (s) => new TextEncoder().encode(s).length;

/** Base path (supports project pages like user.github.io/lineup/ as well as a custom domain). */
export const EMBED = !!window.LINEUP_EMBED; // hosted preview: in-memory routing, URL never changes
export const BASE = EMBED ? "" : (document.querySelector("base")?.getAttribute("href") || "/").replace(/\/$/, "");
export const url = (path) => `${BASE}${path}`;
export const absUrl = (path) => `${location.origin}${BASE}${path}`;

// ── simple word filter (client-side; the chain stores whatever is sent) ──
const BLOCK = ["fuck", "shit", "cunt", "nigger", "faggot", "retard", "rape", "nazi", "kill yourself", "kys", "porn", "scam"];
export function flagged(text = "") {
  const t = text.toLowerCase().replace(/[^a-z ]/g, "");
  return BLOCK.some((w) => new RegExp(`(^|\\s)${w}`).test(t));
}
export function clean(text = "") {
  return flagged(text) ? "•••" : text;
}

// ── countdown ──
export function countdownParts(targetSec) {
  const ms = targetSec * 1000 - Date.now();
  if (ms <= 0) return { done: true, d: 0, h: 0, m: 0, s: 0, last24: false };
  const s = Math.floor(ms / 1000);
  return { done: false, d: Math.floor(s / 86400), h: Math.floor((s % 86400) / 3600), m: Math.floor((s % 3600) / 60), s: s % 60, last24: ms < 86400000 };
}
const p2 = (n) => String(n).padStart(2, "0");
export function countdownHTML(targetSec, closed = false) {
  if (closed) return `<div class="cd cd--done"><span>Launched 🎉 — final line</span></div>`;
  const c = countdownParts(targetSec);
  if (c.done) return `<div class="cd cd--done"><span>Launching any moment</span></div>`;
  return `<div class="cd ${c.last24 ? "cd--hot" : ""}">
    <div class="cd__u"><b>${p2(c.d)}</b><i>days</i></div><span class="cd__sep">:</span>
    <div class="cd__u"><b>${p2(c.h)}</b><i>hrs</i></div><span class="cd__sep">:</span>
    <div class="cd__u"><b>${p2(c.m)}</b><i>min</i></div><span class="cd__sep">:</span>
    <div class="cd__u"><b>${p2(c.s)}</b><i>sec</i></div></div>`;
}
/** Re-renders every [data-countdown] element each second. */
let cdTimer;
export function startCountdowns() {
  clearInterval(cdTimer);
  const tick = () =>
    $$("[data-countdown]").forEach((el) => {
      const html = countdownHTML(Number(el.dataset.countdown), el.dataset.closed === "1");
      if (el._last !== html) { el.innerHTML = html; el._last = html; }
    });
  tick();
  cdTimer = setInterval(tick, 1000);
}

export const daysTo = (sec) => Math.max(0, Math.ceil((sec * 1000 - Date.now()) / 86400000));

// ── toast ──
export function toast(msg, kind = "") {
  let wrap = $(".toasts");
  if (!wrap) { wrap = document.createElement("div"); wrap.className = "toasts"; wrap.setAttribute("aria-live", "polite"); document.body.append(wrap); }
  const t = document.createElement("div");
  t.className = `toast ${kind ? "toast--" + kind : ""}`;
  t.textContent = msg;
  wrap.append(t);
  if (window.gsap && !reduced()) gsap.from(t, { y: 16, opacity: 0, duration: 0.3 });
  setTimeout(() => {
    if (window.gsap && !reduced()) gsap.to(t, { opacity: 0, y: -8, duration: 0.25, onComplete: () => t.remove() });
    else t.remove();
  }, 3200);
}

export async function copy(text, label = "Copied") {
  try { await navigator.clipboard.writeText(text); }
  catch {
    const ta = document.createElement("textarea"); ta.value = text; document.body.append(ta); ta.select();
    try { document.execCommand("copy"); } catch {} ta.remove();
  }
  toast(label + " ✓", "ok");
}

// ── barcode from an address: each hex nibble → a bar width ──
export function barcodeSVG(addr = "0x0", { height = 44, className = "barcode" } = {}) {
  const hex = (addr || "").replace(/^0x/, "").toLowerCase() || "0";
  let x = 0, bars = "";
  for (const ch of hex) {
    const v = parseInt(ch, 16) || 0;
    const w = 1 + (v % 3);
    const gap = 1 + ((v >> 2) % 2);
    bars += `<rect x="${x}" y="0" width="${w}" height="${height}"/>`;
    x += w + gap;
  }
  return `<svg class="${className}" viewBox="0 0 ${x} ${height}" preserveAspectRatio="none" aria-hidden="true">${bars}</svg>`;
}

export function avatar(addr = "") {
  const h = parseInt((addr || "0x00").slice(2, 8), 16) || 0;
  const hue = h % 360, hue2 = (hue + 70) % 360;
  return `<span class="av" style="--a:hsl(${hue} 90% 70%);--b:hsl(${hue2} 80% 60%)" aria-hidden="true"></span>`;
}

export function timeAgo(sec) {
  const d = Math.max(0, Date.now() / 1000 - sec);
  if (d < 60) return "just now";
  if (d < 3600) return `${Math.floor(d / 60)}m ago`;
  if (d < 86400) return `${Math.floor(d / 3600)}h ago`;
  return `${Math.floor(d / 86400)}d ago`;
}

export function download(name, text, type = "text/csv") {
  const blob = new Blob([text], { type });
  const a = Object.assign(document.createElement("a"), { href: URL.createObjectURL(blob), download: name });
  document.body.append(a); a.click(); a.remove();
  setTimeout(() => URL.revokeObjectURL(a.href), 1000);
}

export function toCSV(rows) {
  return rows.map((r) => r.map((v) => { const s = String(v ?? ""); return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s; }).join(",")).join("\n");
}

export function tween(el, to, { from = 0, duration = 1.2, format = fmt } = {}) {
  if (!el) return;
  if (!window.gsap || reduced()) { el.textContent = format(to); return; }
  const o = { v: from };
  gsap.to(o, { v: to, duration, ease: "power2.out", onUpdate: () => (el.textContent = format(Math.round(o.v))) });
}

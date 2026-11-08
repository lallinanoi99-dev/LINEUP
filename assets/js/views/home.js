// "/" — the website: grain-textured tone sections, thin column rules, scroll-driven reveals.
import { STORY, IS_DEPLOYED, COLORS } from "../config.js";
import { $, $$, esc, fmt, reduced, url, tween, flagged, avatar, barcodeSVG } from "../util.js";
import { previewCard } from "../ui.js";
import { getStats, getList, loadMembers, rank } from "../chain.js";

const RULES = [
  { k: "Join order", n: "#1,285", d: "Join with your wallet and you get a number: the order BOT Chain recorded. Nobody can cut in, not even the creator." },
  { k: "Invites", n: "3 friends", d: "Share your invite link. Every friend who joins with it counts toward your boost, up to the cap the creator set." },
  { k: "Boost", n: "−15 spots", d: "Each counted invite moves you up by the list's boost. Five per friend here, so three friends is fifteen spots." },
  { k: "Your spot", n: "#1,270", d: "Everyone is sorted by score. Ties go to whoever joined first, and closing the line freezes the final order." },
];

const STEPS = [
  { t: "Create a line", d: "Name it, pick a launch date and how far each invite moves people up. One transaction on BOT Chain and your page is live." },
  { t: "Share the link", d: "Post your page anywhere. People join with their wallet and get a numbered spot in line." },
  { t: "Friends climb", d: "Everyone gets an invite link. Each friend who joins with it moves them up, up to the cap you set." },
  { t: "Launch day", d: "Close the line to freeze every spot, then export the final order as CSV for early access." },
];

const FAQ = [
  ["Do people need crypto to join?", "They need a wallet like MetaMask on BOT Chain and a tiny bit of BOT for gas. Some lists also require holding 0.001 BOT."],
  ["Can the creator change positions?", "No. The contract has no admin and no edit function. Creators can only close the list, which freezes everyone's final spot."],
  ["What happens on launch day?", "The creator closes the list. The page switches to “Launched — final line” and the CSV export is the early-access list."],
  ["Is my spot worth money?", "No. Spots are wallet-based and meant for fun and early access. There are no payments or tokens in Lineup."],
  ["Where is the data stored?", "On BOT Chain. The site is a static page that reads the contract directly. There's no backend."],
];

// Wrap each word so its opacity can be scrubbed by scroll.
const words = (text) => text.split(" ").map((w) => `<span class="w fade-w">${esc(w)}</span>`).join(" ");
const PREVIEW_COLOR = Math.max(0, COLORS.findIndex((c) => c.key === "sun")); // warm default that suits the palette

export function view() {
  return {
    title: "",
    html: `
<section class="h-hero tone tone--char" data-hero>
  <h1 class="h-hero__h" data-words>${words("Lineup brings the order of a real queue to every launch.")}</h1>
  <div class="h-hero__start">
    <span class="label h-hero__scroll"><i aria-hidden="true"></i>Scroll</span>
    <a class="label" href="${url("/app/new")}" data-link>Create a waitlist ↗</a>
  </div>
  <div class="h-hero__count">
    <span class="label">Spots on BOT Chain</span>
    <b data-count>00</b>
  </div>
</section>

<section class="h-rules tone tone--ochre cols" id="rules" data-rules>
  <div class="h-rules__in">
    <div class="h-rules__l">
      <h2 class="h-head"><span class="ind"></span>In every line, the rule is clear.</h2>
      <ol class="h-rules__list">
        ${RULES.map((r, i) => `<li class="${i ? "" : "is-on"}" data-rule="${i}"><button type="button">${esc(r.k)}</button></li>`).join("")}
      </ol>
      <p class="h-rules__fine">Ranking is computed from on-chain data only: join order, referrals, boost and cap. Spots are wallet-based and for fun and early access, not money.</p>
    </div>
    <div class="h-rules__m">
      <canvas data-contours aria-hidden="true"></canvas>
      <p class="h-rules__num" data-rule-num>${RULES[0].n}</p>
      <div class="h-rules__card" data-rule-card></div>
    </div>
    <div class="h-rules__r"><p class="h-rules__desc" data-rule-desc>${esc(RULES[0].d)}</p></div>
  </div>
</section>

<section class="h-steps tone tone--grey cols" id="how" data-steps>
  <h2 class="h-head h-steps__h"><span class="ind"></span>From one transaction to your launch list.</h2>
  <svg class="h-steps__svg" aria-hidden="true"><path class="base" data-path-base/><path class="done" data-path-done/></svg>
  <div class="h-steps__ticket" data-ticket aria-hidden="true"><span>ADMIT ONE</span><b>#1</b><i></i></div>
  ${STEPS.map((s, i) => `<article class="h-step h-step--${i % 2 ? "l" : "r"}" style="--k:${i}" data-step>
    <i class="h-step__dot" data-dot></i>
    <span class="label">Step ${i + 1}</span>
    <h3>${esc(s.t)}</h3>
    <p>${esc(s.d)}</p>
  </article>`).join("")}
</section>

<section class="h-prev tone tone--ink cols" id="preview">
  <div class="h-prev__in">
    <div class="h-prev__l">
      <h2 class="h-head"><span class="ind"></span>Type a name. Get a line.</h2>
      <p>This is what people see when you share your link: a countdown, a live counter and one button.</p>
      <form class="line-form" data-showme>
        <input name="n" maxlength="40" placeholder="Your product name" aria-label="Your product name" autocomplete="off">
        <button class="btn btn--ghost btn--sm" type="submit">Show me</button>
      </form>
      <div class="swatches" data-swatches aria-label="Cover colour">
        ${COLORS.map((c, i) => `<button type="button" class="swatch ${i === PREVIEW_COLOR ? "is-on" : ""}" style="--c:${c.hex}" data-c="${i}" aria-label="${c.key}"></button>`).join("")}
      </div>
    </div>
    <div class="h-prev__m" data-preview></div>
    <div class="h-prev__r"><p>Share it anywhere. Every join is a transaction, so the order on the page is the order on chain.</p></div>
  </div>
</section>

<section class="h-fair tone tone--umber cols" id="fair">
  <div class="h-fair__in">
    <div class="h-fair__l"><h2 class="h-head" data-reveal><span class="ind"></span>Nobody cuts the line.</h2></div>
    <div class="h-fair__r">
      <ul class="facts">
        ${[
          ["01", "Spots on-chain", "Every join is a transaction. Order is set by the chain, not a database."],
          ["02", "No emails needed", "Wallet only. No names, no inboxes, no personal data collected."],
          ["03", "No self-referrals", "The contract ignores you as your own referrer and anyone not already in line."],
          ["04", "Export your list", "Download position, wallet, join time and referrals for early access."],
        ].map(([n, t, d]) => `<li data-reveal><span class="label">${n}</span><h3>${t}</h3><p>${d}</p></li>`).join("")}
      </ul>
      <div class="rank-box" id="ranking" data-reveal>
        <span class="label">How ranking works</span>
        <p class="rc__f">score = max(1, joinNo − boost × min(refs, cap))</p>
        <p>Your join number is the order you joined. Counted referrals are the friends who joined with your link, up to the cap (default 20). Each one moves you up by the boost (default 5). Ties go to whoever joined first. Creators can also require joiners to hold at least 0.001 BOT.</p>
      </div>
      ${STORY.listId != null ? `<div class="story-row" data-reveal>
        <div><span class="label">In line</span><b data-story="count">—</b></div>
        <div><span class="label">Came from invites</span><b data-story="share">—</b></div>
        <div><span class="label">Top inviter's friends</span><b data-story="top">—</b></div>
      </div>` : ""}
      <div class="qa" id="faq">
        <span class="label">FAQ</span>
        ${FAQ.map(([q, a]) => `<details data-reveal><summary>${esc(q)}<span aria-hidden="true">+</span></summary><p>${esc(a)}</p></details>`).join("")}
      </div>
    </div>
  </div>
</section>

<section class="h-close tone tone--char" data-close>
  <h2 class="h-hero__h" data-words>${words("Every launch starts with a line.")}</h2>
  <form class="line-form line-form--box" data-closing>
    <input name="n" maxlength="40" placeholder="Your product name" aria-label="Your product name" autocomplete="off">
    <button class="btn btn--primary btn--sm" type="submit">Create</button>
  </form>
</section>`,
    mount,
  };
}

// ── white cards for the rules section ──
function ruleCard(i) {
  if (i === 0) return `<div class="rc rc--ticket"><span class="label">Rocket · Admit one</span><b>#1,285</b><i class="rc__tear"></i>${barcodeSVG("0x7a3f9e2b44c1d0a8f3e6b2c9d17e05a4c3b8c210", { height: 34 })}<span class="label">Join no. 1,285 · ref none</span></div>`;
  if (i === 1) return `<div class="rc"><span class="label">Your invite link</span><div class="rc__field mono"><span>lineup/w/7?ref=0xAB…</span><b>Copied</b></div>
    <ul class="rc__rows">${["0xa1b2c3", "0x77ee10", "0xf04d9a"].map((a) => `<li>${avatar(a)}<span class="mono">${a.slice(0, 6)}…</span><span>joined with your link</span></li>`).join("")}</ul></div>`;
  if (i === 2) return `<div class="rc"><span class="label">Position score</span><p class="rc__f">max(1, joinNo − boost × min(refs, cap))</p>
    <div class="rc__calc"><span>1,285</span><span>− 5 × min(3, 20)</span><b>= 1,270</b></div></div>`;
  const rows = [["0x7a3f…c210", "#1,262"], ["0x19be…04af", "#1,266"], ["You", "#1,270"], ["0xd4c1…9e7b", "#1,271"], ["0x55e0…a1c3", "#1,278"]];
  return `<div class="rc"><span class="label">Line · Rocket</span><ol class="rc__rows" data-board>${rows.map(([a, n]) => `<li class="${a === "You" ? "is-you" : ""}"><span class="mono">${a}</span><span class="mono">${n}</span></li>`).join("")}</ol></div>`;
}

async function mount(root) {
  const R = reduced();
  const stops = [];
  const onFrame = []; // scroll-driven updaters, run in one rAF per scroll

  // word-by-word brighten (hero + closing)
  $$("[data-words]", root).forEach((h) => {
    const ws = $$(".w", h), sec = h.closest("section");
    if (R) { ws.forEach((w) => (w.style.opacity = 1)); return; }
    onFrame.push(() => {
      const r = sec.getBoundingClientRect(), vh = innerHeight;
      // hero starts a third lit and fills as it scrolls away; closing fills as it scrolls in
      const p = sec.dataset.hero !== undefined ? 0.36 + Math.min(1, -r.top / (vh * 0.45)) * 0.64 : Math.min(1, Math.max(0, (vh - r.top) / (vh * 0.85)));
      const lit = p * ws.length;
      ws.forEach((w, i) => (w.style.opacity = String(0.2 + 0.8 * Math.min(1, Math.max(0, lit - i)))));
    });
  });

  stops.push(runRules(root, onFrame, R));
  stops.push(runSteps(root, onFrame, R));

  let raf = 0;
  const tick = () => { raf = 0; onFrame.forEach((f) => f()); };
  const onScroll = () => { if (!raf) raf = requestAnimationFrame(tick); };
  addEventListener("scroll", onScroll, { passive: true });
  addEventListener("resize", onScroll);
  tick();
  stops.push(() => { removeEventListener("scroll", onScroll); removeEventListener("resize", onScroll); cancelAnimationFrame(raf); });

  // fade-in for the fair/faq blocks
  if (window.gsap && window.ScrollTrigger && !R) {
    $$("[data-reveal]", root).forEach((el) => {
      gsap.fromTo(el, { y: 24, opacity: 0.001 }, { y: 0, opacity: 1, duration: 0.7, ease: "power3.out", scrollTrigger: { trigger: el, start: "top 92%", once: true } });
    });
  }

  // forms → create page with the name prefilled
  const go = (name) => { window.__lineupPrefill = name; window.lineupNavigate(url(`/app/new${name ? `?name=${encodeURIComponent(name)}` : ""}`)); };
  $("[data-closing]", root).addEventListener("submit", (e) => { e.preventDefault(); go(e.target.n.value.trim()); });

  // live preview card
  let color = PREVIEW_COLOR;
  const stage = $("[data-preview]", root);
  const launch = Math.floor(Date.now() / 1000) + 14 * 86400 + 3 * 3600;
  const show = (name) => {
    const n = flagged(name) ? "" : name;
    stage.innerHTML = previewCard({ name: n || "Your product", pitch: n ? `${n} is launching soon. Get in line early.` : "", icon: "🚀", color, launchAt: launch, reward: "First 100 get early access" }, { count: 0 });
    if (window.gsap && !R) gsap.from(stage.firstElementChild, { y: 20, opacity: 0, duration: 0.5, ease: "power3.out" });
  };
  show("");
  $("[data-showme]", root).addEventListener("submit", (e) => { e.preventDefault(); show(e.target.n.value.trim()); });
  $$("[data-swatches] .swatch", root).forEach((b) =>
    b.addEventListener("click", () => {
      $$("[data-swatches] .swatch", root).forEach((x) => x.classList.toggle("is-on", x === b));
      color = Number(b.dataset.c);
      show($("[data-showme] input", root).value.trim());
    })
  );

  // live numbers (real data only)
  if (IS_DEPLOYED) {
    getStats().then((s) => {
      const el = $("[data-count]", root);
      tween(el, s.spots, { duration: 1.6, format: (v) => String(v).padStart(2, "0").replace(/\B(?=(\d{3})+(?!\d))/g, ",") });
    }).catch(() => {});
    if (STORY.listId != null) {
      getList(STORY.listId).then(async (l) => {
        const r = rank(l, await loadMembers(l.id, l.count));
        const fromInvites = r.rows.filter((x) => x.referrer && !/^0x0{40}$/i.test(x.referrer)).length;
        $('[data-story="count"]', root).textContent = fmt(l.count);
        $('[data-story="share"]', root).textContent = l.count ? `${Math.round((fromInvites / l.count) * 100)}%` : "0%";
        $('[data-story="top"]', root).textContent = fmt(r.inviters[0]?.refs || 0);
      }).catch(() => {});
    }
  }

  return () => stops.forEach((f) => f && f());
}

// ── rules: pinned on desktop, the left list drives number, card and description ──
function runRules(root, onFrame, R) {
  const sec = $("[data-rules]", root);
  const items = $$("[data-rule]", sec), num = $("[data-rule-num]", sec), card = $("[data-rule-card]", sec), desc = $("[data-rule-desc]", sec);
  let cur = -1;
  const set = (i) => {
    if (i === cur) return;
    cur = i;
    items.forEach((li, j) => li.classList.toggle("is-on", j === i));
    num.textContent = RULES[i].n;
    desc.textContent = RULES[i].d;
    card.innerHTML = ruleCard(i);
    if (window.gsap && !R) {
      gsap.fromTo([num, desc], { opacity: 0, y: 10 }, { opacity: 1, y: 0, duration: 0.45, stagger: 0.05, ease: "power2.out" });
      gsap.fromTo(card.firstElementChild, { opacity: 0, scale: 0.97 }, { opacity: 1, scale: 1, duration: 0.45, ease: "power2.out" });
      if (i === 3) { // "You" climbs from the bottom to its spot
        const you = $(".is-you", card), board = $("[data-board]", card);
        if (window.Flip && you && board) {
          board.append(you);
          requestAnimationFrame(() => {
            const st = Flip.getState($$("li", board));
            board.insertBefore(you, board.children[2]);
            Flip.from(st, { duration: 0.8, ease: "power3.inOut", delay: 0.25 });
          });
        }
      }
    }
  };
  const pinned = !R && matchMedia("(min-width: 901px)").matches;
  sec.classList.toggle("is-pinned", pinned);
  items.forEach((li) => $("button", li).addEventListener("click", () => {
    const i = Number(li.dataset.rule);
    if (!pinned) return set(i);
    const top = sec.getBoundingClientRect().top + scrollY, span = sec.offsetHeight - innerHeight;
    scrollTo({ top: top + span * ((i + 0.5) / RULES.length), behavior: "smooth" });
  }));
  if (pinned) onFrame.push(() => {
    const r = sec.getBoundingClientRect(), span = sec.offsetHeight - innerHeight;
    const p = Math.min(0.999, Math.max(0, -r.top / span));
    set(Math.floor(p * RULES.length));
  });
  set(0);
  return runContours($("[data-contours]", sec), R);
}

// ── wavy contour lines behind the rules card ──
function runContours(canvas, R) {
  const ctx = canvas.getContext("2d");
  let w = 0, h = 0, raf = 0, visible = false;
  const size = () => {
    const r = canvas.getBoundingClientRect(), dpr = Math.min(2, devicePixelRatio || 1);
    w = r.width; h = r.height;
    canvas.width = w * dpr; canvas.height = h * dpr;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  };
  const draw = (now) => {
    const t = now / 1000;
    ctx.clearRect(0, 0, w, h);
    const n = 46;
    for (let i = 0; i < n; i++) {
      const k = i / (n - 1);
      ctx.beginPath();
      for (let x = -10; x <= w + 10; x += 6) {
        const u = x / w;
        const y = h * (k * 1.25 - 0.12) - u * h * 0.22
          + Math.sin(u * 7 + k * 5 + t * 0.35) * h * 0.035
          + Math.sin(u * 15 - k * 9 + t * 0.6) * h * 0.012 * (1 + k)
          + Math.sin(k * 23 + t * 0.2) * h * 0.02;
        x === -10 ? ctx.moveTo(x, y) : ctx.lineTo(x, y);
      }
      const a = 0.18 + 0.5 * Math.sin(k * Math.PI);
      ctx.strokeStyle = `hsla(${22 + k * 24}, 92%, ${52 + k * 10}%, ${a})`;
      ctx.lineWidth = 0.9;
      ctx.stroke();
    }
    if (!R && visible) raf = requestAnimationFrame(draw);
  };
  size();
  const ro = new ResizeObserver(() => { size(); draw(performance.now()); });
  ro.observe(canvas);
  const io = new IntersectionObserver(([e]) => {
    visible = e.isIntersecting;
    cancelAnimationFrame(raf);
    raf = requestAnimationFrame(draw);
  });
  io.observe(canvas);
  return () => { cancelAnimationFrame(raf); ro.disconnect(); io.disconnect(); };
}

// ── steps: a ticket rides an S-curve through the step dots ──
function runSteps(root, onFrame, R) {
  const sec = $("[data-steps]", root);
  const steps = $$("[data-step]", sec), dots = $$("[data-dot]", sec), ticket = $("[data-ticket]", sec);
  const base = $("[data-path-base]", sec), done = $("[data-path-done]", sec), num = $("b", ticket);
  let total = 0, pts = [], lim = null;

  const build = () => {
    const box = sec.getBoundingClientRect();
    pts = dots.map((d) => { const r = d.getBoundingClientRect(); return { x: r.left + r.width / 2 - box.left, y: r.top + r.height / 2 - box.top }; });
    if (!pts.length) return;
    // middle-column bounds for the ticket's centre (none on mobile, where both rules collapse to one)
    const xs = [...new Set(pts.map((q) => Math.round(q.x)))].sort((a, b) => a - b), half = ticket.offsetWidth / 2 + 10;
    lim = xs.length > 1 && xs.at(-1) - xs[0] > half * 3 ? [xs[0] + half, xs.at(-1) - half] : null;
    const H = sec.offsetHeight;
    let d = `M ${pts[0].x} ${Math.max(0, pts[0].y - innerHeight * 0.35)} L ${pts[0].x} ${pts[0].y}`;
    for (let i = 1; i < pts.length; i++) {
      const a = pts[i - 1], b = pts[i], m = (a.y + b.y) / 2;
      d += ` C ${a.x} ${m} ${b.x} ${m} ${b.x} ${b.y}`;
    }
    d += ` L ${pts.at(-1).x} ${H}`;
    base.setAttribute("d", d); done.setAttribute("d", d);
    total = base.getTotalLength();
    done.style.strokeDasharray = `${total} ${total}`;
  };
  // path y grows monotonically with length, so binary-search the length for a given y
  const atY = (y) => {
    let lo = 0, hi = total;
    for (let i = 0; i < 22; i++) { const mid = (lo + hi) / 2; base.getPointAtLength(mid).y < y ? (lo = mid) : (hi = mid); }
    return lo;
  };
  const update = () => {
    if (!total) return;
    const box = sec.getBoundingClientRect();
    const y = innerHeight * 0.55 - box.top; // follow a point a bit below the middle of the screen
    const len = R ? atY(pts[0].y) : atY(Math.max(pts[0].y, y));
    const p = base.getPointAtLength(len), q = base.getPointAtLength(Math.min(total, len + 2));
    const ang = Math.atan2(q.y - p.y, q.x - p.x) * 180 / Math.PI - 90; // 0 when heading straight down
    let x = p.x;
    if (lim) x = Math.min(lim[1], Math.max(lim[0], x));
    ticket.style.transform = `translate(${x}px, ${p.y}px) rotate(${(-ang * 0.35).toFixed(2)}deg)`;
    done.style.strokeDashoffset = String(total - len);
    let on = 0;
    pts.forEach((pt, i) => { if (p.y >= pt.y - 4) on = i; });
    steps.forEach((s, i) => { s.classList.toggle("is-on", R || i === on); s.classList.toggle("is-past", i < on); });
    num.textContent = `#${[1, 1285, 1270, 1270][on]}`.replace(/\B(?=(\d{3})+(?!\d))/g, ",");
  };
  build();
  onFrame.push(update);
  const ro = new ResizeObserver(() => { build(); update(); });
  ro.observe(sec);
  return () => ro.disconnect();
}

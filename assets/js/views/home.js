// "/" — the website (Giga-style layout, Lineup's own colours and copy).
import { STORY, BIG_STAT_MIN, IS_DEPLOYED, COLORS, NETWORKS } from "../config.js";
import { $, $$, esc, fmt, reduced, url, tween, flagged, avatar } from "../util.js";
import { previewCard } from "../ui.js";
import { getStats, getList, loadMembers, rank } from "../chain.js";

const STEPS = [
  { t: "You make a line", log: ["createList ✓", "name: Rocket", "boost: up 5 per friend · cap 20"], say: "Rocket is live at lineup/w/7. Share it anywhere.", me: "Make a waitlist for Rocket." },
  { t: "A friend joins", log: ["Joined ✓", "joinNo: 1,285", "ref: none"], say: "You're #1,285. Want your invite link?", me: "Put me in line." },
  { t: "You share your link", log: ["Invite link ready", "lineup/w/7?ref=0xAB…"], say: "Copied. Every friend who joins with it moves you up 5.", me: "Yes, give me my link." },
  { t: "Three friends join", log: ["Joined ✓ via 0xAB…", "Joined ✓ via 0xAB…", "Joined ✓ via 0xAB…", "counted: 3 / 20"], say: "You moved up 15 spots. You're #1,270 now.", me: "" },
  { t: "Launch day", log: ["Closed ✓", "positions frozen", "export: lineup-7-rocket.csv"], say: "Launched 🎉 Final line exported for early access.", me: "" },
];

export function view() {
  return {
    title: "",
    html: `
<section class="hero">
  <div class="hero__glow" aria-hidden="true"></div>
  <div class="wrap hero__in">
    <span class="eyebrow" data-hero-in>Waitlists that grow themselves</span>
    <h1 class="hero__h1 px" data-split>Get in line.</h1>
    <p class="hero__sub" data-hero-in>Make a launch waitlist in a minute. People join with their wallet, invite friends to move up, and every spot lives on BOT Chain.</p>
  </div>
  <div class="wrap">${device()}</div>
  <div class="wrap strip" data-hero-in>
    <span>BOT Chain · ${NETWORKS.mainnet.chainId}</span><span>Wallet-only</span><span>No backend</span><span>One transaction</span><span>Open source</span><span>CSV export</span>
  </div>
</section>

<section class="steps" id="how" data-steps>
  <div class="wrap steps__in">
    <div class="steps__left">
      <span class="eyebrow">How it works</span>
      <h2 class="h2 px">Lines that grow themselves.</h2>
      <p class="muted steps__sub">Create, share, climb. Every step is a transaction on BOT Chain, so the order is the order.</p>
      <ol class="steps__list" data-step-list>
        ${STEPS.map((s, i) => `<li class="steps__item ${i === 0 ? "is-on" : ""}" data-step="${i}"><span class="mono">0${i + 1}</span><button type="button">${esc(s.t)}</button></li>`).join("")}
      </ol>
    </div>
    <div class="steps__right">
      <div class="console">
        <div class="console__head"><span class="px console__title" data-console-title>waiting</span><span class="mono console__meta">LINE · ROCKET</span></div>
        <div class="console__body" data-console></div>
        <div class="console__input"><span>Message</span><span aria-hidden="true">↑</span></div>
        <div class="console__foot"><span class="screw"></span><span class="mono">LINEUP</span><span class="console__mode mono"><i></i>LIVE</span><span class="dots" aria-hidden="true"></span></div>
      </div>
    </div>
  </div>
</section>

<section class="flow" id="ranking-visual">
  <div class="flow__stage" data-flow>
    <canvas data-flow-canvas aria-label="Join order, referrals and boost combine into your spot"></canvas>
    <span class="flow__label" style="--x:7%;--y:11%">Join order</span>
    <span class="flow__label" style="--x:5%;--y:46%">Referrals</span>
    <span class="flow__label" style="--x:9%;--y:75%">Boost × cap</span>
    <span class="flow__node" data-flow-node>Your spot</span>
  </div>
  <div class="seg" role="tablist" aria-label="Ranking">
    <div class="seg__group">
      <button class="seg__btn is-on" data-flow-mode="0">Order</button>
      <button class="seg__btn" data-flow-mode="1">Invite</button>
      <button class="seg__btn" data-flow-mode="2">Climb</button>
    </div>
    <a class="seg__cta" href="${url("/#ranking")}" data-link><i></i>How ranking works ↗</a>
  </div>
</section>

<section class="sec wrap" id="preview">
  <div class="split">
    <div data-reveal>
      <span class="eyebrow">See your launch page</span>
      <h2 class="h2 px">Type a name. Get a line.</h2>
      <p class="muted lead">This is exactly what people see when you share your link: countdown, live counter, one big button.</p>
      <form class="glowform" data-showme>
        <input class="glowform__in mono" name="n" maxlength="40" placeholder="Your product name" aria-label="Your product name" autocomplete="off">
        <button class="btn btn--lime" type="submit">Show me</button>
      </form>
      <div class="swatches" data-swatches aria-label="Cover colour">
        ${COLORS.map((c, i) => `<button type="button" class="swatch ${i === 0 ? "is-on" : ""}" style="--c:${c.hex}" data-c="${i}" aria-label="${c.key}"></button>`).join("")}
      </div>
    </div>
    <div class="preview-stage" data-reveal data-preview></div>
  </div>
</section>

<section class="sec wrap" id="story">
  <span class="eyebrow" data-reveal>Launch story</span>
  <article class="story" data-reveal>
    <div class="story__body">
      <h2 class="h2 px" data-story-title>${esc(STORY.title)}</h2>
      <div class="row gap-sm">${STORY.tags.map((t) => `<span class="tag">${esc(t)}</span>`).join("")}</div>
      <div class="story__nums">
        <div><b class="mono" data-story-n="count">—</b><span>in line</span></div>
        <div><b class="mono" data-story-n="share">—</b><span>came from invites</span></div>
        <div><b class="mono" data-story-n="top">—</b><span>top inviter's friends</span></div>
      </div>
      ${STORY.quote ? `<blockquote class="story__quote">“${esc(STORY.quote)}”<cite>${esc(STORY.maker)}</cite></blockquote>` : `<p class="muted">Real numbers from a real waitlist, read live from the contract. No invented customers.</p>`}
      <a class="btn btn--ghost" href="${STORY.listId != null ? url(`/w/${STORY.listId}`) : url("/app/new")}" data-link>${STORY.listId != null ? "Join this line" : "Start yours"}</a>
    </div>
    <div class="story__media" aria-hidden="true">
      <div class="story__ticket"><span class="mono">ADMIT ONE</span><b class="mono" data-story-count>#—</b></div>
      <div class="story__tagline mono"><i></i>SPOT<br>JOIN #1 · BOOST ×5</div>
    </div>
  </article>
</section>

<section class="sec wrap bigstat" id="stat" data-bigstat hidden>
  <p class="bigstat__n px"><span data-bigstat-n>0</span></p>
  <p class="bigstat__l">spots claimed on BOT Chain</p>
</section>

<section class="sec wrap" id="fair">
  <span class="eyebrow" data-reveal>Built fair</span>
  <h2 class="h2 px" data-reveal>Nobody cuts the line.</h2>
  <div class="cards4">
    <article class="fair" data-reveal><span class="badge mono">ON<br>CHAIN</span><h3>Spots on-chain</h3><p class="muted">Every join is a transaction. Order is set by the chain, not a database.</p></article>
    <article class="fair" data-reveal><span class="badge mono">NO<br>EMAIL</span><h3>No emails needed</h3><p class="muted">Wallet only. No names, no inboxes, no personal data collected.</p></article>
    <article class="fair" data-reveal><span class="badge mono">NO<br>SELF</span><h3>No self-referrals</h3><p class="muted">The contract ignores you as your own referrer and anyone not already in line.</p></article>
    <article class="fair" data-reveal><span class="badge mono">CSV</span><h3>Export your list</h3><p class="muted">Download position, wallet, join time and referrals for early access.</p></article>
  </div>
  <details class="ranking" id="ranking" data-reveal>
    <summary><span class="ranking__plus">+</span> How ranking works</summary>
    <div class="ranking__body">
      <ol>
        <li><b>Join number</b> is the order you joined (1, 2, 3…).</li>
        <li><b>Counted referrals</b> = min(friends who joined with your link, cap). Default cap is 20.</li>
        <li><b>Position score</b> = max(1, join number − boost × counted referrals). Default boost is 5.</li>
        <li>Everyone is sorted by score. Ties go to whoever joined first.</li>
      </ol>
      <p class="mono formula">score = max(1, joinNo − boost × min(refs, cap))</p>
      <p class="muted">Optional rule: creators can require joiners to hold at least 0.001 BOT, which makes throwaway wallets a bit harder. Spots are wallet-based. Lineup is for fun and early access, not money.</p>
    </div>
  </details>
  <div class="faq" id="faq">
    <span class="eyebrow" data-reveal>FAQ</span>
    ${faq("Do people need crypto to join?", "They need a wallet like MetaMask on BOT Chain and a tiny bit of BOT for gas. Some lists also require holding 0.001 BOT.")}
    ${faq("Can the creator change positions?", "No. The contract has no admin and no edit function. Creators can only close the list, which freezes everyone's final spot.")}
    ${faq("What happens on launch day?", "The creator closes the list. The page switches to “Launched 🎉 — final line” and the CSV export is the early-access list.")}
    ${faq("Is my spot worth money?", "No. Spots are wallet-based and meant for fun and early access. There are no payments or tokens in Lineup.")}
    ${faq("Where is the data stored?", "On BOT Chain. The site is a static page that reads the contract directly. There's no backend.")}
  </div>
</section>

<section class="closing">
  <div class="wrap closing__in" data-reveal>
    <h2 class="closing__h px">Every launch starts with a line.</h2>
    <p class="muted">Waitlists with referral boosts, on BOT Chain.<br>Name your product to start one.</p>
    <form class="glowform glowform--center" data-closing>
      <input class="glowform__in mono" name="n" maxlength="40" placeholder="your product name" aria-label="Your product name" autocomplete="off">
      <button class="btn btn--lime" type="submit">Create</button>
    </form>
  </div>
</section>`,
    mount,
  };
}

const faq = (q, a) => `<details class="faq__item" data-reveal><summary>${esc(q)}<span aria-hidden="true">+</span></summary><p class="muted">${esc(a)}</p></details>`;

function device() {
  const rows = [["0x7a3f…c210", 1262], ["0x19be…04af", 1266], ["0xd4c1…9e7b", 1271], ["0x55e0…a1c3", 1278], ["you", 1285]];
  return `<div class="device" data-demo data-hero-in>
    <div class="device__screen">
      <p class="px device__title" data-demo-title>try joining a line</p>
      <div class="device__stage">
        <div class="demo__pane is-on" data-pane="join">
          <div class="printer"><div class="printer__slot"></div>
            <div class="printer__paper" data-paper>
              <div class="mini-ticket"><span class="mono muted">ROCKET · ADMIT ONE</span><b class="mono">#1,285</b><div class="mini-ticket__tear"></div><span class="mini-ticket__bar"></span></div>
            </div>
          </div>
        </div>
        <div class="demo__pane" data-pane="invite">
          <div class="demo-invite">
            <div class="demo-invite__field mono"><span>lineup/w/7?ref=0xAB…</span><b data-copied>Copy</b></div>
            <div class="demo-invite__friends">
              ${[0, 1, 2].map((i) => `<span class="demo-av" data-av>${avatar("0x" + ["a1b2c3", "77ee10", "f04d9a"][i])}</span>`).join("")}
              <span class="demo-invite__plus mono" data-av>+15 spots</span>
            </div>
          </div>
        </div>
        <div class="demo__pane" data-pane="climb">
          <ol class="lb lb--demo" data-lb>
            ${rows.map(([a, n]) => `<li class="lb__row ${a === "you" ? "is-you" : ""}" data-row="${a}"><span class="mono">${a === "you" ? "You" : a}</span><b class="mono" ${a === "you" ? "data-you" : ""}>#${fmt(n)}</b></li>`).join("")}
          </ol>
        </div>
      </div>
      <p class="device__cap" data-demo-cap>Name your product to start a line.</p>
      <form class="device__form" data-try>
        <input class="mono" name="n" maxlength="40" placeholder="your product name" aria-label="Your product name" autocomplete="off">
        <button type="submit">Continue</button>
      </form>
      <small class="device__fine">Prefills the create form. Nothing is stored.</small>
    </div>
    <div class="device__panel">
      <span class="screw screw--tl"></span><span class="screw screw--tr"></span>
      <span class="dots dots--tr" aria-hidden="true"></span>
      <span class="device__brand mono">LINEUP</span>
      <div class="dial" role="tablist" aria-label="Demo">
        <div class="dial__ring" data-dial>
          <span class="dial__tick"></span>
          <span class="dial__mode mono" data-dial-mode>JOIN</span>
          <span class="dial__timer mono" data-demo-timer>02:14:09:00</span>
        </div>
      </div>
      <button class="device__key device__key--tl mono is-on" data-tab="join"><i></i>JOIN</button>
      <button class="device__key device__key--bl mono" data-tab="invite"><i></i>INVITE</button>
      <button class="device__key device__key--br mono" data-tab="climb"><i></i>CLIMB</button>
      <div class="device__progress"><span data-progress></span></div>
    </div>
  </div>`;
}

async function mount(root) {
  const stops = [];
  const R = reduced();

  if (window.gsap && !R) {
    const h1 = $("[data-split]", root);
    if (window.SplitText) {
      const st = SplitText.create(h1, { type: "words,chars" });
      gsap.from(st.chars, { opacity: 0, duration: 0.05, stagger: { each: 0.06, from: "start" }, ease: "none" });
    }
    gsap.from($$("[data-hero-in]", root), { y: 24, opacity: 0, stagger: 0.1, duration: 0.8, delay: 0.3, ease: "power3.out" });
  }
  if (window.gsap && window.ScrollTrigger && !R) {
    $$("[data-reveal]", root).forEach((el) => {
      gsap.fromTo(el, { y: 24, opacity: 0.001 }, { y: 0, opacity: 1, duration: 0.7, ease: "power3.out", scrollTrigger: { trigger: el, start: "top 92%", once: true } });
    });
  }

  stops.push(runDemo(root));
  stops.push(runSteps(root));
  stops.push(runFlow(root));

  const go = (name) => { window.__lineupPrefill = name; window.lineupNavigate(url(`/app/new${name ? `?name=${encodeURIComponent(name)}` : ""}`)); };
  $("[data-try]", root).addEventListener("submit", (e) => { e.preventDefault(); go(e.target.n.value.trim()); });
  $("[data-closing]", root).addEventListener("submit", (e) => { e.preventDefault(); go(e.target.n.value.trim()); });

  // "Show me" preview
  let color = 0;
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

  // big stat + story (real numbers only)
  if (IS_DEPLOYED) {
    getStats().then((s) => {
      if (s.spots < BIG_STAT_MIN) return;
      const sec = $("[data-bigstat]", root);
      sec.hidden = false;
      const n = $("[data-bigstat-n]", sec);
      if (window.ScrollTrigger && !R) ScrollTrigger.create({ trigger: sec, start: "top 80%", once: true, onEnter: () => tween(n, s.spots, { duration: 2 }) });
      else n.textContent = fmt(s.spots);
      window.ScrollTrigger?.refresh();
    }).catch(() => {});
    if (STORY.listId != null) {
      getList(STORY.listId).then(async (l) => {
        const r = rank(l, await loadMembers(l.id, l.count));
        const fromInvites = r.rows.filter((x) => x.referrer && !/^0x0{40}$/i.test(x.referrer)).length;
        $("[data-story-title]", root).textContent = `${l.icon} ${l.name}`;
        $('[data-story-n="count"]', root).textContent = fmt(l.count);
        $('[data-story-n="share"]', root).textContent = l.count ? `${Math.round((fromInvites / l.count) * 100)}%` : "0%";
        $('[data-story-n="top"]', root).textContent = fmt(r.inviters[0]?.refs || 0);
        $("[data-story-count]", root).textContent = `#${fmt(l.count)}`;
      }).catch(() => {});
    }
  }

  return () => stops.forEach((f) => f && f());
}

// ── hero device: Join · Invite · Climb ──
function runDemo(root) {
  const demo = $("[data-demo]", root);
  if (!demo) return;
  const keys = $$("[data-tab]", demo), panes = $$(".demo__pane", demo);
  const order = ["join", "invite", "climb"];
  const caps = { join: "Join with your wallet. You get a numbered ticket.", invite: "Share your link. Each friend who joins moves you up 5.", climb: "Your spot rolls down as friends join." };
  const titles = { join: "try joining a line", invite: "invite three friends", climb: "watch yourself climb" };
  let idx = 0, tl, cycle;
  const R = reduced();

  let left = 2 * 86400 + 14 * 3600 + 9 * 60;
  const timerEl = $("[data-demo-timer]", demo);
  const p2 = (n) => String(n).padStart(2, "0");
  const tick = () => { left = Math.max(0, left - 1); timerEl.textContent = `${p2(Math.floor(left / 86400))}:${p2(Math.floor((left % 86400) / 3600))}:${p2(Math.floor((left % 3600) / 60))}:${p2(left % 60)}`; };
  const timer = setInterval(tick, 1000); tick();

  const play = (name) => {
    tl?.kill();
    keys.forEach((t) => t.classList.toggle("is-on", t.dataset.tab === name));
    panes.forEach((p) => p.classList.toggle("is-on", p.dataset.pane === name));
    $("[data-dial-mode]", demo).textContent = name.toUpperCase();
    $("[data-demo-cap]", demo).textContent = caps[name];
    $("[data-demo-title]", demo).textContent = titles[name];
    const pane = $(`[data-pane="${name}"]`, demo);
    if (!window.gsap) return;
    tl = gsap.timeline();
    tl.fromTo($("[data-progress]", demo), { scaleX: 0 }, { scaleX: 1, duration: R ? 0.01 : 4.6, ease: "none" }, 0);
    if (R) return;
    tl.fromTo($("[data-dial]", demo), { rotate: -20 }, { rotate: 0, duration: 0.6, ease: "back.out(2)" }, 0);
    if (name === "join") {
      tl.fromTo($("[data-paper]", pane), { yPercent: -102 }, { yPercent: 0, duration: 1.4, ease: "steps(14)" }, 0.2)
        .fromTo($(".mini-ticket b", pane), { scale: 0.6, opacity: 0 }, { scale: 1, opacity: 1, duration: 0.5, ease: "back.out(2.5)" }, 1.5);
    } else if (name === "invite") {
      const copied = $("[data-copied]", pane);
      copied.textContent = "Copy";
      tl.fromTo($(".demo-invite__field", pane), { scale: 1 }, { scale: 0.97, duration: 0.12, yoyo: true, repeat: 1 }, 0.4)
        .add(() => (copied.textContent = "Copied ✓"), 0.5)
        .fromTo($$("[data-av]", pane), { scale: 0, opacity: 0 }, { scale: 1, opacity: 1, stagger: 0.3, duration: 0.45, ease: "back.out(3)" }, 0.9);
    } else if (name === "climb") {
      const lb = $("[data-lb]", pane), you = $('[data-row="you"]', lb), num = $("[data-you]", lb);
      lb.append(you); num.textContent = "#1,285";
      const o = { v: 1285 };
      tl.to(o, { v: 1270, duration: 1.2, ease: "power2.inOut", onUpdate: () => (num.textContent = `#${fmt(Math.round(o.v))}`) }, 0.5)
        .add(() => {
          if (!window.Flip) { lb.insertBefore(you, lb.children[2]); return; }
          const state = Flip.getState($$(".lb__row", lb));
          lb.insertBefore(you, lb.children[2]);
          Flip.from(state, { duration: 0.7, ease: "power3.inOut" });
        }, 1.8);
    }
  };
  const restart = () => { clearInterval(cycle); cycle = setInterval(() => { idx = (idx + 1) % order.length; play(order[idx]); }, 5000); };
  keys.forEach((t) => t.addEventListener("click", () => { idx = order.indexOf(t.dataset.tab); play(t.dataset.tab); restart(); }));
  play("join"); restart();
  return () => { clearInterval(cycle); clearInterval(timer); tl?.kill(); };
}

// ── scroll-pinned steps with a live console ──
function runSteps(root) {
  const sec = $("[data-steps]", root);
  const items = $$("[data-step]", sec), box = $("[data-console]", sec), title = $("[data-console-title]", sec);
  let cur = -1;
  const R = reduced();
  const render = (n) => {
    if (n === cur) return;
    cur = n;
    items.forEach((li, i) => { li.classList.toggle("is-on", i === n); li.classList.toggle("is-done", i < n); });
    title.textContent = n >= STEPS.length - 1 ? "launched" : n === 0 ? "creating" : "in line";
    box.innerHTML = STEPS.slice(0, n + 1).map((s, i) => `<div class="msg" data-msg="${i}">
        ${s.me ? `<p class="msg__me">${esc(s.me)}</p>` : ""}
        <div class="msg__log mono">${s.log.map((l, j) => `<span>${esc(l)}${j === 0 ? " ⌄" : ""}</span>`).join("")}</div>
        <p class="msg__say">${esc(s.say)}</p></div>`).join("");
    box.scrollTop = box.scrollHeight;
    const last = box.lastElementChild;
    if (window.gsap && !R && last) gsap.from(last.children, { y: 12, opacity: 0, stagger: 0.18, duration: 0.45, ease: "power2.out" });
  };
  items.forEach((li) => $("button", li).addEventListener("click", () => {
    const i = Number(li.dataset.step);
    if (st) { const y = st.start + (st.end - st.start) * ((i + 0.5) / STEPS.length); scrollTo({ top: y, behavior: R ? "auto" : "smooth" }); }
    else render(i);
  }));
  let st = null;
  if (window.ScrollTrigger && !R && matchMedia("(min-width: 901px)").matches) {
    sec.classList.add("is-pinned");
    st = ScrollTrigger.create({
      trigger: sec, start: "top top", end: "bottom bottom",
      onUpdate: (self) => render(Math.min(STEPS.length - 1, Math.floor(self.progress * STEPS.length))),
    });
  }
  render(st ? 0 : STEPS.length - 1);
  return () => st?.kill();
}

// ── converging lines: order + referrals + boost → your spot ──
function runFlow(root) {
  const stage = $("[data-flow]", root), canvas = $("[data-flow-canvas]", stage), node = $("[data-flow-node]", stage);
  const ctx = canvas.getContext("2d");
  const R = reduced();
  let mode = 0, raf, t0 = performance.now(), w = 0, h = 0, visible = true;
  const labels = ["Your spot", "Your spot, moving up", "Your spot, but higher"];
  const bundles = [
    { y: 0.18, n: 14, spread: 0.11, xs: 0.08 },
    { y: 0.5, n: 6, spread: 0.05, xs: 0.06 },
    { y: 0.82, n: 14, spread: 0.11, xs: 0.1 },
  ];
  const size = () => {
    const r = stage.getBoundingClientRect(), dpr = Math.min(2, devicePixelRatio || 1);
    w = r.width; h = r.height;
    canvas.width = w * dpr; canvas.height = h * dpr;
    canvas.style.width = w + "px"; canvas.style.height = h + "px";
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  };
  const endX = () => w * 0.74, endY = () => h * 0.55;
  const draw = (now) => {
    ctx.clearRect(0, 0, w, h);
    const t = (now - t0) / 1000;
    bundles.forEach((b, bi) => {
      const hot = (mode === 0 && bi === 0) || (mode === 1 && bi === 1) || (mode === 2);
      for (let i = 0; i < b.n; i++) {
        const k = i / Math.max(1, b.n - 1) - 0.5;
        const sx = w * (b.xs + (i % 3) * 0.012), sy = h * (b.y + k * b.spread);
        const mx = w * 0.38, my = h * (b.y + k * b.spread * 0.15);
        ctx.beginPath();
        ctx.moveTo(sx, sy);
        ctx.bezierCurveTo(mx, my, w * 0.52, endY(), endX(), endY());
        ctx.strokeStyle = hot ? `rgba(198,255,61,${0.12 + 0.25 * (1 - Math.abs(k))})` : `rgba(244,242,248,${0.06 + 0.14 * (1 - Math.abs(k))})`;
        ctx.lineWidth = 1;
        ctx.stroke();
        ctx.fillStyle = hot ? "rgba(198,255,61,.9)" : "rgba(244,242,248,.7)";
        ctx.fillRect(sx - 1.5, sy - 1.5, 3, 3);
        if (!R && i % 3 === 0) {
          const p = (t * 0.25 + i * 0.07 + bi * 0.21) % 1;
          const x = bez(sx, mx, w * 0.52, endX(), p), y = bez(sy, my, endY(), endY(), p);
          ctx.fillStyle = hot ? "rgba(198,255,61,.95)" : "rgba(244,242,248,.5)";
          ctx.beginPath(); ctx.arc(x, y, 1.6, 0, 7); ctx.fill();
        }
      }
    });
    node.style.left = endX() + "px"; node.style.top = endY() + "px";
    if (!R && visible) raf = requestAnimationFrame(draw);
  };
  size();
  const ro = new ResizeObserver(() => { size(); if (R) draw(performance.now()); });
  ro.observe(stage);
  const io = new IntersectionObserver(([e]) => { visible = e.isIntersecting; cancelAnimationFrame(raf); if (visible || R) raf = requestAnimationFrame(draw); });
  io.observe(stage);
  $$("[data-flow-mode]", root).forEach((b) => b.addEventListener("click", () => {
    mode = Number(b.dataset.flowMode);
    $$("[data-flow-mode]", root).forEach((x) => x.classList.toggle("is-on", x === b));
    node.textContent = labels[mode];
    node.classList.toggle("is-hot", mode > 0);
    if (R) draw(performance.now());
  }));
  raf = requestAnimationFrame(draw);
  return () => { cancelAnimationFrame(raf); ro.disconnect(); io.disconnect(); };
}
const bez = (a, b, c, d, t) => { const u = 1 - t; return u * u * u * a + 3 * u * u * t * b + 3 * u * t * t * c + t * t * t * d; };

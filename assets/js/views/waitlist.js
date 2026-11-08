// "/w/:id" — public waitlist page.
import { IS_DEPLOYED, MIN_BALANCE_BOT, LINKS, NET } from "../config.js";
import { $, $$, esc, fmt, short, shorter, isAddr, sameAddr, copy, toast, absUrl, url, clean, countdownHTML, reduced, avatar, timeAgo, tween } from "../util.js";
import { coverStyle, ticketHTML, showInstall, panelHead, panelFoot } from "../ui.js";
import { wallet, onWallet, connect, ensureChain, onRightChain, getList, watchList, rank, txJoin, friendlyError, getBalance, loadMembers } from "../chain.js";

export function view([idStr]) {
  return {
    title: `Waitlist #${idStr}`,
    html: `<div class="wlpage wrap" data-wlpage><div class="wl wl--page skeleton"><div class="wl__cover"></div><div class="wl__body"><div class="sk sk--h"></div><div class="sk"></div><div class="sk sk--btn"></div></div></div></div>`,
    mount: (root) => mount(root, Number(idStr)),
  };
}

function notFound(root, extra = "") {
  $("[data-wlpage]", root).innerHTML = `<div class="empty panel"><span class="big-emoji">🎟️</span><h1 class="h2 px">Waitlist not found</h1><p class="muted">${extra || "This line doesn't exist (yet). Check the link, or make your own."}</p><a class="btn btn--lime" href="${url("/app/new")}" data-link>Create a waitlist</a></div>`;
}

async function mount(root, id) {
  if (!IS_DEPLOYED) { notFound(root, "The Lineup contract isn't deployed on this network yet."); return; }
  let list;
  try { list = await getList(id); }
  catch (e) { notFound(root, e.code === "NOT_FOUND" ? "" : "Couldn't reach BOT Chain right now. Try again in a moment."); return; }

  const refParam = new URLSearchParams(location.search).get("ref") || "";
  const ref = isAddr(refParam) ? refParam : "";
  const state = { list, members: { who: [], referrer: [], at: [] }, ranked: null, busy: false, justJoined: false, refNote: "" };
  document.title = `${list.name} · Lineup`;

  const page = $("[data-wlpage]", root);
  page.innerHTML = `
  <div class="refbanner" data-refbanner hidden></div>
  <article class="wl wl--page" style="${coverStyle(list.color)}">
    <div class="wl__cover"><span class="wl__icon">${esc(list.icon || "🚀")}</span>${list.closed ? `<span class="wl__badge">Launched 🎉</span>` : ""}</div>
    <div class="wl__body">
      <span class="eyebrow">Waitlist #${id}</span>
      <h1 class="wl__name px">${esc(clean(list.name))}</h1>
      ${list.pitch ? `<p class="wl__pitch">${esc(clean(list.pitch))}</p>` : ""}
      <div data-countdown="${list.launchAt}" data-closed="${list.closed ? 1 : 0}">${countdownHTML(list.launchAt, list.closed)}</div>
      <p class="wl__count"><b class="mono" data-counter>${fmt(list.count)}</b> <span data-people>${list.count === 1 ? "person" : "people"}</span> in line${list.maxSpots ? ` <span class="muted">/ ${fmt(list.maxSpots)} spots</span>` : ""}</p>
      ${list.reward ? `<p class="wl__reward">🎁 ${esc(clean(list.reward))}</p>` : ""}
      <div class="wl__action" data-action></div>
    </div>
    ${panelFoot(`LINEUP · #${id}`, list.closed ? "FINAL" : "LIVE")}
  </article>
  <p class="honest">Spots are wallet-based. Lineup is for fun and early access, not money. · Up ${list.boost} per friend, max ${list.cap} counted${list.minBalance ? ` · hold ≥ ${MIN_BALANCE_BOT} BOT to join` : ""}</p>
  <div class="ticker" data-ticker aria-label="Recent joins"><div class="ticker__track" data-track></div></div>
  <div class="wl__below">
    <section class="panel">
      ${panelHead("top inviters", "TOP 10")}
      <ol class="lb panel__pad" data-lb><li class="muted small">No invites yet — be the first to share.</li></ol>
    </section>
    <section class="panel">
      ${panelHead("recent joins", "LIVE FEED")}
      <ul class="recent panel__pad" data-recent><li class="muted small">Nobody yet. Be #1.</li></ul>
    </section>
  </div>
  <p class="wl__meta muted small">Waitlist #${id} · created by <a class="mono" href="${NET.scan}/address/${list.creator}" target="_blank" rel="noopener">${short(list.creator)}</a> · <a href="${LINKS.report}?title=${encodeURIComponent(`Report waitlist #${id}`)}" target="_blank" rel="noopener">Report</a></p>
  <div class="sticky-cta" data-sticky></div>`;

  const action = $("[data-action]", page), sticky = $("[data-sticky]", page);

  const me = () => state.ranked?.find(wallet.account);
  const inviteUrl = () => absUrl(`/w/${id}?ref=${wallet.account}`);

  function renderBanner() {
    const b = $("[data-refbanner]", page);
    const inList = ref && state.ranked?.find(ref);
    const self = ref && sameAddr(ref, wallet.account);
    if (ref && inList && !self && !me()) {
      b.hidden = false;
      b.innerHTML = `${avatar(ref)} Invited by <b class="mono">${shorter(ref)}</b> — you'll help them move up`;
    } else b.hidden = true;
  }

  function renderAction() {
    const l = state.list, m = me();
    sticky.innerHTML = "";
    if (state.busy) return; // printing animation owns the area
    if (m) {
      action.innerHTML = ticketHTML({ name: l.name, rank: m.rank, addr: wallet.account, inviteUrl: inviteUrl(), friends: m.refs, boost: l.boost, color: l.color, closed: l.closed })
        + (state.refNote ? `<p class="note">${state.refNote}</p>` : "")
        + `<p class="muted small center">Join #${fmt(m.joinNo)} · ${m.counted} friend${m.counted === 1 ? "" : "s"} counted${l.closed ? " · final" : ""}</p>`;
      bindTicket(action);
      if (!l.closed) sticky.innerHTML = `<button class="btn btn--lime btn--block" data-sticky-copy>Copy invite link</button>`;
      $("[data-sticky-copy]", sticky)?.addEventListener("click", () => copy(inviteUrl(), "Invite link copied"));
      return;
    }
    if (l.closed) { action.innerHTML = `<div class="state">This line is closed — positions are final.</div>`; return; }
    if (l.maxSpots && l.count >= l.maxSpots) { action.innerHTML = `<div class="state">This line is full</div>`; return; }
    const label = !window.ethereum ? "Join the line" : !wallet.account ? "Join the line" : !onRightChain() ? "Switch to BOT Chain" : "Join the line";
    action.innerHTML = `<button class="btn btn--lime btn--lg btn--block" data-join>${label}</button><p class="form__err" data-join-err role="alert"></p>`;
    sticky.innerHTML = `<button class="btn btn--lime btn--block" data-join>${label}</button>`;
    $$("[data-join]", page).forEach((b) => b.addEventListener("click", join));
  }

  function bindTicket(scope) {
    const inner = $("[data-ticket-inner]", scope);
    $("[data-copy-invite]", scope)?.addEventListener("click", () => copy(inviteUrl(), "Invite link copied"));
    $$("[data-flip]", scope).forEach((b) => b.addEventListener("click", () => {
      const flipped = inner.classList.toggle("is-flipped");
      if (window.gsap && !reduced()) gsap.to(inner, { rotationY: flipped ? 180 : 0, duration: 0.7, ease: "power3.inOut" });
      else inner.style.transform = flipped ? "rotateY(180deg)" : "";
    }));
  }

  async function join() {
    const errEl = $("[data-join-err]", page);
    const say = (t) => { if (errEl) errEl.innerHTML = t; else toast(t, "err"); };
    try {
      if (!window.ethereum) { showInstall(); return; }
      if (!wallet.account) await connect();
      if (!onRightChain()) await ensureChain();
      if (me()) { renderAction(); return; }
      if (state.list.minBalance) {
        const bal = await getBalance(wallet.account);
        if (bal < window.ethers.parseEther(MIN_BALANCE_BOT)) {
          say(`Hold at least ${MIN_BALANCE_BOT} BOT to join. <a href="${LINKS.getBot}" target="_blank" rel="noopener">How to get BOT ↗</a>`);
          return;
        }
      }
      // validate referrer client-side (the contract ignores bad ones anyway)
      let useRef = "";
      if (ref) {
        if (sameAddr(ref, wallet.account)) state.refNote = "You can't refer yourself — joined without a referral.";
        else useRef = ref; // the contract checks the referrer is already in this line
      } else if (refParam) state.refNote = "That invite link looks broken — joined without a referral.";

      state.busy = true;
      printing(action);
      sticky.innerHTML = "";
      const res = await txJoin(id, useRef);
      if (useRef && !res.refAccepted) state.refNote = "That invite link's owner isn't in this line — joined without a referral.";
      state.justJoined = true;
      // refresh members now
      state.list = await getList(id);
      state.members = await loadMembers(id, state.list.count);
      state.ranked = rank(state.list, state.members);
      state.busy = false;
      renderAll();
      celebrate(action);
    } catch (e) {
      state.busy = false;
      if (e.code === "NO_WALLET") { showInstall(); return; }
      renderAction();
      const m = friendlyError(e);
      const el = $("[data-join-err]", page);
      if (el) el.innerHTML = `${esc(m)}${/rejected|failed/i.test(m) ? " — try again." : ""}`;
      else toast(m, "err");
    }
  }

  function renderBoards() {
    const r = state.ranked;
    const lb = $("[data-lb]", page);
    if (r.inviters.length) {
      lb.innerHTML = r.inviters.slice(0, 10).map((x, i) => `<li class="lb__row ${sameAddr(x.addr, wallet.account) ? "is-you" : ""}">
        <span class="lb__pos mono">${i + 1}</span>${avatar(x.addr)}<span class="mono">${shorter(x.addr)}</span>
        <span class="lb__refs">${x.refs} friend${x.refs === 1 ? "" : "s"}</span><b class="mono">#${fmt(x.rank)}</b></li>`).join("");
    }
    const latest = [...r.rows].reverse().slice(0, 8);
    if (latest.length) {
      $("[data-recent]", page).innerHTML = latest.map((x) => `<li>${avatar(x.addr)}<span class="mono">${shorter(x.addr)}</span><span class="muted small">joined #${fmt(x.joinNo)}${x.referrer && !/^0x0{40}$/i.test(x.referrer) ? " via invite" : ""}</span><span class="muted small">${timeAgo(x.at)}</span></li>`).join("");
    }
    const ticker = [...r.rows].reverse().slice(0, 14);
    const track = $("[data-track]", page);
    if (ticker.length) {
      const items = ticker.map((x) => `<span class="ticker__item">${avatar(x.addr)}<span class="mono">${shorter(x.addr)}</span> got in line</span>`).join("");
      track.innerHTML = items + items;
      if (window.gsap && !reduced()) {
        gsap.killTweensOf(track);
        gsap.fromTo(track, { xPercent: 0 }, { xPercent: -50, duration: Math.max(18, ticker.length * 3), ease: "none", repeat: -1 });
      }
    }
  }

  let lastCount = list.count;
  function renderAll() {
    const c = $("[data-counter]", page);
    if (state.list.count !== lastCount) { tween(c, state.list.count, { from: lastCount, duration: 0.8 }); lastCount = state.list.count; }
    $("[data-people]", page).textContent = state.list.count === 1 ? "person" : "people";
    if (state.list.closed && !$(".wl__badge", page)) {
      $(".wl__cover", page).insertAdjacentHTML("beforeend", `<span class="wl__badge">Launched 🎉</span>`);
      const cd = $("[data-countdown]", page); cd.dataset.closed = "1";
    }
    renderBanner();
    renderBoards();
    if (!state.busy) {
      // keep the ticket stable if only numbers changed
      const m = me();
      const spot = $("[data-spot]", action), friends = $("[data-friends]", action);
      if (m && spot && !state.justJoined) {
        const n = `#${fmt(m.rank)}`;
        if (spot.textContent !== n) { spot.textContent = n; if (window.gsap && !reduced()) gsap.fromTo(spot, { y: -10, opacity: 0.4 }, { y: 0, opacity: 1, duration: 0.4 }); }
        if (friends) friends.textContent = fmt(m.refs);
      } else renderAction();
      state.justJoined = false;
    }
  }

  const stopWatch = watchList(id, (l, m) => {
    state.list = l; state.members = m; state.ranked = rank(l, m);
    renderAll();
  });
  state.ranked = rank(list, state.members);
  renderAction();
  const offWallet = onWallet(() => { if (state.ranked) { renderBanner(); renderAction(); renderBoards(); } });

  if (window.gsap && !reduced()) gsap.from($(".wl--page", page), { y: 24, opacity: 0, duration: 0.6, ease: "power3.out" });

  return () => { stopWatch(); offWallet(); gsap?.killTweensOf($("[data-track]", page)); };
}

function printing(action) {
  action.innerHTML = `<div class="printer printer--big"><div class="printer__slot"></div>
    <div class="printer__paper" data-paper><div class="mini-ticket mini-ticket--big"><span class="mono muted">PRINTING YOUR SPOT…</span><b class="mono">#····</b><div class="mini-ticket__tear"></div><span class="mini-ticket__bar"></span></div></div></div>
    <p class="muted small center">Confirm in your wallet, then BOT Chain records your spot.</p>`;
  if (window.gsap && !reduced()) gsap.fromTo($("[data-paper]", action), { yPercent: -100 }, { yPercent: -10, duration: 2.4, ease: "steps(20)", repeat: -1, yoyo: true });
}

function celebrate(action) {
  const t = $("[data-ticket]", action);
  if (!t || !window.gsap || reduced()) return;
  const foot = $(".ticket__foot", t), inner = $("[data-ticket-inner]", t);
  gsap.timeline()
    .from(t, { y: -40, opacity: 0, duration: 0.5, ease: "power3.out" })
    .from($("[data-spot]", t), { scale: 0.5, opacity: 0, duration: 0.6, ease: "back.out(2.4)" }, "-=0.2")
    .to(foot, { rotation: 5, y: 10, transformOrigin: "0% 0%", duration: 0.35, ease: "power2.out" }, "+=0.5")
    .to(foot, { rotation: 0, y: 0, duration: 0.3, ease: "power2.inOut" })
    .add(() => inner.classList.add("is-flipped"))
    .to(inner, { rotationY: 180, duration: 0.8, ease: "power3.inOut" }, "+=0.2");
}

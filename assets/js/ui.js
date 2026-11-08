// Shared UI pieces: logo, navs, wallet button, footer ticket, waitlist card, ticket card.
import { NET, NETWORKS, MAINNET_CONTRACT_ADDRESS, CONTRACT_EXPLORER_URL, LINKS, COLORS, IS_DEPLOYED } from "./config.js";
import { esc, short, fmt, barcodeSVG, $, $$, copy, toast, url, clean, countdownHTML } from "./util.js";
import { wallet, connect, ensureChain, onWallet, onRightChain, friendlyError, getStats } from "./chain.js";

export const logo = (href = "/") => `<a class="logo" href="${url(href)}" data-link aria-label="Lineup home">lineup</a>`;

export function walletBtn(cls = "btn btn--ghost btn--sm") {
  return `<button class="${cls}" data-wallet-btn type="button">Connect wallet</button>`;
}

/** One nav for every page: wordmark left, frosted pill right. */
export function siteNav() {
  const links = [["/#how", "How it works"], ["/#rules", "Ranking"], ["/#faq", "FAQ"], ["/app/me", "My lines"]];
  return `<header class="nav" data-nav>
    ${logo("/")}
    <div class="nav__pill">
      <nav class="nav__links" aria-label="Main">
        ${links.map(([h, t]) => `<a class="nav__link" href="${url(h)}" data-link>${t}</a>`).join("")}
      </nav>
      ${NET.key === "testnet" ? `<span class="pill pill--warn nav__net">Testnet</span>` : ""}
      ${walletBtn("nav__wallet")}
      <a class="nav__cta" href="${url("/app/new")}" data-link>Create a waitlist</a>
      <button class="nav__burger" type="button" aria-label="Menu" aria-expanded="false" data-burger><span></span><span></span></button>
    </div>
    <div class="nav__mobile" data-mobile-menu hidden>
      <a href="${url("/app/new")}" data-link>Create a waitlist</a>
      ${links.map(([h, t]) => `<a href="${url(h)}" data-link>${t}</a>`).join("")}
    </div>
  </header>`;
}
export const appNav = siteNav;

export function railHTML(active = "") {
  return `<aside class="rail">
    <span class="rail__label mono">Workspace</span>
    <a class="rail__item ${active === "me" ? "is-active" : ""}" href="${url("/app/me")}" data-link><span class="mono">01</span> My lines</a>
    <a class="rail__item ${active === "new" ? "is-active" : ""}" href="${url("/app/new")}" data-link><span class="mono">02</span> New waitlist</a>
    <div class="rail__note">
      <span class="eyebrow">Network</span>
      <p class="mono">${esc(NET.chainName)}<br>chain ID ${NET.chainId}</p>
    </div>
  </aside>`;
}

/** Giga-style console panel: pixel title bar on top, hardware strip below. */
export function panelHead(title, meta = "") {
  return `<div class="panel__head"><span class="px panel__title">${title}</span>${meta ? `<span class="mono panel__meta">${meta}</span>` : ""}</div>`;
}
export function panelFoot(left = "LINEUP", right = "LIVE") {
  return `<div class="panel__foot"><span class="screw"></span><span class="mono">${left}</span><span class="panel__mode mono"><i></i>${right}</span><span class="dots" aria-hidden="true"></span></div>`;
}

/** Keeps every [data-wallet-btn] in sync with the wallet state. */
export function bindWalletButtons(root = document) {
  const render = () =>
    $$("[data-wallet-btn]", root).forEach((b) => {
      b.classList.remove("is-wrong", "is-on");
      if (!wallet.account) b.textContent = "Connect wallet";
      else if (!onRightChain()) { b.textContent = "Switch to BOT Chain"; b.classList.add("is-wrong"); }
      else { b.innerHTML = `<span class="dot"></span>${short(wallet.account)}`; b.classList.add("is-on"); }
    });
  $$("[data-wallet-btn]", root).forEach((b) =>
    b.addEventListener("click", async () => {
      try {
        if (!wallet.account) await connect();
        else if (!onRightChain()) await ensureChain();
        else { copy(wallet.account, "Address copied"); }
      } catch (e) { if (e.code === "NO_WALLET") showInstall(); else toast(friendlyError(e), "err"); }
    })
  );
  render();
  return onWallet(render);
}

export function showInstall() {
  modal(`<h3>Install MetaMask</h3>
    <p class="muted">You can look at any waitlist without a wallet. To join or create one you'll need MetaMask (or another browser wallet) on BOT Chain.</p>
    <div class="row gap"><a class="btn btn--primary" href="https://metamask.io/download/" target="_blank" rel="noopener">Get MetaMask ↗</a><button class="btn btn--ghost" data-close>Not now</button></div>`);
}

export function modal(html) {
  const m = document.createElement("div");
  m.className = "modal";
  m.innerHTML = `<div class="modal__card" role="dialog" aria-modal="true">${html}</div>`;
  const close = () => m.remove();
  m.addEventListener("click", (e) => { if (e.target === m || e.target.closest("[data-close]")) close(); });
  addEventListener("keydown", function k(e) { if (e.key === "Escape") { close(); removeEventListener("keydown", k); } });
  document.body.append(m);
  if (window.gsap) gsap.from(m.firstElementChild, { y: 20, opacity: 0, duration: 0.3 });
  return { el: m, close };
}

// ── BOT Chain logo (official mark) ──
const BOT_LOGO = `<img class="botlogo" src="assets/img/botchain-mark.png" alt="" width="168" height="264"><span class="botlogo__txt"><small class="mono">Built on</small>BOT Chain</span>`;

export function footer() {
  const addr = MAINNET_CONTRACT_ADDRESS;
  const shortAddr = `${addr.slice(0, 6)}…${addr.slice(-4)}`;
  return `<footer class="foot">
    <div class="wrap">
      <div class="fticket" data-fticket>
        <div class="fticket__stub">
          <span class="fticket__admit">ADMIT <br>ONE</span>
          <span class="fticket__no mono">No. 677</span>
        </div>
        <div class="fticket__main">
          <div class="fticket__top">
            <p class="fticket__lead">Every spot is recorded on <b>BOT Chain</b></p>
            <a class="fticket__bot" href="${LINKS.botchain}" target="_blank" rel="noopener" aria-label="BOT Chain — botchain.ai (opens in new tab)">${BOT_LOGO}</a>
          </div>
          <div class="fticket__mid">
            <button class="fticket__addr mono" type="button" data-copy="${addr}" title="Copy contract address">chain ID ${NETWORKS.mainnet.chainId} · ${shortAddr} <span aria-hidden="true">⧉</span></button>
            <a class="btn btn--primary btn--sm" href="${CONTRACT_EXPLORER_URL}" target="_blank" rel="noopener">View on explorer ↗</a>
          </div>
          <div class="fticket__bottom">
            ${barcodeSVG(addr, { height: 36, className: "barcode barcode--foot" })}
            <span class="fticket__live mono">LINES <b data-stat-lines>—</b> · SPOTS <b data-stat-spots>—</b></span>
          </div>
        </div>
      </div>

      <div class="fcols">
        <div class="fcols__brand">${logo("/")}
          <span class="fcols__ok mono"><i></i>On-chain</span>
          <div class="fbadges" aria-label="Contract facts"><span class="mono">677<small>CHAIN</small></span><span class="mono">EVM<small>PARIS</small></span><span class="mono">0.8<small>SOLC</small></span><span class="mono">MIT<small>LICENSE</small></span></div>
          <div class="fsocial"><a href="${LINKS.x}" target="_blank" rel="noopener" aria-label="X">𝕏</a><span></span><a href="${LINKS.github}" target="_blank" rel="noopener" aria-label="GitHub">GH</a></div>
        </div>
        <div><h4>Product</h4><a href="${url("/app/new")}" data-link>Create a waitlist</a><a href="${url("/#preview")}" data-link>Examples</a><a href="${url("/app/me")}" data-link>My lines</a></div>
        <div><h4>Resources</h4><a href="${url("/#ranking")}" data-link>How ranking works</a><a href="${url("/#faq")}" data-link>FAQ</a><a href="${LINKS.botchainDocs}" target="_blank" rel="noopener">BOT Chain docs</a></div>
        <div><h4>Company</h4><a href="${LINKS.github}" target="_blank" rel="noopener">GitHub</a><a href="${LINKS.x}" target="_blank" rel="noopener">X</a></div>
      </div>
      <div class="fbottom">
        <nav class="flegal"><a href="${url("/privacy")}" data-link>Privacy</a><a href="${url("/terms")}" data-link>Terms</a><a href="${LINKS.report}" target="_blank" rel="noopener">Report a waitlist</a></nav>
        <span>© 2026 Lineup · wallet-based spots — for fun and early access${NET.key === "testnet" ? " · testnet mode" : ""}${IS_DEPLOYED ? "" : " · contract not deployed yet"}</span>
      </div>
    </div>
  </footer>`;
}

export function bindFooter(root = document) {
  $$("[data-copy]", root).forEach((b) => b.addEventListener("click", () => copy(b.dataset.copy, "Contract address copied")));
  getStats()
    .then((s) => {
      $$("[data-stat-lines]", root).forEach((e) => (e.textContent = fmt(s.lists)));
      $$("[data-stat-spots]", root).forEach((e) => (e.textContent = fmt(s.spots)));
    })
    .catch(() => {});
}

// ── waitlist cover card (used for previews and the public page header) ──
export function coverStyle(color) {
  const c = COLORS[color] || COLORS[0];
  return `--cover:${c.hex};--cover-ink:${c.ink}`;
}

export function previewCard(l, { count = 0, note = "" } = {}) {
  return `<div class="wl wl--preview" style="${coverStyle(l.color)}">
    <div class="wl__cover"><span class="wl__icon">${esc(l.icon || "🚀")}</span></div>
    <div class="wl__body">
      <h3 class="wl__name">${esc(clean(l.name) || "Your product")}</h3>
      <p class="wl__pitch">${esc(clean(l.pitch) || "One line about what you're launching.")}</p>
      <div data-countdown="${l.launchAt}">${countdownHTML(l.launchAt)}</div>
      <p class="wl__count"><b class="mono">${fmt(count)}</b> in line${count ? "" : " — be the first"}</p>
      ${l.reward ? `<p class="wl__reward">🎁 ${esc(clean(l.reward))}</p>` : ""}
      <button class="btn btn--primary btn--block" type="button" tabindex="-1">Join the line</button>
      ${note ? `<p class="wl__note">${note}</p>` : ""}
    </div>
  </div>`;
}

// ── perforated ticket ──
export function ticketHTML({ name, rank, addr, inviteUrl, friends = 0, boost = 5, color = 0, closed = false }) {
  return `<div class="ticket" style="${coverStyle(color)}" data-ticket>
    <div class="ticket__inner" data-ticket-inner>
      <div class="ticket__face ticket__front">
        <div class="ticket__head">
          <span class="eyebrow">${esc(clean(name))}</span>
          <span class="mono muted">${closed ? "FINAL" : "ADMIT ONE"}</span>
        </div>
        <div class="ticket__spot">
          <span class="ticket__label">${closed ? "Your final spot" : "You're"}</span>
          <span class="ticket__num mono" data-spot>#${fmt(rank)}</span>
        </div>
        <div class="ticket__tear" aria-hidden="true"></div>
        <div class="ticket__foot">
          ${barcodeSVG(addr, { height: 40, className: "barcode barcode--ticket" })}
          <span class="mono muted">${short(addr)}</span>
        </div>
        <button class="ticket__flip ticket__flip--front" type="button" data-flip>Invite friends ↻</button>
      </div>
      <div class="ticket__face ticket__back">
        <span class="eyebrow eyebrow--lilac">Invite friends to move up ${boost} spot${boost === 1 ? "" : "s"} each</span>
        <div class="invite">
          <input class="invite__input mono" readonly value="${esc(inviteUrl)}" aria-label="Your invite link">
          <button class="btn btn--primary btn--sm" type="button" data-copy-invite>Copy</button>
        </div>
        <div class="share">
          <a class="share__btn" target="_blank" rel="noopener" href="https://x.com/intent/post?text=${encodeURIComponent(`I'm in line for ${name} — join with my link and help me move up 🎟️`)}&url=${encodeURIComponent(inviteUrl)}">X</a>
          <a class="share__btn" target="_blank" rel="noopener" href="https://t.me/share/url?url=${encodeURIComponent(inviteUrl)}&text=${encodeURIComponent(`Join ${name} with my link`)}">Telegram</a>
          <a class="share__btn" target="_blank" rel="noopener" href="https://wa.me/?text=${encodeURIComponent(`Join ${name} with my link: ${inviteUrl}`)}">WhatsApp</a>
        </div>
        <p class="ticket__friends">Friends who joined: <b class="mono" data-friends>${fmt(friends)}</b></p>
        <button class="ticket__flip" type="button" data-flip>↺ Show ticket</button>
      </div>
    </div>
  </div>`;
}

// "/app/me" — waitlists you created + waitlists you joined (with your spot).
import { IS_DEPLOYED } from "../config.js";
import { $, esc, fmt, url, clean, countdownHTML, reduced } from "../util.js";
import { railHTML, coverStyle, showInstall } from "../ui.js";
import { wallet, onWallet, connect, listsOf, getList, loadMembers, rank, friendlyError } from "../chain.js";

export function view() {
  return {
    title: "My lines",
    html: `<div class="appgrid">${railHTML("me")}<div class="appmain" data-me></div></div>`,
    mount,
  };
}

function card(l, extra, href) {
  return `<a class="linecard" href="${url(href)}" data-link style="${coverStyle(l.color)}">
    <span class="linecard__icon">${esc(l.icon || "🚀")}</span>
    <div class="linecard__body"><b>${esc(clean(l.name))}</b><span class="muted small">${fmt(l.count)} in line</span>
    <div class="linecard__cd" data-countdown="${l.launchAt}" data-closed="${l.closed ? 1 : 0}">${countdownHTML(l.launchAt, l.closed)}</div></div>
    ${extra}
  </a>`;
}

async function mount(root) {
  const box = $("[data-me]", root);
  let seq = 0;
  const render = async () => {
    const my = ++seq;
    if (!wallet.account) {
      box.innerHTML = `<div class="empty panel"><span class="big-emoji">🎟️</span><h1 class="h2 px">My lines</h1><p class="muted">Connect your wallet to see the waitlists you created and the lines you're in.</p><button class="btn btn--primary" data-conn>Connect wallet</button></div>`;
      $("[data-conn]", box).onclick = async () => { try { await connect(); } catch (e) { e.code === "NO_WALLET" ? showInstall() : null; } };
      return;
    }
    if (!IS_DEPLOYED) { box.innerHTML = `<div class="empty panel"><h1 class="h2 px">My lines</h1><p class="muted">The contract isn't deployed on this network yet.</p></div>`; return; }
    box.innerHTML = `<h1 class="h2 px">My lines</h1><p class="muted">Loading from BOT Chain…</p>`;
    try {
      const { created, joined } = await listsOf(wallet.account);
      const ids = [...new Set([...created, ...joined])];
      const lists = new Map(await Promise.all(ids.map(async (i) => [i, await getList(i)])));
      const joinedCards = await Promise.all(joined.slice().reverse().map(async (i) => {
        const l = lists.get(i);
        const r = rank(l, await loadMembers(i, l.count));
        const me = r.find(wallet.account);
        return card(l, `<span class="linecard__spot mono">#${fmt(me?.rank || 0)}</span>`, `/w/${i}`);
      }));
      if (my !== seq) return;
      box.innerHTML = `
        <div class="row between"><h1 class="h2 px">My lines</h1><a class="btn btn--primary btn--sm" href="${url("/app/new")}" data-link>＋ New waitlist</a></div>
        <span class="eyebrow">Created by you</span>
        <div class="linegrid">${created.slice().reverse().map((i) => card(lists.get(i), `<span class="linecard__go">Dashboard →</span>`, `/app/w/${i}`)).join("") || `<p class="muted">Nothing yet. <a href="${url("/app/new")}" data-link>Create your first waitlist →</a></p>`}</div>
        <span class="eyebrow">Lines you're in</span>
        <div class="linegrid">${joinedCards.join("") || `<p class="muted">You haven't joined any lines yet.</p>`}</div>`;
      if (window.gsap && !reduced()) gsap.from(box.querySelectorAll(".linecard"), { y: 16, opacity: 0, stagger: 0.05, duration: 0.5 });
    } catch (e) {
      if (my === seq) box.innerHTML = `<div class="empty panel"><h1 class="h2 px">My lines</h1><p class="muted">${esc(friendlyError(e))}</p></div>`;
    }
  };
  render();
  return onWallet(render);
}

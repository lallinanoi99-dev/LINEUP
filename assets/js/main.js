// Tiny router for the single-page site.
import { BASE, EMBED, $, startCountdowns, reduced } from "./util.js";
import { initWallet } from "./chain.js";
import { siteNav, footer, bindWalletButtons, bindFooter } from "./ui.js";
import * as home from "./views/home.js";
import * as create from "./views/create.js";
import * as waitlist from "./views/waitlist.js";
import * as dashboard from "./views/dashboard.js";
import * as me from "./views/me.js";
import * as pages from "./views/pages.js";

if (window.gsap) {
  gsap.registerPlugin(...[window.ScrollTrigger, window.SplitText, window.Flip].filter(Boolean));
  if (reduced()) gsap.globalTimeline.timeScale(20);
}

const routes = [
  [/^\/?$/, home.view, "site"],
  [/^\/app\/?$/, me.view, "app"],
  [/^\/app\/me\/?$/, me.view, "app"],
  [/^\/app\/new\/?$/, create.view, "app"],
  [/^\/app\/w\/(\d+)\/?$/, dashboard.view, "app"],
  [/^\/w\/(\d+)\/?$/, waitlist.view, "list"],
  [/^\/privacy\/?$/, pages.privacy, "site"],
  [/^\/terms\/?$/, pages.terms, "site"],
];

let cleanup = [];
const app = $("#app");

let memPath = "/", memHash = "";
function currentPath() {
  if (EMBED) return memPath;
  let p = location.pathname;
  if (BASE && p.startsWith(BASE)) p = p.slice(BASE.length);
  return p || "/";
}

async function render() {
  cleanup.forEach((fn) => { try { fn(); } catch {} });
  cleanup = [];
  window.ScrollTrigger?.getAll().forEach((t) => t.kill());

  const path = currentPath();
  let match = null, view = pages.notFound, kind = "site";
  for (const [re, v, k] of routes) { const m = path.match(re); if (m) { match = m; view = v; kind = k; break; } }

  const v = view(match ? match.slice(1) : []);
  document.title = v.title ? `${v.title} · Lineup` : "Lineup — Get in line.";
  document.body.dataset.kind = kind;
  document.body.toggleAttribute("data-home", view === home.view);
  app.innerHTML = `${siteNav()}<main id="main" tabindex="-1">${v.html}</main>${footer()}`;

  cleanup.push(bindWalletButtons(app));
  bindFooter(app);
  bindNav();
  bindFooterTicket();
  startCountdowns();
  const c = await v.mount?.(app);
  if (typeof c === "function") cleanup.push(c);

  const hash = EMBED ? memHash : location.hash;
  if (hash) {
    const t = document.getElementById(hash.slice(1));
    if (t) setTimeout(() => t.scrollIntoView({ behavior: reduced() ? "auto" : "smooth" }), 60);
  } else window.scrollTo(0, 0);
  window.ScrollTrigger?.refresh();
}

export function navigate(to, { replace = false } = {}) {
  if (EMBED) {
    const [path, frag = ""] = to.split("#");
    const p = (path || memPath).split("?")[0] || "/";
    memHash = frag ? "#" + frag : "";
    if (p === memPath && frag) { document.getElementById(frag)?.scrollIntoView({ behavior: reduced() ? "auto" : "smooth" }); return; }
    memPath = p;
    render();
    return;
  }
  const u = new URL(to, location.href);
  const samePage = u.pathname === location.pathname && u.search === location.search;
  if (samePage && u.hash) {
    history.pushState({}, "", u);
    document.getElementById(u.hash.slice(1))?.scrollIntoView({ behavior: reduced() ? "auto" : "smooth" });
    return;
  }
  history[replace ? "replaceState" : "pushState"]({}, "", u);
  render();
}
window.lineupNavigate = navigate;

document.addEventListener("click", (e) => {
  const a = e.target.closest("a[data-link]");
  if (!a || e.metaKey || e.ctrlKey || e.shiftKey || a.target === "_blank") return;
  e.preventDefault();
  $("[data-mobile-menu]")?.setAttribute("hidden", "");
  navigate(a.getAttribute("href"));
});
addEventListener("popstate", render);

function bindNav() {
  const burger = $("[data-burger]"), menu = $("[data-mobile-menu]");
  burger?.addEventListener("click", () => {
    const open = menu.hasAttribute("hidden");
    menu.toggleAttribute("hidden", !open);
    burger.setAttribute("aria-expanded", String(open));
  });
  const nav = $("[data-nav]");
  const onScroll = () => nav?.classList.toggle("is-scrolled", scrollY > 8);
  addEventListener("scroll", onScroll, { passive: true });
  cleanup.push(() => removeEventListener("scroll", onScroll));
  onScroll();
}

function bindFooterTicket() {
  const t = $("[data-fticket]");
  if (!t || !window.gsap) return;
  const stub = $(".fticket__stub", t);
  t.addEventListener("mouseenter", () => !reduced() && gsap.to(stub, { rotate: -4, x: -6, transformOrigin: "100% 100%", duration: 0.35, ease: "back.out(2)" }));
  t.addEventListener("mouseleave", () => gsap.to(stub, { rotate: 0, x: 0, duration: 0.4, ease: "power2.out" }));
}

initWallet();
render();

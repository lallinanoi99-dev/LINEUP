// "/app/w/:id" — creator dashboard.
import { IS_DEPLOYED, COLORS } from "../config.js";
import { $, esc, fmt, short, shorter, sameAddr, toast, url, daysTo, download, toCSV, avatar, timeAgo, reduced, clean, tween, ZERO } from "../util.js";
import { railHTML, modal, panelHead } from "../ui.js";
import { wallet, onWallet, getList, watchList, rank, txClose, friendlyError } from "../chain.js";

export function view([idStr]) {
  return {
    title: `Dashboard #${idStr}`,
    html: `<div class="appgrid">${railHTML("")}<div class="appmain" data-dash><div class="sk sk--h"></div><div class="stats">${"<div class='stat sk-card'></div>".repeat(4)}</div></div></div>`,
    mount: (root) => mount(root, Number(idStr)),
  };
}

async function mount(root, id) {
  const box = $("[data-dash]", root);
  if (!IS_DEPLOYED) { box.innerHTML = `<div class="empty panel"><h1 class="h2 px">Waitlist not found</h1><p class="muted">The contract isn't deployed on this network yet.</p></div>`; return; }
  let list;
  try { list = await getList(id); }
  catch (e) { box.innerHTML = `<div class="empty panel"><span class="big-emoji">🎟️</span><h1 class="h2 px">Waitlist not found</h1><p class="muted">${e.code === "NOT_FOUND" ? "No waitlist with this number." : "Couldn't reach BOT Chain."}</p><a class="btn btn--lime" href="${url("/app/new")}" data-link>Create one</a></div>`; return; }

  const accent = COLORS[list.color]?.hex || "#C6FF3D";
  box.innerHTML = `
  <div class="dash__head">
    <div>
      <span class="eyebrow">Dashboard · #${id}</span>
      <h1 class="h2 px">${esc(clean(list.name))}</h1>
      <p class="muted" data-dash-status></p>
    </div>
    <div class="row gap-sm wrap-row">
      <a class="btn btn--ghost btn--sm" href="${url(`/w/${id}`)}" data-link>Open public page ↗</a>
      <button class="btn btn--lilac btn--sm" data-csv>Export CSV</button>
      <span data-close-slot></span>
    </div>
  </div>
  <div class="stats">
    <div class="stat"><span class="mono">Total in line</span><b class="px" data-s="total">0</b></div>
    <div class="stat"><span class="mono">Joined today</span><b class="px" data-s="today">0</b></div>
    <div class="stat"><span class="mono">Referral share</span><b class="px" data-s="share">0%</b></div>
    <div class="stat"><span class="mono">Days to launch</span><b class="px" data-s="days">${list.closed ? "—" : daysTo(list.launchAt)}</b></div>
  </div>
  <section class="panel chartcard">${panelHead("signups per day", `<span data-chart-sum></span>`)}<div class="chartbox panel__pad"><canvas data-chart aria-label="Signups per day"></canvas></div></section>
  <div class="dash__tables">
    <section class="panel">${panelHead("top 20 inviters", "BY FRIENDS")}<div class="panel__pad"><table class="table"><thead><tr><th>#</th><th>Wallet</th><th>Friends</th><th>Spot</th></tr></thead><tbody data-inviters></tbody></table></div></section>
    <section class="panel">${panelHead("latest joins", "NEWEST FIRST")}<div class="panel__pad"><table class="table"><thead><tr><th>Join</th><th>Wallet</th><th>Via</th><th>When</th></tr></thead><tbody data-latest></tbody></table></div></section>
  </div>`;

  let chart, state = { list, ranked: null };

  const renderClose = () => {
    const slot = $("[data-close-slot]", box);
    const isCreator = sameAddr(wallet.account, state.list.creator);
    $("[data-dash-status]", box).innerHTML = state.list.closed
      ? `Launched 🎉 — final line, positions frozen.`
      : `${isCreator ? "You created this line." : `Created by <span class="mono">${short(state.list.creator)}</span> — read-only view.`} Launch ${new Date(state.list.launchAt * 1000).toLocaleString()}.`;
    slot.innerHTML = isCreator && !state.list.closed ? `<button class="btn btn--coral btn--sm" data-close>Close waitlist</button>` : "";
    $("[data-close]", slot)?.addEventListener("click", confirmClose);
  };

  function confirmClose() {
    const m = modal(`<h3>Close this waitlist?</h3><p class="muted">Nobody else can join, and everyone's position is frozen as the final line. This can't be undone.</p>
      <div class="row gap"><button class="btn btn--coral" data-yes>Close it (tx)</button><button class="btn btn--ghost" data-close>Cancel</button></div><p class="form__err" data-e></p>`);
    $("[data-yes]", m.el).addEventListener("click", async (e) => {
      e.target.disabled = true; e.target.innerHTML = `<span class="spin"></span> Closing…`;
      try { await txClose(id); m.close(); toast("Waitlist closed — launched 🎉", "ok"); state.list = await getList(id); renderClose(); }
      catch (err) { $("[data-e]", m.el).textContent = friendlyError(err); e.target.disabled = false; e.target.textContent = "Retry"; }
    });
  }

  $("[data-csv]", box).addEventListener("click", () => {
    if (!state.ranked) return;
    const rows = [["position", "wallet", "joined_at", "referrals"], ...state.ranked.sorted.map((r) => [r.rank, r.addr, new Date(r.at * 1000).toISOString(), r.refs])];
    download(`lineup-${id}-${state.list.name.replace(/\W+/g, "-").toLowerCase()}.csv`, toCSV(rows));
    toast("CSV downloaded", "ok");
  });

  const prev = { total: 0, today: 0 };
  function render() {
    const r = state.ranked, l = state.list;
    const midnight = new Date(); midnight.setHours(0, 0, 0, 0);
    const today = r.rows.filter((x) => x.at * 1000 >= midnight.getTime()).length;
    const viaInvite = r.rows.filter((x) => x.referrer && x.referrer !== ZERO).length;
    tween($('[data-s="total"]', box), l.count, { from: prev.total, duration: 0.8 });
    tween($('[data-s="today"]', box), today, { from: prev.today, duration: 0.8 });
    prev.total = l.count; prev.today = today;
    $('[data-s="share"]', box).textContent = l.count ? `${Math.round((viaInvite / l.count) * 100)}%` : "0%";
    $('[data-s="days"]', box).textContent = l.closed ? "—" : String(daysTo(l.launchAt));

    $("[data-inviters]", box).innerHTML = r.inviters.slice(0, 20).map((x, i) => `<tr>
      <td data-label="#" class="mono">${i + 1}</td><td data-label="Wallet"><a class="mono addr" href="${url(`/w/${id}`)}" data-link>${avatar(x.addr)}${shorter(x.addr)}</a></td>
      <td data-label="Friends" class="mono">${x.refs}${x.refs > l.cap ? ` <i class="muted">(${l.cap} counted)</i>` : ""}</td><td data-label="Spot" class="mono lime">#${fmt(x.rank)}</td></tr>`).join("")
      || `<tr><td colspan="4" class="muted small">No referrals yet.</td></tr>`;
    $("[data-latest]", box).innerHTML = [...r.rows].reverse().slice(0, 20).map((x) => `<tr>
      <td data-label="Join" class="mono">#${fmt(x.joinNo)}</td><td data-label="Wallet" class="mono">${avatar(x.addr)}${shorter(x.addr)}</td>
      <td data-label="Via" class="mono muted">${x.referrer && x.referrer !== ZERO ? shorter(x.referrer) : "direct"}</td><td data-label="When" class="muted">${timeAgo(x.at)}</td></tr>`).join("")
      || `<tr><td colspan="4" class="muted small">Nobody yet — share your link.</td></tr>`;

    // chart: signups per day
    const byDay = new Map();
    r.rows.forEach((x) => { const d = new Date(x.at * 1000); d.setHours(0, 0, 0, 0); byDay.set(d.getTime(), (byDay.get(d.getTime()) || 0) + 1); });
    const start = r.rows.length ? Math.min(...byDay.keys()) : midnight.getTime() - 6 * 86400000;
    const days = [];
    for (let t = Math.min(start, midnight.getTime() - 6 * 86400000); t <= midnight.getTime(); t += 86400000) days.push(t);
    const labels = days.map((t) => new Date(t).toLocaleDateString(undefined, { month: "short", day: "numeric" }));
    const data = days.map((t) => byDay.get(t) || 0);
    $("[data-chart-sum]", box).textContent = `${fmt(l.count)} total · best day ${fmt(Math.max(0, ...data))}`;
    if (!window.Chart) return;
    if (chart) { chart.data.labels = labels; chart.data.datasets[0].data = data; chart.update(); return; }
    chart = new Chart($("[data-chart]", box), {
      type: "bar",
      data: { labels, datasets: [{ label: "Signups", data, backgroundColor: accent, borderRadius: 6, maxBarThickness: 36 }] },
      options: {
        responsive: true, maintainAspectRatio: false, animation: reduced() ? false : { duration: 700 },
        plugins: { legend: { display: false }, tooltip: { backgroundColor: "#15131C", borderColor: "#2A2733", borderWidth: 1, titleColor: "#F4F2F8", bodyColor: "#F4F2F8", displayColors: false } },
        scales: {
          x: { grid: { display: false }, ticks: { color: "#9892A6", maxRotation: 0, autoSkip: true, maxTicksLimit: 10 } },
          y: { beginAtZero: true, grid: { color: "#2A2733" }, border: { display: false }, ticks: { color: "#9892A6", precision: 0 } },
        },
      },
    });
  }

  renderClose();
  const stop = watchList(id, (l, m) => { state.list = l; state.ranked = rank(l, m); renderClose(); render(); });
  const off = onWallet(renderClose);
  return () => { stop(); off(); chart?.destroy(); };
}

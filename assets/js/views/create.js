// "/app/new" — create a waitlist, then show the share kit.
import { COLORS, ICONS, LIMITS, IS_DEPLOYED, NET } from "../config.js";
import { $, $$, esc, byteLen, flagged, copy, toast, absUrl, url, reduced } from "../util.js";
import { previewCard, railHTML, showInstall, panelHead, panelFoot } from "../ui.js";
import { txCreate, friendlyError } from "../chain.js";

const pad = (n) => String(n).padStart(2, "0");
function localInput(d) {
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

export function view() {
  const def = new Date(Date.now() + 14 * 86400000);
  def.setMinutes(0, 0, 0);
  return {
    title: "New waitlist",
    html: `<div class="appgrid">
  ${railHTML("new")}
  <div class="appmain">
    <div class="create" data-create>
      <form class="form panel" data-form novalidate>
        ${panelHead("new line", "ONE TRANSACTION")}
        <div class="form__body">
        <span class="eyebrow">New waitlist</span>
        <h1 class="h2 px">Make your line.</h1>
        ${IS_DEPLOYED ? "" : `<p class="notice">The contract address isn't set yet — you can fill the form and preview, but creating needs a deployed contract (see README).</p>`}

        <label class="field"><span>Product name <i data-count="name">0/${LIMITS.name}</i></span>
          <input class="input" name="name" maxlength="${LIMITS.name}" required placeholder="Rocket"></label>

        <label class="field"><span>One-line pitch <i data-count="pitch">0/${LIMITS.pitch}</i></span>
          <input class="input" name="pitch" maxlength="${LIMITS.pitch}" placeholder="The fastest way to ship side projects"></label>

        <div class="field"><span>Cover colour</span>
          <div class="swatches" data-colors>${COLORS.map((c, i) => `<button type="button" class="swatch ${i === 0 ? "is-on" : ""}" style="--c:${c.hex}" data-c="${i}" aria-label="${c.key}"></button>`).join("")}</div>
        </div>

        <div class="field"><span>Icon</span>
          <div class="icons" data-icons>${ICONS.map((ic, i) => `<button type="button" class="iconpick ${i === 0 ? "is-on" : ""}" data-i="${ic}">${ic}</button>`).join("")}
            <input class="input input--icon" name="iconCustom" maxlength="8" placeholder="✎" aria-label="Custom emoji"></div>
        </div>

        <div class="row2">
          <label class="field"><span>Launch date</span><input class="input" type="datetime-local" name="launch" value="${localInput(def)}" required></label>
          <label class="field"><span>Max spots <i>optional</i></span><input class="input" type="number" name="max" min="0" step="1" placeholder="Unlimited"></label>
        </div>

        <label class="field"><span>Reward <i>optional</i> <i data-count="reward">0/${LIMITS.reward}</i></span>
          <input class="input" name="reward" maxlength="${LIMITS.reward}" placeholder="First 100 get early access"></label>

        <details class="adv">
          <summary>Referral boost · <span data-boost-sum>up 5 spots per friend, max 20 friends</span></summary>
          <div class="row2">
            <label class="field"><span>Spots per friend (1–10)</span><input class="input" type="number" name="boost" min="1" max="10" value="5"></label>
            <label class="field"><span>Max friends counted (0–50)</span><input class="input" type="number" name="cap" min="0" max="50" value="20"></label>
          </div>
          <label class="check"><input type="checkbox" name="minBalance"> Joiners must hold ≥ 0.001 BOT <i class="muted">(makes throwaway wallets harder)</i></label>
        </details>

        <p class="form__err" data-err role="alert"></p>
        <button class="btn btn--lime btn--lg btn--block" type="submit" data-submit>Create waitlist</button>
        <p class="muted small">One transaction on ${esc(NET.chainName)}. Text can't be edited later. By creating, you agree to keep it friendly.</p>
        </div>
        ${panelFoot("LINEUP", `${esc(NET.chainName).toUpperCase()} · ${NET.chainId}`)}
      </form>
      <div class="create__preview">
        <span class="eyebrow">Live preview</span>
        <div data-preview></div>
      </div>
    </div>
  </div>
</div>`,
    mount,
  };
}

function readForm(form, state) {
  const f = new FormData(form);
  const launchAt = Math.floor(new Date(f.get("launch")).getTime() / 1000);
  return {
    name: String(f.get("name") || "").trim(),
    pitch: String(f.get("pitch") || "").trim(),
    reward: String(f.get("reward") || "").trim(),
    icon: String(f.get("iconCustom") || "").trim() || state.icon,
    color: state.color,
    launchAt,
    maxSpots: Math.max(0, Math.floor(Number(f.get("max") || 0))),
    boost: Math.floor(Number(f.get("boost") || 5)),
    cap: Math.floor(Number(f.get("cap") ?? 20)),
    minBalance: !!f.get("minBalance"),
  };
}

function validate(d) {
  if (!d.name) return "Give your product a name";
  if (byteLen(d.name) > LIMITS.name) return "Name is too long";
  if (byteLen(d.pitch) > LIMITS.pitch) return "Pitch is too long";
  if (byteLen(d.reward) > LIMITS.reward) return "Reward is too long";
  if (byteLen(d.icon) > LIMITS.icon) return "Icon is too long — use one emoji";
  if (!d.launchAt || d.launchAt * 1000 <= Date.now() + 60000) return "Pick a launch date in the future";
  if (d.boost < 1 || d.boost > 10) return "Spots per friend must be 1–10";
  if (d.cap < 0 || d.cap > 50) return "Max friends counted must be 0–50";
  if (d.maxSpots > 4294967295) return "Max spots is too large";
  if ([d.name, d.pitch, d.reward].some(flagged)) return "Please keep the text friendly";
  return "";
}

function mount(root) {
  const form = $("[data-form]", root), prev = $("[data-preview]", root), err = $("[data-err]", root);
  const state = { color: 0, icon: ICONS[0] };
  const prefill = new URLSearchParams(location.search).get("name") || window.__lineupPrefill || "";
  window.__lineupPrefill = "";
  if (prefill && !form.name.value) form.name.value = prefill.slice(0, LIMITS.name);
  const update = () => {
    const d = readForm(form, state);
    ["name", "pitch", "reward"].forEach((k) => ($(`[data-count="${k}"]`, root).textContent = `${byteLen(d[k])}/${LIMITS[k]}`));
    $("[data-boost-sum]", root).textContent = `up ${d.boost || "?"} spot${d.boost === 1 ? "" : "s"} per friend, max ${d.cap} friends`;
    prev.innerHTML = previewCard(d, { count: 0, note: "Preview — this is what your link shows." });
    err.textContent = "";
  };
  form.addEventListener("input", update);
  $$("[data-colors] .swatch", root).forEach((b) => b.addEventListener("click", () => {
    $$("[data-colors] .swatch", root).forEach((x) => x.classList.toggle("is-on", x === b));
    state.color = Number(b.dataset.c); update();
  }));
  $$("[data-icons] .iconpick", root).forEach((b) => b.addEventListener("click", () => {
    $$("[data-icons] .iconpick", root).forEach((x) => x.classList.toggle("is-on", x === b));
    state.icon = b.dataset.i; form.iconCustom.value = ""; update();
  }));
  update();

  form.addEventListener("submit", async (e) => {
    e.preventDefault();
    const d = readForm(form, state);
    const msg = validate(d);
    if (msg) { err.textContent = msg; return; }
    if (!window.ethereum) { showInstall(); return; }
    if (!IS_DEPLOYED) { err.textContent = "Contract address not set yet (assets/js/config.js)."; return; }
    const btn = $("[data-submit]", root);
    btn.disabled = true; btn.innerHTML = `<span class="spin"></span> Confirm in wallet, then hang tight…`;
    try {
      const { id, hash } = await txCreate(d);
      shareKit(root, id, d, hash);
    } catch (e2) {
      err.textContent = friendlyError(e2);
      btn.disabled = false; btn.textContent = "Try again";
    }
  });
}

function shareKit(root, id, d, hash) {
  const link = absUrl(`/w/${id}`);
  const post = `${d.icon} ${d.name} is launching soon — get in line on @BOTChain_ai.\n\nInvite friends to move up the waitlist 👇\n${link}`;
  const box = $("[data-create]", root);
  box.innerHTML = `<div class="kit panel">
    ${panelHead("live", `WAITLIST #${id}`)}
    <div class="kit__body">
    <span class="eyebrow">Your line is live 🎉</span>
    <h1 class="h2 px">${esc(d.name)}</h1>
    <div class="kit__grid">
      <div>
        <div class="field"><span>Link</span>
          <div class="invite"><input class="invite__input mono" readonly value="${esc(link)}"><button class="btn btn--lime btn--sm" data-cp-link>Copy</button></div></div>
        <div class="field"><span>Ready-made X post</span>
          <textarea class="input mono kit__post" rows="5" readonly>${esc(post)}</textarea>
          <div class="row gap-sm"><button class="btn btn--ghost btn--sm" data-cp-post>Copy text</button>
          <a class="btn btn--lilac btn--sm" target="_blank" rel="noopener" href="https://x.com/intent/post?text=${encodeURIComponent(post)}">Post on X ↗</a></div></div>
        <div class="row gap">
          <a class="btn btn--lime" href="${url(`/w/${id}`)}" data-link>Open waitlist page</a>
          <a class="btn btn--ghost" href="${url(`/app/w/${id}`)}" data-link>Dashboard</a>
        </div>
        <p class="muted small mono">tx <a href="${NET.scan}/tx/${hash}" target="_blank" rel="noopener">${hash.slice(0, 10)}…</a> · join yourself first so friends can use your link</p>
      </div>
      <div class="kit__qr"><div data-qr></div><button class="btn btn--ghost btn--sm" data-dl-qr>Download QR</button></div>
    </div>
    </div>
    ${panelFoot("SHARE KIT", "LIVE")}
  </div>`;
  const qrEl = $("[data-qr]", box);
  if (window.QRCode) new QRCode(qrEl, { text: link, width: 200, height: 200, colorDark: "#0C0B10", colorLight: "#F4F2F8", correctLevel: QRCode.CorrectLevel.M });
  $("[data-cp-link]", box).onclick = () => copy(link, "Link copied");
  $("[data-cp-post]", box).onclick = () => copy(post, "Post copied");
  $("[data-dl-qr]", box).onclick = () => {
    const src = qrEl.querySelector("canvas")?.toDataURL() || qrEl.querySelector("img")?.src;
    if (!src) return;
    Object.assign(document.createElement("a"), { href: src, download: `lineup-${id}-qr.png` }).click();
  };
  if (window.gsap && !reduced()) gsap.from(box.firstElementChild, { y: 30, opacity: 0, duration: 0.6, ease: "power3.out" });
  toast("Waitlist created", "ok");
  history.replaceState({}, "", url(`/app/new?created=${id}`));
}

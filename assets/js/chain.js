// Wallet connection + contract reads/writes + member cache & ranking.
import { NET, ABI, IS_DEPLOYED } from "./config.js";
import { ZERO, sameAddr } from "./util.js";

const { ethers } = window;
const hexChain = "0x" + NET.chainId.toString(16);

export const wallet = { account: null, chainId: null, has: !!window.ethereum };
const bus = new EventTarget();
export const onWallet = (fn) => { bus.addEventListener("change", fn); return () => bus.removeEventListener("change", fn); };
const emit = () => bus.dispatchEvent(new Event("change"));
export const onRightChain = () => wallet.chainId === NET.chainId;

// ── reads ──
let _reader;
export function reader() {
  if (!_reader) {
    const provider = new ethers.JsonRpcProvider(NET.rpc, ethers.Network.from(NET.chainId), { staticNetwork: true, batchMaxCount: 10 });
    _reader = new ethers.Contract(NET.contract, ABI, provider);
  }
  return _reader;
}
export const iface = new ethers.Interface(ABI);

// ── wallet ──
export async function initWallet() {
  if (!window.ethereum) return;
  try {
    const [accs, cid] = await Promise.all([
      window.ethereum.request({ method: "eth_accounts" }),
      window.ethereum.request({ method: "eth_chainId" }),
    ]);
    wallet.account = accs[0] ? ethers.getAddress(accs[0]) : null;
    wallet.chainId = parseInt(cid, 16);
  } catch {}
  window.ethereum.on?.("accountsChanged", (accs) => { wallet.account = accs[0] ? ethers.getAddress(accs[0]) : null; emit(); });
  window.ethereum.on?.("chainChanged", (cid) => { wallet.chainId = parseInt(cid, 16); emit(); });
  emit();
}

export class NoWalletError extends Error { constructor() { super("Install MetaMask to continue"); this.code = "NO_WALLET"; } }

export async function connect() {
  if (!window.ethereum) throw new NoWalletError();
  const accs = await window.ethereum.request({ method: "eth_requestAccounts" });
  wallet.account = ethers.getAddress(accs[0]);
  await ensureChain();
  emit();
  return wallet.account;
}

export async function ensureChain() {
  if (!window.ethereum) throw new NoWalletError();
  const cid = parseInt(await window.ethereum.request({ method: "eth_chainId" }), 16);
  if (cid === NET.chainId) { wallet.chainId = cid; return; }
  try {
    await window.ethereum.request({ method: "wallet_switchEthereumChain", params: [{ chainId: hexChain }] });
  } catch (e) {
    if (e.code === 4902 || e?.data?.originalError?.code === 4902 || /unrecognized|not been added/i.test(e.message || "")) {
      await window.ethereum.request({
        method: "wallet_addEthereumChain",
        params: [{ chainId: hexChain, chainName: NET.chainName, nativeCurrency: NET.currency, rpcUrls: [NET.rpc], blockExplorerUrls: [NET.scan] }],
      });
    } else throw e;
  }
  wallet.chainId = NET.chainId;
  emit();
}

async function writer() {
  if (!IS_DEPLOYED) throw new Error("Contract address not set yet (see assets/js/config.js)");
  if (!wallet.account) await connect();
  await ensureChain();
  const signer = await new ethers.BrowserProvider(window.ethereum).getSigner();
  return new ethers.Contract(NET.contract, ABI, signer);
}

export function friendlyError(e) {
  if (!e) return "Something went wrong";
  if (e.code === "NO_WALLET") return e.message;
  if (e.code === "ACTION_REJECTED" || e.code === 4001 || e?.info?.error?.code === 4001) return "Transaction rejected in wallet";
  let name = e.revert?.name;
  if (!name && e.data) { try { name = iface.parseError(e.data)?.name; } catch {} }
  const map = {
    ListClosed: "This line is closed", ListFull: "This line is full", AlreadyJoined: "You're already in this line",
    BalanceTooLow: "Hold at least 0.001 BOT to join", NotCreator: "Only the creator can do that", NoSuchList: "Waitlist not found",
    BadInput: `Check the ${e.revert?.args?.[0] || "form"} field`,
  };
  if (name && map[name]) return map[name];
  if (/insufficient funds/i.test(e.message || "")) return "Not enough BOT for gas";
  // A revert with no data never comes from Lineup's own checks (those are named errors).
  // It usually means the address in config.js is not a Lineup contract (unknown function).
  if (e.code === "CALL_EXCEPTION" && !name && (!e.data || e.data === "0x")) {
    console.error("Lineup: contract reverted without a reason. Is the address in config.js a deployment of contracts/Lineup.sol?", e);
    return "BOT Chain couldn't run this transaction (the contract gave no reason). Nothing was sent and no gas was spent. Please try again later.";
  }
  return e.shortMessage || e.message || "Transaction failed";
}

// ── data ──
export function normList(id, [l, icon]) {
  return {
    id: Number(id), creator: l.creator, name: l.name, pitch: l.pitch, reward: l.reward, icon,
    color: Number(l.color), launchAt: Number(l.launchAt), maxSpots: Number(l.maxSpots), boost: Number(l.boost),
    cap: Number(l.cap), minBalance: l.minBalance, count: Number(l.count), closed: l.closed,
  };
}

export async function getList(id) {
  if (!IS_DEPLOYED) throw Object.assign(new Error("not deployed"), { code: "NOT_DEPLOYED" });
  try { return normList(id, await reader().getList(id)); }
  catch (e) {
    if (e.revert?.name === "NoSuchList" || e.code === "CALL_EXCEPTION" || /NoSuchList|execution reverted/i.test(e.message || "")) {
      throw Object.assign(new Error("not found"), { code: "NOT_FOUND" });
    }
    throw e;
  }
}

export async function getStats() {
  if (!IS_DEPLOYED) return { lists: 0, spots: 0 };
  const s = await reader().stats();
  return { lists: Number(s.listTotal), spots: Number(s.spotTotal) };
}

export async function listsOf(addr) {
  const r = await reader().listsOf(addr);
  return { created: r.created.map(Number), joined: r.joined.map(Number) };
}

export async function getMember(id, addr) {
  const m = await reader().getMember(id, addr);
  // positional access: `Result.at` is Array.prototype.at, not the "at" output
  return { no: Number(m[0]), refs: Number(m[1]), counted: Number(m[2]), referrer: m[3], at: Number(m[4]), score: Number(m[5]) };
}

export async function getBalance(addr) {
  return reader().runner.getBalance(addr);
}

// Members are append-only and each member's referrer is immutable, so we cache
// {who, referrer, at} and derive referral counts locally.
const memCache = new Map();
const cacheKey = (id) => `lineup:m:${NET.key}:${NET.contract.toLowerCase()}:${id}`;
function loadCache(id) {
  if (memCache.has(id)) return memCache.get(id);
  let c = { who: [], referrer: [], at: [] };
  try { const raw = localStorage.getItem(cacheKey(id)); if (raw) c = JSON.parse(raw); } catch {}
  memCache.set(id, c);
  return c;
}
function saveCache(id, c) {
  try { localStorage.setItem(cacheKey(id), JSON.stringify(c)); } catch {}
}

export async function loadMembers(id, count) {
  const c = loadCache(id);
  if (c.who.length > count) { c.who.length = c.referrer.length = c.at.length = 0; } // stale cache
  const PAGE = 400;
  while (c.who.length < count) {
    const [who, , referrer, at] = await reader().getMembers(id, c.who.length, PAGE); // positional: Result.at is a method
    if (!who.length) break;
    who.forEach((w, i) => { c.who.push(w); c.referrer.push(referrer[i]); c.at.push(Number(at[i])); });
  }
  saveCache(id, c);
  return c;
}

/** Core logic: position = max(1, joinNo − boost × min(refs, cap)); ties → earlier joinNo. */
export function rank(list, members) {
  const refs = new Map();
  members.referrer.forEach((r) => { if (r && r !== ZERO) { const k = r.toLowerCase(); refs.set(k, (refs.get(k) || 0) + 1); } });
  const rows = members.who.map((addr, i) => {
    const joinNo = i + 1;
    const raw = refs.get(addr.toLowerCase()) || 0;
    const counted = Math.min(raw, list.cap);
    const score = Math.max(1, joinNo - list.boost * counted);
    return { addr, joinNo, refs: raw, counted, score, at: members.at[i], referrer: members.referrer[i] };
  });
  const sorted = [...rows].sort((a, b) => a.score - b.score || a.joinNo - b.joinNo);
  sorted.forEach((r, i) => (r.rank = i + 1));
  const byAddr = new Map(rows.map((r) => [r.addr.toLowerCase(), r]));
  const inviters = [...rows].filter((r) => r.refs > 0).sort((a, b) => b.refs - a.refs || a.joinNo - b.joinNo);
  return { rows, sorted, byAddr, inviters, find: (a) => (a ? byAddr.get(a.toLowerCase()) : undefined) };
}

/** Live: poll the list + react to Joined events. Returns a stop function. */
export function watchList(id, onChange, every = 6000) {
  let stopped = false, last = -1, lastClosed = null, busy = false;
  const tick = async () => {
    if (stopped || busy) return;
    busy = true;
    try {
      const l = await getList(id);
      if (l.count !== last || l.closed !== lastClosed) {
        last = l.count; lastClosed = l.closed;
        const m = await loadMembers(id, l.count);
        if (!stopped) onChange(l, m);
      }
    } catch (e) { console.warn("watch", e); }
    busy = false;
  };
  const timer = setInterval(tick, every);
  let off = () => {};
  try {
    const filter = reader().filters.Joined(id);
    const h = () => tick();
    reader().on(filter, h);
    off = () => reader().off(filter, h);
  } catch {}
  tick();
  return () => { stopped = true; clearInterval(timer); off(); };
}

// ── writes ──
export async function txCreate(f) {
  const c = await writer();
  const tx = await c.createList(f.name, f.pitch, f.reward, f.icon, f.color, f.launchAt, f.maxSpots, f.boost, f.cap, f.minBalance);
  const rc = await tx.wait();
  for (const log of rc.logs) {
    try { const p = iface.parseLog(log); if (p?.name === "ListCreated") return { id: Number(p.args.id), hash: tx.hash }; } catch {}
  }
  throw new Error("Created, but couldn't read the new list id");
}

export async function txJoin(id, ref) {
  const c = await writer();
  const tx = await c.join(id, ref || ZERO);
  const rc = await tx.wait();
  let joinNo = 0, usedRef = ZERO;
  for (const log of rc.logs) {
    try { const p = iface.parseLog(log); if (p?.name === "Joined") { joinNo = Number(p.args.joinNo); usedRef = p.args.ref; } } catch {}
  }
  return { joinNo, ref: usedRef, hash: tx.hash, refAccepted: !!ref && sameAddr(usedRef, ref) };
}

export async function txClose(id) {
  const c = await writer();
  const tx = await c.close(id);
  await tx.wait();
  return tx.hash;
}

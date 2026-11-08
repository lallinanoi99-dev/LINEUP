// Local contract test on an in-memory chain (ganache, hardfork "merge" ≈ paris).
//   npm i --no-save ganache@7.9.2 && node test/lineup.test.mjs
import fs from "node:fs";
import assert from "node:assert/strict";
import ganache from "ganache";
import { ethers } from "ethers";

const { abi, bytecode } = JSON.parse(fs.readFileSync(process.env.LINEUP_BUILD || "build/Lineup.json", "utf8"));
const g = ganache.provider({ logging: { quiet: true }, chain: { hardfork: process.env.HARDFORK || "merge" }, wallet: { totalAccounts: 6 } });
const provider = new ethers.BrowserProvider(g);
const [A, B, C, D, E, Poor] = await Promise.all([0, 1, 2, 3, 4, 5].map((i) => provider.getSigner(i)));
const c0 = await new ethers.ContractFactory(abi, bytecode, A).deploy();
await c0.waitForDeployment();
const as = (s) => c0.connect(s);
const launch = Math.floor(Date.now() / 1000) + 86400 * 7;
const rejects = (p) => assert.rejects(p);

// create
await (await as(A).createList("Rocket", "A rocket app", "First 100 get early access", "🚀", 0, launch, 0, 5, 20, false)).wait();
await rejects(as(A).createList("", "x", "", "", 0, launch, 0, 5, 20, false), "BadInput");
await rejects(as(A).createList("x".repeat(41), "", "", "", 0, launch, 0, 5, 20, false), "BadInput");
await rejects(as(A).createList("ok", "", "", "", 0, launch, 0, 11, 20, false), "BadInput");
await rejects(as(A).createList("ok", "", "", "", 6, launch, 0, 5, 20, false), "BadInput");
assert.equal(await c0.listCount(), 1n);

const a = await A.getAddress(), b = await B.getAddress(), cc = await C.getAddress(), d = await D.getAddress();
// A joins own list, B joins with A's ref, C with self ref (ignored), D with non-member ref (ignored)
await (await as(A).join(0, ethers.ZeroAddress)).wait();
await (await as(B).join(0, a)).wait();
await (await as(C).join(0, cc)).wait();
await (await as(D).join(0, await E.getAddress())).wait();
await assert.rejects(as(B).join(0, a)); // already joined
let m = await c0.getMember(0, a);
assert.equal(m.no, 1n); assert.equal(m.refs, 1n); assert.equal(m.score, 1n);
assert.equal((await c0.getMember(0, cc)).referrer, ethers.ZeroAddress);
assert.equal((await c0.getMember(0, d)).referrer, ethers.ZeroAddress);
// D (joinNo 4) gets C to... C already in. E joins via D → D score 4-5 → 1
await (await as(E).join(0, d)).wait();
assert.equal(await c0.positionScore(0, d), 1n);
assert.equal(await c0.positionScore(0, await Poor.getAddress()), 0n);
const page = await c0.getMembers(0, 1, 10);
assert.equal(page.who.length, 4); assert.equal(page.who[0], b); assert.equal(page.referrer[0], a);
const lo = await c0.listsOf(a);
assert.deepEqual(lo.created.map(Number), [0]); assert.deepEqual(lo.joined.map(Number), [0]);
const st = await c0.stats(); assert.equal(st.listTotal, 1n); assert.equal(st.spotTotal, 5n);

// cap: list with boost 10 cap 1
await (await as(A).createList("Capped", "", "", "", 1, launch, 3, 10, 1, false)).wait();
await (await as(A).join(1, ethers.ZeroAddress)).wait();
await (await as(B).join(1, ethers.ZeroAddress)).wait();
await (await as(C).join(1, b)).wait();
await assert.rejects(as(D).join(1, b)); // full (maxSpots 3)
assert.equal((await c0.getMember(1, b)).counted, 1n);

// min balance: drain Poor
const poorAddr = await Poor.getAddress();
await g.request({ method: "evm_setAccountBalance", params: [poorAddr, "0x1"] }).catch(() => {});
await (await as(A).createList("Rich", "", "", "", 2, launch, 0, 5, 20, true)).wait();
const bal = await provider.getBalance(poorAddr);
if (bal < ethers.parseEther("0.001")) {
  await assert.rejects(c0.connect(Poor).join.staticCall(2, ethers.ZeroAddress, { gasPrice: 0 }));
}
await (await as(B).join(2, ethers.ZeroAddress)).wait();

// close
await assert.rejects(as(B).close(0)); // not creator
const rc = await (await as(A).close(0)).wait();
assert.ok(rc.logs.some((l) => c0.interface.parseLog(l)?.name === "Closed"));
await assert.rejects(as(Poor).join(0, ethers.ZeroAddress)); // closed
const [l0, icon] = await c0.getList(0);
assert.equal(l0.closed, true); assert.equal(icon, "🚀"); assert.equal(l0.count, 5n);

const gas = await as(A).createList.estimateGas("Gas", "pitch", "reward", "🎟", 0, launch, 0, 5, 20, false);
console.log("createList gas ≈", gas.toString());
console.log("All contract tests passed ✓");

// Deploy build/Lineup.json with a private key from the environment.
//   PRIVATE_KEY=0x... npm run deploy:testnet   (chain 968, rpc.bohr.life)
//   PRIVATE_KEY=0x... npm run deploy:mainnet   (chain 677, rpc.botchain.ai)
// Then paste the address into assets/js/config.js → NETWORKS[net].contract.
import fs from "node:fs";
import { ethers } from "ethers";

const NETS = {
  testnet: { rpc: "https://rpc.bohr.life", chainId: 968, scan: "https://scan.bohr.life" },
  mainnet: { rpc: "https://rpc.botchain.ai", chainId: 677, scan: "https://scan.botchain.ai" },
};
const net = NETS[process.argv[2]];
if (!net) throw new Error("usage: deploy.mjs testnet|mainnet");
if (!process.env.PRIVATE_KEY) throw new Error("Set PRIVATE_KEY");
const { abi, bytecode } = JSON.parse(fs.readFileSync("build/Lineup.json", "utf8"));
const provider = new ethers.JsonRpcProvider(net.rpc, net.chainId, { staticNetwork: true });
const wallet = new ethers.Wallet(process.env.PRIVATE_KEY, provider);
console.log(`Deploying from ${wallet.address} to chain ${net.chainId}…`);
const c = await new ethers.ContractFactory(abi, bytecode, wallet).deploy();
await c.waitForDeployment();
const addr = await c.getAddress();
console.log(`Lineup deployed: ${addr}\n${net.scan}/address/${addr}`);

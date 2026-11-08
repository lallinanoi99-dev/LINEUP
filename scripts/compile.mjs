// Compiles contracts/Lineup.sol → build/Lineup.json (abi + bytecode). evmVersion: paris.
import fs from "node:fs";
import path from "node:path";
import solc from "solc";

const root = path.resolve(path.dirname(new URL(import.meta.url).pathname), "..");
const source = fs.readFileSync(path.join(root, "contracts/Lineup.sol"), "utf8");
const input = {
  language: "Solidity",
  sources: { "Lineup.sol": { content: source } },
  settings: {
    evmVersion: "paris",
    optimizer: { enabled: true, runs: 200 },
    outputSelection: { "*": { "*": ["abi", "evm.bytecode.object"] } },
  },
};
const out = JSON.parse(solc.compile(JSON.stringify(input)));
const errors = (out.errors || []).filter((e) => e.severity === "error");
for (const e of out.errors || []) console.error(e.formattedMessage);
if (errors.length) process.exit(1);
const c = out.contracts["Lineup.sol"].Lineup;
fs.mkdirSync(path.join(root, "build"), { recursive: true });
fs.writeFileSync(
  path.join(root, "build/Lineup.json"),
  JSON.stringify({ abi: c.abi, bytecode: "0x" + c.evm.bytecode.object }, null, 2)
);
console.log(`Compiled Lineup (solc ${solc.version()}), bytecode ${c.evm.bytecode.object.length / 2} bytes → build/Lineup.json`);

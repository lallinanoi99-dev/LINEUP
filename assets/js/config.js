// ─────────────────────────────────────────────────────────────
// Lineup config — the ONE place to put the deployed contract.
// After deploying contracts/Lineup.sol, paste the address below.
// ─────────────────────────────────────────────────────────────

/** Mainnet contract (BOT Chain, chain ID 677). */
export const MAINNET_CONTRACT_ADDRESS = "0x62Dd6cC16Bd1851b5644AAa62BB4E55a0e7d55Be";
/** Testnet contract (BOT Chain testnet, chain ID 968). Use with ?net=testnet. */
export const TESTNET_CONTRACT_ADDRESS = "0x0000000000000000000000000000000000000000";

export const NETWORKS = {
  mainnet: {
    key: "mainnet",
    chainId: 677,
    chainName: "BOT Chain",
    rpc: "https://rpc.botchain.ai",
    scan: "https://scan.botchain.ai",
    currency: { name: "BOT", symbol: "BOT", decimals: 18 },
    contract: MAINNET_CONTRACT_ADDRESS,
  },
  testnet: {
    key: "testnet",
    chainId: 968,
    chainName: "BOT Chain Testnet",
    rpc: "https://rpc.bohr.life",
    scan: "https://scan.bohr.life",
    currency: { name: "BOT", symbol: "BOT", decimals: 18 },
    contract: TESTNET_CONTRACT_ADDRESS,
  },
};

function pickNet() {
  try {
    const q = new URLSearchParams(location.search).get("net");
    if (q === "testnet" || q === "mainnet") localStorage.setItem("lineup:net", q);
    const saved = localStorage.getItem("lineup:net");
    if (saved && NETWORKS[saved]) return NETWORKS[saved];
  } catch {}
  return NETWORKS.mainnet;
}
export const NET = pickNet();
export const IS_DEPLOYED = !/^0x0{40}$/i.test(NET.contract);

export const LINKS = {
  botchain: "https://botchain.ai",
  botchainDocs: "https://docs.botchain.ai",
  github: "https://github.com/lallinanoi99-dev/LINEUP",
  x: "https://x.com/BOTChain_ai",
  report: "https://github.com/lallinanoi99-dev/LINEUP/issues/new",
  getBot: "https://botchain.ai",
};

export const CONTRACT_EXPLORER_URL = `${NETWORKS.mainnet.scan}/address/${MAINNET_CONTRACT_ADDRESS}`;

/** Cover colours (index = on-chain `color`). */
export const COLORS = [
  { key: "lime", hex: "#C6FF3D", ink: "#1c1c1b" },
  { key: "lilac", hex: "#B9A6FF", ink: "#1c1c1b" },
  { key: "coral", hex: "#FF6B6B", ink: "#1c1c1b" },
  { key: "sky", hex: "#7CC8FF", ink: "#1c1c1b" },
  { key: "sun", hex: "#FFD25E", ink: "#1c1c1b" },
  { key: "mint", hex: "#6EE7B7", ink: "#1c1c1b" },
];

export const ICONS = ["🚀", "✨", "🎟️", "🔥", "🎧", "🎮", "📦", "🧪", "🌱", "🤖", "💎", "🍜"];

export const LIMITS = { name: 40, pitch: 120, reward: 80, icon: 16, boostMin: 1, boostMax: 10, capMax: 50 };

/** Home page "Launch story" — a REAL waitlist you run. Set listId once it exists on mainnet. */
export const STORY = {
  listId: null, // e.g. 0
  title: "Lineup runs its own launch on Lineup",
  tags: ["Launch", "Referrals"],
  quote: "", // your own words as the maker — left empty until you write it
  maker: "The Lineup maker",
};

/** Big stat on the home page is hidden until at least this many spots exist. */
export const BIG_STAT_MIN = 100;

export const MIN_BALANCE_BOT = "0.001";

export const ABI = [
  "function createList(string name, string pitch, string reward, string icon, uint8 color, uint64 launchAt, uint32 maxSpots, uint8 boost, uint8 cap, bool minBalance) returns (uint256 id)",
  "function join(uint256 id, address ref)",
  "function close(uint256 id)",
  "function listCount() view returns (uint256)",
  "function getList(uint256 id) view returns (tuple(address creator, string name, string pitch, string reward, uint8 color, uint64 launchAt, uint32 maxSpots, uint8 boost, uint8 cap, bool minBalance, uint32 count, bool closed) l, string icon)",
  "function getMember(uint256 id, address who) view returns (uint32 no, uint32 refs, uint32 counted, address referrer, uint64 at, uint32 score)",
  "function getMembers(uint256 id, uint256 offset, uint256 limit) view returns (address[] who, uint32[] refs, address[] referrer, uint64[] at)",
  "function positionScore(uint256 id, address who) view returns (uint32)",
  "function listsOf(address who) view returns (uint256[] created, uint256[] joined)",
  "function stats() view returns (uint256 listTotal, uint256 spotTotal)",
  "event ListCreated(uint256 indexed id, address indexed creator)",
  "event Joined(uint256 indexed id, address indexed who, uint32 joinNo, address indexed ref)",
  "event Closed(uint256 indexed id)",
  "error BadInput(string what)",
  "error NoSuchList()",
  "error ListClosed()",
  "error ListFull()",
  "error AlreadyJoined()",
  "error BalanceTooLow()",
  "error NotCreator()",
];

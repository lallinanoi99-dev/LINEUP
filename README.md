# Lineup — Get in line.

Make a launch waitlist in a minute. People join with their wallet, invite friends to move up, and every spot is recorded on **BOT Chain** so nobody can cut the line.

- **Contract (BOT Chain mainnet, chain ID 677):** `0x9Da8F988625e8785c56737A6EEF5E6b5bF6f23a3`
- **Explorer:** https://scan.botchain.ai/address/0x9Da8F988625e8785c56737A6EEF5E6b5bF6f23a3
- **Live site:** _GitHub Pages URL / custom domain_

> Spots are wallet-based. Lineup is for fun and early access, not money.

## What's inside

| Path | What |
| --- | --- |
| `contracts/Lineup.sol` | The contract: create · join with referrals · close · views. No payments, tokens or admin. |
| `index.html`, `404.html` | Single-page static site plus the GitHub Pages deep-link fallback. |
| `assets/js/config.js` | **The one place for the contract address**, networks, colours, home-page story. |
| `assets/js/chain.js` | MetaMask connect, auto switch/add BOT Chain, reads/writes, member cache, ranking. |
| `assets/js/views/*` | `/` website · `/app/new` · `/w/:id` · `/app/w/:id` · `/app/me` · legal · 404. |
| `assets/vendor/*` | Pinned libraries: ethers 6.13.4, GSAP 3.13.0 (ScrollTrigger, SplitText, Flip), Chart.js 4.4.6, qrcodejs 1.0.0. |
| `scripts/` | `compile.mjs` (solc 0.8.24, evm `paris`), `deploy.mjs`, `serve.mjs` (local dev server). |
| `test/lineup.test.mjs` | Contract tests on an in-memory chain. |

There's no backend and no build step. The site reads the chain directly.

## Routes

- `/` is the website: announcement bar, mega-menu nav, and 7 sections (hero with the Join · Invite · Climb demo, "See your launch page" preview, How it works, launch story, big stat, Built fair + ranking + FAQ, closing CTA). It ends with the "Admit one" ticket footer.
- `/app/new` creates a waitlist with a live preview. After the transaction it shows the share kit: link, QR code (downloadable) and a ready-made X post.
- `/w/:id` is the public page. It has a countdown, live counter, reward, join button, `?ref=` invite banner, a perforated ticket that flips to your invite link, the top-10 inviters, recent joins and a ticker. On mobile the join button sticks to the bottom of the screen.
- `/app/w/:id` is the creator dashboard. It shows stats, signups per day, the top 20 inviters, latest joins, CSV export (position, wallet, joined at, referrals) and Close waitlist.
- `/app/me` lists the waitlists you created and the lines you're in, with your spot in each.

## Ranking

```
counted  = min(referrals, cap)
score    = max(1, joinNo − boost × counted)
rank     = sort by score, ties → earlier joinNo
```

The contract enforces these rules:
- You can't refer yourself.
- The referrer must already be in the list. An invalid referrer is ignored, and the join goes through without it.
- The bonus is capped.
- The creator can optionally require joiners to hold at least 0.001 BOT.

Closing a list freezes everyone's position. Each member's referrer never changes, so the app caches members in localStorage, works out referral counts itself, and fetches only new joins. It polls every 6 seconds and also listens for `Joined` events.

## Contract notes and changes from the PRD

- `createList` takes an extra `string icon` (≤ 16 bytes) for the emoji/icon picked in flow A. It's stored in `iconOf` so the `List` struct keeps the PRD's shape.
- Added `joinedAt` and an append-only `members` list with `getMembers(id, offset, limit)`. This gives the dashboard chart and CSV a "joined at" value without depending on `eth_getLogs` range limits.
- `positionScore` returns 0 for wallets that aren't in the list. `getList` returns `(List, icon)`.
- evmVersion is `paris` and the optimizer runs 200 times. `createList` uses about 197k gas.

## Develop

```bash
npm install
```

```bash
npm run compile
```

```bash
npm i --no-save ganache@7.9.2 && node test/lineup.test.mjs
```

```bash
npm run dev
```

The dev server runs at http://localhost:5173. Add `?net=testnet` to use chain 968; the choice is remembered, and `?net=mainnet` switches back.

## Deploy

1. **Testnet:** use Remix (Solidity 0.8.24, EVM `paris`, optimizer 200) on chain 968 (https://rpc.bohr.life). Or run `PRIVATE_KEY=0x… npm run deploy:testnet`. Paste the address into `TESTNET_CONTRACT_ADDRESS` and test with 3 wallets using `?net=testnet`.
2. **Mainnet:** run `PRIVATE_KEY=0x… npm run deploy:mainnet` and paste the address into `MAINNET_CONTRACT_ADDRESS` in `assets/js/config.js`. The footer, explorer link and barcode all use that value. Update the address at the top of this README too.
3. **GitHub Pages:** Settings → Pages → deploy from branch `main`, folder `/` (root). `.nojekyll` is already included. For a custom domain, add a `CNAME` file with the domain. Both `user.github.io/lineup/` and a custom domain work, because the base path is detected at runtime.
4. Create a real waitlist for one of your upcoming projects and set `STORY.listId` (plus your own `quote`) in `config.js`. The home-page story card then shows live numbers. The big-stat section stays hidden until there are at least `BIG_STAT_MIN` (100) spots.

## Releasing updates

Run `npm run stamp` before pushing a site change. It adds a new version number to the CSS and every JS module in `index.html`, so visitors get the new files immediately instead of a cached copy (GitHub Pages lets browsers cache for 10 minutes).

## Before launch, check

- Check `LINKS` in `config.js`: `botchainDocs` (currently `https://docs.botchain.ai`), the X handle, and the GitHub repo used for Report links.
- Confirm that `rpc.botchain.ai` allows browser CORS requests from your domain.

## Credits

Built for BOT Chain Build Week 1 · [@BOTChain_ai](https://x.com/BOTChain_ai)

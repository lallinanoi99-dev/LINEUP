// Static pages: privacy, terms, 404.
import { url } from "../util.js";

const page = (title, body) => ({ title, html: `<article class="prose wrap">${body}</article>` });

export const privacy = () => page("Privacy", `
  <span class="eyebrow">Legal</span><h1 class="h2 px">Privacy</h1>
  <p>Lineup has no backend and collects no emails, names or personal data. The site is a static page.</p>
  <p>When you join or create a waitlist, your <b>wallet address</b>, the time and any referrer are written to BOT Chain, a public blockchain. Anyone can read them, and they can't be deleted.</p>
  <p>Your browser stores a small cache of waitlist data (localStorage) to load pages faster. Clear site data to remove it.</p>`);

export const terms = () => page("Terms", `
  <span class="eyebrow">Legal</span><h1 class="h2 px">Terms</h1>
  <p>Lineup is provided as-is, for fun and early access. Spots are wallet-based and have no monetary value; there are no payments or tokens.</p>
  <p>Creators are responsible for their waitlist text and for honouring any rewards they promise. Text is filtered lightly; use the Report link on any waitlist to flag abuse.</p>
  <p>Transactions on BOT Chain are final. Check what you sign in your wallet.</p>`);

export const notFound = () => page("Not found", `
  <div class="empty panel"><span class="big-emoji">🎟️</span><h1 class="h2 px">This page isn't in line</h1>
  <p class="muted">We couldn't find that page.</p><a class="btn btn--primary" href="${url("/")}" data-link>Back home</a></div>`);

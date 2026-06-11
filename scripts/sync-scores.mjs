// scripts/sync-scores.mjs
//
// Run by .github/workflows/sync-scores.yml. Fetches the ESPN FIFA World Cup
// scoreboard and overlays finished/live scores onto the matches array in
// your globalMatches Firestore doc — the doc your app reads when Auto-Sync
// is on. Uses the Admin SDK, so it bypasses security rules and needs no
// signed-in user.
//
// NEW: if globalMatches/worldCup2026 doesn't exist yet, this script seeds it
// itself (cloning the fixture list from one of your leagueMatches docs and
// wiping it to a clean slate), so you never have to rely on the app/super
// admin to create it.
//
// Required env (GitHub repo secret):
//   FIREBASE_SERVICE_ACCOUNT -> the full service-account JSON (as one secret)

import admin from "firebase-admin";

// This is the app's `appId` from src/config/firebase.js — NOT VITE_FIREBASE_APP_ID.
// It's the folder name under `artifacts` in Firestore.
const APP_ID = "world-cup-family-2026";

const SA = process.env.FIREBASE_SERVICE_ACCOUNT;
if (!SA) {
  console.error("Missing FIREBASE_SERVICE_ACCOUNT env var.");
  process.exit(1);
}

admin.initializeApp({ credential: admin.credential.cert(JSON.parse(SA)) });
const db = admin.firestore();

const BASE = `artifacts/${APP_ID}/public/data`;
const GLOBAL_MATCHES_PATH = `${BASE}/globalMatches/worldCup2026`;
const LEAGUE_MATCHES_COLLECTION = `${BASE}/leagueMatches`;

const ESPN_URL =
  "https://site.api.espn.com/apis/site/v2/sports/soccer/fifa.world/scoreboard";

// team id -> exact name ESPN uses (your espnName || name). Keep in sync with
// TEAMS_DATA in src/config/data.js.
const ESPN_NAME = {
  MEX: "Mexico", RSA: "South Africa", KOR: "South Korea", CZE: "Czechia",
  CAN: "Canada", BIH: "Bosnia-Herzegovina", QAT: "Qatar", SUI: "Switzerland",
  BRA: "Brazil", HAI: "Haiti", MAR: "Morocco", SCO: "Scotland",
  USA: "United States", AUS: "Australia", PAR: "Paraguay", TUR: "Turkey",
  CUW: "Curacao", ECU: "Ecuador", GER: "Germany", CIV: "Ivory Coast",
  NED: "Netherlands", JPN: "Japan", SWE: "Sweden", TUN: "Tunisia",
  BEL: "Belgium", EGY: "Egypt", IRN: "Iran", NZL: "New Zealand",
  CPV: "Cape Verde", KSA: "Saudi Arabia", ESP: "Spain", URU: "Uruguay",
  FRA: "France", NOR: "Norway", SEN: "Senegal", IRQ: "Iraq",
  ALG: "Algeria", ARG: "Argentina", AUT: "Austria", JOR: "Jordan",
  COL: "Colombia", COD: "DR Congo", POR: "Portugal", UZB: "Uzbekistan",
  CRO: "Croatia", ENG: "England", GHA: "Ghana", PAN: "Panama",
};

// Get the global matches array, seeding the doc from a leagueMatches template
// (wiped clean) if it doesn't exist yet.
async function loadOrSeedMatches(ref) {
  const snap = await ref.get();
  if (snap.exists) return snap.data().matches || [];

  console.log("globalMatches not found — seeding it from a leagueMatches doc...");
  const lm = await db.collection(LEAGUE_MATCHES_COLLECTION).limit(1).get();
  if (lm.empty) {
    console.log(
      "No leagueMatches docs to clone from. Open the app once to create a " +
      "league (which generates the fixtures), then re-run this workflow."
    );
    return null;
  }

  const template = lm.docs[0].data().matches || [];
  // Wipe to a clean slate so we never import stray scores, and clear knockout
  // participants so the app's engine repopulates them as results come in.
  const seed = template.map((m) => {
    const isGroup = m.stage === "Group";
    return {
      ...m,
      scoreA: "0",
      scoreB: "0",
      isPlayed: false,
      isAET: false,
      penScoreA: null,
      penScoreB: null,
      penWinner: null,
      teamA: isGroup ? m.teamA : "",
      teamB: isGroup ? m.teamB : "",
    };
  });

  await ref.set({ matches: seed }, { merge: true });
  console.log(`Seeded globalMatches with ${seed.length} fixtures.`);
  return seed;
}

async function main() {
  // 1. Fetch the ESPN scoreboard.
  let events = [];
  try {
    const res = await fetch(ESPN_URL);
    if (!res.ok) {
      console.warn(`ESPN responded ${res.status}; skipping this run.`);
      return;
    }
    events = (await res.json()).events || [];
  } catch (err) {
    console.warn("ESPN fetch failed; skipping this run.", err);
    return;
  }
  if (events.length === 0) {
    console.log("No ESPN events on the board right now.");
    return;
  }

  // 2. Load (or seed) the matches doc the app reads from.
  const ref = db.doc(GLOBAL_MATCHES_PATH);
  const matches = await loadOrSeedMatches(ref);
  if (!matches) return;

  // 3. Overlay scores onto unplayed matches.
  let changed = false;
  const next = matches.map((m) => {
    if (m.isPlayed) return m; // never overwrite a match already marked FT

    const nameA = ESPN_NAME[m.teamA];
    const nameB = ESPN_NAME[m.teamB];
    if (!nameA || !nameB) return m;

    const event = events.find((e) => {
      const names =
        e.competitions?.[0]?.competitors?.map((c) => c.team.name) || [];
      return names.includes(nameA) && names.includes(nameB);
    });
    if (!event) return m;

    const comps = event.competitions[0].competitors;
    const compA = comps.find((c) => c.team.name === nameA);
    const compB = comps.find((c) => c.team.name === nameB);
    if (!compA || !compB) return m;

    const scoreA = parseInt(compA.score) || 0;
    const scoreB = parseInt(compB.score) || 0;
    const isFinished = !!event.status?.type?.completed;

    const curA = parseInt(m.scoreA) || 0;
    const curB = parseInt(m.scoreB) || 0;

    if (curA !== scoreA || curB !== scoreB || m.isPlayed !== isFinished) {
      changed = true;
      return { ...m, scoreA, scoreB, isPlayed: isFinished };
    }
    return m;
  });

  // 4. Write back only if something changed. Your app's onSnapshot picks it up.
  if (changed) {
    await ref.set({ matches: next }, { merge: true });
    console.log("Synced ESPN scores to globalMatches.");
  } else {
    console.log("No score changes this run.");
  }
}

main()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error(err);
    process.exit(1);
  });

// scripts/sync-scores.mjs
//
// Run by .github/workflows/sync-scores.yml. Fetches the ESPN FIFA World Cup
// scoreboard and overlays finished/live scores onto the matches array in
// your globalMatches Firestore doc — the exact doc your app reads when
// Auto-Sync is on. Uses the Admin SDK, so it bypasses security rules and
// needs no signed-in user.
//
// Required env (set as GitHub repo secrets):
//   APP_ID                   -> the same appId from src/config/firebase.js
//   FIREBASE_SERVICE_ACCOUNT -> the full service-account JSON (as one secret)

import admin from "firebase-admin";

const APP_ID = "world-cup-family-2026";
const SA = process.env.FIREBASE_SERVICE_ACCOUNT;

if (!SA) {
  console.error("Missing FIREBASE_SERVICE_ACCOUNT env var.");
  process.exit(1);
}

admin.initializeApp({
  credential: admin.credential.cert(JSON.parse(SA)),
});
const db = admin.firestore();

const GLOBAL_MATCHES_PATH =
  `artifacts/${APP_ID}/public/data/globalMatches/worldCup2026`;

const ESPN_URL =
  "https://site.api.espn.com/apis/site/v2/sports/soccer/fifa.world/scoreboard";

// team id -> exact name ESPN uses (your espnName || name). Keep in sync with
// TEAMS_DATA in src/config/data.js. (ESPN's competitor.team.abbreviation also
// equals your ids for the games checked so far, if you'd rather match on that.)
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

  // 2. Read the matches doc the app reads from.
  const ref = db.doc(GLOBAL_MATCHES_PATH);
  const snap = await ref.get();
  if (!snap.exists) {
    // Seeded the first time a super admin opens the app with Auto-Sync on.
    console.log("globalMatches doc not found yet; nothing to sync.");
    return;
  }

  const matches = snap.data().matches || [];
  let changed = false;

  // 3. Overlay scores onto unplayed matches.
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

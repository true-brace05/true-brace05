import { readFileSync, writeFileSync, mkdirSync } from "fs";
import { fileURLToPath } from "url";
import { dirname, join } from "path";
import {
  fetchUser,
  fetchOwnedRepos,
  fetchLanguagesForRepo,
  fetchContributionCalendar,
} from "./github-api.js";
import { buildDashboard } from "./svg-builder.js";

const __dirname = dirname(fileURLToPath(import.meta.url));

const TOKEN = process.env.GH_TOKEN;
const USERNAME = process.env.GH_USERNAME || "true-brace05";

if (!TOKEN) {
  console.error("GH_TOKEN env var is required.");
  process.exit(1);
}

const config = JSON.parse(readFileSync(join(__dirname, "config.json"), "utf-8"));

async function aggregateLanguages(repos, username, token) {
  const totals = {};
  for (const repo of repos) {
    // languages endpoint is per-repo, so this is one call per owned repo.
    // Fine for a personal-scale profile; well within the 5000/hr token limit.
    const langs = await fetchLanguagesForRepo(`${username}/${repo.name}`, token);
    for (const [lang, bytes] of Object.entries(langs)) {
      totals[lang] = (totals[lang] || 0) + bytes;
    }
  }
  const totalBytes = Object.values(totals).reduce((a, b) => a + b, 0);
  const ranked = Object.entries(totals)
    .map(([name, bytes]) => ({ name, bytes, percent: totalBytes ? (bytes / totalBytes) * 100 : 0 }))
    .sort((a, b) => b.bytes - a.bytes)
    .slice(0, 6);
  return ranked;
}

async function main() {
  console.log(`Fetching GitHub data for ${USERNAME}...`);

  const user = await fetchUser(USERNAME, TOKEN);
  const repos = await fetchOwnedRepos(USERNAME, TOKEN);
  const calendar = await fetchContributionCalendar(USERNAME, TOKEN);
  const languages = await aggregateLanguages(repos, USERNAME, TOKEN);
  // Project cards are populated from config.json, not invented — repos
  // without a known public URL (repo: null) still render using only the
  // summary/tech you provided.
  const selectedProjects = config.selectedProjects;

  const totalStars = repos.reduce((sum, r) => sum + (r.stargazers_count || 0), 0);
  const yearsActive = new Date().getFullYear() - new Date(user.created_at).getFullYear();

  const data = {
    name: config.name,
    tagline: config.tagline,
    username: config.username,
    currentFocus: config.currentFocus,
    externalProfiles: config.externalProfiles,
    selectedProjects,
    languages,
    weeks: calendar.weeks,
    totalContributions: calendar.totalContributions,
    metrics: [
      { label: "Repositories", value: repos.length },
      { label: "Followers", value: user.followers },
      { label: "Stars", value: totalStars },
      { label: "Contributions (12mo)", value: calendar.totalContributions },
      { label: "Years Active", value: yearsActive },
    ],
  };

  const svg = buildDashboard(data);

  const outDir = join(__dirname, "..", "dashboard");
  mkdirSync(outDir, { recursive: true });
  writeFileSync(join(outDir, "dashboard.svg"), svg, "utf-8");

  console.log("dashboard/dashboard.svg written.");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});

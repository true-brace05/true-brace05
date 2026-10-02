import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT_DIR = path.resolve(__dirname, "..");

function loadDotEnv() {
  const dotEnvPath = path.join(ROOT_DIR, ".env");

  if (!fs.existsSync(dotEnvPath)) {
    return;
  }

  const lines = fs.readFileSync(dotEnvPath, "utf8").split(/\r?\n/);

  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#") || !trimmed.includes("=")) {
      continue;
    }

    const [key, ...rest] = trimmed.split("=");
    const value = rest.join("=").trim();
    if (!process.env[key]) {
      process.env[key] = value.replace(/^['"]|['"]$/g, "");
    }
  }
}

loadDotEnv();

const USERNAME = process.env.GITHUB_USERNAME || "true-brace05";
const DATA_PATH = path.join(ROOT_DIR, "data", "github.json");

function readExistingData() {
  try {
    const raw = fs.readFileSync(DATA_PATH, "utf8");
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

function isValidData(payload) {
  if (!payload || typeof payload !== "object") {
    return false;
  }

  return (
    typeof payload.username === "string" &&
    Number.isInteger(payload.repositories) &&
    Number.isInteger(payload.followers) &&
    Number.isInteger(payload.stars) &&
    Number.isInteger(payload.joined) &&
    typeof payload.fetchedAt === "string"
  );
}

async function fetchJson(url, headers = {}, retryCount = 4) {
  let attempt = 0;

  while (attempt <= retryCount) {
    try {
      const response = await fetch(url, {
        headers: {
          Accept: "application/vnd.github+json",
          "User-Agent": "true-brace05-dashboard",
          ...headers,
        },
      });

      if (response.status === 429 || response.status >= 500) {
        if (attempt >= retryCount) {
          throw new Error(`GitHub API returned HTTP ${response.status}`);
        }

        const delayMs = 1000 * 2 ** attempt;
        console.warn(`Temporary API issue (HTTP ${response.status}), retrying in ${delayMs}ms...`);
        await new Promise((resolve) => setTimeout(resolve, delayMs));
        attempt += 1;
        continue;
      }

      if (!response.ok) {
        const details = await response.text();
        throw new Error(
          `GitHub API request failed (HTTP ${response.status}): ${details.slice(0, 200)}`
        );
      }

      return await response.json();
    } catch (error) {
      if (attempt >= retryCount) {
        throw error;
      }

      const delayMs = 1000 * 2 ** attempt;
      console.warn(`${error.message}. Retrying in ${delayMs}ms...`);
      await new Promise((resolve) => setTimeout(resolve, delayMs));
      attempt += 1;
    }
  }

  throw new Error("GitHub API request failed after retries");
}

async function fetchGitHubMetrics() {
  const headers = {};
  const token = process.env.GITHUB_TOKEN;

  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }

  const user = await fetchJson(
    `https://api.github.com/users/${USERNAME}`,
    headers,
    4
  );

  const repos = [];
  let page = 1;

  while (true) {
    const pageData = await fetchJson(
      `https://api.github.com/users/${USERNAME}/repos?per_page=100&page=${page}`,
      headers,
      4
    );

    if (!Array.isArray(pageData) || pageData.length === 0) {
      break;
    }

    repos.push(...pageData);

    if (pageData.length < 100) {
      break;
    }

    page += 1;
  }

  const totalStars = repos.reduce(
    (sum, repo) => sum + Number(repo.stargazers_count || 0),
    0
  );

  return {
    username: USERNAME,
    repositories: Number(user.public_repos ?? 0),
    followers: Number(user.followers ?? 0),
    stars: Number(totalStars),
    joined: Number(new Date(user.created_at).getUTCFullYear()),
    fetchedAt: new Date().toISOString(),
  };
}

async function main() {
  const previousData = readExistingData();

  try {
    const payload = await fetchGitHubMetrics();

    fs.mkdirSync(path.dirname(DATA_PATH), { recursive: true });
    fs.writeFileSync(DATA_PATH, `${JSON.stringify(payload, null, 2)}\n`, "utf8");

    console.log(`Fetched GitHub profile data for ${payload.username}`);
    console.log(`Repositories: ${payload.repositories}`);
    console.log(`Followers: ${payload.followers}`);
    console.log(`Stars: ${payload.stars}`);
    console.log(`Joined: ${payload.joined}`);
  } catch (error) {
    if (isValidData(previousData)) {
      console.warn(
        `GitHub API fetch failed: ${error.message}. Keeping the previous valid data in ${DATA_PATH}.`
      );
      return;
    }

    console.error(`Failed to fetch live GitHub profile data: ${error.message}`);
    process.exit(1);
  }
}

main();

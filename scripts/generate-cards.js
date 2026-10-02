import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT_DIR = path.resolve(__dirname, "..");
const DATA_PATH = path.join(ROOT_DIR, "data", "github.json");
const OUTPUT_DIR = path.join(ROOT_DIR, "assets", "cards");

function formatValue(key, value) {
  if (key === "joined") {
    return String(value);
  }

  return Number(value).toLocaleString("en-US");
}

function readData() {
  const raw = fs.readFileSync(DATA_PATH, "utf8");
  const data = JSON.parse(raw);

  return [
    {
      key: "repositories",
      value: formatValue("repositories", data.repositories),
      label: "REPOSITORIES",
      action: "View all →",
      emoji: "📁",
    },
    {
      key: "followers",
      value: formatValue("followers", data.followers),
      label: "FOLLOWERS",
      action: "View profile →",
      emoji: "👥",
    },
    {
      key: "stars",
      value: formatValue("stars", data.stars),
      label: "STARS",
      action: "View repositories →",
      emoji: "⭐",
    },
    {
      key: "joined",
      value: formatValue("joined", data.joined),
      label: "JOINED GITHUB",
      action: "View profile →",
      emoji: "🎓",
    },
  ];
}

function createCard(card) {
  return `
<svg
  xmlns="http://www.w3.org/2000/svg"
  width="280"
  height="180"
  viewBox="0 0 280 180"
  role="img"
  aria-label="${card.label} ${card.value}"
>

  <rect
    x="2"
    y="2"
    width="276"
    height="176"
    rx="22"
    fill="#FCFAFF"
    stroke="#DDD2F4"
    stroke-width="2"
  />

  <text
    x="140"
    y="49"
    text-anchor="middle"
    font-family="Apple Color Emoji, Segoe UI Emoji, sans-serif"
    font-size="25"
  >${card.emoji}</text>

  <text
    x="140"
    y="94"
    text-anchor="middle"
    font-family="Arial, Helvetica, sans-serif"
    font-size="38"
    font-weight="700"
    fill="#29233D"
  >${card.value}</text>

  <text
    x="140"
    y="120"
    text-anchor="middle"
    font-family="Arial, Helvetica, sans-serif"
    font-size="11"
    font-weight="700"
    letter-spacing="1.4"
    fill="#665D78"
  >${card.label}</text>

  <text
    x="140"
    y="151"
    text-anchor="middle"
    font-family="Arial, Helvetica, sans-serif"
    font-size="12"
    font-weight="500"
    fill="#8064C8"
  >${card.action}</text>
</svg>
`;
}

fs.mkdirSync(OUTPUT_DIR, { recursive: true });

for (const card of readData()) {
  fs.writeFileSync(
    path.join(OUTPUT_DIR, `${card.key}.svg`),
    createCard(card).trim(),
    "utf8"
  );
  console.log(`Generated ${card.key}.svg`);
}

console.log("Generated GitHub stat cards.");

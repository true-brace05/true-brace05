import fs from "node:fs";

const data = JSON.parse(
  fs.readFileSync("data/github.json", "utf8")
);

const cards = [
  {
    key: "repositories",
    value: data.repositories,
    label: "REPOSITORIES",
    action: "View all →",
    emoji: "📁",
  },
  {
    key: "followers",
    value: data.followers,
    label: "FOLLOWERS",
    action: "View profile →",
    emoji: "👥",
  },
  {
    key: "stars",
    value: data.stars,
    label: "STARS",
    action: "View repositories →",
    emoji: "⭐",
  },
  {
    key: "joined",
    value: data.joined,
    label: "JOINED GITHUB",
    action: "View profile →",
    emoji: "🎓",
  },
];

function createCard(card) {
  return `
<svg
  xmlns="http://www.w3.org/2000/svg"
  width="280"
  height="180"
  viewBox="0 0 280 180"
  role="img"
  aria-label="${card.value} ${card.label}"
>

  <!-- Background -->
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

  <!-- Emoji -->
  <text
    x="140"
    y="49"
    text-anchor="middle"
    font-family="Apple Color Emoji, Segoe UI Emoji, sans-serif"
    font-size="25"
  >${card.emoji}</text>

  <!-- Main number -->
  <text
    x="140"
    y="94"
    text-anchor="middle"
    font-family="Arial, Helvetica, sans-serif"
    font-size="38"
    font-weight="700"
    fill="#29233D"
  >${card.value}</text>

  <!-- Label -->
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

  <!-- Action -->
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

fs.mkdirSync("assets/cards", { recursive: true });

for (const card of cards) {
  fs.writeFileSync(
    `assets/cards/${card.key}.svg`,
    createCard(card).trim()
  );
}

console.log("Generated GitHub cards:");

for (const card of cards) {
  console.log(`✓ ${card.label}: ${card.value}`);
}
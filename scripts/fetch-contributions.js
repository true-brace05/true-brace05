import fs from "node:fs";

const USERNAME = "true-brace05";
const URL = `https://github.com/users/${USERNAME}/contributions`;

const response = await fetch(URL, {
  headers: {
    "User-Agent": "true-brace05-dashboard",
  },
});

if (!response.ok) {
  throw new Error(
    `GitHub returned ${response.status} ${response.statusText}`
  );
}

const html = await response.text();

// GitHub currently exposes contribution days as table cells.
// We only need the date and contribution level.
const cellRegex =
  /<td[^>]*data-date="([^"]+)"[^>]*data-level="([^"]+)"[^>]*>/g;

const cells = [];

for (const match of html.matchAll(cellRegex)) {
  cells.push({
    date: match[1],
    level: Number(match[2]),
  });
}

if (cells.length === 0) {
  throw new Error("Could not find contribution cells.");
}

console.log(`Found ${cells.length} contribution cells.`);

const width = 1120;
const height = 190;

const left = 55;
const top = 35;

const cellSize = 15;
const gap = 4;
const step = cellSize + gap;

const colors = [
  "#F1ECFA",
  "#E2D5F4",
  "#CDB8EA",
  "#B095DD",
  "#8064C8",
];

function getWeekStart(dateString) {
  const date = new Date(`${dateString}T00:00:00Z`);
  const day = date.getUTCDay();

  date.setUTCDate(date.getUTCDate() - day);

  return date.toISOString().slice(0, 10);
}

const weeks = new Map();

for (const cell of cells) {
  const week = getWeekStart(cell.date);

  if (!weeks.has(week)) {
    weeks.set(week, []);
  }

  weeks.get(week).push(cell);
}

const sortedWeeks = [...weeks.entries()].sort(
  ([a], [b]) => new Date(a) - new Date(b)
);

const svg = [];

svg.push(`
<svg
  xmlns="http://www.w3.org/2000/svg"
  width="${width}"
  height="${height}"
  viewBox="0 0 ${width} ${height}"
  role="img"
  aria-label="GitHub contribution activity for ${USERNAME}"
>

<rect
  width="${width}"
  height="${height}"
  rx="24"
  fill="#FFFFFF"
/>

<text
  x="30"
  y="34"
  font-family="Arial, Helvetica, sans-serif"
  font-size="17"
  font-weight="700"
  fill="#29233D"
>
  GITHUB ACTIVITY
</text>
`);

let previousMonth = "";

for (let weekIndex = 0; weekIndex < sortedWeeks.length; weekIndex++) {
  const [weekStart] = sortedWeeks[weekIndex];

  const date = new Date(`${weekStart}T00:00:00Z`);

  const month = date.toLocaleString("en-US", {
    month: "short",
    timeZone: "UTC",
  });

  if (month !== previousMonth) {
    svg.push(`

`);

    previousMonth = month;
  }
}

const dayLabels = [
  ["Sun", 0],
  ["Mon", 1],
  ["Wed", 3],
  ["Fri", 5],
];

for (const [label, day] of dayLabels) {
  svg.push(`
<text
  x="18"
  y="${top + day * step + 10}"
  font-family="Arial, Helvetica, sans-serif"
  font-size="10"
  fill="#766D86"
>
  ${label}
</text>
`);
}

for (let weekIndex = 0; weekIndex < sortedWeeks.length; weekIndex++) {
  const [, weekCells] = sortedWeeks[weekIndex];

  for (const cell of weekCells) {
    const date = new Date(`${cell.date}T00:00:00Z`);
    const weekday = date.getUTCDay();

    const x = left + weekIndex * step;
    const y = top + weekday * step;

    const level = Math.max(0, Math.min(cell.level, 4));

    svg.push(`
<rect
  x="${x}"
  y="${y}"
  width="${cellSize}"
  height="${cellSize}"
  rx="3"
  fill="${colors[level]}"
>
  <title>${cell.date}</title>
</rect>
`);
  }
}

svg.push(`
<text
  x="${width - 170}"
  y="${height - 20}"
  font-family="Arial, Helvetica, sans-serif"
  font-size="10"
  fill="#766D86"
>
  Less
</text>
`);

for (let i = 0; i < colors.length; i++) {
  svg.push(`
<rect
  x="${width - 140 + i * 18}"
  y="${height - 29}"
  width="12"
  height="12"
  rx="3"
  fill="${colors[i]}"
/>
`);
}

svg.push(`
<text
  x="${width - 35}"
  y="${height - 20}"
  text-anchor="end"
  font-family="Arial, Helvetica, sans-serif"
  font-size="10"
  fill="#766D86"
>
  More
</text>

</svg>
`);

fs.mkdirSync("assets", { recursive: true });

fs.writeFileSync(
  "assets/contribution-graph.svg",
  svg.join("\n").trim()
);

console.log("✓ Generated assets/contribution-graph.svg");
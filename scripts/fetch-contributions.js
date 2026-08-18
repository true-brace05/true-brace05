import fs from "fs";

const USERNAME = "true-brace05";
const OUTPUT = "assets/contribution-graph.svg";

const WIDTH = 1120;
const HEIGHT = 210;

const LEFT = 55;
const TOP = 48;

const CELL = 15;
const GAP = 4;
const STEP = CELL + GAP;

const COLORS = {
  background: "#FCFAFF",
  empty: "#F0E9FA",
  level1: "#E2D2F7",
  level2: "#C5A7ED",
  level3: "#9B72D8",
  level4: "#7042B8",
  text: "#5E536F",
  border: "#E5DAF2",
};

function escapeXml(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&apos;");
}

function getAttribute(tag, name) {
  const regex = new RegExp(
    `${name}\\s*=\\s*["']([^"']*)["']`,
    "i"
  );

  const match = tag.match(regex);
  return match ? match[1] : null;
}

function parseContributionCells(html) {
  const cells = [];

  const tdRegex = /<td\b[^>]*>/gi;
  const tags = html.match(tdRegex) || [];

  for (const tag of tags) {
    const date = getAttribute(tag, "data-date");
    const level = getAttribute(tag, "data-level");

    if (!date) continue;

    cells.push({
      date,
      level: Number(level ?? 0),
    });
  }

  return cells;
}

function dateFromString(value) {
  return new Date(`${value}T00:00:00Z`);
}

function startOfSunday(date) {
  const d = new Date(date);
  const day = d.getUTCDay();

  d.setUTCDate(d.getUTCDate() - day);

  return d;
}

function daysBetween(a, b) {
  return Math.round(
    (b.getTime() - a.getTime()) / (1000 * 60 * 60 * 24)
  );
}

function getMonthLabels(cells, firstSunday) {
  const labels = [];
  const seen = new Set();

  for (const cell of cells) {
    const date = dateFromString(cell.date);

    if (date.getUTCDate() > 7) continue;

    const weekIndex = Math.floor(
      daysBetween(firstSunday, startOfSunday(date)) / 7
    );

    const monthKey = `${date.getUTCFullYear()}-${date.getUTCMonth()}`;

    if (seen.has(monthKey)) continue;

    seen.add(monthKey);

    labels.push({
      text: date.toLocaleString("en-US", {
        month: "short",
        timeZone: "UTC",
      }),
      weekIndex,
    });
  }

  return labels;
}

async function main() {
  const url = `https://github.com/users/${USERNAME}/contributions`;

  const response = await fetch(url, {
    headers: {
      "User-Agent": "true-brace05-dashboard",
    },
  });

  if (!response.ok) {
    throw new Error(
      `GitHub returned HTTP ${response.status}`
    );
  }

  const html = await response.text();

  const cells = parseContributionCells(html);

  if (cells.length === 0) {
    throw new Error(
      "Could not find contribution cells in GitHub's response."
    );
  }

  console.log(`Found ${cells.length} contribution cells.`);

  cells.sort((a, b) => a.date.localeCompare(b.date));

  const firstDate = dateFromString(cells[0].date);
  const firstSunday = startOfSunday(firstDate);

  const cellMap = new Map();

  for (const cell of cells) {
    const date = dateFromString(cell.date);

    const weekIndex = Math.floor(
      daysBetween(firstSunday, startOfSunday(date)) / 7
    );

    const dayIndex = date.getUTCDay();

    cellMap.set(`${weekIndex}-${dayIndex}`, {
      level: cell.level,
      date: cell.date,
    });
  }

  const maxWeek = Math.max(
    ...cells.map((cell) => {
      const date = dateFromString(cell.date);

      return Math.floor(
        daysBetween(firstSunday, startOfSunday(date)) / 7
      );
    })
  );

  const weekCount = maxWeek + 1;

  const monthLabels = getMonthLabels(
    cells,
    firstSunday
  );

  const svg = [];

  svg.push(
    `<svg xmlns="http://www.w3.org/2000/svg"`,
    ` width="${WIDTH}"`,
    ` height="${HEIGHT}"`,
    ` viewBox="0 0 ${WIDTH} ${HEIGHT}"`,
    ` role="img"`,
    ` aria-label="GitHub contribution activity for ${escapeXml(USERNAME)}">`
  );

  svg.push(`
  <rect
    x="1"
    y="1"
    width="${WIDTH - 2}"
    height="${HEIGHT - 2}"
    rx="18"
    fill="${COLORS.background}"
    stroke="${COLORS.border}"
    stroke-width="1.5"
  />
  `);

  // Month labels
  for (const month of monthLabels) {
    const x =
      LEFT +
      month.weekIndex * STEP;

    if (x < LEFT || x > WIDTH - 80) continue;

    svg.push(`
    <text
      x="${x}"
      y="25"
      font-family="Arial, Helvetica, sans-serif"
      font-size="11"
      font-weight="500"
      fill="${COLORS.text}"
    >${escapeXml(month.text)}</text>
    `);
  }

  // Weekday labels
  const weekdayLabels = [
    
    { text: "Mon", row: 1 },
    { text: "Wed", row: 3 },
    { text: "Fri", row: 5 },
  ];

  for (const label of weekdayLabels) {
    const y =
      TOP +
      label.row * STEP +
      CELL - 2;

    svg.push(`
    <text
      x="12"
      y="${y}"
      font-family="Arial, Helvetica, sans-serif"
      font-size="10"
      font-weight="500"
      fill="${COLORS.text}"
    >${label.text}</text>
    `);
  }

  // Contribution cells
  for (let week = 0; week < weekCount; week++) {
    for (let day = 0; day < 7; day++) {
      const key = `${week}-${day}`;
      const cell = cellMap.get(key);

      const level = cell?.level ?? 0;

      let fill = COLORS.empty;

      if (level === 1) fill = COLORS.level1;
      if (level === 2) fill = COLORS.level2;
      if (level === 3) fill = COLORS.level3;
      if (level >= 4) fill = COLORS.level4;

      const x =
        LEFT +
        week * STEP;

      const y =
        TOP +
        day * STEP;

      const title = cell
        ? `${cell.date} — ${level} contribution level`
        : "No contributions";

      svg.push(`
      <rect
        x="${x}"
        y="${y}"
        width="${CELL}"
        height="${CELL}"
        rx="3"
        fill="${fill}"
      >
        <title>${escapeXml(title)}</title>
      </rect>
      `);
    }
  }

  // Legend
  const legendY = HEIGHT - 27;

  const legendStartX =
    WIDTH - 180;

  svg.push(`
  <text
    x="${legendStartX - 34}"
    y="${legendY + 10}"
    font-family="Arial, Helvetica, sans-serif"
    font-size="10"
    fill="${COLORS.text}"
  >Less</text>
  `);

  const legendColors = [
    COLORS.empty,
    COLORS.level1,
    COLORS.level2,
    COLORS.level3,
    COLORS.level4,
  ];

  legendColors.forEach((color, index) => {
    svg.push(`
    <rect
      x="${legendStartX + index * 19}"
      y="${legendY}"
      width="13"
      height="13"
      rx="3"
      fill="${color}"
    />
    `);
  });

  svg.push(`
  <text
    x="${legendStartX + legendColors.length * 19 + 5}"
    y="${legendY + 10}"
    font-family="Arial, Helvetica, sans-serif"
    font-size="10"
    fill="${COLORS.text}"
  >More</text>
  `);

  svg.push("</svg>");

  fs.mkdirSync("assets", {
    recursive: true,
  });

  fs.writeFileSync(
    OUTPUT,
    svg.join("\n"),
    "utf8"
  );

  console.log(
    `✓ Generated ${OUTPUT}`
  );
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
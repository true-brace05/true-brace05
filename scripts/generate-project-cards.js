import fs from "fs";

const OUTPUT_DIR = "assets/cards";

const CARD_WIDTH = 520;
const CARD_HEIGHT = 250;

const COLORS = {
  background: "#FCFAFF",
  border: "#DDD0F0",
  title: "#29233D",
  text: "#625A70",
  accent: "#7652C7",
  accentLight: "#EEE6FA",
  tagText: "#6042A5",
  link: "#7652C7",
};

const projects = [
  {
    filename: "orderbook.svg",
    title: "GPU-Accelerated Order Book Simulator",
    description: [
      "CUDA-based limit order book simulator",
      "for benchmarking matching performance",
      "under GPU parallelism.",
    ],
    tags: ["C++", "CUDA"],
    url: "YOUR_ORDERBOOK_REPO",
  },

  {
    filename: "matching-engine.svg",
    title: "C++ Matching Engine",
    description: [
      "High-performance limit order matching",
      "engine focused on price-time priority,",
      "matching and cancellation.",
    ],
    tags: ["C++"],
    url: "YOUR_MATCHING_ENGINE_REPO",
  },

  {
    filename: "brain-tumor.svg",
    title: "Brain Tumor Detection CNN",
    description: [
      "MRI-based tumor classification",
      "project built with Python and CNN",
      "methods.",
    ],
    tags: ["Python", "CNN"],
    url: "YOUR_CNN_HUGGINGFACE_URL",
  },

  {
    filename: "compression.svg",
    title: "Lossless RGB Compression Engine",
    description: [
      "Huffman-coding-based lossless",
      "compression for RGB image data.",
    ],
    tags: ["C++"],
    url: "YOUR_COMPRESSION_REPO",
  },
];

function escapeXml(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&apos;");
}

function createTag(text, x, y, width) {
  return `
    <rect
      x="${x}"
      y="${y}"
      width="${width}"
      height="27"
      rx="13.5"
      fill="${COLORS.accentLight}"
    />

    <text
      x="${x + width / 2}"
      y="${y + 18}"
      text-anchor="middle"
      font-family="Arial, Helvetica, sans-serif"
      font-size="12"
      font-weight="600"
      fill="${COLORS.tagText}"
    >${escapeXml(text)}</text>
  `;
}

function createCard(project) {
  const svg = [];

  svg.push(`
<svg
  xmlns="http://www.w3.org/2000/svg"
  width="${CARD_WIDTH}"
  height="${CARD_HEIGHT}"
  viewBox="0 0 ${CARD_WIDTH} ${CARD_HEIGHT}"
  role="img"
  aria-label="${escapeXml(project.title)}"
>

  <rect
    x="1"
    y="1"
    width="${CARD_WIDTH - 2}"
    height="${CARD_HEIGHT - 2}"
    rx="18"
    fill="${COLORS.background}"
    stroke="${COLORS.border}"
    stroke-width="1.5"
  />
`);

  // Small decorative accent
  svg.push(`
  <rect
    x="24"
    y="24"
    width="6"
    height="42"
    rx="3"
    fill="${COLORS.accent}"
  />
`);

  // Title
  const titleLines = [];

  if (project.title === "GPU-Accelerated Order Book Simulator") {
    titleLines.push(
      "GPU-Accelerated Order Book",
      "Simulator"
    );
  } else if (project.title === "Lossless RGB Compression Engine") {
    titleLines.push(
      "Lossless RGB Compression",
      "Engine"
    );
  } else {
    titleLines.push(project.title);
  }

  titleLines.forEach((line, index) => {
    svg.push(`
    <text
      x="48"
      y="${45 + index * 25}"
      font-family="Arial, Helvetica, sans-serif"
      font-size="18"
      font-weight="700"
      fill="${COLORS.title}"
    >${escapeXml(line)}</text>
    `);
  });

  // Description
  const descriptionStartY =
    100 +
    Math.max(0, titleLines.length - 1) * 8;

  project.description.forEach((line, index) => {
    svg.push(`
    <text
      x="48"
      y="${descriptionStartY + index * 20}"
      font-family="Arial, Helvetica, sans-serif"
      font-size="13"
      font-weight="400"
      fill="${COLORS.text}"
    >${escapeXml(line)}</text>
    `);
  });

  // Tags
  let tagX = 48;
  const tagY = 168;

  for (const tag of project.tags) {
    const tagWidth =
      tag.length * 8 + 24;

    svg.push(
      createTag(
        tag,
        tagX,
        tagY,
        tagWidth
      )
    );

    tagX += tagWidth + 8;
  }

  // Bottom separator
  svg.push(`
  <line
    x1="48"
    y1="211"
    x2="${CARD_WIDTH - 48}"
    y2="211"
    stroke="${COLORS.border}"
    stroke-width="1"
  />
`);

  // Link text
  svg.push(`
  <text
    x="48"
    y="234"
    font-family="Arial, Helvetica, sans-serif"
    font-size="12"
    font-weight="600"
    fill="${COLORS.link}"
  >View repository →</text>
`);

  svg.push(`
</svg>
`);

  return svg.join("\n");
}

fs.mkdirSync(OUTPUT_DIR, {
  recursive: true,
});

for (const project of projects) {
  const outputPath =
    `${OUTPUT_DIR}/${project.filename}`;

  fs.writeFileSync(
    outputPath,
    createCard(project),
    "utf8"
  );

  console.log(`✓ Generated ${outputPath}`);
}

console.log("\nGenerated all project cards.");
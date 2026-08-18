import fs from "node:fs";

const data = JSON.parse(
  fs.readFileSync("data/github.json", "utf8")
);

const metrics = [
  {
    value: data.repositories,
    label: "REPOSITORIES",
    sublabel: "View all →",
  },
  {
    value: data.followers,
    label: "FOLLOWERS",
    sublabel: "View profile →",
  },
  {
    value: data.stars,
    label: "STARS",
    sublabel: "View repositories →",
  },
  {
    value: data.joined,
    label: "JOINED GITHUB",
    sublabel: "View profile →",
  },
];

const width = 1120;
const height = 190;
const cardWidth = 280;

function createMetric(metric, index) {
  const x = index * cardWidth;

  return `
    <g transform="translate(${x}, 0)">
      <!-- Card background -->
      <rect
        x="8"
        y="8"
        width="264"
        height="174"
        rx="20"
        fill="#FFFFFF"
        stroke="#E4DCF5"
        stroke-width="2"
      />

      <!-- Soft accent -->
      <rect
        x="28"
        y="30"
        width="46"
        height="46"
        rx="14"
        fill="#F0E9FF"
      />

      <!-- Simple icon -->
      <circle
        cx="51"
        cy="53"
        r="11"
        fill="none"
        stroke="#8064C8"
        stroke-width="2"
      />

      <path
        d="M45 53h12M51 47v12"
        stroke="#8064C8"
        stroke-width="2"
        stroke-linecap="round"
      />

      <!-- Value -->
      <text
        x="140"
        y="91"
        text-anchor="middle"
        font-family="Arial, Helvetica, sans-serif"
        font-size="38"
        font-weight="700"
        fill="#25213A"
      >${metric.value}</text>

      <!-- Label -->
      <text
        x="140"
        y="119"
        text-anchor="middle"
        font-family="Arial, Helvetica, sans-serif"
        font-size="12"
        font-weight="700"
        letter-spacing="1.4"
        fill="#625A72"
      >${metric.label}</text>

      <!-- Action -->
      <text
        x="140"
        y="150"
        text-anchor="middle"
        font-family="Arial, Helvetica, sans-serif"
        font-size="12"
        fill="#8064C8"
      >${metric.sublabel}</text>
    </g>
  `;
}

const svg = `
<svg
  xmlns="http://www.w3.org/2000/svg"
  width="${width}"
  height="${height}"
  viewBox="0 0 ${width} ${height}"
  role="img"
  aria-label="GitHub profile statistics"
>

  <rect
    width="${width}"
    height="${height}"
    rx="26"
    fill="#FCFAFF"
  />

  ${metrics.map(createMetric).join("\n")}

</svg>
`;

fs.mkdirSync("assets", { recursive: true });

fs.writeFileSync(
  "assets/github-metrics.svg",
  svg.trim()
);

console.log("Generated GitHub metrics:");
console.log(`Repositories: ${data.repositories}`);
console.log(`Followers: ${data.followers}`);
console.log(`Stars: ${data.stars}`);
console.log(`Joined: ${data.joined}`);
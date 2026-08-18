// Hand-written SVG layout engine. No chart library, no template service —
// every shape below is drawn by this code. Sections are composed by
// tracking a running vertical cursor, so the canvas height is computed
// from actual content instead of being hardcoded.

const THEME = {
  width: 940,
  marginX: 40,
  bg: "#0a0e14",
  panel: "#12161d",
  border: "#1f2733",
  text: "#e8ecf1",
  muted: "#6b7688",
  faint: "#40495a",
  accent: "#4fb6ac",
  font: "'Segoe UI', Helvetica, Arial, sans-serif",
  mono: "'SF Mono', 'Consolas', monospace",
};

function esc(str) {
  return String(str)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

function panel(x, y, w, h) {
  return `<rect x="${x}" y="${y}" width="${w}" height="${h}" rx="6" fill="${THEME.panel}" stroke="${THEME.border}" stroke-width="1"/>`;
}

function sectionLabel(x, y, label) {
  return `<text x="${x}" y="${y}" font-family="${THEME.font}" font-size="11" letter-spacing="1.5" fill="${THEME.muted}" font-weight="600">${esc(
    label.toUpperCase()
  )}</text>`;
}

/* ---------- Identity header ---------- */
function buildIdentity({ startY, name, tagline, username }) {
  const h = 90;
  const y = startY;
  const avatarUrl = `https://github.com/${username}.png?size=80`;
  const clipId = "avatarClip";
  return {
    svg: `
      ${panel(THEME.marginX, y, THEME.width - THEME.marginX * 2, h)}
      <defs>
        <clipPath id="${clipId}">
          <circle cx="${THEME.marginX + 45}" cy="${y + 45}" r="28"/>
        </clipPath>
      </defs>
      <circle cx="${THEME.marginX + 45}" cy="${y + 45}" r="29" fill="none" stroke="${THEME.border}" stroke-width="1.5"/>
      <image href="${avatarUrl}" x="${THEME.marginX + 17}" y="${y + 17}" width="56" height="56" clip-path="url(#${clipId})"/>
      <text x="${THEME.marginX + 92}" y="${y + 38}" font-family="${THEME.font}" font-size="23" font-weight="700" fill="${THEME.text}" letter-spacing="0.5">${esc(name)}</text>
      <text x="${THEME.marginX + 92}" y="${y + 60}" font-family="${THEME.font}" font-size="13" fill="${THEME.muted}">${esc(tagline)}</text>
      <text x="${THEME.width - THEME.marginX - 24}" y="${y + 38}" text-anchor="end" font-family="${THEME.mono}" font-size="12" fill="${THEME.faint}">@${esc(username)}</text>
    `,
    endY: y + h,
  };
}

/* ---------- Metric cards row ---------- */
function buildMetrics({ startY, metrics }) {
  const h = 74;
  const gap = 14;
  const totalW = THEME.width - THEME.marginX * 2;
  const cardW = (totalW - gap * (metrics.length - 1)) / metrics.length;
  const y = startY;
  let inner = "";
  metrics.forEach((m, i) => {
    const x = THEME.marginX + i * (cardW + gap);
    inner += panel(x, y, cardW, h);
    inner += `<text x="${x + 16}" y="${y + 30}" font-family="${THEME.mono}" font-size="22" font-weight="700" fill="${THEME.text}">${esc(m.value)}</text>`;
    inner += `<text x="${x + 16}" y="${y + 52}" font-family="${THEME.font}" font-size="10.5" letter-spacing="0.8" fill="${THEME.muted}">${esc(m.label.toUpperCase())}</text>`;
  });
  return { svg: inner, endY: y + h };
}

/* ---------- Contribution heatmap ---------- */
function buildHeatmap({ startY, weeks, totalContributions }) {
  const cell = 9;
  const gap = 2.5;
  const gridW = weeks.length * (cell + gap);
  const gridH = 7 * (cell + gap);
  const panelH = 58 + gridH;
  const y = startY;
  const w = THEME.width - THEME.marginX * 2;

  const counts = weeks.flatMap((wk) => wk.contributionDays.map((d) => d.contributionCount));
  const max = Math.max(1, ...counts);

  const levelColor = (count) => {
    if (count === 0) return "#161b22";
    const ratio = count / max;
    const level = ratio > 0.75 ? 1 : ratio > 0.5 ? 0.75 : ratio > 0.25 ? 0.5 : 0.28;
    return { fill: THEME.accent, opacity: level };
  };

  const gridX = THEME.marginX + 20;
  const gridY = y + 44;

  let cells = "";
  weeks.forEach((wk, wi) => {
    wk.contributionDays.forEach((d, di) => {
      const cx = gridX + wi * (cell + gap);
      const cy = gridY + di * (cell + gap);
      const c = levelColor(d.contributionCount);
      if (c === "#161b22") {
        cells += `<rect x="${cx}" y="${cy}" width="${cell}" height="${cell}" rx="2" fill="${c}"/>`;
      } else {
        cells += `<rect x="${cx}" y="${cy}" width="${cell}" height="${cell}" rx="2" fill="${c.fill}" opacity="${c.opacity}"/>`;
      }
    });
  });

  return {
    svg: `
      ${panel(THEME.marginX, y, w, panelH)}
      ${sectionLabel(THEME.marginX + 20, y + 28, "Contribution Activity — Last 12 Months")}
      <text x="${THEME.width - THEME.marginX - 20}" y="${y + 28}" text-anchor="end" font-family="${THEME.mono}" font-size="11" fill="${THEME.muted}">${totalContributions} total</text>
      ${cells}
    `,
    endY: y + panelH,
  };
}

/* ---------- Language breakdown ---------- */
function buildLanguages({ startY, languages }) {
  const rowH = 22;
  const panelH = 46 + languages.length * rowH + 14;
  const y = startY;
  const w = THEME.width - THEME.marginX * 2;
  const barX = THEME.marginX + 160;
  const barMaxW = w - 160 - 80;

  let rows = "";
  languages.forEach((lang, i) => {
    const ry = y + 46 + i * rowH;
    const barW = Math.max(2, (lang.percent / 100) * barMaxW);
    const opacity = 1 - i * 0.11;
    rows += `<text x="${THEME.marginX + 20}" y="${ry + 10}" font-family="${THEME.font}" font-size="12" fill="${THEME.text}">${esc(lang.name)}</text>`;
    rows += `<rect x="${barX}" y="${ry + 2}" width="${barMaxW}" height="8" rx="4" fill="${THEME.border}"/>`;
    rows += `<rect x="${barX}" y="${ry + 2}" width="${barW}" height="8" rx="4" fill="${THEME.accent}" opacity="${opacity.toFixed(2)}"/>`;
    rows += `<text x="${THEME.width - THEME.marginX - 20}" y="${ry + 10}" text-anchor="end" font-family="${THEME.mono}" font-size="11.5" fill="${THEME.muted}">${lang.percent.toFixed(1)}%</text>`;
  });

  return {
    svg: `
      ${panel(THEME.marginX, y, w, panelH)}
      ${sectionLabel(THEME.marginX + 20, y + 28, "Language Breakdown — by repository bytes")}
      ${rows}
    `,
    endY: y + panelH,
  };
}

/* ---------- Selected projects ---------- */
function buildProjects({ startY, projects }) {
  const gap = 14;
  const cols = 2;
  const cardW = (THEME.width - THEME.marginX * 2 - gap) / cols;
  const cardH = 76;
  const rows = Math.ceil(projects.length / cols);
  const panelH = 46 + rows * cardH + (rows - 1) * 10 + 14;
  const y = startY;
  const w = THEME.width - THEME.marginX * 2;

  let cards = "";
  projects.forEach((p, i) => {
    const col = i % cols;
    const row = Math.floor(i / cols);
    const x = THEME.marginX + 20 + col * (cardW - 10 + gap - 10);
    const cy = y + 44 + row * (cardH + 10);
    const cw = cardW - 20;

    cards += `<rect x="${x}" y="${cy}" width="${cw}" height="${cardH}" rx="5" fill="none" stroke="${THEME.border}" stroke-width="1"/>`;
    cards += `<text x="${x + 14}" y="${cy + 22}" font-family="${THEME.font}" font-size="13" font-weight="600" fill="${THEME.text}">${esc(p.name)}</text>`;

    const words = p.summary.split(" ");
    const maxCharsPerLine = 62;
    let line1 = "";
    let line2 = "";
    for (const word of words) {
      if ((line1 + word).length <= maxCharsPerLine && !line2) {
        line1 += (line1 ? " " : "") + word;
      } else {
        line2 += (line2 ? " " : "") + word;
      }
    }
    cards += `<text x="${x + 14}" y="${cy + 40}" font-family="${THEME.font}" font-size="11" fill="${THEME.muted}">${esc(line1)}</text>`;
    if (line2) {
      cards += `<text x="${x + 14}" y="${cy + 54}" font-family="${THEME.font}" font-size="11" fill="${THEME.muted}">${esc(line2)}</text>`;
    }

    let tagX = x + 14;
    p.tech.forEach((t) => {
      const tw = 8 + t.length * 6.2;
      cards += `<rect x="${tagX}" y="${cy + cardH - 22}" width="${tw}" height="16" rx="3" fill="${THEME.border}"/>`;
      cards += `<text x="${tagX + tw / 2}" y="${cy + cardH - 10}" text-anchor="middle" font-family="${THEME.mono}" font-size="9.5" fill="${THEME.muted}">${esc(t)}</text>`;
      tagX += tw + 6;
    });
  });

  return {
    svg: `
      ${panel(THEME.marginX, y, w, panelH)}
      ${sectionLabel(THEME.marginX + 20, y + 28, "Selected Projects")}
      ${cards}
    `,
    endY: y + panelH,
  };
}

/* ---------- Current focus strip ---------- */
function buildFocus({ startY, items }) {
  const h = 40;
  const y = startY;
  const w = THEME.width - THEME.marginX * 2;
  const text = items.join("     ·     ");
  return {
    svg: `
      ${panel(THEME.marginX, y, w, h)}
      <text x="${THEME.width / 2}" y="${y + 25}" text-anchor="middle" font-family="${THEME.font}" font-size="12.5" letter-spacing="1" fill="${THEME.accent}">${esc(
      text.toUpperCase()
    )}</text>
    `,
    endY: y + h,
  };
}

/* ---------- External profiles footer ---------- */
function buildFooter({ startY, profiles }) {
  const h = 36;
  const y = startY;
  const parts = profiles.map((p) => `${p.label}: ${p.value}`).join("     ·     ");
  return {
    svg: `
      <text x="${THEME.width / 2}" y="${y + h / 2 + 4}" text-anchor="middle" font-family="${THEME.mono}" font-size="11" fill="${THEME.faint}">${esc(parts)}</text>
    `,
    endY: y + h,
  };
}

export function buildDashboard(data) {
  let y = 30;
  let body = "";

  const identity = buildIdentity({ startY: y, name: data.name, tagline: data.tagline, username: data.username });
  body += identity.svg;
  y = identity.endY + 16;

  const metrics = buildMetrics({ startY: y, metrics: data.metrics });
  body += metrics.svg;
  y = metrics.endY + 16;

  const heatmap = buildHeatmap({ startY: y, weeks: data.weeks, totalContributions: data.totalContributions });
  body += heatmap.svg;
  y = heatmap.endY + 16;

  const languages = buildLanguages({ startY: y, languages: data.languages });
  body += languages.svg;
  y = languages.endY + 16;

  const projects = buildProjects({ startY: y, projects: data.selectedProjects });
  body += projects.svg;
  y = projects.endY + 16;

  const focus = buildFocus({ startY: y, items: data.currentFocus });
  body += focus.svg;
  y = focus.endY + 10;

  const footer = buildFooter({ startY: y, profiles: data.externalProfiles });
  body += footer.svg;
  y = footer.endY + 20;

  const totalHeight = y;

  return `<svg width="${THEME.width}" height="${totalHeight}" viewBox="0 0 ${THEME.width} ${totalHeight}" xmlns="http://www.w3.org/2000/svg">
  <rect width="${THEME.width}" height="${totalHeight}" fill="${THEME.bg}"/>
  ${body}
</svg>`;
}

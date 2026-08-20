import json
import os
import urllib.request
import urllib.error
from datetime import datetime

USERNAME = "true-brace05"
OUTPUT = "assets/contributions-trend.svg"

QUERY = """
query($login: String!) {
  user(login: $login) {
    contributionsCollection {
      contributionCalendar {
        weeks {
          contributionDays {
            contributionCount
            date
          }
        }
      }
    }
  }
}
"""


def fetch_contributions():
    token = os.environ["GITHUB_TOKEN"]

    payload = json.dumps({
        "query": QUERY,
        "variables": {"login": USERNAME}
    }).encode()

    request = urllib.request.Request(
        "https://api.github.com/graphql",
        data=payload,
        headers={
            "Authorization": f"Bearer {token}",
            "Content-Type": "application/json",
            "User-Agent": "github-contribution-graph"
        },
        method="POST"
    )

    with urllib.request.urlopen(request) as response:
        data = json.loads(response.read())

    if "errors" in data:
        raise RuntimeError(data["errors"])

    return data["data"]["user"]["contributionsCollection"][
        "contributionCalendar"
    ]["weeks"]


def weekly_totals(weeks):
    result = []

    for week in weeks:
        total = sum(
            day["contributionCount"]
            for day in week["contributionDays"]
        )

        result.append(total)

    return result[-52:]


def smooth(values):
    """
    Light smoothing so the graph looks like an activity trajectory
    rather than a jagged stock chart.
    """
    if len(values) < 3:
        return values

    output = []

    for i in range(len(values)):
        left = values[max(0, i - 1)]
        current = values[i]
        right = values[min(len(values) - 1, i + 1)]

        output.append((left + current * 2 + right) / 4)

    return output


def create_svg(values):
    width = 600
    height = 300

    left = 55
    right = 25
    top = 60
    bottom = 55

    chart_width = width - left - right
    chart_height = height - top - bottom

    max_value = max(values) if values else 1

    # Give the graph a little breathing room.
    max_value = max(max_value, 1) * 1.15

    points = []

    for i, value in enumerate(values):
        x = left + (
            i / max(1, len(values) - 1)
        ) * chart_width

        y = (
            top
            + chart_height
            - (value / max_value) * chart_height
        )

        points.append((x, y))

    # Smooth the visual curve using quadratic Bézier segments.
    path = ""

    if points:
        path = f"M {points[0][0]:.2f} {points[0][1]:.2f}"

        for i in range(1, len(points)):
            x1, y1 = points[i - 1]
            x2, y2 = points[i]

            mid_x = (x1 + x2) / 2

            path += (
                f" Q {x1:.2f} {y1:.2f}, "
                f"{mid_x:.2f} {(y1 + y2) / 2:.2f}"
            )

            path += (
                f" T {x2:.2f} {y2:.2f}"
            )

    # Area below the curve.
    area_path = (
        path
        + f" L {points[-1][0]:.2f} {top + chart_height}"
        + f" L {points[0][0]:.2f} {top + chart_height}"
        + " Z"
    )

    # Month labels.
    months = [
        "Sep", "Oct", "Nov", "Dec",
        "Jan", "Feb", "Mar", "Apr",
        "May", "Jun", "Jul", "Aug"
    ]

    month_labels = ""

    for i, month in enumerate(months):
        x = left + (i / 11) * chart_width

        month_labels += f"""
        <text
          x="{x:.1f}"
          y="{height - 18}"
          text-anchor="middle"
          class="month"
        >{month}</text>
        """

    # Latest activity number.
    latest = values[-1] if values else 0

    svg = f"""<?xml version="1.0" encoding="UTF-8"?>
<svg
  xmlns="http://www.w3.org/2000/svg"
  width="{width}"
  height="{height}"
  viewBox="0 0 {width} {height}"
>
  <defs>

    <linearGradient
      id="purpleArea"
      x1="0"
      y1="0"
      x2="0"
      y2="1"
    >
      <stop
        offset="0%"
        stop-color="#7C3AED"
        stop-opacity="0.20"
      />
      <stop
        offset="100%"
        stop-color="#7C3AED"
        stop-opacity="0.00"
      />
    </linearGradient>

    <filter
      id="glow"
      x="-20%"
      y="-20%"
      width="140%"
      height="140%"
    >
      <feGaussianBlur
        stdDeviation="3"
        result="blur"
      />
      <feMerge>
        <feMergeNode in="blur"/>
        <feMergeNode in="SourceGraphic"/>
      </feMerge>
    </filter>

    <style>
      .title {{
        font-family:
          -apple-system,
          BlinkMacSystemFont,
          "Segoe UI",
          sans-serif;
        font-size: 16px;
        font-weight: 700;
        fill: #32137A;
      }}

      .subtitle {{
        font-family:
          -apple-system,
          BlinkMacSystemFont,
          "Segoe UI",
          sans-serif;
        font-size: 11px;
        font-weight: 600;
        fill: #6D28D9;
        letter-spacing: 1px;
      }}

      .month {{
        font-family:
          -apple-system,
          BlinkMacSystemFont,
          "Segoe UI",
          sans-serif;
        font-size: 10px;
        fill: #6B6B80;
      }}

      .axis {{
        stroke: #E9DDFB;
        stroke-width: 1;
      }}
    </style>
  </defs>

  <!-- Header -->
  <text
    x="24"
    y="28"
    class="title"
  >GITHUB CONTRIBUTIONS</text>

  <text
    x="24"
    y="46"
    class="subtitle"
  >ACTIVITY TREND · LAST 12 MONTHS</text>

  <!-- Baseline -->
  <line
    x1="{left}"
    y1="{top + chart_height}"
    x2="{width - right}"
    y2="{top + chart_height}"
    class="axis"
  />

  <!-- Subtle horizontal guide -->
  <line
    x1="{left}"
    y1="{top + chart_height / 2}"
    x2="{width - right}"
    y2="{top + chart_height / 2}"
    class="axis"
    opacity="0.5"
  />

  <!-- Filled area -->
  <path
    d="{area_path}"
    fill="url(#purpleArea)"
  />

  <!-- Glow -->
  <path
    d="{path}"
    fill="none"
    stroke="#A855F7"
    stroke-width="7"
    stroke-linecap="round"
    stroke-linejoin="round"
    opacity="0.18"
    filter="url(#glow)"
  />

  <!-- Main line -->
  <path
    d="{path}"
    fill="none"
    stroke="#6D28D9"
    stroke-width="2.5"
    stroke-linecap="round"
    stroke-linejoin="round"
  />

  <!-- Activity points -->
  {
    "".join(
        f'<circle cx="{x:.2f}" cy="{y:.2f}" r="3.2" '
        f'fill="#6D28D9" stroke="#FFFFFF" stroke-width="1.5"/>'
        for x, y in points[::4]
    )
  }

  <!-- Current value -->
  <text
    x="{width - right}"
    y="{top + 5}"
    text-anchor="end"
    class="subtitle"
  >{latest} / WEEK</text>

  {month_labels}

</svg>
"""

    return svg


def main():
    weeks = fetch_contributions()
    values = weekly_totals(weeks)
    values = smooth(values)

    svg = create_svg(values)

    os.makedirs(os.path.dirname(OUTPUT), exist_ok=True)

    with open(OUTPUT, "w", encoding="utf-8") as file:
        file.write(svg)

    print(f"Generated {OUTPUT}")


if __name__ == "__main__":
    main()
import json
import os
import time
import urllib.error
import urllib.request
from datetime import datetime, timedelta
from pathlib import Path

ROOT_DIR = Path(__file__).resolve().parent.parent


def load_env_file():
    env_path = ROOT_DIR / ".env"
    if not env_path.exists():
        return

    for raw_line in env_path.read_text(encoding="utf-8").splitlines():
        line = raw_line.strip()
        if not line or line.startswith("#") or "=" not in line:
            continue

        key, value = line.split("=", 1)
        key = key.strip()
        value = value.strip().strip("\"'")
        os.environ.setdefault(key, value)


load_env_file()

USERNAME = os.environ.get("GITHUB_USERNAME", "true-brace05")
OUTPUT = ROOT_DIR / "assets" / "contribution-graph.svg"
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


def start_of_sunday(value):
    return value - timedelta(days=(value.weekday() + 1) % 7)


def fetch_graphql(payload, headers):
    last_error = None

    for attempt in range(4):
        try:
            request = urllib.request.Request(
                "https://api.github.com/graphql",
                data=json.dumps(payload).encode("utf-8"),
                headers={
                    "Content-Type": "application/json",
                    "User-Agent": "true-brace05-dashboard",
                    **headers,
                },
                method="POST",
            )
            with urllib.request.urlopen(request, timeout=30) as response:
                return json.loads(response.read().decode("utf-8"))
        except urllib.error.HTTPError as exc:
            body = exc.read().decode("utf-8", errors="replace")
            last_error = RuntimeError(
                f"GitHub API error (HTTP {exc.code}): {body[:300]}"
            )
            if exc.code in (429, 403, 500, 502, 503, 504) and attempt < 3:
                time.sleep(2 ** attempt)
                continue
            raise last_error
        except urllib.error.URLError as exc:
            last_error = RuntimeError(f"Network error: {exc}")
            if attempt < 3:
                time.sleep(2 ** attempt)
                continue
            raise last_error

    if last_error:
        raise last_error

    raise RuntimeError("GitHub GraphQL request failed")


def fetch_contributions():
    token = os.environ.get("GITHUB_TOKEN")
    headers = {}

    if token:
        headers["Authorization"] = f"Bearer {token}"

    payload = {
        "query": QUERY,
        "variables": {"login": USERNAME},
    }

    max_attempts = 5
    for attempt in range(max_attempts):
        data = fetch_graphql(payload, headers)

        if "errors" in data:
            details = data["errors"]
            if any("rate limit" in str(item).lower() for item in details):
                if attempt < max_attempts - 1:
                    delay = 2 ** attempt
                    print(
                        f"Rate limit hit, retrying in {delay}s... "
                        f"(attempt {attempt + 2}/{max_attempts})"
                    )
                    time.sleep(delay)
                    continue
                raise RuntimeError(
                    "GitHub API rate limit hit after retries. "
                    "Add a GITHUB_TOKEN secret for more capacity, "
                    "or the graph will keep the last successful version."
                )
            raise RuntimeError(f"GitHub GraphQL errors: {details}")

        user = data.get("data", {}).get("user")
        if not user:
            raise RuntimeError(f"GitHub user '{USERNAME}' was not found.")

        weeks = user["contributionsCollection"]["contributionCalendar"]["weeks"]
        if not weeks:
            raise RuntimeError("GitHub contribution data is empty for this profile.")

        return weeks

    raise RuntimeError("GitHub GraphQL request failed after maximum retries")


def weekly_totals(weeks):
    totals = []
    for week in weeks:
        totals.append(
            sum(day.get("contributionCount", 0) for day in week.get("contributionDays", []))
        )
    return totals[-52:]


def smooth(values):
    if len(values) < 3:
        return values

    result = []
    for index, current in enumerate(values):
        left = values[max(0, index - 1)]
        right = values[min(len(values) - 1, index + 1)]
        result.append((left + current * 2 + right) / 4)
    return result


def month_labels_for_weeks(weeks):
    all_dates = []
    for week in weeks:
        for day in week.get("contributionDays", []):
            date_value = day.get("date")
            if date_value:
                all_dates.append(datetime.strptime(date_value, "%Y-%m-%d").date())

    if not all_dates:
        return []

    first_date = min(all_dates)
    last_date = max(all_dates)
    first_sunday = start_of_sunday(first_date)

    month_starts = []
    cursor = first_date.replace(day=1)
    while cursor <= last_date:
        month_starts.append(cursor)
        if cursor.month == 12:
            cursor = cursor.replace(year=cursor.year + 1, month=1, day=1)
        else:
            cursor = cursor.replace(month=cursor.month + 1, day=1)

    labels = []
    for month_start in month_starts:
        start = start_of_sunday(month_start)
        week_index = (start - first_sunday).days // 7
        if week_index < 0:
            week_index = 0
        labels.append({
            "text": month_start.strftime("%b"),
            "week_index": min(len(weeks) - 1, week_index),
        })

    return labels


def create_svg(values, month_labels):
    width = 600
    height = 300
    left = 55
    right = 25
    top = 60
    bottom = 55
    chart_width = width - left - right
    chart_height = height - top - bottom

    if not values:
        raise RuntimeError("No contribution values available to render.")

    max_value = max(values) if values else 1
    max_value = max(max_value, 1) * 1.15

    points = []
    for index, value in enumerate(values):
        x = left + (index / max(1, len(values) - 1)) * chart_width
        y = top + chart_height - (value / max_value) * chart_height
        points.append((x, y))

    path = ""
    area_path = ""
    if points:
        path = f"M {points[0][0]:.2f} {points[0][1]:.2f}"
        for index in range(1, len(points)):
            x1, y1 = points[index - 1]
            x2, y2 = points[index]
            mid_x = (x1 + x2) / 2
            mid_y = (y1 + y2) / 2
            path += f" Q {x1:.2f} {y1:.2f}, {mid_x:.2f} {mid_y:.2f}"
            path += f" T {x2:.2f} {y2:.2f}"
        area_path = (
            path
            + f" L {points[-1][0]:.2f} {top + chart_height}"
            + f" L {points[0][0]:.2f} {top + chart_height} Z"
        )

    month_label_svg = ""
    for label in month_labels:
        x = left + (label["week_index"] / max(1, len(values) - 1)) * chart_width
        month_label_svg += f"""
        <text
          x="{x:.1f}"
          y="{height - 18}"
          text-anchor="middle"
          class="month"
        >{label['text']}</text>
        """

    latest = values[-1] if values else 0
    activity_points = "".join(
        f'<circle cx="{x:.2f}" cy="{y:.2f}" r="3.2" fill="#6D28D9" stroke="#FFFFFF" stroke-width="1.5"/>'
        for x, y in points[::4]
    )

    return f'''<?xml version="1.0" encoding="UTF-8"?>

<svg
  xmlns="http://www.w3.org/2000/svg"
  width="{width}"
  height="{height}"
  viewBox="0 0 {width} {height}"
>

  <defs>
    <linearGradient id="purpleArea" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0%" stop-color="#7C3AED" stop-opacity="0.20" />
      <stop offset="100%" stop-color="#7C3AED" stop-opacity="0" />
    </linearGradient>

    <filter id="glow" x="-20%" y="-20%" width="140%" height="140%">
      <feGaussianBlur stdDeviation="3" result="blur" />
      <feMerge>
        <feMergeNode in="blur" />
        <feMergeNode in="SourceGraphic" />
      </feMerge>
    </filter>

    <style>
      .title {{
        font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
        font-size: 16px;
        font-weight: 700;
        fill: #32137A;
      }}
      .subtitle {{
        font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
        font-size: 11px;
        font-weight: 600;
        fill: #6D28D9;
        letter-spacing: 1px;
      }}
      .month {{
        font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
        font-size: 10px;
        fill: #6B6B80;
      }}
      .axis {{
        stroke: #E9DDFB;
        stroke-width: 1;
      }}
    </style>
  </defs>

  <text x="24" y="28" class="title">GITHUB CONTRIBUTIONS</text>
  <text x="24" y="46" class="subtitle">ACTIVITY TREND · LAST 12 MONTHS</text>

  <line x1="{left}" y1="{top + chart_height}" x2="{width - right}" y2="{top + chart_height}" class="axis" />
  <line x1="{left}" y1="{top + chart_height / 2}" x2="{width - right}" y2="{top + chart_height / 2}" class="axis" opacity="0.5" />

  <path d="{area_path}" fill="url(#purpleArea)" />
  <path d="{path}" fill="none" stroke="#A855F7" stroke-width="7" stroke-linecap="round" stroke-linejoin="round" opacity="0.18" filter="url(#glow)" />
  <path d="{path}" fill="none" stroke="#6D28D9" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" />

  {activity_points}

  <text x="{width - right}" y="{top + 5}" text-anchor="end" class="subtitle">{latest:.1f} / WEEK</text>

  {month_label_svg}

</svg>
'''


def main():
    try:
        weeks = fetch_contributions()
    except Exception as exc:  # pragma: no cover - handled below
        if OUTPUT.exists():
            print(f"Warning: could not refresh contribution graph ({exc}). Keeping the previous version.")
            return
        raise

    values = weekly_totals(weeks)
    values = smooth(values)
    month_labels = month_labels_for_weeks(weeks)
    svg = create_svg(values, month_labels)

    OUTPUT.parent.mkdir(parents=True, exist_ok=True)
    OUTPUT.write_text(svg, encoding="utf-8")
    print(f"Generated {OUTPUT}")


if __name__ == "__main__":
    main()

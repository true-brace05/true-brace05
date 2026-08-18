// All GitHub data access lives here. Nothing in this file draws anything —
// it only fetches and returns raw data so the rest of the pipeline can stay
// dumb and testable.

const REST_ROOT = "https://api.github.com";
const GRAPHQL_ROOT = "https://api.github.com/graphql";

async function ghREST(path, token) {
  const res = await fetch(`${REST_ROOT}${path}`, {
    headers: {
      Authorization: `Bearer ${token}`,
      Accept: "application/vnd.github+json",
      "X-GitHub-Api-Version": "2022-11-28",
    },
  });
  if (!res.ok) {
    throw new Error(`GitHub REST ${path} -> ${res.status} ${await res.text()}`);
  }
  return res.json();
}

async function ghGraphQL(query, variables, token) {
  const res = await fetch(GRAPHQL_ROOT, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ query, variables }),
  });
  const json = await res.json();
  if (json.errors) {
    throw new Error(`GitHub GraphQL -> ${JSON.stringify(json.errors)}`);
  }
  return json.data;
}

/** Basic account info: followers, created_at (used for "years active"), etc. */
export async function fetchUser(username, token) {
  return ghREST(`/users/${username}`, token);
}

/** All non-fork repos owned by the user. Forked repos are excluded so stars
 *  and language stats reflect work actually authored, not upstream code. */
export async function fetchOwnedRepos(username, token) {
  const repos = [];
  let page = 1;
  // 100 is the max page size the REST API allows.
  while (true) {
    const batch = await ghREST(
      `/users/${username}/repos?per_page=100&page=${page}&type=owner`,
      token
    );
    repos.push(...batch);
    if (batch.length < 100) break;
    page += 1;
  }
  return repos.filter((r) => !r.fork);
}

/** Byte-count-per-language for a single repo, straight from GitHub's own
 *  linguist analysis. This is the same data source GitHub uses for the
 *  language bar shown on a repo's own page — no estimation involved. */
export async function fetchLanguagesForRepo(fullName, token) {
  return ghREST(`/repos/${fullName}/languages`, token);
}

/** Daily contribution calendar for the last 12 months, same source as the
 *  green squares on github.com/<user>. Requires GraphQL — REST has no
 *  equivalent endpoint. */
export async function fetchContributionCalendar(username, token) {
  const query = `
    query($login: String!) {
      user(login: $login) {
        contributionsCollection {
          contributionCalendar {
            totalContributions
            weeks {
              contributionDays {
                date
                contributionCount
              }
            }
          }
        }
      }
    }
  `;
  const data = await ghGraphQL(query, { login: username }, token);
  return data.user.contributionsCollection.contributionCalendar;
}

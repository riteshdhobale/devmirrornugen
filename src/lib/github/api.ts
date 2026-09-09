/**
 * Minimal typed client for the public GitHub REST API.
 * Unauthenticated (60 req/hr per IP) — enough for one analysis (~14 requests).
 */

export class GitHubError extends Error {
  constructor(
    public status: number,
    message: string,
  ) {
    super(message);
    this.name = "GitHubError";
  }
}

export interface GhUser {
  login: string;
  name: string | null;
  bio: string | null;
  avatar_url: string;
  followers: number;
  public_repos: number;
}

export interface GhRepo {
  name: string;
  full_name: string;
  fork: boolean;
  description: string | null;
  language: string | null;
  stargazers_count: number;
  size: number; // KB
  topics: string[];
  pushed_at: string;
  created_at: string;
}

/**
 * How a GitHub call is authenticated, best first:
 * - connectionKey: the signed-in user's own GitHub connection (lovack_*) via
 *   the connector gateway — spends *their* 5,000 req/hr quota.
 * - token: a direct bearer token (server-side GITHUB_TOKEN secret) —
 *   5,000 req/hr shared server budget.
 * - neither: unauthenticated (60 req/hr per IP).
 */
export interface GitHubAccess {
  connectionKey?: string | undefined;
  token?: string | undefined;
}

/** Optional server-wide token (GITHUB_TOKEN secret), set only from server code. */
let serverToken: string | undefined;

export function setGitHubToken(token: string | undefined) {
  serverToken = token?.trim() || undefined;
}

async function gh<T>(path: string, access?: GitHubAccess): Promise<T> {
  const headers: Record<string, string> = {
    Accept: "application/vnd.github+json",
    "User-Agent": "DevMirror-Developer-Intelligence",
    "X-GitHub-Api-Version": "2022-11-28",
  };
  const configuredTokens = [
    access?.token,
    serverToken,
    process.env["GITHUB_TOKEN"],
    process.env["GITHUB_FINE_GRAINED_PERSONAL_ACCESS_TOKEN"],
  ].filter((token, index, tokens): token is string => Boolean(token) && tokens.indexOf(token) === index);

  const fetchDirect = (token?: string) =>
    fetch(`https://api.github.com${path}`, {
      headers: token ? { ...headers, Authorization: `Bearer ${token}` } : headers,
    });

  let res: Response;
  if (access?.connectionKey) {
    const lovableKey = process.env["LOVABLE_API_KEY"];
    if (!lovableKey) throw new Error("LOVABLE_API_KEY is not configured");
    headers["Authorization"] = `Bearer ${lovableKey}`;
    headers["X-Connection-Api-Key"] = access.connectionKey;
    res = await fetch(`https://connector-gateway.lovable.dev/github${path}`, { headers });

    // A user's connector is preferred, but it must never make the app less
    // reliable than anonymous usage. If their connection is expired, denied,
    // or throttled, immediately retry against GitHub with the shared token.
    if (res.status === 401 || res.status === 403 || res.status === 429) {
      for (const token of configuredTokens) {
        res = await fetchDirect(token);
        if (res.status !== 401 && res.status !== 403 && res.status !== 429) break;
      }
    }
  } else {
    res = await fetchDirect(configuredTokens[0]);
    for (const token of configuredTokens.slice(1)) {
      if (res.status !== 401 && res.status !== 403 && res.status !== 429) break;
      res = await fetchDirect(token);
    }
  }
  if (res.status === 404) throw new GitHubError(404, "Not found");
  if (res.status === 403 || res.status === 429) {
    const reset = res.headers.get("x-ratelimit-reset");
    const remaining = res.headers.get("x-ratelimit-remaining");
    const mins = reset ? Math.max(1, Math.ceil((Number(reset) * 1000 - Date.now()) / 60000)) : null;
    if (res.status === 403 && remaining !== "0") {
      throw new GitHubError(403, "GitHub denied this request. Try again, or reconnect GitHub from your account.");
    }
    throw new GitHubError(
      res.status,
      mins ? `GitHub rate limit reached — try again in ~${mins} min` : "GitHub rate limit reached",
    );
  }
  if (!res.ok) throw new GitHubError(res.status, `GitHub request failed (${res.status})`);
  return (await res.json()) as T;
}

export const fetchUser = (login: string, access?: GitHubAccess) =>
  gh<GhUser>(`/users/${encodeURIComponent(login)}`, access);

export const fetchRepos = (login: string, access?: GitHubAccess) =>
  gh<GhRepo[]>(`/users/${encodeURIComponent(login)}/repos?per_page=100&sort=pushed&type=owner`, access);

/** Language -> bytes written for one repo. */
export const fetchLanguages = (fullName: string, access?: GitHubAccess) =>
  gh<Record<string, number>>(`/repos/${fullName}/languages`, access);

/** Names of files/dirs at the repository root (Dockerfile, .github, tests, ...). */
export const fetchRootEntries = async (
  fullName: string,
  access?: GitHubAccess,
): Promise<string[]> => {
  const entries = await gh<{ name: string; type: string }[]>(`/repos/${fullName}/contents`, access);
  return entries.map((e) => e.name.toLowerCase());
};

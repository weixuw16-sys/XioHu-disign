export const OWNER = "weixuw16-sys";
export const REPOSITORY = "XioHu-disign";
export const BRANCH = "main";
export const MAX_FILE_SIZE = 15 * 1024 * 1024;

export interface ManagerSession {
  github_token: string;
  github_login: string;
  expires_at: string;
}

export interface Work {
  id: string;
  category: "brand" | "illustration" | "photo" | "motion";
  type: "image" | "video";
  title: string;
  description: string;
  media: string;
  alt: string;
  featured: boolean;
}

function requiredEnv(name: string): string {
  const value = Deno.env.get(name);
  if (!value) throw new Error(`Server configuration missing: ${name}`);
  return value;
}

export function appUrl(): URL {
  const url = new URL(requiredEnv("APP_URL"));
  if (url.protocol !== "https:" || !url.pathname.endsWith("/admin.html")) {
    throw new Error("APP_URL must be the HTTPS admin.html URL");
  }
  return url;
}

export function supabaseUrl(): string {
  return requiredEnv("SUPABASE_URL").replace(/\/+$/, "");
}

function serviceHeaders(): HeadersInit {
  const key = requiredEnv("SUPABASE_SERVICE_ROLE_KEY");
  return {
    apikey: key,
    Authorization: `Bearer ${key}`,
    "Content-Type": "application/json",
  };
}

export function jsonResponse(
  data: unknown,
  status: number,
  cors: HeadersInit,
): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: { ...cors, "Content-Type": "application/json; charset=utf-8" },
  });
}

export function redirectResponse(url: URL, cookie: string): Response {
  return new Response(null, {
    status: 302,
    headers: {
      Location: url.toString(),
      "Set-Cookie": cookie,
      "Cache-Control": "no-store",
    },
  });
}

export function clearStateCookie(): string {
  return "xiohu_oauth_state=; HttpOnly; Secure; SameSite=Lax; Path=/functions/v1/github-auth; Max-Age=0";
}

export function getCookie(request: Request, name: string): string | null {
  const cookies = request.headers.get("cookie") || "";
  const prefix = `${name}=`;
  const entry = cookies.split(";").map((part) => part.trim()).find((part) =>
    part.startsWith(prefix)
  );
  return entry ? decodeURIComponent(entry.slice(prefix.length)) : null;
}

function base64Url(bytes: Uint8Array): string {
  let binary = "";
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(
    /=+$/,
    "",
  );
}

export function randomId(): string {
  return crypto.randomUUID();
}

export async function hashSessionId(sessionId: string): Promise<string> {
  const digest = await crypto.subtle.digest(
    "SHA-256",
    new TextEncoder().encode(sessionId),
  );
  return Array.from(
    new Uint8Array(digest),
    (byte) => byte.toString(16).padStart(2, "0"),
  ).join("");
}

export function makeOAuthState(): string {
  return base64Url(crypto.getRandomValues(new Uint8Array(32)));
}

export async function supabaseTable(
  path: string,
  init: RequestInit = {},
): Promise<Response> {
  return await fetch(`${supabaseUrl()}/rest/v1/${path}`, {
    ...init,
    headers: { ...serviceHeaders(), ...init.headers },
  });
}

export async function storeManagerSession(
  sessionId: string,
  githubToken: string,
  githubLogin: string,
): Promise<void> {
  const idHash = await hashSessionId(sessionId);
  const response = await supabaseTable("manager_sessions", {
    method: "POST",
    headers: { Prefer: "resolution=merge-duplicates,return=minimal" },
    body: JSON.stringify({
      id_hash: idHash,
      github_token: githubToken,
      github_login: githubLogin,
      expires_at: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
    }),
  });
  if (!response.ok) {
    throw new Error(`Could not store manager session (${response.status})`);
  }
}

export async function getManagerSession(
  sessionId: string | null,
): Promise<ManagerSession> {
  if (!sessionId || !/^[0-9a-f-]{36}$/i.test(sessionId)) {
    throw new Error("登录会话无效，请重新使用 GitHub 登录。");
  }
  const idHash = await hashSessionId(sessionId);
  const query = new URLSearchParams({
    id_hash: `eq.${idHash}`,
    select: "github_token,github_login,expires_at",
    limit: "1",
  });
  const response = await supabaseTable(`manager_sessions?${query.toString()}`);
  if (!response.ok) {
    throw new Error(`Could not validate manager session (${response.status})`);
  }
  const sessions = await response.json() as ManagerSession[];
  const session = sessions[0];
  if (!session || Date.parse(session.expires_at) <= Date.now()) {
    if (session) await deleteManagerSession(idHash);
    throw new Error("登录会话已过期，请重新使用 GitHub 登录。");
  }
  return session;
}

export async function deleteManagerSession(idHash: string): Promise<void> {
  const query = new URLSearchParams({ id_hash: `eq.${idHash}` });
  const response = await supabaseTable(`manager_sessions?${query.toString()}`, {
    method: "DELETE",
  });
  if (!response.ok) {
    throw new Error(`Could not revoke manager session (${response.status})`);
  }
}

export function githubHeaders(token: string): HeadersInit {
  return {
    Accept: "application/vnd.github+json",
    Authorization: `Bearer ${token}`,
    "X-GitHub-Api-Version": "2022-11-28",
    "Content-Type": "application/json",
  };
}

export async function githubApi<T extends object = Record<string, unknown>>(
  token: string,
  path: string,
  init: RequestInit = {},
): Promise<T> {
  const response = await fetch(
    `https://api.github.com/repos/${OWNER}/${REPOSITORY}${path}`,
    {
      ...init,
      headers: { ...githubHeaders(token), ...init.headers },
    },
  );
  const text = await response.text();
  let body: unknown = {};
  try {
    body = text ? JSON.parse(text) : {};
  } catch {
    body = {};
  }
  if (!response.ok) {
    const message = body && typeof body === "object" && "message" in body
      ? body.message
      : null;
    const reason = typeof message === "string" ? message : response.statusText;
    throw new Error(`GitHub API (${response.status}): ${reason}`);
  }
  return body as T;
}

function decodeBase64Utf8(value: string): string {
  const binary = atob(value.replace(/\s/g, ""));
  const bytes = Uint8Array.from(binary, (character) => character.charCodeAt(0));
  return new TextDecoder().decode(bytes);
}

export async function getPortfolioState(token: string): Promise<{
  works: Work[];
  commitSha: string;
  treeSha: string;
}> {
  const reference = await githubApi<{ object: { sha: string } }>(
    token,
    `/git/ref/heads/${BRANCH}`,
  );
  const commitSha = reference.object.sha;
  const commit = await githubApi<{ tree: { sha: string } }>(
    token,
    `/git/commits/${commitSha}`,
  );
  const file = await githubApi<{ content?: string; encoding?: string }>(
    token,
    `/contents/data/works.json?ref=${encodeURIComponent(commitSha)}`,
  );
  if (!file.content || file.encoding !== "base64") {
    throw new Error("GitHub 作品数据文件格式无效。");
  }
  const works = JSON.parse(decodeBase64Utf8(file.content));
  if (!Array.isArray(works)) throw new Error("GitHub 作品数据必须是数组。");
  return { works, commitSha, treeSha: commit.tree.sha };
}

export function validateWork(work: unknown): asserts work is Work {
  if (!work || typeof work !== "object") throw new Error("作品数据无效。");
  const value = work as Partial<Work>;
  if (!/^work-[0-9a-f-]{36}$/i.test(value.id || "")) {
    throw new Error("作品 ID 无效。");
  }
  if (
    !["brand", "illustration", "photo", "motion"].includes(value.category || "")
  ) {
    throw new Error("作品分类无效。");
  }
  if (!["image", "video"].includes(value.type || "")) {
    throw new Error("媒体类型无效。");
  }
  if (!value.title?.trim() || value.title.length > 100) {
    throw new Error("作品名称必须为 1–100 个字符。");
  }
  if (typeof value.description !== "string" || value.description.length > 500) {
    throw new Error("作品介绍不能超过 500 个字符。");
  }
  if (typeof value.featured !== "boolean") {
    throw new Error("首页精选设置无效。");
  }
}

export async function commitPortfolio(
  token: string,
  state: { works: Work[]; commitSha: string; treeSha: string },
  updatedWorks: Work[],
  options: {
    filePath?: string;
    fileContent?: string;
    removedPath?: string;
    message: string;
  },
): Promise<void> {
  const tree: Record<string, unknown>[] = [{
    path: "data/works.json",
    mode: "100644",
    type: "blob",
    content: `${JSON.stringify(updatedWorks, null, 2)}\n`,
  }];

  if (options.filePath && options.fileContent) {
    const raw = options.fileContent.replace(/\s/g, "");
    let size: number;
    try {
      size = atob(raw).length;
    } catch {
      throw new Error("上传文件的 Base64 数据无效。");
    }
    if (size > MAX_FILE_SIZE) {
      throw new Error("文件超过 15 MB，请压缩后再上传。");
    }
    const path = options.filePath;
    if (
      !/^works-assets\/[0-9a-f-]{36}\.(?:jpg|png|webp|gif|mp4|webm)$/i.test(
        path,
      )
    ) {
      throw new Error("上传文件路径无效。");
    }
    const blob = await githubApi<{ sha: string }>(token, "/git/blobs", {
      method: "POST",
      body: JSON.stringify({ content: raw, encoding: "base64" }),
    });
    tree.push({ path, mode: "100644", type: "blob", sha: blob.sha });
  }

  if (
    options.removedPath &&
    !updatedWorks.some((work) => work.media === `./${options.removedPath}`)
  ) {
    if (
      !/^works-assets\/[0-9a-f-]{36}\.(?:jpg|png|webp|gif|mp4|webm)$/i.test(
        options.removedPath,
      )
    ) {
      throw new Error("待删除媒体路径无效。");
    }
    tree.push({
      path: options.removedPath,
      mode: "100644",
      type: "blob",
      sha: null,
    });
  }

  const newTree = await githubApi<{ sha: string }>(token, "/git/trees", {
    method: "POST",
    body: JSON.stringify({ base_tree: state.treeSha, tree }),
  });
  const commit = await githubApi<{ sha: string }>(token, "/git/commits", {
    method: "POST",
    body: JSON.stringify({
      message: options.message,
      tree: newTree.sha,
      parents: [state.commitSha],
    }),
  });
  await githubApi(token, `/git/refs/heads/${BRANCH}`, {
    method: "PATCH",
    body: JSON.stringify({ sha: commit.sha, force: false }),
  });
}

export function appCors(request: Request): HeadersInit {
  const origin = appUrl().origin;
  const requestOrigin = request.headers.get("origin");
  if (requestOrigin && requestOrigin !== origin) {
    throw new Error("来源网站未获授权。");
  }
  return {
    "Access-Control-Allow-Origin": origin,
    "Access-Control-Allow-Headers":
      "apikey, authorization, content-type, x-manager-session",
    "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
    "Access-Control-Max-Age": "86400",
    Vary: "Origin",
  };
}

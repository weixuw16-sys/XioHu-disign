import {
  appCors,
  appUrl,
  clearStateCookie,
  getCookie,
  hashSessionId,
  jsonResponse,
  makeOAuthState,
  OWNER,
  randomId,
  redirectResponse,
  REPOSITORY,
  storeManagerSession,
  supabaseTable,
} from "../_shared/manager.ts";

function env(name: string): string {
  const value = Deno.env.get(name);
  if (!value) throw new Error(`Server configuration missing: ${name}`);
  return value;
}

function cookie(value: string): string {
  return `xiohu_oauth_state=${
    encodeURIComponent(value)
  }; HttpOnly; Secure; SameSite=Lax; Path=/functions/v1/github-auth; Max-Age=600`;
}

function redirectError(code: string): Response {
  const target = appUrl();
  target.searchParams.set("auth_error", code);
  return redirectResponse(target, clearStateCookie());
}

function startLogin(): Response {
  const state = makeOAuthState();
  const authorize = new URL("https://github.com/login/oauth/authorize");
  authorize.searchParams.set("client_id", env("GITHUB_CLIENT_ID"));
  authorize.searchParams.set(
    "redirect_uri",
    `${
      env("SUPABASE_URL").replace(/\/+$/, "")
    }/functions/v1/github-auth/callback`,
  );
  authorize.searchParams.set("scope", "public_repo");
  authorize.searchParams.set("state", state);
  return redirectResponse(authorize, cookie(state));
}

async function handleCallback(request: Request): Promise<Response> {
  const query = new URL(request.url).searchParams;
  const providerError = query.get("error");
  if (providerError === "access_denied") {
    return redirectError("github_access_denied");
  }

  const code = query.get("code");
  const state = query.get("state");
  const stateCookie = getCookie(request, "xiohu_oauth_state");
  if (!code || !state || !stateCookie || state !== stateCookie) {
    return redirectError("oauth_callback_failed");
  }

  const exchange = await fetch("https://github.com/login/oauth/access_token", {
    method: "POST",
    headers: { Accept: "application/json", "Content-Type": "application/json" },
    body: JSON.stringify({
      client_id: env("GITHUB_CLIENT_ID"),
      client_secret: env("GITHUB_CLIENT_SECRET"),
      code,
      redirect_uri: `${
        env("SUPABASE_URL").replace(/\/+$/, "")
      }/functions/v1/github-auth/callback`,
      state,
    }),
  });
  const exchangeBody = await exchange.json() as { access_token?: string };
  if (!exchange.ok || !exchangeBody.access_token) {
    return redirectError("oauth_callback_failed");
  }

  const githubToken = String(exchangeBody.access_token);
  const userResponse = await fetch("https://api.github.com/user", {
    headers: {
      Accept: "application/vnd.github+json",
      Authorization: `Bearer ${githubToken}`,
      "X-GitHub-Api-Version": "2022-11-28",
    },
  });
  if (!userResponse.ok) return redirectError("oauth_callback_failed");
  const user = await userResponse.json() as { login?: string };
  if (user.login !== OWNER) return redirectError("github_account_not_allowed");

  const repositoryResponse = await fetch(
    `https://api.github.com/repos/${OWNER}/${REPOSITORY}`,
    {
      headers: {
        Accept: "application/vnd.github+json",
        Authorization: `Bearer ${githubToken}`,
        "X-GitHub-Api-Version": "2022-11-28",
      },
    },
  );
  if (!repositoryResponse.ok) {
    return redirectError("github_repository_access_denied");
  }
  const repository = await repositoryResponse.json() as {
    permissions?: { push?: boolean };
  };
  if (repository.permissions?.push !== true) {
    return redirectError("github_repository_access_denied");
  }

  const sessionId = randomId();
  await storeManagerSession(sessionId, githubToken, user.login);

  const cleanup = await supabaseTable(
    `manager_sessions?expires_at=lt.${
      encodeURIComponent(new Date().toISOString())
    }`,
    { method: "DELETE" },
  );
  if (!cleanup.ok) {
    console.error("Expired manager session cleanup failed:", cleanup.status);
  }

  const destination = appUrl();
  destination.hash = `manager_session=${encodeURIComponent(sessionId)}`;
  return redirectResponse(destination, clearStateCookie());
}

Deno.serve(async (request) => {
  try {
    if (request.method === "OPTIONS") {
      return new Response(null, { status: 204, headers: appCors(request) });
    }
    const url = new URL(request.url);
    if (
      request.method === "GET" && url.searchParams.get("action") === "start"
    ) {
      return startLogin();
    }
    if (request.method === "GET" && url.pathname.endsWith("/callback")) {
      return await handleCallback(request);
    }
    if (request.method === "POST") {
      const cors = appCors(request);
      const origin = new URL(env("APP_URL")).origin;
      if (request.headers.get("origin") !== origin) {
        return jsonResponse({ error: "来源网站未获授权。" }, 403, cors);
      }
      const body = await request.json();
      if (body.action !== "logout") {
        return jsonResponse({ error: "请求操作无效。" }, 400, {});
      }
      const sessionId = request.headers.get("x-manager-session");
      if (!sessionId) {
        return jsonResponse({ error: "登录会话不存在。" }, 401, {});
      }
      const idHash = await hashSessionId(sessionId);
      const query = new URLSearchParams({ id_hash: `eq.${idHash}` });
      const response = await supabaseTable(`manager_sessions?${query}`, {
        method: "DELETE",
      });
      if (!response.ok) {
        throw new Error(
          `Could not revoke manager session (${response.status})`,
        );
      }
      return jsonResponse({ ok: true }, 200, cors);
    }
    return new Response("Method not allowed", { status: 405 });
  } catch (error) {
    console.error("GitHub OAuth handler failed:", error);
    if (request.method === "GET") return redirectError("oauth_callback_failed");
    const message = error instanceof Error ? error.message : "服务器请求失败。";
    const origin = Deno.env.get("APP_URL");
    return jsonResponse(
      { error: message },
      500,
      origin ? { "Access-Control-Allow-Origin": new URL(origin).origin } : {},
    );
  }
});

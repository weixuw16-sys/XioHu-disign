const alphabet = "23456789ABCDEFGHJKLMNPQRSTUVWXYZ";
const encoder = new TextEncoder();
const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "apikey, content-type, x-couple-token",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

class RequestError extends Error {
  constructor(message: string, readonly status: number) {
    super(message);
  }
}

interface FirebaseServiceAccount {
  project_id: string;
  client_email: string;
  private_key: string;
  token_uri?: string;
}

let cachedGoogleAccessToken: { value: string; expiresAt: number } | null = null;

function requiredEnv(name: string): string {
  const value = Deno.env.get(name);
  if (!value) throw new Error(`Server configuration missing: ${name}`);
  return value.replace(/\/+$/, "");
}

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json; charset=utf-8" },
  });
}

async function digest(value: string): Promise<string> {
  const bytes = await crypto.subtle.digest("SHA-256", encoder.encode(value));
  return Array.from(new Uint8Array(bytes), byte => byte.toString(16).padStart(2, "0")).join("");
}

function randomString(length: number): string {
  const bytes = crypto.getRandomValues(new Uint8Array(length));
  return Array.from(bytes, byte => alphabet[byte % alphabet.length]).join("");
}

function validateName(value: unknown): string {
  if (typeof value !== "string") throw new RequestError("请填写昵称。", 400);
  const name = value.trim();
  if (!name || name.length > 30) {
    throw new RequestError("昵称需要在 1 到 30 个字之间。", 400);
  }
  return name;
}

function validateMessage(value: unknown, maxLength: number): string {
  if (typeof value !== "string") throw new RequestError("请先写下一段想说的话。", 400);
  const message = value.trim();
  if (!message || message.length > maxLength) {
    throw new RequestError(`内容需要在 1 到 ${maxLength} 个字之间。`, 400);
  }
  return message;
}

function serviceHeaders(extra: HeadersInit = {}): Headers {
  return new Headers({
    apikey: requiredEnv("SUPABASE_SERVICE_ROLE_KEY"),
    Authorization: `Bearer ${requiredEnv("SUPABASE_SERVICE_ROLE_KEY")}`,
    "Content-Type": "application/json",
    ...Object.fromEntries(new Headers(extra)),
  });
}

async function rest(path: string, init: RequestInit = {}): Promise<unknown> {
  const response = await fetch(`${requiredEnv("SUPABASE_URL")}/rest/v1/${path}`, {
    ...init,
    headers: serviceHeaders(init.headers),
  });
  const text = await response.text();
  if (!response.ok) {
    console.error("Couple sync database request failed:", response.status, text);
    throw new Error("暂时无法连接小小宇宙服务器，请稍后重试。");
  }
  return text ? JSON.parse(text) : null;
}

function base64Url(value: string | Uint8Array): string {
  const bytes = typeof value === "string" ? encoder.encode(value) : value;
  let binary = "";
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary).replace(/=/g, "").replace(/\+/g, "-").replace(/\//g, "_");
}

async function getGoogleAccessToken(account: FirebaseServiceAccount): Promise<string> {
  if (cachedGoogleAccessToken && cachedGoogleAccessToken.expiresAt > Date.now() + 60_000) {
    return cachedGoogleAccessToken.value;
  }

  const now = Math.floor(Date.now() / 1000);
  const unsigned = [
    base64Url(JSON.stringify({ alg: "RS256", typ: "JWT" })),
    base64Url(JSON.stringify({
      iss: account.client_email,
      scope: "https://www.googleapis.com/auth/firebase.messaging",
      aud: account.token_uri || "https://oauth2.googleapis.com/token",
      iat: now,
      exp: now + 3600,
    })),
  ].join(".");
  const pem = account.private_key.replace(/\\n/g, "\n");
  const keyBytes = Uint8Array.from(
    atob(pem.replace(/-----BEGIN PRIVATE KEY-----|-----END PRIVATE KEY-----|\s/g, "")),
    character => character.charCodeAt(0),
  );
  const key = await crypto.subtle.importKey(
    "pkcs8",
    keyBytes,
    { name: "RSASSA-PKCS1-v1_5", hash: "SHA-256" },
    false,
    ["sign"],
  );
  const signature = await crypto.subtle.sign("RSASSA-PKCS1-v1_5", key, encoder.encode(unsigned));
  const assertion = `${unsigned}.${base64Url(new Uint8Array(signature))}`;
  const tokenResponse = await fetch(account.token_uri || "https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      grant_type: "urn:ietf:params:oauth:grant-type:jwt-bearer",
      assertion,
    }),
  });
  const tokenResult = await tokenResponse.json();
  if (!tokenResponse.ok || typeof tokenResult.access_token !== "string") {
    throw new Error(`Google OAuth token request failed: ${JSON.stringify(tokenResult)}`);
  }
  cachedGoogleAccessToken = {
    value: tokenResult.access_token,
    expiresAt: Date.now() + Number(tokenResult.expires_in || 3600) * 1000,
  };
  return cachedGoogleAccessToken.value;
}

async function sendWakePush(coupleId: string, recipientRole: "boy" | "girl", message: string): Promise<boolean> {
  const serviceAccountValue = Deno.env.get("FIREBASE_SERVICE_ACCOUNT_JSON");
  if (!serviceAccountValue) {
    console.warn("Firebase push is not configured; wake message was saved without a push notification.");
    return false;
  }

  const account = JSON.parse(serviceAccountValue) as FirebaseServiceAccount;
  if (!account.project_id || !account.client_email || !account.private_key) {
    throw new Error("Firebase service account configuration is incomplete.");
  }
  const rows = await rest(
    `love_push_tokens?select=token&couple_id=eq.${coupleId}&role=eq.${recipientRole}`,
  ) as Array<{ token: string }>;
  if (!rows.length) return false;

  const accessToken = await getGoogleAccessToken(account);
  const results = await Promise.all(rows.map(async ({ token }) => {
    const response = await fetch(
      `https://fcm.googleapis.com/v1/projects/${encodeURIComponent(account.project_id)}/messages:send`,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${accessToken}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          message: {
            token,
            notification: {
              title: "收到一份新的想念 ♡",
              body: message.slice(0, 160),
            },
            data: { route: "wake.html" },
            android: { priority: "high" },
          },
        }),
      },
    );
    if (!response.ok) {
      console.error("Firebase push request failed:", response.status, await response.text());
    }
    return response.ok;
  }));
  return results.some(Boolean);
}

interface Couple {
  id: string;
  invite_hash: string;
  invite_expires_at: string;
  boy_token_hash: string;
  girl_token_hash: string | null;
  boy_name: string;
  girl_name: string | null;
  confession: string;
  confession_status: "pending" | "accepted";
  created_at: string;
  paired_at: string | null;
  accepted_at: string | null;
}

async function findCouple(tokenHash: string): Promise<{ couple: Couple; role: "boy" | "girl" }> {
  const rows = await rest(
    `love_couples?select=*&or=(boy_token_hash.eq.${tokenHash},girl_token_hash.eq.${tokenHash})&limit=1`,
  ) as Couple[];
  const couple = rows[0];
  if (!couple) throw new Error("没有找到这组配对，请重新输入配对码。");
  return {
    couple,
    role: couple.boy_token_hash === tokenHash ? "boy" : "girl",
  };
}

function publicState(couple: Couple, role: "boy" | "girl") {
  return {
    couple: {
      id: couple.id,
      boyName: couple.boy_name,
      girlName: couple.girl_name,
      confession: couple.confession,
      confessionStatus: couple.confession_status,
      createdAt: couple.created_at,
      pairedAt: couple.paired_at,
      acceptedAt: couple.accepted_at,
    },
    role,
  };
}

Deno.serve(async request => {
  if (request.method === "OPTIONS") return new Response(null, { status: 204, headers: corsHeaders });
  if (request.method !== "POST") return jsonResponse({ error: "仅支持 POST 请求。" }, 405);

  try {
    const rawBody = await request.text();
    if (rawBody.length > 4096) return jsonResponse({ error: "请求内容太长。" }, 413);
    const body = JSON.parse(rawBody);
    if (!body || typeof body !== "object" || typeof body.action !== "string") {
      return jsonResponse({ error: "请求内容无效。" }, 400);
    }

    if (body.action === "create-invite") {
      if (body.role !== "boy") return jsonResponse({ error: "请由男生账号创建这次表白。" }, 400);
      const boyName = validateName(body.name);
      const confession = validateMessage(body.confession, 1000);
      const pairToken = randomString(48);
      const boyTokenHash = await digest(pairToken);
      const expiresAt = new Date(Date.now() + 7 * 86400000).toISOString();

      for (let attempt = 0; attempt < 3; attempt += 1) {
        const inviteCode = randomString(10);
        const inviteHash = await digest(inviteCode);
        const created = await rest(
          "love_couples?select=id,invite_expires_at",
          {
            method: "POST",
            headers: { Prefer: "return=representation" },
            body: JSON.stringify({
              invite_hash: inviteHash,
              invite_expires_at: expiresAt,
              boy_token_hash: boyTokenHash,
              boy_name: boyName,
              confession,
            }),
          },
        ) as Array<{ id: string; invite_expires_at: string }>;
        if (created[0]) {
          return jsonResponse({
            pairId: created[0].id,
            pairToken,
            inviteCode,
            inviteExpiresAt: created[0].invite_expires_at,
            role: "boy",
          });
        }
      }
      throw new Error("配对码暂时无法生成，请重试。");
    }

    if (body.action === "join-invite") {
      if (body.role !== "girl") return jsonResponse({ error: "请输入男生分享给你的配对码。" }, 400);
      const girlName = validateName(body.name);
      if (typeof body.code !== "string" || !/^[23456789A-HJ-NP-Z]{10}$/i.test(body.code.trim())) {
        return jsonResponse({ error: "配对码格式不正确，请检查后重试。" }, 400);
      }
      const inviteHash = await digest(body.code.trim().toUpperCase());
      const pairToken = randomString(48);
      const girlTokenHash = await digest(pairToken);
      const joined = await rest(
        `love_couples?invite_hash=eq.${inviteHash}&invite_expires_at=gt.${encodeURIComponent(new Date().toISOString())}&girl_token_hash=is.null&select=id`,
        {
          method: "PATCH",
          headers: { Prefer: "return=representation" },
          body: JSON.stringify({
            girl_token_hash: girlTokenHash,
            girl_name: girlName,
            paired_at: new Date().toISOString(),
          }),
        },
      ) as Array<{ id: string }>;
      if (!joined[0]) return jsonResponse({ error: "配对码无效、已过期或已被使用，请让对方重新生成。" }, 404);
      return jsonResponse({ pairId: joined[0].id, pairToken, role: "girl" });
    }

    const pairToken = request.headers.get("x-couple-token");
    if (!pairToken || pairToken.length < 32) {
      return jsonResponse({ error: "请先完成两个人的配对。" }, 401);
    }
    const { couple, role } = await findCouple(await digest(pairToken));

    if (body.action === "register-device") {
      if (typeof body.token !== "string" || body.token.length < 20 || body.token.length > 4096) {
        return jsonResponse({ error: "手机通知设备信息无效。" }, 400);
      }
      await rest("love_push_tokens?on_conflict=couple_id,token", {
        method: "POST",
        headers: { Prefer: "resolution=merge-duplicates,return=minimal" },
        body: JSON.stringify({
          couple_id: couple.id,
          role,
          token: body.token,
          updated_at: new Date().toISOString(),
        }),
      });
      return jsonResponse({ registered: true });
    }

    if (body.action === "get-state") {
      const messages = await rest(
        `love_wake_messages?select=id,sender_role,body,created_at,received_at&couple_id=eq.${couple.id}&order=created_at.desc&limit=100`,
      );
      return jsonResponse({ ...publicState(couple, role), messages });
    }

    if (body.action === "send-wake") {
      if (!couple.paired_at) return jsonResponse({ error: "等对方加入后，就可以互相发送想念啦。" }, 409);
      const message = validateMessage(body.message, 300);
      const created = await rest("love_wake_messages?select=id,sender_role,body,created_at,received_at", {
        method: "POST",
        headers: { Prefer: "return=representation" },
        body: JSON.stringify({ couple_id: couple.id, sender_role: role, body: message }),
      }) as unknown[];
      const pushSent = await sendWakePush(
        couple.id,
        role === "boy" ? "girl" : "boy",
        message,
      ).catch(error => {
        console.error("Wake message push notification failed:", error);
        return false;
      });
      return jsonResponse({ message: created[0], pushSent });
    }

    if (body.action === "ack-wake") {
      if (typeof body.messageId !== "string") return jsonResponse({ error: "这条想念不存在。" }, 400);
      const acknowledged = await rest(
        `love_wake_messages?id=eq.${encodeURIComponent(body.messageId)}&couple_id=eq.${couple.id}&sender_role=neq.${role}&received_at=is.null&select=id`,
        {
          method: "PATCH",
          headers: { Prefer: "return=representation" },
          body: JSON.stringify({ received_at: new Date().toISOString() }),
        },
      ) as unknown[];
      if (!acknowledged.length) return jsonResponse({ error: "这条想念已经确认，或暂时无法确认。" }, 409);
      return jsonResponse({ received: true });
    }

    if (body.action === "delete-wake") {
      if (typeof body.messageId !== "string") return jsonResponse({ error: "这条想念不存在。" }, 400);
      const deleted = await rest(
        `love_wake_messages?id=eq.${encodeURIComponent(body.messageId)}&couple_id=eq.${couple.id}&sender_role=eq.${role}&select=id`,
        { method: "DELETE", headers: { Prefer: "return=representation" } },
      ) as unknown[];
      if (!deleted.length) return jsonResponse({ error: "只能删除自己送出的想念。" }, 403);
      return jsonResponse({ deleted: true });
    }

    if (body.action === "accept-confession") {
      if (role !== "girl") return jsonResponse({ error: "只有收到表白的人可以确认。" }, 403);
      if (!couple.paired_at) return jsonResponse({ error: "请先完成配对。" }, 409);
      const accepted = await rest(
        `love_couples?id=eq.${couple.id}&girl_token_hash=eq.${await digest(pairToken)}&confession_status=eq.pending&select=accepted_at`,
        {
          method: "PATCH",
          headers: { Prefer: "return=representation" },
          body: JSON.stringify({
            confession_status: "accepted",
            accepted_at: new Date().toISOString(),
          }),
        },
      ) as Array<{ accepted_at: string }>;
      if (!accepted[0]) return jsonResponse({ error: "这封表白已经确认啦。" }, 409);
      return jsonResponse({ acceptedAt: accepted[0].accepted_at });
    }

    return jsonResponse({ error: "不支持这个操作。" }, 400);
  } catch (error) {
    if (error instanceof SyntaxError) return jsonResponse({ error: "请求内容不是有效的 JSON。" }, 400);
    if (error instanceof RequestError) return jsonResponse({ error: error.message }, error.status);
    console.error("Couple sync request failed:", error);
    return jsonResponse({
      error: error instanceof Error ? error.message : "暂时无法连接小小宇宙服务器，请稍后重试。",
    }, 500);
  }
});

import {
  appCors,
  commitPortfolio,
  getManagerSession,
  getPortfolioState,
  jsonResponse,
  MAX_FILE_SIZE,
  validateWork,
  Work,
} from "../_shared/manager.ts";

function fileByteLength(value: string): number {
  try {
    return atob(value.replace(/\s/g, "")).length;
  } catch {
    throw new Error("上传文件的 Base64 数据无效。");
  }
}

Deno.serve(async (request) => {
  let cors: HeadersInit = {};
  try {
    cors = appCors(request);
    if (request.method === "OPTIONS") {
      return new Response(null, { status: 204, headers: cors });
    }
    if (request.method !== "POST") {
      return jsonResponse({ error: "仅支持 POST 请求。" }, 405, cors);
    }

    const session = await getManagerSession(
      request.headers.get("x-manager-session"),
    );
    const body = await request.json();
    if (body.action === "list") {
      const state = await getPortfolioState(session.github_token);
      return jsonResponse({ works: state.works }, 200, cors);
    }

    const state = await getPortfolioState(session.github_token);
    if (body.action === "upload-asset") {
      const file = body.file;
      if (
        !file || typeof file.path !== "string" ||
        typeof file.content !== "string"
      ) {
        throw new Error("上传文件数据缺失。");
      }
      if (
        !/^works-assets\/[0-9a-f-]{36}\.(?:jpg|png|webp|gif|mp4|webm)$/i.test(
          file.path,
        )
      ) {
        throw new Error("上传文件路径无效。");
      }
      if (fileByteLength(file.content) > MAX_FILE_SIZE) {
        throw new Error("文件超过 15 MB，请压缩后再上传。");
      }
      await commitPortfolio(session.github_token, state, state.works, {
        filePath: file.path,
        fileContent: file.content,
        message: "Upload portfolio work media",
      });
      return jsonResponse({ ok: true }, 200, cors);
    }

    if (body.action === "delete-assets") {
      if (
        !Array.isArray(body.paths) || body.paths.length < 1 ||
        body.paths.length > 20 ||
        body.paths.some((path: unknown) => typeof path !== "string")
      ) {
        throw new Error("待清理文件列表无效。");
      }
      await commitPortfolio(session.github_token, state, state.works, {
        removedPaths: body.paths,
        message: "Clean up incomplete portfolio work upload",
      });
      return jsonResponse({ ok: true }, 200, cors);
    }

    if (body.action === "publish") {
      validateWork(body.work);
      const work = body.work as Work;
      const file = body.file;
      if (file !== undefined) {
        if (
          !file || typeof file.path !== "string" ||
          typeof file.content !== "string"
        ) {
          throw new Error("上传文件数据缺失。");
        }
        if (fileByteLength(file.content) > MAX_FILE_SIZE) {
          throw new Error("文件超过 15 MB，请压缩后再上传。");
        }
        if (work.media !== `./${file.path}`) {
          throw new Error("作品媒体路径与上传文件不匹配。");
        }
      } else if (!work.mediaItems?.length) {
        throw new Error("作品图片数据缺失。");
      }
      if (state.works.some((item) => item.id === work.id)) {
        throw new Error("作品 ID 已存在，请重试。");
      }
      let featuredCount = work.featured ? 1 : 0;
      const retainedWorks = state.works.map((item) => {
        if (!item.featured) return item;
        if (featuredCount < 4) {
          featuredCount += 1;
          return item;
        }
        return { ...item, featured: false };
      });
      const updatedWorks = [work, ...retainedWorks];

      await commitPortfolio(session.github_token, state, updatedWorks, {
        ...(file ? { filePath: file.path, fileContent: file.content } : {}),
        message: `Add portfolio work: ${work.title}`,
      });
      return jsonResponse({ works: updatedWorks }, 200, cors);
    }

    if (body.action === "delete") {
      if (typeof body.id !== "string") throw new Error("待删除作品 ID 无效。");
      const work = state.works.find((item) => item.id === body.id);
      if (!work) {
        return jsonResponse(
          { error: "这个作品已被移除，请刷新页面。" },
          404,
          cors,
        );
      }
      const updatedWorks = state.works.filter((item) => item.id !== body.id);
      const mediaItems = work.mediaItems?.length
        ? work.mediaItems
        : [work.media];
      const removedPaths = mediaItems
        .filter((path) => path.startsWith("./works-assets/"))
        .map((path) => path.slice(2));
      await commitPortfolio(session.github_token, state, updatedWorks, {
        removedPaths,
        message: `Remove portfolio work: ${work.title}`,
      });
      return jsonResponse({ works: updatedWorks }, 200, cors);
    }

    return jsonResponse({ error: "请求操作无效。" }, 400, cors);
  } catch (error) {
    console.error("Portfolio manager request failed:", error);
    const message = error instanceof Error ? error.message : "服务器请求失败。";
    const status = message.includes("登录会话") ? 401 : 400;
    return jsonResponse({ error: message }, status, cors);
  }
});

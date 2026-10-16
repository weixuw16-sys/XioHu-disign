import {
  appCors,
  commitPortfolio,
  createPortfolioUploadBlob,
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

    if (body.action === "upload") {
      if (
        !body.file || typeof body.file.path !== "string" ||
        typeof body.file.content !== "string"
      ) {
        throw new Error("上传文件数据缺失。");
      }
      const sha = await createPortfolioUploadBlob(
        session.github_token,
        body.file.path,
        body.file.content,
      );
      return jsonResponse({ sha }, 200, cors);
    }

    const state = await getPortfolioState(session.github_token);
    if (body.action === "publish") {
      validateWork(body.work);
      const work = body.work as Work;
      const uploads: Array<{ path: string; sha: string }> = Array.isArray(
          body.uploads,
        )
        ? body.uploads
        : [];
      const expectedPaths = work.type === "image"
        ? work.images || [work.media]
        : [work.media];
      const uploadedPaths = uploads.map((upload) => upload?.path);
      if (
        uploads.length !== expectedPaths.length ||
        uploadedPaths.some((path, index) =>
          path !== expectedPaths[index]?.slice(2)
        ) ||
        uploads.some((upload) =>
          !upload || typeof upload.path !== "string" ||
          typeof upload.sha !== "string" ||
          !/^[0-9a-f]{40}$/i.test(upload.sha)
        )
      ) {
        if (body.file) {
          const file = body.file;
          if (
            typeof file.path !== "string" ||
            typeof file.content !== "string" ||
            work.media !== `./${file.path}`
          ) {
            throw new Error("作品媒体路径与上传文件不匹配。");
          }
          if (fileByteLength(file.content) > MAX_FILE_SIZE) {
            throw new Error("文件超过 15 MB，请压缩后再上传。");
          }
          uploads.push({
            path: file.path,
            sha: await createPortfolioUploadBlob(
              session.github_token,
              file.path,
              file.content,
            ),
          });
        } else {
          throw new Error("作品图片尚未全部上传，请重新发布。");
        }
      }
      if (
        uploads.length !== expectedPaths.length ||
        expectedPaths.some((path, index) =>
          uploads[index].path !== path.slice(2)
        )
      ) {
        throw new Error("作品媒体路径与上传文件不匹配。");
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
        uploads,
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
      const mediaPaths = [
        work.media,
        ...(Array.isArray(work.images) ? work.images : []),
      ];
      const removedPaths = mediaPaths.flatMap((path) =>
        path.startsWith("./works-assets/") ? [path.slice(2)] : []
      );
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

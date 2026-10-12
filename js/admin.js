(() => {
    const OWNER = "weixuw16-sys";
    const REPOSITORY = "XioHu-disign";
    const MAX_FILE_SIZE = 15 * 1024 * 1024;
    const config = {
        url: "https://gttcyzjomilimqrrnrow.supabase.co",
        anonKey: "sb_publishable_Xw21vpSBcy-Y5hU5nd10Yw_6vzitsxi"
    };
    const SESSION_PREFIX = "xiohu-manager-session:";
    const CATEGORY_LABELS = {
        brand: "品牌设计",
        illustration: "插画",
        photo: "摄影",
        motion: "动画 / 视频"
    };
    let sessionId = "";
    let works = [];

    const status = document.getElementById("adminStatus");
    const authPanel = document.getElementById("authPanel");
    const workspace = document.getElementById("adminWorkspace");
    const githubLoginButton = document.getElementById("githubLoginButton");
    const workForm = document.getElementById("workForm");
    const publishButton = document.getElementById("publishButton");
    const installButton = document.getElementById("installButton");
    const managedWorks = document.getElementById("managedWorks");

    if ("serviceWorker" in navigator) {
        window.addEventListener("load", () => {
            navigator.serviceWorker.register("./service-worker.js").catch(error => {
                console.error("Service worker registration failed:", error);
            });
        });
    }

    function isInstalled() {
        return window.matchMedia("(display-mode: standalone)").matches || navigator.standalone === true;
    }

    if (isInstalled()) installButton.hidden = true;

    let installPrompt = null;
    window.addEventListener("beforeinstallprompt", event => {
        event.preventDefault();
        installPrompt = event;
        installButton.hidden = false;
    });
    window.addEventListener("appinstalled", () => {
        installPrompt = null;
        installButton.hidden = true;
        showStatus("作品管理应用已安装到主屏幕。", "success");
    });
    installButton.addEventListener("click", async () => {
        if (installPrompt) {
            installPrompt.prompt();
            await installPrompt.userChoice;
            installPrompt = null;
            return;
        }
        if (/iphone|ipad|ipod/i.test(navigator.userAgent) && !isInstalled()) {
            showStatus("在 Safari 中点“分享”按钮，再选择“添加到主屏幕”。");
            return;
        }
        showStatus("在浏览器菜单中选择“安装应用”或“添加到主屏幕”。");
    });

    function showStatus(message, kind) {
        status.textContent = message;
        status.dataset.kind = kind || "info";
        status.classList.add("visible");
    }

    function sessionStorageKey() {
        return `${SESSION_PREFIX}${config.url}`;
    }

    function clearSession() {
        sessionId = "";
        if (config) localStorage.removeItem(sessionStorageKey());
    }

    function getFunctionUrl(name) {
        return `${config.url}/functions/v1/${name}`;
    }

    async function backend(name, options = {}) {
        const response = await fetch(getFunctionUrl(name), {
            ...options,
            headers: {
                apikey: config.anonKey,
                ...(options.body ? { "Content-Type": "application/json" } : {}),
                ...(sessionId ? { "x-manager-session": sessionId } : {}),
                ...options.headers
            }
        });
        const text = await response.text();
        let body;
        try {
            body = text ? JSON.parse(text) : {};
        } catch {
            body = {};
        }
        if (!response.ok) {
            throw new Error(body.error || `管理服务请求失败 (${response.status})。请检查 Supabase Functions 部署和项目设置。`);
        }
        return body;
    }

    async function loadWorks() {
        showStatus("正在安全连接作品仓库…");
        const response = await backend("github-manager", {
            method: "POST",
            body: JSON.stringify({ action: "list" })
        });
        if (!Array.isArray(response.works)) throw new Error("服务器返回的作品数据格式无效。");
        return response.works;
    }

    function renderWorks() {
        managedWorks.replaceChildren();
        document.getElementById("workCount").textContent = `${works.length} 个作品`;
        if (works.length === 0) {
            const empty = document.createElement("p");
            empty.textContent = "暂时没有发布作品。";
            managedWorks.appendChild(empty);
            return;
        }

        works.forEach(work => {
            const row = document.createElement("article");
            row.className = "managed-work";
            const mediaUrl = new URL(work.media, window.location.href).href;
            let preview;
            if (work.type === "video") {
                preview = document.createElement("video");
                preview.muted = true;
                preview.preload = "metadata";
                preview.src = mediaUrl;
            } else {
                preview = document.createElement("img");
                preview.src = mediaUrl;
                preview.alt = "";
                preview.loading = "lazy";
            }
            const meta = document.createElement("div");
            meta.className = "managed-work-meta";
            const title = document.createElement("strong");
            title.textContent = work.title;
            const details = document.createElement("span");
            details.textContent = `${CATEGORY_LABELS[work.category] || work.category}${work.featured ? " · 首页精选" : ""}`;
            meta.append(title, details);
            const remove = document.createElement("button");
            remove.className = "delete-button";
            remove.type = "button";
            remove.textContent = "删除";
            remove.addEventListener("click", () => deleteWork(work));
            row.append(preview, meta, remove);
            managedWorks.appendChild(row);
        });
    }

    function setConnected(nextWorks) {
        works = nextWorks;
        authPanel.hidden = true;
        workspace.hidden = false;
        renderWorks();
        showStatus(`已通过 GitHub 账号 ${OWNER} 安全登录。此设备会记住登录状态 30 天。`, "success");
    }

    function encodeBase64(bytes) {
        let binary = "";
        const chunkSize = 0x8000;
        for (let offset = 0; offset < bytes.length; offset += chunkSize) {
            binary += String.fromCharCode(...bytes.subarray(offset, offset + chunkSize));
        }
        return btoa(binary);
    }

    async function deleteWork(work) {
        if (!window.confirm(`确定删除「${work.title}」吗？这会从作品集移除此作品${work.media.startsWith("./works-assets/") ? "及其上传文件" : ""}。`)) return;
        showStatus("正在安全提交删除操作…");
        managedWorks.querySelectorAll("button").forEach(button => { button.disabled = true; });
        try {
            const result = await backend("github-manager", {
                method: "POST",
                body: JSON.stringify({ action: "delete", id: work.id })
            });
            works = result.works;
            renderWorks();
            showStatus("作品已删除。GitHub Pages 更新后，访客将看不到该作品。", "success");
        } catch (error) {
            showStatus(error.message, "error");
            renderWorks();
        }
    }

    function getFileExtension(file) {
        const allowed = {
            "image/jpeg": "jpg",
            "image/png": "png",
            "image/webp": "webp",
            "image/gif": "gif",
            "video/mp4": "mp4",
            "video/webm": "webm"
        };
        return allowed[file.type] || "";
    }

    function makeId() {
        return crypto.randomUUID ? crypto.randomUUID() : `${Date.now()}-${Math.random().toString(16).slice(2)}`;
    }

    const oauthError = new URLSearchParams(window.location.search).get("auth_error");
    if (oauthError) {
        history.replaceState(null, "", window.location.pathname);
        const messages = {
            github_access_denied: "你取消了 GitHub 授权。",
            github_account_not_allowed: `请使用仓库所有者 GitHub 账号 ${OWNER} 登录。`,
            github_repository_access_denied: `GitHub 账号没有 ${OWNER}/${REPOSITORY} 的写入权限。`,
            oauth_callback_failed: "GitHub 登录未完成，请重新尝试；如果仍失败，请检查 Supabase OAuth 设置。"
        };
        showStatus(messages[oauthError] || "GitHub 登录失败，请重新尝试。", "error");
    }

    const callbackParams = new URLSearchParams(window.location.hash.slice(1));
    const callbackSession = callbackParams.get("manager_session");
    if (callbackSession) {
        sessionId = callbackSession;
        localStorage.setItem(sessionStorageKey(), sessionId);
        history.replaceState(null, "", window.location.pathname);
        showStatus("GitHub 登录成功，正在载入作品…", "success");
    } else if (config) {
        sessionId = localStorage.getItem(sessionStorageKey()) || "";
    }

    githubLoginButton.addEventListener("click", () => {
        const url = getFunctionUrl("github-auth");
        window.location.assign(`${url}?action=start`);
    });

    async function restoreSession() {
        if (!config || !sessionId) return;
        try {
            const nextWorks = await loadWorks();
            setConnected(nextWorks);
        } catch (error) {
            clearSession();
            showStatus(`登录会话无效或已过期：${error.message} 请重新使用 GitHub 登录。`, "error");
        }
    }

    restoreSession();

    workForm.addEventListener("submit", async event => {
        event.preventDefault();
        const formData = new FormData(workForm);
        const file = formData.get("media");
        const extension = file instanceof File ? getFileExtension(file) : "";
        if (!extension) {
            showStatus("请选择受支持的图片或 MP4/WebM 视频文件。", "error");
            return;
        }
        if (file.size > MAX_FILE_SIZE) {
            showStatus("文件超过 15 MB，请压缩后再上传。", "error");
            return;
        }

        const id = makeId();
        const title = String(formData.get("title")).trim();
        const work = {
            id: `work-${id}`,
            category: formData.get("category"),
            type: file.type.startsWith("video/") ? "video" : "image",
            title,
            description: String(formData.get("description")).trim(),
            media: `./works-assets/${id}.${extension}`,
            alt: title,
            featured: formData.get("featured") === "on"
        };

        publishButton.disabled = true;
        showStatus("正在安全上传作品…");
        try {
            const bytes = new Uint8Array(await file.arrayBuffer());
            const response = await backend("github-manager", {
                method: "POST",
                body: JSON.stringify({
                    action: "publish",
                    work,
                    file: {
                        path: work.media.slice(2),
                        content: encodeBase64(bytes)
                    }
                })
            });
            works = response.works;
            renderWorks();
            workForm.reset();
            workForm.elements.featured.checked = true;
            showStatus("作品已发布。GitHub Pages 更新后，访客即可查看。", "success");
        } catch (error) {
            showStatus(error.message, "error");
        } finally {
            publishButton.disabled = false;
        }
    });

    document.getElementById("disconnectButton").addEventListener("click", async () => {
        try {
            await backend("github-auth", {
                method: "POST",
                body: JSON.stringify({ action: "logout" })
            });
        } catch (error) {
            console.error("Could not revoke the server-side manager session:", error);
        }
        clearSession();
        works = [];
        workspace.hidden = true;
        authPanel.hidden = false;
        managedWorks.replaceChildren();
        showStatus("已退出登录，本设备会话已清除。");
    });
})();

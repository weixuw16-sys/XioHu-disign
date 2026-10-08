(() => {
    const OWNER = "weixuw16-sys";
    const REPOSITORY = "XioHu-disign";
    const BRANCH = "main";
    const MAX_FILE_SIZE = 15 * 1024 * 1024;
    const API_ROOT = `https://api.github.com/repos/${OWNER}/${REPOSITORY}`;
    const CATEGORY_LABELS = {
        brand: "品牌设计",
        illustration: "插画",
        photo: "摄影",
        motion: "动画 / 视频"
    };
    let token = "";
    let works = [];

    const status = document.getElementById("adminStatus");
    const authPanel = document.getElementById("authPanel");
    const workspace = document.getElementById("adminWorkspace");
    const connectForm = document.getElementById("connectForm");
    const workForm = document.getElementById("workForm");
    const connectButton = connectForm.querySelector("button[type=submit]");
    const publishButton = document.getElementById("publishButton");
    const managedWorks = document.getElementById("managedWorks");

    function showStatus(message, kind) {
        status.textContent = message;
        status.dataset.kind = kind || "info";
        status.classList.add("visible");
    }

    async function api(path, options = {}) {
        const response = await fetch(`${API_ROOT}${path}`, {
            ...options,
            headers: {
                Accept: "application/vnd.github+json",
                Authorization: `Bearer ${token}`,
                "X-GitHub-Api-Version": "2022-11-28",
                ...(options.body ? { "Content-Type": "application/json" } : {}),
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
            const reason = body.message || response.statusText || "未知错误";
            throw new Error(`GitHub API (${response.status}): ${reason}`);
        }
        return body;
    }

    function decodeBase64Utf8(value) {
        const binary = atob(value.replace(/\s/g, ""));
        const bytes = Uint8Array.from(binary, character => character.charCodeAt(0));
        return new TextDecoder().decode(bytes);
    }

    function encodeBase64(bytes) {
        let binary = "";
        const chunkSize = 0x8000;
        for (let offset = 0; offset < bytes.length; offset += chunkSize) {
            binary += String.fromCharCode(...bytes.subarray(offset, offset + chunkSize));
        }
        return btoa(binary);
    }

    async function getRemoteState() {
        const reference = await api(`/git/ref/heads/${encodeURIComponent(BRANCH)}`);
        const commitSha = reference.object.sha;
        const commit = await api(`/git/commits/${commitSha}`);
        const result = await api(`/contents/data/works.json?ref=${encodeURIComponent(commitSha)}`);
        if (!result.content || result.encoding !== "base64") {
            throw new Error("无法读取 data/works.json。请确认 token 拥有该仓库的 Contents 读取权限。");
        }
        const parsed = JSON.parse(decodeBase64Utf8(result.content));
        if (!Array.isArray(parsed)) throw new Error("作品数据格式无效，无法继续操作。");
        return { works: parsed, commitSha, treeSha: commit.tree.sha };
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

    function setConnected(remoteWorks) {
        works = remoteWorks;
        authPanel.hidden = true;
        workspace.hidden = false;
        renderWorks();
        showStatus("已连接。提交会直接写入 main 分支，GitHub Pages 部署需要片刻完成。", "success");
    }

    async function commitWorks(updatedWorks, state, { file, removedMedia, removedTitle } = {}) {
        const tree = [
            {
                path: "data/works.json",
                mode: "100644",
                type: "blob",
                content: `${JSON.stringify(updatedWorks, null, 2)}\n`
            }
        ];

        if (file) {
            const blob = await api("/git/blobs", {
                method: "POST",
                body: JSON.stringify({
                    content: encodeBase64(new Uint8Array(await file.file.arrayBuffer())),
                    encoding: "base64"
                })
            });
            tree.push({ path: file.path, mode: "100644", type: "blob", sha: blob.sha });
        }

        if (removedMedia && !updatedWorks.some(work => work.media === removedMedia)) {
            const path = removedMedia.startsWith("./") ? removedMedia.slice(2) : removedMedia;
            if (path.startsWith("works-assets/")) {
                tree.push({ path, mode: "100644", type: "blob", sha: null });
            }
        }

        const newTree = await api("/git/trees", {
            method: "POST",
            body: JSON.stringify({ base_tree: state.treeSha, tree })
        });
        const commit = await api("/git/commits", {
            method: "POST",
            body: JSON.stringify({
                message: file ? `Add portfolio work: ${file.title}` : `Remove portfolio work: ${removedTitle}`,
                tree: newTree.sha,
                parents: [state.commitSha]
            })
        });
        await api(`/git/refs/heads/${encodeURIComponent(BRANCH)}`, {
            method: "PATCH",
            body: JSON.stringify({ sha: commit.sha, force: false })
        });
    }

    async function deleteWork(work) {
        if (!window.confirm(`确定删除「${work.title}」吗？这会从作品集移除此作品${work.media.startsWith("./works-assets/") ? "及其上传文件" : ""}。`)) return;
        showStatus("正在删除并提交到 GitHub…");
        managedWorks.querySelectorAll("button").forEach(button => { button.disabled = true; });
        try {
            const state = await getRemoteState();
            const currentWorks = state.works;
            const updatedWorks = currentWorks.filter(item => item.id !== work.id);
            if (updatedWorks.length === currentWorks.length) {
                throw new Error("这个作品已在仓库中被移除，请刷新页面后重试。");
            }
            await commitWorks(updatedWorks, state, { removedMedia: work.media, removedTitle: work.title });
            works = updatedWorks;
            renderWorks();
            showStatus("作品已删除并提交。GitHub Pages 更新后，访客将看不到该作品。", "success");
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

    connectForm.addEventListener("submit", async event => {
        event.preventDefault();
        token = document.getElementById("githubToken").value.trim();
        connectButton.disabled = true;
        showStatus("正在验证 token 并读取作品…");
        try {
            const state = await getRemoteState();
            setConnected(state.works);
            document.getElementById("githubToken").value = "";
        } catch (error) {
            token = "";
            document.getElementById("githubToken").value = "";
            showStatus(error.message, "error");
        } finally {
            connectButton.disabled = false;
        }
    });

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
        const filename = `${id}.${extension}`;
        const work = {
            id: `work-${id}`,
            category: formData.get("category"),
            type: file.type.startsWith("video/") ? "video" : "image",
            title: String(formData.get("title")).trim(),
            description: String(formData.get("description")).trim(),
            media: `./works-assets/${filename}`,
            alt: String(formData.get("title")).trim(),
            featured: formData.get("featured") === "on"
        };

        publishButton.disabled = true;
        showStatus("正在上传作品并提交到 GitHub…");
        try {
            const state = await getRemoteState();
            const currentWorks = state.works;
            const updatedWorks = [work, ...currentWorks];
            await commitWorks(updatedWorks, state, { file: { file, path: `works-assets/${filename}`, title: work.title } });
            works = updatedWorks;
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

    document.getElementById("disconnectButton").addEventListener("click", () => {
        token = "";
        works = [];
        workspace.hidden = true;
        authPanel.hidden = false;
        managedWorks.replaceChildren();
        showStatus("已退出，token 已从页面内存清除。");
    });
})();

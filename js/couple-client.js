(() => {
    const SUPABASE_URL = "https://gttcyzjomilimqrrnrow.supabase.co";
    const SUPABASE_KEY = "sb_publishable_Xw21vpSBcy-Y5hU5nd10Yw_6vzitsxi";
    const SESSION_KEY = "xiohu-love-couple-session";
    const isNative = window.Capacitor?.isNativePlatform?.() === true;
    let session = null;
    let latestState = null;
    let polling = false;

    const readSession = () => {
        const value = localStorage.getItem(SESSION_KEY);
        if (!value) return null;
        const parsed = JSON.parse(value);
        if (!parsed || typeof parsed.pairToken !== "string" ||
            !["boy", "girl"].includes(parsed.role)) {
            throw new Error("本机配对资料无效，请重新完成配对。");
        }
        return parsed;
    };

    const saveSession = value => {
        localStorage.setItem(SESSION_KEY, JSON.stringify(value));
        session = value;
    };

    const request = async (action, payload = {}, token = session?.pairToken) => {
        const headers = {
            apikey: SUPABASE_KEY,
            "Content-Type": "application/json"
        };
        if (token) headers["x-couple-token"] = token;
        let response;
        try {
            response = await fetch(`${SUPABASE_URL}/functions/v1/couple-sync`, {
                method: "POST",
                headers,
                body: JSON.stringify({ action, ...payload })
            });
        } catch (error) {
            console.error("Could not reach the couple service:", error);
            throw new Error("网络连接失败，请连接网络后重试。");
        }
        let result;
        try {
            result = await response.json();
        } catch (error) {
            console.error("The couple service returned an invalid response:", error);
            throw new Error("服务器暂时无法读取，请稍后重试。");
        }
        if (!response.ok) throw new Error(result.error || "操作失败，请稍后重试。");
        return result;
    };

    const setStatus = (element, message) => {
        if (element) element.textContent = message;
    };

    const currentPage = () => window.location.pathname.split("/").pop() || "index.html";
    const navigate = page => {
        if (currentPage() !== page) window.location.replace(`./${page}`);
    };
    const updateDays = () => {
        const targets = [
            document.getElementById("relationshipDays"),
            document.getElementById("dayCount")
        ].filter(Boolean);
        if (!targets.length) return;
        const start = Date.UTC(2026, 0, 7);
        const today = new Date();
        const current = Date.UTC(today.getFullYear(), today.getMonth(), today.getDate());
        const days = Math.max(1, Math.floor((current - start) / 86400000) + 1);
        targets.forEach(target => {
            target.textContent = `${days} 天`;
        });
    };

    const updateValentinesCountdown = () => {
        const daysElement = document.getElementById("valentinesDays");
        const label = document.getElementById("valentinesLabel");
        const date = document.getElementById("valentinesDate");
        if (!daysElement || !label || !date) return;
        const now = new Date();
        const today = Date.UTC(now.getFullYear(), now.getMonth(), now.getDate());
        let year = now.getFullYear();
        let target = Date.UTC(year, 1, 14);
        if (today > target) {
            year += 1;
            target = Date.UTC(year, 1, 14);
        }
        const remaining = Math.round((target - today) / 86400000);
        daysElement.textContent = remaining === 0 ? "今天就是情人节 ♡" : `${remaining} 天`;
        label.textContent = remaining === 0 ? "今天要一起庆祝" : "距离情人节还有";
        date.textContent = `${year} 年 2 月 14 日`;
    };

    const getState = async () => {
        latestState = await request("get-state");
        return latestState;
    };

    const routeForState = state => {
        if (currentPage() === "setup.html" || currentPage() === "index.html") {
            navigate(session.role === "girl" && state.couple.confessionStatus === "pending"
                ? "confession.html"
                : "couple-space.html");
            return;
        }
        if (session.role === "girl" && state.couple.confessionStatus === "pending") {
            if (currentPage() !== "confession.html") navigate("confession.html");
            return;
        }
        if (currentPage() === "confession.html") {
            navigate(state.couple.confessionStatus === "accepted"
                ? "confession-success.html"
                : "couple-space.html");
            return;
        }
        if (currentPage() === "confession-success.html" &&
            state.couple.confessionStatus !== "accepted") {
            navigate("couple-space.html");
        }
    };

    const copyText = async (value, status) => {
        try {
            if (navigator.clipboard?.writeText) {
                await navigator.clipboard.writeText(value);
            } else {
                const input = document.createElement("textarea");
                input.value = value;
                input.style.position = "fixed";
                input.style.opacity = "0";
                document.body.appendChild(input);
                input.select();
                const copied = document.execCommand("copy");
                input.remove();
                if (!copied) throw new Error("剪贴板不可用。");
            }
            setStatus(status, "配对码已复制，发给她后让她安装 App 并输入 ♡");
        } catch (error) {
            console.error("Could not copy the invitation code:", error);
            setStatus(status, "复制失败，请长按配对码手动复制。");
        }
    };

    const initSetupPage = () => {
        const boyPanel = document.getElementById("boySetupPanel");
        const girlPanel = document.getElementById("girlSetupPanel");
        const roleSwitch = document.querySelector(".role-switch");
        const inviteResult = document.getElementById("createdInviteResult");
        const roleChoices = Array.from(document.querySelectorAll("[data-role-choice]"));
        const status = document.getElementById("setupStatus");

        const showRole = role => {
            const isBoy = role === "boy";
            boyPanel.hidden = !isBoy;
            girlPanel.hidden = isBoy;
            roleChoices.forEach(button => {
                const selected = button.dataset.roleChoice === role;
                button.classList.toggle("active", selected);
                button.setAttribute("aria-pressed", String(selected));
            });
            setStatus(status, isBoy
                ? "写好想说的话，生成配对码后分享给她。"
                : "输入男生分享给你的 10 位配对码，就能收到表白。");
        };

        roleChoices.forEach(button => {
            button.addEventListener("click", () => showRole(button.dataset.roleChoice));
        });
        showRole("boy");

        const boyForm = document.getElementById("boySetupForm");
        boyForm?.addEventListener("submit", async event => {
            event.preventDefault();
            const submit = boyForm.querySelector("button[type=submit]");
            const name = document.getElementById("boyName").value.trim();
            const confession = document.getElementById("boyConfession").value.trim();
            submit.disabled = true;
            setStatus(status, "正在准备你们的专属配对码…");
            try {
                const result = await request("create-invite", { role: "boy", name, confession }, null);
                saveSession({
                    pairId: result.pairId,
                    pairToken: result.pairToken,
                    inviteCode: result.inviteCode,
                    inviteExpiresAt: result.inviteExpiresAt,
                    displayName: name,
                    role: result.role
                });
                roleSwitch.hidden = true;
                boyPanel.hidden = true;
                girlPanel.hidden = true;
                inviteResult.hidden = false;
                document.getElementById("createdInviteCode").textContent = result.inviteCode;
                document.getElementById("createdInviteExpiry").textContent =
                    `配对码有效至 ${new Date(result.inviteExpiresAt).toLocaleString()}。`;
                setStatus(status, "配对码已生成，请复制并分享给她。");
                document.getElementById("copyCreatedInviteButton").addEventListener("click", () =>
                    copyText(result.inviteCode, status));
                document.getElementById("continueToHomeButton").addEventListener("click", () =>
                    navigate("couple-space.html"));
            } catch (error) {
                console.error("Could not create a couple invitation:", error);
                setStatus(status, error.message);
            } finally {
                submit.disabled = false;
            }
        });

        const girlForm = document.getElementById("girlSetupForm");
        girlForm?.addEventListener("submit", async event => {
            event.preventDefault();
            const submit = girlForm.querySelector("button[type=submit]");
            const name = document.getElementById("girlName").value.trim();
            const code = document.getElementById("inviteCode").value.trim().toUpperCase();
            submit.disabled = true;
            setStatus(status, "正在打开他为你准备的表白…");
            try {
                const result = await request("join-invite", { role: "girl", name, code }, null);
                saveSession({
                    pairId: result.pairId,
                    pairToken: result.pairToken,
                    displayName: name,
                    role: result.role
                });
                navigate("confession.html");
            } catch (error) {
                console.error("Could not accept the couple invitation:", error);
                setStatus(status, error.message);
            } finally {
                submit.disabled = false;
            }
        });
    };

    const initHomePage = async () => {
        const role = document.getElementById("memberRole");
        const welcome = document.getElementById("memberWelcome");
        const connection = document.getElementById("connectionStatus");
        const invitation = document.getElementById("inviteCard");
        const inviteCode = document.getElementById("homeInviteCode");
        const invitationStatus = document.getElementById("inviteStatus");
        const copyButton = document.getElementById("copyInviteButton");
        const renewButton = document.getElementById("renewInviteButton");

        role.textContent = session.role === "boy" ? "男生账号" : "女生账号";
        welcome.textContent = `你好，${session.displayName || "小可爱"} ♡`;
        updateDays();
        updateValentinesCountdown();
        window.setInterval(updateDays, 60000);
        window.setInterval(updateValentinesCountdown, 60000);

        copyButton?.addEventListener("click", () =>
            copyText(session.inviteCode || "", invitationStatus));
        renewButton?.addEventListener("click", () => {
            if (!window.confirm("这会重新准备一封表白和新的配对码，确定继续吗？")) return;
            localStorage.removeItem(SESSION_KEY);
            session = null;
            navigate("setup.html");
        });

        const state = await getState();
        const { couple } = state;
        const paired = Boolean(couple.pairedAt);
        connection.textContent = paired
            ? `已和${session.role === "boy" ? couple.girlName : couple.boyName}配对`
            : "正在等她加入";
        invitation.hidden = !(session.role === "boy" && !paired);
        if (invitation.hidden) {
            if (session.role === "girl") {
                connection.textContent = `已和${couple.boyName}配对`;
            }
        } else {
            inviteCode.textContent = session.inviteCode || "配对码已失效";
            setStatus(invitationStatus, "让她安装 App 后输入配对码，即可看到你写的表白。");
            if (new Date(session.inviteExpiresAt).getTime() <= Date.now()) {
                inviteCode.textContent = "配对码已过期";
                setStatus(invitationStatus, "重新生成一封表白和新的配对码，再分享给她。");
                renewButton.hidden = false;
            }
        }

        const status = document.getElementById("confessionStatus");
        if (status) {
            status.textContent = couple.confessionStatus === "accepted"
                ? `你们已经正式确认彼此的心意，${couple.girlName} ♡`
                : paired
                    ? "她已经收到你的表白，等待她的回答。"
                    : "配对后，她打开 App 就能看到你的表白。";
        }

        const gameLink = document.getElementById("gamesLink");
        if (gameLink) gameLink.setAttribute("aria-label", "小游戏，正在准备中");
    };

    const initConfessionPage = async () => {
        const state = await getState();
        const { couple } = state;
        if (session.role !== "girl") {
            navigate("couple-space.html");
            return;
        }
        if (couple.confessionStatus === "accepted") {
            navigate("confession-success.html");
            return;
        }
        document.getElementById("confessionHeading").textContent =
            `${couple.boyName} 有一段心里话，想认真告诉你。`;
        document.getElementById("confessionCopy").textContent = couple.confession;
        document.getElementById("confessionQuestion").textContent =
            `${couple.boyName} 想和你一起开启专属的小小宇宙，你愿意吗？`;
        const answer = document.getElementById("yesButton");
        answer.href = "#";
        const noButton = document.getElementById("noButton");
        const plea = document.getElementById("pleaMessage");
        const noMessages = [
            "没关系，我可以再认真问一次嘛 ♡",
            "你看，我的心意也跟着变大了！",
            "再给我一次机会，好不好呀？",
            "我会一直喜欢你，也会一直等你 ♥",
            "按钮都快装不下我的喜欢啦！"
        ];
        let noCount = 0;
        noButton?.addEventListener("click", () => {
            noCount += 1;
            answer.style.setProperty("--yes-scale", Math.min(1 + noCount * 0.16, 2.2));
            setStatus(plea, noMessages[Math.min(noCount - 1, noMessages.length - 1)]);
        });
        answer.addEventListener("click", async event => {
            event.preventDefault();
            answer.setAttribute("aria-disabled", "true");
            try {
                await request("accept-confession");
                navigate("confession-success.html");
            } catch (error) {
                console.error("Could not accept the confession:", error);
                const message = document.getElementById("pleaMessage");
                setStatus(message, error.message);
                answer.removeAttribute("aria-disabled");
            }
        });
    };

    const formatTimestamp = value => new Intl.DateTimeFormat("zh-CN", {
        year: "numeric",
        month: "long",
        day: "numeric",
        hour: "2-digit",
        minute: "2-digit"
    }).format(new Date(value));

    const initWakePage = async () => {
        const form = document.getElementById("wakeForm");
        const text = document.getElementById("wakeText");
        const status = document.getElementById("wakeStatus");
        const list = document.getElementById("wakeList");
        const submit = document.getElementById("sendWake");

        const renderMessages = messages => {
            list.replaceChildren();
            if (!messages.length) {
                const empty = document.createElement("p");
                empty.className = "wake-empty";
                empty.textContent = "还没有收到想念。送出第一条，给对方一个小小惊喜 ♡";
                list.appendChild(empty);
                return;
            }

            messages.forEach(message => {
                const card = document.createElement("article");
                card.className = "wake-message-card";
                const header = document.createElement("div");
                header.className = "wake-message-header";
                const sender = document.createElement("strong");
                sender.textContent = message.sender_role === session.role
                    ? "你送出的想念"
                    : "来自 TA 的想念";
                const time = document.createElement("time");
                time.dateTime = message.created_at;
                time.textContent = formatTimestamp(message.created_at);
                header.append(sender, time);

                const content = document.createElement("p");
                content.textContent = message.body;
                card.append(header, content);
                if (message.sender_role === session.role) {
                    const remove = document.createElement("button");
                    remove.className = "remove-memory";
                    remove.type = "button";
                    remove.textContent = "删除";
                    remove.setAttribute("aria-label", "删除这条已发送的想念");
                    remove.addEventListener("click", async () => {
                        if (!window.confirm("确定删除这条已发送的想念吗？")) return;
                        remove.disabled = true;
                        try {
                            await request("delete-wake", { messageId: message.id });
                            await refresh();
                        } catch (error) {
                            console.error("Could not delete the wake message:", error);
                            remove.disabled = false;
                            setStatus(status, error.message);
                        }
                    });
                    header.appendChild(remove);
                }
                if (message.sender_role !== session.role) {
                    const actions = document.createElement("div");
                    actions.className = "wake-message-actions";
                    if (message.received_at) {
                        const received = document.createElement("span");
                        received.className = "wake-received";
                        received.textContent = "收到啦！♡";
                        actions.appendChild(received);
                    } else {
                        const received = document.createElement("button");
                        received.className = "received-button";
                        received.type = "button";
                        received.textContent = "收到啦！♡";
                        received.addEventListener("click", async () => {
                            received.disabled = true;
                            try {
                                await request("ack-wake", { messageId: message.id });
                                await refresh();
                                setStatus(status, "已经告诉对方你收到这份想念啦 ♡");
                            } catch (error) {
                                console.error("Could not acknowledge the wake message:", error);
                                received.disabled = false;
                                setStatus(status, error.message);
                            }
                        });
                        actions.appendChild(received);
                    }
                    card.appendChild(actions);
                }
                list.appendChild(card);
            });
        };

        const refresh = async () => {
            if (polling || document.hidden) return;
            polling = true;
            try {
                const state = await getState();
                renderMessages(state.messages || []);
            } finally {
                polling = false;
            }
        };

        form.addEventListener("submit", async event => {
            event.preventDefault();
            const message = text.value.trim();
            if (!message) {
                setStatus(status, "先写下一句想说的话，再送出这份想念吧。");
                return;
            }
            submit.disabled = true;
            setStatus(status, "正在把这份想念送给 TA…");
            try {
                await request("send-wake", { message });
                form.reset();
                await refresh();
                setStatus(status, "想念送出啦 ♡ 对方打开 App 后就能收到。");
            } catch (error) {
                console.error("Could not send the wake message:", error);
                setStatus(status, error.message);
            } finally {
                submit.disabled = false;
            }
        });

        await refresh();
        window.setInterval(refresh, 20000);
        document.addEventListener("visibilitychange", refresh);
    };

    const initNativeApp = async () => {
        document.body.dataset.coupleApp = "true";
        document.getElementById("installAppButton")?.setAttribute("hidden", "");
        if (!isNative) return;
        try {
            session = readSession();
        } catch (error) {
            console.error("Could not read the saved couple profile:", error);
            localStorage.removeItem(SESSION_KEY);
            session = null;
        }

        const page = currentPage();
        if (!session) {
            if (page !== "setup.html" && page !== "index.html") navigate("setup.html");
            else initSetupPage();
            return;
        }
        if (page === "setup.html" || page === "index.html") {
            try {
                routeForState(await getState());
            } catch (error) {
                console.error("Could not restore the couple connection:", error);
                initSetupPage();
                setStatus(document.getElementById("setupStatus"), error.message);
            }
            return;
        }

        try {
            const state = await getState();
            routeForState(state);
            if (page === "couple-space.html") await initHomePage();
            if (page === "confession.html") await initConfessionPage();
            if (page === "confession-success.html") {
                if (state.couple.confessionStatus === "accepted") updateDays();
            }
            if (page === "wake.html") await initWakePage();
            if (page === "memories.html") {
                setStatus(
                    document.getElementById("memoryStatus"),
                    "日常记录暂存在这台手机；照片、视频和动态的跨设备同步正在准备中。"
                );
            }
        } catch (error) {
            console.error("Could not load couple app data:", error);
            const message = document.getElementById("wakeStatus") ||
                document.getElementById("setupStatus") ||
                document.getElementById("confessionStatus") ||
                document.getElementById("memberWelcome");
            setStatus(message, error.message);
        }
    };

    window.LoveCouple = {
        get isNative() {
            return isNative;
        },
        init: initNativeApp
    };
})();

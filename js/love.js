(() => {
    const START_DATE = new Date(2026, 0, 7);
    const MEMORY_KEY = "xiohu-love-memories";

    const installButton = document.getElementById("installAppButton");
    const installHelp = document.getElementById("installAppHelp");
    const isNativeApp = window.Capacitor?.isNativePlatform?.() === true;
    if (isNativeApp && installButton && installHelp) {
        installButton.hidden = true;
        installHelp.textContent = "你正在使用 Android App，欢迎回到我们的小小宇宙 ♡";
    }

    if (!isNativeApp && "serviceWorker" in navigator && window.isSecureContext) {
        window.addEventListener("load", () => {
            navigator.serviceWorker.register("./service-worker.js")
                .then(() => {
                    if (installHelp) installHelp.textContent = "应用已准备好。使用手机浏览器菜单即可添加到主屏幕。";
                })
                .catch(error => {
                    console.error("Love app service worker registration failed:", error);
                    if (installHelp) installHelp.textContent = "离线应用准备失败；请确认网页使用 HTTPS 后刷新重试。";
                });
        });
    } else if (!isNativeApp && installHelp) {
        installHelp.textContent = "请先将网页部署到 HTTPS 网站，再用手机浏览器访问并添加到主屏幕。";
    }

    if (installButton && installHelp) {
        const isInstalled = window.matchMedia("(display-mode: standalone)").matches ||
            window.navigator.standalone === true;
        let installPrompt = null;
        if (isNativeApp) {
            installButton.hidden = true;
        } else if (isInstalled) {
            installButton.hidden = true;
            installHelp.textContent = "已经安装好啦，欢迎回到我们的小小宇宙 ♡";
        }

        window.addEventListener("beforeinstallprompt", event => {
            event.preventDefault();
            installPrompt = event;
            installButton.textContent = "安装我们的小小宇宙";
        });

        installButton.addEventListener("click", async () => {
            if (installPrompt) {
                installButton.disabled = true;
                try {
                    await installPrompt.prompt();
                    const choice = await installPrompt.userChoice;
                    if (choice.outcome === "accepted") {
                        installButton.hidden = true;
                        installHelp.textContent = "安装成功，欢迎回到我们的小小宇宙 ♡";
                    } else {
                        installHelp.textContent = "没关系，可以稍后再从浏览器菜单添加到主屏幕。";
                    }
                } catch (error) {
                    console.error("Love app installation prompt failed:", error);
                    installHelp.textContent = "安装没有成功，请尝试从手机浏览器菜单添加到主屏幕。";
                } finally {
                    installPrompt = null;
                    installButton.disabled = false;
                }
                return;
            }

            if (!window.isSecureContext) {
                installHelp.textContent = "请先将网页部署到 HTTPS 网站，再用手机浏览器访问并添加到主屏幕。";
                return;
            }

            const isIOS = /iPhone|iPad|iPod/i.test(navigator.userAgent) ||
                (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1);
            installHelp.textContent = isIOS
                ? "在 Safari 点「分享」按钮，再选择「添加到主屏幕」。"
                : "打开手机浏览器菜单（⋮），选择「安装应用」或「添加到主屏幕」。";
        });

        window.addEventListener("appinstalled", () => {
            installPrompt = null;
            installButton.hidden = true;
            installHelp.textContent = "安装成功，欢迎回到我们的小小宇宙 ♡";
        });
    }

    const particleCanvas = document.getElementById("particleLayer");
    if (particleCanvas) {
        const context = particleCanvas.getContext("2d");
        const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)");
        const glyphs = ["♡", "✦", "·"];
        const colors = ["rgba(221, 126, 162, 0.72)", "rgba(112, 148, 205, 0.7)", "rgba(238, 170, 193, 0.76)"];
        let particles = [];
        let width = 0;
        let height = 0;
        let frameId = 0;

        const resizeCanvas = () => {
            const ratio = Math.min(window.devicePixelRatio || 1, 1.5);
            width = window.innerWidth;
            height = window.innerHeight;
            particleCanvas.width = Math.round(width * ratio);
            particleCanvas.height = Math.round(height * ratio);
            if (context) context.setTransform(ratio, 0, 0, ratio, 0, 0);
            const count = Math.min(42, Math.max(25, Math.round(width * height / 30000)));
            particles = Array.from({ length: count }, () => ({
                x: Math.random() * width,
                y: Math.random() * height,
                size: 11 + Math.random() * 10,
                speed: 0.12 + Math.random() * 0.24,
                drift: (Math.random() - 0.5) * 0.22,
                phase: Math.random() * Math.PI * 2,
                glyph: glyphs[Math.floor(Math.random() * glyphs.length)],
                color: colors[Math.floor(Math.random() * colors.length)]
            }));
            drawParticles(false);
        };

        const drawParticles = animate => {
            if (!context) return;
            context.clearRect(0, 0, width, height);
            particles.forEach(particle => {
                context.globalAlpha = 0.62 + Math.sin(particle.phase) * 0.18;
                context.fillStyle = particle.color;
                context.font = `${particle.size}px "Segoe UI Symbol", sans-serif`;
                context.fillText(particle.glyph, particle.x, particle.y);

                if (animate) {
                    particle.y -= particle.speed;
                    particle.x += particle.drift + Math.sin(particle.phase) * 0.12;
                    particle.phase += 0.014;
                    if (particle.y < -24) {
                        particle.y = height + 18;
                        particle.x = Math.random() * width;
                    }
                    if (particle.x < -20) particle.x = width + 15;
                    if (particle.x > width + 20) particle.x = -15;
                }
            });
            context.globalAlpha = 1;
            if (animate && !document.hidden && !reducedMotion.matches) {
                frameId = window.requestAnimationFrame(() => drawParticles(true));
            }
        };

        const updateAnimation = () => {
            window.cancelAnimationFrame(frameId);
            drawParticles(!document.hidden && !reducedMotion.matches);
        };

        window.addEventListener("resize", resizeCanvas, { passive: true });
        document.addEventListener("visibilitychange", updateAnimation);
        reducedMotion.addEventListener("change", updateAnimation);
        resizeCanvas();
        updateAnimation();
    }

    if (window.LoveCouple?.isNative) {
        window.LoveCouple.init();
        return;
    }

    const yesButton = document.getElementById("yesButton");
    const noButton = document.getElementById("noButton");

    if (yesButton && noButton) {
        const message = document.getElementById("pleaMessage");
        const noMessages = [
            "没关系，我可以再认真问一次嘛 ♡",
            "你看，我的心意也跟着变大了！",
            "再给我一次机会，好不好呀？",
            "我会一直喜欢你，也会一直等你 ♥",
            "按钮都快装不下我的喜欢啦！"
        ];
        let noCount = 0;

        noButton.addEventListener("click", () => {
            noCount += 1;
            const scale = Math.min(1 + noCount * 0.16, 2.2);
            yesButton.style.setProperty("--yes-scale", scale);
            noButton.classList.add("no-button-nudged");
            message.textContent = noMessages[Math.min(noCount - 1, noMessages.length - 1)];
        });

    }

    const dayCount = document.getElementById("dayCount");
    if (dayCount) {
        const updateDayCount = () => {
            const today = new Date();
            const todayUtc = Date.UTC(today.getFullYear(), today.getMonth(), today.getDate());
            const startUtc = Date.UTC(START_DATE.getFullYear(), START_DATE.getMonth(), START_DATE.getDate());
            const elapsedDays = Math.floor((todayUtc - startUtc) / 86400000);
            dayCount.textContent = `${Math.max(1, elapsedDays + 1)} 天`;
        };
        updateDayCount();
        window.setInterval(updateDayCount, 60000);
    }

    const relationshipDays = document.getElementById("relationshipDays");
    const valentinesDays = document.getElementById("valentinesDays");
    if (relationshipDays && valentinesDays) {
        const valentinesLabel = document.getElementById("valentinesLabel");
        const valentinesDate = document.getElementById("valentinesDate");
        const millisecondsPerDay = 86400000;
        const toUtcDay = (year, month, day) => Date.UTC(year, month, day) / millisecondsPerDay;

        const updateCoupleCountdowns = () => {
            const now = new Date();
            const today = toUtcDay(now.getFullYear(), now.getMonth(), now.getDate());
            const startDay = toUtcDay(START_DATE.getFullYear(), START_DATE.getMonth(), START_DATE.getDate());
            relationshipDays.textContent = `${Math.max(1, today - startDay + 1)} 天`;

            let valentinesYear = now.getFullYear();
            let valentinesDay = toUtcDay(valentinesYear, 1, 14);
            if (today > valentinesDay) {
                valentinesYear += 1;
                valentinesDay = toUtcDay(valentinesYear, 1, 14);
            }
            const remaining = valentinesDay - today;
            valentinesDays.textContent = remaining === 0 ? "今天就是情人节 ♡" : `${remaining} 天`;
            valentinesLabel.textContent = remaining === 0 ? "今天要一起庆祝" : "距离情人节还有";
            valentinesDate.textContent = `${valentinesYear} 年 2 月 14 日`;
        };

        updateCoupleCountdowns();
        window.setInterval(updateCoupleCountdowns, 60000);
    }

    const wakeForm = document.getElementById("wakeForm");
    const wakeList = document.getElementById("wakeList");
    if (wakeForm && wakeList) {
        const WAKE_KEY = "xiohu-love-wake-messages";
        const wakeText = document.getElementById("wakeText");
        const wakeStatus = document.getElementById("wakeStatus");
        const sendWakeButton = document.getElementById("sendWake");
        let messages = [];

        const formatTimestamp = timestamp => new Intl.DateTimeFormat("zh-CN", {
            year: "numeric",
            month: "long",
            day: "numeric",
            hour: "2-digit",
            minute: "2-digit"
        }).format(new Date(timestamp));

        const renderMessages = () => {
            wakeList.replaceChildren();
            if (!messages.length) {
                const empty = document.createElement("p");
                empty.className = "wake-empty";
                empty.textContent = "还没有收到想念。要不要先送出第一条？ ♡";
                wakeList.appendChild(empty);
                return;
            }

            [...messages].sort((left, right) => right.createdAt - left.createdAt).forEach(message => {
                const card = document.createElement("article");
                card.className = "wake-message-card";
                const header = document.createElement("div");
                header.className = "wake-message-header";
                const sender = document.createElement("strong");
                sender.textContent = "来自你的专属想念";
                const time = document.createElement("time");
                time.dateTime = new Date(message.createdAt).toISOString();
                time.textContent = formatTimestamp(message.createdAt);
                header.append(sender, time);

                const content = document.createElement("p");
                content.textContent = message.text;
                const acknowledgement = document.createElement("div");
                acknowledgement.className = "wake-message-actions";
                if (Number.isFinite(message.receivedAt)) {
                    const received = document.createElement("span");
                    received.className = "wake-received";
                    received.textContent = "收到啦！♡";
                    acknowledgement.appendChild(received);
                } else {
                    const receivedButton = document.createElement("button");
                    receivedButton.className = "received-button";
                    receivedButton.type = "button";
                    receivedButton.textContent = "收到啦！♡";
                    receivedButton.addEventListener("click", () => {
                        const updatedMessages = messages.map(item =>
                            item.id === message.id ? { ...item, receivedAt: Date.now() } : item
                        );
                        try {
                            localStorage.setItem(WAKE_KEY, JSON.stringify(updatedMessages));
                            messages = updatedMessages;
                            wakeStatus.textContent = "已告诉对方你收到这份想念啦 ♡";
                            renderMessages();
                        } catch (error) {
                            console.error("Could not save the wake message acknowledgement:", error);
                            wakeStatus.textContent = "确认失败，请检查浏览器存储后重试。";
                        }
                    });
                    acknowledgement.appendChild(receivedButton);
                }
                const remove = document.createElement("button");
                remove.className = "remove-memory";
                remove.type = "button";
                remove.textContent = "删除";
                remove.setAttribute("aria-label", "删除这条想念");
                remove.addEventListener("click", () => {
                    if (!window.confirm("确定删除这条想念吗？")) return;
                    const remaining = messages.filter(item => item.id !== message.id);
                    try {
                        localStorage.setItem(WAKE_KEY, JSON.stringify(remaining));
                        messages = remaining;
                        wakeStatus.textContent = "这条想念已经删除。";
                        renderMessages();
                    } catch (error) {
                        console.error("Could not delete the wake message:", error);
                        wakeStatus.textContent = "删除失败，想念仍然保留。请检查浏览器存储后重试。";
                    }
                });
                header.appendChild(remove);
                acknowledgement.appendChild(remove);
                card.append(header, content, acknowledgement);
                wakeList.appendChild(card);
            });
        };

        try {
            const saved = localStorage.getItem(WAKE_KEY);
            if (saved) {
                const parsed = JSON.parse(saved);
                if (!Array.isArray(parsed)) throw new Error("Saved wake messages are not a list.");
                messages = parsed.filter(message =>
                    message &&
                    typeof message.id === "string" &&
                    typeof message.text === "string" &&
                    Number.isFinite(message.createdAt)
                );
            }
        } catch (error) {
            console.error("Could not load wake messages:", error);
            wakeStatus.textContent = "读取本机想念时遇到问题；你仍可以发送新的演示消息。";
        }

        wakeForm.addEventListener("submit", event => {
            event.preventDefault();
            const text = wakeText.value.trim();
            if (!text) {
                wakeStatus.textContent = "先写下一句想说的话，再送出这份想念吧。";
                return;
            }
            const message = {
                id: `wake-${Date.now()}-${Math.random().toString(36).slice(2)}`,
                text,
                createdAt: Date.now()
            };
            const nextMessages = [...messages, message];
            sendWakeButton.disabled = true;
            try {
                localStorage.setItem(WAKE_KEY, JSON.stringify(nextMessages));
                messages = nextMessages;
                wakeForm.reset();
                wakeStatus.textContent = "想念送出啦 ♡ 已加入这台设备的演示收件箱。";
                renderMessages();
            } catch (error) {
                console.error("Could not save the wake message:", error);
                wakeStatus.textContent = "发送失败，浏览器可能没有足够的本地存储空间。";
            } finally {
                sendWakeButton.disabled = false;
            }
        });

        renderMessages();
    }

    const memoryForm = document.getElementById("memoryForm");
    const memoryList = document.getElementById("memoryList");
    if (memoryForm && memoryList) {
        const dateInput = document.getElementById("memoryDate");
        const textInput = document.getElementById("memoryText");
        const mediaInput = document.getElementById("memoryMedia");
        const preview = document.getElementById("mediaPreview");
        const status = document.getElementById("memoryStatus");
        const publishButton = document.getElementById("publishMemory");
        const gallery = document.getElementById("memoryGallery");
        const galleryCount = document.getElementById("galleryCount");
        const galleryFilters = Array.from(document.querySelectorAll("[data-gallery-filter]"));
        const today = new Date();
        const todayString = [
            today.getFullYear(),
            String(today.getMonth() + 1).padStart(2, "0"),
            String(today.getDate()).padStart(2, "0")
        ].join("-");
        dateInput.value = todayString;

        let legacyPosts = [];
        let savedPosts = [];
        let database = null;
        let previewUrls = [];
        let postMediaUrls = [];
        let galleryMediaUrls = [];
        let activeGalleryFilter = "all";
        publishButton.disabled = true;
        setStatus("正在准备本机记录空间…");

        const setStatus = message => {
            status.textContent = message;
        };

        const openDatabase = () => new Promise((resolve, reject) => {
            if (!window.indexedDB) {
                reject(new Error("This browser does not support IndexedDB."));
                return;
            }
            const request = window.indexedDB.open("xiohu-love-memories", 1);
            request.onupgradeneeded = () => {
                if (!request.result.objectStoreNames.contains("posts")) {
                    request.result.createObjectStore("posts", { keyPath: "id" });
                }
            };
            request.onsuccess = () => {
                request.result.onversionchange = () => request.result.close();
                resolve(request.result);
            };
            request.onerror = () => reject(request.error || new Error("Could not open the memories database."));
            request.onblocked = () => reject(new Error("The memories database upgrade is blocked by another open tab."));
        });

        const readSavedPosts = db => new Promise((resolve, reject) => {
            const transaction = db.transaction("posts", "readonly");
            const request = transaction.objectStore("posts").getAll();
            request.onsuccess = () => resolve(request.result);
            request.onerror = () => reject(request.error || new Error("Could not read posts."));
            transaction.onerror = () => reject(transaction.error || new Error("Could not read posts."));
        });

        const writeSavedPost = (db, post) => new Promise((resolve, reject) => {
            const transaction = db.transaction("posts", "readwrite");
            transaction.objectStore("posts").add(post);
            transaction.oncomplete = () => resolve();
            transaction.onerror = () => reject(transaction.error || new Error("Could not save the post."));
            transaction.onabort = () => reject(transaction.error || new Error("The post could not be saved."));
        });

        const deleteSavedPost = (db, id) => new Promise((resolve, reject) => {
            const transaction = db.transaction("posts", "readwrite");
            transaction.objectStore("posts").delete(id);
            transaction.oncomplete = () => resolve();
            transaction.onerror = () => reject(transaction.error || new Error("Could not delete the post."));
            transaction.onabort = () => reject(transaction.error || new Error("The post could not be deleted."));
        });

        const loadLegacyPosts = () => {
            const saved = localStorage.getItem(MEMORY_KEY);
            if (!saved) return [];
            const parsed = JSON.parse(saved);
            if (!Array.isArray(parsed)) throw new Error("Saved memories are not a list.");
            return parsed.filter(item =>
                item &&
                typeof item.id === "string" &&
                typeof item.date === "string" &&
                typeof item.text === "string"
            ).map(item => ({ ...item, source: "legacy" }));
        };

        const formatDate = value => {
            const [year, month, day] = value.split("-").map(Number);
            return `${year} 年 ${month} 月 ${day} 日`;
        };

        const revokeUrls = urls => {
            urls.forEach(url => URL.revokeObjectURL(url));
            urls.length = 0;
        };

        const createMediaElement = (media, url, index) => {
            const wrapper = document.createElement("div");
            wrapper.className = "post-media-item";
            if (media.type.startsWith("video/")) {
                const video = document.createElement("video");
                video.controls = true;
                video.playsInline = true;
                video.preload = "metadata";
                video.src = url;
                video.setAttribute("aria-label", `动态视频 ${index + 1}`);
                wrapper.appendChild(video);
            } else {
                const image = document.createElement("img");
                image.src = url;
                image.alt = `动态照片 ${index + 1}`;
                image.loading = "lazy";
                wrapper.appendChild(image);
            }
            return wrapper;
        };

        const renderGallery = entries => {
            if (!gallery) return;
            revokeUrls(galleryMediaUrls);
            gallery.replaceChildren();

            const items = entries.flatMap(entry =>
                (Array.isArray(entry.media) ? entry.media : []).map((media, index) => ({
                    date: entry.date,
                    id: `${entry.id}-${index}`,
                    index,
                    media
                }))
            );
            if (galleryCount) galleryCount.textContent = `${items.length} 个回忆`;
            galleryFilters.forEach(button => {
                const selected = button.dataset.galleryFilter === activeGalleryFilter;
                button.classList.toggle("active", selected);
                button.setAttribute("aria-pressed", String(selected));
            });

            const visibleItems = items.filter(item =>
                activeGalleryFilter === "all" || item.media.type.startsWith(`${activeGalleryFilter}/`)
            );
            if (!visibleItems.length) {
                const empty = document.createElement("p");
                empty.className = "gallery-empty";
                empty.textContent = items.length
                    ? "这个分类暂时还没有回忆。"
                    : "发布带照片或视频的动态后，它们就会出现在这里 ♡";
                gallery.appendChild(empty);
                return;
            }

            visibleItems.forEach((item, index) => {
                const card = document.createElement("article");
                card.className = "gallery-item";
                card.dataset.mediaType = item.media.type.startsWith("video/") ? "video" : "image";
                const url = URL.createObjectURL(item.media.blob || item.media);
                galleryMediaUrls.push(url);
                card.appendChild(createMediaElement(item.media, url, index));

                const caption = document.createElement("time");
                caption.dateTime = item.date;
                caption.textContent = formatDate(item.date);
                card.appendChild(caption);
                gallery.appendChild(card);
            });
        };

        const renderPosts = () => {
            revokeUrls(postMediaUrls);
            memoryList.replaceChildren();
            const entries = [
                {
                    id: "relationship-start",
                    date: "2026-01-07",
                    text: "我们正式在一起的第一天。从这里开始，把每一个平凡又闪闪发光的日子都记下来。 ♡",
                    source: "anniversary",
                    media: []
                },
                ...legacyPosts,
                ...savedPosts.map(post => ({ ...post, source: "database" }))
            ].sort((left, right) => right.date.localeCompare(left.date) || right.id.localeCompare(left.id));
            renderGallery(entries);

            entries.forEach(entry => {
                const article = document.createElement("article");
                article.className = "memory-entry post-card";

                const header = document.createElement("div");
                header.className = "post-header";
                const avatar = document.createElement("span");
                avatar.className = "post-avatar";
                avatar.setAttribute("aria-hidden", "true");
                avatar.textContent = "♥";
                const author = document.createElement("div");
                author.className = "post-author";
                const name = document.createElement("strong");
                name.textContent = "我们的小日常";
                const date = document.createElement("time");
                date.className = "memory-date";
                date.dateTime = entry.date;
                date.textContent = formatDate(entry.date);
                author.append(name, date);
                header.append(avatar, author);

                if (entry.source !== "anniversary") {
                    const remove = document.createElement("button");
                    remove.className = "remove-memory";
                    remove.type = "button";
                    remove.textContent = "删除";
                    remove.setAttribute("aria-label", `删除 ${formatDate(entry.date)} 的动态`);
                    remove.addEventListener("click", async () => {
                        if (!window.confirm("确定删除这条动态吗？")) return;
                        remove.disabled = true;
                        try {
                            if (entry.source === "database") {
                                await deleteSavedPost(database, entry.id);
                                savedPosts = savedPosts.filter(post => post.id !== entry.id);
                            } else {
                                const remainingPosts = legacyPosts.filter(post => post.id !== entry.id);
                                localStorage.setItem(MEMORY_KEY, JSON.stringify(
                                    remainingPosts.map(({ source, ...post }) => post)
                                ));
                                legacyPosts = remainingPosts;
                            }
                            setStatus("这条动态已经删除。");
                            renderPosts();
                        } catch (error) {
                            console.error("Could not delete the post:", error);
                            remove.disabled = false;
                            setStatus("删除失败，记录仍然保留。请检查浏览器存储后重试。");
                        }
                    });
                    header.appendChild(remove);
                }
                article.appendChild(header);

                if (entry.text) {
                    const text = document.createElement("p");
                    text.className = "post-text";
                    text.textContent = entry.text;
                    article.appendChild(text);
                }

                if (Array.isArray(entry.media) && entry.media.length) {
                    const mediaGrid = document.createElement("div");
                    mediaGrid.className = `post-media-grid media-count-${Math.min(entry.media.length, 4)}`;
                    entry.media.forEach((media, index) => {
                        const url = URL.createObjectURL(media.blob || media);
                        postMediaUrls.push(url);
                        mediaGrid.appendChild(createMediaElement(media, url, index));
                    });
                    article.appendChild(mediaGrid);
                }

                const footer = document.createElement("div");
                footer.className = "post-footer";
                const footerHeart = document.createElement("span");
                footerHeart.setAttribute("aria-hidden", "true");
                footerHeart.textContent = "♡";
                footer.append(footerHeart, document.createTextNode(" 一起收藏的小日子"));
                article.appendChild(footer);
                memoryList.appendChild(article);
            });
        };

        galleryFilters.forEach(button => {
            button.addEventListener("click", () => {
                activeGalleryFilter = button.dataset.galleryFilter || "all";
                renderPosts();
            });
        });

        const renderPreview = () => {
            revokeUrls(previewUrls);
            preview.replaceChildren();
            const files = Array.from(mediaInput.files || []);
            if (!files.length) return;
            preview.className = `media-preview post-media-grid media-count-${Math.min(files.length, 4)}`;
            files.forEach((file, index) => {
                const url = URL.createObjectURL(file);
                previewUrls.push(url);
                preview.appendChild(createMediaElement(file, url, index));
            });
        };

        mediaInput.addEventListener("change", () => {
            const files = Array.from(mediaInput.files || []);
            const invalidFile = files.find(file =>
                !file.type.startsWith("image/") && !file.type.startsWith("video/")
            );
            if (invalidFile) {
                mediaInput.value = "";
                renderPreview();
                setStatus("只能添加照片或视频文件。");
                return;
            }
            renderPreview();
            setStatus(files.length ? `已选择 ${files.length} 个媒体文件，写好内容后就可以发布。` : "动态与媒体仅保存在这台设备的浏览器里 ♡");
        });

        memoryForm.addEventListener("submit", async event => {
            event.preventDefault();
            const date = dateInput.value;
            const text = textInput.value.trim();
            const files = Array.from(mediaInput.files || []);
            if (!date || (!text && !files.length)) {
                setStatus("写一点内容，或至少添加一张照片/视频，再发布动态哦。");
                return;
            }
            if (!database) {
                setStatus("浏览器本地记录功能尚未就绪，请刷新页面后重试。");
                return;
            }

            publishButton.disabled = true;
            setStatus("正在保存动态…");
            const post = {
                id: `post-${Date.now()}-${Math.random().toString(36).slice(2)}`,
                date,
                text,
                createdAt: Date.now(),
                media: files.map(file => ({ name: file.name, type: file.type, blob: file }))
            };
            try {
                await writeSavedPost(database, post);
                savedPosts.push(post);
                memoryForm.reset();
                dateInput.value = todayString;
                revokeUrls(previewUrls);
                preview.replaceChildren();
                preview.className = "media-preview";
                setStatus("发布成功，这条动态已经加入你们的回忆啦 ♡");
                renderPosts();
            } catch (error) {
                console.error("Could not publish the post:", error);
                setStatus("发布失败，浏览器可能没有足够的本地存储空间。请尝试减少或压缩媒体文件后重试。");
            } finally {
                publishButton.disabled = false;
            }
        });

        memoryForm.addEventListener("reset", () => {
            revokeUrls(previewUrls);
            preview.replaceChildren();
            preview.className = "media-preview";
        });

        try {
            legacyPosts = loadLegacyPosts();
        } catch (error) {
            console.error("Could not load older memories:", error);
            setStatus("读取旧记录时遇到问题；新动态仍可单独保存。");
        }

        renderPosts();
        openDatabase()
            .then(db => {
                database = db;
                return readSavedPosts(db);
            })
            .then(posts => {
                savedPosts = posts.filter(post =>
                    post &&
                    typeof post.id === "string" &&
                    typeof post.date === "string" &&
                    Array.isArray(post.media)
                );
                renderPosts();
                publishButton.disabled = false;
                setStatus("动态和媒体保存在这台设备上；发布成功后会出现在下面的列表。");
            })
            .catch(error => {
                console.error("Could not initialize the memories database:", error);
                publishButton.disabled = true;
                setStatus("本机记录空间无法打开，暂时不能发布以免内容丢失。请重启 App 后重试；若仍失败，请告诉我这条提示。");
            });
    }
})();

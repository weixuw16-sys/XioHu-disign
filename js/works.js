(() => {
    const categoryLabels = {
        brand: "BRAND DESIGN",
        illustration: "ILLUSTRATION",
        photo: "PHOTOGRAPHY",
        motion: "MOTION DESIGN"
    };
    const categoryFilters = document.querySelectorAll(".filter-btn");
    const gallery = document.getElementById("worksGallery");
    const loadError = document.getElementById("worksLoadError");
    const lightbox = document.getElementById("workLightbox");
    const lightboxInner = document.getElementById("lightboxInner");

    function makeMedia(work) {
        if (work.type === "video") {
            const video = document.createElement("video");
            video.muted = true;
            video.loop = true;
            video.autoplay = true;
            video.playsInline = true;
            video.controls = true;
            video.preload = "metadata";
            const source = document.createElement("source");
            source.src = work.media;
            source.type = work.media.toLowerCase().endsWith(".webm") ? "video/webm" : "video/mp4";
            video.appendChild(source);
            const fallback = document.createElement("span");
            fallback.textContent = "您的浏览器不支持视频播放。";
            video.appendChild(fallback);
            return video;
        }

        const image = document.createElement("img");
        image.src = work.media;
        image.alt = work.alt || work.title;
        image.loading = "lazy";
        return image;
    }

    function renderWorks(works) {
        gallery.replaceChildren();
        works.forEach((work, index) => {
            const categoryLabel = categoryLabels[work.category] || "DESIGN";
            const card = document.createElement("article");
            card.className = "portfolio-card";
            card.dataset.category = work.category;
            card.dataset.type = work.type;

            const media = document.createElement("div");
            media.className = `portfolio-media${work.category === "illustration" ? " illustration-media" : ""}`;
            media.appendChild(makeMedia(work));

            const overlay = document.createElement("div");
            overlay.className = "portfolio-overlay";
            const content = document.createElement("div");
            content.className = "overlay-content";
            const category = document.createElement("p");
            category.textContent = categoryLabel;
            const title = document.createElement("h2");
            title.textContent = work.title;
            const description = document.createElement("span");
            description.textContent = work.description;
            const view = document.createElement("div");
            view.className = "view-work";
            view.textContent = work.type === "video" ? "VIEW VIDEO ↗" : work.category === "photo" ? "VIEW PHOTO ↗" : "VIEW WORK ↗";
            content.append(category, title, description, view);
            overlay.appendChild(content);
            media.appendChild(overlay);

            const info = document.createElement("div");
            info.className = "portfolio-info";
            const number = document.createElement("span");
            number.textContent = `${String(index + 1).padStart(2, "0")} / ${categoryLabel}`;
            const heading = document.createElement("h3");
            heading.textContent = work.title;
            info.append(number, heading);
            card.append(media, info);
            gallery.appendChild(card);
        });
        if (window.translateXiohuPage) window.translateXiohuPage();
    }

    function setFilter(filter) {
        categoryFilters.forEach(button => button.classList.toggle("active", button.dataset.filter === filter));
        gallery.querySelectorAll(".portfolio-card").forEach((card, index) => {
            const visible = filter === "all" || card.dataset.category === filter;
            card.classList.toggle("hidden", !visible);
            if (visible) {
                card.style.animation = "none";
                void card.offsetWidth;
                card.style.animation = `cardReveal 0.7s cubic-bezier(.16,1,.3,1) ${index * 0.08}s both`;
            }
        });
    }

    function openLightbox(media) {
        lightboxInner.replaceChildren();
        let content;
        if (media instanceof HTMLVideoElement) {
            content = document.createElement("video");
            content.src = media.currentSrc || media.querySelector("source")?.src || "";
            content.controls = true;
            content.autoplay = true;
            content.loop = true;
            content.playsInline = true;
            content.play().catch(() => {});
        } else {
            content = document.createElement("img");
            content.src = media.currentSrc || media.src;
            content.alt = media.alt;
        }
        lightboxInner.appendChild(content);
        lightbox.classList.add("active");
        lightbox.setAttribute("aria-hidden", "false");
        document.body.style.overflow = "hidden";
    }

    function closeLightbox() {
        lightbox.classList.remove("active");
        lightbox.setAttribute("aria-hidden", "true");
        document.body.style.overflow = "";
        window.setTimeout(() => lightboxInner.replaceChildren(), 400);
    }

    categoryFilters.forEach(button => button.addEventListener("click", () => setFilter(button.dataset.filter)));
    gallery.addEventListener("click", event => {
        const media = event.target.closest(".portfolio-media img");
        if (media) openLightbox(media);
    });
    document.getElementById("lightboxClose").addEventListener("click", closeLightbox);
    lightbox.addEventListener("click", event => {
        if (event.target === lightbox) closeLightbox();
    });
    lightboxInner.addEventListener("click", event => event.stopPropagation());
    document.addEventListener("keydown", event => {
        if (event.key === "Escape" && lightbox.classList.contains("active")) closeLightbox();
    });

    fetch("./data/works.json", { cache: "no-store" })
        .then(response => {
            if (!response.ok) throw new Error(`作品数据请求失败：${response.status}`);
            return response.json();
        })
        .then(renderWorks)
        .catch(error => {
            console.error(error);
            gallery.replaceChildren();
            loadError.hidden = false;
        });
})();

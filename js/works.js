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
    const lightboxPrevious = document.getElementById("lightboxPrevious");
    const lightboxNext = document.getElementById("lightboxNext");
    const lightboxCounter = document.getElementById("lightboxCounter");
    let activeGallery = [];
    let activeImage = 0;

    function getImageGallery(work) {
        const images = Array.isArray(work.images) && work.images.length
            ? work.images
            : work.type === "image" ? [work.media] : [];
        return images.map((src, index) => ({
            src,
            alt: images.length > 1 ? `${work.alt || work.title} - ${index + 1}` : work.alt || work.title
        }));
    }

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
        const images = getImageGallery(work);
        image.src = images[0]?.src || work.media;
        image.alt = images[0]?.alt || work.alt || work.title;
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
            const images = getImageGallery(work);
            if (images.length) {
                media.dataset.imageGallery = JSON.stringify(images);
                if (images.length > 1) {
                    const count = document.createElement("span");
                    count.className = "media-count-badge";
                    count.textContent = `▧ ${images.length}`;
                    count.setAttribute("aria-label", `${images.length} 张图片，点击浏览`);
                    media.appendChild(count);
                }
            }

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

    function renderLightboxImage() {
        lightboxInner.replaceChildren();
        const content = document.createElement("img");
        content.src = activeGallery[activeImage].src;
        content.alt = activeGallery[activeImage].alt;
        lightboxInner.appendChild(content);
        const hasMultipleImages = activeGallery.length > 1;
        lightboxPrevious.hidden = !hasMultipleImages;
        lightboxNext.hidden = !hasMultipleImages;
        lightboxCounter.hidden = !hasMultipleImages;
        lightboxCounter.textContent = hasMultipleImages
            ? `${String(activeImage + 1).padStart(2, "0")} / ${String(activeGallery.length).padStart(2, "0")}`
            : "";
    }

    function moveGallery(delta) {
        if (activeGallery.length < 2) return;
        activeImage = (activeImage + delta + activeGallery.length) % activeGallery.length;
        renderLightboxImage();
    }

    function openLightbox(media) {
        const mediaContainer = media.closest("[data-image-gallery]");
        if (mediaContainer) {
            try {
                activeGallery = JSON.parse(mediaContainer.dataset.imageGallery);
            } catch (error) {
                console.error("Could not read the selected work's image gallery:", error);
                activeGallery = [];
            }
        }
        if (!activeGallery.length) {
            activeGallery = [{ src: media.currentSrc || media.src, alt: media.alt }];
        }
        activeImage = 0;
        renderLightboxImage();
        lightbox.classList.add("active");
        lightbox.setAttribute("aria-hidden", "false");
        document.body.style.overflow = "hidden";
    }

    function closeLightbox() {
        lightbox.classList.remove("active");
        lightbox.setAttribute("aria-hidden", "true");
        document.body.style.overflow = "";
        activeGallery = [];
        window.setTimeout(() => lightboxInner.replaceChildren(), 400);
    }

    categoryFilters.forEach(button => button.addEventListener("click", () => setFilter(button.dataset.filter)));
    gallery.addEventListener("click", event => {
        const media = event.target.closest(".portfolio-media img");
        if (media) openLightbox(media);
    });
    document.getElementById("lightboxClose").addEventListener("click", closeLightbox);
    lightboxPrevious.addEventListener("click", () => moveGallery(-1));
    lightboxNext.addEventListener("click", () => moveGallery(1));
    lightbox.addEventListener("click", event => {
        if (event.target === lightbox) closeLightbox();
    });
    lightboxInner.addEventListener("click", event => event.stopPropagation());
    let swipeStartX = null;
    lightboxInner.addEventListener("touchstart", event => {
        swipeStartX = event.changedTouches[0].clientX;
    }, { passive: true });
    lightboxInner.addEventListener("touchend", event => {
        if (swipeStartX === null) return;
        const distance = event.changedTouches[0].clientX - swipeStartX;
        if (Math.abs(distance) > 45) moveGallery(distance < 0 ? 1 : -1);
        swipeStartX = null;
    }, { passive: true });
    document.addEventListener("keydown", event => {
        if (!lightbox.classList.contains("active")) return;
        if (event.key === "Escape") closeLightbox();
        if (event.key === "ArrowLeft") moveGallery(-1);
        if (event.key === "ArrowRight") moveGallery(1);
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

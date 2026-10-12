(() => {
    const categoryLabels = {
        brand: "GRAPHIC DESIGN",
        illustration: "ILLUSTRATION",
        photo: "PHOTOGRAPHY",
        motion: "MOTION DESIGN"
    };
    const worksGrid = document.getElementById("homeWorks");
    const photographyGrid = document.getElementById("homePhotography");

    function getImageGallery(work) {
        const images = Array.isArray(work.images) && work.images.length
            ? work.images
            : work.type === "image" ? [work.media] : [];
        return images.map((src, index) => ({
            src,
            alt: images.length > 1 ? `${work.alt || work.title} - ${index + 1}` : work.alt || work.title
        }));
    }

    function createMedia(work) {
        if (work.type === "video") {
            const video = document.createElement("video");
            video.muted = true;
            video.loop = true;
            video.playsInline = true;
            video.controls = true;
            video.preload = "metadata";
            const source = document.createElement("source");
            source.src = work.media;
            source.type = work.media.toLowerCase().endsWith(".webm") ? "video/webm" : "video/mp4";
            video.appendChild(source);
            return video;
        }

        const image = document.createElement("img");
        const gallery = getImageGallery(work);
        image.src = gallery[0]?.src || work.media;
        image.alt = gallery[0]?.alt || work.alt || work.title;
        image.loading = "lazy";
        image.style.cursor = "pointer";
        return image;
    }

    function renderFeatured(works) {
        worksGrid.replaceChildren();
        works.filter(work => work.featured).slice(0, 4).forEach(work => {
            const card = document.createElement("div");
            card.className = "work-card reveal show";
            const media = document.createElement("div");
            media.className = "work-image";
            media.appendChild(createMedia(work));
            const gallery = getImageGallery(work);
            if (gallery.length) {
                media.dataset.imageGallery = JSON.stringify(gallery);
                if (gallery.length > 1) {
                    const count = document.createElement("span");
                    count.className = "media-count-badge";
                    count.textContent = `▧ ${gallery.length}`;
                    count.setAttribute("aria-label", `${gallery.length} 张图片，点击浏览`);
                    media.appendChild(count);
                }
            }
            const info = document.createElement("div");
            info.className = "work-info";
            const category = document.createElement("p");
            category.textContent = categoryLabels[work.category] || "DESIGN";
            const title = document.createElement("h3");
            title.textContent = work.title;
            const description = document.createElement("p");
            description.textContent = work.description;
            info.append(category, title, description);
            card.append(media, info);
            worksGrid.appendChild(card);
        });
    }

    function renderPhotography(works) {
        photographyGrid.replaceChildren();
        works.filter(work => work.category === "photo").slice(0, 2).forEach((work, index) => {
            const card = document.createElement("div");
            card.className = `photo-item reveal show${index === 0 ? " photo-large" : ""}`;
            const image = createMedia(work);
            image.alt = `摄影作品 ${String(index + 1).padStart(2, "0")}`;
            const gallery = getImageGallery(work);
            if (gallery.length) card.dataset.imageGallery = JSON.stringify(gallery);
            card.appendChild(image);
            if (gallery.length > 1) {
                const count = document.createElement("span");
                count.className = "media-count-badge";
                count.textContent = `▧ ${gallery.length}`;
                count.setAttribute("aria-label", `${gallery.length} 张图片，点击浏览`);
                card.appendChild(count);
            }
            const caption = document.createElement("div");
            caption.className = "photo-caption";
            const number = document.createElement("span");
            number.textContent = String(index + 1).padStart(2, "0");
            const title = document.createElement("h3");
            title.textContent = work.title;
            caption.append(number, title);
            card.appendChild(caption);
            photographyGrid.appendChild(card);
        });
    }

    fetch("./data/works.json", { cache: "no-store" })
        .then(response => {
            if (!response.ok) throw new Error(`作品数据请求失败：${response.status}`);
            return response.json();
        })
        .then(works => {
            renderFeatured(works);
            renderPhotography(works);
            if (window.translateXiohuPage) window.translateXiohuPage();
        })
        .catch(error => {
            console.error(error);
            [worksGrid, photographyGrid].forEach(grid => {
                const message = document.createElement("p");
                message.className = "portfolio-load-error";
                message.textContent = "作品暂时无法载入，请稍后重试。";
                grid.replaceChildren(message);
            });
        });
})();

const revealElements = document.querySelectorAll(
    ".section-title, .about-content > div, .skill-card, .software-list span, .contact > *, footer"
);

revealElements.forEach((element, index) => {
    element.classList.add("reveal");
    element.style.setProperty("--delay", `${(index % 4) * 0.12}s`);
});

const observer = new IntersectionObserver(entries => {
    entries.forEach(entry => {
        if (entry.isIntersecting) {
            entry.target.classList.add("show");
            observer.unobserve(entry.target);
        }
    });
}, { threshold: 0.15 });

revealElements.forEach(element => observer.observe(element));

const lightbox = document.getElementById("lightbox");
const lightboxContent = document.getElementById("lightboxContent");
const lightboxClose = document.getElementById("lightboxClose");
const lightboxPrevious = document.getElementById("lightboxPrevious");
const lightboxNext = document.getElementById("lightboxNext");
const lightboxCounter = document.getElementById("lightboxCounter");
let activeHomeGallery = [];
let activeHomeImage = 0;

function renderHomeLightboxImage() {
    lightboxContent.replaceChildren();
    const image = document.createElement("img");
    image.src = activeHomeGallery[activeHomeImage].src;
    image.alt = activeHomeGallery[activeHomeImage].alt;
    lightboxContent.appendChild(image);
    const hasMultipleImages = activeHomeGallery.length > 1;
    lightboxPrevious.hidden = !hasMultipleImages;
    lightboxNext.hidden = !hasMultipleImages;
    lightboxCounter.hidden = !hasMultipleImages;
    lightboxCounter.textContent = hasMultipleImages
        ? `${String(activeHomeImage + 1).padStart(2, "0")} / ${String(activeHomeGallery.length).padStart(2, "0")}`
        : "";
}

function moveHomeGallery(delta) {
    if (activeHomeGallery.length < 2) return;
    activeHomeImage = (activeHomeImage + delta + activeHomeGallery.length) % activeHomeGallery.length;
    renderHomeLightboxImage();
}

function openHomeLightbox(media) {
    const galleryElement = media.closest("[data-image-gallery]");
    if (galleryElement) {
        try {
            activeHomeGallery = JSON.parse(galleryElement.dataset.imageGallery);
        } catch (error) {
            console.error("Could not read the selected work's image gallery:", error);
            activeHomeGallery = [];
        }
    }
    if (!activeHomeGallery.length) {
        activeHomeGallery = [{ src: media.currentSrc || media.src, alt: media.alt }];
    }
    activeHomeImage = 0;
    renderHomeLightboxImage();
    lightbox.classList.add("active");
    document.body.style.overflow = "hidden";
}

function closeHomeLightbox() {
    lightbox.classList.remove("active");
    document.body.style.overflow = "";
    activeHomeGallery = [];
    window.setTimeout(() => lightboxContent.replaceChildren(), 400);
}

document.addEventListener("click", event => {
    const media = event.target.closest(".work-image img, .photo-item img, .hero-image img");
    if (media) {
        openHomeLightbox(media);
    } else if (event.target === lightboxClose || event.target === lightbox) {
        closeHomeLightbox();
    }
});

lightboxContent.addEventListener("click", event => event.stopPropagation());
lightboxPrevious.addEventListener("click", () => moveHomeGallery(-1));
lightboxNext.addEventListener("click", () => moveHomeGallery(1));

let homeSwipeStartX = null;
lightboxContent.addEventListener("touchstart", event => {
    homeSwipeStartX = event.changedTouches[0].clientX;
}, { passive: true });
lightboxContent.addEventListener("touchend", event => {
    if (homeSwipeStartX === null) return;
    const distance = event.changedTouches[0].clientX - homeSwipeStartX;
    if (Math.abs(distance) > 45) moveHomeGallery(distance < 0 ? 1 : -1);
    homeSwipeStartX = null;
}, { passive: true });

document.addEventListener("keydown", event => {
    if (!lightbox.classList.contains("active")) return;
    if (event.key === "Escape") closeHomeLightbox();
    if (event.key === "ArrowLeft") moveHomeGallery(-1);
    if (event.key === "ArrowRight") moveHomeGallery(1);
});

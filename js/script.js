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

function openHomeLightbox(media) {
    lightboxContent.replaceChildren();
    if (media instanceof HTMLVideoElement) {
        const video = document.createElement("video");
        video.src = media.currentSrc || media.querySelector("source")?.src || "";
        video.controls = true;
        video.autoplay = true;
        video.loop = true;
        video.playsInline = true;
        lightboxContent.appendChild(video);
        video.play().catch(() => {});
    } else {
        const image = document.createElement("img");
        image.src = media.currentSrc || media.src;
        image.alt = media.alt;
        lightboxContent.appendChild(image);
    }
    lightbox.classList.add("active");
    document.body.style.overflow = "hidden";
}

function closeHomeLightbox() {
    lightbox.classList.remove("active");
    document.body.style.overflow = "";
    window.setTimeout(() => lightboxContent.replaceChildren(), 400);
}

document.addEventListener("click", event => {
    const media = event.target.closest(".work-image img, .work-image video, .photo-item img, .hero-image img");
    if (media) {
        if (media instanceof HTMLVideoElement) event.preventDefault();
        openHomeLightbox(media);
        return;
    }
    if (event.target === lightboxClose || event.target === lightbox) closeHomeLightbox();
});

lightboxContent.addEventListener("click", event => event.stopPropagation());
document.addEventListener("keydown", event => {
    if (event.key === "Escape" && lightbox.classList.contains("active")) closeHomeLightbox();
});

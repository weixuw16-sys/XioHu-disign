import { validateWork } from "./manager.ts";

function imageWork(count: number) {
  const mediaItems = Array.from(
    { length: count },
    () => `./works-assets/${crypto.randomUUID()}.jpg`,
  );
  return {
    id: `work-${crypto.randomUUID()}`,
    category: "photo",
    type: "image",
    title: "Test work",
    description: "",
    media: mediaItems[0],
    mediaItems,
    alt: "Test work",
    featured: false,
  };
}

Deno.test("accepts a work containing 20 distinct images", () => {
  validateWork(imageWork(20));
});

Deno.test("rejects a work containing more than 20 images", () => {
  let rejected = false;
  try {
    validateWork(imageWork(21));
  } catch {
    rejected = true;
  }
  if (!rejected) throw new Error("Expected 21-image work to be rejected");
});

Deno.test("continues accepting legacy single-video work", () => {
  validateWork({
    id: `work-${crypto.randomUUID()}`,
    category: "motion",
    type: "video",
    title: "Test video",
    description: "",
    media: "./works-assets/video.mp4",
    alt: "Test video",
    featured: false,
  });
});

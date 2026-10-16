import { cp, mkdir, readFile, rm, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const appDirectory = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const repositoryRoot = path.resolve(appDirectory, "..");
const webDirectory = path.join(appDirectory, "www");

const appPages = [
    "confession.html",
    "confession-success.html",
    "couple-space.html",
    "games.html",
    "memories.html",
    "setup.html",
    "wake.html"
];

await rm(webDirectory, { recursive: true, force: true });
await mkdir(webDirectory, { recursive: true });

for (const page of appPages) {
    const source = await readFile(path.join(repositoryRoot, page), "utf8");
    const nativePage = source.includes('src="./js/couple-client.js"')
        ? source.replace(
            '    <script src="./js/couple-client.js"></script>',
            '    <script src="./js/native-runtime.js"></script>\n    <script src="./js/couple-client.js"></script>'
        )
        : source.replace(
            '    <script src="./js/love.js"></script>',
            '    <script src="./js/native-runtime.js"></script>\n    <script src="./js/couple-client.js"></script>\n    <script src="./js/love.js"></script>'
        );
    await writeFile(path.join(webDirectory, page), nativePage);
}

for (const assetDirectory of ["css", "js", "icons"]) {
    await cp(
        path.join(repositoryRoot, assetDirectory),
        path.join(webDirectory, assetDirectory),
        { recursive: true }
    );
}

await cp(
    path.join(repositoryRoot, "love-app.webmanifest"),
    path.join(webDirectory, "love-app.webmanifest")
);

const homePage = await readFile(path.join(webDirectory, "setup.html"), "utf8");
await writeFile(path.join(webDirectory, "index.html"), homePage);

console.log(`Synced the couple app web assets to ${webDirectory}`);

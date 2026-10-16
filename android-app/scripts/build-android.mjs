import { spawn } from "node:child_process";
import path from "node:path";
import { fileURLToPath } from "node:url";

const appDirectory = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const isWindows = process.platform === "win32";
const npmCommand = isWindows ? "npm.cmd" : "npm";

const run = (command, args, cwd) => new Promise((resolve, reject) => {
    const child = spawn(command, args, {
        cwd,
        stdio: "inherit",
        shell: isWindows
    });
    child.on("error", reject);
    child.on("exit", code => {
        if (code === 0) resolve();
        else reject(new Error(`${command} exited with code ${code ?? "unknown"}`));
    });
});

const gradleWrapper = isWindows ? "gradlew.bat" : "./gradlew";
const gradlePath = path.join(appDirectory, "android", gradleWrapper);

await run(npmCommand, ["run", "android:sync"], appDirectory);
await run(gradlePath, ["assembleDebug"], path.join(appDirectory, "android"));

console.log(
    `Debug APK created at ${path.join(appDirectory, "android", "app", "build", "outputs", "apk", "debug", "app-debug.apk")}`
);

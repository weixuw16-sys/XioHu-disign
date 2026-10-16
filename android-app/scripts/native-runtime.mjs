import { App } from "@capacitor/app";
import { Capacitor } from "@capacitor/core";
import { StatusBar, Style } from "@capacitor/status-bar";

if (Capacitor.isNativePlatform()) {
    StatusBar.setStyle({ style: Style.Dark }).catch(error => {
        console.error("Could not configure the Android status bar:", error);
    });
    StatusBar.setBackgroundColor({ color: "#fff7fb" }).catch(error => {
        console.error("Could not configure the Android status bar color:", error);
    });

    App.addListener("backButton", ({ canGoBack }) => {
        if (canGoBack) {
            window.history.back();
            return;
        }

        const currentPage = window.location.pathname;
        if (currentPage.endsWith("/index.html") || currentPage.endsWith("/couple-space.html")) {
            App.exitApp();
            return;
        }

        window.location.replace("./couple-space.html");
    }).catch(error => {
        console.error("Could not configure Android back navigation:", error);
    });
}

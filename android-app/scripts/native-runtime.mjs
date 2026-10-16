import { App } from "@capacitor/app";
import { Capacitor } from "@capacitor/core";
import { PushNotifications } from "@capacitor/push-notifications";
import { StatusBar, Style } from "@capacitor/status-bar";

if (Capacitor.isNativePlatform()) {
    StatusBar.setStyle({ style: Style.Dark }).catch(error => {
        console.error("Could not configure the Android status bar:", error);
    });
    StatusBar.setBackgroundColor({ color: "#fff7fb" }).catch(error => {
        console.error("Could not configure the Android status bar color:", error);
    });

    window.LovePush = {
        register: async () => {
            if (!window.LoveFirebaseConfigured) return false;
            let permissions = await PushNotifications.checkPermissions();
            if (permissions.receive !== "granted") {
                permissions = await PushNotifications.requestPermissions();
            }
            if (permissions.receive !== "granted") return false;
            await PushNotifications.register();
            return true;
        },
        onToken: null,
        onNotification: null,
        onNotificationAction: null
    };

    PushNotifications.addListener("registration", token => {
        window.LovePush?.onToken?.(token.value);
    }).catch(error => {
        console.error("Could not listen for push registration:", error);
    });
    PushNotifications.addListener("registrationError", error => {
        console.error("Push notification registration failed:", error);
    }).catch(error => {
        console.error("Could not listen for push registration errors:", error);
    });
    PushNotifications.addListener("pushNotificationReceived", notification => {
        window.LovePush?.onNotification?.(notification);
    }).catch(error => {
        console.error("Could not listen for received push notifications:", error);
    });
    PushNotifications.addListener("pushNotificationActionPerformed", action => {
        window.LovePush?.onNotificationAction?.(action);
    }).catch(error => {
        console.error("Could not listen for push notification actions:", error);
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

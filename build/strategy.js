"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.iframeStrategy = exports.popupStrategy = void 0;
const utils_1 = require("./utils");
const popupStrategy = () => {
    let signWindow = null;
    let unloadHandler = null;
    return {
        onInitialized(link) {
            if ((0, utils_1.isMobile)()) {
                window.location.href = link;
            }
            else {
                signWindow = window.open(link, "_blank");
                unloadHandler = () => signWindow === null || signWindow === void 0 ? void 0 : signWindow.close();
                window.addEventListener("beforeunload", unloadHandler);
            }
        },
        onCompleted() {
            signWindow === null || signWindow === void 0 ? void 0 : signWindow.close();
            window.removeEventListener("beforeunload", unloadHandler);
        },
    };
};
exports.popupStrategy = popupStrategy;
const iframeStrategy = () => {
    let iframe = document.createElement("iframe");
    return {
        onInitialized(link) {
            iframe.src = link;
            iframe.style.position = "fixed";
            iframe.style.left = "0";
            iframe.style.top = "0";
            iframe.style.border = "none";
            iframe.style.borderRadius = "0";
            iframe.style.width = "100vw";
            iframe.style.height = "100vh";
            document.body.appendChild(iframe);
        },
        onCompleted() {
            document.body.removeChild(iframe);
        },
    };
};
exports.iframeStrategy = iframeStrategy;

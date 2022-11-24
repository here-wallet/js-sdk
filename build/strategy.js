"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.DefaultStrategy = void 0;
class DefaultStrategy {
    onInitialized() {
        const left = window.innerWidth / 2 - 400 / 2;
        const top = window.innerHeight / 2 - 700 / 2 + 48;
        this.signWindow = window.open("about:blank", "_blank", `popup=1,width=400,height=700,top=${top},left=${left}`);
    }
    onRequested(link) {
        this.unloadHandler = () => { var _a; return (_a = this.signWindow) === null || _a === void 0 ? void 0 : _a.close(); };
        window.addEventListener("beforeunload", this.unloadHandler);
        if (this.signWindow) {
            this.signWindow.location = link;
        }
    }
    onFailed() {
        var _a;
        (_a = this.signWindow) === null || _a === void 0 ? void 0 : _a.close();
        window.removeEventListener("beforeunload", this.unloadHandler);
    }
    onSuccess() {
        var _a;
        (_a = this.signWindow) === null || _a === void 0 ? void 0 : _a.close();
        window.removeEventListener("beforeunload", this.unloadHandler);
    }
}
exports.DefaultStrategy = DefaultStrategy;

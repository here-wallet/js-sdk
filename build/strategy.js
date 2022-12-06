export class DefaultStrategy {
    constructor() {
        this.signWindow = null;
        this.onFailed = () => this.close();
        this.onSuccess = () => this.close();
    }
    onInitialized() {
        const left = window.innerWidth / 2 - 560 / 2;
        const top = window.innerHeight / 2 - 700 / 2;
        this.signWindow = window.open("about:blank", "_blank", `popup=1,width=420,height=700,top=${top},left=${left}`);
    }
    onRequested(link, args, reject) {
        if (this.signWindow == null)
            return;
        this.unloadHandler = () => { var _a; return (_a = this.signWindow) === null || _a === void 0 ? void 0 : _a.close(); };
        window.addEventListener("beforeunload", this.unloadHandler);
        this.signWindow.location = link;
        this.timerHandler = setInterval(() => {
            var _a;
            if ((_a = this.signWindow) === null || _a === void 0 ? void 0 : _a.closed)
                reject("CLOSED");
        }, 1000);
    }
    close() {
        var _a;
        window.removeEventListener("beforeunload", this.unloadHandler);
        clearInterval(this.timerHandler);
        (_a = this.signWindow) === null || _a === void 0 ? void 0 : _a.close();
    }
}
//# sourceMappingURL=strategy.js.map
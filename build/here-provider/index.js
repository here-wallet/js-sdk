import { __awaiter, __rest } from "tslib";
import { isMobile } from "../utils";
import { HereProviderStatus } from "../provider";
import { createRequest, getResponse, deleteRequest, proxyApi, getRequest } from "./methods";
export const proxyProvider = (_a) => { var _b, _c; return __awaiter(void 0, void 0, void 0, function* () {
    var { strategy, id, args, signal } = _a, delegate = __rest(_a, ["strategy", "id", "args", "signal"]);
    if (id != null)
        args = yield getRequest(id, signal);
    else
        id = yield createRequest(args, signal);
    const socketApi = proxyApi.replace("https", "wss");
    let fallbackHttpTimer = null;
    const deeplink = `${proxyApi}/${id}`;
    (_b = delegate.onRequested) === null || _b === void 0 ? void 0 : _b.call(delegate, deeplink, args);
    (_c = strategy === null || strategy === void 0 ? void 0 : strategy.onRequested) === null || _c === void 0 ? void 0 : _c.call(strategy, deeplink, args);
    return new Promise((resolve, reject) => {
        let socket = null;
        const clear = () => __awaiter(void 0, void 0, void 0, function* () {
            fallbackHttpTimer = -1;
            clearInterval(fallbackHttpTimer);
            socket === null || socket === void 0 ? void 0 : socket.close();
            yield deleteRequest(id);
        });
        signal === null || signal === void 0 ? void 0 : signal.addEventListener("abort", () => processApprove({
            account_id: "",
            status: HereProviderStatus.FAILED,
            payload: "abort",
        }));
        const processApprove = (data) => {
            var _a, _b, _c, _d, _e, _f;
            switch (data.status) {
                case HereProviderStatus.APPROVING:
                    (_a = delegate.onApproving) === null || _a === void 0 ? void 0 : _a.call(delegate, data);
                    (_b = strategy === null || strategy === void 0 ? void 0 : strategy.onApproving) === null || _b === void 0 ? void 0 : _b.call(strategy, data);
                    return;
                case HereProviderStatus.FAILED:
                    clear();
                    reject(data);
                    (_c = delegate.onFailed) === null || _c === void 0 ? void 0 : _c.call(delegate, data);
                    (_d = strategy === null || strategy === void 0 ? void 0 : strategy.onFailed) === null || _d === void 0 ? void 0 : _d.call(strategy, data);
                    return;
                case HereProviderStatus.SUCCESS:
                    clear();
                    resolve(data);
                    (_e = delegate.onSuccess) === null || _e === void 0 ? void 0 : _e.call(delegate, data);
                    (_f = strategy === null || strategy === void 0 ? void 0 : strategy.onSuccess) === null || _f === void 0 ? void 0 : _f.call(strategy, data);
                    return;
            }
        };
        const setupTimer = () => {
            if (fallbackHttpTimer === -1) {
                return;
            }
            fallbackHttpTimer = setTimeout(() => __awaiter(void 0, void 0, void 0, function* () {
                try {
                    const data = yield getResponse(id);
                    if (fallbackHttpTimer === -1)
                        return;
                    processApprove(data);
                }
                finally {
                    setupTimer();
                }
            }), 3000);
        };
        setupTimer();
        // Mobile flow doesn't support cross tabs socket background process
        if (isMobile() === false) {
            const endpoint = `${socketApi}/ws/${id}`;
            socket = new WebSocket(endpoint);
            socket.onmessage = (e) => {
                if (e.data == null)
                    return;
                try {
                    const data = JSON.parse(e.data);
                    processApprove(data);
                }
                catch (_a) {
                    // nope
                }
            };
        }
    });
}); };
//# sourceMappingURL=index.js.map
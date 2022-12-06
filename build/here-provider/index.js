var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __rest = (this && this.__rest) || function (s, e) {
    var t = {};
    for (var p in s) if (Object.prototype.hasOwnProperty.call(s, p) && e.indexOf(p) < 0)
        t[p] = s[p];
    if (s != null && typeof Object.getOwnPropertySymbols === "function")
        for (var i = 0, p = Object.getOwnPropertySymbols(s); i < p.length; i++) {
            if (e.indexOf(p[i]) < 0 && Object.prototype.propertyIsEnumerable.call(s, p[i]))
                t[p[i]] = s[p[i]];
        }
    return t;
};
import { isMobile } from "../utils";
import { HereProviderError, HereProviderStatus } from "../provider";
import { createRequest, getResponse, deleteRequest, proxyApi, getRequest } from "./methods";
export const proxyProvider = (_a) => __awaiter(void 0, void 0, void 0, function* () {
    var { strategy, id, args, signal } = _a, delegate = __rest(_a, ["strategy", "id", "args", "signal"]);
    if (id != null)
        args = yield getRequest(id, signal);
    else
        id = yield createRequest(args, signal);
    return new Promise((resolve, reject) => {
        var _a, _b;
        const socketApi = proxyApi.replace("https", "wss");
        let fallbackHttpTimer = null;
        let socket = null;
        const clear = () => __awaiter(void 0, void 0, void 0, function* () {
            fallbackHttpTimer = -1;
            clearInterval(fallbackHttpTimer);
            socket === null || socket === void 0 ? void 0 : socket.close();
            yield deleteRequest(id);
        });
        const processApprove = (data) => {
            var _a, _b, _c, _d, _e, _f;
            switch (data.status) {
                case HereProviderStatus.APPROVING:
                    (_a = delegate.onApproving) === null || _a === void 0 ? void 0 : _a.call(delegate, data);
                    (_b = strategy === null || strategy === void 0 ? void 0 : strategy.onApproving) === null || _b === void 0 ? void 0 : _b.call(strategy, data);
                    return;
                case HereProviderStatus.FAILED:
                    clear();
                    reject(new HereProviderError(data.payload));
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
        const rejectAction = (payload) => {
            processApprove({ status: HereProviderStatus.FAILED, payload });
        };
        const deeplink = `${proxyApi}/${id}`;
        (_a = delegate.onRequested) === null || _a === void 0 ? void 0 : _a.call(delegate, deeplink, args, rejectAction);
        (_b = strategy === null || strategy === void 0 ? void 0 : strategy.onRequested) === null || _b === void 0 ? void 0 : _b.call(strategy, deeplink, args, rejectAction);
        signal === null || signal === void 0 ? void 0 : signal.addEventListener("abort", () => rejectAction());
        const setupTimer = () => {
            if (fallbackHttpTimer === -1) {
                return;
            }
            fallbackHttpTimer = setTimeout(() => __awaiter(void 0, void 0, void 0, function* () {
                var _a, _b;
                try {
                    const data = yield getResponse(id);
                    if (fallbackHttpTimer === -1)
                        return;
                    processApprove(data);
                    setupTimer();
                }
                catch (e) {
                    const status = HereProviderStatus.FAILED;
                    const error = e instanceof Error ? e : undefined;
                    const payload = error === null || error === void 0 ? void 0 : error.message;
                    clear();
                    reject(new HereProviderError(payload, error));
                    (_a = delegate.onFailed) === null || _a === void 0 ? void 0 : _a.call(delegate, { status, payload });
                    (_b = strategy === null || strategy === void 0 ? void 0 : strategy.onFailed) === null || _b === void 0 ? void 0 : _b.call(strategy, { status, payload });
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
});
//# sourceMappingURL=index.js.map
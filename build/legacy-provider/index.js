import { __awaiter, __rest } from "tslib";
import uuid4 from "uuid4";
import { isMobile } from "../utils";
import { HereProviderError, HereProviderStatus } from "../provider";
import { createRequest, getRequest, getTransactionStatus } from "./methods";
export const hereConfigurations = {
    mainnet: {
        hereApi: "https://api.herewallet.app",
        hereConnector: "https://web.herewallet.app",
    },
    testnet: {
        hereApi: "https://api.testnet.herewallet.app",
        hereConnector: "https://web.testnet.herewallet.app",
    },
};
export const legacyProvider = (_a) => __awaiter(void 0, void 0, void 0, function* () {
    var { id, strategy, signal, network, args } = _a, delegate = __rest(_a, ["id", "strategy", "signal", "network", "args"]);
    const { hereApi, hereConnector } = hereConfigurations[network];
    if (id != null)
        args = yield getRequest(hereApi, id, signal);
    else {
        id = uuid4();
        yield createRequest(hereApi, hereConnector, id, args, signal);
    }
    return new Promise((resolve, reject) => {
        var _a, _b;
        const socketApi = hereApi.replace("https", "wss");
        let fallbackHttpTimer = null;
        let socket = null;
        const clear = () => {
            fallbackHttpTimer = -1;
            clearInterval(fallbackHttpTimer);
            socket === null || socket === void 0 ? void 0 : socket.close();
        };
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
        const deeplink = `${hereConnector}?request_id=${id}`;
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
                    const data = yield getTransactionStatus(hereApi, id);
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
            const endpoint = `${socketApi}/api/v1/web/ws/transaction_approved/${id}`;
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
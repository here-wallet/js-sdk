import { __awaiter } from "tslib";
import { getDeviceId } from "../utils";
export const getRequest = (hereApi, id, signal) => __awaiter(void 0, void 0, void 0, function* () {
    const res = yield fetch(`${hereApi}/api/v1/web/web_request?request_id=${id}`, {
        headers: { "content-type": "application/json" },
        method: "GET",
        signal,
    });
    if (res.ok === false) {
        throw Error(yield res.text());
    }
    const { transaction } = yield res.json();
    return Object.fromEntries(new URL(transaction).searchParams.entries());
});
export const getTransactionStatus = (api, request) => __awaiter(void 0, void 0, void 0, function* () {
    const res = yield fetch(`${api}/api/v1/web/web_request?request_id=${request}`, {
        method: "GET",
        headers: { "content-type": "application/json" },
    });
    if (res.ok === false) {
        throw Error();
    }
    const data = yield res.json();
    return {
        account_id: data.account_id,
        payload: data.transaction_hash,
        status: data.status,
    };
});
export const createRequest = (hereApi, hereConnector, request, options, signal) => __awaiter(void 0, void 0, void 0, function* () {
    var _a;
    const query = new URLSearchParams(options);
    query.append("request_id", request);
    try {
        const host = (_a = new URL(document.referrer).hostname) !== null && _a !== void 0 ? _a : "";
        query.append("referrer", host);
    }
    catch (_b) {
        //
    }
    const res = yield fetch(`${hereApi}/api/v1/web/request_transaction_sign`, {
        method: "POST",
        signal,
        body: JSON.stringify({
            transaction: `${hereConnector}/approve?${query}`,
            request_id: request,
            topic: getDeviceId(),
        }),
        headers: {
            "content-type": "application/json",
        },
    });
    if (res.ok === false) {
        throw Error(yield res.text());
    }
});
//# sourceMappingURL=methods.js.map
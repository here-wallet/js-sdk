var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
import sha1 from "sha1";
import uuid4 from "uuid4";
import { getDeviceId } from "../utils";
export const proxyApi = "https://h4n.app";
export const getRequest = (id, signal) => __awaiter(void 0, void 0, void 0, function* () {
    const res = yield fetch(`${proxyApi}/${id}/request`, {
        signal,
        headers: { "content-type": "application/json" },
        method: "GET",
    });
    if (res.ok === false) {
        throw Error(yield res.text());
    }
    const { data } = yield res.json();
    return Object.fromEntries(new URLSearchParams(data).entries());
});
export const getResponse = (id) => __awaiter(void 0, void 0, void 0, function* () {
    var _a, _b, _c, _d;
    const res = yield fetch(`${proxyApi}/${id}/response`, {
        headers: { "content-type": "application/json" },
        method: "GET",
    });
    if (res.ok === false) {
        throw Error(yield res.text());
    }
    const { data } = yield res.json();
    const result = (_a = JSON.parse(data)) !== null && _a !== void 0 ? _a : {};
    return {
        account_id: (_b = result.account_id) !== null && _b !== void 0 ? _b : "",
        payload: (_c = result.payload) !== null && _c !== void 0 ? _c : "",
        status: (_d = result.status) !== null && _d !== void 0 ? _d : -1,
    };
});
export const deleteRequest = (id) => __awaiter(void 0, void 0, void 0, function* () {
    const res = yield fetch(`${proxyApi}/${id}`, {
        headers: { "content-type": "application/json" },
        method: "DELETE",
    });
    if (res.ok === false) {
        throw Error(yield res.text());
    }
});
export const createRequest = (args, signal) => __awaiter(void 0, void 0, void 0, function* () {
    var _e;
    const query = new URLSearchParams(args);
    query.append("nonce", uuid4());
    try {
        const host = (_e = new URL(document.referrer).hostname) !== null && _e !== void 0 ? _e : "";
        query.append("referrer", host);
    }
    catch (_f) {
        //
    }
    const hashsum = sha1(query.toString());
    const id = Buffer.from(hashsum, "hex").toString("base64");
    const urlsafe = id.replaceAll("/", "_").replaceAll("-", "+").slice(0, 13);
    const res = yield fetch(`${proxyApi}/${urlsafe}/request`, {
        method: "POST",
        signal,
        body: JSON.stringify({
            type: "sign_web",
            data: query.toString(),
            topic_id: getDeviceId(),
        }),
        headers: {
            "content-type": "application/json",
        },
    });
    if (res.ok === false) {
        throw Error(yield res.text());
    }
    return urlsafe;
});
//# sourceMappingURL=methods.js.map
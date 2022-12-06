var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
import uuid4 from "uuid4";
import { utils, transactions as nearTransactions } from "near-api-js";
import { HereProviderError, HereProviderStatus } from "./provider";
import { createAction } from "./actions";
export const getDeviceId = () => {
    const topicId = window.localStorage.getItem("herewallet-topic") || uuid4();
    window.localStorage.setItem("herewallet-topic", topicId);
    return topicId;
};
export const isMobile = () => {
    return window.matchMedia("(any-pointer:coarse)").matches;
};
export const getPublicKeys = (rpc, accountId) => __awaiter(void 0, void 0, void 0, function* () {
    const res = yield fetch(rpc, {
        method: "POST",
        body: JSON.stringify({
            jsonrpc: "2.0",
            id: "dontcare",
            method: "query",
            params: {
                request_type: "view_access_key_list",
                finality: "final",
                account_id: accountId,
            },
        }),
        headers: {
            "content-type": "application/json",
        },
    });
    if (res.ok === false) {
        return [];
    }
    const data = yield res.json();
    return data.result.keys;
});
export const internalThrow = (error, delegate) => {
    var _a, _b, _c;
    if (error instanceof HereProviderError) {
        throw error;
    }
    const result = {
        payload: error instanceof Error ? error.message : "UNKNOWN",
        status: HereProviderStatus.FAILED,
        account_id: "",
    };
    (_a = delegate.onFailed) === null || _a === void 0 ? void 0 : _a.call(delegate, result);
    (_c = (_b = delegate === null || delegate === void 0 ? void 0 : delegate.strategy) === null || _b === void 0 ? void 0 : _b.onFailed) === null || _c === void 0 ? void 0 : _c.call(_b, result);
    throw error;
};
export const transformTransactions = (account, transactions) => __awaiter(void 0, void 0, void 0, function* () {
    const { networkId, signer, provider } = account.connection;
    const localKey = yield signer.getPublicKey(account.accountId, networkId);
    const transformed = [];
    let index = 0;
    for (const transaction of transactions) {
        index += 1;
        const actions = transaction.actions.map((action) => createAction(action));
        const accessKey = yield account.accessKeyForTransaction(transaction.receiverId, actions, localKey);
        if (!accessKey) {
            throw new Error(`Failed to find matching key for transaction sent to ${transaction.receiverId}`);
        }
        const block = yield provider.block({ finality: "final" });
        transformed.push(nearTransactions.createTransaction(account.accountId, utils.PublicKey.from(accessKey.public_key), transaction.receiverId, accessKey.access_key.nonce + index, actions, utils.serialize.base_decode(block.header.hash)));
    }
    return transformed;
});
//# sourceMappingURL=utils.js.map
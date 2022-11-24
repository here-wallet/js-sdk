"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.isMobile = exports.transformTransactions = exports.getHereBalance = exports.setupWalletState = exports.hereConfigurations = exports.createRequest = exports.getTransactionStatus = exports.getPublicKeys = void 0;
const wallet_utils_1 = require("@near-wallet-selector/wallet-utils");
const near_api_js_1 = require("near-api-js");
const uuid4_1 = __importDefault(require("uuid4"));
const bn_js_1 = __importDefault(require("bn.js"));
const topicId = window.localStorage.getItem("herewallet-topic") || (0, uuid4_1.default)();
window.localStorage.setItem("herewallet-topic", topicId);
const getPublicKeys = (rpc, accountId) => __awaiter(void 0, void 0, void 0, function* () {
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
exports.getPublicKeys = getPublicKeys;
const getTransactionStatus = (api, request) => __awaiter(void 0, void 0, void 0, function* () {
    const res = yield fetch(`${api}/api/v1/web/web_request?request_id=${request}`, {
        method: "GET",
        headers: { "content-type": "application/json" },
    });
    if (res.ok === false) {
        throw Error();
    }
    return yield res.json();
});
exports.getTransactionStatus = getTransactionStatus;
const createRequest = (config, request, options) => {
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
    return fetch(`${config.hereApi}/api/v1/web/request_transaction_sign`, {
        method: "POST",
        body: JSON.stringify({
            transaction: `${config.hereConnector}/approve?${query}`,
            request_id: request,
            topic: topicId,
        }),
        headers: {
            "content-type": "application/json",
        },
    });
};
exports.createRequest = createRequest;
exports.hereConfigurations = {
    mainnet: {
        hereApi: "https://api.herewallet.app",
        hereConnector: "https://web.herewallet.app",
        hereContract: "storage.herewallet.near",
        download: "https://appstore.herewallet.app/selector",
    },
    testnet: {
        hereApi: "https://api.testnet.herewallet.app",
        hereConnector: "https://web.testnet.herewallet.app",
        hereContract: "storage.herewallet.testnet",
        download: "https://testflight.apple.com/join/LwvGXAK8",
    },
};
const setupWalletState = (config, network) => __awaiter(void 0, void 0, void 0, function* () {
    const keyStore = new near_api_js_1.keyStores.BrowserLocalStorageKeyStore();
    const near = yield (0, near_api_js_1.connect)(Object.assign({ keyStore, walletUrl: config.hereConnector, headers: {} }, network));
    const wallet = new near_api_js_1.WalletConnection(near, "here_app");
    return { wallet, keyStore };
});
exports.setupWalletState = setupWalletState;
const getHereBalance = (state, config) => __awaiter(void 0, void 0, void 0, function* () {
    const params = { account_id: state.wallet.getAccountId() };
    const hereCoins = yield state.wallet
        .account()
        .viewFunction(config.hereContract, "ft_balance_of", params)
        .catch(() => "0");
    return new bn_js_1.default(hereCoins);
});
exports.getHereBalance = getHereBalance;
const transformTransactions = (state, transactions) => __awaiter(void 0, void 0, void 0, function* () {
    const account = state.wallet.account();
    const { networkId, signer, provider } = account.connection;
    const localKey = yield signer.getPublicKey(account.accountId, networkId);
    const transformed = [];
    let index = 0;
    for (const transaction of transactions) {
        index += 1;
        const actions = transaction.actions.map((action) => (0, wallet_utils_1.createAction)(action));
        const accessKey = yield account.accessKeyForTransaction(transaction.receiverId, actions, localKey);
        if (!accessKey) {
            throw new Error(`Failed to find matching key for transaction sent to ${transaction.receiverId}`);
        }
        const block = yield provider.block({ finality: "final" });
        transformed.push(near_api_js_1.transactions.createTransaction(account.accountId, near_api_js_1.utils.PublicKey.from(accessKey.public_key), transaction.receiverId, accessKey.access_key.nonce + index, actions, near_api_js_1.utils.serialize.base_decode(block.header.hash)));
    }
    return transformed;
});
exports.transformTransactions = transformTransactions;
const isMobile = () => {
    return window.matchMedia("(any-pointer:coarse)").matches;
};
exports.isMobile = isMobile;

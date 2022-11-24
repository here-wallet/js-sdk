"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    Object.defineProperty(o, k2, { enumerable: true, get: function() { return m[k]; } });
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (k !== "default" && Object.prototype.hasOwnProperty.call(mod, k)) __createBinding(result, mod, k);
    __setModuleDefault(result, mod);
    return result;
};
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
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.initHereWallet = void 0;
const wallet_utils_1 = require("@near-wallet-selector/wallet-utils");
const key_pair_1 = require("near-api-js/lib/utils/key_pair");
const transaction_1 = require("near-api-js/lib/transaction");
const near_api_js_1 = require("near-api-js");
const borsh = __importStar(require("borsh"));
const bn_js_1 = __importDefault(require("bn.js"));
const async_1 = require("./async");
const utils_1 = require("./utils");
const initHereWallet = ({ store, logger, emitter, options, configuration, strategy }) => __awaiter(void 0, void 0, void 0, function* () {
    const _state = yield (0, utils_1.setupWalletState)(configuration, options.network);
    const getAccounts = () => {
        const accountId = _state.wallet.getAccountId();
        return accountId ? [{ accountId }] : [];
    };
    return {
        signIn(_a) {
            var _b, _c, _d, _e, _f, _g, _h;
            var { contractId, methodNames = [] } = _a, delegate = __rest(_a, ["contractId", "methodNames"]);
            return __awaiter(this, void 0, void 0, function* () {
                try {
                    delegate.strategy = (_b = delegate.strategy) !== null && _b !== void 0 ? _b : strategy();
                    (_c = delegate.onInitialized) === null || _c === void 0 ? void 0 : _c.call(delegate);
                    (_e = (_d = delegate.strategy) === null || _d === void 0 ? void 0 : _d.onInitialized) === null || _e === void 0 ? void 0 : _e.call(_d);
                    const approve = {};
                    const accessKey = near_api_js_1.KeyPair.fromRandom("ed25519");
                    approve["public_key"] = accessKey.getPublicKey().toString();
                    approve["contract_id"] = contractId;
                    const method = methodNames === null || methodNames === void 0 ? void 0 : methodNames.pop();
                    if (method) {
                        approve["methodNames"] = method;
                    }
                    const data = yield (0, async_1.asyncHereSign)(configuration, approve, delegate);
                    if (data.account_id) {
                        const keysData = yield (0, utils_1.getPublicKeys)(options.network.nodeUrl, data.account_id);
                        const keys = keysData.filter((key) => { var _a; return ((_a = key.access_key) === null || _a === void 0 ? void 0 : _a.permission) === "FullAccess"; });
                        const fullKey = keys.pop();
                        const wallet = _state.wallet;
                        wallet._authData = {
                            accountId: data.account_id,
                            allKeys: fullKey ? [fullKey.public_key] : [],
                        };
                        window.localStorage.setItem(wallet._authDataKey, JSON.stringify(wallet._authData));
                        yield wallet._keyStore.setKey(wallet._networkId, data.account_id, accessKey);
                    }
                    const accounts = getAccounts();
                    emitter.emit("signedIn", { contractId, methodNames, accounts });
                    return accounts;
                }
                catch (error) {
                    (_f = delegate.onFailed) === null || _f === void 0 ? void 0 : _f.call(delegate, error);
                    (_h = delegate === null || delegate === void 0 ? void 0 : (_g = delegate.strategy).onFailed) === null || _h === void 0 ? void 0 : _h.call(_g, error);
                    throw error;
                }
            });
        },
        getHereBalance() {
            return __awaiter(this, void 0, void 0, function* () {
                return yield (0, utils_1.getHereBalance)(_state, configuration);
            });
        },
        getAvailableBalance() {
            return __awaiter(this, void 0, void 0, function* () {
                const result = yield _state.wallet.account().getAccountBalance();
                const hereBalance = yield (0, utils_1.getHereBalance)(_state, configuration);
                return new bn_js_1.default(result.available).add(new bn_js_1.default(hereBalance));
            });
        },
        signOut() {
            return __awaiter(this, void 0, void 0, function* () {
                if (_state.wallet.isSignedIn()) {
                    _state.wallet.signOut();
                }
            });
        },
        getAccounts() {
            return __awaiter(this, void 0, void 0, function* () {
                return getAccounts();
            });
        },
        signAndSendTransaction(_a) {
            var _b, _c, _d, _e, _f, _g, _h;
            var { signerId, receiverId, actions: _actions } = _a, delegate = __rest(_a, ["signerId", "receiverId", "actions"]);
            return __awaiter(this, void 0, void 0, function* () {
                try {
                    delegate.strategy = (_b = delegate.strategy) !== null && _b !== void 0 ? _b : strategy();
                    (_c = delegate.onInitialized) === null || _c === void 0 ? void 0 : _c.call(delegate);
                    (_e = (_d = delegate.strategy) === null || _d === void 0 ? void 0 : _d.onInitialized) === null || _e === void 0 ? void 0 : _e.call(_d);
                    logger.log("HereWallet:signAndSendTransaction", Object.assign({ signerId,
                        receiverId, actions: _actions }, delegate));
                    const { contract } = store.getState();
                    if (!_state.wallet.isSignedIn() || !contract) {
                        throw new Error("Wallet not signed in");
                    }
                    const wallet = _state.wallet;
                    const account = wallet.account();
                    const connection = account.connection;
                    const actions = _actions.map((action) => (0, wallet_utils_1.createAction)(action));
                    const localKey = yield connection.signer.getPublicKey(account.accountId, connection.networkId);
                    const accessKey = yield account.accessKeyForTransaction(receiverId !== null && receiverId !== void 0 ? receiverId : "", actions, localKey);
                    if (!accessKey) {
                        throw new Error(`Cannot find matching key for transaction sent to ${receiverId}`);
                    }
                    const block = yield connection.provider.block({ finality: "final" });
                    const blockHash = borsh.baseDecode(block.header.hash);
                    const publicKey = key_pair_1.PublicKey.from(accessKey.public_key);
                    const nonce = accessKey.access_key.nonce + 1;
                    const transaction = (0, transaction_1.createTransaction)(account.accountId, publicKey, receiverId || contract.contractId, nonce, actions, blockHash);
                    const config = {
                        transactions: Buffer.from(borsh.serialize(transaction_1.SCHEMA, transaction)).toString("base64"),
                    };
                    const data = yield (0, async_1.asyncHereSign)(configuration, config, delegate);
                    if (data.transaction_hash == null) {
                        throw Error("Transaction not found, but maybe executed");
                    }
                    return yield account.connection.provider.txStatus(data.transaction_hash, account.accountId);
                }
                catch (error) {
                    (_f = delegate.onFailed) === null || _f === void 0 ? void 0 : _f.call(delegate, error);
                    (_h = delegate === null || delegate === void 0 ? void 0 : (_g = delegate.strategy).onFailed) === null || _h === void 0 ? void 0 : _h.call(_g, error);
                    throw error;
                }
            });
        },
        verifyOwner() {
            return __awaiter(this, void 0, void 0, function* () {
                logger.log("HereWallet:verifyOwner");
                throw new Error("verifyOwner is not support");
            });
        },
        signMessage({ signerId, message }) {
            return __awaiter(this, void 0, void 0, function* () {
                logger.log("HereWallet:signMessage", {
                    signerId,
                    message,
                });
                const account = _state.wallet.account();
                if (!account) {
                    throw new Error("Wallet not signed in");
                }
                return yield account.connection.signer.signMessage(message, signerId || account.accountId, options.network.networkId);
            });
        },
        signAndSendTransactions(_a) {
            var _b, _c, _d, _e, _f, _g, _h;
            var { transactions } = _a, delegate = __rest(_a, ["transactions"]);
            return __awaiter(this, void 0, void 0, function* () {
                try {
                    delegate.strategy = (_b = delegate.strategy) !== null && _b !== void 0 ? _b : strategy();
                    (_c = delegate.onInitialized) === null || _c === void 0 ? void 0 : _c.call(delegate);
                    (_e = (_d = delegate.strategy) === null || _d === void 0 ? void 0 : _d.onInitialized) === null || _e === void 0 ? void 0 : _e.call(_d);
                    logger.log("HereWallet:signAndSendTransactions", Object.assign({ transactions }, delegate));
                    if (!_state.wallet.isSignedIn()) {
                        throw new Error("Wallet not signed in");
                    }
                    const trxs = yield (0, utils_1.transformTransactions)(_state, transactions);
                    const config = {
                        transactions: trxs.map((t) => Buffer.from(borsh.serialize(transaction_1.SCHEMA, t)).toString("base64")).join(","),
                    };
                    const data = yield (0, async_1.asyncHereSign)(configuration, config, delegate);
                    if (data.transaction_hash == null) {
                        throw Error("Transaction not found, but maybe executed");
                    }
                    const wallet = _state.wallet;
                    const account = wallet.account();
                    const provider = account.connection.provider;
                    const promises = data.transaction_hash.split(",").map((id) => provider.txStatus(id, account.accountId));
                    return yield Promise.all(promises);
                }
                catch (error) {
                    (_f = delegate.onFailed) === null || _f === void 0 ? void 0 : _f.call(delegate, error);
                    (_h = delegate === null || delegate === void 0 ? void 0 : (_g = delegate.strategy).onFailed) === null || _h === void 0 ? void 0 : _h.call(_g, error);
                    throw error;
                }
            });
        },
    };
});
exports.initHereWallet = initHereWallet;

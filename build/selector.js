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
const initHereWallet = ({ store, logger, emitter, options, configuration }) => __awaiter(void 0, void 0, void 0, function* () {
    const _state = yield (0, utils_1.setupWalletState)(configuration, options.network);
    const getAccounts = () => {
        const accountId = _state.wallet.getAccountId();
        if (!accountId) {
            return [];
        }
        return [{ accountId }];
    };
    return {
        signIn(_a) {
            var { contractId, methodNames } = _a, delegate = __rest(_a, ["contractId", "methodNames"]);
            return __awaiter(this, void 0, void 0, function* () {
                const approve = {};
                const accessKey = near_api_js_1.KeyPair.fromRandom("ed25519");
                approve.public_key = accessKey.getPublicKey().toString();
                approve.contract_id = contractId;
                if (methodNames) {
                    approve.methodNames = methodNames.pop();
                }
                const data = yield (0, async_1.asyncHereSign)(configuration, approve, delegate);
                if (data.account_id) {
                    const keysData = yield (0, utils_1.getPublicKeys)(options.network.nodeUrl, data.account_id).catch(() => []);
                    const keys = keysData.result.keys.filter((key) => { var _a; return ((_a = key.access_key) === null || _a === void 0 ? void 0 : _a.permission) === "FullAccess"; });
                    const fullKey = keys.pop();
                    const wallet = _state.wallet;
                    wallet._authData = { accountId: data.account_id, allKeys: [fullKey.public_key] };
                    window.localStorage.setItem(wallet._authDataKey, JSON.stringify(wallet._authData));
                    yield wallet._keyStore.setKey(wallet._networkId, data.account_id, accessKey);
                }
                const accounts = getAccounts();
                console.log("accounts", accounts);
                emitter.emit("signedIn", { contractId, methodNames, accounts });
                return accounts;
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
            var { callbackUrl, meta, signerId, receiverId, actions } = _a, delegate = __rest(_a, ["callbackUrl", "meta", "signerId", "receiverId", "actions"]);
            return __awaiter(this, void 0, void 0, function* () {
                logger.log("HereWallet:signAndSendTransaction", { signerId, receiverId, actions });
                const { contract } = store.getState();
                if (!_state.wallet.isSignedIn() || !contract) {
                    throw new Error("Wallet not signed in");
                }
                const wallet = _state.wallet;
                const account = wallet.account();
                const connection = account.connection;
                const localKey = yield connection.signer.getPublicKey(account.accountId, connection.networkId);
                let accessKey = yield account.accessKeyForTransaction(receiverId, actions, localKey);
                if (!accessKey) {
                    throw new Error(`Cannot find matching key for transaction sent to ${receiverId}`);
                }
                const block = yield connection.provider.block({ finality: "final" });
                const blockHash = borsh.baseDecode(block.header.hash);
                const publicKey = key_pair_1.PublicKey.from(accessKey.public_key);
                const nonce = accessKey.access_key.nonce + 1;
                const transaction = (0, transaction_1.createTransaction)(account.accountId, publicKey, receiverId || contract.contractId, nonce, actions.map((action) => (0, wallet_utils_1.createAction)(action)), blockHash);
                const config = {
                    transactions: Buffer.from(borsh.serialize(transaction_1.SCHEMA, transaction)).toString("base64"),
                    callbackUrl,
                    meta,
                };
                const data = yield (0, async_1.asyncHereSign)(configuration, config, delegate);
                return yield account.connection.provider.txStatus(data.transaction_hash, account.accountId);
            });
        },
        verifyOwner() {
            return __awaiter(this, void 0, void 0, function* () {
                throw new Error("verifyOwner is not support");
            });
        },
        signMessage({ signerId, message }) {
            return __awaiter(this, void 0, void 0, function* () {
                const account = _state.wallet.account();
                if (!account) {
                    throw new Error("Wallet not signed in");
                }
                return yield account.connection.signer.signMessage(message, signerId || account.accountId, options.network.networkId);
            });
        },
        signAndSendTransactions(_a) {
            var { transactions, callbackUrl } = _a, delegate = __rest(_a, ["transactions", "callbackUrl"]);
            return __awaiter(this, void 0, void 0, function* () {
                logger.log("HereWallet:signAndSendTransactions", { transactions, callbackUrl });
                if (!_state.wallet.isSignedIn()) {
                    throw new Error("Wallet not signed in");
                }
                const transform = (trx) => Buffer.from(borsh.serialize(transaction_1.SCHEMA, trx)).toString("base64");
                const trxs = yield (0, utils_1.transformTransactions)(_state, transactions);
                const config = {
                    transactions: trxs.map(transform).join(","),
                    callbackUrl,
                };
                yield (0, async_1.asyncHereSign)(configuration, config, delegate);
            });
        },
    };
});
exports.initHereWallet = initHereWallet;

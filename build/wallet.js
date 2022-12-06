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
import { createTransaction, SCHEMA } from "near-api-js/lib/transaction";
import { connect, KeyPair, keyStores, WalletConnection } from "near-api-js";
import { PublicKey } from "near-api-js/lib/utils/key_pair";
import * as borsh from "borsh";
import BN from "bn.js";
import { getPublicKeys, internalThrow, transformTransactions } from "./utils";
import { hereConfigurations, } from "./types";
import { proxyProvider } from "./here-provider";
import { DefaultStrategy } from "./strategy";
import { legacyProvider } from "./legacy-provider";
import { createAction } from "./actions";
export class HereWallet {
    constructor(wallet, defaultStrategy, defaultProvider) {
        this.wallet = wallet;
        this.defaultStrategy = defaultStrategy;
        this.defaultProvider = defaultProvider;
    }
    get isSignedIn() {
        return this.wallet.isSignedIn();
    }
    signOut() {
        if (this.isSignedIn) {
            this.wallet.signOut();
        }
    }
    get config() {
        var _a;
        const config = this.wallet._near.config;
        return Object.assign(Object.assign({}, config), ((_a = hereConfigurations[config.networkId]) !== null && _a !== void 0 ? _a : hereConfigurations["testnet"]));
    }
    getHereBalance() {
        return __awaiter(this, void 0, void 0, function* () {
            const params = { account_id: this.getAccountId() };
            const hereCoins = yield this.wallet
                .account()
                .viewFunction(this.config.hereContract, "ft_balance_of", params)
                .catch(() => "0");
            return new BN(hereCoins);
        });
    }
    getAvailableBalance() {
        return __awaiter(this, void 0, void 0, function* () {
            const result = yield this.wallet.account().getAccountBalance();
            const hereBalance = yield this.getHereBalance();
            return new BN(result.available).add(new BN(hereBalance));
        });
    }
    getAccountId() {
        if (this.isSignedIn == false)
            throw new Error("Wallet not signed in");
        return this.wallet.getAccountId();
    }
    getAccount() {
        if (this.isSignedIn == false)
            throw new Error("Wallet not signed in");
        return this.wallet.account();
    }
    signIn(_a) {
        var _b, _c, _d, _e, _f;
        var { contractId, methodNames = [] } = _a, delegate = __rest(_a, ["contractId", "methodNames"]);
        return __awaiter(this, void 0, void 0, function* () {
            delegate.strategy = (_b = delegate.strategy) !== null && _b !== void 0 ? _b : this.defaultStrategy();
            delegate.provider = (_c = delegate.provider) !== null && _c !== void 0 ? _c : this.defaultProvider;
            (_d = delegate.onInitialized) === null || _d === void 0 ? void 0 : _d.call(delegate);
            (_f = (_e = delegate.strategy) === null || _e === void 0 ? void 0 : _e.onInitialized) === null || _f === void 0 ? void 0 : _f.call(_e);
            try {
                const args = {};
                const accessKey = KeyPair.fromRandom("ed25519");
                args["public_key"] = accessKey.getPublicKey().toString();
                args["contract_id"] = contractId;
                const method = methodNames === null || methodNames === void 0 ? void 0 : methodNames.pop();
                if (method) {
                    args["methodNames"] = method;
                }
                const data = yield delegate.provider(Object.assign(Object.assign({}, delegate), { args: args, network: this.config.networkId }));
                if (data.account_id) {
                    const keysData = yield getPublicKeys(this.wallet._near.config.nodeUrl, data.account_id);
                    const keys = keysData.filter((key) => { var _a; return ((_a = key.access_key) === null || _a === void 0 ? void 0 : _a.permission) === "FullAccess"; });
                    const fullKey = keys.pop();
                    this.wallet._authData = {
                        accountId: data.account_id,
                        allKeys: fullKey ? [fullKey.public_key] : [],
                    };
                    window.localStorage.setItem(this.wallet._authDataKey, JSON.stringify(this.wallet._authData));
                    yield this.wallet._keyStore.setKey(this.wallet._networkId, data.account_id, accessKey);
                }
                return this.wallet.getAccountId();
            }
            catch (error) {
                internalThrow(error, delegate);
                throw error;
            }
        });
    }
    signAndSendTransaction(opts) {
        var _a, _b, _c, _d, _e;
        return __awaiter(this, void 0, void 0, function* () {
            const { signerId, receiverId, actions } = opts, args = __rest(opts, ["signerId", "receiverId", "actions"]);
            const delegate = args;
            delegate.strategy = (_a = delegate.strategy) !== null && _a !== void 0 ? _a : this.defaultStrategy();
            delegate.provider = (_b = delegate.provider) !== null && _b !== void 0 ? _b : this.defaultProvider;
            (_c = delegate.onInitialized) === null || _c === void 0 ? void 0 : _c.call(delegate);
            (_e = (_d = delegate.strategy) === null || _d === void 0 ? void 0 : _d.onInitialized) === null || _e === void 0 ? void 0 : _e.call(_d);
            try {
                const account = this.wallet.account();
                const connection = account.connection;
                const localKey = yield connection.signer.getPublicKey(account.accountId, connection.networkId);
                const nativeActions = actions.map((a) => createAction(a));
                const accessKey = yield account.accessKeyForTransaction(receiverId !== null && receiverId !== void 0 ? receiverId : "", nativeActions, localKey);
                if (!accessKey) {
                    throw new Error(`Cannot find matching key for transaction sent to ${receiverId}`);
                }
                const block = yield connection.provider.block({ finality: "final" });
                const blockHash = borsh.baseDecode(block.header.hash);
                const publicKey = PublicKey.from(accessKey.public_key);
                const nonce = accessKey.access_key.nonce + 1;
                const transaction = createTransaction(account.accountId, publicKey, receiverId, nonce, nativeActions, blockHash);
                const txBase64 = Buffer.from(borsh.serialize(SCHEMA, transaction)).toString("base64");
                const data = yield delegate.provider(Object.assign(Object.assign({}, delegate), { args: { transactions: txBase64 }, network: this.config.networkId }));
                if (data.payload == null) {
                    throw Error("Transaction not found, but maybe executed");
                }
                return yield account.connection.provider.txStatus(data.payload, account.accountId);
            }
            catch (error) {
                internalThrow(error, delegate);
                throw error;
            }
        });
    }
    signMessage({ signerId, message }) {
        return __awaiter(this, void 0, void 0, function* () {
            const account = this.wallet.account();
            if (!account)
                throw new Error("Wallet not signed in");
            return yield account.connection.signer.signMessage(message, signerId || account.accountId, this.config.networkId);
        });
    }
    signAndSendTransactions(_a) {
        var _b, _c, _d, _e, _f;
        var { transactions } = _a, delegate = __rest(_a, ["transactions"]);
        return __awaiter(this, void 0, void 0, function* () {
            delegate.strategy = (_b = delegate.strategy) !== null && _b !== void 0 ? _b : this.defaultStrategy();
            delegate.provider = (_c = delegate.provider) !== null && _c !== void 0 ? _c : this.defaultProvider;
            (_d = delegate.onInitialized) === null || _d === void 0 ? void 0 : _d.call(delegate);
            (_f = (_e = delegate.strategy) === null || _e === void 0 ? void 0 : _e.onInitialized) === null || _f === void 0 ? void 0 : _f.call(_e);
            try {
                if (!this.wallet.isSignedIn()) {
                    throw new Error("Wallet not signed in");
                }
                const trxs = yield transformTransactions(this.getAccount(), transactions);
                const trxsBase64 = trxs.map((t) => Buffer.from(borsh.serialize(SCHEMA, t)).toString("base64")).join(",");
                const data = yield delegate.provider(Object.assign(Object.assign({}, delegate), { args: { transactions: trxsBase64 }, network: this.config.networkId }));
                if (data.payload == null) {
                    throw Error("Transaction not found, but maybe executed");
                }
                const account = this.wallet.account();
                const provider = account.connection.provider;
                const promises = data.payload.split(",").map((id) => provider.txStatus(id, account.accountId));
                return yield Promise.all(promises);
            }
            catch (error) {
                internalThrow(error, delegate);
                throw error;
            }
        });
    }
    static initialize({ network = "mainnet", defaultStrategy = () => new DefaultStrategy(), defaultProvider = network === "mainnet" ? proxyProvider : legacyProvider, } = {}) {
        return __awaiter(this, void 0, void 0, function* () {
            const keyStore = new keyStores.BrowserLocalStorageKeyStore();
            const config = hereConfigurations[network];
            const near = yield connect({
                keyStore,
                networkId: network,
                nodeUrl: config.nodeUrl,
                walletUrl: config.hereConnector,
                headers: {},
            });
            const wallet = new WalletConnection(near, "here_app");
            return new HereWallet(wallet, defaultStrategy, defaultProvider);
        });
    }
}
//# sourceMappingURL=wallet.js.map
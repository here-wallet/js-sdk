import { __awaiter, __rest } from "tslib";
import { createTransaction, SCHEMA } from "near-api-js/lib/transaction";
import { createAction } from "@near-wallet-selector/wallet-utils";
import { PublicKey } from "near-api-js/lib/utils/key_pair";
import { KeyPair } from "near-api-js";
import * as borsh from "borsh";
import BN from "bn.js";
import { getHereBalance, getPublicKeys, internalThrow, transformTransactions } from "./utils";
import { setupWalletState } from "./state";
export const initHereWallet = (config) => __awaiter(void 0, void 0, void 0, function* () {
    const { store, logger, emitter, options, configuration, hereProvider, strategy } = config;
    const _state = yield setupWalletState(configuration, options.network);
    const getAccounts = () => {
        const accountId = _state.wallet.getAccountId();
        return accountId ? [{ accountId }] : [];
    };
    return {
        signIn(_a) {
            var _b, _c, _d, _e;
            var { contractId, methodNames = [] } = _a, args = __rest(_a, ["contractId", "methodNames"]);
            return __awaiter(this, void 0, void 0, function* () {
                const delegate = args;
                delegate.strategy = (_b = delegate.strategy) !== null && _b !== void 0 ? _b : strategy();
                (_c = delegate.onInitialized) === null || _c === void 0 ? void 0 : _c.call(delegate);
                (_e = (_d = delegate.strategy) === null || _d === void 0 ? void 0 : _d.onInitialized) === null || _e === void 0 ? void 0 : _e.call(_d);
                try {
                    const args = {};
                    const accessKey = KeyPair.fromRandom("ed25519");
                    args["public_key"] = accessKey.getPublicKey().toString();
                    args["contract_id"] = contractId;
                    const method = methodNames === null || methodNames === void 0 ? void 0 : methodNames.pop();
                    if (method) {
                        args["methodNames"] = method;
                    }
                    const data = yield hereProvider(Object.assign(Object.assign({}, delegate), { args: args, network: options.network.networkId }));
                    if (data.account_id) {
                        const keysData = yield getPublicKeys(options.network.nodeUrl, data.account_id);
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
                    internalThrow(error, delegate);
                    throw error;
                }
            });
        },
        getHereBalance() {
            return __awaiter(this, void 0, void 0, function* () {
                return yield getHereBalance(_state);
            });
        },
        getAvailableBalance() {
            return __awaiter(this, void 0, void 0, function* () {
                const result = yield _state.wallet.account().getAccountBalance();
                const hereBalance = yield getHereBalance(_state);
                return new BN(result.available).add(new BN(hereBalance));
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
            var _b, _c, _d, _e;
            var { signerId, receiverId, actions: _actions } = _a, args = __rest(_a, ["signerId", "receiverId", "actions"]);
            return __awaiter(this, void 0, void 0, function* () {
                const delegate = args;
                delegate.strategy = (_b = delegate.strategy) !== null && _b !== void 0 ? _b : strategy();
                (_c = delegate.onInitialized) === null || _c === void 0 ? void 0 : _c.call(delegate);
                (_e = (_d = delegate.strategy) === null || _d === void 0 ? void 0 : _d.onInitialized) === null || _e === void 0 ? void 0 : _e.call(_d);
                try {
                    logger.log("HereWallet:signAndSendTransaction", Object.assign({ signerId,
                        receiverId, actions: _actions }, delegate));
                    const { contract } = store.getState();
                    if (!_state.wallet.isSignedIn() || !contract) {
                        throw new Error("Wallet not signed in");
                    }
                    const wallet = _state.wallet;
                    const account = wallet.account();
                    const connection = account.connection;
                    const actions = _actions.map((action) => createAction(action));
                    const localKey = yield connection.signer.getPublicKey(account.accountId, connection.networkId);
                    const accessKey = yield account.accessKeyForTransaction(receiverId !== null && receiverId !== void 0 ? receiverId : "", actions, localKey);
                    if (!accessKey) {
                        throw new Error(`Cannot find matching key for transaction sent to ${receiverId}`);
                    }
                    const block = yield connection.provider.block({ finality: "final" });
                    const blockHash = borsh.baseDecode(block.header.hash);
                    const publicKey = PublicKey.from(accessKey.public_key);
                    const nonce = accessKey.access_key.nonce + 1;
                    const transaction = createTransaction(account.accountId, publicKey, receiverId || contract.contractId, nonce, actions, blockHash);
                    const txBase64 = Buffer.from(borsh.serialize(SCHEMA, transaction)).toString("base64");
                    const data = yield hereProvider(Object.assign(Object.assign({}, delegate), { args: { transactions: txBase64 }, network: options.network.networkId }));
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
            var _b, _c, _d, _e;
            var { transactions } = _a, args = __rest(_a, ["transactions"]);
            return __awaiter(this, void 0, void 0, function* () {
                const delegate = args;
                delegate.strategy = (_b = delegate.strategy) !== null && _b !== void 0 ? _b : strategy();
                (_c = delegate.onInitialized) === null || _c === void 0 ? void 0 : _c.call(delegate);
                (_e = (_d = delegate.strategy) === null || _d === void 0 ? void 0 : _d.onInitialized) === null || _e === void 0 ? void 0 : _e.call(_d);
                try {
                    logger.log("HereWallet:signAndSendTransactions", Object.assign({ transactions }, delegate));
                    if (!_state.wallet.isSignedIn()) {
                        throw new Error("Wallet not signed in");
                    }
                    const trxs = yield transformTransactions(_state, transactions);
                    const trxsBase64 = trxs.map((t) => Buffer.from(borsh.serialize(SCHEMA, t)).toString("base64")).join(",");
                    const data = yield hereProvider(Object.assign(Object.assign({}, delegate), { args: { transactions: trxsBase64 }, network: options.network.networkId }));
                    if (data.payload == null) {
                        throw Error("Transaction not found, but maybe executed");
                    }
                    const wallet = _state.wallet;
                    const account = wallet.account();
                    const provider = account.connection.provider;
                    const promises = data.payload.split(",").map((id) => provider.txStatus(id, account.accountId));
                    return yield Promise.all(promises);
                }
                catch (error) {
                    internalThrow(error, delegate);
                    throw error;
                }
            });
        },
    };
});
//# sourceMappingURL=selector.js.map
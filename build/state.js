import { __awaiter } from "tslib";
import { connect, keyStores, WalletConnection } from "near-api-js";
export const hereConfigurations = {
    mainnet: {
        hereConnector: "https://web.herewallet.app",
        hereContract: "storage.herewallet.near",
        download: "https://appstore.herewallet.app/selector",
    },
    testnet: {
        hereConnector: "https://web.testnet.herewallet.app",
        hereContract: "storage.herewallet.testnet",
        download: "https://testflight.apple.com/join/LwvGXAK8",
    },
};
export const setupWalletState = (config, network) => __awaiter(void 0, void 0, void 0, function* () {
    const keyStore = new keyStores.BrowserLocalStorageKeyStore();
    const near = yield connect(Object.assign({ keyStore, walletUrl: config.hereConnector, headers: {} }, network));
    const wallet = new WalletConnection(near, "here_app");
    return Object.assign({ wallet, keyStore }, config);
});
//# sourceMappingURL=state.js.map
import { __awaiter } from "tslib";
import { DefaultStrategy } from "./strategy";
import { hereConfigurations } from "./state";
import { legacyProvider } from "./legacy-provider";
import { proxyProvider } from "./here-provider";
import { initHereWallet } from "./selector";
import icon from "./icon";
export { icon };
export { DefaultStrategy } from "./strategy";
export { HereProviderStatus } from "./provider";
export function setupHereWallet({ deprecated = false, iconUrl = icon, strategy = () => new DefaultStrategy(), hereProvider = proxyProvider, } = {}) {
    return ({ options }) => __awaiter(this, void 0, void 0, function* () {
        const configuration = hereConfigurations[options.network.networkId];
        if (configuration == null) {
            return null;
        }
        if (options.network.networkId === "testnet") {
            hereProvider = legacyProvider;
        }
        return {
            id: "here-wallet",
            type: "injected",
            metadata: {
                name: "Here Wallet (mobile)",
                description: "Mobile wallet for NEAR Protocol",
                downloadUrl: configuration.download,
                iconUrl,
                deprecated,
                available: true,
            },
            init: (config) => initHereWallet(Object.assign(Object.assign({}, config), { configuration, strategy, hereProvider })),
        };
    });
}
//# sourceMappingURL=index.js.map
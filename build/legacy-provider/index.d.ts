import { HereProvider } from "../provider";
export declare const hereConfigurations: {
    readonly mainnet: {
        readonly hereApi: "https://api.herewallet.app";
        readonly hereConnector: "https://web.herewallet.app";
    };
    readonly testnet: {
        readonly hereApi: "https://api.testnet.herewallet.app";
        readonly hereConnector: "https://web.testnet.herewallet.app";
    };
};
export declare const legacyProvider: HereProvider;

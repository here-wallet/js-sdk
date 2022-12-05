import { WalletModuleFactory } from "@near-wallet-selector/core";
import { Strategy } from "./strategy";
import { HereWallet } from "./state";
import icon from "./icon";
export { icon };
export { HereWallet } from "./state";
export { DefaultStrategy, Strategy } from "./strategy";
export { HereProvider, HereProviderOptions, HereProviderResult, HereProviderStatus } from "./provider";
export declare function setupHereWallet({ deprecated, iconUrl, strategy, hereProvider, }?: {
    deprecated?: boolean | undefined;
    iconUrl?: string | undefined;
    strategy?: (() => Strategy) | undefined;
    hereProvider?: import("./provider").HereProvider | undefined;
}): WalletModuleFactory<HereWallet>;

import { WalletModuleFactory } from "@near-wallet-selector/core";
import { HereWallet } from "./selector";
import { Strategy } from "./strategy";
export { HereWallet } from "./selector";
export { DefaultStrategy, Strategy } from "./strategy";
export declare function setupHereWallet({ deprecated, iconUrl, strategy, }?: {
    deprecated?: boolean;
    iconUrl?: string;
    strategy?: () => Strategy;
}): WalletModuleFactory<HereWallet>;

import { WalletModuleFactory } from "@near-wallet-selector/core";
import { HereWallet } from "./selector";
export { HereWallet } from "./selector";
export declare function setupHereWallet({ deprecated, iconUrl }?: {
    deprecated?: boolean;
    iconUrl?: string;
}): WalletModuleFactory<HereWallet>;

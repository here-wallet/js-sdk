import { Network, Optional, Transaction } from "@near-wallet-selector/core";
import { keyStores, WalletConnection, transactions as nearTransactions } from "near-api-js";
import BN from "bn.js";
export interface HereWalletState {
    wallet: WalletConnection;
    keyStore: keyStores.BrowserLocalStorageKeyStore;
}
export interface HereConfiguration {
    hereApi: string;
    hereConnector: string;
    hereContract: string;
}
export declare const getPublicKeys: (rpc: string, accountId: any) => Promise<any>;
export declare const getTransactionStatus: (api: string, request: any) => Promise<any>;
export declare const createRequest: (config: HereConfiguration, request: string, options: Record<string, string>) => Promise<Response>;
export declare const hereConfigurations: Record<string, HereConfiguration>;
export declare const setupWalletState: (config: HereConfiguration, network: Network) => Promise<HereWalletState>;
export declare const getHereBalance: (state: HereWalletState, config: HereConfiguration) => Promise<BN>;
export declare const transformTransactions: (state: HereWalletState, transactions: Array<Optional<Transaction, "signerId">>) => Promise<nearTransactions.Transaction[]>;
export declare const isMobile: () => boolean;

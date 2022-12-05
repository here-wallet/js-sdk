import type { SignInParams, WalletBehaviourFactory, Account, FinalExecutionOutcome, Network } from "@near-wallet-selector/core";
import { InjectedWallet, SignAndSendTransactionParams, SignAndSendTransactionsParams } from "@near-wallet-selector/core/lib/wallet";
import { Signature } from "near-api-js/lib/utils/key_pair";
import { keyStores, WalletConnection } from "near-api-js";
import BN from "bn.js";
import { Strategy } from "./strategy";
import { HereProvider } from "./provider";
export interface HereConfiguration {
    hereConnector: string;
    hereContract: string;
    download: string;
}
export declare const hereConfigurations: Record<string, HereConfiguration>;
export interface HereAsyncOptions extends Strategy {
    signal?: AbortSignal;
    strategy?: Strategy;
}
export declare type HereWallet = InjectedWallet & {
    getHereBalance: () => Promise<BN>;
    getAvailableBalance: () => Promise<BN>;
    signMessage: (data: {
        message: Uint8Array;
        signerId: string;
    }) => Promise<Signature>;
    signIn: (data: SignInParams & HereAsyncOptions) => Promise<Array<Account>>;
    signAndSendTransaction: (data: SignAndSendTransactionParams & HereAsyncOptions) => Promise<FinalExecutionOutcome>;
    signAndSendTransactions: (data: SignAndSendTransactionsParams & HereAsyncOptions) => Promise<Array<FinalExecutionOutcome>>;
};
export interface HereWalletState extends HereConfiguration {
    wallet: WalletConnection;
    keyStore: keyStores.BrowserLocalStorageKeyStore;
}
export declare type SelectorInit = WalletBehaviourFactory<HereWallet, {
    configuration: HereConfiguration;
    hereProvider: HereProvider;
    strategy: () => Strategy;
}>;
export declare const setupWalletState: (config: HereConfiguration, network: Network) => Promise<HereWalletState>;

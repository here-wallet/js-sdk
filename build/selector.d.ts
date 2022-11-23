import type { SignInParams, WalletBehaviourFactory, BrowserWallet, Account, FinalExecutionOutcome } from "@near-wallet-selector/core";
import { BrowserWalletSignAndSendTransactionsParams, SignAndSendTransactionParams } from "@near-wallet-selector/core/lib/wallet";
import { Signature } from "near-api-js/lib/utils/key_pair";
import BN from "bn.js";
import { AsyncHereSignDelegate } from "./async";
import { HereConfiguration } from "./utils";
export declare type HereWallet = BrowserWallet & {
    getHereBalance: () => Promise<BN>;
    getAvailableBalance: () => Promise<BN>;
    signMessage: (data: {
        message: Uint8Array;
        signerId: string;
    }) => Promise<Signature>;
    signIn: (data: SignInParams & AsyncHereSignDelegate) => Promise<Array<Account>>;
    signAndSendTransaction: (data: SignAndSendTransactionParams & AsyncHereSignDelegate) => Promise<FinalExecutionOutcome>;
    signAndSendTransactions: (data: BrowserWalletSignAndSendTransactionsParams & AsyncHereSignDelegate) => Promise<void>;
};
declare type Init = WalletBehaviourFactory<HereWallet, {
    configuration: HereConfiguration;
}>;
export declare const initHereWallet: Init;
export {};

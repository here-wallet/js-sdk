import type { SignInParams, WalletBehaviourFactory, Account, FinalExecutionOutcome } from "@near-wallet-selector/core";
import { InjectedWallet, SignAndSendTransactionParams, SignAndSendTransactionsParams } from "@near-wallet-selector/core/lib/wallet";
import { Signature } from "near-api-js/lib/utils/key_pair";
import BN from "bn.js";
import { AsyncHereSignDelegate } from "./async";
import { HereConfiguration } from "./utils";
import { Strategy } from "./strategy";
export declare type HereWallet = InjectedWallet & {
    getHereBalance: () => Promise<BN>;
    getAvailableBalance: () => Promise<BN>;
    signMessage: (data: {
        message: Uint8Array;
        signerId: string;
    }) => Promise<Signature>;
    signIn: (data: SignInParams & AsyncHereSignDelegate) => Promise<Array<Account>>;
    signAndSendTransaction: (data: SignAndSendTransactionParams & AsyncHereSignDelegate) => Promise<FinalExecutionOutcome>;
    signAndSendTransactions: (data: SignAndSendTransactionsParams & AsyncHereSignDelegate) => Promise<Array<FinalExecutionOutcome>>;
};
declare type Init = WalletBehaviourFactory<HereWallet, {
    configuration: HereConfiguration;
    strategy: () => Strategy;
}>;
export declare const initHereWallet: Init;
export {};

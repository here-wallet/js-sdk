import { Optional, Transaction } from "@near-wallet-selector/core";
import { transactions as nearTransactions } from "near-api-js";
import BN from "bn.js";
import { HereAsyncOptions, HereWalletState } from "./state";
export declare const getDeviceId: () => string;
export declare const isMobile: () => boolean;
export declare const getPublicKeys: (rpc: string, accountId: string) => Promise<Array<{
    public_key: string;
    access_key: {
        permission: string;
    };
}>>;
export declare const getHereBalance: (state: HereWalletState) => Promise<BN>;
export declare const internalThrow: (error: unknown, delegate: HereAsyncOptions) => never;
export declare const transformTransactions: (state: HereWalletState, transactions: Array<Optional<Transaction, "signerId">>) => Promise<nearTransactions.Transaction[]>;

import { transactions as nearTransactions, ConnectedWalletAccount } from "near-api-js";
import { HereAsyncOptions } from "./types";
import { Optional, Transaction } from "./actions/types";
export declare const getDeviceId: () => string;
export declare const isMobile: () => boolean;
export declare const getPublicKeys: (rpc: string, accountId: string) => Promise<Array<{
    public_key: string;
    access_key: {
        permission: string;
    };
}>>;
export declare const internalThrow: (error: unknown, delegate: HereAsyncOptions) => never;
export declare const transformTransactions: (account: ConnectedWalletAccount, transactions: Array<Optional<Transaction, "signerId">>) => Promise<Array<nearTransactions.Transaction>>;

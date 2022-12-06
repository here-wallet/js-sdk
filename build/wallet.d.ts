import { ConnectedWalletAccount } from "near-api-js";
import { NearConfig } from "near-api-js/lib/near";
import BN from "bn.js";
import { HereConfiguration, HereInitializeOptions, HereWalletProtocol, HereWalletSignAndSendTransactionOptions, HereWalletSignAndSendTransactionsOptions, HereWalletSignInOptions, HereWalletSignMessageOptions } from "./types";
export declare class HereWallet implements HereWalletProtocol {
    private readonly wallet;
    private readonly defaultStrategy;
    private readonly defaultProvider;
    private constructor();
    get isSignedIn(): boolean;
    signOut(): void;
    get config(): NearConfig & HereConfiguration;
    getHereBalance(): Promise<BN>;
    getAvailableBalance(): Promise<BN>;
    getAccountId(): string;
    getAccount(): ConnectedWalletAccount;
    signIn({ contractId, methodNames, ...delegate }: HereWalletSignInOptions): Promise<string>;
    signAndSendTransaction(opts: HereWalletSignAndSendTransactionOptions): Promise<import("near-api-js/lib/providers").FinalExecutionOutcome>;
    signMessage({ signerId, message }: HereWalletSignMessageOptions): Promise<import("near-api-js/lib/utils/key_pair").Signature>;
    signAndSendTransactions({ transactions, ...delegate }: HereWalletSignAndSendTransactionsOptions): Promise<import("near-api-js/lib/providers").FinalExecutionOutcome[]>;
    static initialize({ network, defaultStrategy, defaultProvider, }?: HereInitializeOptions): Promise<HereWallet>;
}

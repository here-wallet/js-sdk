import BN from "bn.js";
import { Account } from "near-api-js";
import { FinalExecutionOutcome } from "near-api-js/lib/providers";

import { HereStrategy } from "./strategy";
import { HereProvider } from "./provider";
import { HereAuthStorage } from "./HereKeyStore";
import { Base64, Optional, Transaction } from "./actions/types";
import { PublicKey } from "near-api-js/lib/utils";

export type HereCall = Optional<Transaction, "signerId">;

export interface HereSignedResult {
  signature: Base64;
  publicKey: string;
  accountId: string;
}

export interface HereAsyncOptions extends HereStrategy {
  provider?: HereProvider;
  signal?: AbortSignal;
  strategy?: HereStrategy;
}

export interface SignInOptions extends HereAsyncOptions {
  contractId: string;
  allowance?: string;
  methodNames?: string[];
}

export type SignAndSendTransactionOptions = HereAsyncOptions & HereCall;
export type SignMessageOptions = HereAsyncOptions & {
  message: string;
  receiver: string;
};

export interface SignAndSendTransactionsOptions extends HereAsyncOptions {
  transactions: HereCall[];
}

export interface HereInitializeOptions {
  nodeUrl?: string;
  networkId?: "mainnet" | "testnet";
  authStorage?: HereAuthStorage;
  defaultStrategy?: () => HereStrategy;
  defaultProvider?: HereProvider;
}

export interface HereWalletProtocol {
  networkId: string;
  account(id?: string): Promise<Account>;
  getAccounts(): Promise<string[]>;
  switchAccount(id: string): Promise<void>;
  getAccountId(): Promise<string>;
  isSignedIn: () => Promise<boolean>;
  signOut: () => Promise<void>;

  getHereBalance: () => Promise<BN>;
  getAvailableBalance: () => Promise<BN>;
  signIn: (data: SignInOptions) => Promise<string>;
  signMessage: (data: SignMessageOptions) => Promise<{
    signature: Uint8Array;
    publicKey: PublicKey;
    accountId: string;
  }>;

  signAndSendTransaction: (data: SignAndSendTransactionOptions) => Promise<FinalExecutionOutcome>;
  signAndSendTransactions: (data: SignAndSendTransactionsOptions) => Promise<Array<FinalExecutionOutcome>>;
}

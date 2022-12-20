import BN from "bn.js";
import { Signature } from "near-api-js/lib/utils/key_pair";

import { HereStrategy } from "./strategy";
import { HereProvider } from "./provider";
import { Optional, Transaction } from "./actions/types";
import { FinalExecutionOutcome } from "near-api-js/lib/providers";
import { Account, Connection } from "near-api-js";
import { HereAuthStorage } from "./HereKeyStore";

export type HereCall = Optional<Transaction, "signerId">;

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

export interface SignMessageOptions {
  message: Uint8Array;
  signerId?: string;
}

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
  signMessage: (data: SignMessageOptions) => Promise<Signature>;
  signIn: (data: SignInOptions) => Promise<string>;

  signAndSendTransaction: (data: SignAndSendTransactionOptions) => Promise<FinalExecutionOutcome>;
  signAndSendTransactions: (data: SignAndSendTransactionsOptions) => Promise<Array<FinalExecutionOutcome>>;
}

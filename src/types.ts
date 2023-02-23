import BN from "bn.js";
import { Account } from "near-api-js";
import { FinalExecutionOutcome } from "near-api-js/lib/providers";
import { PublicKey } from "near-api-js/lib/utils";

import { HereProvider, HereProviderRequest, HereProviderResult } from "./provider";
import { HereAuthStorage } from "./HereKeyStore";
import { Base64, Optional, Transaction } from "./actions/types";

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
  contractId?: string;
  allowance?: string;
  methodNames?: string[];
}

export type SignAndSendTransactionOptions = HereAsyncOptions & HereCall;
export type SignMessageOptions = HereAsyncOptions & {
  nonce?: number[];
  message: string;
  receiver: string;
};

export type SignMessageReturn = {
  signature: Uint8Array;
  publicKey: PublicKey;
  accountId: string;
  message: string;
  nonce: number[];
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

export interface HereStrategy {
  onInitialized?: () => void;
  onRequested?: (id: string, request: HereProviderRequest, reject: (p?: string) => void) => void;
  onApproving?: (result: HereProviderResult) => void;
  onSuccess?: (result: HereProviderResult) => void;
  onFailed?: (result: HereProviderResult) => void;
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
  signMessage: (data: SignMessageOptions) => Promise<SignMessageReturn>;
  signAndSendTransaction: (data: SignAndSendTransactionOptions) => Promise<FinalExecutionOutcome>;
  signAndSendTransactions: (data: SignAndSendTransactionsOptions) => Promise<Array<FinalExecutionOutcome>>;
}

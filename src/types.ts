import BN from "bn.js";

import { NearConfig } from "near-api-js/lib/near";
import { Signature } from "near-api-js/lib/utils/key_pair";

import { HereStrategy } from "./strategy";
import { HereProvider } from "./provider";
import { Action, Optional, Transaction } from "./actions/types";
import { FinalExecutionOutcome } from "near-api-js/lib/providers";
import { ConnectedWalletAccount } from "near-api-js";

export interface HereConfiguration {
  nodeUrl: string;
  hereConnector: string;
  hereContract: string;
  download: string;
}

export const hereConfigurations: Record<string, HereConfiguration> = {
  mainnet: {
    nodeUrl: "https://rpc.mainnet.near.org",
    hereConnector: "https://web.herewallet.app",
    hereContract: "storage.herewallet.near",
    download: "https://appstore.herewallet.app/selector",
  },
  testnet: {
    nodeUrl: "https://rpc.testnet.near.org",
    hereConnector: "https://web.testnet.herewallet.app",
    hereContract: "storage.herewallet.testnet",
    download: "https://testflight.apple.com/join/LwvGXAK8",
  },
};

export interface HereAsyncOptions extends HereStrategy {
  provider?: HereProvider;
  signal?: AbortSignal;
  strategy?: HereStrategy;
}

export interface HereWalletSignInOptions extends HereAsyncOptions {
  contractId: string;
  methodNames?: string[];
}

export interface HereWalletSignAndSendTransactionOptions extends HereAsyncOptions {
  signerId?: string;
  receiverId: string;
  actions: Action[];
}

export interface HereWalletSignMessageOptions {
  message: Uint8Array;
  signerId: string;
}

export interface HereWalletSignAndSendTransactionsOptions extends HereAsyncOptions {
  transactions: Optional<Transaction, "signerId">[];
}

export interface HereInitializeOptions {
  network?: "mainnet" | "testnet";
  defaultStrategy?: () => HereStrategy;
  defaultProvider?: HereProvider;
}

export interface HereWalletProtocol {
  config: NearConfig & HereConfiguration;
  getAccount(): ConnectedWalletAccount;
  getAccountId(): string;
  isSignedIn: boolean;
  signOut: () => void;

  getHereBalance: () => Promise<BN>;
  getAvailableBalance: () => Promise<BN>;
  signMessage: (data: HereWalletSignMessageOptions) => Promise<Signature>;
  signIn: (data: HereWalletSignInOptions) => Promise<string>;

  signAndSendTransaction: (data: HereWalletSignAndSendTransactionOptions) => Promise<FinalExecutionOutcome>;
  signAndSendTransactions: (data: HereWalletSignAndSendTransactionsOptions) => Promise<Array<FinalExecutionOutcome>>;
}

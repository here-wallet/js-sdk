import { createTransaction, SCHEMA } from "near-api-js/lib/transaction";
import { connect, ConnectedWalletAccount, KeyPair, keyStores, WalletConnection } from "near-api-js";
import { PublicKey } from "near-api-js/lib/utils/key_pair";
import { NearConfig } from "near-api-js/lib/near";
import * as borsh from "borsh";
import BN from "bn.js";

import { getPublicKeys, internalThrow, transformTransactions } from "./utils";
import {
  HereAsyncOptions,
  HereConfiguration,
  hereConfigurations,
  HereInitializeOptions,
  HereWalletProtocol,
  HereWalletSignAndSendTransactionOptions,
  HereWalletSignAndSendTransactionsOptions,
  HereWalletSignInOptions,
  HereWalletSignMessageOptions,
} from "./types";
import { proxyProvider } from "./here-provider";
import { DefaultStrategy, HereStrategy } from "./strategy";
import { legacyProvider } from "./legacy-provider";
import { HereProvider } from "./provider";
import { createAction } from "./actions";

export class HereWallet implements HereWalletProtocol {
  private constructor(
    private readonly wallet: WalletConnection,
    private readonly defaultStrategy: () => HereStrategy,
    private readonly defaultProvider: HereProvider
  ) {}

  public get isSignedIn() {
    return this.wallet.isSignedIn();
  }

  public signOut() {
    if (this.isSignedIn) {
      this.wallet.signOut();
    }
  }

  public get config(): NearConfig & HereConfiguration {
    const config = this.wallet._near.config as NearConfig;
    return { ...config, ...(hereConfigurations[config.networkId] ?? hereConfigurations["testnet"]) };
  }

  public async getHereBalance() {
    const params = { account_id: this.getAccountId() };
    const hereCoins = await this.wallet
      .account()
      .viewFunction(this.config.hereContract, "ft_balance_of", params)
      .catch(() => "0");

    return new BN(hereCoins);
  }

  public async getAvailableBalance(): Promise<BN> {
    const result = await this.wallet.account().getAccountBalance();
    const hereBalance = await this.getHereBalance();
    return new BN(result.available).add(new BN(hereBalance));
  }

  public getAccountId(): string {
    if (this.isSignedIn == false) throw new Error("Wallet not signed in");
    return this.wallet.getAccountId();
  }

  public getAccount(): ConnectedWalletAccount {
    if (this.isSignedIn == false) throw new Error("Wallet not signed in");
    return this.wallet.account();
  }

  public async signIn({ contractId, methodNames = [], ...delegate }: HereWalletSignInOptions): Promise<string> {
    delegate.strategy = delegate.strategy ?? this.defaultStrategy();
    delegate.provider = delegate.provider ?? this.defaultProvider;
    delegate.onInitialized?.();
    delegate.strategy?.onInitialized?.();

    try {
      const args: Record<string, string> = {};
      const accessKey = KeyPair.fromRandom("ed25519");
      args["public_key"] = accessKey.getPublicKey().toString();
      args["contract_id"] = contractId;

      const method = methodNames?.pop();
      if (method) {
        args["methodNames"] = method;
      }

      const data = await delegate.provider({
        ...delegate,
        args: args,
        network: this.config.networkId,
      });

      if (data.account_id) {
        const keysData = await getPublicKeys(this.wallet._near.config.nodeUrl, data.account_id);
        const keys = keysData.filter((key) => key.access_key?.permission === "FullAccess");
        const fullKey = keys.pop();

        this.wallet._authData = {
          accountId: data.account_id,
          allKeys: fullKey ? [fullKey.public_key] : [],
        };

        window.localStorage.setItem(this.wallet._authDataKey, JSON.stringify(this.wallet._authData));
        await this.wallet._keyStore.setKey(this.wallet._networkId, data.account_id, accessKey);
      }

      return this.wallet.getAccountId();
    } catch (error) {
      internalThrow(error, delegate);
      throw error;
    }
  }

  public async signAndSendTransaction(opts: HereWalletSignAndSendTransactionOptions) {
    const { signerId, receiverId, actions, ...args } = opts;
    const delegate = args as HereAsyncOptions;

    delegate.strategy = delegate.strategy ?? this.defaultStrategy();
    delegate.provider = delegate.provider ?? this.defaultProvider;
    delegate.onInitialized?.();
    delegate.strategy?.onInitialized?.();

    try {
      const account = this.wallet.account();
      const connection = account.connection;
      const localKey = await connection.signer.getPublicKey(account.accountId, connection.networkId);
      const nativeActions = actions.map((a) => createAction(a));
      const accessKey = await account.accessKeyForTransaction(receiverId ?? "", nativeActions, localKey);

      if (!accessKey) {
        throw new Error(`Cannot find matching key for transaction sent to ${receiverId}`);
      }

      const block = await connection.provider.block({ finality: "final" });
      const blockHash = borsh.baseDecode(block.header.hash);
      const publicKey = PublicKey.from(accessKey.public_key);
      const nonce = accessKey.access_key.nonce + 1;
      const transaction = createTransaction(account.accountId, publicKey, receiverId, nonce, nativeActions, blockHash);

      const txBase64 = Buffer.from(borsh.serialize(SCHEMA, transaction)).toString("base64");
      const data = await delegate.provider({
        ...delegate,
        args: { transactions: txBase64 },
        network: this.config.networkId,
      });

      if (data.payload == null) {
        throw Error("Transaction not found, but maybe executed");
      }

      return await account.connection.provider.txStatus(data.payload, account.accountId);
    } catch (error) {
      internalThrow(error, delegate);
      throw error;
    }
  }

  public async signMessage({ signerId, message }: HereWalletSignMessageOptions) {
    const account = this.wallet.account();
    if (!account) throw new Error("Wallet not signed in");
    return await account.connection.signer.signMessage(message, signerId || account.accountId, this.config.networkId);
  }

  public async signAndSendTransactions({ transactions, ...delegate }: HereWalletSignAndSendTransactionsOptions) {
    delegate.strategy = delegate.strategy ?? this.defaultStrategy();
    delegate.provider = delegate.provider ?? this.defaultProvider;
    delegate.onInitialized?.();
    delegate.strategy?.onInitialized?.();

    try {
      if (!this.wallet.isSignedIn()) {
        throw new Error("Wallet not signed in");
      }

      const trxs = await transformTransactions(this.getAccount(), transactions);
      const trxsBase64 = trxs.map((t) => Buffer.from(borsh.serialize(SCHEMA, t)).toString("base64")).join(",");
      const data = await delegate.provider({
        ...delegate,
        args: { transactions: trxsBase64 },
        network: this.config.networkId,
      });

      if (data.payload == null) {
        throw Error("Transaction not found, but maybe executed");
      }

      const account = this.wallet.account();
      const provider = account.connection.provider;
      const promises = data.payload.split(",").map((id) => provider.txStatus(id, account.accountId));
      return await Promise.all(promises);
    } catch (error) {
      internalThrow(error, delegate);
      throw error;
    }
  }

  public static async initialize({
    network = "mainnet",
    defaultStrategy = () => new DefaultStrategy(),
    defaultProvider = network === "mainnet" ? proxyProvider : legacyProvider,
  }: HereInitializeOptions = {}) {
    const keyStore = new keyStores.BrowserLocalStorageKeyStore();
    const config = hereConfigurations[network];
    const near = await connect({
      keyStore,
      networkId: network,
      nodeUrl: config.nodeUrl,
      walletUrl: config.hereConnector,
      headers: {},
    });

    const wallet = new WalletConnection(near, "here_app");
    return new HereWallet(wallet, defaultStrategy, defaultProvider);
  }
}

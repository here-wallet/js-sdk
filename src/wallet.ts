import { Account, Connection, InMemorySigner, KeyPair } from "near-api-js";
import { FinalExecutionOutcome, JsonRpcProvider } from "near-api-js/lib/providers";
import { PublicKey, KeyPairEd25519 } from "near-api-js/lib/utils/key_pair";
import { sha256 } from "js-sha256";
import BN from "bn.js";

import { HereAuthStorage, HereKeyStore } from "./HereKeyStore";
import { HereProvider, HereProviderStatus } from "./provider";
import { internalThrow, isValidAccessKey, serializeActions } from "./utils";
import { proxyProvider } from "./here-provider";
import { createAction } from "./actions";
import { WidgetStrategy } from "./WidgetStrategy";
import {
  HereCall,
  HereAsyncOptions,
  HereWalletProtocol,
  SignAndSendTransactionOptions,
  SignAndSendTransactionsOptions,
  SignMessageOptions,
  SignInOptions,
  HereInitializeOptions,
  HereSignedResult,
  HereStrategy,
} from "./types";

class AccessDenied extends Error {}

export class HereWallet implements HereWalletProtocol {
  private readonly connection: Connection;
  private readonly defaultStrategy: () => HereStrategy;
  private readonly authStorage: HereAuthStorage;
  private readonly defaultProvider: HereProvider;

  public constructor({
    nodeUrl,
    networkId = "mainnet",
    authStorage = new HereKeyStore(),
    defaultStrategy = () => new WidgetStrategy(),
    defaultProvider = proxyProvider,
  }: HereInitializeOptions = {}) {
    this.authStorage = authStorage;
    this.defaultProvider = defaultProvider;
    this.defaultStrategy = defaultStrategy;

    const signer = new InMemorySigner(this.authStorage);
    const rpc = new JsonRpcProvider({ url: nodeUrl ?? `https://rpc.${networkId}.near.org` });
    this.connection = Connection.fromConfig({
      jsvmAccountId: `jsvm.${networkId}`,
      provider: rpc,
      networkId,
      signer,
    });
  }

  get rpc() {
    return this.connection.provider;
  }

  get signer() {
    return this.connection.signer;
  }

  get networkId() {
    return this.connection.networkId;
  }

  public async account(id?: string) {
    const accountId = id ?? (await this.authStorage.getActiveAccount(this.networkId));
    if (accountId == null) throw new Error("Wallet not signed in");
    return new Account(this.connection, accountId);
  }

  public async isSignedIn() {
    const id = await this.authStorage.getActiveAccount(this.networkId);
    return id != null;
  }

  public async signOut() {
    const accountId = await this.authStorage.getActiveAccount(this.networkId);
    if (accountId == null) throw new Error("Wallet not signed in");

    const key = await this.authStorage.getKey(this.networkId, accountId);
    if (key != null) {
      const publicKey = key.getPublicKey().toString();
      await this.silentSignAndSendTransaction({
        receiverId: accountId,
        actions: [{ type: "DeleteKey", params: { publicKey } }],
      }).catch(() => {});
    }

    await this.authStorage.removeKey(this.networkId, accountId);
  }

  public async getHereBalance(id?: string) {
    const account = await this.account(id);
    const params = { account_id: account.accountId };
    const contract = this.networkId === "mainnet" ? "here.storage.near" : "here.storage.testnet";
    const hereCoins = await account.viewFunction(contract, "ft_balance_of", params).catch(() => "0");
    return new BN(hereCoins);
  }

  public async getAvailableBalance(id?: string): Promise<BN> {
    const account = await this.account(id);
    const result = await account.getAccountBalance();
    const hereBalance = await this.getHereBalance();
    return new BN(result.available).add(new BN(hereBalance));
  }

  public async getAccounts() {
    return await this.authStorage.getAccounts(this.networkId);
  }

  public async getAccountId() {
    const accountId = await this.authStorage.getActiveAccount(this.networkId);
    if (accountId == null) throw new Error("Wallet not signed in");
    return accountId;
  }

  public async switchAccount(id: string) {
    const key = await this.authStorage.getKey(this.networkId, id);
    if (key == null) throw new Error(`Account ${id} not signed in`);
    await this.authStorage.setActiveAccount(this.networkId, id);
  }

  public async signIn({ contractId, allowance, methodNames = [], ...delegate }: SignInOptions = {}): Promise<string> {
    if (contractId == null) {
      const { accountId } = await this.signMessage({
        receiver: window.location.host,
        message: "Sign this message to sign in",
        ...delegate,
      });

      // Generate random keypair
      await this.authStorage.setKey(this.networkId, accountId, KeyPairEd25519.fromRandom());
      await this.authStorage.setActiveAccount(this.networkId, accountId);
      return accountId;
    }

    delegate.strategy = delegate.strategy ?? this.defaultStrategy();
    delegate.provider = delegate.provider ?? this.defaultProvider;
    delegate.onInitialized?.();
    delegate.strategy?.onInitialized?.();

    try {
      const accessKey = KeyPair.fromRandom("ed25519");
      const permission = { receiverId: contractId, methodNames, allowance };
      const data = await delegate.provider({
        ...delegate,
        request: {
          type: "call",
          network: this.networkId,
          transactions: [
            {
              actions: [
                {
                  type: "AddKey",
                  params: {
                    publicKey: accessKey.getPublicKey().toString(),
                    accessKey: { permission },
                  },
                },
              ],
            },
          ],
        },
      });

      if (data.account_id == null) {
        throw Error("Transaction is failed");
      }

      await this.authStorage.setKey(this.networkId, data.account_id, accessKey);
      await this.authStorage.setActiveAccount(this.networkId, data.account_id);
      return data.account_id;
    } catch (error) {
      internalThrow(error, delegate);
      throw error;
    }
  }

  public async silentSignAndSendTransaction({ actions, receiverId, signerId }: HereCall) {
    const account = await this.account(signerId);
    const localKey = await this.authStorage.getKey(this.networkId, account.accountId);
    if (localKey == null) throw new AccessDenied();

    const publicKey = localKey.getPublicKey();
    const accessKeys = await account.getAccessKeys();

    const call = { receiverId, actions };
    const isValid = accessKeys.some((v) => {
      if (v.public_key !== publicKey.toString()) return false;
      return isValidAccessKey(account.accountId, v, call);
    });

    if (isValid === false) throw new AccessDenied();

    // @ts-expect-error
    return await account.signAndSendTransaction({
      actions: actions.map((a) => createAction(a)),
      receiverId: receiverId ?? account.accountId,
    });
  }

  public async signAndSendTransaction(opts: SignAndSendTransactionOptions) {
    const { signerId, receiverId, actions, ...args } = opts;
    const delegate = args as HereAsyncOptions;

    delegate.strategy = delegate.strategy ?? this.defaultStrategy();
    delegate.provider = delegate.provider ?? this.defaultProvider;
    delegate.onInitialized?.();
    delegate.strategy?.onInitialized?.();

    try {
      const result = await this.silentSignAndSendTransaction({ receiverId, actions, signerId });
      const success = { status: HereProviderStatus.SUCCESS, payload: result?.transaction_outcome.id };
      delegate.onSuccess?.(success);
      delegate.strategy?.onSuccess?.(success);
      return result;
    } catch (e: any) {
      try {
        // If silent sign return AccessDenied or NotEnoughAllowance we request mobile wallet
        // OR its just transaction error
        if (!(e instanceof AccessDenied) && e?.type !== "NotEnoughAllowance") {
          internalThrow(e, delegate);
          throw e;
        }

        const data = await delegate.provider({
          ...delegate,
          request: {
            type: "call",
            transactions: [{ actions: serializeActions(actions), receiverId, signerId }],
            network: this.networkId,
          },
        });

        if (data.payload == null || data.account_id == null) {
          throw Error("Transaction not found, but maybe executed");
        }

        return await this.rpc.txStatus(data.payload, data.account_id);
      } catch (error) {
        internalThrow(error, delegate);
        throw error;
      }
    }
  }

  /** Implement NEP0413 */
  public async signMessage({ message, receiver, nonce, ...delegate }: SignMessageOptions) {
    delegate.strategy = delegate.strategy ?? this.defaultStrategy();
    delegate.provider = delegate.provider ?? this.defaultProvider;
    delegate.onInitialized?.();
    delegate.strategy?.onInitialized?.();

    if (nonce == null) {
      let nonceArray: Uint8Array = new Uint8Array(32);
      nonce = [...crypto.getRandomValues(nonceArray)];
    }

    const data = await delegate.provider({
      ...delegate,
      request: {
        type: "sign",
        message,
        receiver,
        nonce,
        network: this.networkId,
      },
    });

    if (data.payload == null) {
      throw Error("Signature not found");
    }

    try {
      const { publicKey, signature, accountId }: HereSignedResult = JSON.parse(data.payload);
      const sign = new Uint8Array(Buffer.from(signature, "base64"));
      const json = JSON.stringify({ message, receiver, nonce });
      const msg = new Uint8Array(sha256.digest(`NEP0413:` + json));
      const isVerify = PublicKey.from(publicKey).verify(msg, sign);
      if (isVerify === false) throw Error();

      const account = await this.account(accountId);
      const keys = await account.getAccessKeys();
      const pb = publicKey.toString();
      const isValid = keys.some((k) => {
        if (k.public_key !== pb) return false;
        if (k.access_key.permission !== "FullAccess") return false;
        return true;
      });

      if (isValid === false) throw Error();
      return {
        signature: new Uint8Array(Buffer.from(signature, "base64")),
        publicKey: PublicKey.from(publicKey),
        message: `NEP0413:` + json,
        receiver,
        accountId,
        nonce,
      };
    } catch {
      throw Error("Signature not correct");
    }
  }

  public async signAndSendTransactions({ transactions, ...delegate }: SignAndSendTransactionsOptions) {
    delegate.strategy = delegate.strategy ?? this.defaultStrategy();
    delegate.provider = delegate.provider ?? this.defaultProvider;
    delegate.onInitialized?.();
    delegate.strategy?.onInitialized?.();

    let results: FinalExecutionOutcome[] = [];
    try {
      for (const call of transactions) {
        const r = await this.silentSignAndSendTransaction(call);
        results.push(r);
      }

      const payload = results.map((result) => result.transaction_outcome.id).join(",");
      const success = { status: HereProviderStatus.SUCCESS, payload };
      delegate.onSuccess?.(success);
      delegate.strategy?.onSuccess?.(success);
      return results;
    } catch (e: any) {
      try {
        // If silent sign return access denied or not enough balance we request mobile wallet
        // OR its just transaction error
        if (!(e instanceof AccessDenied) && e?.type !== "NotEnoughAllowance") {
          internalThrow(e, delegate);
          throw e;
        }

        const uncompleted = transactions.slice(results.length);
        const data = await delegate.provider({
          ...delegate,
          request: {
            type: "call",
            transactions: uncompleted.map((trx) => ({
              ...trx,
              actions: serializeActions(trx.actions),
            })),
            network: this.networkId,
          },
        });

        if (data.payload == null || data.account_id == null) {
          throw Error("Transaction not found, but maybe executed");
        }

        const promises = data.payload.split(",").map((id) => this.rpc.txStatus(id, data.account_id!));
        return await Promise.all(promises);
      } catch (error) {
        internalThrow(error, delegate);
        throw error;
      }
    }
  }
}

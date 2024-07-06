import { Account, Connection } from "@near-js/accounts";
import { InMemorySigner } from "@near-js/signers";
import { JsonRpcProvider } from "@near-js/providers";
import { FinalExecutionOutcome } from "@near-js/types";
import { PublicKey, KeyPair, KeyPairEd25519 } from "@near-js/crypto";
import { randomBytes } from "crypto";
import { sha256 } from "js-sha256";
import BN from "bn.js";

import { createAction } from "./helpers/actions";
import { verifySignature } from "./helpers/nep0314";
import { internalThrow, isValidAccessKey, serializeActions } from "./helpers/utils";
import { HereAuthStorage, HereKeyStore } from "./storage/HereKeyStore";
import { WidgetStrategy } from "./strategies/WidgetStrategy";
import { HereStrategy } from "./strategies/HereStrategy";

import {
  HereCall,
  HereAsyncOptions,
  HereWalletProtocol,
  SignAndSendTransactionOptions,
  SignAndSendTransactionsOptions,
  SignMessageOptions,
  SignInOptions,
  HereInitializeOptions,
  SignMessageOptionsNEP0413,
  SignMessageOptionsLegacy,
  SignMessageLegacyReturn,
  SignedMessageNEP0413,
  HereProviderStatus,
} from "./types";
import { TelegramAppStrategy } from "./strategies/TelegramAppStrategy";
import { InjectedStrategy } from "./strategies/InjectedStrategy";
import { waitInjectedHereWallet } from "./helpers/waitInjected";
import { hereWalletProvider } from "./telegramEthereumProvider";

class AccessDenied extends Error {}

export class HereWallet implements HereWalletProtocol {
  readonly connection: Connection;
  readonly authStorage: HereAuthStorage;
  readonly strategy: HereStrategy;

  static async connect(options: HereInitializeOptions = {}) {
    if (options.authStorage == null) options.authStorage = new HereKeyStore();

    if (options.defaultStrategy) {
      const wallet = new HereWallet(options);
      await wallet.strategy.connect(wallet);
      return wallet;
    }

    if (typeof window !== "undefined") {
      if (window !== parent) {
        const injected = await waitInjectedHereWallet;
        if (injected != null) {
          options.defaultStrategy = new InjectedStrategy();
          const wallet = new HereWallet({ ...options, injected });
          await wallet.strategy.connect(wallet);
          return wallet;
        }
      }

      if (window.Telegram?.WebApp != null) {
        options.defaultStrategy = new TelegramAppStrategy(options.botId, options.walletId);
        const wallet = new HereWallet(options);
        await wallet.strategy.connect(wallet);
        return wallet;
      }
    }

    options.defaultStrategy = new WidgetStrategy();
    const wallet = new HereWallet(options);
    await wallet.strategy.connect(wallet);
    return wallet;
  }

  readonly ethProvider?: any;
  readonly ethAddress?: string;
  readonly telegramId?: number;

  private constructor({ injected, nodeUrl, networkId = "mainnet", authStorage, defaultStrategy }: HereInitializeOptions = {}) {
    this.authStorage = authStorage!;
    this.strategy = defaultStrategy!;

    Object.defineProperty(this, "ethAddress", { get: () => injected?.ethAddress });
    Object.defineProperty(this, "telegramId", { get: () => injected?.telegramId });
    Object.defineProperty(this, "ethProvider", { get: () => (injected?.ethAddress ? hereWalletProvider : null) });

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
    if (accountId == null) throw new AccessDenied("Wallet not signed in");
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
    const contractId = this.networkId === "mainnet" ? "here.storage.near" : "here.storage.testnet";
    const hereCoins = await account
      .viewFunction({ args: { account_id: account.accountId }, methodName: "ft_balance_of", contractId })
      .catch(() => "0");

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

  public async signIn({
    contractId,
    allowance,
    methodNames = [],
    strategy = this.strategy,
    signal,
    callbackUrl,
    selector,
  }: SignInOptions = {}): Promise<string> {
    if (contractId == null) {
      const { accountId } = await this.authenticate({ strategy, signal, selector });

      // Generate random keypair
      await this.authStorage.setKey(this.networkId, accountId, KeyPairEd25519.fromRandom());
      await this.authStorage.setActiveAccount(this.networkId, accountId);
      return accountId;
    }

    await strategy.onInitialized();

    try {
      const accessKey = KeyPair.fromRandom("ed25519");
      const permission = { receiverId: contractId, methodNames, allowance };
      const data = await strategy.request({
        signal,
        accessKey,
        callbackUrl,
        request: {
          type: "call",
          network: this.networkId,
          selector: selector || {},
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
      internalThrow(error, strategy, selector);
      throw error;
    }
  }

  public async silentSignAndSendTransaction({ actions, receiverId, signerId }: HereCall) {
    const account = await this.account(signerId);
    const localKey = await this.authStorage.getKey(this.networkId, account.accountId).catch(() => null);
    if (localKey == null) throw new AccessDenied();

    const publicKey = localKey.getPublicKey();
    const accessKeys = await account.getAccessKeys();

    const call = { receiverId, actions };
    const isValid = accessKeys.some((v) => {
      if (v.public_key !== publicKey.toString()) return false;
      return isValidAccessKey(account.accountId, v, call);
    });

    if (isValid === false) throw new AccessDenied();

    return await account.signAndSendTransaction({
      actions: actions.map((a) => createAction(a)),
      receiverId: receiverId ?? account.accountId,
    });
  }

  public async signAndSendTransaction(opts: SignAndSendTransactionOptions) {
    const { signerId, receiverId, actions, callbackUrl, strategy = this.strategy, signal, selector } = opts;
    await strategy.onInitialized();

    try {
      const result = await this.silentSignAndSendTransaction({ receiverId, actions, signerId });
      const success = { type: "web", status: HereProviderStatus.SUCCESS, payload: result?.transaction_outcome.id };
      strategy.onSuccess(success);
      return result;
    } catch (e: any) {
      try {
        // If silent sign return AccessDenied or NotEnoughAllowance we request mobile wallet
        // OR its just transaction error
        if (!(e instanceof AccessDenied) && e?.type !== "NotEnoughAllowance") {
          internalThrow(e, strategy, selector);
          throw e;
        }

        const activeAccount = await this.getAccountId().catch(() => undefined);
        const data = await strategy.request({
          signal,
          callbackUrl,
          request: {
            type: "call",
            network: this.networkId,
            transactions: [{ actions: serializeActions(actions), receiverId, signerId }],
            selector: opts.selector || { id: signerId || activeAccount },
          },
        });

        if (data.payload == null || data.account_id == null) {
          throw Error("Transaction not found, but maybe executed");
        }

        return await this.rpc.txStatus(data.payload, data.account_id, "INCLUDED");
      } catch (error) {
        internalThrow(error, strategy, selector);
        throw error;
      }
    }
  }

  async verifyMessageNEP0413(request: SignMessageOptionsNEP0413, result: SignedMessageNEP0413) {
    const isSignatureValid = verifySignature(request, result);
    if (!isSignatureValid) throw Error("Incorrect signature");

    const account = await this.account(result.accountId);
    const keys = await account.getAccessKeys();
    const isFullAccess = keys.some((k) => {
      if (k.public_key !== result.publicKey) return false;
      if (k.access_key.permission !== "FullAccess") return false;
      return true;
    });

    if (!isFullAccess) throw Error("Signer public key is not full access");
    return true;
  }

  async authenticate(options: HereAsyncOptions & Partial<SignMessageOptionsNEP0413> = {}) {
    const signRequest = {
      nonce: options.nonce ?? randomBytes(32),
      recipient: options.recipient ?? window?.location.host,
      message: options.message ?? "Authenticate",
    };

    const signed = await this.signMessage({ ...signRequest, ...options });
    await this.verifyMessageNEP0413(signRequest, signed);
    return signed;
  }

  public signMessage(options: HereAsyncOptions & SignMessageOptionsNEP0413): Promise<SignedMessageNEP0413>;
  public signMessage(options: HereAsyncOptions & SignMessageOptionsLegacy): Promise<SignMessageLegacyReturn>;
  public async signMessage(options: SignMessageOptions): Promise<SignMessageLegacyReturn | SignedMessageNEP0413> {
    const { strategy = this.strategy, signal, selector, callbackUrl } = options;
    await strategy.onInitialized();

    // Legacy format with receiver property, does not correspond to the current version of the standard
    if ("receiver" in options) return await this.legacySignMessage(options);

    const activeAccount = await this.getAccountId().catch(() => undefined);
    const data = await strategy.request({
      signal,
      callbackUrl,
      request: {
        type: "sign",
        message: options.message,
        recipient: options.recipient,
        nonce: Array.from(options.nonce),
        network: this.networkId,
        selector: selector || { id: activeAccount },
      },
    });

    if (data?.payload == null) throw Error("Signature not found");
    const { publicKey, signature, accountId }: SignedMessageNEP0413 = JSON.parse(data.payload);
    return { publicKey, signature, accountId };
  }

  async legacySignMessage({ receiver, message, nonce, ...delegate }: SignMessageOptionsLegacy & HereAsyncOptions): Promise<SignMessageLegacyReturn> {
    if (nonce == null) {
      let nonceArray: Uint8Array = new Uint8Array(32);
      nonce = [...crypto.getRandomValues(nonceArray)];
    }

    const { strategy = this.strategy, callbackUrl, selector, signal } = delegate;
    const activeAccount = await this.getAccountId().catch(() => undefined);
    const data = await strategy.request({
      signal,
      callbackUrl,
      request: {
        type: "sign",
        network: this.networkId,
        selector: selector || { id: activeAccount },
        message,
        receiver,
        nonce,
      },
    });

    if (data?.payload == null) {
      throw Error("Signature not found");
    }

    try {
      const { publicKey, signature, accountId }: SignedMessageNEP0413 = JSON.parse(data.payload);
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
    const { strategy = this.strategy, selector, callbackUrl, signal } = delegate;
    await strategy.onInitialized();

    let results: FinalExecutionOutcome[] = [];
    try {
      for (const call of transactions) {
        const r = await this.silentSignAndSendTransaction(call);
        results.push(r);
      }

      const payload = results.map((result) => result.transaction_outcome.id).join(",");
      const success = { type: "web", status: HereProviderStatus.SUCCESS, payload };
      strategy.onSuccess(success);
      return results;
    } catch (e: any) {
      try {
        // If silent sign return access denied or not enough balance we request mobile wallet
        // OR its just transaction error
        if (!(e instanceof AccessDenied) && e?.type !== "NotEnoughAllowance") {
          internalThrow(e, strategy, selector);
          throw e;
        }

        const activeAccount = await this.getAccountId().catch(() => undefined);
        const uncompleted = transactions.slice(results.length);
        const data = await strategy.request({
          signal,
          callbackUrl,
          request: {
            type: "call",
            network: this.networkId,
            selector: selector || { id: uncompleted[0].signerId || activeAccount },
            transactions: uncompleted.map((trx) => ({ ...trx, actions: serializeActions(trx.actions) })),
          },
        });

        if (data.payload == null || data.account_id == null) {
          throw Error("Transaction not found, but maybe executed");
        }

        const promises = data.payload.split(",").map((id) => this.rpc.txStatus(id, data.account_id!, "INCLUDED"));
        return await Promise.all(promises);
      } catch (error) {
        internalThrow(error, strategy, selector);
        throw error;
      }
    }
  }
}

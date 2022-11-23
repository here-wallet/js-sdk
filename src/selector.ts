import type {
  SignInParams,
  WalletModuleFactory,
  WalletBehaviourFactory,
  BrowserWallet,
  Account,
  FinalExecutionOutcome,
} from "@near-wallet-selector/core";
import {
  BrowserWalletSignAndSendTransactionsParams,
  SignAndSendTransactionParams,
} from "@near-wallet-selector/core/lib/wallet";
import { createAction } from "@near-wallet-selector/wallet-utils";
import { PublicKey, Signature } from "near-api-js/lib/utils/key_pair";
import { createTransaction, SCHEMA } from "near-api-js/lib/transaction";
import { KeyPair } from "near-api-js";
import * as borsh from "borsh";
import BN from "bn.js";

import { asyncHereSign, AsyncHereSignDelegate } from "./async";
import { getHereBalance, getPublicKeys, HereConfiguration, setupWalletState, transformTransactions } from "./utils";

export type HereWallet = BrowserWallet & {
  getHereBalance: () => Promise<BN>;
  getAvailableBalance: () => Promise<BN>;
  signMessage: (data: { message: Uint8Array; signerId: string }) => Promise<Signature>;
  signIn: (data: SignInParams & AsyncHereSignDelegate) => Promise<Array<Account>>;
  signAndSendTransaction: (
    data: SignAndSendTransactionParams & AsyncHereSignDelegate
  ) => Promise<FinalExecutionOutcome>;
  signAndSendTransactions: (data: BrowserWalletSignAndSendTransactionsParams & AsyncHereSignDelegate) => Promise<void>;
};

type Init = WalletBehaviourFactory<HereWallet, { configuration: HereConfiguration }>;
export const initHereWallet: Init = async ({ store, logger, emitter, options, configuration }) => {
  const _state = await setupWalletState(configuration, options.network);

  const getAccounts = () => {
    const accountId: string | null = _state.wallet.getAccountId();
    if (!accountId) {
      return [];
    }

    return [{ accountId }];
  };

  return {
    async signIn({ contractId, methodNames, ...delegate }) {
      const approve: Record<string, string> = {};
      const accessKey = KeyPair.fromRandom("ed25519");
      approve.public_key = accessKey.getPublicKey().toString();
      approve.contract_id = contractId;
      if (methodNames) {
        approve.methodNames = methodNames.pop();
      }

      const data = await asyncHereSign(configuration, approve, delegate);

      if (data.account_id) {
        const keysData = await getPublicKeys(options.network.nodeUrl, data.account_id).catch(() => []);
        const keys = keysData.result.keys.filter((key) => key.access_key?.permission === "FullAccess");
        const fullKey = keys.pop();
        const wallet = _state.wallet;

        wallet._authData = { accountId: data.account_id, allKeys: [fullKey.public_key] };
        window.localStorage.setItem(wallet._authDataKey, JSON.stringify(wallet._authData));
        await wallet._keyStore.setKey(wallet._networkId, data.account_id, accessKey);
      }

      const accounts = getAccounts();
      console.log("accounts", accounts);
      emitter.emit("signedIn", { contractId, methodNames, accounts });
      return accounts;
    },

    async getHereBalance() {
      return await getHereBalance(_state, configuration);
    },

    async getAvailableBalance(): Promise<BN> {
      const result = await _state.wallet.account().getAccountBalance();
      const hereBalance = await getHereBalance(_state, configuration);
      return new BN(result.available).add(new BN(hereBalance));
    },

    async signOut() {
      if (_state.wallet.isSignedIn()) {
        _state.wallet.signOut();
      }
    },

    async getAccounts() {
      return getAccounts();
    },

    async signAndSendTransaction({ callbackUrl, meta, signerId, receiverId, actions, ...delegate }) {
      logger.log("HereWallet:signAndSendTransaction", { signerId, receiverId, actions });

      const { contract } = store.getState();
      if (!_state.wallet.isSignedIn() || !contract) {
        throw new Error("Wallet not signed in");
      }

      const wallet = _state.wallet;
      const account = wallet.account();
      const connection = account.connection;
      const localKey = await connection.signer.getPublicKey(account.accountId, connection.networkId);

      let accessKey = await account.accessKeyForTransaction(receiverId, actions, localKey);
      if (!accessKey) {
        throw new Error(`Cannot find matching key for transaction sent to ${receiverId}`);
      }

      const block = await connection.provider.block({ finality: "final" });
      const blockHash = borsh.baseDecode(block.header.hash);
      const publicKey = PublicKey.from(accessKey.public_key);
      const nonce = accessKey.access_key.nonce + 1;
      const transaction = createTransaction(
        account.accountId,
        publicKey,
        receiverId || contract.contractId,
        nonce,
        actions.map((action) => createAction(action)),
        blockHash
      );

      const config = {
        transactions: Buffer.from(borsh.serialize(SCHEMA, transaction)).toString("base64"),
        callbackUrl,
        meta,
      };

      const data = await asyncHereSign(configuration, config, delegate);
      return await account.connection.provider.txStatus(data.transaction_hash, account.accountId);
    },

    async verifyOwner() {
      throw new Error("verifyOwner is not support");
    },

    async signMessage({ signerId, message }) {
      const account = _state.wallet.account();
      if (!account) {
        throw new Error("Wallet not signed in");
      }

      return await account.connection.signer.signMessage(
        message,
        signerId || account.accountId,
        options.network.networkId
      );
    },

    async signAndSendTransactions({ transactions, callbackUrl, ...delegate }) {
      logger.log("HereWallet:signAndSendTransactions", { transactions, callbackUrl });
      if (!_state.wallet.isSignedIn()) {
        throw new Error("Wallet not signed in");
      }

      const transform = (trx) => Buffer.from(borsh.serialize(SCHEMA, trx)).toString("base64");
      const trxs = await transformTransactions(_state, transactions);
      const config = {
        transactions: trxs.map(transform).join(","),
        callbackUrl,
      };

      await asyncHereSign(configuration, config, delegate);
    },
  };
};

import type { SignInParams, WalletBehaviourFactory, Account, FinalExecutionOutcome } from "@near-wallet-selector/core";
import {
  InjectedWallet,
  SignAndSendTransactionParams,
  SignAndSendTransactionsParams,
} from "@near-wallet-selector/core/lib/wallet";
import { createAction } from "@near-wallet-selector/wallet-utils";
import { PublicKey, Signature } from "near-api-js/lib/utils/key_pair";
import { createTransaction, SCHEMA } from "near-api-js/lib/transaction";
import { KeyPair } from "near-api-js";
import * as borsh from "borsh";
import BN from "bn.js";

import { asyncHereSign, AsyncHereSignDelegate } from "./async";
import { getHereBalance, getPublicKeys, HereConfiguration, setupWalletState, transformTransactions } from "./utils";
import { Strategy } from "./strategy";

export type HereWallet = InjectedWallet & {
  getHereBalance: () => Promise<BN>;
  getAvailableBalance: () => Promise<BN>;
  signMessage: (data: { message: Uint8Array; signerId: string }) => Promise<Signature>;
  signIn: (data: SignInParams & AsyncHereSignDelegate) => Promise<Array<Account>>;
  signAndSendTransaction: (
    data: SignAndSendTransactionParams & AsyncHereSignDelegate
  ) => Promise<FinalExecutionOutcome>;
  signAndSendTransactions: (
    data: SignAndSendTransactionsParams & AsyncHereSignDelegate
  ) => Promise<Array<FinalExecutionOutcome>>;
};

type Init = WalletBehaviourFactory<HereWallet, { configuration: HereConfiguration; strategy: () => Strategy }>;
export const initHereWallet: Init = async ({ store, logger, emitter, options, configuration, strategy }) => {
  const _state = await setupWalletState(configuration, options.network);

  const getAccounts = () => {
    const accountId: string | null = _state.wallet.getAccountId();
    return accountId ? [{ accountId }] : [];
  };

  return {
    async signIn({ contractId, methodNames = [], ...delegate }) {
      try {
        delegate.strategy = delegate.strategy ?? strategy();
        delegate.onInitialized?.();
        delegate.strategy?.onInitialized?.();

        const approve: Record<string, string> = {};
        const accessKey = KeyPair.fromRandom("ed25519");
        approve["public_key"] = accessKey.getPublicKey().toString();
        approve["contract_id"] = contractId;

        const method = methodNames?.pop();
        if (method) {
          approve["methodNames"] = method;
        }

        const data = await asyncHereSign(configuration, approve, delegate);

        if (data.account_id) {
          const keysData = await getPublicKeys(options.network.nodeUrl, data.account_id);

          const keys = keysData.filter((key) => key.access_key?.permission === "FullAccess");
          const fullKey = keys.pop();
          const wallet = _state.wallet;

          wallet._authData = {
            accountId: data.account_id,
            allKeys: fullKey ? [fullKey.public_key] : [],
          };

          window.localStorage.setItem(wallet._authDataKey, JSON.stringify(wallet._authData));
          await wallet._keyStore.setKey(wallet._networkId, data.account_id, accessKey);
        }

        const accounts = getAccounts();
        emitter.emit("signedIn", { contractId, methodNames, accounts });
        return accounts;
      } catch (error) {
        delegate.onFailed?.(error);
        delegate?.strategy.onFailed?.(error);
        throw error;
      }
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

    async signAndSendTransaction({ signerId, receiverId, actions: _actions, ...delegate }) {
      try {
        delegate.strategy = delegate.strategy ?? strategy();
        delegate.onInitialized?.();
        delegate.strategy?.onInitialized?.();

        logger.log("HereWallet:signAndSendTransaction", {
          signerId,
          receiverId,
          actions: _actions,
          ...delegate,
        });

        const { contract } = store.getState();
        if (!_state.wallet.isSignedIn() || !contract) {
          throw new Error("Wallet not signed in");
        }

        const wallet = _state.wallet;
        const account = wallet.account();
        const connection = account.connection;
        const actions = _actions.map((action) => createAction(action));
        const localKey = await connection.signer.getPublicKey(account.accountId, connection.networkId);
        const accessKey = await account.accessKeyForTransaction(receiverId ?? "", actions, localKey);

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
          actions,
          blockHash
        );

        const config = {
          transactions: Buffer.from(borsh.serialize(SCHEMA, transaction)).toString("base64"),
        };

        const data = await asyncHereSign(configuration, config, delegate);

        if (data.transaction_hash == null) {
          throw Error("Transaction not found, but maybe executed");
        }

        return await account.connection.provider.txStatus(data.transaction_hash, account.accountId);
      } catch (error) {
        delegate.onFailed?.(error);
        delegate?.strategy.onFailed?.(error);
        throw error;
      }
    },

    async verifyOwner() {
      logger.log("HereWallet:verifyOwner");
      throw new Error("verifyOwner is not support");
    },

    async signMessage({ signerId, message }) {
      logger.log("HereWallet:signMessage", {
        signerId,
        message,
      });

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

    async signAndSendTransactions({ transactions, ...delegate }) {
      try {
        delegate.strategy = delegate.strategy ?? strategy();
        delegate.onInitialized?.();
        delegate.strategy?.onInitialized?.();

        logger.log("HereWallet:signAndSendTransactions", { transactions, ...delegate });
        if (!_state.wallet.isSignedIn()) {
          throw new Error("Wallet not signed in");
        }

        const trxs = await transformTransactions(_state, transactions);
        const config: Record<string, string> = {
          transactions: trxs.map((t) => Buffer.from(borsh.serialize(SCHEMA, t)).toString("base64")).join(","),
        };

        const data = await asyncHereSign(configuration, config, delegate);

        if (data.transaction_hash == null) {
          throw Error("Transaction not found, but maybe executed");
        }

        const wallet = _state.wallet;
        const account = wallet.account();
        const provider = account.connection.provider;
        const promises = data.transaction_hash.split(",").map((id) => provider.txStatus(id, account.accountId));
        return await Promise.all(promises);
      } catch (error) {
        delegate.onFailed?.(error);
        delegate?.strategy.onFailed?.(error);
        throw error;
      }
    },
  };
};

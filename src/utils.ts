import { Optional, Transaction } from "@near-wallet-selector/core";
import { createAction } from "@near-wallet-selector/wallet-utils";
import { utils, transactions as nearTransactions } from "near-api-js";
import uuid4 from "uuid4";
import BN from "bn.js";
import { HereAsyncOptions, HereWalletState } from "./state";
import { HereProviderResult, HereProviderStatus } from "./provider";

export const getDeviceId = () => {
  const topicId = window.localStorage.getItem("herewallet-topic") || uuid4();
  window.localStorage.setItem("herewallet-topic", topicId);
  return topicId;
};

export const isMobile = () => {
  return window.matchMedia("(any-pointer:coarse)").matches;
};

export const getPublicKeys = async (
  rpc: string,
  accountId: string
): Promise<Array<{ public_key: string; access_key: { permission: string } }>> => {
  const res = await fetch(rpc, {
    method: "POST",
    body: JSON.stringify({
      jsonrpc: "2.0",
      id: "dontcare",
      method: "query",
      params: {
        request_type: "view_access_key_list",
        finality: "final",
        account_id: accountId,
      },
    }),
    headers: {
      "content-type": "application/json",
    },
  });

  if (res.ok === false) {
    return [];
  }

  const data = await res.json();
  return data.result.keys;
};

export const getHereBalance = async (state: HereWalletState): Promise<BN> => {
  const params = { account_id: state.wallet.getAccountId() };
  const hereCoins = await state.wallet
    .account()
    .viewFunction(state.hereContract, "ft_balance_of", params)
    .catch(() => "0");

  return new BN(hereCoins);
};

export const internalThrow = (error: unknown, delegate: HereAsyncOptions) => {
  const result: HereProviderResult = {
    payload: error instanceof Error ? error.message : "UNKNOWN",
    status: HereProviderStatus.FAILED,
    account_id: "",
  };

  delegate.onFailed?.(result);
  delegate?.strategy?.onFailed?.(result);
  throw error;
};

export const transformTransactions = async (
  state: HereWalletState,
  transactions: Array<Optional<Transaction, "signerId">>
) => {
  const account = state.wallet.account();
  const { networkId, signer, provider } = account.connection;
  const localKey = await signer.getPublicKey(account.accountId, networkId);

  const transformed: Array<nearTransactions.Transaction> = [];
  let index = 0;

  for (const transaction of transactions) {
    index += 1;

    const actions = transaction.actions.map((action) => createAction(action));
    const accessKey = await account.accessKeyForTransaction(transaction.receiverId, actions, localKey);

    if (!accessKey) {
      throw new Error(`Failed to find matching key for transaction sent to ${transaction.receiverId}`);
    }

    const block = await provider.block({ finality: "final" });
    transformed.push(
      nearTransactions.createTransaction(
        account.accountId,
        utils.PublicKey.from(accessKey.public_key),
        transaction.receiverId,
        accessKey.access_key.nonce + index,
        actions,
        utils.serialize.base_decode(block.header.hash)
      )
    );
  }

  return transformed;
};

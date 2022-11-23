import { Network, Optional, Transaction } from "@near-wallet-selector/core";
import { createAction } from "@near-wallet-selector/wallet-utils";
import { utils, connect, keyStores, WalletConnection, transactions as nearTransactions } from "near-api-js";

import uuid4 from "uuid4";
import BN from "bn.js";

export interface HereWalletState {
  wallet: WalletConnection;
  keyStore: keyStores.BrowserLocalStorageKeyStore;
}

export interface HereConfiguration {
  hereApi: string;
  hereConnector: string;
  hereContract: string;
}

const topicId = window.localStorage.getItem("herewallet-topic") || uuid4();
window.localStorage.setItem("herewallet-topic", topicId);

export const getPublicKeys = (rpc: string, accountId) =>
  fetch(rpc, {
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
  }).then((r) => r.json());

export const getTransactionStatus = async (api: string, request) => {
  const res = await fetch(`${api}/api/v1/web/web_request?request_id=${request}`, {
    method: "GET",
    headers: { "content-type": "application/json" },
  });

  if (res.ok === false) {
    throw Error();
  }

  return await res.json();
};

export const createRequest = (config: HereConfiguration, request: string, options: Record<string, string>) => {
  const query = new URLSearchParams(options);
  query.append("request_id", request);

  try {
    const host = new URL(document.referrer).hostname ?? "";
    query.append("referrer", host);
  } catch {}

  return fetch(`${config.hereApi}/api/v1/web/request_transaction_sign`, {
    method: "POST",
    body: JSON.stringify({
      transaction: `${config.hereConnector}/approve?${query}`,
      request_id: request,
      topic: topicId,
    }),
    headers: {
      "content-type": "application/json",
    },
  });
};

export const hereConfigurations: Record<string, HereConfiguration> = {
  mainnet: {
    hereApi: "https://api.herewallet.app",
    hereConnector: "https://web.herewallet.app",
    hereContract: "storage.herewallet.near",
  },
  testnet: {
    hereApi: "https://api.testnet.herewallet.app",
    hereConnector: "https://web.testnet.herewallet.app",
    hereContract: "storage.herewallet.testnet",
  },
};

export const setupWalletState = async (config: HereConfiguration, network: Network): Promise<HereWalletState> => {
  const keyStore = new keyStores.BrowserLocalStorageKeyStore();
  const near = await connect({
    keyStore,
    walletUrl: config.hereConnector,
    headers: {},
    ...network,
  });

  const wallet = new WalletConnection(near, "here_app");
  return { wallet, keyStore };
};

export const getHereBalance = async (state: HereWalletState, config: HereConfiguration): Promise<BN> => {
  const params = { account_id: state.wallet.getAccountId() };
  const hereCoins = await state.wallet
    .account()
    .viewFunction(config.hereContract, "ft_balance_of", params)
    .catch(() => "0");

  return new BN(hereCoins);
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

export const isMobile = () => {
  return window.matchMedia("(any-pointer:coarse)").matches;
};
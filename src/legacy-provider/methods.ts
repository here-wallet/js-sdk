import { HereProviderResult } from "../provider";
import { HereWalletState } from "../state";
import { getDeviceId } from "../utils";

export const getTransactionStatus = async (api: string, request: string): Promise<HereProviderResult> => {
  const res = await fetch(`${api}/api/v1/web/web_request?request_id=${request}`, {
    method: "GET",
    headers: { "content-type": "application/json" },
  });

  if (res.ok === false) {
    throw Error();
  }

  const data = await res.json();
  return {
    account_id: data.account_id,
    payload: data.transaction_hash,
    status: data.status,
  };
};

export const createRequest = async (state: HereWalletState, request: string, options: Record<string, string>) => {
  const query = new URLSearchParams(options);
  query.append("request_id", request);

  try {
    const host = new URL(document.referrer).hostname ?? "";
    query.append("referrer", host);
  } catch {
    //
  }

  const res = await fetch(`${state.hereApi}/api/v1/web/request_transaction_sign`, {
    method: "POST",
    body: JSON.stringify({
      transaction: `${state.hereConnector}/approve?${query}`,
      request_id: request,
      topic: getDeviceId(),
    }),
    headers: {
      "content-type": "application/json",
    },
  });

  if (res.ok === false) {
    throw Error(await res.text());
  }
};

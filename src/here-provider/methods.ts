import uuid4 from "uuid4";
import sha1 from "sha1";
import { HereWalletState } from "../state";
import { getDeviceId } from "../utils";
import { HereProviderResult } from "../provider";

export const getResponse = async (state: HereWalletState, id: string): Promise<HereProviderResult> => {
  const res = await fetch(`${state.proxyApi}/${id}/response`, {
    headers: { "content-type": "application/json" },
    method: "GET",
  });

  if (res.ok === false) {
    throw Error(await res.text());
  }

  const { data } = await res.json();
  const result: HereProviderResult = JSON.parse(data) ?? {};
  return {
    account_id: result.account_id ?? "",
    payload: result.payload ?? "",
    status: result.status ?? -1,
  };
};

export const deleteRequest = async (state: HereWalletState, id: string) => {
  const res = await fetch(`${state.proxyApi}/${id}`, {
    headers: { "content-type": "application/json" },
    method: "DELETE",
  });

  if (res.ok === false) {
    throw Error(await res.text());
  }
};

export const createRequest = async (state: HereWalletState, args: Record<string, string>) => {
  const query = new URLSearchParams(args);
  query.append("nonce", uuid4());

  try {
    const host = new URL(document.referrer).hostname ?? "";
    query.append("referrer", host);
  } catch {
    //
  }

  const hashsum = sha1(query.toString());
  const id = Buffer.from(hashsum, "hex").toString("base64");
  const urlsafe = id.replaceAll("/", "_").replaceAll("-", "+");

  const res = await fetch(`${state.proxyApi}/${urlsafe}/request`, {
    method: "POST",
    body: JSON.stringify({
      type: "sign_web",
      data: query.toString(),
      topic_id: getDeviceId(),
    }),
    headers: {
      "content-type": "application/json",
    },
  });

  if (res.ok === false) {
    throw Error(await res.text());
  }

  return urlsafe;
};

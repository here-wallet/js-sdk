import sha1 from "sha1";
import uuid4 from "uuid4";
import { base_decode, base_encode } from "near-api-js/lib/utils/serialize";
import { HereProviderRequest, HereProviderResult } from "../provider";
import { getDeviceId } from "../utils";

export const proxyApi = "https://h4n.app";

export const getRequest = async (id: string, signal?: AbortSignal): Promise<HereProviderRequest> => {
  const res = await fetch(`${proxyApi}/${id}/request`, {
    signal,
    headers: { "content-type": "application/json" },
    method: "GET",
  });

  if (res.ok === false) {
    throw Error(await res.text());
  }

  const { data } = await res.json();
  return JSON.parse(base_decode(data).toString("utf8"));
};

export const getResponse = async (id: string): Promise<HereProviderResult> => {
  const res = await fetch(`${proxyApi}/${id}/response`, {
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

export const deleteRequest = async (id: string) => {
  const res = await fetch(`${proxyApi}/${id}`, {
    headers: { "content-type": "application/json" },
    method: "DELETE",
  });

  if (res.ok === false) {
    throw Error(await res.text());
  }
};

export const createRequest = async (request: HereProviderRequest, signal?: AbortSignal) => {
  const query = base_encode(JSON.stringify({ ...request, _id: uuid4() }));
  const hashsum = sha1(query);
  const id = Buffer.from(hashsum, "hex").toString("base64");
  const urlsafe = id.replaceAll("/", "_").replaceAll("-", "+").slice(0, 13);

  const res = await fetch(`${proxyApi}/${urlsafe}/request`, {
    method: "POST",
    signal,
    body: JSON.stringify({
      topic_id: getDeviceId(),
      data: query,
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

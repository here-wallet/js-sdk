import sha1 from "sha1";
import uuid4 from "uuid4";
import { baseDecode, baseEncode } from "@near-js/utils";

import { HereProviderRequest, HereProviderResult } from "../types";
import { getDeviceId } from "./utils";

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
  return JSON.parse(Buffer.from(baseDecode(data)).toString("utf8"));
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
  return Object.assign({ type: "here", public_key: "", account_id: "", payload: "", status: -1, path: "" }, result);
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

export const computeRequestId = async (request: HereProviderRequest) => {
  const query = baseEncode(JSON.stringify({ ...request, _id: uuid4() }));
  const hashsum = sha1(query);
  const id = Buffer.from(hashsum, "hex").toString("base64");
  const requestId = id.replaceAll("/", "_").replaceAll("-", "+").slice(0, 13);
  return { requestId, query };
};

export const createRequest = async (request: HereProviderRequest, signal?: AbortSignal) => {
  const { query, requestId } = await computeRequestId(request);
  const res = await fetch(`${proxyApi}/${requestId}/request`, {
    method: "POST",
    body: JSON.stringify({ topic_id: getDeviceId(), data: query }),
    headers: { "content-type": "application/json" },
    signal,
  });

  if (res.ok === false) {
    throw Error(await res.text());
  }

  return requestId;
};

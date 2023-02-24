import uuid4 from "uuid4";
import { AccessKeyInfoView } from "near-api-js/lib/providers/provider";
import { HereProviderError, HereProviderResult, HereProviderStatus } from "./provider";
import { HereAsyncOptions, HereCall } from "./types";
import { Action } from "./actions/types";

export const getDeviceId = () => {
  const topicId = window.localStorage.getItem("herewallet-topic") || uuid4();
  window.localStorage.setItem("herewallet-topic", topicId);
  return topicId;
};

export const isMobile = () => {
  return window.matchMedia("(any-pointer:coarse)").matches;
};

export const serializeActions = (actions: Action[]) => {
  return actions.map<Action>((act) => {
    if (act.type !== "FunctionCall") return act;
    let { args, deposit, gas, methodName } = act.params;

    if (ArrayBuffer.isView(args)) {
      args = Buffer.from(args.buffer, args.byteOffset, args.byteLength);
    }

    if (args instanceof Buffer) {
      args = args.toString("base64");
    }

    return {
      type: act.type,
      params: { args, deposit, gas, methodName },
    };
  });
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

export const internalThrow = (error: unknown, delegate: HereAsyncOptions) => {
  if (error instanceof HereProviderError) {
    throw error;
  }

  const result: HereProviderResult = {
    payload: error instanceof Error ? error.message : "UNKNOWN",
    status: HereProviderStatus.FAILED,
    account_id: "",
  };

  delegate.onFailed?.(result);
  delegate?.strategy?.onFailed?.(result);
  throw error;
};

export const isValidAccessKey = (accountId: string, accessKey: AccessKeyInfoView, call: HereCall) => {
  const { permission } = accessKey.access_key;
  if (permission === "FullAccess") {
    return true;
  }

  if (permission.FunctionCall) {
    const { receiver_id: allowedReceiverId, method_names: allowedMethods } = permission.FunctionCall;

    /********************************
    Accept multisig access keys and let wallets attempt to signAndSendTransaction
    If an access key has itself as receiverId and method permission add_request_and_confirm, then it is being used in a wallet with multisig contract: https://github.com/near/core-contracts/blob/671c05f09abecabe7a7e58efe942550a35fc3292/multisig/src/lib.rs#L149-L153
    ********************************/
    if (allowedReceiverId === accountId && allowedMethods.includes("add_request_and_confirm")) {
      return true;
    }

    if (allowedReceiverId === call.receiverId) {
      if (call.actions.length !== 1) return false;

      return call.actions.every((action) => {
        if (action.type !== "FunctionCall") return false;
        return (
          (!action.params.deposit || action.params.deposit.toString() === "0") &&
          (allowedMethods.length === 0 || allowedMethods.includes(action.params.methodName))
        );
      });
    }
  }

  return false;
};


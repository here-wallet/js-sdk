import uuid4 from "uuid4";
import { createRequest, getTransactionStatus, HereConfiguration } from "./utils";

export interface AsyncHereSignDelegate {
  forceRedirect?: boolean;
  onInitialized?: (link: string) => void;
  onApproving?: (link: string) => void;
}

export interface AsyncHereSignResult {
  public_key?: string;
  account_id: string;
  transaction_hash: string;
}

export const asyncHereSign = async (
  config: HereConfiguration,
  options: Record<string, string>,
  delegate: AsyncHereSignDelegate = {}
): Promise<AsyncHereSignResult> => {
  const requestId = uuid4();
  const deeplink = `${config.hereConnector}/approve?request_id=${requestId}`;
  await createRequest(config, requestId, options);

  const socketApi = config.hereApi.replace("https", "ws");
  const endpoint = `${socketApi}/api/v1/web/ws/transaction_approved/${requestId}`;
  const socket = new WebSocket(endpoint);
  let fallbackHttpTimer;

  delegate.onInitialized?.(deeplink);

  if (delegate.forceRedirect == null || delegate.forceRedirect === true) {
    const left = screen.width / 2 - 820 / 2;
    const top = screen.height / 2 - 560 / 2;
    window.open(deeplink, "_blank", `popup,height=560,width=820,left=${left},top=${top}`);
  }

  return new Promise((resolve, reject) => {
    const clear = () => {
      fallbackHttpTimer = -1;
      clearInterval(fallbackHttpTimer);
      socket.close();
    };

    const processApprove = (data) => {
      switch (data.status) {
        case 1:
          delegate.onApproving?.(deeplink);
          return;
        case 2:
          clear();
          reject(data);
          return;
        case 3:
          clear();
          resolve(data);
      }
    };

    const setupTimer = () => {
      if (fallbackHttpTimer === -1) return;
      fallbackHttpTimer = setTimeout(async () => {
        const data = await getTransactionStatus(config.hereApi, requestId).catch(() => {});
        if (fallbackHttpTimer === -1) return;
        processApprove(data);
        setupTimer();
      }, 2000);
    };

    // If socket disconnect with error, fallback to http
    socket.onerror = (e) => {
      if (fallbackHttpTimer != null) return;
      setupTimer();
    };

    socket.onmessage = (e) => {
      console.log(e);
      if (e.data == null) return;
      try {
        const data = JSON.parse(e.data);
        processApprove(data);
      } catch (e) {
        // backend return incorrect data = cancel signing
        reject(e);
        clear();
      }
    };
  });
};

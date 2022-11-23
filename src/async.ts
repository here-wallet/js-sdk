import uuid4 from "uuid4";
import { popupStrategy, Strategy } from "./strategy";
import { createRequest, getTransactionStatus, HereConfiguration, isMobile } from "./utils";

export interface AsyncHereSignDelegate {
  forceRedirect?: boolean;
  onInitialized?: (link: string) => void;
  onApproving?: (link: string) => void;
  strategy?: () => Strategy;
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

  const strategy = (delegate.strategy ?? popupStrategy)();
  const socketApi = config.hereApi.replace("https", "wss");
  const endpoint = `${socketApi}/api/v1/web/ws/transaction_approved/${requestId}`;
  const socket = new WebSocket(endpoint);
  let fallbackHttpTimer;

  delegate.onInitialized?.(deeplink);
  if (delegate.forceRedirect == null || delegate.forceRedirect === true) {
    strategy.onInitialized?.(deeplink);
  }

  return new Promise((resolve, reject) => {
    const clear = () => {
      fallbackHttpTimer = -1;
      clearInterval(fallbackHttpTimer);
      strategy.onCompleted?.();
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
      }, 3000);
    };

    setupTimer();

    socket.onmessage = (e) => {
      console.log("Message", e);
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

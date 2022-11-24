import uuid4 from "uuid4";
import { Strategy } from "./strategy";
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
  transaction_hash?: string;
  status: number;
}

export const asyncHereSign = async (
  config: HereConfiguration,
  options: Record<string, string>,
  delegate: AsyncHereSignDelegate = {},
  strategy: Strategy
): Promise<AsyncHereSignResult> => {
  const requestId = uuid4();
  const deeplink = `${config.hereConnector}/approve?request_id=${requestId}`;

  delegate.onInitialized?.(deeplink);
  if (delegate.forceRedirect == null || delegate.forceRedirect === true) {
    strategy.onInitialized?.(deeplink);
  }

  await createRequest(config, requestId, options);
  const socketApi = config.hereApi.replace("https", "wss");
  let fallbackHttpTimer: NodeJS.Timeout | number | null = null;

  return new Promise((resolve, reject) => {
    let socket: WebSocket | null = null;

    const clear = () => {
      fallbackHttpTimer = -1;
      clearInterval(fallbackHttpTimer);
      strategy.onCompleted?.();
      socket?.close();
    };

    const processApprove = (data: AsyncHereSignResult) => {
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
      if (fallbackHttpTimer === -1) {
        return;
      }

      fallbackHttpTimer = setTimeout(async () => {
        try {
          const data = await getTransactionStatus(config.hereApi, requestId);
          if (fallbackHttpTimer === -1) return;
          processApprove(data);
        } finally {
          setupTimer();
        }
      }, 3000);
    };

    setupTimer();

    // Mobile flow doesn't support cross tabs socket background process
    if (isMobile() === false) {
      const endpoint = `${socketApi}/api/v1/web/ws/transaction_approved/${requestId}`;
      socket = new WebSocket(endpoint);
      socket.onmessage = (e) => {
        if (e.data == null) return;

        try {
          const data = JSON.parse(e.data);
          processApprove(data);
        } catch (err) {
          // backend return incorrect data = cancel signing
          reject(err);
          clear();
        }
      };
    }
  });
};

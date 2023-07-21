import { HereProviderRequest, HereProviderResult } from "./provider";
import { HereStrategy } from "./types";

const createIframe = (widget: string) => {
  const connector = document.createElement("iframe");
  connector.src = widget;
  connector.style.border = "none";
  connector.style.zIndex = "10000";
  connector.style.position = "fixed";
  connector.style.display = "none";
  connector.style.top = "0";
  connector.style.left = "0";
  connector.style.width = "100%";
  connector.style.height = "100%";
  document.body.appendChild(connector);
  return connector;
};

export const defaultUrl = "https://my.herewallet.app/connector/index.html";

export class WidgetStrategy implements HereStrategy {
  private static connector?: HTMLIFrameElement;
  private static isLoaded = false;

  private messageHandler?: (event: MessageEvent) => void;
  readonly options: { lazy: boolean; widget: string };

  constructor(options: string | { lazy?: boolean; widget?: string } = { widget: defaultUrl, lazy: false }) {
    this.options = {
      lazy: typeof options === "object" ? options.lazy || false : false,
      widget: typeof options === "string" ? options : options.widget || defaultUrl,
    };

    if (!this.options.lazy) {
      this.initIframe();
    }
  }

  initIframe() {
    if (WidgetStrategy.connector == null) {
      WidgetStrategy.connector = createIframe(this.options.widget);
      WidgetStrategy.connector.addEventListener("load", () => {
        WidgetStrategy.isLoaded = true;
      });
    }

    return WidgetStrategy.connector;
  }

  onRequested(id: string, request: HereProviderRequest, reject: (p?: string) => void) {
    const iframe = this.initIframe();
    iframe.style.display = "block";

    const loadHandler = () => {
      WidgetStrategy.connector?.removeEventListener("load", loadHandler);
      WidgetStrategy.connector?.contentWindow?.postMessage(
        JSON.stringify({ type: "request", payload: { id, request } }),
        new URL(this.options.widget).origin
      );
    };

    if (WidgetStrategy.isLoaded) loadHandler();
    else iframe.addEventListener("load", loadHandler);

    this.messageHandler = (event: MessageEvent) => {
      try {
        if (event.origin !== new URL(this.options.widget).origin) return;
        if (JSON.parse(event.data).type === "reject") reject();
      } catch {}
    };

    window.addEventListener("message", this.messageHandler);
  }

  postMessage(data: object) {
    const iframe = this.initIframe();
    const args = JSON.stringify(data);
    const origin = new URL(this.options.widget).origin;
    iframe.contentWindow?.postMessage(args, origin);
  }

  onApproving() {
    this.postMessage({ type: "approving" });
  }

  onSuccess(request: HereProviderResult) {
    console.log(request);
    this.postMessage({ type: "result", payload: { request } });
    this.close();
  }

  onFailed(request: HereProviderResult) {
    this.postMessage({ type: "result", payload: { request } });
    this.close();
  }

  close() {
    if (this.messageHandler) {
      window.removeEventListener("message", this.messageHandler);
      this.messageHandler = undefined;
    }

    if (WidgetStrategy.connector) {
      WidgetStrategy.connector.style.display = "none";
    }
  }
}

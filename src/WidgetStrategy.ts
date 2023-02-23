import { HereProviderRequest } from "./provider";
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

export class WidgetStrategy implements HereStrategy {
  private static connector?: HTMLIFrameElement;
  private static isLoaded = false;

  private messageHandler?: (event: MessageEvent) => void;

  constructor(readonly widget = "https://my.herewallet.app/connector/index.html") {
    if (WidgetStrategy.connector == null) {
      WidgetStrategy.connector = createIframe(widget);
      WidgetStrategy.connector.addEventListener("load", () => {
        WidgetStrategy.isLoaded = true;
      });
    }
  }

  onRequested(id: string, request: HereProviderRequest, reject: (p?: string) => void) {
    if (WidgetStrategy.connector == null) return;
    WidgetStrategy.connector.style.display = "block";

    const loadHandler = () => {
      WidgetStrategy.connector?.removeEventListener("load", loadHandler);
      WidgetStrategy.connector?.contentWindow?.postMessage(
        JSON.stringify({ type: "request", payload: { id, request } }),
        new URL(this.widget).origin
      );
    };

    if (WidgetStrategy.isLoaded) loadHandler();
    else WidgetStrategy.connector.addEventListener("load", loadHandler);

    this.messageHandler = (event: MessageEvent) => {
      try {
        if (event.origin !== new URL(this.widget).origin) return;
        if (JSON.parse(event.data).type === "reject") reject();
      } catch {}
    };

    window.addEventListener("message", this.messageHandler);
  }

  onApproving() {
    if (WidgetStrategy.connector == null) return;
    WidgetStrategy.connector.contentWindow?.postMessage(
      JSON.stringify({ type: "approving" }),
      new URL(this.widget).origin
    );
  }

  onSuccess() {
    this.close();
  }

  onFailed() {
    this.close();
  }

  close() {
    if (this.messageHandler) {
      window.removeEventListener("message", this.messageHandler);
      this.messageHandler = undefined;
    }

    if (WidgetStrategy.connector != null) {
      WidgetStrategy.connector.style.display = "none";
    }
  }
}

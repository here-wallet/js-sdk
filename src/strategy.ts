import { HereProviderResult } from "./provider";

export interface HereStrategy {
  onInitialized?: () => void;
  onRequested?: (link: string, args: Record<string, string>, reject: (p?: string) => void) => void;
  onApproving?: (result: HereProviderResult) => void;
  onSuccess?: (result: HereProviderResult) => void;
  onFailed?: (result: HereProviderResult) => void;
}

export class DefaultStrategy implements HereStrategy {
  signWindow: Window | null = null;
  unloadHandler?: () => void;
  timerHandler?: NodeJS.Timeout;

  onInitialized() {
    const left = window.innerWidth / 2 - 420 / 2;
    const top = window.innerHeight / 2 - 700 / 2;
    this.signWindow = window.open("about:blank", "_blank", `popup=1,width=420,height=700,top=${top},left=${left}`);
  }

  onRequested(link: string, args: Record<string, string>, reject: (p?: string) => void) {
    if (this.signWindow == null) return;

    this.unloadHandler = () => this.signWindow?.close();
    window.addEventListener("beforeunload", this.unloadHandler);

    this.signWindow.location = link;
    this.timerHandler = setInterval(() => {
      if (this.signWindow?.closed) reject("CLOSED");
    }, 1000);
  }

  close() {
    clearInterval(this.timerHandler);
    this.signWindow?.close();
    if (this.unloadHandler) {
      window.removeEventListener("beforeunload", this.unloadHandler);
    }
  }

  onFailed = () => this.close();
  onSuccess = () => this.close();
}

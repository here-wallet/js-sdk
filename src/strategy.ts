import { HereProviderResult } from "./provider";

export interface Strategy {
  onInitialized?: () => void;
  onRequested?: (link: string, args: Record<string, string>) => void;
  onApproving?: (result: HereProviderResult) => void;
  onSuccess?: (result: HereProviderResult) => void;
  onFailed?: (result: HereProviderResult) => void;
}

export class DefaultStrategy implements Strategy {
  signWindow: Window | null = null;
  unloadHandler: () => void;

  onInitialized() {
    const left = window.innerWidth / 2 - 400 / 2;
    const top = window.innerHeight / 2 - 700 / 2 + 48;
    this.signWindow = window.open("about:blank", "_blank", `popup=1,width=420,height=700,top=${top},left=${left}`);
  }

  onRequested(link: string) {
    this.unloadHandler = () => this.signWindow?.close();
    window.addEventListener("beforeunload", this.unloadHandler);
    if (this.signWindow) {
      this.signWindow.location = link;
    }
  }

  close() {
    this.signWindow?.close();
    window.removeEventListener("beforeunload", this.unloadHandler);
  }

  onFailed = () => this.close();
  onSuccess = () => this.close();
}

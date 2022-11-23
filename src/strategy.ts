import { isMobile } from "./utils";

export interface Strategy {
  onInitialized?: (link: string) => void;
  onCompleted?: () => void;
}

export const popupStrategy = (): Strategy => {
  let signWindow: Window | null = null;
  let unloadHandler: () => void | null = null;

  return {
    onInitialized(link) {
      if (isMobile()) {
        window.location.href = link;
      } else {
        signWindow = window.open(link, "_blank");
        unloadHandler = () => signWindow?.close();
        window.addEventListener("beforeunload", unloadHandler);
      }
    },

    onCompleted() {
      signWindow?.close();
      window.removeEventListener("beforeunload", unloadHandler);
    },
  };
};

export const iframeStrategy = (): Strategy => {
  let iframe = document.createElement("iframe");

  return {
    onInitialized(link) {
      iframe.src = link;
      iframe.style.position = "fixed";
      iframe.style.left = "0";
      iframe.style.top = "0";
      iframe.style.border = "none";
      iframe.style.borderRadius = "0";
      iframe.style.width = "100vw";
      iframe.style.height = "100vh";
      document.body.appendChild(iframe);
    },

    onCompleted() {
      document.body.removeChild(iframe);
    },
  };
};

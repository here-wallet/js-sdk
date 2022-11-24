export interface Strategy {
  onInitialized?: (link: string) => void;
  onCompleted?: () => void;
}

export const popupStrategy = (): Strategy => {
  const left = window.innerWidth / 2 - 400 / 2;
  const top = window.innerHeight / 2 - 700 / 2 + 48;
  const signWindow = window.open("about:blank", "_blank", `popup=1,width=400,height=700,top=${top},left=${left}`);
  let unloadHandler: () => void;

  return {
    onInitialized(link) {
      unloadHandler = () => signWindow?.close();
      window.addEventListener("beforeunload", unloadHandler);
      if (signWindow) {
        signWindow.location = link;
      }
    },

    onCompleted() {
      signWindow?.close();
      window.removeEventListener("beforeunload", unloadHandler);
    },
  };
};

export const iframeStrategy = (): Strategy => {
  const iframe = document.createElement("iframe");

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

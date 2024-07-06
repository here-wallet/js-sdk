import uuid4 from "uuid4";
import { waitInjectedHereWallet } from "./helpers/waitInjected";

const promises: Record<string, any> = {};
const request = (type: string, args?: any) => {
  return new Promise((resolve, reject) => {
    const id = uuid4();
    window?.parent.postMessage({ type, id, args }, "*");
    promises[id] = { resolve, reject };
  });
};

const hereWalletProvider = {
  on() {},
  isHereWallet: true,
  isConnected: () => true,
  request: (data: any): Promise<any> => request("ethereum", data),
};

async function announceProvider() {
  if (typeof window === "undefined") return;
  const injected = await waitInjectedHereWallet;
  if (injected == null) return;

  window?.dispatchEvent(
    new CustomEvent("eip6963:announceProvider", {
      detail: Object.freeze({
        provider: hereWalletProvider,
        info: {
          uuid: uuid4(),
          name: "HERE Wallet",
          icon: "data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNTUwIiBoZWlnaHQ9IjU1MCIgdmlld0JveD0iMCAwIDU1MCA1NTAiIGZpbGw9Im5vbmUiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+CjxyZWN0IHdpZHRoPSI1NTAiIGhlaWdodD0iNTUwIiByeD0iMTIwIiBmaWxsPSIjRjNFQkVBIj48L3JlY3Q+CjxwYXRoIGZpbGwtcnVsZT0iZXZlbm9kZCIgY2xpcC1ydWxlPSJldmVub2RkIiBkPSJNMjcyLjA0NiAxODMuNTM4TDI5My43ODggMTQzTDMyMi4yODggMjM4LjVMMjc5LjU1OCAyMTkuMTgyTDI3Mi4wNDYgMTgzLjUzOFpNMTE4LjI4OCAyMjZMOTYuMTg0IDI2NS44NTdMMTYzLjc2OSAyOTguOTJMMjU2Ljc4OCAyOTIuNUwxMTguMjg4IDIyNlpNMTA1Ljk2OSAzMDEuMTU4TDg0IDM0MC44MDNMMjE4LjkzNyA0MDcuNzkxTDQ0My44MDcgMzk0LjE0MUw0NjUuNzc2IDM1NC40OTZMMjQwLjkwNiAzNjguMTQ3TDEwNS45NjkgMzAxLjE1OFoiIGZpbGw9IiMyQzMwMzQiPjwvcGF0aD4KPHBhdGggZD0iTTQ2NS43ODggMzU0LjVMMjQwLjk4MiAzNjguMTUzTDEwNC44ODcgMzAxLjAwNUwyNTIuMjU5IDI5Mi4wODhMMTE4LjI4OCAyMjZMMTg0LjA3NiAxNzAuMjgyTDMyMC41NDcgMjM3LjM5N0wyOTMuNzg5IDE0My4wMDFMNDI0LjE5NSAyMDYuOTQ5TDQ2NS43ODggMzU0LjVaIiBmaWxsPSIjRkRCRjFDIj48L3BhdGg+Cjwvc3ZnPg==",
          rdns: "app.herewallet.my",
        },
      }),
    })
  );
}

if (typeof window !== "undefined") {
  window?.addEventListener("message", (e) => {
    if (e.data.type !== "ethereum") return;
    if (e.data.isSuccess) return promises[e.data.id]?.resolve(e.data.result);
    promises[e.data.id]?.reject(e.data.result);
  });

  window?.addEventListener("eip6963:requestProvider", () => announceProvider());
  announceProvider();
}

export { hereWalletProvider };

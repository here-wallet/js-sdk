export type InjectedState = {
  ethAddress?: string;
  accountId: string;
  network: string;
  publicKey: string;
  telegramId: number;
};

export const waitInjectedHereWallet = new Promise<InjectedState | null>((resolve) => {
  if (typeof window === "undefined") return resolve(null);
  if (window?.self === window?.top) return resolve(null);

  const handler = (e: any) => {
    if (e.data.type !== "here-wallet-injected") return;
    window?.parent.postMessage("here-sdk-init", "*");
    window?.removeEventListener("message", handler);
    resolve({
      ethAddress: e.data.ethAddress,
      accountId: e.data.accountId,
      publicKey: e.data.publicKey,
      telegramId: e.data.telegramId,
      network: e.data.network || "mainnet",
    });
  };

  window?.addEventListener("message", handler);
  setTimeout(() => resolve(null), 2000);
});

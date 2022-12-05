import { WalletModuleFactory } from "@near-wallet-selector/core";
import { DefaultStrategy, Strategy } from "./strategy";
import { hereConfigurations, HereWallet } from "./state";
import { proxyProvider } from "./here-provider";
import { initHereWallet } from "./selector";
import icon from "./icon";

export { HereWallet } from "./state";
export { DefaultStrategy, Strategy } from "./strategy";

export function setupHereWallet({
  deprecated = false,
  iconUrl = icon,
  strategy = (): Strategy => new DefaultStrategy(),
  hereProvider = proxyProvider,
} = {}): WalletModuleFactory<HereWallet> {
  return async ({ options }) => {
    const configuration = hereConfigurations[options.network.networkId];
    if (configuration == null) {
      return null;
    }

    return {
      id: "here-wallet",
      type: "injected",
      metadata: {
        name: "Here Wallet (mobile)",
        description: "Mobile wallet for NEAR Protocol",
        downloadUrl: configuration.download,
        iconUrl,
        deprecated,
        available: true,
      },
      init: (config) => initHereWallet({ ...config, configuration, strategy, hereProvider }),
    };
  };
}

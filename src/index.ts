import { WalletModuleFactory } from "@near-wallet-selector/core";
import { DefaultStrategy, Strategy } from "./strategy";
import { hereConfigurations, HereWallet } from "./state";
import { legacyProvider } from "./legacy-provider";
import { proxyProvider } from "./here-provider";
import { initHereWallet } from "./selector";
import icon from "./icon";

export { icon };
export { HereWallet } from "./state";
export { DefaultStrategy, Strategy } from "./strategy";
export { HereProvider, HereProviderOptions, HereProviderResult, HereProviderStatus } from "./provider";

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

    if (options.network.networkId === "testnet") {
      hereProvider = legacyProvider;
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

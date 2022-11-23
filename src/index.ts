import { WalletModuleFactory } from "@near-wallet-selector/core";
import { HereWallet, initHereWallet } from "./selector";
import { hereConfigurations } from "./utils";
export { HereWallet } from "./selector";
import icon from "./icon";

export function setupHereWallet({ deprecated = false, iconUrl = icon } = {}): WalletModuleFactory<HereWallet> {
  return async ({ options }) => {
    const configuration = hereConfigurations[options.network.networkId];
    if (configuration == null) {
      return null;
    }

    return {
      id: "here-wallet",
      type: "browser",
      metadata: {
        name: "Here Wallet (mobile)",
        description: "Mobile wallet for NEAR Protocol",
        iconUrl,
        deprecated,
        available: true,
      },
      init: (config) => initHereWallet({ ...config, configuration }),
    };
  };
}

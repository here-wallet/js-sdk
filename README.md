# @herewallet/connect

```bash
npm i near-api-js@^0.44.2
npm i @near-wallet-selector/core --save
npm i @here-wallet/near-selector --save
```

## Usage

```ts
import "@near-wallet-selector/modal-ui/styles.css";
import { setupWalletSelector } from "@near-wallet-selector/core";
import { setupNearWallet } from "@near-wallet-selector/near-wallet";
import { setupModal } from "@near-wallet-selector/modal-ui";
import { HereWallet, setupHereWallet } from "@here-wallet/near-selector";

const selector = await setupWalletSelector({
  modules: [setupNearWallet(), setupHereWallet()],
  network: "mainnet",
});

// Instant wallet signin HERE!
const here = await selector.wallet<HereWallet>("here-wallet");

if (!selector.isSignedIn()) {
  await here.signIn({
    contractId: "social.near",
    onApproving: () => console.log("Approving!..."),
    onInitialized: (link) => QRCode.toCanvas(uikit.qrcode, link)
  });
}
```

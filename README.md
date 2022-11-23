# @herewallet/near-selector

This library allows you to interact asynchronously with the here-wallet together with the near-selector.

In contrast to the synchronous signing of transactions in MyNearWallet and official near wallet, where the user is redirected to the wallet site for signing -- *HERE Wallet* provides the ability to sign transactions using async/await API calls.

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

// Force login with here-wallet easy!
const here = await selector.wallet<HereWallet>("here-wallet");
const accounts = await here.signIn({ contractId: "social.near" });

console.log(`Hello ${accounts[0].accountId}!`);
```

## How it works

By default, all near-selector api calls that you make with this library run a background process and generate a unique link that the user can go to their mobile wallet and confirm the transaction.

This is a link of the form:
https://web.herewallet.app/approve?request_id=UUID4
or direct link with custom url schema:
herewallet://web.herewallet.app/approve?request_id=UUID4

If a user has logged into your application from a phone and has a wallet installed, we immediately transfer him to the application for signing.

In all other cases, we open a new window on the web.herewallet.app site, where the user can find information about installing the wallet and sign the transaction there.

All this time while user signing the transaction, a background process in your application will monitor the status of the transaction requested for signing.


## Instant Wallet with AppClip

If your goal is to provide the user with a convenient way to log in to your desktop app, you can use Here Instant Wallet, which allows users without a wallet to instantly create one via appclip.

> At the moment here wallet is only available for IOS users

You have the option to override how your user is delivered the signing link.
This is how you can create a long-lived transaction signature request and render it on your web page:

```ts
import QRCode from "qrcode";

const result = await here.signAndSendTransaction({
  receiverId: "social.near",
  actions: [...],

  forceRedirect: false, // Disable default behaviour
  onInitialized: (link) => QRCode.toCanvas(document.getElementById("qrcode"), link);
  onApproving: () => console.log("The user pressed the approve button in the wallet!")
});

```

You can also look at an example in this repository /example/index.ts

## Async Methods

Methods **signIn**, **signAndSendTransaction**, **signAndSendTransactions** have additional parameters:

```ts
export interface AsyncHereSignDelegate {
  // If false, then the library will not try to redirect the user to the wallet
  forceRedirect?: boolean;

  // Called after the signing link is generated
  onInitialized?: (link: string) => void;

  // Will be called when the user presses the confirmation button in their wallet.
  // This can help make your interface more responsive, 
  // for example you can add a loading animation until the transaction is completed
  onApproving?: (link: string) => void;
}
```

## Near Selector 

This library was created to speed up development, the most stable version of this module will be available in the official @near-selector/here-wallet library in the future!

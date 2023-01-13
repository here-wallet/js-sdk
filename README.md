# @herewallet/core

In contrast to the synchronous signing of transactions in web near wallets, where the user is redirected to the wallet site for signing -- **HERE Wallet** provides the ability to sign transactions using async/await API calls.

```bash
npm i near-api-js@^0.44.2 --save
npm i @here-wallet/core --save
```

## Usage

```ts
import { HereWallet } from "@here-wallet/core";
const here = new HereWallet()
const account = await here.signIn({ contractId: "social.near" });
console.log(`Hello ${account}!`);
```

**You can also login to the wallet without adding a key. For this you can call `signIn` without `contractId`**

## How it works

By default, all near-selector api calls that you make with this library run a background process and generate a unique link that the user can go to their mobile wallet and confirm the transaction. This is a link of the form: https://h4n.app/TRX_PART_OF_SHA1_IN_BASE64

If a user has logged into your application from a phone and has a wallet installed, we immediately transfer him to the application for signing. In all other cases, we open a new window on the web.herewallet.app site, where the user can find information about installing the wallet and sign the transaction there.

All this time while user signing the transaction, a background process in your application will monitor the status of the transaction requested for signing.

## Instant Wallet with AppClip

If your goal is to provide the user with a convenient way to log in to your desktop app, you can use Here Instant Wallet, which allows users without a wallet to instantly create one via appclip.

> At the moment here wallet is only available for IOS users

You have the option to override how your user is delivered the signing link.
This is how you can create a long-lived transaction signature request and render it on your web page:

```ts
import { HereStrategy, HereWallet } from "@here-wallet/core";
import { QRCodeStrategy } from "@here-wallet/core/qrcode-strategy";

const putQrcode = document.getElementById("qr-container")

// Instant wallet signin HERE!
const here = new HereWallet()
await here.signIn({
  contractId: "social.near",

  // override new window
  strategy: new QRCodeStrategy({ 
    element: putQrcode, 
    theme: 'dark', 
    size: 128 
  }),
});
```

You can also look at an example in this repository /example/index.ts or in sandbox:
https://codesandbox.io/s/here-wallet-instant-app-6msgmn

## Sign in is optional!

You can generate a signing transaction without knowing your user's accountId (without calling signIn).
There are cases when you do not need to receive a public key from the user to call your contract, but you want to ask the user to perform an action in your application once:

```ts
import { HereWallet } from "@here-wallet/core";
const here = new HereWallet()
const tx = await here.signAndSendTransaction({
  receiverId: "donate.near",
  actions: [{ type: "FunctionCall", params: { deposit: 1000 }}]
});

console.log("Thanks for the donation!")
```

## Login without AddKey
In order to use the wallet for authorization on the backend, you need to use the signMessage method.
This method signs your message with a private full access key inside the wallet. You can also use this just to securely get your user's accountId without any extra transactions.

```ts
import { HereWallet } from "@here-wallet/core";
const here = new HereWallet()
const { signature, message, publicKey, accountId } = await here.signMessage({
  message: 'Auth message', // some useful information for the user about the service he is accessing
  receiver: 'google.com', // displayed in the wallet as the recipient of the signature
});

const accessToken = await postToYourBackend({ signature, accountId, message, publicKey })
console.log("Auth completed!")
```

If you use js-sdk on your backend, then you do not need to additionally check the signature and key, the library does this, and if the signature is invalid or the key is not a full access key, then the method returns an error.
Otherwise, on the backend, you need to verify the signature and message with this public key. And also check that this public key is the full access key for this accountId.

**It's important to understand** that the returned message is not the same as the message you submitted for signature.
This message conforms to the standard: https://github.com/near/NEPs/pull/413

## Strategy and Events

Methods **signIn**, **signAndSendTransaction**, **signAndSendTransactions** have additional parameters:

```ts
export interface HereOptions {
  // DefaultStrategy by default called new window popup, you can override it
  strategy?: Strategy;
  signal?: AbortSignal;

  // Just Events, called before strategy,
  // use this if you don't need to change strategy
  onInitialized?: () => void;
  onRequested?: (request: HereProviderRequest) => void;
  onApproving?: (result: HereProviderResult) => void;
  onSuccess?: (result: HereProviderResult) => void;
  onFailed?: (result: HereProviderResult) => void;
}
```

You can also set the default strategy for `setupHereWallet`:

```ts
import { HereStrategy, HereWallet } from "@here-wallet/core";
class CustomStrategy implements HereStrategy {}
new HereWallet({ defaultStrategy: () => new CustomStrategy() });
```

## Security

To transfer data between the application and the phone, we use our own proxy service.
On the client side, a transaction confirmation request is generated with a unique request_id, our wallet receives this request_id and requests this transaction from the proxy.

**To make sure that the transaction was not forged by the proxy service, the link that opens inside the application contains a hash-sum of the transaction. If the hashes do not match, the wallet will automatically reject the signing request**

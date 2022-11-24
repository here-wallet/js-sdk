import QRCode from "qrcode";
import "@near-wallet-selector/modal-ui-js/styles.css";

import { setupWalletSelector } from "@near-wallet-selector/core";
import { setupNearWallet } from "@near-wallet-selector/near-wallet";
import { setupModal } from "@near-wallet-selector/modal-ui-js";
import { HereWallet, setupHereWallet } from "../src/index";

const uikit = {
  connectBtn: document.getElementById("connect")!,
  qrcode: document.getElementById("qrcode")!,
  account: document.getElementById("account-id")!,
  fnCallBtn: document.getElementById("function-call"),
};

const setup = async () => {
  const selector = await setupWalletSelector({
    modules: [setupNearWallet(), setupHereWallet()],
    network: "mainnet",
  });

  const modal = setupModal(selector, { contractId: "social.near" });
  uikit.connectBtn.onclick = () => {
    selector.isSignedIn() ? selector.wallet().then((w) => w.signOut()) : modal.show();
  };

  selector.on("signedIn", (data) => {
    uikit.account.innerHTML = `Hello ${data.accounts[0]?.accountId}!`;
  });

  // Instant wallet signin HERE!
  const here = await selector.wallet<HereWallet>("here-wallet");

  if (!selector.isSignedIn()) {
    await here.signIn({
      contractId: "social.near",

      forceRedirect: false,
      onApproving: () => console.log("Approving!..."),
      onInitialized: (link) => {
        console.log("asyncSignIn", link);
        QRCode.toCanvas(uikit.qrcode, link);
      },
    });
  }

  const accounts = await here.getAccounts();
  const nick = accounts[0]?.accountId;
  uikit.account.innerHTML = `Hello ${accounts[0]?.accountId}!`;

  uikit.fnCallBtn?.addEventListener("click", async () => {
    const result = await here.signAndSendTransaction({
      receiverId: "social.near",
      actions: [
        {
          type: "FunctionCall",
          params: {
            methodName: "set",
            args: { data: { [nick]: { profile: { hereUser: "yes" } } } },
            gas: "30000000000000",
            deposit: "1",
          },
        },
      ],
    });

    console.log(result);
  });
};

setup();

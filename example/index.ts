import QRCode from "qrcode";
import "@near-wallet-selector/modal-ui-js/styles.css";

import { setupWalletSelector, WalletSelector } from "@near-wallet-selector/core";
import { setupNearWallet } from "@near-wallet-selector/near-wallet";
import { setupModal } from "@near-wallet-selector/modal-ui-js";
import { Strategy, HereWallet, setupHereWallet } from "../src/index";

const uikit = {
  connectBtn: document.getElementById("connect")!,
  qrcode: document.getElementById("qrcode")!,
  account: document.getElementById("account-id")!,
  fnCallBtn: document.getElementById("function-call")!,

  loginState(name) {
    uikit.account.innerHTML = `Hello ${name}!`;
    uikit.connectBtn.innerHTML = "Logout";
    uikit.fnCallBtn.style.display = "block";
    uikit.qrcode.style.display = "none";
  },

  logoutState() {
    uikit.account.innerHTML = `Scan QR to sigin with AppClip!`;
    uikit.connectBtn.innerHTML = "Or just use Near Selector";
    uikit.fnCallBtn.style.display = "none";
  },
};

class QRCodeStrategy implements Strategy {
  onRequested(link) {
    console.log("asyncSignIn", link);
    QRCode.toCanvas(uikit.qrcode, link);
    uikit.qrcode.style.display = "block";
  }

  onSucessed() {
    uikit.qrcode.style.display = "none";
  }
}

// Instant wallet signin HERE!
const instantSignin = async (selector: WalletSelector) => {
  const here = await selector.wallet<HereWallet>("here-wallet");
  await here.signIn({
    contractId: "social.near",
    strategy: new QRCodeStrategy(), // override new window
  });
};

const initializeSelector = async () => {
  const selector = await setupWalletSelector({
    modules: [setupNearWallet(), setupHereWallet()],
    network: "mainnet",
  });

  const modal = setupModal(selector, { contractId: "social.near" });
  selector.on("signedIn", (data) => uikit.loginState(data.accounts[0].accountId));
  selector.on("signedOut", () => {
    instantSignin(selector);
    uikit.logoutState();
  });

  if (selector.isSignedIn()) {
    const wallet = await selector.wallet();
    const [{ accountId }] = await wallet.getAccounts();
    uikit.loginState(accountId);
  } else {
    uikit.logoutState();
    instantSignin(selector);
  }

  uikit.connectBtn.onclick = async () => {
    if (selector.isSignedIn() == false) return modal.show();
    const wallet = await selector.wallet();
    await wallet.signOut();
  };

  return { modal, selector };
};

const main = async () => {
  const { selector } = await initializeSelector();
  uikit.fnCallBtn?.addEventListener("click", async () => {
    const here = await selector.wallet<HereWallet>("here-wallet");
    const [{ accountId }] = await here.getAccounts();
    const result = await here.signAndSendTransaction({
      receiverId: "social.near",
      actions: [
        {
          type: "FunctionCall",
          params: {
            methodName: "set",
            args: { data: { [accountId]: { profile: { hereUser: "yes" } } } },
            gas: "30000000000000",
            deposit: "1",
          },
        },
      ],
    });

    console.log(result);
  });
};

main();
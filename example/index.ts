import { QRCodeStrategy } from "../src/qrcode-strategy";
import { HereWallet } from "../src";

const delay = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

const uikit = {
  connectBtn: document.getElementById("connect")!,
  qrcode: document.getElementById("qrcode")!,
  account: document.getElementById("account-id")!,
  fnCallBtn: document.getElementById("function-call")!,
  verifyBtn: document.getElementById("verify-connect")!,

  loginState(name) {
    uikit.account.innerHTML = `Hello ${name}!`;
    uikit.connectBtn.innerHTML = "Logout";
    uikit.fnCallBtn.style.display = "block";
    uikit.qrcode.style.display = "none";
    uikit.qrcode.innerHTML = "";
  },

  logoutState() {
    uikit.account.innerHTML = `Scan QR to sigin with AppClip!`;
    uikit.connectBtn.innerHTML = "Connect HERE Wallet";
    uikit.fnCallBtn.style.display = "none";
    uikit.qrcode.style.display = "block";
  },
};

// Instant wallet signin HERE!
const instantSignin = async (here) => {
  class MyQrCodeStrategy extends QRCodeStrategy {
    async onApproving(r) {
      console.log("onApproving", r);
    }

    async onSuccess(r) {
      await super.onSuccess(r);
      console.log("onSuccess", r);
    }

    async onFailed(r) {
      await super.onFailed(r);
      console.log("onFailed");
      await delay(3000);
      await instantSignin(this.wallet);
    }
  }

  const account = await here.signIn({
    strategy: new MyQrCodeStrategy({ element: uikit.qrcode }),
    contractId: "social.near",
  });

  uikit.loginState(account);
};

const main = async () => {
  const here = await HereWallet.connect({
    botId: "HOTExampleConnectBot/app",
    walletId: "herewalletbot/beta",
  });

  if (await here.isSignedIn()) {
    uikit.loginState(await here.getAccountId());
  } else {
    uikit.logoutState();
    instantSignin(here);
  }

  uikit.verifyBtn.onclick = async () => {
    const signed = await here.authenticate();
    alert("Signed by " + signed.accountId);
  };

  uikit.connectBtn.onclick = async () => {
    if (await here.isSignedIn()) {
      here.signOut();
      uikit.logoutState();
      await instantSignin(here);
      return;
    }

    const account = await here.signIn({ contractId: "social.near" });
    uikit.loginState(account);
  };

  uikit.fnCallBtn?.addEventListener("click", async () => {
    const account = await here.getAccountId();
    const result = await here.signAndSendTransactions({
      callbackUrl: "/success",
      transactions: [
        {
          receiverId: "social.near",
          actions: [
            {
              type: "FunctionCall",
              params: {
                methodName: "set",
                args: { data: { [account]: { profile: { hereUser: "yes" } } } },
                gas: "30000000000000",
                deposit: "1",
              },
            },
          ],
        },
      ],
    });

    console.log(result);
  });
};

main();

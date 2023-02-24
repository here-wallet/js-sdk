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
const instantSignin = async (here: HereWallet) => {
  const account = await here.signIn({
    contractId: "social.near",
    strategy: new QRCodeStrategy({ element: uikit.qrcode }), // override new window
    onApproving: (r) => console.log("onApproving", r),
    onSuccess: (r) => console.log("onSuccess", r),
    onFailed: async (r) => {
      console.log("onFailed");
      await delay(3000);
      await instantSignin(here);
    },
  });
  uikit.loginState(account);
};

const main = async () => {
  const here = new HereWallet();

  if (await here.isSignedIn()) {
    uikit.loginState(await here.getAccountId());
  } else {
    uikit.logoutState();
    instantSignin(here);
  }

  uikit.verifyBtn.onclick = async () => {
    const { accountId } = await here.signMessage({ receiver: "HERE Example", message: "auth" });
    alert("Signed by " + accountId);
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
        {
          receiverId: "usn",
          actions: [
            {
              type: "FunctionCall",
              params: {
                methodName: "transfer",
                args: { amount: "10000000000000" },
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

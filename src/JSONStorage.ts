import { waitInjectedHereWallet } from "./here-provider";

export interface HereJsonStorage {
  setState(network: string, state: AuthState): Promise<void>;
  getFullState(): Promise<Record<string, AuthState>>;
  getState(network: string): Promise<AuthState>;
  clear(): Promise<void>;
}

export interface AuthState {
  activeAccount: string | null;
  accounts: Record<string, string>;
}

export class StateStorage implements HereJsonStorage {
  private readonly dataKey = `herewallet:keystore`;

  constructor() {
    waitInjectedHereWallet.then((injected) => {
      if (!injected) return;
      this.setState(injected.network, {
        accounts: { [injected.accountId]: injected.publicKey },
        activeAccount: injected.accountId,
      });
    });
  }

  async setState(network: string, state: AuthState) {
    await waitInjectedHereWallet;
    const data = await this.getFullState();
    data[network] = state;
    window.localStorage.setItem(this.dataKey, JSON.stringify(data));
  }

  async getFullState(): Promise<Record<string, AuthState>> {
    await waitInjectedHereWallet;
    try {
      return JSON.parse(window.localStorage.getItem(this.dataKey)!) || {};
    } catch {
      return {};
    }
  }

  async getState(network: string): Promise<AuthState> {
    await waitInjectedHereWallet;
    const json = await this.getFullState();
    return json[network] || { activeAccount: null, accounts: {} };
  }

  async clear() {
    window.localStorage.removeItem(this.dataKey);
  }
}

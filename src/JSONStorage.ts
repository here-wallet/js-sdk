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

  async setState(network: string, state: AuthState) {
    const data = await this.getFullState();
    data[network] = state;
    window.localStorage.setItem(this.dataKey, JSON.stringify(data));
  }

  async getFullState(): Promise<Record<string, AuthState>> {
    try {
      return JSON.parse(window.localStorage.getItem(this.dataKey)!) || {};
    } catch {
      return {};
    }
  }

  async getState(network: string): Promise<AuthState> {
    const json = await this.getFullState();
    return json[network] || { activeAccount: null, accounts: {} };
  }

  async clear() {
    window.localStorage.removeItem(this.dataKey);
  }
}

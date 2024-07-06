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

const mockStorage = {
  getItem(k: string): string | undefined | null {
    return null;
  },

  setItem(k: string, v: any) {},
  removeItem(k: string) {},
};

export class StateStorage implements HereJsonStorage {
  private readonly dataKey = `herewallet:keystore`;
  private readonly storage = typeof window !== "undefined" ? window.localStorage : mockStorage;
  constructor() {}

  async setState(network: string, state: AuthState) {
    const data = await this.getFullState();
    data[network] = state;
    this.storage.setItem(this.dataKey, JSON.stringify(data));
  }

  async getFullState(): Promise<Record<string, AuthState>> {
    try {
      return JSON.parse(this.storage.getItem(this.dataKey)!) || {};
    } catch {
      return {};
    }
  }

  async getState(network: string): Promise<AuthState> {
    const json = await this.getFullState();
    return json[network] || { activeAccount: null, accounts: {} };
  }

  async clear() {
    this.storage.removeItem(this.dataKey);
  }
}

import { KeyStore } from "near-api-js/lib/key_stores";
import { KeyPair, KeyPairEd25519 } from "near-api-js/lib/utils/key_pair";
import { HereJsonStorage, StateStorage } from "./JSONStorage";

export interface HereAuthStorage extends KeyStore {
  setActiveAccount(network: string, id: string): Promise<void>;
  getActiveAccount(network: string): Promise<string | null>;
}

export class HereKeyStore implements HereAuthStorage {
  constructor(private storage: HereJsonStorage = new StateStorage()) {}

  async setActiveAccount(network: string, id: string) {
    const state = await this.storage.getState(network);
    state.activeAccount = id;
    this.storage.setState(network, state);
  }

  async setKey(networkId: string, accountId: string, keyPair: KeyPair) {
    const state = await this.storage.getState(networkId);
    state.accounts[accountId] = keyPair.toString();
    this.storage.setState(networkId, state);
  }

  async getAccounts(network: string) {
    const state = await this.storage.getState(network);
    return Object.keys(state.accounts);
  }

  async getActiveAccount(network: string) {
    const state = await this.storage.getState(network);
    return state.activeAccount;
  }

  async getKey(networkId: string, accountId: string) {
    const state = await this.storage.getState(networkId);
    const privateKey = state.accounts[accountId];
    if (privateKey == null) throw Error(`For ${accountId} in ${networkId} network key not found`);
    const keyPair = KeyPairEd25519.fromString(privateKey);
    return keyPair;
  }

  async removeKey(networkId: string, accountId: string) {
    let state = await this.storage.getState(networkId);
    if (state.activeAccount === accountId) {
      state.activeAccount = null;
    }

    delete state.accounts[accountId];
    this.storage.setState(networkId, state);
  }

  async getNetworks() {
    let state = await this.storage.getFullState();
    return Object.keys(state.accounts);
  }

  async clear() {
    await this.storage.clear();
  }
}

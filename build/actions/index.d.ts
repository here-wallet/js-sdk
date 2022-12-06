import { transactions } from "near-api-js";
import { Action } from "./types";
export declare const createAction: (action: Action) => transactions.Action;

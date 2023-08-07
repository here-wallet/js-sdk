import * as borsh from "borsh";
import js_sha256 from "js-sha256";
import { PublicKey } from "near-api-js/lib/utils";
import { SignedMessageNEP0413, SignMessageOptionsNEP0413 } from "./types";

export class AuthPayload implements SignMessageOptionsNEP0413 {
  readonly message: string;
  readonly recipient: string;
  readonly nonce: Buffer;
  readonly callbackUrl?: string | undefined;
  readonly tag: number;

  constructor({ message, nonce, recipient, callbackUrl }: SignMessageOptionsNEP0413) {
    this.tag = 2147484061;
    this.message = message;
    this.nonce = nonce;
    this.recipient = recipient;
    if (callbackUrl) {
      this.callbackUrl = callbackUrl;
    }
  }
}

export const authPayloadSchema = new Map([
  [
    AuthPayload,
    {
      kind: "struct",
      fields: [
        ["tag", "u32"],
        ["message", "string"],
        ["nonce", [32]],
        ["recipient", "string"],
        ["callbackUrl", { kind: "option", type: "string" }],
      ],
    },
  ],
]);

export function verifySignature(request: SignMessageOptionsNEP0413, result: SignedMessageNEP0413) {
  // Reconstruct the payload that was **actually signed**
  const payload = new AuthPayload(request);
  const borsh_payload = borsh.serialize(authPayloadSchema, payload);
  const to_sign = Uint8Array.from(js_sha256.sha256.array(borsh_payload));

  // Reconstruct the signature from the parameter given in the URL
  let real_signature = new Uint8Array(Buffer.from(result.signature, "base64"));

  // Use the public Key to verify that the private-counterpart signed the message
  const myPK = PublicKey.from(result.publicKey);
  return myPK.verify(to_sign, real_signature);
}

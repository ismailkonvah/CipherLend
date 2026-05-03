import { sha256 } from "@noble/hashes/sha2";
import { sha3_256 } from "@noble/hashes/sha3";

type HashName = "sha256" | "sha3-256";

class BrowserHash {
  private chunks: Uint8Array[] = [];

  constructor(private readonly algorithm: HashName) {}

  update(data: Uint8Array | string) {
    this.chunks.push(typeof data === "string" ? new TextEncoder().encode(data) : data);
    return this;
  }

  digest() {
    const size = this.chunks.reduce((total, chunk) => total + chunk.length, 0);
    const bytes = new Uint8Array(size);
    let offset = 0;
    for (const chunk of this.chunks) {
      bytes.set(chunk, offset);
      offset += chunk.length;
    }

    return this.algorithm === "sha3-256" ? sha3_256(bytes) : sha256(bytes);
  }
}

export function randomBytes(length: number) {
  const bytes = new Uint8Array(length);
  crypto.getRandomValues(bytes);
  return bytes;
}

export function createHash(algorithm: HashName) {
  if (algorithm !== "sha256" && algorithm !== "sha3-256") {
    throw new Error(`Unsupported browser hash algorithm: ${algorithm}`);
  }
  return new BrowserHash(algorithm);
}

export function createCipheriv() {
  throw new Error("Node createCipheriv is not available in the browser bundle.");
}

export function createDecipheriv() {
  throw new Error("Node createDecipheriv is not available in the browser bundle.");
}

import { Buffer as NodeBuffer } from "buffer";

if (!globalThis.Buffer) {
  globalThis.Buffer = NodeBuffer;
}

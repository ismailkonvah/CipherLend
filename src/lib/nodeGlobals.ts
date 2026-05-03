if (typeof window !== "undefined" && !globalThis.Buffer) {
  void import("buffer").then(({ Buffer }) => {
    if (!globalThis.Buffer) {
      globalThis.Buffer = Buffer;
    }
  });
}

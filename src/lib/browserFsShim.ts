export function readFileSync() {
  throw new Error("fs.readFileSync is not available in the browser bundle.");
}

export default {
  readFileSync,
};

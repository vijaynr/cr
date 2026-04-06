// Stub for electrobun's three.js dependency — electrobun ships raw .ts
// that imports 'three' but we don't need the types.
declare module "three" {
  // biome-ignore lint/suspicious/noExplicitAny: stub module declaration for electrobun dependency
  const _: any
  export = _
  export default _
}

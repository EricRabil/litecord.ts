export function extractKeyValue(obj: object, value: string) {
  return Object.keys(obj)[Object.values(obj).indexOf(value)];
}

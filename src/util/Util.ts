/* tslint:disable:max-line-length */
import * as util from "util";
import * as zlib from "zlib";

export function extractKeyValue(obj: object, value: string) {
  return Object.keys(obj)[Object.values(obj).indexOf(value)];
}

/* tslint:disable:max-line-length interface-name */
import {Document} from "mongoose";
import * as util from "util";
import * as zlib from "zlib";
import {User} from "./schema/User";

export function extractKeyValue(obj: object, value: string) {
  return Object.keys(obj)[Object.values(obj).indexOf(value)];
}

export interface DiscordRequest extends Request {
  body: {[key: string]: any};
  user?: (User & Document);
}

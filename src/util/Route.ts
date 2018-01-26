import * as express from "express";
import {DiscordRequest, DiscordResponse} from "./Util";

export type RequestMethod = "get" | "post" | "options" | "patch" | "delete";
export type RouteGuard = (req: DiscordRequest, res: DiscordResponse, data: {[key: string]: any}, next: () => void) => Promise<void> | void;

export default interface IRoute {
  requestMethod: RequestMethod;
  path: string;
  requiresAuthorization?: true;
  guard?: RouteGuard | RouteGuard[];
  requestHandler(req: DiscordRequest, res: DiscordResponse, data: {[key: string]: any}): Promise<void> | void;
}

import * as express from "express";
import {DiscordRequest} from "./Util";

export type RequestMethod = "get" | "post" | "options" | "patch" | "delete";

export default interface IRoute {
  requestMethod: RequestMethod;
  path: string;
  requiresAuthorization?: true;
  requestHandler(req: DiscordRequest, res: express.Response, next: express.NextFunction): void;
}

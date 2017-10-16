import * as express from "express";
import {DiscordRequest} from "./Util";

export default interface IRoute {
  requestMethod: "get" | "post" | "options" | "patch" | "delete";
  path: string;
  requiresAuthorization?: true;
  requestHandler(req: DiscordRequest, res: express.Response, next: express.NextFunction): void;
}

import * as express from "express";
import Server from "../../../server";
import Route from "../../../util/Route";
import {DiscordRequest} from "../../../util/Util";

export default class Login implements Route {

  public requestMethod: "get" = "get";
  public path: string = "/api/v6/users/@me";
  public requiresAuthorization: true = true;

  public constructor(private server: Server) {}

  public async requestHandler(req: DiscordRequest, res: express.Response): Promise<void> {
    if (!req.user) {
      return Server.errorEmitter.send(res, Server.errorCodes.BAD_REQUEST);
    }
    res.json(await req.user.toUserObject());
  }
}

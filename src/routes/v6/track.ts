import * as express from "express";
import Server from "../../server";
import Route from "../../util/Route";
import {DiscordRequest} from "../../util/Util";

export default class Login implements Route {

  public requestMethod: "post" = "post";
  public path: string = "/api/v6/track";

  public constructor(private server: Server) {}

  public requestHandler(req: DiscordRequest, res: express.Response): void {
    res.end();
  }
}

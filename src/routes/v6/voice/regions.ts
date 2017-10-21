import * as express from "express";
import Server from "../../../server";
import Route from "../../../util/Route";
import {DiscordRequest} from "../../../util/Util";

export default class Login implements Route {

  public requestMethod: "get" = "get";
  public path: string = "/api/v6/voice/regions";

  public constructor(private server: Server) {}

  public requestHandler(req: DiscordRequest, res: express.Response): void {
    res.json([{
      custom: false,
      deprecated: false,
      id: "bitch",
      name: "hell",
      optimal: true,
      sample_hostname: "dicklords.net",
      sample_port: 6969,
      vip: false,
    }]);
  }
}

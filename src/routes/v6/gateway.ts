import * as express from "express";
import Server from "../../server";
import Route from "../../util/Route";

export default class Login implements Route {

  public requestMethod: "get" = "get";
  public path: string = "/api/v6/gateway";

  public constructor(private server: Server) {}

  public requestHandler(): express.RequestHandler {
    return (req: express.Request, res: express.Response) => {
      res.send({url: this.server.gatewayURL});
    };
  }
}

import * as express from "express";
import Server from "../../../../server";
import Route, {RouteGuard} from "../../../../util/Route";
import {DiscordRequest} from "../../../../util/Util";
import * as Guards from "./guards";
import { DiscordChannel, Permissions } from "../../../../util/Constants";

export default class Guilds implements Route {

  public requestMethod: "get" = "get";
  public path: string = "/api/v6/channels/:channel_id/messages";
  public requiresAuthorization: true = true;
  public guard = [Guards.InChannelGuard, Guards.HasPermission(Permissions.READ_MESSAGES)];

  public constructor(private server: Server) {}

  public async requestHandler(req: DiscordRequest, res: express.Response, data: any): Promise<void> {
    const channel: DiscordChannel = data.channel;
    const limit = !!req.query.limit ? Number.parseInt(req.query.limit as string) || 50 : 50;
    res.json((await channel.getMessageObjects({author: {more: false}, before: req.query.before, limit})));
    return;
  }
}

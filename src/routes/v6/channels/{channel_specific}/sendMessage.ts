import * as express from "express";
import Server from "../../../../server";
import Route from "../../../../util/Route";
import {IMessageObject} from "../../../../util/schema/Message";
import {DiscordRequest, DiscordResponse} from "../../../../util/Util";
import * as Guards from "./guards";
import { DiscordChannel, DiscordUser, Permissions } from "../../../../util/Constants";

export default class SendMessages implements Route {

  public requestMethod: "post" = "post";
  public path: string = "/api/v6/channels/:channel_id/messages";
  public requiresAuthorization: true = true;
  public guard = [Guards.InChannelGuard, Guards.HasPermission(Permissions.SEND_MESSAGES)];

  public constructor(private server: Server) {}

  public async requestHandler(req: DiscordRequest, res: DiscordResponse, data: any): Promise<void> {
    const channel: DiscordChannel = data.channel;
    const user: DiscordUser = data.user;
    const message: IMessageObject = {
      author: user.toUserObject(),
      content: req.body.content,
      nonce: req.body.nonce || null,
    } as any;
    const result = await channel.sendMessage(message);
    res.json(result);
  }

  private isRequest(request: any): request is IMessageObject {
    return "content" in request;
  }
}

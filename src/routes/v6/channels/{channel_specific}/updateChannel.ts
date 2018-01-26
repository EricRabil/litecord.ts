import * as express from "express";
import Server from "../../../../server";
import Route from "../../../../util/Route";
import Channel, {AcceptedUpdates} from "../../../../util/schema/Channel";
import Guild from "../../../../util/schema/Guild";
import {DiscordRequest, DiscordResponse} from "../../../../util/Util";
import * as Guards from "./guards";
import { DiscordChannel } from "../../../../util/Constants";
import { CODES } from "../../../../util/ErrorEmitter";

interface IChannelUpdateRequest {
  name?: string;
  position?: number;
  topic?: string;
  nsfw?: boolean;
}

export default class Guilds implements Route {

  public requestMethod: "patch" = "patch";
  public path: string = "/api/v6/channels/:channel_id";
  public requiresAuthorization: true = true;
  public guard = Guards.InChannelGuard;

  public constructor(private server: Server) {}

  public async requestHandler(req: DiscordRequest, res: DiscordResponse, data: any): Promise<void> {
    if (this.isRequest(req.body) && req.user) {
      const channel: DiscordChannel = data.channel;
      Object.keys(req.body)
        .filter((key) => !!AcceptedUpdates[key])
        .filter((key) => typeof req.body[key] === AcceptedUpdates[key].type)
        .forEach((key) => (channel as any)[AcceptedUpdates[key].mappedValue || key] = req.body[key]);
      await channel.save();
      const channelObject = await channel.toChannelObject({messages: {include: false}});
      channel.dispatch(channelObject, "CHANNEL_UPDATE");
      res.json(channelObject);
    } else {
      res.reject(CODES.BAD_REQUEST);
    }
  }

  private isRequest(request: any): request is IChannelUpdateRequest {
    return ("name" in request && typeof request.name === "string")
        || ("position" in request && typeof request.position === "number")
        || ("topic" in request && typeof request.topic === "string")
        || ("nsfw" in request && typeof request.nsfw === "boolean");
  }
}

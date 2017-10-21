import * as express from "express";
import Server from "../../../../server";
import Route from "../../../../util/Route";
import Channel from "../../../../util/schema/Channel";
import Guild from "../../../../util/schema/Guild";
import {DiscordRequest} from "../../../../util/Util";

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

  public constructor(private server: Server) {}

  public async requestHandler(req: DiscordRequest, res: express.Response): Promise<void> {
    if (this.isRequest(req.body) && req.user) {
      const channel = await Channel.getChannel(req.params.channel_id);
      if (!channel) {
        return Server.errorEmitter.send(res, Server.errorCodes.UNKNOWN.CHANNEL);
      }
      const ownerID = await channel.getOwnerID();
      if (!ownerID || !req.user._id.equals(ownerID)) {
        return Server.errorEmitter.send(res, Server.errorCodes.NO_DM);
      }
      const guild = await channel.getGuild();
      if (!guild) {
        return Server.errorEmitter.send(res, Server.errorCodes.UNKNOWN.ERROR);
      }
      if (typeof req.body.name === "string") {
        channel.name = req.body.name;
      }
      if (!isNaN(Number(req.body.position))) {
        channel.channelPosition = Number(req.body.position);
      }
      if (typeof req.body.topic === "string") {
        channel.topic = req.body.topic;
      }
      if (req.body.nsfw) {
        channel.nsfw = Boolean(req.body.nsfw);
      }
      console.log(req.body);
      await channel.save();
      const channelObject = await channel.toChannelObject();
      guild.dispatch(channelObject, "CHANNEL_UPDATE");
      res.json(channelObject);
    } else {
      Server.errorEmitter.send(res, Server.errorEmitter.CODES.BAD_REQUEST);
    }
  }

  private isRequest(request: any): request is IChannelUpdateRequest {
    return ("name" in request && typeof request.name === "string")
        || ("position" in request && typeof request.position === "number")
        || ("topic" in request && typeof request.topic === "string")
        || ("nsfw" in request && typeof request.nsfw === "boolean");
  }
}

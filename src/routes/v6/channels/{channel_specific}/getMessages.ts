import * as express from "express";
import Server from "../../../../server";
import Route from "../../../../util/Route";
import Channel from "../../../../util/schema/Channel";
import Guild from "../../../../util/schema/Guild";
import Message from "../../../../util/schema/Message";
import {IMessageObject} from "../../../../util/schema/Message";
import {DiscordRequest} from "../../../../util/Util";

export default class Guilds implements Route {

  public requestMethod: "get" = "get";
  public path: string = "/api/v6/channels/:channel_id/messages";
  public requiresAuthorization: true = true;

  public constructor(private server: Server) {}

  public async requestHandler(req: DiscordRequest, res: express.Response): Promise<void> {
    if (!req.user) {
      return this.server.errorEmitter.send(res, this.server.errorCodes.BAD_REQUEST);
    }
    let channel = await Channel.getChannel(req.params.channel_id);
    if (!channel) {
      const tempGuild = await Guild.findById(req.params.channel_id);
      if (!tempGuild) {
        return this.server.errorEmitter.send(res, this.server.errorCodes.UNKNOWN.CHANNEL);
      }
      channel = await Channel.findById(tempGuild.channels[0]);
      if (!channel) {
        return this.server.errorEmitter.send(res, this.server.errorCodes.UNKNOWN.CHANNEL);
      }
    }
    const guild = await channel.getGuild();
    if (guild) {
      if (guild.members.indexOf(req.user._id) === -1) {
        return this.server.errorEmitter.send(res, this.server.errorCodes.MISSING.PERMISSIONS);
      }
    }
    res.json((await channel.getMessageObjects()));
    return;
  }
}

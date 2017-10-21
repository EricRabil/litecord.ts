import * as express from "express";
import Server from "../../../../server";
import Route from "../../../../util/Route";
import Channel from "../../../../util/schema/Channel";
import Guild from "../../../../util/schema/Guild";
import {DiscordRequest} from "../../../../util/Util";

export default class Guilds implements Route {

  public requestMethod: "delete" = "delete";
  public path: string = "/api/v6/channels/:channel_id";
  public requiresAuthorization: true = true;

  public constructor(private server: Server) {}

  public async requestHandler(req: DiscordRequest, res: express.Response): Promise<void> {
    if (req.user) {
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
      guild.channels.splice(guild.channels.indexOf(channel._id));
      guild.save();
      const channelObject = await channel.toChannelObject();
      await channel.remove();
      guild.dispatch(channelObject, "CHANNEL_DELETE");
      res.status(204).end();
    } else {
      Server.errorEmitter.send(res, Server.errorEmitter.CODES.BAD_REQUEST);
    }
  }
}

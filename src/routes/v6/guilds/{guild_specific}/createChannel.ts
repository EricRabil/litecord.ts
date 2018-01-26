import * as express from "express";
import Server from "../../../../server";
import Route from "../../../../util/Route";
import Channel from "../../../../util/schema/Channel";
import Guild from "../../../../util/schema/Guild";
import {DiscordRequest} from "../../../../util/Util";

interface IChannelCreationRequest {
  name: string;
  type?: 0;
}

export default class Guilds implements Route {

  public requestMethod: "post" = "post";
  public path: string = "/api/v6/guilds/:guild_id/channels";
  public requiresAuthorization: true = true;

  public constructor(private server: Server) {}

  public async requestHandler(req: DiscordRequest, res: express.Response): Promise<void> {
    if (this.isRequest(req.body) && req.user) {
      const guild = await Guild.findOne({snowflake: req.params.guild_id});
      if (!guild) {
        return Server.errorEmitter.send(res, Server.errorCodes.UNKNOWN.GUILD);
      }
      const channel = await guild.createChannel({name: req.body.name, type: req.body.type || 0, default: false});
      const channelObj = await channel.toChannelObject();
      res.json(channelObj);
      guild.dispatch(channelObj, "CHANNEL_CREATE");
    } else {
      Server.errorEmitter.send(res, Server.errorEmitter.CODES.BAD_REQUEST);
    }
  }

  private isRequest(request: any): request is IChannelCreationRequest {
    return "name" in request;
  }
}

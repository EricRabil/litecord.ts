import * as express from "express";
import Server from "../../server";
import Route from "../../util/Route";
import Guild from "../../util/schema/Guild";
import {DiscordRequest} from "../../util/Util";

interface IGuildCreationRequest {
  name: string;
  region: string;
  icon?: string;
  verification_level: string;
  default_message_notifications: string;
}

export default class Guilds implements Route {

  public requestMethod: "post" = "post";
  public path: string = "/api/v6/guilds";
  public requiresAuthorization: true = true;

  public constructor(private server: Server) {}

  public async requestHandler(req: DiscordRequest, res: express.Response): Promise<void> {
    if (this.isRequest(req.body) && req.user) {
      const guild = new Guild();
      guild.name = req.body.name;
      guild.ownerID = req.user._id;
      guild.region = req.body.region;
      guild.members.push(req.user._id);
      await guild.save();
      req.user.guilds.push(guild._id);
      await req.user.save();
      const guildObject = await guild.toGuildObject(true);
      console.log(guildObject);
      res.send(guildObject);
      this.server.socketManager.send(req.user._id, guildObject, "GUILD_CREATE");
    } else {
      res.status(400).send({code: 4000, message: "Unknown Error"});
    }
  }

  private isRequest(request: any): request is IGuildCreationRequest {
    return "name" in request;
  }
}

import * as express from "express";
import Server from "../../server";
import Route from "../../util/Route";
import Guild from "../../util/schema/Guild";
import GuildMember from "../../util/schema/GuildMember";
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
      const member = new GuildMember();
      member.user = req.user._id;
      member.guild = guild._id;
      await member.save();
      guild.members.push(member._id);
      guild.users.push(req.user._id);
      req.user.guilds.push(guild._id);
      await req.user.save();
      await guild.createChannel({name: "general", type: 0, default: true});
      const guildObject = await guild.toGuildObject(true);
      res.json(guildObject);
      this.server.socketManager.send(req.user._id, guildObject, "GUILD_CREATE");
    }
  }

  private isRequest(request: any): request is IGuildCreationRequest {
    return "name" in request;
  }
}

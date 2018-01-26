import * as express from "express";
import Server from "../../server";
import Route from "../../util/Route";
import Guild from "../../util/schema/Guild";
import GuildMember from "../../util/schema/GuildMember";
import {DiscordRequest} from "../../util/Util";

import Role from "../../util/schema/Role";
import { DEFAULT_PERMISSIONS } from "../../util/Constants";

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
      guild.ownerID = req.user.snowflake;
      guild.region = req.body.region;

      const member = new GuildMember();
      member.user = req.user.snowflake;
      member.guild = guild.snowflake;
      member.snowflake = req.user.snowflake;
      guild.members.push(req.user.snowflake);

      guild.users.push(req.user.snowflake);

      const role = new Role();
      role.snowflake = guild.snowflake;
      role.permissions.allow = DEFAULT_PERMISSIONS;
      guild.roles.push(role.snowflake);

      req.user.guilds.push(guild.snowflake);
      await Promise.all([member.save(), role.save(), req.user.save(), guild.save()]);
      await guild.createChannel({name: "general", type: 0, default: true});
      const guildObject = await guild.toGuildObject(true);
      res.json(guildObject);
      this.server.socketManager.send(req.user.snowflake, guildObject, "GUILD_CREATE");
    }
  }

  private isRequest(request: any): request is IGuildCreationRequest {
    return "name" in request;
  }
}

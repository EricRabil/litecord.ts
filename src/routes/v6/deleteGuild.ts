import * as express from "express";
import Server from "../../server";
import Route from "../../util/Route";
import Guild from "../../util/schema/Guild";
import {DiscordRequest} from "../../util/Util";

export default class Guilds implements Route {

  public requestMethod: "delete" = "delete";
  public path: string = "/api/v6/guilds/:guild_id";
  public requiresAuthorization: true = true;

  public constructor(private server: Server) {}

  public async requestHandler(req: DiscordRequest, res: express.Response): Promise<void> {
    if (req.user) {
      const guild = await Guild.findOne({snowflake: req.params.guild_id});
      if (!guild) {
        res.status(404).send({code: 10004, message: "Unknown guild"});
        return;
      } else {
        if (req.user.snowflake !== guild.ownerID) {
          Server.errorEmitter.send(res, Server.errorEmitter.CODES.MISSING.ACCESS);
        } else {
          const members = await guild.getMembers();
          for (const member of members) {
            const user = await member.getUser();
            if (user) {
              user.guilds.splice(user.guilds.indexOf(guild.snowflake));
              await user.save();
            }
            await member.remove();
          }
          guild.dispatch({id: guild.id, unavailable: false}, "GUILD_DELETE");
          guild.remove();
          res.status(204).end();
        }
      }
    } else {
      Server.errorEmitter.send(res, Server.errorEmitter.CODES.UNAUTHORIZED);
    }
  }
}

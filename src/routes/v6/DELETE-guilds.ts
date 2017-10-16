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
      const guild = await Guild.findById(req.params.guild_id);
      if (!guild) {
        res.status(404).send({code: 10004, message: "Unknown guild"});
        return;
      } else {
        if (!req.user._id.equals(guild.ownerID)) {
          res.status(403).send({code: 50001, message: "Missing access"});
        } else {
          const members = await guild.getMembers();
          const dispatches: string[] = [];
          members.forEach(async (member) => {
            dispatches.push(member.user);
            const user = await member.getUser();
            if (user) {
              user.guilds.splice(user.guilds.indexOf(guild._id));
              await user.save();
            }
            await member.remove();
          });
          this.server.socketManager.send(dispatches, {id: guild.id, unavailable: true}, "GUILD_DELETE");
          res.status(204).send();
        }
      }
    } else {
      res.status(403).send({code: 403, message: "403: Unauthorized"});
    }
  }
}

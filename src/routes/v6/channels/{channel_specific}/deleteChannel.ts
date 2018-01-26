import * as express from "express";
import Server from "../../../../server";
import Route from "../../../../util/Route";
import Channel from "../../../../util/schema/Channel";
import Guild from "../../../../util/schema/Guild";
import {DiscordRequest, DiscordResponse} from "../../../../util/Util";
import { DiscordGuild, DiscordChannel } from "../../../../util/Constants";
import * as Guards from "./guards";

export default class Guilds implements Route {

  public requestMethod: "delete" = "delete";
  public path: string = "/api/v6/channels/:channel_id";
  public requiresAuthorization: true = true;
  public guard = Guards.InChannelGuard;

  public constructor(private server: Server) {}

  public async requestHandler(req: DiscordRequest, res: DiscordResponse, data: any): Promise<void> {
    const guild: DiscordGuild = data.guild;
    const channel: DiscordChannel = data.channel;
    guild.channels.splice(guild.channels.indexOf(channel.snowflake));
    guild.save();
    const channelObject = await channel.toChannelObject({messages: {include: false}});
    res.json(channelObject);
    guild.dispatch(channelObject, "CHANNEL_DELETE");
    await channel.remove();
  }
}

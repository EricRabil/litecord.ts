import * as express from "express";
import Server from "../../../../../../server";
import Route from "../../../../../../util/Route";
import {DiscordRequest, DiscordResponse} from "../../../../../../util/Util";
import * as Guards from "../../guards";
import { Permissions, DiscordChannel, DiscordUser } from "../../../../../../util/Constants";
import Message from "../../../../../../util/schema/Message";
import { CODES } from "../../../../../../util/ErrorEmitter";
import { can, computeOverrides } from "../../../../../../util/PermissionUtils";
import GuildMember from "../../../../../../util/schema/GuildMember";

export default class DeleteMessage implements Route {

  public requestMethod: "delete" = "delete";
  public path: string = "/api/v6/channels/:channel_id/messages/:message_id";
  public guard = [Guards.ParamGuard(["channel_id", "message_id"]), Guards.InChannelGuard];

  public constructor(private server: Server) {}

  public async requestHandler(req: DiscordRequest, res: DiscordResponse, data: any): Promise<void> {
    const channel: DiscordChannel = data.channel;
    const user: DiscordUser = data.user;
    const message = await Message.findOne({snowflake: req.params.message_id});
    if (!message) {
        return res.reject(CODES.UNKNOWN.MESSAGE);
    }
    if (message.authorID !== user.snowflake) {
        if (!channel.guildID) {
            return res.reject(CODES.MISSING.PERMISSIONS);
        }
        const member = await GuildMember.findOne({guild: channel.guildID, user: user.snowflake});
        if (!member) {
            return res.reject(CODES.MISSING.ACCESS);
        }
        if (!(await can(Permissions.MANAGE_MESSAGES, await computeOverrides(member, channel)))) {
            return res.reject(CODES.MISSING.PERMISSIONS);
        }
    }
    channel.deleteMessage(message);
    res.status(204).end();
  }
}

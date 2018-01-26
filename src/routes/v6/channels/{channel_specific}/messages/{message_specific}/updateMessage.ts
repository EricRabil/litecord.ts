import * as express from "express";
import Server from "../../../../../../server";
import Route from "../../../../../../util/Route";
import {DiscordRequest, DiscordResponse} from "../../../../../../util/Util";
import * as Guards from "../../guards";
import { Permissions, DiscordChannel, DiscordUser } from "../../../../../../util/Constants";
import Message, {AcceptedBodyUpdates} from "../../../../../../util/schema/Message";
import { CODES } from "../../../../../../util/ErrorEmitter";
import { can, computeOverrides } from "../../../../../../util/PermissionUtils";
import GuildMember from "../../../../../../util/schema/GuildMember";

export default class UpdateMessage implements Route {

  public requestMethod: "patch" = "patch";
  public path: string = "/api/v6/channels/:channel_id/messages/:message_id";
  public guard = [Guards.ParamGuard(["channel_id", "message_id"]), Guards.BodyGuard(AcceptedBodyUpdates), Guards.InChannelGuard];

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
    let changes: number = 0;
    for (let i = 0; i < AcceptedBodyUpdates.length; i++) {
        const update = AcceptedBodyUpdates[i];
        if (req.body[update.name]) {
            const valid = update.type === "array" ? Array.isArray(req.body[update.name]) : typeof req.body[update.name] === update.type;
            if (valid) {
                (message as any)[update.name] = req.body[update.name];
                changes++;
            }
        }
    }
    if (changes === 0) {
        return res.reject(CODES.BAD_REQUEST);
    }
    message.editedTimestamp = new Date();
    await message.save();
    channel.dispatch(await message.toMessageObject({author: {more: false}}), "MESSAGE_UPDATE");
    res.json(await message.toMessageObject({author: {more: false}}));
  }
}

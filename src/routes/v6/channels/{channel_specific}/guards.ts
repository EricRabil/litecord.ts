import {Document} from "mongoose";
import {InstanceType} from "typegoose";
import {Permissions, DiscordUser, DiscordChannel, DiscordGuild, DiscordMember} from "../../../../util/Constants";
import {CODES} from "../../../../util/ErrorEmitter";
import {can, computeOverrides} from "../../../../util/PermissionUtils";
import {RouteGuard} from "../../../../util/Route";
import Channel, {Channel as ChannelModel} from "../../../../util/schema/Channel";
import Guild, {Guild as GuildModel} from "../../../../util/schema/Guild";
import GuildMember, { GuildMember as GuildMemberModel } from "../../../../util/schema/GuildMember";
import { DiscordRequest } from "../../../../util/Util";

const loadUser = (req: DiscordRequest): DiscordUser | undefined => {
    if (!req.user) {
        return undefined;
    }
    return req.user;
};

const loadChannelAndGuild = async (req: DiscordRequest): Promise<Array<DiscordChannel | DiscordGuild | null>> => {
    if (!req.user) {
        return [null, null];
    }
    let channel: InstanceType<ChannelModel> | null = await Channel.getChannel(req.params.channel_id);
    let guild: InstanceType<GuildModel> | null = null;
    if (!channel) {
        guild = await Guild.findOne({snowflake: req.params.channel_id});
        if (!guild) {
            return [null, null];
        }
        channel = await Channel.findOne({snowflake: guild.channels[0]});
        if (!channel) {
            return [null, null];
        }
    }
    if (!guild) {
        guild = await channel.getGuild();
    }
    return [channel, guild];
};

export const InChannelGuard: RouteGuard = async (req, res, data, next) => {
    if (!req.user) {
        return res.reject(CODES.UNAUTHORIZED);
    }
    data.user = req.user;
    let channel: DiscordChannel | null = data.channel;
    let guild: DiscordGuild | null = data.guild;
    if (!channel || !guild) {
        [channel, guild] = await loadChannelAndGuild(req) as any;
        if (!channel) {
            return res.reject(CODES.UNKNOWN.CHANNEL);
        }
        data.channel = channel;
        data.guild = guild;
    }
    if (guild && guild.members.indexOf(req.user.snowflake) === -1) {
        return res.reject(CODES.MISSING.PERMISSIONS);
    }
    const member: InstanceType<GuildMemberModel> | null = data.member = await guild.member(req.user);
    if (!member) {
        return res.reject(CODES.MISSING.PERMISSIONS);
    }
    const permissions: number = data.permissions || (data.permissions = await computeOverrides(member, channel));
    if (!(await can(Permissions.READ_MESSAGES, permissions))) {
        return res.reject(CODES.MISSING.PERMISSIONS);
    }
    next();
};

export const ParamGuard: (params: string[]) => RouteGuard = (params) => {
    params = typeof params === "string" ? [params] : params;
    return async (req, res, data, next) => {
        for (let i = 0; i < params.length; i++) {
            if (!req.params[params[i]]) {
                return res.reject(CODES.BAD_REQUEST);
            }
        }
        next();
    };
};

export interface BodyField {
    name: string;
    type?: string;
    optional?: boolean;
}

export const BodyGuard: (fields: BodyField[]) => RouteGuard = (fields) => {
    return async (req, res, data, next) => {
        for (let i = 0; i < fields.length; i++) {
            const field = fields[i];
            if (!req.params[field.name] && !field.optional) {
                return res.reject(CODES.BAD_REQUEST);
            }
            if (field.type) {
                if (field.type === "array") {
                    if (!Array.isArray(req.body[field.name])) {
                        return res.reject(CODES.BAD_REQUEST);
                    }
                } else {
                    if (field.type !== typeof req.body[field.name]) {
                        return res.reject(CODES.BAD_REQUEST);
                    }
                }
            }
        }
        next();
    };
};

export const HasPermission: (permissions: number | number[]) => RouteGuard = (permissions) => {
    return async (req, res, data, next) => {
        let channel: DiscordChannel = data.channel;
        let guild: DiscordGuild = data.channel;
        const user: DiscordUser | undefined = req.user;
        if (!user) {
            return res.reject(CODES.UNAUTHORIZED);
        }
        if (!data.channel || !data.guild) {
            [channel, guild] = await loadChannelAndGuild(req) as any;
            if (!channel || !guild) {
                return res.reject(CODES.UNKNOWN.CHANNEL);
            }
            data.channel = channel;
            data.guild = guild;
        }
        if (!data.member) {
            data.member = await guild.member(user);
        }
        const member: DiscordMember = data.member;
        if (!member) {
            return res.reject(CODES.MISSING.ACCESS);
        }
        if (!(await can(permissions, await computeOverrides(member, channel)))) {
            return res.reject(CODES.MISSING.PERMISSIONS);
        }
        next();
    };
};

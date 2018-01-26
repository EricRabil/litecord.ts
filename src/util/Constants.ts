import { InstanceType } from "typegoose";
import { Channel as ChannelModel } from "./schema/Channel";
import { User } from "./schema/User";
import { Guild } from "./schema/Guild";
import { GuildMember } from "./schema/GuildMember";
import { Message } from "_debugger";

export type DiscordChannel = InstanceType<ChannelModel>;
export type DiscordGuild = InstanceType<Guild>;
export type DiscordUser = InstanceType<User>;
export type DiscordMember = InstanceType<GuildMember>;
export type DiscordMessage = InstanceType<Message>;

export const Permissions = {
    // General
    CREATE_INSTANT_INVITE: 1 << 0,
    KICK_MEMBERS: 1 << 1,
    BAN_MEMBERS: 1 << 2,
    ADMINISTRATOR: 1 << 3,
    MANAGE_CHANNELS: 1 << 4,
    MANAGE_GUILD: 1 << 5,
    CHANGE_NICKNAME: 1 << 26,
    MANAGE_NICKNAMES: 1 << 27,
    MANAGE_ROLES: 1 << 28,
    MANAGE_WEBHOOKS: 1 << 29,
    MANAGE_EMOJIS: 1 << 30,
    VIEW_AUDIT_LOG: 1 << 7,

    // Text
    READ_MESSAGES: 1 << 10,
    SEND_MESSAGES: 1 << 11,
    SEND_TSS_MESSAGES: 1 << 12,
    MANAGE_MESSAGES: 1 << 13,
    EMBED_LINKS: 1 << 14,
    ATTACH_FILES: 1 << 15,
    READ_MESSAGE_HISTORY: 1 << 16,
    MENTION_EVERYONE: 1 << 17,
    USE_EXTERNAL_EMOJIS: 1 << 18,
    ADD_REACTIONS: 1 << 6,

    // Voice
    CONNECT: 1 << 20,
    SPEAK: 1 << 21,
    MUTE_MEMBERS: 1 << 22,
    DEAFEN_MEMBERS: 1 << 23,
    MOVE_MEMBERS: 1 << 24,
    USE_VAD: 1 << 25,
};

export interface AcceptedUpdatesSchema {
    [key: string]: {
        type: string,
        mappedValue?: string,
        optional?: boolean,
    };
}

// create invite, change nickname, view channels, send messages, send tts, embed links, attach files, read message history, mention everyone, use external emojis, connect, speak, use voice activity

const defaultPermissions = [
    Permissions.CREATE_INSTANT_INVITE,
    Permissions.CHANGE_NICKNAME,
    Permissions.READ_MESSAGES,
    Permissions.SEND_MESSAGES,
    Permissions.SEND_TSS_MESSAGES,
    Permissions.EMBED_LINKS,
    Permissions.ATTACH_FILES,
    Permissions.READ_MESSAGE_HISTORY,
    Permissions.MENTION_EVERYONE,
    Permissions.USE_EXTERNAL_EMOJIS,
    Permissions.CONNECT,
    Permissions.SPEAK,
    Permissions.USE_VAD,
];

export const DEFAULT_PERMISSIONS = defaultPermissions.reduce((def, current) => def | current, 0);
export const ALL = Object.values(Permissions).reduce((all, current) => all | current, 0);

export const DEFAULTS = defaultPermissions;
export const ALL_PERMISSIONS = Object.values(Permissions);

export type Permission = number;
export type Permissions = number[];

// tslint:disable:no-bitwise jsdoc-format ordered-imports max-line-length
import {Permission, Permissions, ALL, DiscordGuild} from "./Constants";
import {GuildMember} from "./schema/GuildMember";
import { InstanceType } from "typegoose";
import { Channel } from "./schema/Channel";
import PermissionCache from "./schema/PermissionCache";
import Role, { RoleModel } from "./schema/Role";
import { DEFAULT_PERMISSIONS } from "./Constants";
import { getEntities } from "./Util";

export async function can(permission: Permission | Permissions, permissions: number): Promise<boolean> {
    if (Array.isArray(permission)) {
        const original = permission;
        permission = 0;
        for (let i = 0; i < original.length; i++) {
            permission |= original[i];
        }
    }
    return (permissions & permission) === permission;
}

export interface IOverrideData {
    member?: InstanceType<GuildMember>;
    channel?: InstanceType<Channel>;
}

export async function computeBasePermissions(member: InstanceType<GuildMember>, roles?: Array<InstanceType<RoleModel>>): Promise<number> {
    let permissions: number = 0;
    if (!roles && member.roles.length > 0) {
        roles = await member.getRoles();
    }

    const everyoneRole = await Role.findOne({snowflake: member.guild});
    if (everyoneRole) {
        permissions &= ~everyoneRole.permissions.deny;
        permissions |= everyoneRole.permissions.allow;
    }

    if (roles && roles.length > 0) {
        let allow: number = 0;
        let deny: number = 0;

        for (let i = 0; i < roles.length; i++) {
            allow |= roles[i].permissions.allow;
            deny |= roles[i].permissions.deny;
        }

        permissions |= allow;
        permissions &= ~deny;
    }

    if (await can(Permissions.ADMINISTRATOR, permissions)) {
        return ALL;
    }

    return permissions;
}

export async function computeOverrides(member: InstanceType<GuildMember>, channel: InstanceType<Channel>): Promise<number> {
    const roles = member.roles.length === 0 ? [] : await member.getRoles();
    const basePermissions: number = await computeBasePermissions(member, roles);

    const guild = await channel.getGuild();

    if (await can(Permissions.ADMINISTRATOR, basePermissions) || !!guild ? (member.snowflake === (guild as DiscordGuild).ownerID) : false) {
        return ALL;
    }

    const {permissionOverwrites} = channel;

    if (!channel.guildID || !permissionOverwrites) {
        return basePermissions;
    }

    let permissions = basePermissions;

    const everyoneRole = await channel.getPermissionOverride(channel.guildID);
    if (everyoneRole) {
        permissions &= ~everyoneRole.deny;
        permissions |= everyoneRole.allow;
    }

    let allow: number = 0;
    let deny: number = 0;

    if (member.roles.length > 0) {
        const overwriteOperations: Array<Promise<void>> = [];

        for (let i = 0; i < roles.length; i++) {
            overwriteOperations.push((async () => {
                const overwriteRole = await channel.getPermissionOverride(roles[i].snowflake);
                if (overwriteRole) {
                    allow |= overwriteRole.allow;
                    deny |= overwriteRole.deny;
                }
            })());
        }

        await Promise.all(overwriteOperations);
    }

    permissions &= ~deny;
    permissions |= allow;

    const memberOverride = await channel.getPermissionOverride(member.snowflake);
    if (memberOverride) {
        permissions &= ~memberOverride.deny;
        permissions |= memberOverride.allow;
    }

    return permissions;
}

export async function grantPermissions(basePermissions: number, ...newPermissions: number[]): Promise<number> {
    for (let i = 0; i < newPermissions.length; i++) {
        basePermissions |= newPermissions[i];
    }
    return basePermissions;
}

export async function revokePermissions(basePermissions: number, ...revokedPermissions: number[]): Promise<number> {
    for (let i = 0; i < revokedPermissions.length; i++) {
        basePermissions &= ~revokedPermissions[i];
    }
    return basePermissions;
}

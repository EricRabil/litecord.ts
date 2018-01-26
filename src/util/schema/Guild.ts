/* tslint:disable:object-literal-sort-keys */
import * as mongoose from "mongoose";
import {arrayProp, instanceMethod, InstanceType, ModelType, prop, staticMethod, Typegoose} from "typegoose";
import Server from "../../server";
import Channel, {Channel as ChannelModel, IChannelObject, IMessageRequestProps} from "./Channel";
import Emoji, {Emoji as EmojiModel, IEmojiObject} from "./Emoji";
import GuildMember, {GuildMember as GuildMemberModel, IGuildMemberObject} from "./GuildMember";
import Role, {IRoleObject, RoleModel as RoleModel} from "./Role";
import User, {IUserObject, User as UserModel} from "./User";

import {generate as generateSnowflake} from "../SnowflakeUtils";
import { getEntities } from "../Util";

export interface IGuildObject {
  id: string;
  name: string;
  icon: string;
  splash: string;
  owner_id: string;
  region: string;
  afk_channel_id: string;
  afk_timeout: number;
  embed_enabled: boolean;
  embed_channel_id: string;
  verification_level: number;
  default_message_notifications: number;
  explicit_content_filter: number;
  roles: IRoleObject[];
  emojis: IEmojiObject[];
  features: string[];
  mfa_level: 0 | 1;
  application_id?: string;
  widget_enabled: boolean;
  widget_channel_id: string;
  joined_at?: string;
  large?: boolean;
  unavailable?: boolean;
  member_count?: number;
  voice_states?: object[];
  members?: IGuildMemberObject[];
  channels?: IChannelObject[];
  presences?: object[];
  system_channel_id: string;
}

export interface IChannelRequestProps {
  include?: boolean;
  messages?: IMessageRequestProps;
}

export interface IChannelData {
  name: string;
  type: 0 | 2 | 4;
}

export interface IInternalChannelObject {
  name: string;
  type: number;
  default: boolean;
}

async function lookupBulk<T>(document: mongoose.Model<InstanceType<T>>,
                             queries: object[]):
                       Promise<Array<InstanceType<T>>> {
  const lookups: Array<InstanceType<T> | null> = [];
  for (const query of queries) {
    lookups.push(await document.findOne(query));
  }
  lookups.filter((lookup) => lookup !== null && lookup !== undefined);
  return (lookups as any);
}

export class Guild extends Typegoose {
  @prop({default: generateSnowflake, required: true})
  public snowflake: string;

  @prop()
  public name: string;

  @prop({default: null})
  public icon: string;

  @prop({default: null})
  public splash: string;

  @prop({required: true})
  public ownerID: string;

  @prop({default: null})
  public systemChannelID: string;

  @prop({default: "us-central"})
  public region: string;

  @prop({default: null})
  public afkChannelID: string;

  @prop({default: 500})
  public afkTimeout: number;

  @prop({default: false})
  public embedsEnabled: boolean;

  @prop()
  public embedChannel: string;

  /**
   * Array of channel IDs - must be converted to channel objects
   *
   * @type {string[]}
   * @memberof Guild
   */
  @arrayProp({items: String, default: []})
  public channels: string[];

  /**
   * Level of verification required
   *
   * 0 - NONE,
   * 1 - LOW,
   * 2 - MEDIUM,
   * 3 - HIGH,
   * 4 - VERY HIGH
   *
   * @type {(0 | 1 | 2 | 3 | 4)}
   * @memberof Guild
   */
  @prop({default: 0})
  public verificationLevel: 0 | 1 | 2 | 3 | 4;

  /**
   * Default notification scope
   *
   * 0 - ALL
   * 1 - MENTIONS
   *
   * @type {(0 | 1)}
   * @memberof Guild
   */
  @prop({default: 1})
  public defaultMessageNotifications: 0 | 1;

  /**
   * Amount of content to filter bad words from
   *
   * 0 - DISABLED
   * 1 - MEMBERS WITHOUT ROLES
   * 2 - ALL
   *
   * @type {(0 | 1 | 2)}
   * @memberof Guild
   */
  @prop({default: 0})
  public explicitContentFilter: 0 | 1 | 2;

  /**
   * Array of roles - must be converted to an array of role objects
   *
   *
   * @type {string[]}
   * @memberof Guild
   */
  @arrayProp({items: String, default: []})
  public roles: string[];

  @arrayProp({items: String, default: []})
  public users: string[];

  /**
   * Array of emojis - must be converted to an array of emoji objects
   *
   *
   * @type {string[]}
   * @memberof Guild
   */
  @arrayProp({items: String, default: []})
  public emojis: string[];

  @arrayProp({items: String, default: []})
  public features: string[];

  /**
   * Level of 2FA to require
   *
   * 0 - NONE, 1 - ALL
   *
   * @type {(0 | 1)}
   * @memberof Guild
   */
  @prop({default: 0})
  public mfaLevel: 0 | 1;

  @prop({default: null})
  public applicationID?: string;

  @prop()
  public widgetEnabled: boolean = false;

  @prop()
  public widgetChannel: string;

  @prop({default: () => new Date()})
  public created: Date;

  @prop({default: false})
  public large: boolean;

  /**
   * Array of guild member IDs, must be converted to guild member objects
   *
   * @type {string[]}
   * @memberof Guild
   */
  @arrayProp({items: String, default: []})
  public members: string[];

  @instanceMethod
  public async dispatch(this: InstanceType<Guild>, data: any, event: string): Promise<void> {
    const {$exclude} = data;
    if (!!$exclude) {
      delete data.$exclude;
    }
    const exclude: string[] = (Array.isArray($exclude) && typeof $exclude[0] === "string") ? $exclude : [];
    const dispatches: string[] = this.members;
    if (exclude.length > 0) {
      for (let i = 0; i < exclude.length; i++) {
        dispatches.splice(dispatches.indexOf(exclude[i]));
      }
    }
    Server.socketManager.send(dispatches, data, event);
  }

  @instanceMethod
  public async createChannel(
      this: InstanceType<Guild>,
      data: IInternalChannelObject): Promise<InstanceType<ChannelModel>> {
    const newChannel = new Channel();
    newChannel.name = data.name;
    newChannel.type = data.type;
    newChannel.default = data.default;
    newChannel.guildID = this.snowflake;
    newChannel.save();
    this.channels.push(newChannel.snowflake);
    await this.save();
    return newChannel;
  }

  @instanceMethod
  public async member(this: InstanceType<Guild>, user: string | InstanceType<UserModel>): Promise<InstanceType<GuildMemberModel> | null> {
    return GuildMember.findOne({guild: this.snowflake, user: typeof user === "string" ? user : user.snowflake});
  }

  @instanceMethod
  public async addToGuild(this: InstanceType<Guild>, user: string | InstanceType<UserModel> | null): Promise<InstanceType<GuildMemberModel> | null> {
    user = typeof user === "string" ? await User.findOne({snowflake: user}) : user;
    if (!user) {
      return null;
    }
    if (this.members.includes(user.snowflake)) {
      return await this.member(user.snowflake);
    }
    const member = new GuildMember();
    member.user = user.snowflake;
    member.guild = this.snowflake;
    member.snowflake = user.snowflake;
    user.guilds.push(this.snowflake);
    this.members.push(member.user);
    this.users.push(member.user);
    await Promise.all([member.save(), user.save(), this.save()]);
    await this.dispatch({$exclude: [user.snowflake], guild_id: this.snowflake, ...(await member.toGuildMemberObject())}, "GUILD_MEMBER_ADD");
    await user.dispatch(await this.toGuildObject(true, {channel: {messages: {author: {more: false}}}}), "GUILD_CREATE");
  }

  @instanceMethod
  public async getMembers(this: InstanceType<Guild>): Promise<Array<InstanceType<GuildMemberModel>>> {
    return getEntities(this.members, GuildMember, new GuildMemberModel());
  }

  @instanceMethod
  public async getEmojis(this: InstanceType<Guild>): Promise<Array<InstanceType<EmojiModel>>> {
    return getEntities(this.emojis, Emoji, new EmojiModel());
  }

  @instanceMethod
  public async getRoles(this: InstanceType<Guild>): Promise<Array<InstanceType<RoleModel>>> {
    return getEntities(this.roles, Role, new RoleModel());
  }

  @instanceMethod
  public async getRole(this: InstanceType<Guild>, snowflake: string): Promise<InstanceType<RoleModel> | null> {
    return await Role.findOne({snowflake});
  }

  @instanceMethod
  public async getChannels(this: InstanceType<Guild>): Promise<Array<InstanceType<ChannelModel>>> {
    return getEntities(this.channels, Channel, new ChannelModel());
  }

  @instanceMethod
  public async getUsers(this: InstanceType<Guild>): Promise<Array<InstanceType<UserModel>>> {
    return getEntities(this.users, User, new UserModel());
  }

  @instanceMethod
  public async getMemberObjects(this: InstanceType<Guild>): Promise<IGuildMemberObject[]> {
    return Promise.all((await this.getMembers()).map(async (member) => member.toGuildMemberObject()));
  }

  @instanceMethod
  public async getEmojiObjects(this: InstanceType<Guild>): Promise<IEmojiObject[]> {
    return Promise.all((await this.getEmojis()).map(async (emoji) => emoji.toEmojiObject()));
  }

  @instanceMethod
  public async getRoleObjects(this: InstanceType<Guild>): Promise<IRoleObject[]> {
    return Promise.all((await this.getRoles()).map(async (role) => role.toRoleObject()));
  }

  @instanceMethod
  public async getChannelObjects(this: InstanceType<Guild>, opts?: IChannelRequestProps): Promise<IChannelObject[]> {
    return Promise.all((await this.getChannels()).map(async (channel) => await channel.toChannelObject(opts)));
  }

  @instanceMethod
  public async getUserObjects(this: InstanceType<Guild>): Promise<IUserObject[]> {
    return Promise.all((await this.getUsers()).map((user) => user.toUserObject()));
  }

  @instanceMethod
  public async toGuildObject(this: InstanceType<Guild>, more: boolean = false, opts?: {channel?: IChannelRequestProps}): Promise<IGuildObject> {
      let guildObject: IGuildObject = {
        id: this.snowflake,
        name: this.name,
        icon: this.icon,
        splash: this.splash,
        owner_id: this.ownerID,
        region: this.region,
        afk_channel_id: this.afkChannelID,
        afk_timeout: this.afkTimeout,
        embed_enabled: this.embedsEnabled,
        embed_channel_id: this.embedChannel,
        verification_level: this.verificationLevel,
        default_message_notifications: this.defaultMessageNotifications,
        explicit_content_filter: this.explicitContentFilter,
        roles: await this.getRoleObjects(),
        emojis: await this.getEmojiObjects(),
        features: this.features,
        mfa_level: this.mfaLevel,
        application_id: this.applicationID,
        widget_enabled: this.widgetEnabled,
        widget_channel_id: this.widgetChannel,
        channels: await this.getChannelObjects(opts && opts.channel),
        system_channel_id: this.systemChannelID,
        presences: [],
      };
      if (more) {
        const addition = {
          joined_at: this.created.toISOString(),
          large: this.members.length >= 50,
          unavailable: false,
          member_count: this.members.length,
          voice_states: [],
          members: await this.getMemberObjects(),
        };
        guildObject = Object.assign(guildObject, addition);
        return guildObject;
      }
      return guildObject;
  }
}

const GuildModel = new Guild().getModelForClass(Guild);

export default GuildModel;

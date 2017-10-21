/* tslint:disable:object-literal-sort-keys */
import * as mongoose from "mongoose";
import {arrayProp, instanceMethod, InstanceType, ModelType, prop, staticMethod, Typegoose} from "typegoose";
import Server from "../../server";
import Channel from "./Channel";
import {Channel as ChannelModel, IChannelObject} from "./Channel";
import Emoji from "./Emoji";
import {Emoji as EmojiModel, IEmojiObject} from "./Emoji";
import GuildMember from "./GuildMember";
import {GuildMember as GuildMemberModel, IGuildMemberObject} from "./GuildMember";
import Role from "./Role";
import {IRoleObject, Role as RoleModel} from "./Role";
import User from "./User";
import {IUserObject, User as UserModel} from "./User";

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
    const members = await this.getMembers();
    const dispatches: string[] = [];
    for (const member of members) {
      dispatches.push(member.user);
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
    newChannel.parentID = this._id;
    newChannel.save();
    this.channels.push(newChannel._id);
    await this.save();
    return newChannel;
  }

  @instanceMethod
  public async getMembers(this: InstanceType<Guild>): Promise<Array<InstanceType<GuildMemberModel>>> {
    return this.getEntities(this.members, GuildMember, new GuildMemberModel());
  }

  @instanceMethod
  public async getEmojis(this: InstanceType<Guild>): Promise<Array<InstanceType<EmojiModel>>> {
    return this.getEntities(this.emojis, Emoji, new EmojiModel());
  }

  @instanceMethod
  public async getRoles(this: InstanceType<Guild>): Promise<Array<InstanceType<RoleModel>>> {
    return this.getEntities(this.roles, Role, new RoleModel());
  }

  @instanceMethod
  public async getChannels(this: InstanceType<Guild>): Promise<Array<InstanceType<ChannelModel>>> {
    return this.getEntities(this.channels, Channel, new ChannelModel());
  }

  @instanceMethod
  public async getUsers(this: InstanceType<Guild>): Promise<Array<InstanceType<UserModel>>> {
    return this.getEntities(this.users, User, new UserModel());
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
  public async getChannelObjects(this: InstanceType<Guild>): Promise<IChannelObject[]> {
    return Promise.all((await this.getChannels()).map(async (channel) => await channel.toChannelObject()));
  }

  @instanceMethod
  public async getUserObjects(this: InstanceType<Guild>): Promise<IUserObject[]> {
    return Promise.all((await this.getUsers()).map((user) => user.toUserObject()));
  }

  @instanceMethod
  public async toGuildObject(this: InstanceType<Guild>, more: boolean = false): Promise<IGuildObject> {
      let guildObject: IGuildObject = {
        id: this._id,
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
        channels: await this.getChannelObjects(),
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

  @instanceMethod
  private async getEntities<T extends Typegoose>(
                                  this: InstanceType<Guild>,
                                  ids: string[],
                                  document: mongoose.Model<InstanceType<T>>,
                                  model: T): Promise<Array<InstanceType<T>>> {
    const entities: Array<InstanceType<T>> = [];
    for (const id of ids) {
      const entity = await document.findById(id);
      if (entity) {
        entities.push(entity);
      }
    }
    return entities;
  }
}

const GuildModel = new Guild().getModelForClass(Guild);

export default GuildModel;

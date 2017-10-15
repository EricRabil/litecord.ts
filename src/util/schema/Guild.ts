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
}

function lookupBulk<T>(document: mongoose.Model<InstanceType<T>>,
                       queries: object[]):
                       Array<InstanceType<T>> {
  const lookups: Array<InstanceType<T> | null> = [];
  queries.forEach(async (query) => {
    lookups.push(await document.findOne(query));
  });
  lookups.filter((lookup) => !!lookup);
  return (lookups as any);
}

export class Guild extends Typegoose {
  @prop()
  public name: string;

  @prop()
  public icon: string;

  @prop()
  public splash: string;

  @prop()
  public ownerID: string;

  @prop()
  public region: string;

  @prop()
  public afkChannelID: string;

  @prop()
  public afkTimeout: number = 500;

  @prop()
  public embedsEnabled: boolean = false;

  @prop()
  public embedChannel: string;

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
  @prop()
  public verificationLevel: 0 | 1 | 2 | 3 | 4 = 0;

  /**
   * Default notification scope
   *
   * 0 - ALL
   * 1 - MENTIONS
   *
   * @type {(0 | 1)}
   * @memberof Guild
   */
  @prop()
  public defaultMessageNotifications: 0 | 1 = 1;

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
  @prop()
  public explicitContentFilter: 0 | 1 | 2 = 0;

  /**
   * Array of roles - must be converted to an array of role objects
   *
   *
   * @type {string[]}
   * @memberof Guild
   */
  @arrayProp({items: String})
  public roles: string[];

  /**
   * Array of emojis - must be converted to an array of emoji objects
   *
   *
   * @type {string[]}
   * @memberof Guild
   */
  @arrayProp({items: String})
  public emojis: string[] = [];

  @arrayProp({items: String})
  public features: string[] = [];

  /**
   * Level of 2FA to require
   *
   * 0 - NONE, 1 - ALL
   *
   * @type {(0 | 1)}
   * @memberof Guild
   */
  @prop()
  public mfaLevel: 0 | 1 = 0;

  @prop()
  public applicationID?: string;

  @prop()
  public widgetEnabled: boolean = false;

  @prop()
  public widgetChannel: string;

  @prop()
  public created: Date = new Date();

  @prop()
  public large: boolean = false;

  /**
   * Array of guild member IDs, must be converted to guild member objects
   *
   * @type {string[]}
   * @memberof Guild
   */
  @arrayProp({items: String})
  public members: string[] = [];

  /**
   * Array of channel IDs, must be converted to channel objects
   *
   * @type {string[]}
   * @memberof Guild
   */
  @arrayProp({items: String})
  public channels: string[] = [];

  @instanceMethod
  public async toGuildObject(this: InstanceType<Guild>, more: boolean = false): Promise<IGuildObject> {
      const roleQuery = this.roles.map((role) => ({_id: role}));
      const emojiQuery = this.emojis.map((emoji) => ({_id: emoji}));
      const memberQuery = this.members.map((member) => ({_id: member}));
      const channelQuery = this.channels.map((channel) => ({_id: channel}));
      const roles = await lookupBulk(Role, roleQuery);
      const roleObjects = roles.map((role) => role.toRoleObject());
      const emojis = await lookupBulk(Emoji, emojiQuery);
      const emojiObjects: any[] = emojis.map(async (emoji) => await emoji.toEmojiObject());
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
        roles: roleObjects,
        emojis: emojiObjects,
        features: this.features,
        mfa_level: this.mfaLevel,
        application_id: this.applicationID,
        widget_enabled: this.widgetEnabled,
        widget_channel_id: this.widgetChannel,
      };
      if (more) {
        const members = await lookupBulk(GuildMember, memberQuery);
        const memberObjects = members.map(async (member) => await member.toGuildMemberObject());
        const channels = await Promise.all(lookupBulk(Channel, channelQuery));
        const channelObjects = channels.map(async (channel) => await channel.toChannelObject());
        const addition = {
          joined_at: this.created.toISOString(),
          large: this.members.length >= 50,
          unavailable: false,
          member_count: this.members.length,
          voice_states: [],
          members: memberObjects,
          channels: channelObjects,
        };
        guildObject = Object.assign(guildObject, addition);
        return guildObject;
      }
      return guildObject;
  }
}

const GuildModel = new Guild().getModelForClass(Guild);

export default GuildModel;

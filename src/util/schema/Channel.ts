/* tslint:disable:object-literal-sort-keys */
import * as mongoose from "mongoose";
import {arrayProp, instanceMethod, InstanceType, ModelType, prop, staticMethod, Typegoose} from "typegoose";
import Server from "../../server";
import {can as hasPermission, can, computeOverrides} from "../PermissionUtils";
import Guild, { IChannelRequestProps } from "./Guild";
import { Guild as GuildModel } from "./Guild";
import GuildMember, { GuildMember as GuildMemberModel, GuildMember } from "./GuildMember";
import MessageModel from "./Message";
import {IMessageObject, Message} from "./Message";
import UserModel from "./User";
import {IUserObject, IUserRequestProps, User} from "./User";

import {generate as generateSnowflake} from "../SnowflakeUtils";
import Role, { RoleModel } from "./Role";
import { PermissionOverwrite, getEntities } from "../Util";
import { AcceptedUpdatesSchema, Permissions, DiscordMessage } from "../Constants";

export interface IChannelObject {
  id: string;
  type: 0 | 1 | 2 | 3 | 4;
  guild_id?: string;
  position?: number;
  permission_overwrites?: Array<{id: string, type: "role" | "member", allow: number, deny: number}>;
  name?: string;
  topic?: string;
  nsfw?: boolean;
  last_message_id?: string;
  bitrate?: number;
  user_limit?: number;
  recipients?: IUserObject[];
  icon?: string;
  owner_id?: string | null;
  application_id?: string;
  parent_id?: string;
  messages: IMessageObject[];
}

export interface IMessageRequestProps {
  include?: boolean;
  limit?: number;
  author?: IUserRequestProps;
  before?: string;
}

export const AcceptedUpdates: AcceptedUpdatesSchema = {
  name: {
    type: "string",
  },
  topic: {
    type: "string",
  },
  nsfw: {
    type: "boolean",
  },
  position: {
    type: "number",
    mappedValue: "channelPosition",
  },
};

export class Channel extends Typegoose {

  @staticMethod
  public static async getChannel(
      this: ModelType<Channel> & Channel,
      channelID: string): Promise<InstanceType<Channel> | null> {
    let channel = await ChannelModel.findOne({snowflake: channelID});
    if (!channel) {
      const results = await ChannelModel.find({parentID: channelID});
      if (results.length === 0) {
        return null;
      }
      channel = results[0];
    }
    return channel;
  }

  @prop({default: generateSnowflake, required: true})
  public snowflake: string;

  /**
   * The type of channel
   *
   * 0 - GUILD_TEXT,
   * 1 - DM,
   * 2 - GUILD_VOICE,
   * 3 - GROUP_DM,
   * 4 - GUILD_CATEGORY
   *
   * @type {(0 | 1 | 2 | 3 | 4)}
   * @memberof Channel
   */
  @prop()
  public type: 0 | 1 | 2 | 3 | 4;

  @prop()
  public guildID?: string;

  @prop()
  public channelPosition?: number;

  @arrayProp({items: PermissionOverwrite})
  public permissionOverwrites?: PermissionOverwrite[];

  @prop()
  public name?: string;

  @prop()
  public topic?: string;

  @prop({default: false})
  public nsfw?: boolean;

  @prop()
  public lastMessage?: string;

  @prop()
  public bitrate?: number;

  @prop()
  public userLimit?: number;

  /**
   * Array of user IDs in the group DM, when sent to API this must be an array of user objects.
   *
   * @type {string[]}
   * @memberof Channel
   */
  @arrayProp({items: String})
  public recipients?: string[];

  @prop()
  public icon?: string;

  @prop()
  public applicationID?: string;

  @prop()
  public parentID?: string;

  @prop({required: true, default: false})
  public default: boolean;

  @instanceMethod
  public async getMessages(this: InstanceType<Channel>, query: {limit: number, before?: string}): Promise<Array<InstanceType<Message>>> {
    const beforeMessage = query.before && await MessageModel.findOne({snowflake: query.before}).exec();
    let before = new Date();
    if (beforeMessage) {
      before = beforeMessage.timestamp;
    }
    let messages = await MessageModel.find({channelID: this.snowflake, timestamp: {$lte: before}}).limit(query.limit).sort("-timestamp").exec();
    messages = messages.sort((message1, message2) => (message2.timestamp as any as number) - (message1.timestamp as any as number));
    return messages;
  }

  @instanceMethod
  public async getMessageObjects(this: InstanceType<Channel>, props?: IMessageRequestProps): Promise<IMessageObject[]> {
    return Promise.all((await this.getMessages({limit: props && props.limit || 50, before: props && props.before || undefined})).map((message) => message.toMessageObject(props)));
  }

  @instanceMethod
  public async hasPermission(this: InstanceType<Channel>, target: InstanceType<GuildMemberModel | User | RoleModel>, permission: number): Promise<boolean> {
    if (!this.guildID) {
      if (target instanceof UserModel) {
        const user = target as InstanceType<User>;
        // TODO: Actual logic for DM channels
        return true;
      }
      return false;
    }
    const guild = await this.getGuild();
    if (!guild) {
      return false;
    }
    let guildEntity: InstanceType<GuildMemberModel | RoleModel> | undefined;
    if (target instanceof UserModel) {
      const user = target as InstanceType<User>;
      if (!guild.members.includes(user.snowflake)) {
        return false;
      }
      const member = await GuildMember.findOne({snowflake: user.snowflake});
      if (member) {
        guildEntity = member;
      }
    } else if (target instanceof Role) {
      guildEntity = target as InstanceType<RoleModel>;
    }
    if (!guildEntity) {
      return false;
    }
  }

  @instanceMethod
  public async sendMessage(this: InstanceType<Channel>, message: IMessageObject): Promise<IMessageObject> {
    const messageSchema = new MessageModel();
    messageSchema.authorID = message.author && message.author.id || "",
    messageSchema.channelID = this.snowflake;
    messageSchema.content = message.content;
    messageSchema.mentionEveryone = message.mention_everyone || false;
    messageSchema.nonce = (message.nonce as string);
    messageSchema.pinned = message.pinned || false;
    messageSchema.roleMentions = message.mention_roles || [];
    messageSchema.tts = message.tts || false;
    messageSchema.webhookID = (message.webhook_id as string);
    messageSchema.save();
    const messageObj = await messageSchema.toMessageObject({author: {more: false}});
    this.dispatch(messageObj, "MESSAGE_CREATE");
    return messageObj;
  }

  @instanceMethod
  public async deleteMessage(this: InstanceType<Channel>, message: InstanceType<Message> | string): Promise<void> {
    if (typeof message === "string") {
      const tempMessage = await MessageModel.findOne({snowflake: message});
      if (tempMessage) {
        message = tempMessage;
      } else {
        return;
      }
    }
    message.remove();
    this.dispatch({id: message.snowflake, channel_id: message.channelID}, "MESSAGE_DELETE");
  }

  @instanceMethod
  public async dispatch(this: InstanceType<Channel>, data: any, event: string): Promise<void> {
    await Server.socketManager.send(await this.getRecipients(), data, event);
  }

  @instanceMethod
  public async getRecipients(this: InstanceType<Channel>): Promise<string[]> {
    const guild = await this.getGuild();
    if (guild) {
      const totalMembers = await guild.getMembers();
      const recipients: string[] = [];
      for (let i = 0; i < totalMembers.length; i++) {
        if (await can(Permissions.READ_MESSAGES, await computeOverrides(totalMembers[i], this))) {
          recipients.push(totalMembers[i].snowflake);
        }
      }
      return recipients;
    } else if (!!this.recipients) {
      return this.recipients;
    }
    return [];
  }

  @instanceMethod
  public async toChannelObject(this: InstanceType<Channel>, opts?: IChannelRequestProps): Promise<IChannelObject> {
    const channelObject: IChannelObject = {
      id: this.snowflake,
      type: this.type,
      guild_id: this.guildID,
      position: this.channelPosition,
      permission_overwrites: this.permissionOverwrites,
      name: this.name,
      topic: this.topic,
      nsfw: this.nsfw,
      last_message_id: this.lastMessage,
      bitrate: this.bitrate,
      user_limit: this.userLimit,
      icon: this.icon,
      owner_id: await this.getOwnerID(),
      application_id: this.applicationID,
      parent_id: this.parentID,
      messages: (!opts ? true : opts.messages ? typeof opts.messages.include === "boolean" ? opts.messages.include : true : true) ? await this.getMessageObjects(opts && opts.messages) : undefined,
    };
    if (this.recipients) {
      const users: Array<InstanceType<User> | null> = [];
      for (const recipient of this.recipients) {
        users.push(await UserModel.findOne({snowflake: recipient}));
      }
      const userObjs: Array<IUserObject | undefined> = users.map((user) => {
        if (user) {
          return user.toUserObject();
        } else {
          return;
        }
      });
      const userObjsFiltered: any[] = userObjs.filter((user) => !!user);
      channelObject.recipients = userObjsFiltered;
    }
    return channelObject;
  }

  @instanceMethod
  public async getOwnerID(this: InstanceType<Channel>): Promise<string | null> {
    const guild = await this.getGuild();
    if (guild) {
      return guild.ownerID;
    } else {
      return null;
    }
  }

  @instanceMethod
  public async getPermissionOverride(this: InstanceType<Channel>, snowflake: string): Promise<PermissionOverwrite | undefined> {
    if (!this.permissionOverwrites) {
      return;
    }
    let overwrite: PermissionOverwrite | undefined;
    for (let i = 0; i < this.permissionOverwrites.length; i++) {
      const res = this.permissionOverwrites[i];
      if (res && res.id === snowflake) {
        overwrite = res;
        break;
      }
    }
    return overwrite;
  }

  @instanceMethod
  public async getGuild(this: InstanceType<Channel>): Promise<InstanceType<GuildModel> | null> {
    if (!this.guildID) {
      return null;
    }
    return await Guild.findOne({snowflake: this.guildID});
  }
}

const ChannelModel = new Channel().getModelForClass(Channel);

export default ChannelModel;

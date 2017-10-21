/* tslint:disable:object-literal-sort-keys */
import * as mongoose from "mongoose";
import {arrayProp, instanceMethod, InstanceType, ModelType, prop, staticMethod, Typegoose} from "typegoose";
import Server from "../../server";
import Guild from "./Guild";
import { Guild as GuildModel } from "./Guild";
import MessageModel from "./Message";
import {IMessageObject, Message} from "./Message";
import UserModel from "./User";
import {IUserObject, User} from "./User";

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

export class PermissionOverwrites extends Typegoose {
  @prop()
  public id: string;

  @prop()
  public type: "role" | "member";

  @prop()
  public allow: number;

  @prop()
  public deny: number;
}

export class Channel extends Typegoose {

  @staticMethod
  public static async getChannel(
      this: ModelType<Channel> & Channel,
      channelID: string): Promise<InstanceType<Channel> | null> {
    let channel = await ChannelModel.findById(channelID);
    if (!channel) {
      const results = await ChannelModel.find({parentID: channelID});
      if (results.length === 0) {
        return null;
      }
      channel = results[0];
    }
    return channel;
  }

  @prop()
  public id: string;

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

  @arrayProp({items: PermissionOverwrites})
  public permissionOverwrites?: PermissionOverwrites[];

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
  public async getMessages(this: InstanceType<Channel>): Promise<Array<InstanceType<Message>>> {
    return await MessageModel.find({channelID: this._id});
  }

  @instanceMethod
  public async getMessageObjects(this: InstanceType<Channel>): Promise<IMessageObject[]> {
    return Promise.all((await this.getMessages()).map((message) => message.toMessageObject()));
  }

  @instanceMethod
  public async sendMessage(this: InstanceType<Channel>, message: IMessageObject): Promise<IMessageObject> {
    const messageSchema = new MessageModel();
    console.log(message);
    messageSchema.authorID = message.author && message.author.id || "";
    messageSchema.channelID = this._id;
    messageSchema.content = message.content;
    messageSchema.mentionEveryone = message.mention_everyone;
    messageSchema.nonce = (message.nonce as string);
    messageSchema.pinned = message.pinned;
    messageSchema.roleMentions = message.mention_roles;
    messageSchema.tts = message.tts;
    messageSchema.webhookID = (message.webhook_id as string);
    await messageSchema.save();
    const guild = await this.getGuild();
    const messageObj = await messageSchema.toMessageObject();
    if (guild) {
      await guild.dispatch(messageObj, "MESSAGE_CREATE");
    }
    return messageObj;
  }

  @instanceMethod
  public async toChannelObject(this: InstanceType<Channel>): Promise<IChannelObject> {
    const channelObject: IChannelObject = {
      id: this.default ? this.parentID : this._id,
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
      messages: await this.getMessageObjects(),
    };
    if (this.recipients) {
      const users: Array<InstanceType<User> | null> = [];
      for (const recipient of this.recipients) {
        users.push(await UserModel.findById(recipient));
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
  public async getGuild(this: InstanceType<Channel>): Promise<InstanceType<GuildModel> | null> {
    if (!this.guildID) {
      return null;
    }
    return await Guild.findById(this.guildID);
  }
}

const ChannelModel = new Channel().getModelForClass(Channel);

export default ChannelModel;

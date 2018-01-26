/* tslint:disable:object-literal-sort-keys */
import * as mongoose from "mongoose";
import {arrayProp, instanceMethod, InstanceType, ModelType, pre, prop, staticMethod, Typegoose} from "typegoose";
import Server from "../../server";
import Embed from "./Message/Embed";
import {Embed as EmbedModel, IEmbedObject} from "./Message/Embed";
import User, { IUserRequestProps } from "./User";
import {IUserObject, User as UserModel} from "./User";

import {generate as generateSnowflake} from "../SnowflakeUtils";
import { IMessageRequestProps } from "./Channel";
import { AcceptedUpdatesSchema } from "../Constants";
import { BodyField } from "../../routes/v6/channels/{channel_specific}/guards";

export interface IMessageObject {
  id: string;
  channel_id: string;
  author: IUserObject | null;
  content: string;
  timestamp: string;
  edited_timestamp: string | null;
  tts: boolean;
  mention_everyone: boolean;
  mentions: IUserObject[];
  mention_roles: string[];
  attachments: any[];
  embeds: IEmbedObject[];
  reactions?: any[];
  nonce: string | null;
  pinned: boolean;
  webhook_id: string | null;
  type: number;
}

export interface IInternalMessageObject {
  author: string;
  content: string;
  timestamp?: Date;
  tts?: boolean;
  mentionEveryone: boolean;
  mentions: string[];
  mentionRoles: string[];
  embeds: IEmbedObject[];
  nonce: string | null;
}

export const AcceptedUpdates: AcceptedUpdatesSchema = {
  content: {
    type: "string",
  },
};

export const AcceptedBodyUpdates: BodyField[] = Object.keys(AcceptedUpdates).map((name) => ({name, type: AcceptedUpdates[name].type, optional: true}));

const filterRoles = (rawRole: string): string => {
  if (rawRole.startsWith("<@")) {
    rawRole = rawRole.substring(2);
  }
  if (rawRole.endsWith(">")) {
    rawRole = rawRole.substring(0, rawRole.length - 1);
  }
  return rawRole;
};

const USER_REGEX = /(?:<@)([0-9]+)(?:>)/g;
const ROLE_REGEX = /(?:<@&)([0-9]+)(?:>)/g;
const EVERYONE_PATTERN = /@(everyone|here)/g;

const sanitize = async (original: string[] | null): Promise<string[]> => {
  if (!original) {
    return [];
  }
  const sanitized: string[] = [];
  for (let i = 0; i < original.length; i++) {
    if (original[i].startsWith("<@")) {
      continue;
    }
    sanitized.push(original[i]);
  }
  return sanitized;
};

@pre<Message>("save", async function(next) {
const userMatch = await sanitize(USER_REGEX.exec(this.content));
const roleMatch = await sanitize(ROLE_REGEX.exec(this.content));
const everyone = !!this.content.match(EVERYONE_PATTERN);
this.mentionEveryone = everyone;
this.roleMentions = roleMatch;
this.mentions = userMatch;
next();
})
export class Message extends Typegoose {

  @staticMethod
  public static async assembleMessageObject(
      this: ModelType<Message> & Message,
      author: InstanceType<UserModel>,
      data: {content: string; [key: string]: any}): Promise<IMessageObject> {
        const roleMentions = ROLES_PATTERN.exec(data.content);
        const messageObject: IMessageObject = {
          author: author.snowflake,
          content: data.content,
          mention_everyone: !!EVERYONE_PATTERN.exec(data.content),
          mention_roles: roleMentions && roleMentions.map(filterRoles) || [],
          nonce: data.nonce || null,
          id: (null as any),
          channel_id: data.channelID || (null as any),
          timestamp: (null as any),
          edited_timestamp: null,
          tts: data.tts || false,
          
        }
  }

  @prop({default: generateSnowflake, required: true})
  public snowflake: string;

  @prop({required: true})
  public channelID: string;

  @prop({required: true})
  public authorID: string;

  @prop({default: null})
  public webhookID: string;

  @prop({required: true})
  public content: string;

  @prop({required: true, default: () => new Date()})
  public timestamp: Date;

  @prop({default: null})
  public editedTimestamp: Date;

  @prop({required: true, default: false})
  public tts: boolean;

  @prop({required: true, default: false})
  public mentionEveryone: boolean;

  @arrayProp({items: String, required: true, default: []})
  public mentions: string[];

  @arrayProp({items: String, required: true, default: []})
  public roleMentions: string[];

  @arrayProp({items: String, required: true, default: []})
  public attachments: string[];

  @arrayProp({items: String, required: true, default: []})
  public embeds: string[];

  @arrayProp({items: String, required: true, default: []})
  public reactions: string[];

  @prop({default: null})
  public nonce: string;

  @prop({required: true, default: false})
  public pinned: boolean;

  @prop({required: true, default: 0})
  public type: 0 | 1 | 2 | 3 | 4 | 5 | 6 | 7;

  @instanceMethod
  public async getAuthor(this: InstanceType<Message>): Promise<InstanceType<UserModel> | null> {
    return await User.findOne({snowflake: this.authorID});
  }

  @instanceMethod
  public async getEmbeds(this: InstanceType<Message>): Promise<Array<InstanceType<EmbedModel>>> {
    return this.getEntities(this.embeds, Embed, new EmbedModel());
  }

  @instanceMethod
  public async getMentions(this: InstanceType<Message>): Promise<Array<InstanceType<UserModel>>> {
    return this.getEntities(this.mentions, User, new UserModel());
  }

  @instanceMethod
  public async getEmbedObjects(this: InstanceType<Message>): Promise<IEmbedObject[]> {
    return Promise.all((await this.getEmbeds()).map(async (embed) => await embed.toEmbedObject()));
  }

  @instanceMethod
  public async getMentionObjects(this: InstanceType<Message>): Promise<IUserObject[]> {
    return Promise.all((await this.getMentions()).map((user) => user.toUserObject()));
  }

  @instanceMethod
  public async getAuthorObject(this: InstanceType<Message>, props?: IUserRequestProps): Promise<IUserObject | null> {
    const author = await this.getAuthor();
    return author && await author.toUserObject(props);
  }

  @instanceMethod
  public async toMessageObject(this: InstanceType<Message>, props?: IMessageRequestProps): Promise<IMessageObject> {
    return {
      id: this.snowflake,
      channel_id: this.channelID,
      author: await this.getAuthorObject(props && props.author),
      content: this.content,
      timestamp: this.timestamp.toISOString(),
      edited_timestamp: this.editedTimestamp ? this.editedTimestamp.toISOString() : null,
      tts: this.tts,
      mention_everyone: this.mentionEveryone,
      mentions: await this.getMentionObjects(),
      mention_roles: this.roleMentions,
      attachments: [],
      embeds: await this.getEmbedObjects(),
      reactions: [],
      nonce: this.nonce,
      pinned: this.pinned,
      webhook_id: this.webhookID,
      type: this.type,
    };
  }

  @instanceMethod
  private async getEntities<T extends Typegoose>(
                                  this: InstanceType<Message>,
                                  ids: string[],
                                  document: mongoose.Model<InstanceType<T>>,
                                  model: T): Promise<Array<InstanceType<T>>> {
    const entities: Array<InstanceType<T>> = [];
    for (const id of ids) {
      const entity = await document.findOne({snowflake: id});
      if (entity) {
        entities.push(entity);
      }
    }
    return entities;
  }
}

const MessageModel = new Message().getModelForClass(Message);

export default MessageModel;

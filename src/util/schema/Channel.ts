/* tslint:disable:object-literal-sort-keys */
import * as mongoose from "mongoose";
import {arrayProp, instanceMethod, InstanceType, ModelType, prop, staticMethod, Typegoose} from "typegoose";
import Server from "../../server";
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
  owner_id?: string;
  application_id?: string;
  parent_id?: string;
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

  @prop()
  public nsfw?: boolean = false;

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
  public ownerID?: string;

  @prop()
  public applicationID?: string;

  @prop()
  public parentID?: string;

  @instanceMethod
  public async toChannelObject(this: InstanceType<Channel>): Promise<IChannelObject> {
    const channelObject: IChannelObject = {
      id: this._id,
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
      owner_id: this.ownerID,
      application_id: this.applicationID,
      parent_id: this.parentID,
    };
    if (this.recipients) {
      const users: Array<InstanceType<User> | null> = [];
      this.recipients.forEach(async (recipient) => {
        users.push(await UserModel.findById(recipient));
      });
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
}

const ChannelModel = new Channel().getModelForClass(Channel);

export default ChannelModel;

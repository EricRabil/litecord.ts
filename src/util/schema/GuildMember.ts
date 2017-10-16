/* tslint:disable:object-literal-sort-keys */
import * as mongoose from "mongoose";
import {arrayProp, instanceMethod, InstanceType, ModelType, prop, staticMethod, Typegoose} from "typegoose";
import Server from "../../server";
import User from "./User";
import {IUserObject, User as UserModel} from "./User";

export interface IGuildMemberObject {
  user?: IUserObject;
  nick?: string;
  roles: string[];
  joined_at: string;
  deaf: boolean;
  mute: boolean;
}

export class GuildMember extends Typegoose {

  /**
   * The user ID of this member - must be converted to a user object
   *
   * @type {string}
   * @memberof GuildMember
   */
  @prop()
  public user: string;

  @prop()
  public nick?: string;

  /**
   * Array of role IDs - is NOT converted to a role object
   *
   * @type {string[]}
   * @memberof GuildMember
   */
  @arrayProp({items: String})
  public roles: string[] = [];

  @prop()
  public joinedAt: Date;

  @prop()
  public deaf: boolean = false;

  @prop()
  public mute: boolean = false;

  @instanceMethod
  public async toGuildMemberObject(this: InstanceType<GuildMember>): Promise<IGuildMemberObject> {
    const user = await User.findById(this.user);
    const obj: IGuildMemberObject = {
      nick: this.nick,
      roles: this.roles,
      joined_at: this.joinedAt.toISOString(),
      deaf: this.deaf,
      mute: this.mute,
    };
    if (user) {
      obj.user = user.toUserObject();
    }
    return obj;
  }

  @instanceMethod
  public async getUser(this: InstanceType<GuildMember>): Promise<InstanceType<UserModel> | null> {
    const user = await User.findById(this.user);
    return user;
  }
}

const GuildMemberModel = new GuildMember().getModelForClass(GuildMember);

export default GuildMemberModel;

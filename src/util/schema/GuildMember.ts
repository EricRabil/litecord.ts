/* tslint:disable:object-literal-sort-keys */
import * as mongoose from "mongoose";
import {arrayProp, instanceMethod, InstanceType, ModelType, prop, staticMethod, Typegoose} from "typegoose";
import Server from "../../server";
import Guild from "./Guild";
import {Guild as GuildModel, IGuildObject} from "./Guild";
import User from "./User";
import {IUserObject, User as UserModel} from "./User";

import {generate as generateSnowflake} from "../SnowflakeUtils";
import Role, { RoleModel as RoleModel } from "./Role";
import { getEntities } from "../Util";
import { Channel } from "./Channel";

export interface IGuildMemberObject {
  user?: IUserObject;
  nick?: string;
  roles: string[];
  joined_at: string;
  deaf: boolean;
  mute: boolean;
}

export class GuildMember extends Typegoose {

  @prop({default: generateSnowflake, required: true})
  public snowflake: string;

  /**
   * The user ID of this member - must be converted to a user object
   *
   * @type {string}
   * @memberof GuildMember
   */
  @prop({required: true})
  public user: string;

  @prop({required: true})
  public guild: string;

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

  @prop({required: true, default: () => new Date()})
  public joinedAt: Date;

  @prop({required: true, default: false})
  public deaf: boolean;

  @prop({required: true, default: true})
  public mute: boolean;

  @instanceMethod
  public async toGuildMemberObject(this: InstanceType<GuildMember>): Promise<IGuildMemberObject> {
    const user = await User.findOne({snowflake: this.user});
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
  public async getPermissions(this: InstanceType<GuildMember>, channel?: InstanceType<Channel>): Promise<number> {
  }

  @instanceMethod
  public async getUser(this: InstanceType<GuildMember>): Promise<InstanceType<UserModel> | null> {
    const user = await User.findOne({snowflake: this.user});
    return user;
  }

  @instanceMethod
  public getRoles(this: InstanceType<GuildMember>): Promise<Array<InstanceType<RoleModel>>> {
    return getEntities(this.roles, Role, new RoleModel());
  }

  @instanceMethod
  public async getUserObject(this: InstanceType<GuildMember>): Promise<IUserObject | null> {
    const user = await this.getUser();
    if (!user) {
      return null;
    }
    return await user.toUserObject();
  }

  @instanceMethod
  public async getGuild(this: InstanceType<GuildMember>): Promise<InstanceType<GuildModel>> {
    const guild = await Guild.findOne({snowflake: this.guild});
    return guild as any;
  }

  @instanceMethod
  public async getGuildObject(this: InstanceType<GuildMember>): Promise<IGuildObject | null> {
    const guild = await this.getGuild();
    if (!guild) {
      return null;
    }
    return await guild.toGuildObject();
  }
}

const GuildMemberModel = new GuildMember().getModelForClass(GuildMember);

export default GuildMemberModel;

/* tslint:disable:object-literal-sort-keys max-line-length */
import * as bcrypt from "bcrypt";
import * as jsonwebtoken from "jsonwebtoken";
import * as mongoose from "mongoose";
import {arrayProp, instanceMethod, InstanceType, ModelType, pre, prop, Ref, staticMethod, Typegoose, post} from "typegoose";
import Server from "../../server";
import {can as hasPermission} from "../PermissionUtils";
import Guild, {Guild as GuildModel} from "./Guild";
import {IGuildObject} from "./Guild";
import {UserMetadata, UserMetadataKeyMap, SettingsKeyMap, UserGuildSettingsKeyMap, generateMetadata} from "./User/UserMetadata";

import {generate as generateSnowflake} from "../SnowflakeUtils";
import { remapObject, remapObjectArray, getEntities } from "../Util";
import { AcceptedUpdatesSchema, DiscordGuild } from "../Constants";
import { MongooseDocument } from "mongoose";

export interface IUserObject {
  id: string;
  username: string;
  discriminator: number;
  avatar?: string;
  bot?: boolean;
  mfa_enabled?: boolean;
  verified?: boolean;
  email?: string;
  flags?: number;
  premium?: boolean;
}

export interface IUserRequestProps {
  include?: boolean;
  more?: boolean;
}

export type SettingsEntry = string | number | {[key: string]: SettingsEntry} | boolean | Array<string | number | boolean>;

// avatar discriminator email new_password password username
export const AcceptedUserUpdates: AcceptedUpdatesSchema = {
  avatar: {
    type: "string",
  },
  discriminator: {
    type: "number",
  },
  email: {
    type: "string",
  },
  username: {
    type: "string",
  },
};
export const AllowedStatuses = ["idle", "dnd", "online", "offline"];

@pre<User>("save", async function(next) {
  if (!AllowedStatuses.includes(this.metadata.userSettings.status)) {
    this.metadata.userSettings.status = AllowedStatuses[0];
  }
  if (this.isModified("metadata.userSettings.status")) {
    this.getGuilds().then((guilds) => {
      for (let i = 0; i < guilds.length; i++) {
        const guild = guilds[i];
        guild.dispatch({
          user: {
            id: this.snowflake,
          },
          roles: [],
          guild_id: guild.snowflake,
          status: this.metadata.userSettings.status,
        }, "PRESENCE_UPDATE");
      }
    });
  }
  next();
})
@post<User>("init", async (result, next) => {
  if (!result.metadata) {
    result.metadata = generateMetadata();
  }
  if (next) {
    next();
  }
})
export class User extends Typegoose {

  @staticMethod
  public static async authenticate(this: ModelType<User>, token: string): Promise<boolean> {
    return false;
  }

  @prop({default: generateSnowflake, required: true})
  public snowflake: string;

  @prop({required: true})
  public username: string;

  @prop({unique: true, required: true})
  public email: string;

  @prop({required: true})
  public password: string;

  @prop({required: true})
  public discriminator: number;

  @arrayProp({items: String, required: true, default: []})
  public guilds: string[];

  @prop()
  public metadata: UserMetadata;

  @prop({default: 7})
  public flags: number;

  @instanceMethod
  public async setPassword(this: InstanceType<User>, password: string): Promise<void> {
    const salt = await bcrypt.genSalt(10);
    const hash = await bcrypt.hash(password, salt);
    this.password = hash;
    return;
  }

  @instanceMethod
  public async comparePasswords(this: InstanceType<User>, password: string): Promise<boolean> {
    return bcrypt.compare(password, this.password);
  }

  @instanceMethod
  public isInGuild(this: InstanceType<User>, guild: InstanceType<GuildModel>): boolean {
    return guild.members.includes(this.snowflake);
  }

  @instanceMethod
  public async newDiscriminator(this: InstanceType<User>): Promise<number> {
    const rollTheDice = async (): Promise<number> => {
      const discrim = Math.floor(Math.random() * 9999);
      const docs = await this.collection.findOne({username: this.username, discriminator: discrim});
      if (docs) {
        return rollTheDice();
      } else {
        this.discriminator = discrim;
        return this.discriminator;
      }
    };
    return rollTheDice();
  }

  @instanceMethod
  public async generateToken(this: InstanceType<User>): Promise<string> {
    return Server.generateToken(this);
  }

  @instanceMethod
  public async validateToken(this: InstanceType<User>, token: string): Promise<boolean> {
    return await !!Server.validateToken(token);
  }

  @instanceMethod
  public toUserObject(this: InstanceType<User>, opts?: IUserRequestProps): IUserObject {
    let userObject: IUserObject = {
      username: this.username,
      id: this.snowflake,
      discriminator: this.discriminator,
    };
    if (!opts ? true : opts.more) {
      userObject = {
        ...userObject,
        bot: false,
        mfa_enabled: false,
        verified: true,
        email: this.email,
        flags: this.flags,
        premium: true,
      };
    }
    return userObject;
  }

  @instanceMethod
  public getGuilds(): Promise<DiscordGuild[]> {
    return getEntities(this.guilds, Guild, new GuildModel());
  }

  @instanceMethod
  public async getGuildObjects(this: InstanceType<User>, more: boolean = false): Promise<IGuildObject[]> {
    const guilds = await this.getGuilds();
    const guildObjects: IGuildObject[] = [];
    const queries: Array<Promise<any>> = [];
    const push = guildObjects.push.bind(guildObjects);
    for (let i = 0; i < guilds.length; i++) {
      const guild = guilds[i];
      queries.push(guild.toGuildObject(more).then(push));
    }
    await Promise.all(queries);
    return guildObjects;
  }

  @instanceMethod
  public async dispatch(data: any, event: string): Promise<void> {
    await Server.socketManager.send(this.snowflake, data, event);
  }

  @instanceMethod
  public async getMetadata(this: InstanceType<User>): Promise<{[key: string]: any}> {
    if (!this.metadata) {
      return {};
    }
    const meta = await remapObject(UserMetadataKeyMap, this.metadata);
    meta[UserMetadataKeyMap.userSettings] = await remapObject(SettingsKeyMap, meta[UserMetadataKeyMap.userSettings]);
    meta[UserMetadataKeyMap.userGuildSettings] = await remapObjectArray(UserGuildSettingsKeyMap, meta[UserMetadataKeyMap.userGuildSettings]);
    return meta;
  }
}

const UserModel = new User().getModelForClass(User);

export {IGuildObject} from "./Guild";
export default UserModel;

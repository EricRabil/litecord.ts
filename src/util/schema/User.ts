/* tslint:disable:object-literal-sort-keys */
import * as bcrypt from "bcrypt";
import * as jsonwebtoken from "jsonwebtoken";
import * as mongoose from "mongoose";
import {arrayProp, instanceMethod, InstanceType, ModelType, prop, staticMethod, Typegoose} from "typegoose";
import Server from "../../server";
import Guild from "./Guild";
import {IGuildObject} from "./Guild";

export interface IUserObject {
  id: string;
  username: string;
  discriminator: number;
  avatar: string;
  bot?: boolean;
  mfa_enabled?: boolean;
  verified?: boolean;
  email?: string;
}

export class User extends Typegoose {

  @staticMethod
  public static async authenticate(this: ModelType<User>, token: string): Promise<boolean> {
    return false;
  }

  @prop({required: true})
  public username: string;

  @prop({unique: true, required: true})
  public email: string;

  @prop({required: true})
  public password: string;

  @prop({required: true})
  public discriminator: number;

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
  public toUserObject(this: InstanceType<User>): IUserObject {
    return {
      id: this._id,
      username: this.username,
      discriminator: this.discriminator,
      avatar: "no bitch",
      bot: false,
      mfa_enabled: false,
      verified: true,
      email: this.email,
    };
  }

  @instanceMethod
  public async getGuilds(this: InstanceType<User>): Promise<IGuildObject[]> {
    const guilds = await Guild.find();
    const serializations: Array<Promise<IGuildObject>> = [];
    guilds.forEach((guild) => serializations.push(guild.toGuildObject()));
    return Promise.all(serializations);
  }
}

const UserModel = new User().getModelForClass(User);

export {IGuildObject} from "./Guild";
export default UserModel;

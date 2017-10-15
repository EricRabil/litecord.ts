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
  public static authenticate(this: ModelType<User>, token: string): Promise<boolean> {
    return new Promise((resolve, reject) => {
      // this.findOne
    });
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
  public setPassword(this: InstanceType<User>, password: string): Promise<void> {
    return new Promise((resolve, reject) => {
      bcrypt.genSalt(10).then((salt) => {
        bcrypt.hash(password, salt).then((hash) => {
          this.password = hash;
          resolve();
        }).catch(reject);
      }).catch(reject);
    });
  }

  @instanceMethod
  public comparePasswords(this: InstanceType<User>, password: string): Promise<boolean> {
    return bcrypt.compare(password, this.password);
  }

  @instanceMethod
  public newDiscriminator(this: InstanceType<User>): Promise<void> {
    return new Promise((resolve, reject) => {
      const rollTheDice = (): void => {
        const discrim = Math.floor(Math.random() * 9999);
        this.collection.findOne({username: this.username, discriminator: discrim}).then((docs) => {
          if (docs) {
            rollTheDice();
          } else {
            this.discriminator = discrim;
            resolve();
          }
        }).catch(reject);
      };
      rollTheDice();
    });
  }

  @instanceMethod
  public generateToken(this: InstanceType<User>): Promise<string> {
    return Server.generateToken(this);
  }

  @instanceMethod
  public validateToken(this: InstanceType<User>, token: string): Promise<boolean> {
    return Server.validateToken(token).then((validated) => !!validated);
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
  public getGuilds(this: InstanceType<User>): Promise<IGuildObject[]> {
    return new Promise((resolve, reject) => {
      Guild.find().then((guilds) => {
        const serializations: Array<Promise<IGuildObject>> = [];
        guilds.forEach((guild) => serializations.push(guild.toGuildObject()));
        resolve(Promise.all(serializations));
      });
    });
  }
}

const UserModel = new User().getModelForClass(User);

export {IGuildObject} from "./Guild";
export default UserModel;

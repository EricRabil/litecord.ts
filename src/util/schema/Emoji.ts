/* tslint:disable:object-literal-sort-keys */
import * as mongoose from "mongoose";
import {arrayProp, instanceMethod, InstanceType, ModelType, prop, staticMethod, Typegoose} from "typegoose";
import Server from "../../server";
import User from "./User";

export interface IEmojiObject {
  id: string;
  name: string;
  roles: string[];
  user?: object;
  require_colons: boolean;
  managed: boolean;
}

export class Emoji extends Typegoose {
  @prop()
  public name: string;

  /**
   * Array of role ids - is NOT converted to role objects
   *
   * @type {string[]}
   * @memberof Emoji
   */
  @arrayProp({items: String})
  public roles: string[];

  /**
   * User id of creator - must be converted to user object
   *
   * @type {string}
   * @memberof Emoji
   */
  @prop()
  public user?: string;

  @prop()
  public requireColons: boolean = true;

  @prop()
  public managed: boolean = false;

  @instanceMethod
  public toEmojiObject(this: InstanceType<Emoji>): Promise<IEmojiObject> {
    return new Promise((resolve, reject) => {
      const emojiObject: IEmojiObject = {
        id: this._id,
        name: this.name,
        roles: this.roles,
        require_colons: this.requireColons,
        managed: this.managed,
      };
      if (this.user) {
        User.findById(this.user).then((doc) => {
          if (!doc) {
            resolve(emojiObject);
          } else {
            emojiObject.user = doc.toUserObject();
            resolve(emojiObject);
          }
        });
      } else {
        return resolve(emojiObject);
      }
    });
  }
}

const EmojiModel = new Emoji().getModelForClass(Emoji);

export default EmojiModel;

import * as mongoose from "mongoose";
import {arrayProp, instanceMethod, InstanceType, ModelType, prop, staticMethod, Typegoose} from "typegoose";
import Server from "../../server";

export interface IRoleObject {
  id: string;
  name: string;
  color: number;
  hoist: boolean;
  position: number;
  managed: boolean;
  mentionable: boolean;
}

export class Role extends Typegoose {
  @prop()
  public name: string;

  @prop()
  public color: number;

  @prop()
  public hoist: boolean = false;

  @prop()
  public position: number;

  @prop()
  public managed: boolean = false;

  @prop()
  public mentionable: boolean = false;

  @instanceMethod
  public toRoleObject(this: InstanceType<Role>): IRoleObject {
    return Object.assign({id: this._id}, this);
  }
}

const RoleModel = new Role().getModelForClass(Role);

export default RoleModel;

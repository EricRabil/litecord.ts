import * as mongoose from "mongoose";
import {arrayProp, instanceMethod, InstanceType, ModelType, prop, Ref, staticMethod, Typegoose} from "typegoose";
import Server from "../../server";

import {generate as generateSnowflake} from "../SnowflakeUtils";
import { PermissionOverwrite } from "../Util";
import { DEFAULT_PERMISSIONS } from "../Constants";

export interface IRoleObject {
  id: string;
  name: string;
  color: number;
  hoist: boolean;
  position: number;
  managed: boolean;
  mentionable: boolean;
  permissions: number;
}

export class Permissions extends Typegoose {
  @prop({required: true, default: DEFAULT_PERMISSIONS})
  public allow: number;

  @prop({required: true, default: 0})
  public deny: number;
}

export class RoleModel extends Typegoose {

  @prop({default: generateSnowflake, required: true})
  public snowflake: string;

  @prop()
  public name: string;

  @prop()
  public color: number;

  @prop({default: false})
  public hoist: boolean;

  @prop()
  public position: number;

  @prop({default: false})
  public managed: boolean;

  @prop({default: false})
  public mentionable: boolean;

  @prop({required: true, default: () => ({allow: 0, deny: 0})})
  public permissions: {
    allow: number;
    deny: number;
  };

  @instanceMethod
  public computePermissions(this: InstanceType<RoleModel>): number {
    let permissions: number = 0;
    permissions |= this.permissions.allow;
    permissions &= ~this.permissions.deny;
    console.log(permissions);
    return permissions;
  }

  @instanceMethod
  public toRoleObject(this: InstanceType<RoleModel>): IRoleObject {
    const roleObject: IRoleObject = {
      id: this.snowflake,
      name: this.name,
      color: this.color,
      hoist: this.hoist,
      position: this.position,
      managed: this.managed,
      mentionable: this.mentionable,
      permissions: this.computePermissions(),
    };
    return roleObject;
  }
}

const Role = new RoleModel().getModelForClass(RoleModel);

export default Role;

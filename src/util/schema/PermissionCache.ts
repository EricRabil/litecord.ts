/* tslint:disable:object-literal-sort-keys */
import * as mongoose from "mongoose";
import {arrayProp, instanceMethod, InstanceType, ModelType, prop, staticMethod, Typegoose} from "typegoose";
import Server from "../../server";

export class PermissionCacheModel extends Typegoose {
    @prop({required: true, unique: true})
    public snowflake: string;

    @prop({required: true})
    public permissions: number;
}

const Model = new PermissionCacheModel().getModelForClass(PermissionCacheModel);

export default Model;

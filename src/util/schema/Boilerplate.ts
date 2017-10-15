/* tslint:disable:object-literal-sort-keys */
import * as mongoose from "mongoose";
import {arrayProp, instanceMethod, InstanceType, ModelType, prop, staticMethod, Typegoose} from "typegoose";
import Server from "../../server";

export class Boilerplate extends Typegoose {
}

const Model = new Boilerplate().getModelForClass(Boilerplate);

export default Model;

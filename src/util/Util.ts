/* tslint:disable:max-line-length interface-name ordered-imports */
import {Document, Model} from "mongoose";
import * as util from "util";
import * as zlib from "zlib";
import {User} from "./schema/User";
import { Typegoose, InstanceType, prop } from "typegoose";
import { Guild } from "./schema/Guild";
import { Response } from "express";

import {DEFAULT_PERMISSIONS, AcceptedUpdatesSchema} from "./Constants";

export function extractKeyValue(obj: object, value: string) {
  return Object.keys(obj)[Object.values(obj).indexOf(value)];
}

export interface DiscordRequest extends Request {
  body: {[key: string]: any};
  user: (User & Document);
  params: any;
  query: {[key: string]: string | undefined};
}

export interface DiscordResponse extends Response {
  reject(code: number): Promise<void>;
}

export async function getEntities<T extends Typegoose>(
  ids: string[],
  document: Model<InstanceType<T>>,
  model: T): Promise<Array<InstanceType<T>>> {
    let rawEntities: Array<InstanceType<T>>;
    const lookups: Array<Promise<InstanceType<T>>> = [];
    for (let i = 0; i < ids.length; i++) {
      lookups.push(document.findOne({snowflake: ids[i]}) as any as Promise<InstanceType<T>>);
    }
    rawEntities = await Promise.all(lookups);
    const entities: Array<InstanceType<T>> = [];
    for (let i = 0; i < rawEntities.length; i++) {
      if (!!rawEntities[i]) {
        entities.push(rawEntities[i]);
      }
    }
    return entities;
}

export function reverseObject(obj: {[key: string]: string}): {[key: string]: string} {
  const invertedObject: {[key: string]: string} = {};
  const keys = Object.keys(obj);
  for (let i = 0; i < keys.length; i++) {
    invertedObject[obj[keys[i]]] = keys[i];
  }
  return invertedObject;
}

export async function remapObject(replacementKeys: {[key: string]: string}, object: {[key: string]: any}): Promise<{[key: string]: any}> {
  if (!replacementKeys) {
    return object;
  }
  const remappedObject: {[key: string]: any} = {};
  const keys = Object.keys(object || {});
  for (let i = 0; i < keys.length; i++) {
    const key = keys[i];
    const replacementKey = replacementKeys[key];
    if (replacementKey) {
      remappedObject[replacementKey] = object[keys[i]];
    } else {
      remappedObject[key] = object[key];
    }
  }
  return remappedObject;
}

export async function remapObjectArray(replacementKeys: {[key: string]: string}, array: Array<{[key: string]: any}>): Promise<Array<{[key: string]: any}>> {
  if (!replacementKeys) {
    return array;
  }
  const newArray: Array<{[key: string]: any}> = [];
  const updates: Array<Promise<void>> = [];
  for (let i = 0; i < array.length; i++) {
    updates.push((async () => {
      const item = array[i];
      const newItem: {[key: string]: any} = {};
      const keys = Object.keys(item);
      for (let j = 0; j < keys.length; j++) {
        const key = keys[j];
        const replacementKey = replacementKeys[key] || key;
        newItem[replacementKey] = item[key];
      }
      newArray.push(newItem);
    })());
  }
  await Promise.all(updates);
  return newArray;
}

export async function applyUpdates(original: {[key: string]: any}, updates: {[key: string]: any}, updateSchema: AcceptedUpdatesSchema): Promise<string[]> {
  const updateKeys = Object.keys(updates);
  const diff: string[] = [];
  for (let i = 0; i < updateKeys.length; i++) {
    if (!updateSchema[updateKeys[i]]) {
      console.log(`${updateKeys[i]} 1`);
      continue;
    }
    const key = updateKeys[i];
    const value = updates[key];
    if (typeof value === "undefined" || value === null) {
      console.log(`${updateKeys[i]} 2`);
      continue;
    }
    const schema = updateSchema[key];
    if (schema.type === "array") {
      if (!Array.isArray(key)) {
        console.log(`${updateKeys[i]} 3`);
        continue;
      }
    } else if (schema.type !== typeof value) {
      console.log(`${updateKeys[i]} 4`);
      continue;
    }
    const newKey = schema.mappedValue || key;
    original[newKey] = value;
    diff.push(newKey);
  }
  return diff;
}

export class PermissionOverwrite extends Typegoose {
  @prop()
  public id: string;

  @prop()
  public type: "role" | "member";

  @prop({required: true, default: DEFAULT_PERMISSIONS})
  public allow: number;

  @prop({required: true, default: 0})
  public deny: number;
}

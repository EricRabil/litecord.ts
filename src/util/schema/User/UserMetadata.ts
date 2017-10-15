/* tslint:disable:object-literal-sort-keys variable-name */
import * as mongoose from "mongoose";
import {arrayProp, instanceMethod, InstanceType, ModelType, pre, prop, staticMethod, Typegoose} from "typegoose";
import Server from "../../../server";

export class UserSettings extends Typegoose {

  @prop({default: "en-US"})
  public locale: string;

  @prop({default: "online"})
  public status: string;

  @prop({default: true})
  public showCurrentGame: boolean;

  @prop({default: true})
  public sync: boolean;

  @prop({default: true})
  public inlineAttachmentMedia: boolean;

  @prop({default: true})
  public inlineEmbedMedia: boolean;

  @prop({default: true})
  public renderEmbeds: boolean;

  @prop({default: true})
  public renderReactions: boolean;

  @prop({default: "dark"})
  public theme: string;

  @prop({default: true})
  public enableTTSCommand: boolean;

  @prop({default: false})
  public messageDisplayCompact: boolean;

  @prop({default: true})
  public convertEmoticons: boolean;

  @arrayProp({items: String})
  public restrictedGuilds: string[] = [];

  @prop({default: false})
  public defaultGuildsRestricted: boolean;

  @prop({default: 0})
  public explicitContentFilter: number;

  @prop({default: true})
  public friendSourceFlags: boolean;

  @prop({default: true})
  public developerMode: boolean;

  @arrayProp({items: String})
  public guildPositions: string[] = [];

  @prop({default: false})
  public detectPlatformAccounts: boolean;

  @prop({default: 600})
  public afkTimeout: number;

  [key: string]: any;
}

const UserSettingsModel = new UserSettings().getModelForClass(UserSettings);

export class IUserGuildSettings extends Typegoose {
  @prop()
  public supress_everyone: boolean = false;

  @prop()
  public muted: boolean = false;

  @prop()
  public mobile_push: boolean = true;

  @prop()
  public message_notifications: number = 0;

  @prop({required: true})
  public guild_id: string;
}

export class UserMetadata extends Typegoose {
  @prop()
  public userSettings: UserSettings = new UserSettingsModel();

  /**
   * Due to a limitation with Typegoose, we are incorrectly labeling these values to allow it to run.
   */
  @arrayProp({items: String})
  public notes: string[];

  @arrayProp({items: String})
  public userGuildSettings: string[];

  @arrayProp({items: String})
  public connectedAccounts: string[] = [];

  @prop({default: 0})
  public friendSuggestionCount: number;

  @arrayProp({items: String})
  public experiments: string[] = [];
}

const UserMetadataModel = new UserMetadata().getModelForClass(UserMetadata);

export default UserMetadataModel;

/* tslint:disable:object-literal-sort-keys variable-name */
import * as mongoose from "mongoose";
import {arrayProp, instanceMethod, InstanceType, ModelType, pre, prop, staticMethod, Typegoose} from "typegoose";
import Server from "../../../server";
import { reverseObject } from "../../Util";
import { AcceptedUpdatesSchema } from "../../Constants";

export const SettingsKeyMap = {
  showCurrentGame: "show_current_game",
  inlineAttachmentMedia: "inline_attachment_media",
  inlineEmbedMedia: "inline_embed_media",
  renderEmbeds: "render_embeds",
  renderReactions: "render_reactions",
  sync: "sync",
  theme: "theme",
  enableTTSCommand: "enable_tts_command",
  messageDisplayCompact: "message_display_compact",
  locale: "locale",
  convertEmoticons: "convert_emoticons",
  restrictedGuilds: "restricted_guilds",
  friendSourceFlags: "friend_source_flags",
  developerMode: "developer_mode",
  guildPositions: "guild_positions",
  detectPlatformAccounts: "detect_platform_accounts",
  status: "status",
  explicitContentFilter: "explicit_content_filter",
  defaultGuildsRestricted: "default_guilds_restricted",
  afkTimeout: "afk_timeout",
};

export const SettingsValueMap = reverseObject(SettingsKeyMap);

export class UserSettings extends Typegoose {

  @prop({default: "en-US"})
  public locale: string = "en-US";

  @prop({default: "online"})
  public status: string = "online";

  @prop({default: true})
  public showCurrentGame: boolean = true;

  @prop({default: true})
  public sync: boolean = true;

  @prop({default: true})
  public inlineAttachmentMedia: boolean = true;

  @prop({default: true})
  public inlineEmbedMedia: boolean = true;

  @prop({default: true})
  public renderEmbeds: boolean = true;

  @prop({default: true})
  public renderReactions: boolean = true;

  @prop({default: "dark"})
  public theme: string = "dark";

  @prop({default: true})
  public enableTTSCommand: boolean = true;

  @prop({default: false})
  public messageDisplayCompact: boolean = false;

  @prop({default: true})
  public convertEmoticons: boolean = true;

  @arrayProp({items: String, default: () => []})
  public restrictedGuilds: string[] = [];

  @prop({default: false})
  public defaultGuildsRestricted: boolean = false;

  @prop({default: 0})
  public explicitContentFilter: number = 0;

  @prop({default: true})
  public friendSourceFlags: boolean = true;

  @prop({default: true})
  public developerMode: boolean = true;

  @arrayProp({items: String, default: () => []})
  public guildPositions: string[] = [];

  @prop({default: false})
  public detectPlatformAccounts: boolean = false;

  @prop({default: 600})
  public afkTimeout: number = 600;

  [key: string]: any;
}

export const AcceptedSettingsUpdates: AcceptedUpdatesSchema = {};
const dummySettings = new UserSettings();
Object.keys(dummySettings).forEach((key) => {
  AcceptedSettingsUpdates[(SettingsKeyMap as any)[key]] = {
    type: Array.isArray(dummySettings[key]) ? "array" : typeof dummySettings[key],
    mappedValue: key,
    optional: true,
  };
});

const UserSettingsModel = new UserSettings().getModelForClass(UserSettings);

export const UserGuildSettingsKeyMap = {
  supressEveryone: "supress_everyone",
  muted: "muted",
  mobilePush: "mobile_push",
  messageNotifications: "message_notifications",
  guildID: "guild_id",
};

export const UserGuildSettingsValueMap = reverseObject(UserGuildSettingsKeyMap);

export class UserGuildSettings extends Typegoose {
  @prop({default: false})
  public supressEveryone: boolean = false;

  @prop({default: false})
  public muted: boolean = false;

  @prop({default: true})
  public mobilePush: boolean = true;

  @prop({default: 0})
  public messageNotifications: number = 0;

  @prop()
  public guildID: string;
}

export const UserMetadataKeyMap = {
  userSettings: "user_settings",
  notes: "notes",
  userGuildSettings: "user_guild_settings",
  connectedAccounts: "connected_accounts",
  friendSuggestionCount: "friend_suggestion_count",
  experiments: "experiments",
};

export const UserMetadataValueMap = reverseObject(UserMetadataKeyMap);

export class UserMetadata extends Typegoose {
  @prop()
  public userSettings: UserSettings;

  @arrayProp({items: String, required: true, default: () => []})
  public notes: string[];

  @arrayProp({items: UserGuildSettings})
  public userGuildSettings: UserGuildSettings[] = [];

  @arrayProp({items: String, required: true, default: () => []})
  public connectedAccounts: string[] = [];

  @prop()
  public friendSuggestionCount: number;

  @arrayProp({items: String, required: true, default: () => []})
  public experiments: string[] = [];
}

export const generateMetadata = () => {
  const metadata = new UserMetadata();
  metadata.userSettings = new UserSettings();
  metadata.userGuildSettings = [];
  return metadata;
};

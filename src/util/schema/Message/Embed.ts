/* tslint:disable:object-literal-sort-keys */
import * as mongoose from "mongoose";
import {arrayProp, instanceMethod, InstanceType, ModelType, prop, staticMethod, Typegoose} from "typegoose";
import Server from "../../../server";

export interface IEmbedFooter {
  text?: string;
  iconUrl?: string;
  proxyIconUrl?: string;
}

export interface IEmbedAuthor {
  name?: string;
  url?: string;
  iconUrl?: string;
  proxyIconUrl?: string;
}

export interface IEmbedField {
  name: string;
  value: string;
  inline?: boolean;
}

export interface IEmbedObject {
  title?: string;
  type: "rich";
  description?: string;
  url?: string;
  timestamp: string;
  color?: number;
  footer?: {
    text?: string;
    icon_url?: string;
    proxy_icon_url?: string;
  };
  image?: {
    url: string;
    proxy_url?: string;
    height: number;
    width: number;
  };
  thumbnail?: {
    url: string;
    proxy_url?: string;
    height: number;
    width: number;
  };
  video?: {
    url: string;
    height: number;
    width: number;
  };
  author?: {
    name?: string;
    url?: string;
    icon_url?: string;
    proxy_icon_url?: string;
  };
  fields?: Array<{
    name: string;
    value: string;
    inline: boolean;
  }>;
}

export class EmbedFooter extends Typegoose implements IEmbedFooter {
  @prop()
  public text?: string;

  @prop()
  public iconUrl?: string;

  @prop()
  public proxyIconUrl?: string;
}

export class EmbedImage extends Typegoose {
  @prop({required: true})
  public url: string;

  @prop()
  public proxyUrl: string;

  @prop({required: true})
  public height: number;

  @prop({required: true})
  public width: number;
}

export class EmbedThumbnail extends Typegoose {
  @prop({required: true})
  public url: string;

  @prop()
  public proxyUrl?: string;

  @prop({required: true})
  public height: number;

  @prop({required: true})
  public width: number;
}

export class EmbedVideo extends Typegoose {
  @prop({required: true})
  public url: string;

  @prop({required: true})
  public height: number;

  @prop({required: true})
  public width: number;
}

export class EmbedAuthor extends Typegoose implements IEmbedAuthor {
  @prop()
  public name?: string;

  @prop()
  public url?: string;

  @prop()
  public iconUrl?: string;

  @prop()
  public proxyIconUrl?: string;
}

export class EmbedField extends Typegoose {
  @prop({required: true})
  public name: string;

  @prop({required: true})
  public value: string;

  @prop({required: true, default: false})
  public inline: boolean;
}

export class Embed extends Typegoose {
  @prop()
  public title?: string;

  @prop({required: true, default: "rich"})
  public type: string;

  @prop()
  public description?: string;

  @prop()
  public url?: string;

  @prop({required: true, default: () => new Date()})
  public timestamp: Date;

  @prop()
  public color?: number;

  @prop()
  public embedFooter?: EmbedFooter;

  @prop()
  public embedImage?: EmbedImage;

  @prop()
  public embedThumbnail?: EmbedThumbnail;

  @prop()
  public embedVideo?: EmbedVideo;

  @prop()
  public embedAuthor?: EmbedAuthor;

  @arrayProp({items: EmbedField, default: []})
  public embedFields?: EmbedField[];

  @instanceMethod
  public async addEmbedFooter(this: InstanceType<Embed>, data: IEmbedFooter): Promise<EmbedFooter> {
    const footer: EmbedFooter = new EmbedFooter();
    footer.text = data.text;
    footer.iconUrl = data.iconUrl;
    footer.proxyIconUrl = data.proxyIconUrl;
    this.embedFooter = footer;
    await this.save();
    return footer;
  }

  @instanceMethod
  public async addEmbedAuthor(this: InstanceType<Embed>, data: IEmbedAuthor): Promise<EmbedAuthor> {
    const author: EmbedAuthor = new EmbedAuthor();
    author.iconUrl = data.iconUrl;
    author.name = data.name;
    author.proxyIconUrl = data.proxyIconUrl;
    author.url = data.url;
    this.embedAuthor = author;
    await this.save();
    return author;
  }

  @instanceMethod
  public async addField(this: InstanceType<Embed>, data: IEmbedField): Promise<EmbedField> {
    const field: EmbedField = new EmbedField();
    field.name = data.name;
    field.value = data.value;
    field.inline = data.inline || false;
    if (!this.embedFields) {
      this.embedFields = [];
    }
    this.embedFields.push(field);
    await this.save();
    return field;
  }

  @instanceMethod
  public async toEmbedObject(this: InstanceType<Embed>): Promise<IEmbedObject> {
    const embedObject: IEmbedObject = {
      title: this.title,
      type: "rich",
      description: this.description,
      url: this.url,
      timestamp: this.timestamp.toISOString(),
      color: this.color,
    };
    if (this.embedFooter) {
      embedObject.footer = {
        text: this.embedFooter.text,
        icon_url: this.embedFooter.iconUrl,
        proxy_icon_url: this.embedFooter.proxyIconUrl,
      };
    }
    if (this.embedImage) {
      embedObject.image = {
        url: this.embedImage.url,
        proxy_url: this.embedImage.proxyUrl,
        height: this.embedImage.height,
        width: this.embedImage.width,
      };
    }
    if (this.embedThumbnail) {
      embedObject.thumbnail = {
        url: this.embedThumbnail.url,
        proxy_url: this.embedThumbnail.proxyUrl,
        height: this.embedThumbnail.height,
        width: this.embedThumbnail.width,
      };
    }
    if (this.embedVideo) {
      embedObject.video = {
        url: this.embedVideo.url,
        height: this.embedVideo.height,
        width: this.embedVideo.width,
      };
    }
    if (this.embedAuthor) {
      embedObject.author = {
        name: this.embedAuthor.name,
        url: this.embedAuthor.url,
        icon_url: this.embedAuthor.iconUrl,
        proxy_icon_url: this.embedAuthor.proxyIconUrl,
      };
    }
    if (this.embedFields) {
      embedObject.fields = this.embedFields;
    }
    return embedObject;
  }
}

const EmbedModel = new Embed().getModelForClass(Embed);

export default EmbedModel;

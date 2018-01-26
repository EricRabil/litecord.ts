/* tslint:disable:object-literal-sort-keys */
import {Document} from "mongoose";
import * as zlib from "mz/zlib";
import * as ws from "ws";
import {SocketManager} from "../managers/SocketManager";
import Server from "../server";
import Logger from "../util/Logger";
import Guild from "../util/schema/Guild";
import {IGuildObject} from "../util/schema/Guild";
import {User} from "../util/schema/User";
import UserModel from "../util/schema/User";
import WebsocketCodes from "../util/websocketCodes";
import {extractKeyValue} from "./Util";

const HELLO: object = {
  _trace: ["big-sexy-boy"],
  heartbeat_interval: 12500,
};

async function READY(user: User & Document): Promise<object> {
  const payload = {
    v: 6,
    _trace: ["big-sexy-boy"],
    private_channels: [],
    guilds: (await user.getGuildObjects(true)),
    relationships: [],
    read_state: [],
    user: user.toUserObject(),
    ...(await user.getMetadata()),
  };
  return payload;
}

interface IAuthorizationPacket {
  token: string;
  large_threshold: number;
  compress: boolean;
  properties?: {
    "$os"?: string,
    "$browser"?: string,
    "$device"?: string,
  };
  version: number;
}

const logger: Logger = new Logger(["SocketWrapper"]);

export class SocketWrapper {

  public opened: boolean = true;

  private authenticated: boolean = false;
  private sentSequence: number = 0;
  private snowflake?: string;

  constructor(private socket: ws, private manager: SocketManager, private compression: boolean = false) {
    logger.debug(`New SocketWrapper created`);
    logger.debug(`Compression: ${compression}`);
    this.sendHello();
    this.socket.onmessage = this.onMessage.bind(this);
    this.socket.onclose = this.onClose.bind(this);
    this.socket.onerror = this.onClose.bind(this);
  }

  public onClose(event: {wasClean: boolean, code: number, reason: string, target: ws}): void {
    logger.debug(`Socket was closed - Clean: ${event.wasClean || false} - Code: ${event.code || 0} - Reason: ${event.reason || event.name}`);
    this.opened = false;
    if (this.snowflake) {
      const index = this.manager.sockets[this.snowflake].indexOf(this);
      this.manager.sockets[this.snowflake].splice(index);
    }
    this.socket.onmessage = () => null;
  }

  public onMessage(event: {data: any; type: string; target: ws}): void {
    let data;
    try {
      data = JSON.parse(event.data);
    } catch (e) {
      logger.printError(e);
      logger.debug(`Closing socket because of the oof`);
      this.socket.close(WebsocketCodes.CLOSECODES.UNKNOWN_ERROR);
      return;
    }
    logger.debug(`Data received from socket - OPCode ${data.op} (${extractKeyValue(WebsocketCodes.OPCODES, data.op)})`);
    logger.debug(`Data: ${event.data}`);
    this.decideAction(data);
  }

  public async send(opcode: number,
                    data: any = null,
                    eventName: any = null,
                    compress: boolean = this.compression): Promise<void> {
    data = {
      op: opcode,
      d: data,
    };
    if (opcode !== WebsocketCodes.OPCODES.HEARTBEAT_ACK) {
      data.s = this.sentSequence;
      this.sentSequence++;
    }
    if (eventName) {
      data.t = eventName;
    }
    const jsonData = JSON.stringify(data);
    logger.debug(`Sending data ${jsonData} (compression: ${compress})`);
    if (compress) {
      const result = await zlib.deflate(Buffer.from(jsonData));
      await this._send(result);
    } else {
      await this._send(jsonData);
    }
  }

  private decideAction(data: any): void {
    const opcode = data.op;
    if (opcode && typeof opcode === "number") {
      switch (opcode) {
        case WebsocketCodes.OPCODES.IDENTIFY:
          this.onAuthorization(data.d);
          break;
        case WebsocketCodes.OPCODES.HEARTBEAT:
          this.sendHeartbeat();
          break;
        case WebsocketCodes.OPCODES.GUILD_SYNC:
          this.guildSync(data.d);
          break;
        case WebsocketCodes.OPCODES.VOICE_STATE_UPDATE:
          break;
        default:
          this.unknownOPCode(opcode);
          break;
      }
    } else {
      this.unknownOPCode(opcode);
    }
  }

  private unknownOPCode(opcode: number): void {
    logger.debug(`Unknown opcode: ${opcode}`);
  }

  private sendHeartbeat(): void {
    logger.debug(`Sending heartbeat to socket`);
    this.send(WebsocketCodes.OPCODES.HEARTBEAT_ACK);
  }

  private sendHello(): void {
    logger.debug(`Sending HELLO!`);
    this.send(WebsocketCodes.OPCODES.HELLO, HELLO);
  }

  private async guildSync(data: any): Promise<void> {
    logger.debug(`Sending guild sync`);
    for (const guildID of (data as string[])) {
      const guild = await Guild.findOne({snowflake: guildID});
      if (!guild) {
        continue;
      }
      if (guild.users.indexOf(this.snowflake || "") === -1) {
        continue;
      }
      this.send(WebsocketCodes.OPCODES.DISPATCH, {
        id: guild.snowflake,
        presences: [],
        members: await guild.getMemberObjects(),
      }, "GUILD_SYNC");
    }
  }

  private async onAuthorization(data: any): Promise<void> {
    logger.debug(`Received authorization data`);
    if (this.authenticated) {
      logger.debug(`Closing socket as we are already authenticated`);
      this.close(WebsocketCodes.CLOSECODES.ALREADY_AUTH);
    } else {
      if (this.isAuthenticationPacket(data)) {
        const user = await Server.validateToken(data.token);
        if (user) {
          await this.send(WebsocketCodes.OPCODES.DISPATCH, await READY(user), "READY");
          this.snowflake = user.snowflake;
          this.manager.registerSocket(user.snowflake, this);
        } else {
          this.close(WebsocketCodes.CLOSECODES.AUTH_FAILED);
        }
      } else {
        this.close(WebsocketCodes.CLOSECODES.AUTH_FAILED);
      }
    }
  }

  private async close(code: number): Promise<void> {
    if (!WebsocketCodes.CLOSEREASONS[code]) {
      throw new Error("Invalid close code");
    }
    this.socket.close(code, WebsocketCodes.CLOSEREASONS[code]);
    return;
  }

  private async _send(data: any): Promise<void> {
    this.socket.send(data, (e) => {
      if (e) {
        throw e;
      }
    });
  }

  private isAuthenticationPacket(data: any): data is IAuthorizationPacket {
    const token = data.token;
    if (!token) {
      return false;
    }
    if (typeof token !== "string") {
      return false;
    }
    return true;
  }
}

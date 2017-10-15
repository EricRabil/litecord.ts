/* tslint:disable:object-literal-sort-keys */
import {Document} from "mongoose";
import * as zlib from "mz/zlib";
import * as ws from "ws";
import Server from "../server";
import Logger from "../util/Logger";
import {User} from "../util/schema/User";
import UserModel from "../util/schema/User";
import WebsocketCodes from "../util/websocketCodes";
import {extractKeyValue} from "./Util";

const HELLO: object = {
  _trace: ["big-sexy-boy"],
  heartbeat_interval: 12500,
};

function READY(user: User & Document): object {
  const payload = {
    v: 6,
    _trace: ["big-sexy-boy"],
    private_channels: [],
    guilds: [],
    relationships: [],
    user: user.toUserObject(),
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

  private authenticated: boolean = false;
  private sentSequence: number = 0;

  constructor(private socket: ws, private compression: boolean = false) {
    logger.debug(`New SocketWrapper created`);
    logger.debug(`Compression: ${compression}`);
    this.sendHello();
    this.socket.onmessage = this.onMessage.bind(this);
    this.socket.onclose = this.onClose.bind(this);
  }

  public onClose(event: {wasClean: boolean, code: number, reason: string, target: ws}): void {
    logger.debug(`Socket was closed - Clean: ${event.wasClean} - Code: ${event.code} - Reason: ${event.reason}`);
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
          this.guildSync();
          break;
        default:
          this.unknownOPCode(opcode);
          break;
      }
    } else {
      logger.debug(`OPCode is not a number, what the fuck???`);
    }
  }

  private unknownOPCode(opcode: number): void {
    logger.debug(`Unknown opcode: ${opcode} - Closing socket`);
    this.close(WebsocketCodes.CLOSECODES.UNKNOWN_OP);
  }

  private sendHeartbeat(): void {
    logger.debug(`Sending heartbeat to socket`);
    this.send(WebsocketCodes.OPCODES.HEARTBEAT_ACK);
  }

  private sendHello(): void {
    logger.debug(`Sending HELLO!`);
    this.send(WebsocketCodes.OPCODES.HELLO, HELLO);
  }

  private guildSync(): void {
    logger.debug(`Sending guild sync`);
    this.send(WebsocketCodes.OPCODES.GUILD_SYNC, {});
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
          this.send(WebsocketCodes.OPCODES.DISPATCH, READY(user), "READY", data.compress);
        } else {
          this.close(WebsocketCodes.CLOSECODES.AUTH_FAILED);
        }
      } else {
        console.log(data);
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

  private async send(opcode: number,
                     data: any = null,
                     eventName?: string,
                     compress: boolean = this.compression): Promise<void> {
    data = {op: opcode, d: data, t: eventName, s: this.sentSequence};
    this.sentSequence++;
    const jsonData = JSON.stringify(data);
    logger.debug(`Sending data ${jsonData} (compression: ${this.compression})`);
    if (this.compression) {
      const result = await zlib.deflate(Buffer.from(jsonData));
      await this._send(result);
    } else {
      await this._send(jsonData);
    }
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

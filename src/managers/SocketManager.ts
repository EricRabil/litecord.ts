import * as ws from "ws";
import * as zlib from "zlib";
import Server from "../server";
import {IGuildObject} from "../util/schema/Guild";
import {SocketWrapper} from "../util/SocketWrapper";
import WebsocketCodes from "../util/websocketCodes";

interface IFirstContact {
  token: string;
}

export class SocketManager {

  public static readonly GATEWAY_NAME: string = "big-sexy-boy";
  public static readonly HEARTBEAT_INTERVAL: number = 41250;

  public sockets: {[key: string]: SocketWrapper[]} = {};

  private server: ws.Server;

  constructor(private discordServer: Server, port: number = 3750) {
    this.server = new ws.Server({port});
    Server.logger.log(`Socket server is listening on port ${port}`);
    this.server.on("connection", (socket, request) => {
      let queryRaw;
      const query: {[key: string]: string} = {};
      if (request.url) {
        queryRaw = request.url.split("&")
        .map((q) =>
            ({
              key: q.substring(0, q.indexOf("=")),
              value: q.substring(q.indexOf("=") + 1),
            }),
        );
        queryRaw.forEach((queryMap) => {
          if (queryMap.key.startsWith("/?")) {
            queryMap.key = queryMap.key.substring(2);
          }
          query[queryMap.key] = queryMap.value;
        });
      }
      if (!query.compress) {
        query.compress = "dontcompressthanks";
      }
      const _ = new SocketWrapper(socket, this, query.compress === "zlib-stream");
    });
  }

  public async registerSocket(id: string, socket: SocketWrapper): Promise<void> {
    if (this.sockets[id]) {
      this.sockets[id].push(socket);
    } else {
      this.sockets[id] = [socket];
    }
  }

  public async send(ids: string | string[], payload: any, event: string): Promise<void> {
    if (!Array.isArray(ids)) {
      ids = [ids];
    }
    for (const userID of ids) {
      if (this.sockets[userID]) {
        for (const socket of this.sockets[userID]) {
          if (!socket.opened) {
            this.sockets[userID].splice(this.sockets[userID].indexOf(socket));
            continue;
          }
          await socket.send(WebsocketCodes.OPCODES.DISPATCH, payload, event);
        }
      }
    }
  }
}

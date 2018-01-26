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

  public sockets: Map<string, SocketWrapper[]> = new Map();

  private server: ws.Server;

  constructor(private discordServer: Server, port: number = 3750) {
    this.server = new ws.Server({port});
    Server.logger.log(`Socket server is listening on port ${port}`);
    this.server.on("connection", (socket, request) => {
      Server.logger.log("Hello!");
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
    const list = this.sockets.get(id) || [];
    list.push(socket);
    this.sockets.set(id, list);
  }

  public async send(ids: string | string[], payload: any, event: string): Promise<void> {
    if (!Array.isArray(ids)) {
      ids = [ids];
    }
    const sendQueue: Array<Promise<void>> = [];
    for (const userID of ids) {
      const socketList = this.sockets.get(userID);
      if (socketList) {
        for (const socket of socketList) {
          if (!socket.opened) {
            socketList.splice(socketList.indexOf(socket));
            continue;
          }
          sendQueue.push(socket.send(WebsocketCodes.OPCODES.DISPATCH, payload, event));
        }
      }
    }
    await Promise.all(sendQueue);
  }
}

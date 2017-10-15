import * as ws from "ws";
import * as zlib from "zlib";
import Server from "../server";
import {SocketWrapper} from "../util/SocketWrapper";

interface IFirstContact {
  token: string;
}

export class SocketManager {

  public static readonly GATEWAY_NAME: string = "big-sexy-boy";
  public static readonly HEARTBEAT_INTERVAL: number = 41250;

  private server: ws.Server;
  private connections: SocketWrapper[] = [];

  constructor(private discordServer: Server, port: number = 3750) {
    this.server = new ws.Server({port});
    Server.logger.log(`Socket server is listening on port ${port}`);
    this.server.on("connection", (socket, request) => {
      let queryRaw;
      const query: {[key: string]: string} = {};
      if (request.url) {
        queryRaw = request.url.split("&")
        .map((q) => {
          const raw = q.split("=");
          const map = {
            key: raw[0],
            value: raw.slice(1).join(),
          };
          return map;
          });
        queryRaw.forEach((queryMap) => {
          if (queryMap.key.startsWith("/?")) {
            queryMap.key = queryMap.key.substring(2);
          }
          query[queryMap.key] = queryMap.value;
        });
      }
      if (!query.compress) {
        query.compress = "mygirl";
      }
      console.log(query.compress);
      this.connections.push(new SocketWrapper(socket, query.compress === "zlib-stream"));
    });
  }

  private send(target: ws, data: object): void {
    target.send(zlib.deflateSync(Buffer.from(JSON.stringify(data))));
  }

  private isFirstContact(data: any): data is IFirstContact {
    if (!data) {
      return false;
    }
    return "token" in data;
  }
}

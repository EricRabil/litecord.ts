import * as bodyParser from "body-parser";
import * as cors from "cors";
import * as express from "express";
import * as fs from "fs-extra";
import * as jwt from "jwt-then";
import * as mongoose from "mongoose";
import * as path from "path";
import * as realReadline from "readline";
import * as readline from "readline-sync";
import {InstanceType} from "typegoose";
import * as util from "util";
import * as ws from "ws";
import {SocketManager} from "./managers/SocketManager";
import Config from "./util/Config";
import Logger from "./util/logger";
import Route from "./util/Route";
import Guild from "./util/schema/Guild";
import {Guild as GuildModel} from "./util/schema/Guild";
import {User} from "./util/schema/User";
import UserModel from "./util/schema/User";
const hat = require("hat");

const logger = new Logger();
process.on("unhandledRejection", (rejection) => {
  logger.printError(rejection);
});

function createGuild(name: string, ownerID: string): InstanceType<GuildModel> {
  const guild = new Guild();
  guild.name = name;
  guild.ownerID = ownerID;
  guild.region = "RUSSIA";
  guild.memberCount = 1;
  guild.members.push(ownerID);
  guild.save();
  return guild;
}

(mongoose as any).Promise = global.Promise;

export default class Server {

  public static get logger(): Logger {
    return logger;
  }

  public static generatePayload(user: InstanceType<User>): {userID: string, passwordHash: string, expiration: number} {
    const expiration = new Date();
    expiration.setDate(expiration.getDate() + 7);
    return {
      expiration: expiration.getTime(),
      passwordHash: user.password,
      userID: user._id,
    };
  }

  public static async generateToken(user: InstanceType<User>): Promise<string> {
    const payload = this.generatePayload(user);
    return jwt.sign(payload, this.config.secret, {});
  }

  public static async validateToken(token: string): Promise<(User & mongoose.Document) | undefined> {
    let verified: string | any = await jwt.verify(token, this.config.secret);
    if (typeof verified === "string") {
      try {
        verified = JSON.parse(verified);
      } catch (e) {
        logger.printError(e);
        return;
      }
    }
    if (typeof verified === "object") {
      if (!verified.expiration || !verified.userID || !verified.passwordHash) {
        return;
      }
      if (Date.now() > verified.expiration) {
        return;
      } else {
        const user = await UserModel.findOne({_id: verified.userID});
        if (!user) {
          logger.debug(`Couldn't find user ID in database: ${verified.userID}`);
          return;
        }
        console.log(`${(user._id.equals(verified.userID))}`);
        console.log(`${(verified.passwordHash === user.password)}`);
        if ((user._id.equals(verified.userID)) && (verified.passwordHash === user.password)) {
          return user;
        } else {
          return;
        }
      }
    }
  }

  private static cfg: Config;

  private static configBootstrap(loc: string): void {
    const cfgExists = fs.existsSync(loc);
    this.cfg = new Config();
    if (!cfgExists) {
      this.cfg.secret = hat();
      fs.writeFile(loc, JSON.stringify(this.cfg));
    } else {
      const loadedCfg = require(loc);
      const secret = loadedCfg.secret;
      if (secret && typeof secret === "string") {
        this.cfg.secret = secret;
      }
    }
  }

  public express: express.Express;
  public socketServer: ws.Server;
  public socketManager: SocketManager;

  constructor() {
    this.loadServer();
  }

  public get gatewayURL(): string {
    return "wss://discordts-gateway.ericrabil.com";
  }

  public static get config(): Config {
    return Server.cfg;
  }

  public get config(): Config {
    return Server.config;
  }

  private async loadServer(): Promise<void> {
    logger.log("Bootstrapping config");
    Server.configBootstrap(path.join(__dirname, "config.json"));
    logger.log("Setting up express");
    this.express = express();
    this.express.use(cors());
    this.express.use(bodyParser.json());
    logger.log("Connecting to mongo");
    await mongoose.connect("mongodb://localhost/discordts", {useMongoClient: true});
    logger.log("Loading routes (asynchronously, may load later)");
    await this.load(path.join(__dirname, "routes"));
    this.express.listen(3500);
    logger.log("Express is listening on port 3500 - Starting socket server");
    this.socketManager = new SocketManager(this);
    logger.log("Starting JavaScript shell...");
    realReadline.createInterface({input: process.stdin, output: process.stdout}).on("line", (i) => {
      try {
        const output = eval(i);
        output instanceof Promise
          ? output.then((a) => {
            console.log("Promise Resolved");
            console.log(util.inspect(a, {depth: 0}));
          }).catch((e) => {
            console.log("Promise Rejected");
            console.log(e.stack);
          })
          : output instanceof Object
            ? console.log(util.inspect(output, {depth: 0}))
            : console.log(output);
      } catch (err) {
        console.log(err.stack);
      }
    });
  }

  private isRoute(object: any): object is Route {
    return "path" in object && "requestHandler" in object;
  }

  private async load(directory: string): Promise<void> {
    const contents = await fs.readdir(directory);
    const statLookups = new Array<Promise<fs.Stats>>();
    contents.forEach(async (content) => {
      const contentPath = path.join(directory, content);
      const stats = await fs.stat(contentPath);
      if (stats.isDirectory()) {
        this.load(contentPath);
      } else {
        if (content.endsWith(".js")) {
          const loadedRoute = new (require(contentPath).default)(this);
          if (this.isRoute(loadedRoute)) {
            this.express[loadedRoute.requestMethod](loadedRoute.path, loadedRoute.requestHandler());
            logger.debug(`Loaded route ${loadedRoute.requestMethod} ${loadedRoute.path}`);
          }
        }
      }
    });
  }

  private addErrorMiddleware(): void {
    this.express.use((req, res, next) => {
      console.log(`MAXI FUCK: ${req.url}`);
      res.status(404).send({code: 0, message: "404: Not Found"});
    });
  }
}

const _ = new Server();

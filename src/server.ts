/* tslint:disable:interface-name */
import * as bodyParser from "body-parser";
import * as cors from "cors";
import * as express from "express";
import {Request} from "express";
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
import {DiscordRequest} from "./util/Util";
const hat = require("hat");

const logger = new Logger();
process.on("unhandledRejection", logger.printError);

async function createGuild(name: string, ownerID: string): Promise<InstanceType<GuildModel>> {
  const user = await UserModel.findById(ownerID);
  if (!user) {
    throw new Error("No user with the provided ID exists");
  }
  const guild = new Guild();
  guild.name = name;
  guild.ownerID = ownerID;
  guild.region = "RUSSIA";
  guild.members.push(ownerID);
  await guild.save();
  user.guilds.push(guild._id);
  await user.save();
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
    let verified: string | any;
    try {
      verified = await jwt.verify(token, this.config.secret);
    } catch (e) {
      return;
    }
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
    this.express.use((req: express.Request, res: express.Response, next) => {
      logger.debug(`[Express] ${req.method} - ${req.originalUrl}`);
      next();
    });
    this.express.use(cors());
    this.express.use(bodyParser.json());
    const handler: express.ErrorRequestHandler = (error, req, res, next) => {
      if (error) {
        res.status(400).send({error: 0, message: "Bad request"});
      } else {
        next();
      }
    };
    this.express.use(handler);
    logger.log("Connecting to mongo");
    await mongoose.connect("mongodb://localhost/discordts", {useMongoClient: true});
    logger.log("Loading routes (synchronously)");
    this.load(path.join(__dirname, "routes"));
    this.express.use((req: express.Request, res: express.Response) => {
      logger.debug(`[Express] 404 - ${req.originalUrl} (${req.method})`);
      res.status(404).send({error: 0, message: "Not found"});
    });
    this.express.listen(3500);
    logger.log("Express is listening on port 3500 - Starting socket server");
    this.socketManager = new SocketManager(this);
    logger.log("Starting JavaScript shell...");
    realReadline.createInterface({input: process.stdin, output: process.stdout}).on("line", async (i) => {
      try {
        const output = eval(i);
        if (output instanceof Promise) {
          try {
            const result = await output;
            console.log("Promise Resolved");
            console.log(util.inspect(result, {depth: 0}));
          } catch (e) {
            console.log("Promise Rejected");
            console.log(e.stack);
          }
        } else if (output instanceof Object) {
          console.log(util.inspect(output), {depth: 0});
        } else {
          console.log(output);
        }
      } catch (err) {
        console.log(err.stack);
      }
    });
  }

  private isRoute(object: any): object is Route {
    return "path" in object && "requestHandler" in object;
  }

  private load(directory: string): void {
    const contents = fs.readdirSync(directory);
    const statLookups = new Array<Promise<fs.Stats>>();
    contents.forEach((content) => {
      const contentPath = path.join(directory, content);
      const stats = fs.statSync(contentPath);
      if (stats.isDirectory()) {
        this.load(contentPath);
      } else {
        if (content.endsWith(".js")) {
          const loadedRoute = new (require(contentPath).default)(this);
          if (this.isRoute(loadedRoute)) {
            if (loadedRoute.requiresAuthorization) {
              this.express[loadedRoute.requestMethod](loadedRoute.path, async (req, res, next) => {
                if (req.headers.authorization) {
                  let token = req.headers.authorization;
                  if (Array.isArray(token)) {
                    token = token[0] || "";
                  }
                  const valid = await Server.validateToken(token);
                  if (valid) {
                    (req as any).user = valid;
                    loadedRoute.requestHandler((req as any), res, next);
                  } else {
                    res.status(401).send({code: 0, message: "401: Unauthorized"});
                  }
                } else {
                  res.status(401).send({code: 0, message: "401: Unauthorized"});
                }
              });
            } else {
              this.express[loadedRoute.requestMethod](loadedRoute.path, (req, res, next) => {
                loadedRoute.requestHandler((req as any), res, next);
              });
            }
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

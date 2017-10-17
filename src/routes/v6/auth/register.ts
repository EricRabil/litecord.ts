import * as express from "express";
import Server from "../../../server";
import Route from "../../../util/Route";
import User from "../../../util/schema/User";
import {DiscordRequest} from "../../../util/Util";

interface IRegisterBody {
  email: string;
  fingerprint: string;
  username: string;
  password: string;
  invite: string | undefined;
  captcha_key: string | undefined;
}

const ENABLED_DOMAIN = ["maxifuck.net"];

export default class Register implements Route {

  public requestMethod: "post" = "post";
  public path: string = "/api/v6/auth/register";

  public constructor(private server: Server) {}

  public async requestHandler(req: DiscordRequest, res: express.Response, next: express.NextFunction): Promise<void> {
    const body = req.body;
    if (this.isValid(body)) {
      if (ENABLED_DOMAIN.filter((d) => body.email.endsWith(d)).length === 0) {
        res.status(400).json({email: ["Email is disallowed"]});
        return;
      }
      const user = await User.findOne({email: body.email});
      if (user) {
        res.status(400).json({email: ["Email already registered"]});
      } else {
        const registered = new User();
        registered.username = body.username;
        registered.email = body.email;
        await registered.setPassword(body.password);
        await registered.newDiscriminator();
        await registered.save();
        const token = await registered.generateToken();
        res.json({token});
      }
    } else {
      res.status(400).json({email: ["Missing fields"]});
    }
  }

  private isValid(body: any): body is IRegisterBody {
    return "email" in body && "username" in body && "password" in body && "fingerprint" in body;
  }
}

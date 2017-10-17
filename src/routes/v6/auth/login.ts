import * as express from "express";
import Server from "../../../server";
import Route from "../../../util/Route";
import User from "../../../util/schema/User";
import {DiscordRequest} from "../../../util/Util";

interface ILoginBody {
  email: string;
  password: string;
}

export default class Login implements Route {

  public requestMethod: "post" = "post";
  public path: string = "/api/v6/auth/login";

  public constructor(private server: Server) {}

  public async requestHandler(req: DiscordRequest, res: express.Response): Promise<void> {
    const body = req.body;
    if (this.isValid(body)) {
      const user = await User.findOne({email: body.email});
      if (user) {
        const valid = await user.comparePasswords(body.password);
        if (valid) {
          const token = await Server.generateToken(user);
          res.json({token});
        }
      } else {
        this.sendInvalid(res);
      }
    }
  }

  private sendInvalid(res: express.Response): void {
    res.status(400).json({email: ["Bad email or password"]});
  }

  private isValid(body: any): body is ILoginBody {
    return "email" in body && "password" in body;
  }
}

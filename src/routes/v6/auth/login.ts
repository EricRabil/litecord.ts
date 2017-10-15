import * as express from "express";
import Server from "../../../server";
import Route from "../../../util/Route";
import User from "../../../util/schema/User";

interface ILoginBody {
  email: string;
  password: string;
}

export default class Login implements Route {

  public requestMethod: "post" = "post";
  public path: string = "/api/v6/auth/login";

  public constructor(private server: Server) {}

  public requestHandler(): express.RequestHandler {
    return async (req: express.Request, res: express.Response) => {
      const body = req.body;
      if (this.isValid(body)) {
        const user = await User.findOne({email: body.email});
        if (user) {
          const valid = await user.comparePasswords(body.password);
          if (valid) {
            const token = await Server.generateToken(user);
            res.send({token});
          }
        } else {
          this.sendInvalid(res);
        }
      }
    };
  }

  private sendInvalid(res: express.Response): void {
    res.status(400).send({email: ["Bad email or password"]});
  }

  private isValid(body: any): body is ILoginBody {
    return "email" in body && "password" in body;
  }
}

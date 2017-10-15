import * as express from "express";
import Server from "../../../server";
import Route from "../../../util/Route";
import User from "../../../util/schema/User";

interface IRegisterBody {
  email: string;
  fingerprint: string;
  username: string;
  password: string;
  invite: string | undefined;
  captcha_key: string | undefined;
}

export default class Register implements Route {

  public requestMethod: "post" = "post";
  public path: string = "/api/v6/auth/register";

  public constructor(private server: Server) {}

  public requestHandler(): express.RequestHandler {
    return async (req: express.Request, res: express.Response) => {
      const body = req.body;
      if (this.isValid(body)) {
        const user = await User.findOne({email: body.email});
        if (user) {
          res.status(400).send({email: ["Email already registered"]});
        } else {
          const registered = new User();
          registered.username = body.username;
          registered.email = body.email;
          await registered.setPassword(body.password);
          await registered.newDiscriminator();
          await registered.save();
          const token = await registered.generateToken();
          res.send({token});
        }
      } else {
        res.status(400).send({email: ["Missing fields"]});
      }
    };
  }

  private isValid(body: any): body is IRegisterBody {
    return "email" in body && "username" in body && "password" in body && "fingerprint" in body;
  }
}

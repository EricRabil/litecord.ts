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
    return (req: express.Request, res: express.Response) => {
      const body = req.body;
      if (this.isValid(body)) {
        User.findOne({email: body.email}).then((docs) => {
          if (docs) {
            res.status(400).send({email: ["Email already registered"]});
          } else {
            const registered = new User();
            registered.username = body.username;
            registered.email = body.email;
            registered.setPassword(body.password).then(() => {
              registered.newDiscriminator().then(() => {
                registered.save().then(() => {
                  registered.generateToken().then((token) => {
                    res.send({token});
                  });
                });
              });
            });
          }
        });
      } else {
        res.status(400).send({message: "Missing field(s) :("});
      }
    };
  }

  private isValid(body: any): body is IRegisterBody {
    return "email" in body && "username" in body && "password" in body && "fingerprint" in body;
  }
}

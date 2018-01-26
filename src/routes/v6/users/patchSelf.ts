import * as express from "express";
import Server from "../../../server";
import Route from "../../../util/Route";
import {DiscordRequest, DiscordResponse, applyUpdates} from "../../../util/Util";
import { PasswordGuard } from "./guards";
import { AcceptedUserUpdates } from "../../../util/schema/User";

export default class Login implements Route {

  public requestMethod: "patch" = "patch";
  public path: string = "/api/v6/users/@me";
  public requiresAuthorization: true = true;
  public guard = PasswordGuard;

  public constructor(private server: Server) {}

  public async requestHandler(req: DiscordRequest, res: DiscordResponse): Promise<void> {
    if (req.body.new_password) {
        await req.user.setPassword(req.body.new_password);
    }
    await applyUpdates(req.user, req.body, AcceptedUserUpdates);
    await req.user.save();
    res.json({token: (await Server.generateToken(req.user)), ...(await req.user.toUserObject())});
  }
}

import * as express from "express";
import Server from "../../../../server";
import IRoute from "../../../../util/Route";
import { DiscordRequest, DiscordResponse, applyUpdates, remapObject } from "../../../../util/Util";
import { AcceptedSettingsUpdates, SettingsKeyMap } from "../../../../util/schema/User/UserMetadata";

export default class Login implements IRoute {

  public requestMethod: "patch" = "patch";
  public path: string = "/api/v6/users/@me/settings";
  public requiresAuthorization: true = true;

  public constructor(private server: Server) {}

  public async requestHandler(req: DiscordRequest, res: DiscordResponse): Promise<void> {
    const updated = await applyUpdates(req.user.metadata.userSettings, req.body, AcceptedSettingsUpdates);
    const diffOnly: {[key: string]: any} = {};
    for (let i = 0; i < updated.length; i++) {
        diffOnly[(SettingsKeyMap as any)[updated[i]]] = req.user.metadata.userSettings[updated[i]];
    }
    await req.user.save();
    res.json(await remapObject(SettingsKeyMap, req.user.metadata.userSettings));
    Server.socketManager.send(req.user.snowflake, diffOnly, "USER_SETTINGS_UPDATE");
  }
}

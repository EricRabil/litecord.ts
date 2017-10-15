import * as express from "express";

export default interface IRoute {
  requestMethod: "get" | "post" | "options" | "patch" | "delete";
  path: string;
  requestHandler(): express.RequestHandler;
}

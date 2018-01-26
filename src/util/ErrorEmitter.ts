import {Response} from "express";
import * as flat from "flat";

const codeMap: {[key: number]: string} = {
  0: "Unknown error",
  400: "400: Bad request",
  10001: "Unknown account",
  10002: "Unknown application",
  10003: "Unknown channel",
  10004: "Unknown guild",
  10005: "Unknown integration",
  10006: "Unknown invite",
  10007: "Unknown member",
  10008: "Unknown message",
  10009: "Unknown overwrite",
  10010: "Unknown provider",
  10011: "Unknown role",
  10012: "Unknown token",
  10013: "Unknown user",
  10014: "Unknown Emoji",
  20001: "Bots cannot use this endpoint",
  20002: "Only bots can use this endpoint",
  30001: "Maximum number of guilds reached (100)",
  30002: "Maximum number of friends reached (1000)",
  30003: "Maximum number of pins reached (50)",
  30005: "Maximum number of guild roles reached (250)",
  30010: "Too many reactions",
  30013: "Maximum number of guild channels reached (500)",
  40001: "Unauthorized",
  50001: "Missing access",
  50002: "Invalid account type",
  50003: "Cannot execute action on a DM channel",
  50004: "Embed disabled",
  50005: "Cannot edit a message authored by another user",
  50006: "Cannot send an empty message",
  50007: "Cannot send messages to this user",
  50008: "Cannot send messages in a voice channel",
  50009: "Channel verification level is too high",
  50010: "OAuth2 application does not have a bot",
  50011: "OAuth2 application limit reached",
  50012: "Invalid OAuth state",
  50013: "Missing permissions",
  50014: "Invalid authentication token",
  50015: "Note is too long",
  50016: "Provided too few or too many messages to delete.\
  Must provide at least 2 and fewer than 100 messages to delete.",
  50019: "A message can only be pinned to the channel it was sent in",
  50021: "Cannot execute action on a system message",
  50034: "A message provided was too old to bulk delete",
  50035: "Invalid Form Body",
  50036: "An invite was accepted to a guild the application's bot is not in",
  90001: "Reaction Blocked",
};

const codeShortcuts = {
  BAD_REQUEST: 400,
  BOTS_ONLY: 20002,
  CANNOT: {
    DELETE: 50034,
    EDIT: 50005,
    EXECUTE: 50021,
    REACT: 90001,
    SEND: {
      EMPTY: 50006,
      USER: 50007,
      VOICE: 50008,
    },
  },
  CHANNEL_VERIFICATION: 50009,
  EMBEDS_OFF: 50004,
  INVALID: {
    ACCOUNT: 50002,
    FORM_BODY: 50035,
    PIN: 50019,
    TOKEN: 50014,
  },
  MAX: {
    FRIENDS: 30002,
    GUILDS: 30001,
    NOTE_LENGTH: 50015,
    PINS: 30003,
    REACTIONS: 30010,
    ROLES: 30005,
  },
  MESSAGE_DELETE_LENGTH: 50016,
  MISSING: {
    ACCESS: 50001,
    PERMISSIONS: 50013,
  },
  NO_BOTS: 20001,
  NO_DM: 50003,
  OAUTH2: {
    BAD_INVITE: 50036,
    INVALID: 50012,
    LIMIT: 50011,
    NO_BOT: 50010,
  },
  UNAUTHORIZED: 40001,
  UNKNOWN: {
    ACCOUNT: 10001,
    APP: 10002,
    CHANNEL: 10003,
    EMOJI: 10014,
    ERROR: 0,
    GUILD: 10004,
    INTEGRATION: 10005,
    INVITE: 10006,
    MEMBER: 10007,
    MESSAGE: 10008,
    OVERWRITE: 10009,
    PROVIDER: 10010,
    ROLE: 10011,
    TOKEN: 10012,
    USER: 10013,
  },
};

export const CODES = codeShortcuts;

const statusCodes: ICodeMap = {
  400: [
    codeShortcuts.BAD_REQUEST,
    codeShortcuts.OAUTH2.INVALID,
    codeShortcuts.INVALID.FORM_BODY,
    codeShortcuts.INVALID.ACCOUNT,
    codeShortcuts.INVALID.PIN,
  ],
  401: [
    codeShortcuts.UNAUTHORIZED,
  ],
  403: [
    codeShortcuts.BOTS_ONLY,
    codeShortcuts.CANNOT,
    codeShortcuts.CHANNEL_VERIFICATION,
    codeShortcuts.EMBEDS_OFF,
    codeShortcuts.MAX,
    codeShortcuts.MISSING,
    codeShortcuts.NO_BOTS,
    codeShortcuts.OAUTH2.NO_BOT,
    codeShortcuts.OAUTH2.LIMIT,
    codeShortcuts.OAUTH2.INVALID,
    codeShortcuts.NO_DM,
    codeShortcuts.MESSAGE_DELETE_LENGTH,
  ],
  404: [
    codeShortcuts.UNKNOWN,
    codeShortcuts.OAUTH2.BAD_INVITE,
  ],
};

const computedStatusCodes: {[key: number]: number} = {};
interface ICodeMap {
  [index: number]: Array<number | ICodeTree>;
}

interface ICodeTree {
  [index: string]: number | ICodeTree;
}

const parse = (statusCode: number, errorCode: number | ICodeTree) => {
  if (typeof errorCode === "number") {
    computedStatusCodes[errorCode] = statusCode;
  } else {
    Object.values(errorCode).forEach((value) => {
      parse(statusCode, value);
    });
  }
};

Object.keys(statusCodes).forEach((code) => {
  const numberCode = Number.parseInt(code);
  if (isNaN(numberCode)) {
    return;
  }
  const errorCodes = statusCodes[numberCode];
  if (!errorCodes) {
    return;
  }
  errorCodes.forEach((errorCode) => {
    if (typeof errorCode === "number") {
      computedStatusCodes[errorCode] = numberCode;
    } else {
      parse(numberCode, errorCode);
    }
  });
});

const codes = Object.keys(codeMap);

export default new class ErrorEmitter {

  public readonly CODES = codeShortcuts;

  public send(res: Response, code: number): void {
    if (codes.indexOf(code.toString()) >= 0) {
      res.status(computedStatusCodes[code] || 200).json({code, message: codeMap[code]});
    } else {
      res.status(400).json({code});
    }
  }
}();

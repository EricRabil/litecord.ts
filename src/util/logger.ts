import * as chalk from "chalk";

const tagSpacing = 10;

const formatting = (tag: string) => {
  tag = tag.toUpperCase();
  if (tag.length > (tagSpacing - 2)) {
    tag = tag.substring(0, (tagSpacing - 2));
  }
  const spacesNeeded = (tagSpacing - 2) - tag.length;
  let output = "[";
  for (let i = 0; i <= spacesNeeded; i++) {
    output += " ";
  }
  return `${output}${tag}]`;
};

const assembleTags = (base: string, tags: string[], content: string[]|string) => {
  const outputTags = tags ? `${tags.map((tag) => `[${tag}] `).join(" ")}` : ``;
  const output = typeof content === "string" ? content : content.join(" ");
  return `${base} ${outputTags}${output}`;
};

const applyColors = (color: chalk.ChalkChain | chalk.ChalkChain[], text: string) => {
  if (Array.isArray(color)) {
    color.forEach((c) => {
      text = c(text);
    });
  } else {
    text = color(text);
  }
  return text;
};

const colors = {
  debug: [chalk.italic, chalk.bgBlue, chalk.white],
  error: chalk.red,
  log: chalk.blue,
  warn: chalk.yellow,
};

const logTag = `${formatting("INFO")}`;
const warnTag = `${formatting("WARNING")}`;
const errTag = `${formatting("ERROR")}`;
const debugTag = `${formatting("DEBUG")}`;

export default class Logger {

  public prefixes: string[];

  constructor(prefixes: string[] = new Array<string>()) {
    this.prefixes = prefixes;
  }

  public log(...contents: string[]) {
    console.log(applyColors(colors.log, assembleTags(logTag, this.prefixes, contents)));
  }

  public warn(...contents: string[]) {
    console.warn(applyColors(colors.warn, assembleTags(warnTag, this.prefixes, contents)));
  }

  public error(...contents: string[]) {
    console.error(applyColors(colors.error, assembleTags(errTag, this.prefixes, contents)));
  }

  public debug(...contents: string[]) {
    console.log(applyColors(colors.debug, assembleTags(debugTag, this.prefixes, contents)));
  }

  public printError(error: Error) {
    const message = error.stack || `${error.name}: ${error.message}`;
    console.error(applyColors(colors.error, assembleTags(errTag, this.prefixes, message)));
  }
}

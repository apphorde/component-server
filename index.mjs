import createServer from "@cloud-cli/http";
import { existsSync } from "fs";
import { mkdir, writeFile } from "fs/promises";
import path, { join } from "path";

const dataPath = process.env.DATA_PATH || join(process.cwd(), "data");
const nameRe = /^[a-z]+-[a-z0-9]+$/;
const versionRe = /^(\d{1,2}\.\d{1,2}\.\d{1,2}|\d{1,2}|latest)$/;

createServer(async function (request, response) {
  const { method } = request;

  if (method !== "POST") {
    return notFound(response);
  }

  try {
    const { pathname } = new URL(request.url, "http://localhost");
    const nameAndVersion = pathname.slice(1);
    const body = Buffer.concat(await request.toArray()).toString("utf8");

    let name = "";
    let source = "";
    let version = "latest";

    if (nameAndVersion) {
      const [a, b = "latest"] = nameAndVersion.split("@");
      source = body;
      name = a;
      version = b;
    } else {
      const json = JSON.parse(body);
      name = json.name;
      source = json.source;
      version = json.version || "latest";
    }

    if (!nameRe.test(name)) {
      return badRequest(response, "Invalid component name: " + name);
    }

    if (!versionRe.test(version)) {
      return badRequest(response, "Invalid component version: " + version);
    }

    if (!String(source).trim()) {
      return badRequest(response, "Invalid component source");
    }

    const folder = join(dataPath, name);
    const file = join(folder, version + ".mjs");

    if (!existsSync(folder)) {
      await mkdir(folder);
    }

    if (version !== "latest" && existsSync(file)) {
      response.writeHead(409).end(`Version ${version} was already published.`);
      return;
    }

    await writeFile(file, source);
    response.end("OK\n");
  } catch (e) {
    console.log(e);
    response.writeHead(500).end("Internal error");
  }
});

function badRequest(response, reason) {
  response.writeHead(400).end(reason);
}

function notFound(response) {
  response.writeHead(404).end("Not found");
}

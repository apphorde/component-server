import createServer from "@cloud-cli/http";
import { existsSync } from "fs";
import { mkdir } from "fs/promises";
import { join } from "path";

const dataPath = process.env.DATA_PATH || join(process.cwd(), "data");
const nameRe = /^[a-z]+-[a-z0-9]+$/;
const versionRe = /^(\d{1,2}\.\d{1,2}\.\d{1,2}|\d{1,2}|latest)$/;

createServer(async function (request, response) {
  const { method } = request;

  if (method === "POST") {
    try {
      const body = Buffer.concat(await request.toArray()).toString("utf8");
      const json = JSON.parse(body);
      const { name, source = "", version = "latest" } = json;

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

      await writeFile(file, source);
      response.end("OK");
    } catch (e) {
      console.log(e);
      response.writeHead(500).end("Internal error");
    }

    return;
  }

  notFound(response);
});

function badRequest(reason) {
  response.writeHead(400).end(reason);
}

function notFound(response) {
  response.writeHead(404).end("Not found");
}

import createServer from "@cloud-cli/http";
import { createReadStream, existsSync } from "fs";
import { join, resolve } from "path";

const dataPath = process.env.DATA_PATH || join(process.cwd(), "data");
const nameRe = /^[a-z]+-[a-z0-9]+$/;

createServer(async function (request, response) {
  const url = new URL(request.url, "http://localhost");
  const { method } = request;

  if (method === "POST") {
    try {
      const body = Buffer.concat(await request.toArray()).toString("utf8");
      const json = JSON.parse(body);
      const { name, source } = json;

      if (!nameRe.test(name)) {
        throw new Error("Invalid component name: " + name);
      }

      const file = join(dataPath, name);
      await writeFile(file, source);
      response.end('OK');
    } catch (e) {
      console.log(e);
      response.writeHead(500).end("Internal error");
    }

    return;
  }

  if (method === "GET") {
    const name = resolve(url.pathname);
    const file = join(dataPath, name);

    if (existsSync(file)) {
      response.setHeader("Cache-Control", "max-age=86400");
      createReadStream(file).pipe(response);
      return;
    }
  }

  notFound(response);
});

function notFound(response) {
  response.writeHead(404).end("Not found");
}

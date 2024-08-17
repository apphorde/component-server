import createServer from "@cloud-cli/http";
import { existsSync } from "fs";
import { mkdir, writeFile, readFile } from "fs/promises";
import { join } from "path";

const dataPath = process.env.DATA_PATH || join(process.cwd(), "data");
const apiKeysPath = process.env.API_KEYS_PATH || join(process.cwd(), "keys");

createServer(async function (request, response) {
  const { method } = request;

  if (method !== "POST") {
    return notFound(response);
  }

  try {
    const { pathname } = new URL(request.url, "http://localhost");
    const pathParts = pathname.slice(1).split("/");
    const body = Buffer.concat(await request.toArray()).toString("utf8");

    if (["component", "library"].includes(pathParts[0])) {
      return onPublish(
        pathParts[0],
        pathParts.slice(1),
        request,
        response,
        body
      );
    }

    notFound(response);
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

async function onPublish(type, pathParts, request, response, source) {
  const [scope, nameAndVersion] = pathParts;
  const apiKey = (request.headers.authorization || "").trim();

  if (!apiKey) {
    return badRequest(
      response,
      "Invalid API key. Send your API key in the Authorization header."
    );
  }

  if (!scope || !nameAndVersion) {
    return badRequest(response, "Invalid specifier. Use scope/name format.");
  }

  if (!validateScope(scope)) {
    return badRequest(
      response,
      `Invalid scope: ${scope}. Scope must have only lowercase characters and dashes.`
    );
  }

  const apiKeyFile = join(apiKeysPath, scope + ".key");
  const storedKey = existsSync(apiKeyFile)
    ? (await readFile(apiKeyFile, "utf8")).trim()
    : "";

  if (storedKey !== apiKey) {
    console.log('Invalid key. Expected %s, received %s. Check %s', storedKey, apiKey, apiKeyFile);
    return badRequest(response, "Invalid API key.");
  }

  const [name, version = "latest"] = nameAndVersion.split("@");

  if (type === "component" && !validateComponent(name)) {
    return badRequest(
      response,
      `Invalid component name: ${name}. Components must have a lowercase name and contain a single dash in the middle.`
    );
  }

  if (type === "library" && !validateLibrary(name)) {
    return badRequest(
      response,
      `Invalid library name: ${name}. Libraries name must have only lowercase characters.`
    );
  }

  if (!validateVersion(version)) {
    return badRequest(
      response,
      `Invalid version: ${version}. Use either "latest" or x.y.z format with only numbers, e.g. 1.9.0`
    );
  }

  if (!String(source).trim()) {
    return badRequest(response, "Invalid source.");
  }

  const folder = join(dataPath, scope, name);
  const file = join(folder, version + ".mjs");

  if (!existsSync(folder)) {
    await mkdir(folder, { recursive: true });
  }

  if (version !== "latest" && existsSync(file)) {
    response.writeHead(409).end(`Version ${version} was already published.`);
    return;
  }

  await writeFile(file, source);
  response.end("OK\n");
}

const scopeRe = /^[a-z-]{1}[a-z-]+$/;
const componentNameRe = /^[a-z]+-[a-z]+$/;
const libraryNameRe = /^[a-z]{1}[a-z-]+$/;
const versionRe = /^(\d{1,2}\.\d{1,3}\.\d{1,2}|\d{1,2}|latest)$/;

function validateScope(scope) {
  return scopeRe.test(scope) && !scope.includes("--");
}

function validateVersion(version) {
  return versionRe.test(version);
}

function validateComponent(component) {
  return componentNameRe.test(component);
}

function validateLibrary(component) {
  return libraryNameRe.test(component);
}

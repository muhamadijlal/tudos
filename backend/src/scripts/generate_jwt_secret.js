import crypto from "crypto";
import fs from "fs";
import path from "path";

const envPath = path.resolve(process.cwd(), ".env");
let env = fs.existsSync(envPath) ? fs.readFileSync(envPath, "utf8") : "";

const secret = crypto.randomBytes(48).toString("base64");
const line = `JWT_SECRET=${secret}`;

if (/^JWT_SECRET=.*$/m.test(env)) {
  env = env.replace(/^JWT_SECRET=.*$/m, line); // exists → overwrite
} else {
  env += `${env === "" || env.endsWith("\n") ? "" : "\n"}${line}\n`; // missing → add it
}

fs.writeFileSync(envPath, env);
console.log("New JWT_SECRET generated successfully");

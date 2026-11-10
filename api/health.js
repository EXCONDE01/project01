import { healthPayload } from "../server/health.js";

export default function handler(_request, response) {
  response.statusCode = 200;
  response.setHeader("Content-Type", "application/json; charset=utf-8");
  response.setHeader("Cache-Control", "no-store");
  response.end(JSON.stringify(healthPayload()));
}

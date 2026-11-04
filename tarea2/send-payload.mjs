import { readFile } from "node:fs/promises";
import { resolve } from "node:path";

const [payloadPath] = process.argv.slice(2);
const webhookUrl = process.env.PF_N8N_WEBHOOK_URL;
const integrationToken = process.env.PF_INTEGRATION_TOKEN;

if (!payloadPath || !webhookUrl || !integrationToken) {
  console.error(
    "Uso: node tarea2/send-payload.mjs tarea2/payloads/01-pedido-integrado.json\n" +
      "Configura PF_N8N_WEBHOOK_URL y PF_INTEGRATION_TOKEN en el entorno.",
  );
  process.exit(2);
}

const payload = JSON.parse(await readFile(resolve(payloadPath), "utf8"));
const response = await fetch(webhookUrl, {
  method: "POST",
  headers: {
    "Content-Type": "application/json",
    "X-Integration-Token": integrationToken,
  },
  body: JSON.stringify(payload),
});

console.log(`HTTP ${response.status}`);
console.log(await response.text());
if (!response.ok) process.exitCode = 1;

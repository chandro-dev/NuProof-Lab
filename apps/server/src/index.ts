import "dotenv/config";
import { loadConfig } from "./config";
import { createApp } from "./app";

const config = loadConfig();
const { app } = createApp(config);
app.listen(config.port, config.host, () => {
  console.log(
    JSON.stringify({
      level: "info",
      message: "NuProof Lab local API ready",
      host: config.host,
      port: config.port,
      keyId: config.keyId
    })
  );
});


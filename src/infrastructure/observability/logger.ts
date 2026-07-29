import "server-only";

import type { StructuredLogger } from "@/src/domain/ports";

function write(level: "info" | "error", event: string, context: Record<string, unknown>) {
  const entry = JSON.stringify({
    level,
    event,
    timestamp: new Date().toISOString(),
    ...context
  });
  if (level === "error") console.error(entry);
  else console.info(entry);
}

export const logger: StructuredLogger = {
  info: (event, context) => write("info", event, context),
  error: (event, context) => write("error", event, context)
};

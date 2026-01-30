type LogLevel = "debug" | "info" | "warn" | "error";

interface LogEntry {
  level: LogLevel;
  source: string;
  message: string;
  data?: unknown;
  timestamp: string;
}

const LOG_LEVELS: Record<LogLevel, number> = {
  debug: 0,
  info: 1,
  warn: 2,
  error: 3,
};

const isDev = process.env.NODE_ENV === "development";
const minLevel: LogLevel = isDev ? "debug" : "info";

function shouldLog(level: LogLevel): boolean {
  return LOG_LEVELS[level] >= LOG_LEVELS[minLevel];
}

function formatTimestamp(): string {
  return new Date().toISOString().replace("T", " ").split(".")[0];
}

function formatMessage(entry: LogEntry): string {
  const levelTag = entry.level.toUpperCase().padEnd(5);
  return `${entry.timestamp} [${levelTag}] [${entry.source}] ${entry.message}`;
}

function log(level: LogLevel, source: string, message: string, data?: unknown): void {
  if (!shouldLog(level)) return;

  const entry: LogEntry = {
    level,
    source,
    message,
    data,
    timestamp: formatTimestamp(),
  };

  const formatted = formatMessage(entry);

  switch (level) {
    case "debug":
    case "info":
      console.log(formatted);
      break;
    case "warn":
      console.warn(formatted);
      break;
    case "error":
      console.error(formatted);
      break;
  }

  if (data !== undefined && isDev) {
    console.log("  Data:", JSON.stringify(data, null, 2));
  }
}

export function createLogger(source: string) {
  return {
    debug: (message: string, data?: unknown) => log("debug", source, message, data),
    info: (message: string, data?: unknown) => log("info", source, message, data),
    warn: (message: string, data?: unknown) => log("warn", source, message, data),
    error: (message: string, data?: unknown) => log("error", source, message, data),
  };
}

export const logger = {
  debug: (source: string, message: string, data?: unknown) => log("debug", source, message, data),
  info: (source: string, message: string, data?: unknown) => log("info", source, message, data),
  warn: (source: string, message: string, data?: unknown) => log("warn", source, message, data),
  error: (source: string, message: string, data?: unknown) => log("error", source, message, data),
};

export type { LogLevel, LogEntry };

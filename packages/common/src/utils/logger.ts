export interface Logger {
  info(message: string, ...args: unknown[]): void;
  warn(message: string, ...args: unknown[]): void;
  error(message: string, ...args: unknown[]): void;
}

export function createLogger(prefix: string, isEnabled: () => boolean): Logger {
  const format = (message: string) => `[${prefix}] ${message}`;

  return {
    info(message, ...args) {
      if (isEnabled()) {
        console.info(format(message), ...args);
      }
    },
    warn(message, ...args) {
      if (isEnabled()) {
        console.warn(format(message), ...args);
      }
    },
    error(message, ...args) {
      console.error(format(message), ...args);
    },
  };
}

/**
 * Application Configuration
 *
 * Centralized static configuration file for the frontend application.
 * All application configuration values are defined here as static constants
 * instead of relying on environment variables.
 */

export const appConfig = {
  apiUrl: 'https://egydomino.runasp.net/api',
  hubUrl: 'https://egydomino.runasp.net/hubs/game',
} as const;

export const APP_CONFIG = appConfig;

export type AppConfig = typeof appConfig;

export default appConfig;

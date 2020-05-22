/**
 * Options for a Connection
 */
export interface ConnectionOptions {
  /** Number of retries */
  retries: number;
  /** Timeout between each retries.
   * Will be multiplied by `retryTimeoutMultiplier`.
   * See `retryTimeoutMultiplier` for details
   */
  retryTimeout: number;
  /**
   * The multiplier for retry timeout.
   * Eg. when this is 2 and `retryTimeout` is 2000, the progress will look like this:
   * `closed -> wait 2000ms -> retry -> wait 4000ms -> retry -> wait 8000ms -> retry -> ...`
   * Set it to 1 if you don't want this behavior.
   */
  retryTimeoutMultiplier: number;
}

/**
 * Default connection options
 */
export const defaultConnectionOptions: ConnectionOptions = {
  retries: 3,
  retryTimeout: 2000,
  retryTimeoutMultiplier: 2
};

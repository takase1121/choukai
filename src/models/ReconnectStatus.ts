/**
 * Represents reconnection state of a Connection
 */
export interface ReconnectStatus {
  /** Number of retries performed by the connection */
  retried: number;
  /** Timeout used in the last `setTimeout` */
  currentTimeout: number;
  /** Timeout handle (used with `clearTimeout`) */
  timeoutHandle: any;
}

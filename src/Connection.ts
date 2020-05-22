import WebSocket, {ClientOptions} from 'ws';

import {EventEmitter} from 'events';

import {generateEventPropagator, generateEventTap, mergeDeep} from './Util';
import {ConnectionOptions, defaultConnectionOptions} from './models/ConnectionOptions';
import {ReconnectStatus} from './models/ReconnectStatus';

/**
 * This represents a connection to a Lavalink server.
 */
export class Connection extends EventEmitter {
  /** WebSocket URL to the server */
  readonly address: string;
  /** User ID of the bot */
  readonly userID: string;
  /** Number of shards of the bot */
  readonly shards: number;
  /** Password used to authenticate with server */
  readonly password: string;

  /** WebSocket options */
  protected wsOptions: ClientOptions;
  /** Connection options */
  protected connOptions: ConnectionOptions;

  /** WebSocket */
  protected ws: WebSocket;
  /** Stores states about reconnections */
  protected reconnectStatus: ReconnectStatus;

  /**
     * Constructs a WebSocket and immediately connect to Lavalink
     * @param address WebSocket URL to the server
     * @param userID User ID of the bot
     * @param shards Number of shards of the bot
     * @param password Password used to authenticate with server
     * @param connOptions Connection options
     * @param wsOptions WebSocket options
     */
  constructor(address: string, userID: string, shards: number, password: string, connOptions?: ConnectionOptions, wsOptions?: ClientOptions) {
    super();
    if (typeof address !== 'string' || !/^wss?:\/\//.exec(address)) {
      throw new TypeError('Argument \'address\' is not a valid WebSocket URL');
    }

    if (typeof userID !== 'string' || !/\d+/.exec(userID)) {
      throw new TypeError('Argument \'userID\' is not a valid Discord ID');
    }

    if (Number.isNaN(shards) || shards < 1) {
      throw new TypeError('Argument \'shards\' is not a valid number');
    }

    if (typeof password !== 'string') {
      throw new TypeError('Argument \'password\' is not a string');
    }

    Object.defineProperties(this, {
      address: {value: address},
      userID: {value: userID},
      shards: {value: shards},
      password: {value: password},
      connOptions: {value: mergeDeep(connOptions, defaultConnectionOptions)},
      wsOptions: {value: wsOptions}
    });
    this.reconnectStatus = {
      retried: 0,
      currentTimeout: this.connOptions.retryTimeout,
      timeoutHandle: null
    };

    this.connect();
  }

  /**
     * Closes the connection.
     * @param permanent If this is false, the connection will attempt to reconnect. Useful for purposefully restarting the server
     */
  public close(permanent = false): void {
    // We will have to clear this timeout anyways
    if (this.reconnectStatus.timeoutHandle) {
      clearTimeout(this.reconnectStatus.timeoutHandle);
    }

    if (permanent) {
      this.reconnectStatus.retried = -1; // Prevent socket from reconnecting
      if (this.ws && !this.ws.CLOSED && !this.ws.CLOSING) {
        this.ws.close();
      }
    } else {
      this.reconnect(true);
    }
  }

  /**
     * Sends something to the server.
     * @param payload
     */
  public send(payload: string): void {
    if (this.ws) {
      this.ws.send(payload);
    }
  }

  /**
     * Asynchronously send something to the server.
     * > Note: The "asynchronous" here may not be the case you wanted.
     * >       This method provides a way to "ensure" that the message is sent.
     * >       It should not spammed because it may somehow block your event loop.
     * >       For most cases, the synchronous `send` is adequate and should be used.
     * @param payload
     */
  public sendAsync(payload: string): Promise<void> {
    return new Promise((resolve, reject) => {
      if (this.ws) {
        this.ws.send(payload, error => error ? reject(error) : resolve());
      }
    });
  }

  /**
     * Processes messages from server. WIP
     * @param data
     */
  protected processMessage(data: string): void { // eslint-disable-line @typescript-eslint/no-unused-vars
    // TODO: implement logic
  }

  /**
     * Connects to the server.
     */
  protected connect(): void {
    this.ws = new WebSocket(this.address, this.wsOptions);
    this.ws.on('ws:error', generateEventPropagator('error', this, WebSocket.constructor.name));
    this.ws.on('ws:upgrade', generateEventPropagator('upgrade', this, WebSocket.constructor.name));
    this.ws.on('ws:unexpected-response', generateEventPropagator('unexpected-response', this, WebSocket.constructor.name));
    this.ws.on('ws:message', generateEventTap('message', this, this.processMessage.bind(this), WebSocket.constructor.name));
    this.ws.once('ws:close', generateEventTap('close', this, this.reconnect.bind(this), WebSocket.constructor.name));
  }

  /**
     *
     * @param reconnectWS If this is `true`, the WebSocket will be reconnected immediately.
     *                    If this is false, socket will reconnect after the timeout.
     */
  protected reconnect(reconnectWS?: boolean): void {
    if (reconnectWS) {
      if (this.ws && !this.ws.CLOSED && !this.ws.CLOSING) {
        this.ws.close();
      }

      this.ws = null;
      // TODO: may have other things to clean up here

      this.connect();
    } else if (this.reconnectStatus.retried < 0) {
      // A negative retried means that no reconnection should happen
      if (this.ws && this.ws.CLOSED && !this.ws.CLOSING) {
        this.ws.close();
      }

      this.ws = null;
    } else if (++this.reconnectStatus.retried > this.connOptions.retries) {
      this.emit('ws:max-retries-reached', new Error('Max retries reached'));
    } else {
      this.reconnectStatus.currentTimeout += this.reconnectStatus.currentTimeout * this.connOptions.retryTimeoutMultiplier;
      this.reconnectStatus.timeoutHandle = setTimeout(this.reconnect.bind(this, true), this.reconnectStatus.currentTimeout);
    }
  }
}

import {EventEmitter} from 'events';

/**
 * Changes name of a function
 * @param fn
 * @param name
 */
export function changeFunctionName(fn: any, name: string) {
  if (typeof fn !== 'function') {
    throw new TypeError('Argument \'fn\' is not a function');
  }

  if (typeof name !== 'string') {
    throw new TypeError('Argument \'name\' is not a string');
  }

  return Object.defineProperty(fn, 'name', {value: name});
}

/**
 * Generates an event propagator.
 * An event propagator simply propagates an event to another emitter.
 * The propagator provides better stack trace if any error occured via editing function names to be more readable.
 * This should be used over plain anonymous functions
 * @param event The event to listen to
 * @param emitter The target EventEmitter where the event is propagated
 * @param source The source of the event, Eg. `My Websocket #12`
 */
export function generateEventPropagator(event: string, emitter: Readonly<EventEmitter>, source?: string) {
  if (typeof event !== 'string' || event.length === 0) {
    throw new TypeError('Argument \'event\' is not a string');
  }

  if (!emitter || !(emitter instanceof EventEmitter)) {
    throw new TypeError('Argument \'emitter\' is not an instance of \'EventEmitter\'');
  }

  if (source !== undefined && typeof source !== 'string') {
    throw new TypeError('Argument \'source\' is not undefined or a string');
  }

  const eventSource = source ? `Event: '${event}'` : `'${source}' -> Event: '${event}'`;
  return changeFunctionName((...args: readonly any[]) => emitter.emit(event, ...args), eventSource);
}

/**
 * Generates an event propagator with a tap.
 * This is an event propagator that also calls a function.
 * Useful for exposing events while processing them.
 *
 * Note: tap function is called AFTER event is emitted and runs SYNCHRONOUSLY.
 *       There may be complications if you have an edge-case scenario.
 * @param event Event name
 * @param emitter Target EventEmitter
 * @param fn Tap function
 * @param source Source of the event
 */
export function generateEventTap(event: string, emitter: Readonly<EventEmitter>, fn: any, source?: string) {
  if (typeof event !== 'string' || event.length === 0) {
    throw new TypeError('Argument \'event\' is not a string');
  }

  if (!emitter || !(emitter instanceof EventEmitter)) {
    throw new TypeError('Argument \'emitter\' is not an instance of \'EventEmitter\'');
  }

  if (typeof fn !== 'function') {
    throw new TypeError('Argument \'fn\' is not a function');
  }

  if (source !== undefined && typeof source !== 'string') {
    throw new TypeError('Argument \'source\' is not undefined or a string');
  }

  const eventSource = source ? `Event: '${event}'` : `'${source}' -> Event: '${event}'`;
  const tapSource = source ? `Event: '${event}' => Tap '${fn.name || 'anonymous'}'` : `'${source}' -> Event: '${event}' => Tap '${fn.name || 'anonymous'}'`;
  const tapFn = changeFunctionName(fn, tapSource);
  return changeFunctionName((...args: readonly any[]) => {
    emitter.emit(event, ...args);
    tapFn(); // User have to be careful about what they use as this
  }, eventSource);
}

/**
 * Simple object check.
 * @param item
 */
export function isObject(item): boolean {
  return (item && typeof item === 'object' && !Array.isArray(item));
}

/**
 * Deep merge two objects.
 * @param target
 * @param ...sources
 */
export function mergeDeep(target: any, ...sources: readonly any[]) {
  if (sources.length === 0) {
    return target;
  }

  const source = [...sources].shift();

  if (isObject(target) && isObject(source)) {
    for (const key in source) {
      if (isObject(source[key])) {
        if (!target[key]) {
          Object.assign(target, {[key]: {}});
        }

        mergeDeep(target[key], source[key]);
      } else {
        Object.assign(target, {[key]: source[key]});
      }
    }
  }

  return mergeDeep(target, ...sources.slice(1));
}

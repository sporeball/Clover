import { matches } from './util.js';
import reserved from '../util/reserved.js';

/**
 * class representing a token
 */
export class Token {
  /**
   * @param {*} value
   */
  constructor (value) {
    this.value = value;
    this.specifier = specifier(value);
  }
}

/**
 * return the type of a value
 * works with Tokens and with primitive values
 * @param {*} v
 */
export function typeOf (v) {
  let value = v; // true value to work with
  if (v instanceof Token) {
    value = value.value; // haha...
  }
  if (value === undefined) {
    return 'none';
  }
  if (reserved.includes(value)) {
    return 'reserved';
  }
  if (matches(value, /<\d+/)) {
    return 'leaf';
  }
  if (matches(value, /^\(.*\)/)) {
    return 'command';
  }
  if (matches(value, /:(0|[1-9]\d*)$/)) {
    return 'index';
  }
  if (
    Array.isArray(value) ||
    matches(value, /^\[.*\]$/)
  ) {
    return 'array';
  }
  if (
    typeof value === 'number' ||
    (typeof value === 'string' && value !== '' && !isNaN(Number(value)))
  ) {
    return 'number';
  }
  if (matches(value, /^'.*'$/)) {
    return 'string';
  }
  if (typeof value === 'string') {
    if (value.startsWith(':')) {
      return 'mutable';
    }
    return 'string';
  }
  return 'other';
}

/**
 * cast a value to a primitive JavaScript type
 * does not mutate the original value
 * @param {*} v
 * @returns {number|string}
 */
// TODO: automatic and manual
export function cast (v) {
  let value = v; // true value to work with
  if (v instanceof Token) {
    value = value.value; // haha...
  }
  const T = typeOf(value);
  if (T === 'command') {
    return value.slice(1, -1);
  }
  if (T === 'index') {
    const index = Number(value.slice(value.lastIndexOf(':') + 1));
    value = value.slice(0, value.lastIndexOf(':'));
    if (typeOf(value) === 'mutable' && Clover.evItem[value] === undefined) {
      throw new CloverError(
        'cannot index %s before initialization',
        value
      );
    }
    return cast(value)[index];
  }
  if (T === 'array') {
    if (Array.isArray(value)) {
      return value;
    }
    if (value === '[]') {
      return [];
    }
    return value.slice(1, -1)
      .match(/\[.*?\]|'.*'|[^[\]' ]+/g)
      .map(match => cast(match));
  }
  if (T === 'leaf') {
    const index = Number(value.slice(1));
    return Clover.plant.getLeaf(index).working;
  }
  if (T === 'number') {
    return Number(value);
  }
  if (T === 'string') {
    value = value.replace(/\\n/g, '\n');
    if (value.startsWith("'") && value.endsWith("'")) {
      return value.slice(1, -1); // remove
    }
    return value;
  }
  if (T === 'mutable') {
    return Clover.evItem[value.slice(1)];
  }
  return value;
}

/**
 * return the format specifier that matches a token value
 * @param {*} value
 */
function specifier (value) {
  const T = typeOf(value);
  // console.log(value, T);
  if (T === 'reserved') {
    return '%r';
  }
  if (T === 'command') {
    return '%c';
  }
  if (T === 'leaf') {
    return '%L';
  }
  if (T === 'array') {
    return '%l'; // for "list"
  }
  if (T === 'number') {
    return '%n';
  }
  if (T === 'string') {
    return '%s';
  }
  if (T === 'mutable') {
    return '%m';
  }
  return '%a';
}

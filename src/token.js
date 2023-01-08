import { Plant } from './plant.js';
import { Leaf } from './leaf.js';
import { CommandInstance, reservedWords } from './commands.js';
import { matches } from './util.js';
// import reserved from '../util/reserved.js';

/**
 * class representing a token
 */
export class Token {
  /**
   * @param {any} value
   */
  constructor (value) {
    this.value = value;
    this.specifier = specifier(value);
  }
}

/**
 * return the type of a value
 * works with Tokens and with primitive values
 * @param {any} v
 */
export function typeOf (v) {
  let value = v; // true value to work with
  if (v instanceof Token) {
    value = value.value; // haha...
  }
  /**
   * basic types
   */
  if (value === undefined) {
    return 'none';
  }
  if (
    typeof value === 'number' ||
    (
      typeof value === 'string' &&
      value !== '' &&
      value !== '\n' &&
      !isNaN(Number(value))
    )
  ) {
    return 'number';
  }
  if (matches(value, /^'.*?'$/)) {
    return 'string';
  }
  if (
    value === true ||
    value === false ||
    value === 'true' ||
    value === 'false'
  ) {
    return 'boolean';
  }
  if (
    Array.isArray(value) ||
    matches(value, /^\[.*\]$/)
  ) {
    return 'array';
  }
  if (value.constructor?.name === 'CloverError') {
    return 'error';
  }
  if (value instanceof Error) {
    return 'uncaughtError';
  }
  if (
    value instanceof Plant ||
    matches(value, /^@/)
  ) {
    return 'plant';
  }
  if (
    value instanceof Leaf ||
    matches(value, /^<-?\d+/)
  ) {
    return 'leaf';
  }
  /**
   * other types below
   */
  if (reservedWords.includes(value)) {
    return 'reserved';
  }
  if (matches(value, /^:/)) {
    return 'mutable';
  }
  if (
    value instanceof CommandInstance ||
    matches(value, /^\(.*?\)/)
  ) {
    return 'command';
  }
  if (matches(value, /:(0|[1-9]\d*)$/)) {
    return 'index';
  }
  /**
   * string default
   */
  if (typeof value === 'string') {
    return 'string';
  }
  // other
  return 'other';
}

/**
 * cast a value to a primitive JavaScript type
 * does not mutate the original value
 * @param {any} v
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
    return new CommandInstance(value.slice(1, -1));
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
    value = value.slice(1, -1);
    if (value.includes('[') || value.includes(']')) {
      throw new CloverError('cannot cast nested array - build it yourself');
    }
    if (value === '') {
      return [];
    }
    return value
      .match(/\[.*\]|'.*?'|[^[\]' ]+/g)
      .map(match => cast(match));
  }
  if (T === 'plant') {
    return Clover.plants[value.slice(1)];
  }
  if (T === 'leaf') {
    const index = Number(value.slice(1));
    if (Clover.plant.getLeaf(index) === undefined) {
      throw new CloverError('cannot cast leaf at index %t (undefined!)', index);
    }
    return Clover.plant.getLeaf(index).flower;
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
  if (T === 'boolean') {
    if (value === true || value === false) {
      return value;
    }
    if (value === 'true') {
      return true;
    }
    if (value === 'false') {
      return false;
    }
  }
  if (T === 'mutable') {
    return Clover.evItem[value.slice(1)];
  }
  return value;
}

/**
 * return the format specifier that matches a token value
 * @param {any} value
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
  if (T === 'plant') {
    return '%P';
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
  if (T === 'boolean') {
    return '%b';
  }
  if (T === 'mutable') {
    return '%m';
  }
  return '%a';
}

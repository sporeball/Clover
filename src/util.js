import fs from 'fs';
import path from 'path';
import { dequal } from 'dequal/lite';
import { CommandInstance } from './commands.js';
import { Plant } from '../src/plant.js';
import { Leaf } from '../src/leaf.js';
import pretty from '../util/pretty.js';

/**
 * return whether a value is equal to one of multiple passed values
 * @param {any} value the value to check
 * @param {array} values array of valid values
 */
export function any (value, values) {
  return values.includes(value);
}

/**
 * @param {any} value
 */
export function defined (value) {
  return value !== undefined;
}

/**
 * return whether one value is equal to another
 * @param {any} v1
 * @param {any} v2
 */
export function equal (v1, v2) {
  return dequal(v1, v2);
}

/**
 * return whether a value matches a regular expression
 * @param {any} value
 * @param {RegExp} regexp
 */
export function matches (value, regexp) {
  return typeof value === 'string' && value.match(regexp) !== null;
}

/**
 * return the type of a value
 * does not work with AST nodes, because those already have types
 * @param {any} value
 * @returns {string}
 */
export function typeOf (value) {
  if (value === undefined) {
    return 'none';
  }
  if (typeof value === 'number') {
    return 'number';
  }
  if (typeof value === 'string') {
    return 'string';
  }
  if (typeof value === 'boolean') {
    return 'boolean';
  }
  if (Array.isArray(value)) {
    return typeOfList(value);
  }
  if (value.constructor.name === 'CloverError') {
    return 'error';
  }
  if (value instanceof Error) {
    return 'uncaughtError';
  }
  if (value instanceof Plant) {
    return 'plant';
  }
  if (value instanceof Leaf) {
    return 'leaf';
  }
  if (value instanceof CommandInstance) {
    return 'command';
  }
  return 'other';
}

/**
 * given a list, return a more specific list type,
 * taking into account its shape
 * @param {array} list
 * @returns {string}
 */
export function typeOfList (list) {
  // all elements must be of the same type, and of the same depth
  // empty case
  if (list.length === 0) {
    return 'list';
  }
  // 1-dimensional case
  if (list.every(
    item =>
      !Array.isArray(item) && typeOf(item) === typeOf(list[0])
  )) {
    return typeOf(list[0]) + '[]';
  }
  // n-dimensional case
  if (list.every(
    item =>
      Array.isArray(item) &&
      typeOfList(item) === typeOfList(list[0])
  )) {
    return typeOfList(list[0]) + '[]';
  }
  throw new CloverError('invalid list shape');
}

/**
 * return whether a value is a list
 * accomplished through a type check
 * @param {any} value
 * @returns {boolean}
 */
export function isList (value) {
  return (
    typeOf(value) === 'list' ||
    typeOf(value).endsWith('[]')
  );
}

/**
 * pretty print a value
 * @param {any} value
 */
export function pprint (value) {
  console.log(pretty(value));
}

/**
 * perform string substitution with format specifiers
 * supported specifiers include:
 *   %s  plain string
 *   %t  Clover token
 * @param {string} str
 * @param {...any} subs values to substitute in
 */
export function format (str, ...subs) {
  (str.match(/%./gm) || []).forEach((match, index) => {
    if (match === '%s') {
      if (subs[index] !== undefined) {
        str = str.replace(match, subs[index]);
      }
    } else if (match === '%t') {
      str = str.replace(match, pretty(subs[index]));
    }
  });
  return str;
}

/**
 * cause Clover to output a value
 * updates Clover.outputs
 * @param {any} value
 */
export function output (value) {
  Clover.outputs.push(value);
  if (!Clover.options.test) {
    pprint(value);
  }
}

/**
 * escape special characters in a string
 * useful anywhere that `String.prototype.match` is being used
 * @param {string} str
 */
export function escape (str) {
  return str.replace(/[.*+?^$()[\]{}|\\]/g, match => '\\' + match);
}

/**
 * return the contents of a file
 * @param {string} filePath
 * @returns {string}
 */
export function open (filePath) {
  return fs.readFileSync(
    path.resolve(filePath), { encoding: 'utf-8' }
  );
}

import fs from 'fs';
import path from 'path';
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
  return v1 === v2;
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

export function arrayDepth (arr) {
  return Array.isArray(arr)
    ? 1 + Math.max(0, ...arr.map(arrayDepth))
    : 0;
}

export function open (filePath) {
  return fs.readFileSync(
    path.resolve(filePath), { encoding: 'utf-8' }
  );
}

import { escape } from './util.js';

const T = {
  number: /^0|^-?[1-9]\d*/g,
  string: /^'.*?'/g,
  boolean: /^true|^false/,
  openParen: '(',
  closeParen: ')',
  openBracket: '[',
  closeBracket: ']',
  openAngle: '<',
  closeAngle: '>',
  at: '@',
  colon: ':',
  equals: '=',
  newline: '\n',
  whitespace: /^\s+/g,
  identifier: /^[a-z]+/g
};

/**
 * match a string against a matcher value
 * returns undefined if there is no match
 * @param {string} value
 * @param {string|RegExp} matcher
 * @returns {string|undefined}
 */
function stringMatch (value, matcher) {
  if (typeof matcher === 'string') {
    return (
      value.match(new RegExp('^' + escape(matcher), 'g')) || []
    )[0];
  }
  if (matcher instanceof RegExp) {
    return (value.match(matcher) || [])[0];
  }
}

/**
 * @param {string} code
 * @returns {object[]}
 */
export function tokenize (code) {
  let tokens = [];
  // while there is still code to tokenize...
  while (code.length > 0) {
    // find the first expression
    const expr = Object.entries(T)
      // which the code matches.
      .find(entry => {
        return stringMatch(code, entry[1]) !== undefined;
      })
    if (expr === undefined) {
      throw new Error('no matching token type found');
    }
    const [type, matcher] = expr;
    // use that match to make a token...
    const match = stringMatch(code, matcher);
    tokens.push({
      type,
      value: match
    });
    // then remove it from the code.
    code = code.slice(match.length);
  }
  // remove whitespace tokens (not significant here).
  tokens = tokens.filter(token => token.type !== 'whitespace');
  return tokens;
}

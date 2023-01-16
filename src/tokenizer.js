import { escape } from './util.js';

/**
 * the first step in executing a Clover program is to tokenize it.
 * here the code is converted into a flat list of tokens.
 */

// object of match values for the different token types
const T = {
  number: /^0|^-?[1-9]\d*/g,
  char: /^'.*?'/g,
  string: /^".*?"/g,
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
  star: '*',
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
 * tokenize a string containing Clover code
 * @param {string} code
 * @returns {object[]}
 */
export function tokenize (code) {
  let tokens = [];
  // while there is still code to tokenize...
  while (code.length > 0) {
    // find the first expression
    const expr = Object.entries(T)
      // which the code matches,
      .find(entry => {
        return stringMatch(code, entry[1]) !== undefined;
      });
    // throwing if there is no such expression.
    if (expr === undefined) {
      throw new Error('no matching token type found');
    }
    const [type, matcher] = expr;
    // use the match to make a token...
    const match = stringMatch(code, matcher);
    tokens.push({
      type,
      value: match
    });
    // then remove the match from the code.
    code = code.slice(match.length);
    // console.log(tokens);
  }
  // keep all tokens except for whitespace.
  tokens = tokens.filter(token => token.type !== 'whitespace');
  return tokens;
}

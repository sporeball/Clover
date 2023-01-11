import { escape } from './util.js';

/**
 * class representing a token
 */
class Token {
  /**
   * @param {string} type
   * @param {string} value
   */
  constructor (type, value) {
    this.type = type;
    this.value = value;
  }
}

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
  identifier: /^[^\s]+/g
};

/**
 * match a string against an Expr
 * returns undefined if there is no match
 * @param {string} value
 * @param {Expr} expr
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
 * @returns {Token[]}
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
    tokens.push(
      new Token(type, match)
    );
    // then remove it from the code.
    code = code.slice(match.length);
  }
  // remove whitespace tokens (not significant here).
  tokens = tokens.filter(token => token.type !== 'whitespace');
  return tokens;
}

// console.dir(
//   tokenize(
//     `focus [1 'two' 3]`
//   ),
//   { depth: null }
// );

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

/**
 * class representing a terminal value
 */
class Expr {
  /**
   * @param {string|RegExp} pattern
   */
  constructor (pattern) {
    this.pattern = pattern;
    this.prec = 0;
  }
}

// class Choice {
//   constructor (choices, obj) {
//     this.choices = choices;
//     this.prec = obj.prec;
//   }
// }

const T = {
  // value: function() {
  //   return new Choice(
  //     [this.number, this.string],
  //     { prec: 1 }
  //   );
  // },
  number: () => new Expr(/^0|^[1-9]\d*/g),
  string: () => new Expr(/^'.*?'/g),
  whitespace: () => new Expr(/^\s+/g),
  word: () => new Expr(/[^ ]+/g)
}

/**
 * match a string against an Expr
 * returns undefined if there is no match
 * @param {string} value
 * @param {Expr} expr
 * @returns {string|undefined}
 */
function stringMatch (value, expr) {
  if (typeof expr.pattern === 'string') {
    return (value.match(escape(expr.pattern)) || [])[0];
  }
  if (expr.pattern instanceof RegExp) {
    return (value.match(expr.pattern) || [])[0];
  }
}

/**
 * @param {string} code
 * @returns {Token[]}
 */
export function tokenize (code) {
  // the first step is to create a flat list.
  let tokens = [];
  // create an object
  const bound = Object.fromEntries(
    // containing the token type definitions...
    Object.entries(T)
      .map(entry => {
        // with values replaced by their return values (bound to T),
        entry[1] = entry[1].bind(T)();
        // and the key added.
        entry[1].type = entry[0];
        return entry;
      })
  );
  // while there is still code to tokenize...
  while (code.length > 0) {
    // find the first terminal expression
    const expr = Object.values(bound)
      .filter(value => value instanceof Expr)
      // which the code matches.
      .find(value => {
        return stringMatch(code, value) !== undefined;
      })
    if (expr === undefined) {
      throw new Error('no matching token type found');
    }
    // use that match to make a token...
    const match = stringMatch(code, expr);
    tokens.push(
      new Token(expr.type, match)
    );
    // then remove it from the code.
    code = code.slice(match.length);
  }
  // remove whitespace tokens (not significant here).
  tokens = tokens.filter(token => token.type !== 'whitespace');
  return tokens;
}

console.dir(
  tokenize(
    "focus 20"
  ),
  { depth: null }
);

import { escape } from './util.js';

class Token {
  constructor (type, value) {
    this.type = type;
    this.value = value;
  }
}

class Structure {
  constructor (value) {
    this.value = value;
  }
}

const T = {
  whitespace: /^\s+/,
  openParen: '(',
  closeParen: ')',
  openBracket: '[',
  closeBracket: ']',
  number: /^0|^[1-9]\d*/,
  string: /^'.*?'/,
  word: /^[^ ]+/
}

// const S = {
// }

export function tokenize (code) {
  let tokens = [];
  while (code.length > 0) {
    const token = Object.entries(T)
      .find(entry => {
        const [key, value] = entry;
        if (typeof value === 'string') {
          return code.match(escape(value));
        }
        return code.match(value);
      });
    if (token === undefined) {
      throw new Error('no matching token type found');
    }
    const [type, matchValue] = token;
    let match;
    if (typeof matchValue === 'string') {
      match = code.match(escape(matchValue))[0];
    } else {
      match = code.match(matchValue)[0];
    }
    tokens.push(
      new Token(type, match)
    );
    code = code.slice(match.length);
  }
  return tokens
    .filter(token => token.type !== 'whitespace');
}

console.dir(
  tokenize(
    "focus 20"
  ),
  { depth: null }
);

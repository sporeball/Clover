import { escape } from './util.js';

class Token {
  constructor (type, value) {
    this.type = type;
    this.value = value;
  }
}

const tokenPatterns = {
  openParen: '(',
  closeParen: ')'
};

export function tokenize (code) {
  const tokens = [];
  while (code.length > 0) {
    const pattern = Object.keys(tokenPatterns)
      .find(key => code.match(escape(tokenPatterns[key])));
    if (pattern === undefined) {
      throw new Error('no token pattern found');
    }
    const match = code.match(escape(tokenPatterns[pattern]))[0];
    tokens.push(
      new Token(pattern, match)
    );
    code = code.slice(match.length);
  }
  return tokens;
}

console.log(tokenize('((())'));

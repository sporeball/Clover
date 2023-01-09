import { escape } from './util.js';

class Token {
  constructor (type, value) {
    this.type = type;
    this.value = value;
  }
}

class Structure {
  constructor (type, value) {
    this.type = type;
    this.value = value;
  }
}

const $ = {
  openParen: '(',
  closeParen: ')'
};

const $$ = {
  matching: [$.openParen, $.closeParen]
};

export function tokenize (code) {
  let tokens = [];
  while (code.length > 0) {
    const pattern = Object.keys($)
      .find(key => code.match(escape($[key])));
    if (pattern === undefined) {
      throw new Error('no token pattern found');
    }
    const match = code.match(escape($[pattern]))[0];
    tokens.push(
      new Token(pattern, match)
    );
    code = code.slice(match.length);
  }
  // turn into structures
  const structures = [];
  while (tokens.length > 0) {
    const valuesOnly = tokens.map(token => token.type);
    const structure = Object.keys($$)
      .find(key => {
        const structureValue = $$[key];
        const sliding = valuesOnly.slice(0, structureValue.length);
        if (sliding.every((value, i) => $[value].match(escape(structureValue[i]))
        )) {
          return true;
        }
          return false;
      });
    if (structure === undefined) {
      structures.push(tokens.shift());
    } else {
      structures.push(
        new Structure(structure, tokens.slice(0, $$[structure].length))
      );
      tokens = tokens.slice($$[structure].length);
    }
  }
  return structures;
}

console.dir(tokenize('((())'), { depth: null });

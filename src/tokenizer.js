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
  constructor (type, pattern) {
    this.type = type;
    this.pattern = pattern;
    this.prec = 0;
  }
}

class Choice {
  constructor (type, choices, obj) {
    this.type = type;
    this.choices = choices.map(choice => {
      if (choice instanceof Function) {
        return choice.bind(T)();
      }
      return choice;
    });
    this.prec = obj.prec || 0;
  }
}

class Seq {
  constructor (type, seq, obj) {
    this.type = type;
    this.seq = seq.map(item => {
      if (item instanceof Function) {
        return item.bind(T)();
      }
      return item;
    });
    this.prec = obj.prec || 0;
  }
}

class Repeat {
  constructor (repeat, times) {
    this.repeat = repeat.bind(T)();
    this.times = times;
  }
}

const T = {
  command: function() {
    return new Seq(
      'command',
      [this.word, new Repeat(this.value)],
      { prec: 2 }
    );
  },
  value: function() {
    return new Choice(
      'value',
      [this.number, this.string],
      { prec: 1 }
    );
  },
  number: () => new Expr('number', /^0|^[1-9]\d*/g),
  string: () => new Expr('string', /^'.*?'/g),
  whitespace: () => new Expr('whitespace', /^\s+/g),
  openBracket: () => new Expr('openBracket', '['),
  closeBracket: () => new Expr('closeBracket', ']'),
  openParen: () => new Expr('openParen', '('),
  closeParen: () => new Expr('closeParen', ')'),
  word: () => new Expr('word', /[^ ]+/g)
};

/**
 * match a string against an Expr
 * returns undefined if there is no match
 * @param {string} value
 * @param {Expr} expr
 * @returns {string|undefined}
 */
function stringMatch (value, expr) {
  if (typeof value !== 'string') {
    return;
  }
  if (typeof expr.pattern === 'string') {
    return (
      value.match(new RegExp('^' + escape(expr.pattern), 'g')) || []
    )[0];
  }
  if (expr.pattern instanceof RegExp) {
    return (value.match(expr.pattern) || [])[0];
  }
}

function tokenMatch (tokens, matcher) {
  if (matcher instanceof Expr) {
    // if (stringMatch(tokens[0].value, matcher)) {
    if (tokens[0].type === matcher.type) {
      return [tokens[0]];
    }
  }
  if (matcher instanceof Choice) {
    if (matcher.choices.find(choice => tokens[0].type === choice.type)) {
      return [tokens[0]];
    }
  }
  if (matcher instanceof Seq) {
    const tokensCopy = [...tokens];
    let length = 0;
    for (const [index, seqItem] of matcher.seq.entries()) {
      if (tokenMatch(tokensCopy, seqItem)) {
        const matchLength = tokenMatch(tokensCopy, seqItem).length;
        length += matchLength;
        tokensCopy.splice(0, matchLength);
      } else {
        return undefined;
      }
    }
    return tokens.slice(0, length);
  }
  if (matcher instanceof Repeat) {
    if (tokens[0].type === matcher.repeat.type) {
      const nonMatchingIndex = tokens
        .findIndex(token => token.type !== matcher.repeat.type);
      if (nonMatchingIndex === -1) {
        return tokens;
      }
      return tokens.slice(
        0,
        tokens.findIndex(token => token.type !== matcher.repeat.type)
      );
    }
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
        // with values replaced by their return values (bound to T).
        entry[1] = entry[1].bind(T)();
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

  // the next step is to make structures from the flat list.
  // start at a precedence of 1.
  let prec = 1;
  let startPosition = 0;
  while (true) {
    // stop if there are no rules with the current precedence
    if (startPosition > tokens.length - 1) {
      startPosition = 0;
      prec++;
    }
    const now = Object.values(bound)
      .filter(value => value.prec === prec);
    if (now.length === 0) {
      break;
    }
    const rule = now
      .find(value => {
        return tokenMatch(tokens.slice(startPosition), value) !== undefined;
      });
    if (rule === undefined) {
      startPosition++;
      continue;
    }
    const match = tokenMatch(tokens.slice(startPosition), rule);
    tokens.splice(
      startPosition,
      match.length,
      new Token(rule.type, match)
    );
    startPosition++;
  }
  return tokens;
}

console.dir(
  tokenize(
    `focus ['a' 'b']
    sum 3`
  ),
  { depth: null }
);

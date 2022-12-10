import Token, { typeOf, cast } from './token.js';
import { accesses } from './mutable.js';
import { output, escape } from './util.js';

/**
 * each command written in a clover program consists of a list of tokens.
 * if this list begins with a valid token, the interpreter will call a
 * corresponding function, which runs code for that command if the list
 * follows a valid pattern.
 * all such functions take the entire list, and consume it one token at a time
 * through callbacks.
 */

/**
 * command superclass
 */
class Command {
  /**
   * @param {string} pattern format string for the command's token pattern
   * @param {Function} body underlying command code
   */
  constructor (pattern, body) {
    this.pattern = pattern;
    this.body = body;
  }
}

class Verb extends Command {
  run (args) {
    this.body(args);
    Clover.focus = Clover.working;
  }
}

class Noun extends Command {
  run (args) {
    this.body(args);
  }
}

function worksWith (T) {
  const t = typeof Clover.working;
  if (T !== t) {
    throw new CloverError(
      'expected working value of type %s, got %s instead',
      T, t
    );
  }
}

/**
 * execute a command given the tokens
 * @param {string[]} tokens
 */
// TODO: some would probably call this function overloaded
export function evaluate (tokens) {
  // the list of commands that the current token stream might match
  let possible = Object.entries(commands);
  // for each token...
  for (let i = 0; i < tokens.length; i++) {
    // filter to those commands where...
    possible = possible.filter(item => {
      const command = item[1];
      // the next part of the command pattern...
      const next = command.pattern.split(' ')[i];
      return tokens[i].value === next || // equals the token,
        tokens[i].specifier === next || // the token's format specifier,
        next === '%a'; // or the "any" specifier
    });
    // throw if there are no possible options
    if (possible.length === 0) {
      // TODO: this could be made slightly clearer for invalid streams such as
      // (at the time of writing) `add f`
      throw new CloverError(
        'no matching command pattern was found (offending token: %t)',
        tokens[i].value
      );
    }
  }

  // at this point there is just one option left
  const [, command] = possible[0];
  const patternTokens = command.pattern.split(' ');
  if (tokens.length < patternTokens.length) {
    throw new CloverError(
      'no matching command pattern was found (ran out of tokens)'
    );
  }

  // some tokens simply help to form the pattern, and can be dropped.
  // to find the indices of any arguments...
  const argIndices = patternTokens
    // for each segment of the pattern...
    .map((seg, i, arr) => {
      // replace with its index if it is given by a format specifier,
      if (arr[i].startsWith('%')) {
        return i;
      }
      // or with null otherwise,
      return null;
    })
    // and remove null values
    .filter(x => x !== null);

  // filter the token stream to the values...
  const args = tokens.map(token => token.value)
    // of the tokens with those indices
    .filter((token, i) => argIndices.includes(i));

  command.run(args);
}

/**
 * verbs below
 */

const add = new Verb('add %a', args => {
  worksWith('number');
  const [value] = args;
  Token.assertAny(typeOf(value), ['number', 'mutable']);
  Clover.working += cast(value);
});

const addToMut = new Verb('add to %m', args => {
  worksWith('number');
  accesses(args[0], 'number');
  const [mut] = args;
  Clover.mutables[mut] += Clover.working;
});

const count = new Verb('count %a', args => {
  const [value] = args;
  if (typeOf(Clover.working) === 'array') {
    Clover.working = Clover.working
      .filter(x => x === cast(value))
      .length;
    return;
  }
  Clover.working = (Clover.working.match(
    new RegExp(escape(cast(value)), 'g')
  ) || [])
    .length;
});

const divide = new Verb('divide by %a', args => {
  worksWith('number');
  const [value] = args;
  Token.assertAny(typeOf(value), ['number', 'mutable']);
  Clover.working /= cast(value);
});

const focus = new Verb('focus %a', args => {
  const [value] = args;
  Clover.focus = cast(value);
  Clover.working = Clover.focus;
});

const multiply = new Verb('multiply by %a', args => {
  worksWith('number');
  const [value] = args;
  Token.assertAny(typeOf(value), ['number', 'mutable']);
  Clover.working *= cast(value);
});

const refocus = new Verb('refocus', () => {
  Clover.working = Clover.focus;
});

const set = new Verb('set %m to %a', args => {
  const [mut, value] = args;
  Clover.mutables[mut] = cast(value);
});

const show = new Verb('show', () => {
  output(Clover.working);
});

const showMonadic = new Verb('show %a', args => {
  const [value] = args;
  output(cast(value));
});

const split = new Verb('split %a %a', args => {
  worksWith('string');
  const [connector, splitter] = args;

  Token.assertAny(connector, ['by', 'on']);

  let value;
  // TODO: singular and plural
  switch (splitter) {
    case 'newlines':
      value = '\n';
      break;
    case 'blocks':
      value = '\n\n';
      break;
    case 'spaces':
      value = ' ';
      break;
    default:
      value = cast(splitter);
  }

  if (typeOf(Clover.working) === 'array') {
    Clover.working = Clover.working.map(x => x.split(value));
    return;
  }
  Clover.working = Clover.focus.split(value);
  // TODO: giving
});

const subtract = new Verb('subtract %a', args => {
  worksWith('number');
  const [value] = args;
  Token.assertAny(typeOf(value), ['number', 'mutable']);
  Clover.working -= cast(value);
});

const subtractFromMut = new Verb('subtract from %m', args => {
  worksWith('number');
  accesses(args[0], 'number');
  const [mut] = args;
  Clover.mutables[mut] -= Clover.working;
});

const quiet = new Verb('quiet', () => {
  Clover.quiet = true;
});

/**
 * nouns below
 */

const countOf = new Noun('count of %a', count.body);
const equals = new Noun('equals %m', args => {
  Clover.mutables[args[0]] = Clover.working;
});
const over = new Noun('over %a', divide.body);
const minus = new Noun('minus %a', subtract.body);
const plus = new Noun('plus %a', add.body);
const splitted = new Noun('splitted %a %a', split.body);
const times = new Noun('times %a', multiply.body);

export const commands = {
  // verbs
  add,
  addToMut,
  count,
  divide,
  focus,
  multiply,
  refocus,
  set,
  show,
  showMonadic,
  split,
  subtract,
  subtractFromMut,
  quiet,
  // nouns
  countOf,
  equals,
  over,
  minus,
  plus,
  splitted,
  times
};

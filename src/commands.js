import Token, { typeOf, cast } from './token.js';
import { accesses } from './mutable.js';
import { output, escape, arrayDepth } from './util.js';

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

  run (args) {
    this.body(args);
  }
}

function worksWith (T) {
  const t = typeOf(Clover.working);
  if (T !== t) {
    throw new CloverError(
      'expected working value of type %s, got %s instead',
      T, t
    );
  }
}

/**
 * execute a command
 * @param {string} line
 */
// TODO: some would probably call this function overloaded
export function evaluate (line) {
  // tokenize
  let tokens = line.match(/'.*'|\[.*\](:(0|[1-9]\d*))?|\(.*\)|[^ ]+/g)
    .map(token => new Token.Token(token));
  // the list of commands that these tokens might match
  let possible = Object.entries(commands);

  let rhs;
  const rhsIndex = tokens.findIndex(token => token.value === '=');
  if (rhsIndex > -1) {
    rhs = tokens.slice(rhsIndex + 1);
    tokens = tokens.slice(0, rhsIndex);
  }

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

  if (rhs) {
    const {value, specifier} = rhs[0];
    if (specifier !== '%m') {
      throw new CloverError('invalid right-hand side value %t', value);
    }
    Clover.mutables[value] = Clover.working;
  }
}

/**
 * verbs below
 */

const add = new Command('add %a', args => {
  worksWith('number');
  const [value] = args;
  Token.assertAny(typeOf(value), ['number', 'mutable']);
  Clover.working += cast(value);
});

const apply = new Command('apply %c', args => {
  worksWith('array');
  const [command] = args;
  let cachedFocus = Clover.focus;
  let cached = [...Clover.working];
  cached.forEach((x, i, r) => {
    Clover.focus = r[i];
    Clover.working = r[i];
    evaluate(cast(command));
    r[i] = Clover.working;
  });
  Clover.working = cached;
  Clover.focus = cachedFocus;
});

const comp = new Command('comp %l', args => {
  worksWith('array');
  const list = cast(args[0]);
  const unique = list.filter((x, i, r) => r.indexOf(x) === i);
  const obj = Object.fromEntries(
    unique.map((x, i) => [x, Clover.working[i]])
  );
  Clover.working = list.map(item => obj[item]);
});

const count = new Command('count %a', args => {
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

const divide = new Command('divide by %a', args => {
  worksWith('number');
  const [value] = args;
  Token.assertAny(typeOf(value), ['number', 'mutable']);
  Clover.working /= cast(value);
});

const focus = new Command('focus', () => {
  Clover.working = Clover.focus;
});

const focusMonadic = new Command('focus %a', args => {
  const [value] = args;
  Clover.focus = cast(value);
  Clover.working = Clover.focus;
});

const group = new Command('groups of %n', args => {
  worksWith('array');
  let [size] = args;
  size = cast(size);
  if (size === 0) {
    throw new CloverError('cannot split into groups of 0');
  }
  const newArray = [];
  for (let i = 0; i < Clover.working.length; i += size) {
    newArray.push(Clover.working.slice(i, i + size));
  }
  Clover.working = [...newArray];
});

const multiply = new Command('multiply by %a', args => {
  worksWith('number');
  const [value] = args;
  Token.assertAny(typeOf(value), ['number', 'mutable']);
  Clover.working *= cast(value);
});

const product = new Command('product', () => {
  worksWith('array');
  // TODO: should it throw if it finds non-numbers instead?
  Clover.working = Clover.working.filter(v => typeOf(v) === 'number')
    .reduce((a, c) => a * cast(c), 1);
});

// const refocus = new Verb('refocus', () => {
//   Clover.working = Clover.focus;
// });

const set = new Command('set %m to %a', args => {
  const [mut, value] = args;
  Clover.mutables[mut] = cast(value);
});

const show = new Command('show', () => {
  output(Clover.working);
});

const showMonadic = new Command('show %a', args => {
  const [value] = args;
  output(cast(value));
});

const split = new Command('split %a %a', args => {
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
    case 'chars':
      value = '';
      break;
    default:
      value = cast(splitter);
  }

  Clover.working = Clover.focus.split(value);
  // TODO: giving
});

const subtract = new Command('subtract %a', args => {
  worksWith('number');
  const [value] = args;
  Token.assertAny(typeOf(value), ['number', 'mutable']);
  Clover.working -= cast(value);
});

const sum = new Command('sum', () => {
  worksWith('array');
  // TODO: should it throw if it finds non-numbers instead?
  Clover.working = Clover.working.filter(v => typeOf(v) === 'number')
    .reduce((a, c) => a + cast(c), 0);
});

export const commands = {
  // verbs
  add,
  apply,
  comp,
  count,
  divide,
  focus,
  focusMonadic,
  group,
  multiply,
  product,
  set,
  show,
  showMonadic,
  split,
  subtract,
  sum
};

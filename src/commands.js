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

  run (value, args) {
    return this.body(value, args);
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

  let mappingList;
  if (typeOf(tokens[0]) === 'mutable') {
    mappingList = tokens[0].value;
    tokens = tokens.slice(1);
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

  Clover.working = command.run(Clover.working, args);

  if (rhs) {
    const {value, specifier} = rhs[0];
    if (specifier !== '%m') {
      throw new CloverError('invalid right-hand side value %t', value);
    }
    Clover.mutables[value] = Clover.working;
  }
}

/**
 * commands below
 */

const add = new Command('add %a', (value, args) => {
  const [addend] = args;
  Token.assertType(value, 'number');
  Token.assertAny(typeOf(addend), ['number', 'mutable']);
  return value + cast(addend);
});

// FIXME
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

const comp = new Command('comp %l', (value, args) => {
  const list = cast(args[0]);
  Token.assertType(value, 'array');
  const unique = list.filter((x, i, r) => r.indexOf(x) === i);
  const obj = Object.fromEntries(
    unique.map((x, i) => [x, value[i]])
  );
  return list.map(item => obj[item]);
});

const count = new Command('count %a', (value, args) => {
  const [searchValue] = args;
  Token.assertAny(typeOf(value), ['array', 'string']);
  switch (typeOf(value)) {
    case 'array':
      return value
        .filter(x => x === cast(searchValue))
        .length;
    case 'string':
      return (value.match(
        new RegExp(escape(cast(searchValue)), 'g')
      ) || [])
        .length;
  }
});

const divide = new Command('divide by %a', (value, args) => {
  const [divisor] = args;
  Token.assertType(value, 'number');
  Token.assertAny(typeOf(divisor), ['number', 'mutable']);
  return value / cast(divisor);
});

const flat = new Command('flatten', (value) => {
  Token.assertType(value, 'array');
  return value.flat();
});

const focus = new Command('focus', (value) => {
  return Clover.focus;
});

const focusMonadic = new Command('focus %a', (value, args) => {
  const [focusValue] = args;
  Clover.focus = cast(focusValue);
  return Clover.focus;
});

const group = new Command('groups of %n', (value, args) => {
  const size = cast(args[0]);
  Token.assertType(size, 'number');
  if (size === 0) {
    throw new CloverError('cannot split into groups of 0');
  }
  Token.assertType(value, 'array');
  const newArray = [];
  for (let i = 0; i < Clover.working.length; i += size) {
    newArray.push(Clover.working.slice(i, i + size));
  }
  return [...newArray];
});

const multiply = new Command('multiply by %a', (value, args) => {
  const [multiplier] = args;
  Token.assertType(value, 'number');
  Token.assertAny(typeOf(multiplier), ['number', 'mutable']);
  return value * cast(multiplier);
});

const product = new Command('product', (value) => {
  Token.assertType(value, 'array');
  // TODO: should it throw if it finds non-numbers instead?
  return value.filter(v => typeOf(v) === 'number')
    .reduce((a, c) => a * cast(c), 1);
});

// const refocus = new Verb('refocus', () => {
//   Clover.working = Clover.focus;
// });

// const set = new Command('set %m to %a', args => {
//   const [mut, value] = args;
//   Clover.mutables[mut] = cast(value);
// });

// const show = new Command('show', () => {
//   output(Clover.working);
//   return Clover.working;
// });

const showMonadic = new Command('show %a', (value, args) => {
  const [showValue] = args;
  output(cast(showValue));
  return value;
});

const split = new Command('split %a %a', (value, args) => {
  const [connector, splitter] = args;

  Token.assertType(value, 'string');
  Token.assertAny(connector, ['by', 'on']);
  Token.assertType(splitter, 'string');

  // TODO: singular and plural
  switch (splitter) {
    case 'newlines':
      return value.split('\n');
    case 'blocks':
      return value.split('\n\n');
    case 'spaces':
      return value.split(' ');
    case 'chars':
      return value.split('');
    default:
      return value.split(cast(splitter));
  }
});

const subtract = new Command('subtract %a', (value, args) => {
  const [subtrahend] = args;
  Token.assertType(value, 'number');
  Token.assertAny(typeOf(subtrahend), ['number', 'mutable']);
  return value - cast(subtrahend);
});

const sum = new Command('sum', (value) => {
  Token.assertType(value, 'array');
  // TODO: should it throw if it finds non-numbers instead?
  return value.filter(v => typeOf(v) === 'number')
    .reduce((a, c) => a + cast(c), 0);
});

export const commands = {
  // verbs
  add,
  apply,
  comp,
  count,
  divide,
  flat,
  focus,
  focusMonadic,
  group,
  multiply,
  product,
  // set,
  // show,
  showMonadic,
  split,
  subtract,
  sum
};

import assert from './assert.js';
import { Token, typeOf, cast } from './token.js';
// import { accesses } from './mutable.js';
import { output, escape } from './util.js';

/**
 * each command written in a Clover program consists of a list of tokens.
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

/**
 * special commands act on an entire list item, not just its working value
 */
class SpecialCommand extends Command { }

/**
 * sugar commands are one-liners which alias to another command
 */
class Sugar extends Command {
  constructor (pattern, cmd) {
    super(pattern);
    this.body = cmd.body;
  }
}

/**
 * execute a command
 * @param {string} line
 */
// TODO: some would probably call this function overloaded
export function evaluate (line, value) {
  // tokenize
  let tokens = line.match(
    /'.*'|\[.*\](:(0|[1-9]\d*))?|\(.*\)|[^ ]+/g
  )
    .map(token => new Token(token));
  // the list of commands that these tokens might match
  let possible = Object.entries(commands);

  let rhs;
  // if the command has a right-hand side...
  const rhsIndex = tokens.findIndex(token => token.value === '=');
  if (rhsIndex > -1) {
    // store it for later
    rhs = tokens.slice(rhsIndex + 1);
    // and remove it from the list of tokens
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

  // special commands replace the entire item,
  if (command instanceof SpecialCommand) {
    value = command.run(value, args);
  // while other commands replace only its working value
  } else {
    value.working = command.run(value.working, args);
  }

  // if the command had a right-hand side...
  if (rhs) {
    // ensure it consisted of a mutable
    const v = rhs[0].value;
    const specifier = rhs[0].specifier;
    if (specifier !== '%m') {
      throw new CloverError('invalid right-hand side value %t', v);
    }
    // add that mutable to the item
    value[v] = value.working;
    // move the working value to the end
    delete value.working;
    value.working = value[v];
  }

  return value;
}

/**
 * commands below
 */

const add = new Command('add %a', (value, args) => {
  const [addend] = args;
  assert.type(value, 'number');
  assert.any(typeOf(addend), ['number', 'mutable']);
  return value + cast(addend);
});

const apply = new Command('apply %c', (value, args) => {
  const [command] = args;
  return value.map((x, i, r) => {
    const obj = { working: x };
    return evaluate(cast(command), obj).working; // collapse
  });
});

const comp = new Command('comp %l', (value, args) => {
  const list = cast(args[0]);
  assert.type(value, 'array');
  const unique = list.filter((x, i, r) => r.indexOf(x) === i);
  const obj = Object.fromEntries(
    unique.map((x, i) => [x, value[i]])
  );
  return list.map(item => obj[item]);
});

const count = new Command('count %a', (value, args) => {
  const [searchValue] = args;
  assert.any(typeOf(value), ['array', 'string']);
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
  assert.type(value, 'number');
  assert.any(typeOf(divisor), ['number', 'mutable']);
  return value / cast(divisor);
});

const flat = new Command('flatten', (value) => {
  assert.type(value, 'array');
  return value.flat();
});

const focus = new Command('focus', (value) => {
  return Clover.focus;
});

const focusMonadic = new SpecialCommand('focus %a', (value, args) => {
  const [focusValue] = args;
  if (typeOf(focusValue) === 'mutable') {
    value.working = value[focusValue];
  } else {
    value.working = cast(focusValue);
  }
  return value;
});

const group = new Command('groups of %n', (value, args) => {
  const size = cast(args[0]);
  assert.type(size, 'number');
  if (size === 0) {
    throw new CloverError('cannot split into groups of 0');
  }
  assert.type(value, 'array');
  const newArray = [];
  for (let i = 0; i < value.length; i += size) {
    newArray.push(value.slice(i, i + size));
  }
  return [...newArray];
});

const itemize = new SpecialCommand('itemize %m', (value, args) => {
  const [dest] = args;
  // assert.type(value, 'array');
  if (value.length > 1) {
    throw new CloverError(
      'ensure focus contains only one item object before itemizing'
    );
  }
  if (!dest.endsWith('s')) {
    throw new CloverError('itemize list should be a plural word');
  }
  const prop = dest.slice(0, -1);
  const srcWorking = value.working;
  const srcItemCount = value.working.length;
  return Array(srcItemCount)
    .fill(0) // dummy value
    .map((item, index) => {
      item = { ...value };
      item[prop] = srcWorking[index];
      // move the working value to the end
      delete item.working;
      item.working = srcWorking[index];
      // done
      return item;
    });
});

const maximum = new Command('maximum', (value) => {
  assert.type(value, 'array');
  return Math.max(...value.filter(Number));
});

const minimum = new Command('minimum', (value) => {
  assert.type(value, 'array');
  return Math.min(...value.filter(Number));
});

const multiply = new Command('multiply by %a', (value, args) => {
  const [multiplier] = args;
  assert.type(value, 'number');
  assert.any(typeOf(multiplier), ['number', 'mutable']);
  return value * cast(multiplier);
});

const product = new Command('product', (value) => {
  assert.type(value, 'array');
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

const show = new Command('show', () => {
  output(Clover.working);
  return Clover.working;
});

const showMonadic = new Command('show %a', (value, args) => {
  const [showValue] = args;
  output(cast(showValue));
  return value;
});

const split = new Command('split %a %a', (value, args) => {
  const [connector, splitter] = args;

  assert.type(value, 'string');
  assert.any(connector, ['by', 'on']);
  // Token.assertType(splitter, 'string');

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
  assert.type(value, 'number');
  assert.any(typeOf(subtrahend), ['number', 'mutable']);
  return value - cast(subtrahend);
});

const sum = new Command('sum', (value) => {
  assert.type(value, 'array');
  // TODO: should it throw if it finds non-numbers instead?
  return value.filter(v => typeOf(v) === 'number')
    .reduce((a, c) => a + cast(c), 0);
});

const unitemize = new SpecialCommand('unitemize', (value) => {
  if (!value.self) {
    throw new CloverError(
      'ensure current value is an itemized list'
    );
  }
  return value.working;
});

const max = new Sugar('max', maximum);
const min = new Sugar('min', minimum);

export const commands = {
  // commands
  add,
  apply,
  comp,
  count,
  divide,
  flat,
  focus,
  focusMonadic,
  group,
  itemize,
  maximum,
  minimum,
  multiply,
  product,
  // set,
  show,
  showMonadic,
  split,
  subtract,
  sum,
  unitemize,
  // syntactic sugar
  max,
  min
};

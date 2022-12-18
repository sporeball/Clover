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
 * regular commands access the working value of all items
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
 * item commands can access all properties of an item
 */
class ItemCommand extends Command { }

/**
 * list commands access and replace the entire list of items
 */
class ListCommand extends Command { }

/**
 * sugar commands are one-liners which alias to another command
 */
class Sugar extends Command {
  constructor (pattern, cmd) {
    super(pattern);
    this.body = cmd.body;
  }
}

function tokenize (line) {
  return line.match(
    /'.*'|\[.*\](:(0|[1-9]\d*))?|\(.*\)|[^ ]+/g
  )
    .map(token => new Token(token));
}

function getCommand (tokens) {
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
  const [, command] = possible[0];
  return command;
}

function getArgs (command, tokens) {
  const patternTokens = command.pattern.split(' ');
  // make sure that there is the correct amount of tokens first
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
    .filter((token, i) => argIndices.includes(i))
    .map(token => cast(token));
  return args;
}

/**
 * execute a command
 * @param {string} line
 */
export function evaluate (line) {
  let tokens = tokenize(line);
  let rhs;

  // if the command has a right-hand side...
  const rhsIndex = tokens.findIndex(token => token.value === '=');
  if (rhsIndex > -1) {
    // store it for later
    rhs = tokens.slice(rhsIndex + 1);
    // and remove it from the list of tokens
    tokens = tokens.slice(0, rhsIndex);
  }

  // at this point there is just one option left
  const command = getCommand(tokens);

  if (command instanceof ListCommand) {
    Clover.focus = command.run(Clover.focus, getArgs(command, tokens));
  } else if (command instanceof ItemCommand) {
    Clover.focus = Clover.focus.map(item => {
      Clover.evItem = item;
      return command.run(item, getArgs(command, tokens));
    });
  } else {
    Clover.focus.forEach(item => {
      Clover.evItem = item;
      item.working = command.run(item.working, getArgs(command, tokens));
      return item;
    });
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
    Clover.focus.forEach(item => {
      item[v] = item.working;
      // move the working value to the end
      delete item.working;
      item.working = item[v];
    });
  }
}

/**
 * commands below
 */

const add = new Command('add %a', (value, args) => {
  const [addend] = args;
  assert.type(value, 'number');
  assert.any(typeOf(addend), ['number', 'mutable']);
  return value + addend;
});

const apply = new Command('apply %c', (value, args) => {
  const tokens = tokenize(args[0]);
  const command = getCommand(tokens);
  const commandArgs = getArgs(command, tokens);
  assert.type(value, 'array');
  return value.map((x, i, r) => command.run(x, commandArgs));
});

const comp = new Command('comp %l', (value, args) => {
  const [list] = args;
  assert.type(value, 'array');
  const unique = list.flat(Infinity)
    .filter((x, i, r) => r.indexOf(x) === i);
  const obj = Object.fromEntries(
    unique.map((x, i) => [x, value[i]])
  );
  return list.map(function cb (item) {
    if (Array.isArray(item)) {
      return item.map(subItem => cb(subItem));
    }
    return obj[item];
  });
});

const count = new Command('count %a', (value, args) => {
  const [searchValue] = args;
  assert.any(typeOf(value), ['array', 'string']);
  switch (typeOf(value)) {
    case 'array':
      return value
        .filter(x => x === searchValue)
        .length;
    case 'string':
      return (value.match(
        new RegExp(escape(searchValue), 'g')
      ) || [])
        .length;
  }
});

const countTo = new Command('count to %n', (value, args) => {
  const [end] = args;
  return Array(end)
    .fill(undefined)
    .map((x, i) => i + 1);
});

const divide = new Command('divide by %a', (value, args) => {
  const [divisor] = args;
  assert.type(value, 'number');
  assert.any(typeOf(divisor), ['number', 'mutable']);
  return value / divisor;
});

const flat = new Command('flatten', (value) => {
  assert.type(value, 'array');
  return value.flat();
});

const focusMonadic = new Command('focus %a', (value, args) => {
  const [focusValue] = args;
  return focusValue;
});

const group = new Command('groups of %n', (value, args) => {
  const [size] = args;
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

const itemize = new ListCommand('itemize %s', (value, args) => {
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
  const src = value[0];
  const prop = dest.slice(0, -1);
  const srcWorking = src.working;
  const srcItemCount = src.working.length;
  return Array(srcItemCount)
    .fill(undefined) // dummy value
    .map((item, index) => {
      item = { ...src };
      item[prop] = srcWorking[index];
      // move the working value to the end
      delete item.working;
      item.working = srcWorking[index];
      // done
      return item;
    });
});

const last = new Command('last', (value) => {
  if (typeOf(value) === 'array') {
    return value[value.length - 1];
  }
  return value;
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
  return value * multiplier;
});

const product = new Command('product', (value) => {
  assert.type(value, 'array');
  // TODO: should it throw if it finds non-numbers instead?
  return value.filter(v => typeOf(v) === 'number')
    .reduce((a, c) => a * c, 1);
});

const show = new ListCommand('show', (value) => {
  output(Clover.focus);
  return value;
});

const showMonadic = new ListCommand('show %a', (value, args) => {
  const [showValue] = args;
  output(showValue);
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
      return value.split(splitter);
  }
});

const stop = new Command('stop', (value) => {
  Clover.stop = true;
  return value;
});

const subtract = new Command('subtract %a', (value, args) => {
  const [subtrahend] = args;
  assert.type(value, 'number');
  assert.any(typeOf(subtrahend), ['number', 'mutable']);
  return value - subtrahend;
});

const sum = new Command('sum', (value) => {
  assert.type(value, 'array');
  // TODO: should it throw if it finds non-numbers instead?
  return value.filter(v => typeOf(v) === 'number')
    .reduce((a, c) => a + c, 0);
});

const unitemize = new ListCommand('unitemize', (value) => {
  return [{
    input: value[0].input, // same everywhere
    working: value.map(item => item.working)
  }];
});

const max = new Sugar('max', maximum);
const min = new Sugar('min', minimum);

export const commands = {
  // commands
  add,
  apply,
  comp,
  count,
  countTo,
  divide,
  flat,
  focusMonadic,
  group,
  itemize,
  last,
  maximum,
  minimum,
  multiply,
  product,
  // set,
  show,
  showMonadic,
  split,
  stop,
  subtract,
  sum,
  unitemize,
  // syntactic sugar
  max,
  min
};

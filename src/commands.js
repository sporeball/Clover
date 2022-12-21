import assert from './assert.js';
import { Leaf } from './leaf.js';
import { LazyPlant } from './plant.js';
import { Token, typeOf, cast } from './token.js';
import { output, escape } from './util.js';

/**
 * each command written in a Clover program consists of a list of tokens.
 * if this list begins with a valid token, the interpreter will call a
 * corresponding function, which runs code for that command if the list
 * follows a valid pattern.
 */

/**
 * command superclass
 * regular commands access the working value of every item in the focus list
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
 */
class LeafCommand extends Command { }

/**
 * list commands return an entirely different focus list
 */
class PlantCommand extends Command { }

class SpecialCommand extends Command { }

/**
 * sugar commands are aliases of other commands
 */
class Sugar extends Command {
  constructor (pattern, cmd) {
    super(pattern);
    this.body = cmd.body;
  }
}

/**
 * convert a line of code into a stream of tokens
 * @param {string} line
 * @returns {Token[]}
 */
export function tokenize (line) {
  return line.match(
    /'.*'|\[.*?\](:(0|[1-9]\d*))?|\(.*\)|[^ ]+/g
  )
    .map(token => new Token(token));
}

/**
 * determine what command is matched by a stream of tokens
 * @param {Token[]} tokens
 * @returns {Command}
 */
export function getCommand (tokens) {
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

/**
 * get the arguments being passed to a command,
 * given that command and the tokens that match its pattern
 * @param {Command} command
 * @param {Token[]} tokens
 */
export function getArgs (command, tokens) {
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

  // plant commands return an entirely new plant
  if (command instanceof PlantCommand) {
    Clover.plant = command.run(Clover.plant, getArgs(command, tokens));
  // regular commands change the working value of every leaf in the plant
  } else {
    for (const leaf of Clover.plant.leaves) {
      if (leaf === undefined) {
        continue;
      }
      Clover.evItem = leaf;
      leaf.working = command.run(leaf.working, getArgs(command, tokens));
    }
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
  assert.type(addend, 'number');
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

const eachOf = new Command('each of %l %c', (value, args) => {
  const [list, cstr] = args;
  const arr = [];
  for (const item of list) {
    const tokens = tokenize(cstr.replace('::', item));
    const command = getCommand(tokens);
    const commandArgs = getArgs(command, tokens);
    arr.push(command.run(value, commandArgs));
  }
  return arr;
});

// TODO: best way to make list and regular commands that both do this
const filterOut = new PlantCommand('filter out %a', (value, args) => {
  const [filterValue] = args;
  assert.type(value, 'array');
  return value.filter(x => x.working !== filterValue);
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

const id = new Command('id %a', (value, args) => {
  return args[0];
});

const itemize = new PlantCommand('itemize %s', (plant, args) => {
  const [dest] = args;
  const leaves = plant.leaves;
  // assert.type(value, 'array');
  if (leaves.length > 1) {
    throw new CloverError(
      'ensure plant has only one leaf before itemizing'
    );
  }
  if (!dest.endsWith('s')) {
    throw new CloverError('itemize list should be a plural word');
  }
  const working = leaves[0].working;
  plant.kill();
  working.forEach((item, index) => {
    plant.addLeaf(item);
    plant.leaves[index][dest.slice(0, -1)] = item;
  });
  return plant;
});

const last = new Command('last', (value) => {
  if (typeOf(value) === 'array') {
    return value[value.length - 1];
  }
  return value;
});

const lazy = new PlantCommand('lazy %l %c', (plant, args) => {
  const [knownTerms, cstr] = args;
  plant.kill();
  // TODO: this taught us that nothing is logged if the plant is empty
  for (const term of knownTerms) {
    plant.addLeaf(term);
  }
  const lazyPlant = new LazyPlant(plant, cstr);
  return lazyPlant;
});

const maximum = new Command('maximum', (value) => {
  assert.type(value, 'array');
  return Math.max(...value.filter(Number));
});

const minimum = new Command('minimum', (value) => {
  assert.type(value, 'array');
  return Math.min(...value.filter(Number));
});

const mod = new Command('mod %a', (value, args) => {
  const [argument] = args;
  assert.type(value, 'number');
  assert.any(typeOf(argument), ['number', 'mutable']);
  return value % argument;
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

const show = new PlantCommand('show', (value) => {
  output(Clover.focus);
  return value;
});

const showMonadic = new PlantCommand('show %a', (value, args) => {
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

const sumMonadic = new Command('sum %l', (value, args) => {
  const [list] = args;
  return list.filter(v => typeOf(v) === 'number')
    .reduce((a, c) => a + c, 0);
});

const take = new PlantCommand('take %n', (plant, args) => {
  const [n] = args;
  if (!(plant instanceof LazyPlant)) {
    throw new CloverError("'take' command run on non-lazy plant");
  }
  for (let i = 1; i <= n; i++) {
    if (plant.getLeaf(i - 1) !== undefined) {
      continue;
    }
    const tokens = tokenize(plant.cstr.replace('::', i))
    const command = getCommand(tokens);
    const commandArgs = getArgs(command, tokens);
    plant.leaves[i - 1] = new Leaf(command.run(i, commandArgs));
  }
  return plant;
});

const unitemize = new PlantCommand('unitemize', (value) => {
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
  eachOf,
  filterOut,
  flat,
  focusMonadic,
  group,
  id,
  itemize,
  last,
  lazy,
  maximum,
  minimum,
  mod,
  multiply,
  product,
  show,
  showMonadic,
  split,
  stop,
  subtract,
  sum,
  sumMonadic,
  take,
  unitemize,
  // syntactic sugar
  max,
  min
};

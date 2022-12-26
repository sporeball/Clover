import assert from './assert.js';
import { Leaf } from './leaf.js';
import { Plant, LazyPlant } from './plant.js';
import { Token, typeOf, cast } from './token.js';
import { escape } from './util.js';

/**
 * each command written in a Clover program consists of a list of tokens.
 * if this list begins with a valid token, the interpreter will call a
 * corresponding function, which runs code for that command if the list
 * follows a valid pattern.
 */

/**
 * superclass
 * regular commands change the flower value of every leaf in the plant
 */
class Pattern {
  /**
   * @param {string} str format string for the pattern
   * @param {Function} body underlying command code
   */
  constructor (str, body) {
    this.str = str;
    this.body = body;
  }
}

/**
 * plant commands return an entirely new plant
 */
class PlantPattern extends Pattern { }

/**
 * sugar commands are aliases of other commands
 */
class SugarPattern extends Pattern {
  constructor (str, pattern) {
    super(str);
    this.body = pattern.body;
  }
}

export class CommandInstance {
  constructor (line) {
    this.tokens = tokenize(line);
    this.pattern = getPattern(this.tokens);
    this.calculateArgs();
  }

  run (value, args) {
    return this.pattern.body(value, args);
  }

  substituteArg (sub) {
    return this.args.map(arg => {
      if (arg === '*') {
        return sub;
      }
      return arg;
    });
  }

  calculateArgs () {
    this.args = getArgs(this.pattern, this.tokens);
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
 * determine what command pattern is matched by a stream of tokens
 * @param {Token[]} tokens
 * @returns {Command}
 */
export function getPattern (tokens) {
  let possible = Object.entries(patterns);
  // for each token...
  for (let i = 0; i < tokens.length; i++) {
    // filter to those commands where...
    possible = possible.filter(item => {
      const pattern = item[1];
      // the next part of the command pattern...
      const next = pattern.str.split(' ')[i];
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
export function getArgs (pattern, tokens) {
  const patternTokens = pattern.str.split(' ');
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

  const command = new CommandInstance(line);
  // console.dir(command, { depth: 3 });

  // plant commands return an entirely new plant
  if (command.pattern instanceof PlantPattern) {
    Clover.plant = command.run(Clover.plant, command.args);
  // regular commands change the flower value of every leaf in the plant
  } else {
    for (const leaf of Clover.plant.leaves) {
      if (leaf === undefined) {
        continue;
      }
      Clover.evItem = leaf;
      leaf.flower = command.run(leaf.flower, command.args);
    }
  }

  // if there was a right-hand side...
  if (rhs !== undefined) {
    const rhsValue = rhs[0].value.slice(1);
    const rhsSpecifier = rhs[0].specifier;
    switch (rhsSpecifier) {
      // for plants,
      case '%P':
        // store a clone of the plant
        Clover.plants[rhsValue] = Clover.plant.clone();
        break;
      // for mutables,
      case '%m':
        // update every flower
        Clover.plant.leaves.forEach(leaf => {
          leaf[rhsValue] = leaf.flower;
        });
        break;
      default:
        throw new CloverError('invalid right-hand side value %t', rhsValue);
    }
  }
}

/**
 * commands below
 */

const add = new Pattern('add %a', (value, args) => {
  const [addend] = args;
  assert.type(value, 'number');
  assert.type(addend, 'number');
  return value + addend;
});

const apply = new Pattern('apply %c', (value, args) => {
  const [command] = args;
  assert.type(value, 'array');
  return value.map((x, i, r) => command.run(x, command.args));
});

const comp = new Pattern('comp %l', (value, args) => {
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

const count = new Pattern('count %a', (value, args) => {
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

const countTo = new Pattern('count to %n', (value, args) => {
  const [end] = args;
  return Array(end)
    .fill(undefined)
    .map((x, i) => i + 1);
});

const crush = new PlantPattern('crush %c', (plant, args) => {
  const [command] = args;
  const result = command.run(
    Clover.plant.leaves.map(leaf => leaf.flower),
    command.args
  );
  return new Plant([result]);
});

const divide = new Pattern('divide by %a', (value, args) => {
  const [divisor] = args;
  assert.type(value, 'number');
  assert.any(typeOf(divisor), ['number', 'mutable']);
  return value / divisor;
});

const eachOf = new Pattern('each of %l %c', (value, args) => {
  const [list, command] = args;
  const arr = [];
  for (const item of list) {
    arr.push(command.run(value, command.substituteArg(item)));
  }
  return arr;
});

const even = new Pattern('even', (value) => {
  return value % 2 === 0;
});

const filt = new Pattern('filter %a', (value, args) => {
  const [filterValue] = args;
  assert.type(value, 'array');
  return value.filter(x => x.flower !== filterValue);
});

const flat = new Pattern('flatten', (value) => {
  assert.type(value, 'array');
  return value.flat();
});

const flowers = new PlantPattern('flowers %l', (plant, args) => {
  const [list] = args;
  return new Plant(list);
});

const focus = new Pattern('focus %a', (value, args) => {
  const [focusValue] = args;
  return focusValue;
});

const focusPlant = new PlantPattern('focus %P', (plant, args) => {
  const [focusValue] = args;
  return focusValue.clone();
});

const group = new Pattern('groups of %n', (value, args) => {
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

const id = new Pattern('id %a', (value, args) => {
  return args[0];
});

const itemize = new PlantPattern('itemize %s', (plant, args) => {
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
  const flower = leaves[0].flower;
  plant.kill();
  flower.forEach((item, index) => {
    plant.addLeaf(item);
    plant.leaves[index][dest.slice(0, -1)] = item;
  });
  return plant;
});

const last = new Pattern('last', (value) => {
  if (typeOf(value) === 'array') {
    return value[value.length - 1];
  }
  return value;
});

const lazy = new PlantPattern('lazy %c', (plant, args) => {
  const [command] = args;
  const lazyPlant = new LazyPlant(plant.leaves, command);
  return lazyPlant;
});

const maximum = new Pattern('maximum', (value) => {
  assert.type(value, 'array');
  return Math.max(...value.filter(Number));
});

const minimum = new Pattern('minimum', (value) => {
  assert.type(value, 'array');
  return Math.min(...value.filter(Number));
});

const mod = new Pattern('mod %a', (value, args) => {
  const [argument] = args;
  assert.type(value, 'number');
  assert.any(typeOf(argument), ['number', 'mutable']);
  return value % argument;
});

const multiply = new Pattern('multiply by %a', (value, args) => {
  const [multiplier] = args;
  assert.type(value, 'number');
  assert.any(typeOf(multiplier), ['number', 'mutable']);
  return value * multiplier;
});

const odd = new Pattern('odd', (value) => {
  return value % 2 === 1;
});

const pluck = new PlantPattern('pluck %c', (plant, args) => {
  const [command] = args;
  return new Plant(Clover.plant.leaves.filter(leaf => {
    return command.run(leaf.flower, command.args) === false;
  }));
});

const product = new Pattern('product', (value) => {
  assert.type(value, 'array');
  // TODO: should it throw if it finds non-numbers instead?
  return value.filter(v => typeOf(v) === 'number')
    .reduce((a, c) => a * c, 1);
});

// const show = new PlantCommand('show', (value) => {
//   output(Clover.focus);
//   return value;
// });

// const showMonadic = new PlantCommand('show %a', (value, args) => {
//   const [showValue] = args;
//   output(showValue);
//   return value;
// });

const split = new Pattern('split %a %a', (value, args) => {
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

const stop = new PlantPattern('stop', (plant) => {
  Clover.stop = true;
  return plant;
});

const subtract = new Pattern('subtract %a', (value, args) => {
  const [subtrahend] = args;
  assert.type(value, 'number');
  assert.any(typeOf(subtrahend), ['number', 'mutable']);
  return value - subtrahend;
});

const sum = new Pattern('sum', (value) => {
  assert.type(value, 'array');
  // TODO: should it throw if it finds non-numbers instead?
  return value.filter(v => typeOf(v) === 'number')
    .reduce((a, c) => a + c, 0);
});

const sumMonadic = new Pattern('sum %l', (value, args) => {
  const [list] = args;
  return list.filter(v => typeOf(v) === 'number')
    .reduce((a, c) => a + c, 0);
});

const take = new PlantPattern('take %n', (plant, args) => {
  const [n] = args;
  if (!(plant instanceof LazyPlant)) {
    throw new CloverError("'take' command run on non-lazy plant");
  }
  for (let i = 1; i <= n; i++) {
    if (plant.getLeaf(i - 1) !== undefined) {
      continue;
    }
    plant.command.calculateArgs();
    plant.addLeaf(
      plant.command.run(i, plant.command.substituteArg(i))
    );
  }
  return plant;
});

const max = new SugarPattern('max', maximum);
const min = new SugarPattern('min', minimum);

export const patterns = {
  // commands
  add,
  apply,
  comp,
  count,
  countTo,
  crush,
  divide,
  eachOf,
  even,
  filt,
  flat,
  flowers,
  focus,
  focusPlant,
  group,
  id,
  itemize,
  last,
  lazy,
  maximum,
  minimum,
  mod,
  multiply,
  odd,
  pluck,
  product,
  // show,
  // showMonadic,
  split,
  stop,
  subtract,
  sum,
  sumMonadic,
  take,
  // syntactic sugar
  max,
  min
};

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
    const tokens = tokenize(line);
    const rhsIndex = tokens.findIndex(token => token.value === '=');
    if (rhsIndex === -1) {
      this.lhs = tokens;
    } else {
      this.lhs = tokens.slice(0, rhsIndex);
      this.rhs = tokens.slice(rhsIndex + 1)[0];
    }
    this.pattern = getPattern(this.lhs);
    // this.calculateArgs();
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
    this.args = getArgs(this.pattern, this.lhs);
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
  const args = tokens.filter(token => token.specifier !== '%r')
    .map(token => cast(token));
  return args;
}

/**
 * execute a command
 * @param {string} line
 */
export function evaluate (line) {
  const command = new CommandInstance(line);

  // plant commands return an entirely new plant
  if (command.pattern instanceof PlantPattern) {
    command.calculateArgs();
    Clover.plant = command.run(Clover.plant, command.args);
  // regular commands change the flower value of every leaf in the plant
  } else {
    for (const leaf of Clover.plant.leaves) {
      if (leaf === undefined) {
        continue;
      }
      Clover.evItem = leaf;
      command.calculateArgs();
      leaf.flower = command.run(leaf.flower, command.args);
    }
  }

  console.dir(command, { depth: 4 });

  // if there was a right-hand side...
  if (command.rhs) {
    const rhsValue = command.rhs.value.slice(1);
    const rhsSpecifier = command.rhs.specifier;
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

/**
 * add to a flower (+)
 * mutables accepted
 * @flower {number}
 * @param {number} addend
 * @returns {number}
 */
const add = new Pattern('add %a', (value, args) => {
  const [addend] = args;
  assert.type(value, 'number');
  assert.type(addend, 'number');
  return value + addend;
});

/**
 * run a command on each element of a flower
 * @flower {*[]}
 * @param {command} command
 * @returns {*[]}
 */
const apply = new Pattern('apply %c', (value, args) => {
  const [command] = args;
  assert.type(value, 'array');
  return value.map((x, i, r) => command.run(x, command.args));
});

// TODO: comp used to be here - replace with destructuring bind

/**
 * count occurrences of a value in a flower
 * @flower {*[]|string}
 * @param {*} searchValue
 * @returns {number}
 */
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

/**
 * reduce a plant to just one leaf, by running a command on an array containing
 * all of its flowers
 * @example
 * flowers [1 2 3 4 5]
 * crush (sum) -- { flower = 15 }
 * @param {command} command
 */
const crush = new PlantPattern('crush %c', (plant, args) => {
  const [command] = args;
  const result = command.run(
    Clover.plant.leaves.map(leaf => leaf.flower),
    command.args
  );
  return new Plant([result]);
});

/**
 * divide a flower (/)
 * mutables accepted
 * @flower {number}
 * @param {number} divisor
 * @returns {number}
 */
const divide = new Pattern('divide by %a', (value, args) => {
  const [divisor] = args;
  assert.type(value, 'number');
  assert.type(divisor, 'number');
  if (divisor === 0) {
    throw new CloverError('cannot divide by 0');
  }
  return value / divisor;
});

/**
 * run a command on a flower multiple times,
 * and replace the flower with an array of the results
 * performs arg substitution
 * @example
 * flowers [5]
 * each of [1 2 3] (add *) -- { flower = [6, 7, 8] }
 * @param {*[]} list
 * @param {command} command
 */
const eachOf = new Pattern('each of %l %c', (value, args) => {
  const [list, command] = args;
  const arr = [];
  for (const item of list) {
    command.calculateArgs();
    arr.push(command.run(value, command.substituteArg(item)));
  }
  return arr;
});

/**
 * return whether a flower is even
 * @flower {number}
 * @returns {boolean}
 */
const even = new Pattern('even', (value) => {
  return value % 2 === 0;
});

/**
 * remove occurrences of a value from a flower
 * @flower {*[]}
 * @param {*} filterValue
 * @returns {*[]}
 */
const filt = new Pattern('filter %a', (value, args) => {
  const [filterValue] = args;
  assert.type(value, 'array');
  return value.filter(x => x.flower !== filterValue);
});

/**
 * flatten a flower
 * @flower {*[]}
 * @returns {*[]}
 */
const flat = new Pattern('flatten', (value) => {
  assert.type(value, 'array');
  return value.flat();
});

/**
 * replace a plant's flowers with the values in a given list
 * @param {*[]} list
 */
const flowers = new PlantPattern('flowers %l', (plant, args) => {
  const [list] = args;
  return new Plant(list);
});

/**
 * set a flower equal to another value
 * mutables accepted
 * @param {*} focusValue
 */
const focus = new Pattern('focus %a', (value, args) => {
  const [focusValue] = args;
  return focusValue;
});

/**
 * set a plant equal to a different plant
 * @param {Plant} focusValue
 */
const focusPlant = new PlantPattern('focus %P', (plant, args) => {
  const [focusValue] = args;
  return focusValue.clone();
});

/**
 * split a flower into groups of up to n values
 * @example
 * focus [1 2 3 4 5]
 * groups of 2 -- { flower = [[1, 2], [3, 4], [5]] }
 * @flower {*[]}
 * @param {number} size
 * @returns {*[]}
 */
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

/**
 * take a plant with a single array-type flower, and use its elements as
 * the leaves of a new plant, with a mutable set on each
 * @example
 * focus [1 2 3]
 * itemize naturals
 * -- { flower = 1, natural = 1 }, ...
 * @param {string} dest a plural word used to determine the mutable
 */
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

/**
 * return the last element of a flower
 * returns the flower itself if it is not an array
 * @flower {*}
 * @returns {*}
 */
const last = new Pattern('last', (value) => {
  if (typeOf(value) === 'array') {
    return value[value.length - 1];
  }
  return value;
});

/**
 * convert a plant into a lazy plant, with known terms taken from the original,
 * and further terms calculated as needed using the result of a command
 * use `take` to get more terms
 * @param {command} command
 */
const lazy = new PlantPattern('lazy %c', (plant, args) => {
  const [command] = args;
  const lazyPlant = new LazyPlant(plant.leaves, command);
  return lazyPlant;
});

/**
 * return the highest number which is an element of a flower
 * @flower {*[]}
 * @returns {number}
 */
const maximum = new Pattern('maximum', (value) => {
  assert.type(value, 'array');
  return Math.max(...value.filter(Number));
});

/**
 * return the lowest number which is an element of a flower
 * @flower {*[]}
 * @returns {number}
 */
const minimum = new Pattern('minimum', (value) => {
  assert.type(value, 'array');
  return Math.min(...value.filter(Number));
});

/**
 * return a flower mod n (%)
 * mutables accepted
 * @flower {number}
 * @param {number} argument
 * @returns {number}
 */
const mod = new Pattern('mod %a', (value, args) => {
  const [argument] = args;
  assert.type(value, 'number');
  assert.type(argument, 'number');
  if (argument === 0) {
    throw new CloverError('cannot divide by 0');
  }
  return value % argument;
});

/**
 * multiply a flower (*)
 * mutables accepted
 * @flower {number}
 * @param {number} multiplier
 * @returns {number}
 */
const multiply = new Pattern('multiply by %a', (value, args) => {
  const [multiplier] = args;
  assert.type(value, 'number');
  assert.type(multiplier, 'number');
  return value * multiplier;
});

/**
 * return whether a flower is odd
 * @flower {number}
 * @returns {boolean}
 */
const odd = new Pattern('odd', (value) => {
  return value % 2 === 1;
});

/**
 * remove leaves from a plant for which a command is false
 * @example
 * flowers [1 2 3 4 5]
 * pluck (odd) -- { flower = 2 }, { flower = 4 }
 * @param {command} command
 */
const pluck = new PlantPattern('pluck %c', (plant, args) => {
  const [command] = args;
  return new Plant(Clover.plant.leaves.filter(leaf => {
    return command.run(leaf.flower, command.args) === false;
  }));
});

/**
 * return the product of all numbers in a flower
 * @flower {*[]}
 * @returns {number}
 */
const product = new Pattern('product', (value) => {
  assert.type(value, 'array');
  // TODO: should it throw if it finds non-numbers instead?
  return value.filter(v => typeOf(v) === 'number')
    .reduce((a, c) => a * c, 1);
});

/**
 * string split a flower
 * accepts some special keywords
 * @flower {string}
 * @param {*} splitter
 * @returns {string[]}
 */
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

/**
 * stop execution early
 */
const stop = new PlantPattern('stop', (plant) => {
  Clover.stop = true;
  return plant;
});

/**
 * subtract from a flower (-)
 * mutables accepted
 * @flower {number}
 * @param {number} subtrahend
 * @returns {number}
 */
const subtract = new Pattern('subtract %a', (value, args) => {
  const [subtrahend] = args;
  assert.type(value, 'number');
  assert.type(subtrahend, 'number');
  return value - subtrahend;
});

/**
 * return the sum of all numbers in a flower
 * @flower {*[]}
 * @returns {number}
 */
const sum = new Pattern('sum', (value) => {
  assert.type(value, 'array');
  // TODO: should it throw if it finds non-numbers instead?
  return value.filter(v => typeOf(v) === 'number')
    .reduce((a, c) => a + c, 0);
});

/**
 * return the sum of all numbers in a list passed as an argument
 * @param {*[]} list
 * @returns {number}
 */
const sumMonadic = new Pattern('sum %l', (value, args) => {
  const [list] = args;
  return list.filter(v => typeOf(v) === 'number')
    .reduce((a, c) => a + c, 0);
});

/**
 * yield the first n terms of a lazy plant
 * skips known terms and uses the plant's command to generate unknown terms
 * performs arg substitution
 * @param {number} n
 */
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
  count,
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

export const reservedWords = Object.values(patterns)
  .map(pattern => pattern.str)
  .flatMap(str => str.split(' '))
  .filter(word => !word.startsWith('%'))
  .filter((word, index, arr) => arr.indexOf(word) === index)
  .sort();

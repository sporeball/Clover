import assert from './assert.js';
// import { Leaf } from './leaf.js';
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
  constructor (args, body) {
    this.args = args;
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
  constructor (head, pattern) {
    super(head);
    this.args = pattern.args;
    this.body = pattern.body;
  }
}

export class CommandInstance {
  constructor (line) {
    const tokens = tokenize(line);
    const rhsIndex = tokens.findIndex(token => token.value === '=');
    this.head = tokens[0];
    if (rhsIndex === -1) {
      this._args = tokens.slice(1);
    } else {
      this._args = tokens.slice(1, rhsIndex);
      this.sep = tokens[rhsIndex];
      this.rhs = tokens.slice(rhsIndex + 1);
    }
    if (this.pattern === undefined) {
      throw new CloverError(
        'no pattern found for head token %t',
        this.head.value
      );
    }
    if (this._args.length !== this.pattern.args) {
      throw new CloverError(
        'expected %s argument(s), got %s',
        this.pattern.args,
        this._args.length
      );
    }
  }

  get args () {
    return this._args.map(arg => cast(arg));
  }

  substituteArg (sub) {
    return this.args.map(arg => {
      if (arg === '*') {
        return sub;
      }
      return arg;
    });
  }

  get pattern () {
    return patterns[this.head.value];
  }

  run (value, args) {
    try {
      const result = this.pattern.body(value, args);
      return result;
    } catch (e) {
      throw new CloverError('%s: %s', this.head.value, e.message);
    }
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
 * execute a command
 * @param {string} line
 */
export function evaluate (line) {
  const command = new CommandInstance(line);

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

  // console.dir(command, { depth: 4 });

  // if there was a right-hand side...
  if (command.rhs === undefined) {
    return;
  }
  if (command.sep.value === '=') {
    const rhs = command.rhs[0];
    switch (rhs.specifier) {
      // for plants,
      case '%P':
        // store a clone of the plant
        Clover.plants[rhs.value] = Clover.plant.clone();
        break;
      // for mutables,
      case '%m':
        // update every flower
        Clover.plant.leaves.forEach(leaf => {
          leaf[rhs.value] = leaf.flower;
        });
        break;
      default:
        throw new CloverError('invalid assignment');
    }
    return;
  }
  throw new CloverError('invalid right-hand side separator');
}

/**
 * commands below
 */

/**
 * run a command on each element of a flower
 * @flower {array}
 * @param {command} command
 * @returns {array}
 */
const apply = new Pattern(1, (flower, args) => {
  const [command] = args;
  assert.type(flower, 'array');
  assert.type(command, 'command');
  return flower.map(x => command.run(x, command.args));
});

// TODO: comp used to be here - replace with destructuring bind

/**
 * count occurrences of a value in a flower
 * @flower {array|string}
 * @param {any} searchValue
 * @returns {number}
 */
const count = new Pattern(1, (flower, args) => {
  const [searchValue] = args;
  assert.any(typeOf(flower), ['array', 'string']);
  switch (typeOf(flower)) {
    case 'array':
      return flower
        .filter(x => x === searchValue)
        .length;
    case 'string':
      return (flower.match(
        new RegExp(escape(searchValue), 'g')
      ) || [])
        .length;
  }
});

/**
 * reduce a plant to just one leaf, by running a command on an array containing
 * all of its flowers
 * @example
 * focus [1 2 3 4 5]
 * itemize naturals
 * crush (sum)
 * -- { flower = 15 }
 * @param {command} command
 */
const crush = new PlantPattern(1, (plant, args) => {
  const [command] = args;
  assert.type(command, 'command');
  const result = command.run(
    Clover.plant.leaves.map(leaf => leaf.flower),
    command.args
  );
  return new Plant([result]);
});

/**
 * return whether a flower is even
 * @flower {number}
 * @returns {boolean}
 */
const even = new Pattern(0, (flower) => {
  assert.type(flower, 'number');
  return flower % 2 === 0;
});

/**
 * remove occurrences of a value from a flower
 * @flower {array}
 * @param {any} filterValue
 * @returns {array}
 */
const filter = new Pattern(1, (flower, args) => {
  const [filterValue] = args;
  assert.type(flower, 'array');
  return flower.filter(x => x !== filterValue);
});

/**
 * flatten a flower
 * @flower {array}
 * @returns {array}
 */
const flatten = new Pattern(0, (flower) => {
  assert.type(flower, 'array');
  return flower.flat();
});

/**
 * set a flower equal to another value
 * @param {any} focusValue
 */
const focus = new Pattern(1, (flower, args) => {
  const [focusValue] = args;
  return focusValue;
});

/**
 * run a command on a flower multiple times,
 * and replace the flower with an array of the results.
 * performs arg substitution
 * @example
 * focus 5
 * foreach [1 2 3] (plus *)
 * -- { flower = [6, 7, 8] }
 * @param {array} list
 * @param {command} command
 */
const foreach = new Pattern(2, (flower, args) => {
  const [list, command] = args;
  assert.type(list, 'array');
  assert.type(command, 'command');
  const arr = [];
  for (const item of list) {
    arr.push(command.run(flower, command.substituteArg(item)));
  }
  return arr;
});

/**
 * split a flower into groups of up to n values
 * @example
 * focus [1 2 3 4 5]
 * groups 2
 * -- { flower = [[1, 2], [3, 4], [5]] }
 * @flower {array}
 * @param {number} size
 * @returns {array}
 */
const groups = new Pattern(1, (flower, args) => {
  const [size] = args;
  assert.type(flower, 'array');
  assert.type(size, 'number');
  if (size === 0) {
    throw new CloverError('cannot split into groups of 0');
  }
  const newArray = [];
  for (let i = 0; i < flower.length; i += size) {
    newArray.push(flower.slice(i, i + size));
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
const itemize = new PlantPattern(1, (plant, args) => {
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
 * return the last element of a flower.
 * returns the flower itself if it is not an array
 * @flower {any}
 * @returns {any}
 */
const last = new Pattern(0, (flower) => {
  if (typeOf(flower) === 'array') {
    return flower[flower.length - 1];
  }
  return flower;
});

/**
 * convert a plant into a lazy plant, with known terms taken from the original,
 * and further terms calculated as needed using the result of a command.
 * use `take` to get more terms
 * @param {command} command
 */
const lazy = new PlantPattern(1, (plant, args) => {
  const [command] = args;
  assert.type(command, 'command');
  const lazyPlant = new LazyPlant(plant.leaves, command);
  return lazyPlant;
});

/**
 * return the highest number which is an element of a flower
 * @flower {array}
 * @returns {number}
 */
const maximum = new Pattern(0, (flower) => {
  assert.type(flower, 'array');
  return Math.max(...flower.filter(Number));
});

/**
 * return the lowest number which is an element of a flower
 * @flower {array}
 * @returns {number}
 */
const minimum = new Pattern(0, (flower) => {
  assert.type(flower, 'array');
  return Math.min(...flower.filter(Number));
});

/**
 * subtract from a flower
 * @flower {number}
 * @param {number} subtrahend
 * @returns {number}
 */
const minus = new Pattern(1, (flower, args) => {
  const [subtrahend] = args;
  assert.type(flower, 'number');
  assert.type(subtrahend, 'number');
  return flower - subtrahend;
});

/**
 * return a flower mod n
 * @flower {number}
 * @param {number} argument
 * @returns {number}
 */
const mod = new Pattern(1, (flower, args) => {
  const [argument] = args;
  assert.type(flower, 'number');
  assert.type(argument, 'number');
  if (argument === 0) {
    throw new CloverError('cannot divide by 0');
  }
  return flower % argument;
});

/**
 * return whether a flower is odd
 * @flower {number}
 * @returns {boolean}
 */
const odd = new Pattern(0, (flower) => {
  assert.type(flower, 'number');
  return flower % 2 === 1;
});

/**
 * divide a flower
 * @flower {number}
 * @param {number} divisor
 * @returns {number}
 */
const over = new Pattern(1, (flower, args) => {
  const [divisor] = args;
  assert.type(flower, 'number');
  assert.type(divisor, 'number');
  if (divisor === 0) {
    throw new CloverError('cannot divide by 0');
  }
  return flower / divisor;
});

/**
 * remove leaves from a plant for which a command is false
 * @example
 * flowers [1 2 3 4 5]
 * pluck (odd)
 * -- { flower = 2 }, { flower = 4 }
 * @param {command} command
 */
const pluck = new PlantPattern(1, (plant, args) => {
  const [command] = args;
  assert.type(command, 'command');
  return new Plant(plant.leaves.filter(leaf => {
    return command.run(leaf.flower, command.args) === false;
  }));
});

/**
 * add to a flower
 * @flower {number}
 * @param {number} addend
 * @returns {number}
 */
const plus = new Pattern(1, (flower, args) => {
  const [addend] = args;
  assert.type(flower, 'number');
  assert.type(addend, 'number');
  return flower + addend;
});

/**
 * return the product of all numbers in a flower
 * @flower {array}
 * @returns {number}
 */
const product = new Pattern(0, (flower) => {
  assert.type(flower, 'array');
  // TODO: should it throw if it finds non-numbers instead?
  return flower.filter(v => typeOf(v) === 'number')
    .reduce((a, c) => a * c, 1);
});

/**
 * return a range between two numbers `start` and `end`, both inclusive.
 * if `end` is less than `start`, the range will count down
 * @flower {any}
 * @param {number[]} array
 * @returns {array}
 */
const range = new Pattern(1, (flower, args) => {
  const [array] = args;
  assert.equal('array length', array.length, 2);
  const [start, end] = array;
  if (typeOf(start) !== 'number') {
    throw new CloverError('invalid start value');
  }
  if (typeOf(end) !== 'number') {
    throw new CloverError('invalid end value');
  }
  if (start > end) {
    return Array(start - end + 1)
      .fill(0)
      .map((x, i) => start - i);
  }
  return Array(end - start + 1)
    .fill(0)
    .map((x, i) => start + i);
});

/**
 * array run-length decode
 * @flower {array[]}
 * @returns {array}
 */
const rld = new Pattern(0, (flower) => {
  assert.type(flower, 'array');

  const result = [];
  for (const run of flower) {
    assert.type(run, 'array');
    assert.equal('run length', run.length, 2);
    const [length, item] = run;
    assert.type(length, 'number');
    for (let i = 0; i < length; i++) {
      result.push(item);
    }
  }

  return result;
});

/**
 * sort a flower
 * @flower {array}
 * @returns {array}
 */
const sort = new Pattern(0, (flower) => {
  assert.type(flower, 'array');
  return [...flower].sort((a, b) => a - b);
});

/**
 * string split a flower
 * @flower {string}
 * @param {string} splitter
 * @returns {string[]}
 */
const split = new Pattern(1, (flower, args) => {
  const [splitter] = args;
  assert.type(flower, 'string');
  assert.type(splitter, 'string');
  return flower.split(splitter);
});

/**
 * stop execution early
 */
const stop = new PlantPattern(0, (plant) => {
  Clover.stop = true;
  return plant;
});

/**
 * return the sum of all numbers in a flower
 * @flower {array}
 * @returns {number}
 */
const sum = new Pattern(0, (flower) => {
  assert.type(flower, 'array');
  // TODO: should it throw if it finds non-numbers instead?
  return flower.filter(v => typeOf(v) === 'number')
    .reduce((a, c) => a + c, 0);
});

/**
 * yield the first n terms of a lazy plant.
 * skips known terms and uses the plant's command to generate unknown terms.
 * performs arg substitution
 * @param {number} n
 */
const take = new PlantPattern(1, (plant, args) => {
  const [n] = args;
  assert.type(n, 'number');
  if (!(plant instanceof LazyPlant)) {
    throw new CloverError("'take' command run on non-lazy plant");
  }
  for (let i = 1; i <= n; i++) {
    if (plant.getLeaf(i - 1) !== undefined) {
      continue;
    }
    plant.addLeaf(
      plant.command.run(i, plant.command.substituteArg(i))
    );
  }
  return plant;
});

/**
 * multiply a flower
 * @flower {number}
 * @param {number} multiplier
 * @returns {number}
 */
const times = new Pattern(1, (flower, args) => {
  const [multiplier] = args;
  assert.type(flower, 'number');
  assert.type(multiplier, 'number');
  return flower * multiplier;
});

/**
 * replace a flower with the result of a command run on a different value
 * @example
 * flowers [1]
 * using [4 5 6] (sum)
 * -- { flower = 15 }
 * @flower {any}
 * @param {any} otherValue
 * @param {command} command
 */
// TODO: unintuitive behavior when mapped over multiple flowers
const using = new Pattern(2, (flower, args) => {
  const [otherValue, command] = args;
  assert.type(command, 'command');
  return command.run(otherValue, command.args);
});

/**
 * zip two arrays together
 * @flower {array}
 * @param {array} seconds
 * @returns {array}
 */
const zip = new Pattern(1, (flower, args) => {
  const firsts = flower;
  const [seconds] = args;
  assert.type(firsts, 'array');
  assert.type(seconds, 'array');
  const result = [];
  const length = Math.min(firsts.length, seconds.length);
  for (let i = 0; i < length; i++) {
    result.push([firsts[i], seconds[i]]);
  }
  return result;
});

const max = new SugarPattern('max', maximum);
const min = new SugarPattern('min', minimum);

export const patterns = {
  // commands
  apply,
  count,
  crush,
  even,
  filter,
  flatten,
  focus,
  foreach,
  groups,
  itemize,
  last,
  lazy,
  maximum,
  minimum,
  minus,
  mod,
  odd,
  over,
  pluck,
  plus,
  product,
  range,
  rld,
  sort,
  split,
  stop,
  sum,
  take,
  times,
  using,
  zip,
  // syntactic sugar
  max,
  min
};

export const reservedWords = Object.values(patterns)
  .map(pattern => pattern.head)
  .sort();

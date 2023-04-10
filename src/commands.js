import { evaluateNode } from './index.js';
import assert from './assert.js';
import { Plant, LazyPlant } from './plant.js';
import { equal, isList, typeOf } from './util.js';

import Num from '@sporeball/num.js';

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
export class Pattern {
  /**
   * @param {number} args number of arguments to the command
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
export class PlantPattern extends Pattern { }

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
  /**
   * @param {string} head
   * @param {any[]} args
   */
  constructor (head, args, rhs) {
    this.head = head;
    this.args = args;
    this.rhs = rhs;
    if (this.pattern === undefined) {
      throw new CloverError(
        'no pattern found for head token %t',
        this.head
      );
    }
    if (this.args.length !== this.pattern.args) {
      throw new CloverError(
        '%s: expected %s argument(s), got %s',
        this.head,
        this.pattern.args,
        this.args.length
      );
    }
  }

  get pattern () {
    return patterns[this.head];
  }

  run (value, subValue) {
    let args = this.args.map(evaluateNode);
    if (subValue) {
      args = substituteStars(args, subValue);
    }
    // console.dir(args, { depth: null });
    try {
      const result = this.pattern.body(value, args);
      return result;
    } catch (e) {
      throw new CloverError('%s: %s', this.head, e.message);
    }
  }
}

function substituteStars (args, subValue) {
  return args.map(arg => {
    if (arg.type === 'star') {
      return subValue;
    }
    return arg;
  });
}

/**
 * evaluate a command instance, updating the plant
 * @param {CommandInstance} instance
 */
export function evaluateInstance (instance) {
  // plant commands return an entirely new plant
  if (instance.pattern instanceof PlantPattern) {
    Clover.plant = instance.run(Clover.plant);
  // regular commands change the flower value of every leaf in the plant
  } else {
    for (const leaf of Clover.plant.leaves) {
      if (leaf === undefined) {
        continue;
      }
      Clover.evItem = leaf;
      leaf.flower = instance.run(leaf.flower);
    }
  }
  // if there was a right-hand side...
  if (instance.rhs === undefined) {
    return;
  }
  switch (instance.rhs.type) {
    // for plants,
    case 'plant':
      // store a clone of the plant
      Clover.plants[instance.rhs.identifier] = Clover.plant.clone();
      break;
    // for mutables,
    case 'mutable':
      // update every flower
      Clover.plant.leaves.forEach(leaf => {
        leaf[instance.rhs.identifier] = leaf.flower;
      });
      break;
    default:
      throw new CloverError('invalid assignment');
  }
}

/**
 * commands below
 */

/**
 * return whether a flower is a vowel (`a`, `e`, `i`, `o`, or `u`)
 * @flower {char}
 * @returns {boolean}
 */
const aeiou = new Pattern(0, (flower) => {
  assert.type(flower, 'char');
  return flower.match(/[aeiou]/g) !== null;
});

/**
 * return whether a flower is a vowel (`a`, `e`, `i`, `o`, or `u`) or `y`
 * @flower {char}
 * @returns {boolean}
 */
const aeiouy = new Pattern(0, (flower) => {
  assert.type(flower, 'char');
  return flower.match(/[aeiouy]/g) !== null;
});

/**
 * return whether every element of a flower passes a condition
 * @flower {list}
 * @param {command} conditionCommand
 * @returns {boolean}
 */
const all = new Pattern(1, (flower, args) => {
  const [conditionCommand] = args;
  assert.type(flower, 'list');
  assert.type(conditionCommand, 'command');
  return flower.every(x => conditionCommand.run(x) === true);
});

/**
 * return whether any element of a flower passes a condition
 * @flower {list}
 * @param {command} conditionCommand
 * @returns {boolean}
 */
const any = new Pattern(1, (flower, args) => {
  const [conditionCommand] = args;
  assert.type(flower, 'list');
  assert.type(conditionCommand, 'command');
  return flower.some(x => conditionCommand.run(x) === true);
});

/**
 * append a value to a flower
 * @flower {list}
 * @param {any} appendValue
 * @returns {list}
 */
const append = new Pattern(1, (flower, args) => {
  const [appendValue] = args;
  assert.type(flower, 'list');
  if (
    typeOf(appendValue) !== typeOf(flower) &&
    typeOf(appendValue) !== typeOf(flower.at(0))
  ) {
    throw new CloverError(
      'cannot append %s to %s',
      typeOf(appendValue),
      typeOf(flower)
    );
  }
  return flower.concat(appendValue);
});

/**
 * run a command on each element of a flower
 * @flower {list}
 * @param {command} command
 * @returns {list}
 */
const apply = new Pattern(1, (flower, args) => {
  const [command] = args;
  assert.type(flower, 'list');
  assert.type(command, 'command');
  return flower.map(x => command.run(x));
});

/**
 * run a command on each element of a flower for which a condition is true
 * @flower {list}
 * @param {command} conditionCommand
 * @param {command} command
 * @returns {list}
 */
const applyto = new Pattern(2, (flower, args) => {
  const [conditionCommand, command] = args;
  assert.type(flower, 'list');
  assert.type(conditionCommand, 'command');
  assert.type(command, 'command');
  return flower.map(x => {
    if (conditionCommand.run(x) === true) {
      return command.run(x);
    }
    return x;
  });
});

/**
 * sort a flower in ascending order
 * @flower {number[]}
 * @returns {number}
 */
const ascending = new Pattern(0, (flower) => {
  assert.type(flower, 'number[]');
  return flower.sort((a, b) => a.minus(b));
});

// TODO: comp used to be here - replace with destructuring bind

/**
 * split a flower by blocks (`\n\n`),
 * then split each block by lines (`\n`)
 * @flower {string}
 * @returns {string[][]}
 */
const blocks = new Pattern(0, (flower) => {
  assert.type(flower, 'string');
  return flower.split('\n\n')
    .map(block => block.split('\n'));
});

/**
 * return the lowest *n* numbers in a flower
 * @flower {number[]}
 * @param {integer} n
 * @returns {number[]}
 */
const bottom = new Pattern(1, (flower, args) => {
  const [n] = args;
  assert.type(flower, 'number[]');
  assert.type(n, 'integer');
  return flower.sort((a, b) => a.cmp(b))
    .slice(0, n);
});

/**
 * cast a flower from a number to a string, or vice-versa.
 * throws if this yields an invalid result
 * @flower {number|string}
 * @returns {number|string}
 */
const cast = new Pattern(0, (flower) => {
  assert.type(flower, 'number|string');
  if (typeOf(flower) === 'number') {
    return String(flower);
  }
  if (typeOf(flower) === 'string') {
    const result = new Num(flower);
    return result;
  }
});

/**
 * count occurrences of a value in a flower
 * @flower {list}
 * @param {any} searchValue
 * @returns {number}
 */
const count = new Pattern(1, (flower, args) => {
  const [searchValue] = args;
  assert.type(flower, 'list');
  return new Num(flower.filter(x => equal(x, searchValue)).length);
});

/**
 * reduce a plant to just one leaf, by running a command on an array containing
 * all of its flowers
 * @example
 * focus [1 2 3 4 5]
 * itemize
 * crush (sum)
 * -- { flower = 15 }
 * @param {command} command
 */
const crush = new PlantPattern(1, (plant, args) => {
  const [command] = args;
  assert.type(command, 'command');
  const result = command.run(Clover.plant.leaves.map(leaf => leaf.flower));
  return new Plant([result]);
});

/**
 * sort a flower in descending order
 * @flower {number[]}
 * @returns {number[]}
 */
const descending = new Pattern(0, (flower) => {
  assert.type(flower, 'number[]');
  return flower.sort((a, b) => b.minus(a));
});

/**
 * return whether a flower is divisible by a number
 * @flower {number}
 * @param {number} divisor
 * @returns {boolean}
 */
const divisible = new Pattern(1, (flower, args) => {
  const [divisor] = args;
  assert.type(flower, 'number');
  assert.type(divisor, 'number');
  return flower % divisor === 0;
});

/**
 * return whether a flower is equal to a value
 * @flower {any}
 * @param {any} cmpValue
 * @returns {boolean}
 */
const eq = new Pattern(1, (flower, args) => {
  const [cmpValue] = args;
  return equal(flower, cmpValue);
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
 * @flower {list}
 * @param {any} filterValue
 * @returns {list}
 */
const filter = new Pattern(1, (flower, args) => {
  const [filterValue] = args;
  assert.type(flower, 'list');
  return flower.filter(x => equal(x, filterValue) === false);
});

/**
 * flatten a flower
 * @flower {list}
 * @returns {list}
 */
const flatten = new Pattern(0, (flower) => {
  assert.type(flower, 'list');
  if (typeOf(flower) === 'string') {
    throw new CloverError('cannot flatten a string');
  }
  return flower.flat();
});

/**
 * return the floor of a flower
 * @flower {number}
 * @returns {number}
 */
const floor = new Pattern(0, (flower) => {
  assert.type(flower, 'number');
  return new (flower.constructor)(Math.floor(flower.valueOf()));
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
 * @param {list} list
 * @param {command} command
 */
const foreach = new Pattern(2, (flower, args) => {
  const [list, command] = args;
  assert.type(list, 'list');
  assert.type(command, 'command');
  const arr = [];
  for (const item of list) {
    arr.push(command.run(flower, item));
  }
  return arr;
});

/**
 * split a flower into groups of up to n values
 * @example
 * focus [1 2 3 4 5]
 * groups 2
 * -- { flower = [[1, 2], [3, 4], [5]] }
 * @flower {list}
 * @param {integer} size
 * @returns {list}
 */
const groups = new Pattern(1, (flower, args) => {
  const [size] = args;
  assert.type(flower, 'list');
  assert.type(size, 'integer');
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
 * return whether a flower is greater than a value
 * @flower {number}
 * @param {number} cmpValue
 * @returns {boolean}
 */
const gt = new Pattern(1, (flower, args) => {
  const [cmpValue] = args;
  assert.type(flower, 'number');
  assert.type(cmpValue, 'number');
  return flower > cmpValue;
});

/**
 * return whether a flower is greater than or equal to a value
 * @flower {number}
 * @param {number} cmpValue
 * @returns {boolean}
 */
const gte = new Pattern(1, (flower, args) => {
  const [cmpValue] = args;
  assert.type(flower, 'number');
  assert.type(cmpValue, 'number');
  return flower >= cmpValue;
});

/**
 * take a plant with a single array-type flower, and use its elements as
 * the leaves of a new plant
 * @example
 * focus [1 2 3]
 * itemize
 * -- { flower = 1 }, { flower = 2 }, { flower = 3 }
 */
const itemize = new PlantPattern(0, (plant, args) => {
  const leaves = plant.leaves;
  if (leaves.length > 1) {
    throw new CloverError(
      'ensure plant has only one leaf before itemizing'
    );
  }
  const flower = leaves[0].flower;
  assert.type(flower, 'list');
  plant.kill();
  flower.forEach(item => {
    plant.addLeaf(item);
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
  if (isList(flower)) {
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
 * split a flower by lines (`\n`)
 * @flower {string}
 * @returns {string[]}
 */
const lines = new Pattern(0, (flower) => {
  assert.type(flower, 'string');
  return flower.split('\n');
});

/**
 * lowercase a flower
 * @flower {char|string}
 * @returns {char|string}
 */
const lower = new Pattern(0, (flower) => {
  assert.type(flower, 'char|string');
  return flower.toLowerCase();
});

/**
 * return whether a flower is less than a value
 * @flower {number}
 * @param {number} cmpValue
 * @returns {boolean}
 */
const lt = new Pattern(1, (flower, args) => {
  const [cmpValue] = args;
  assert.type(flower, 'number');
  assert.type(cmpValue, 'number');
  return flower < cmpValue;
});

/**
 * return whether a flower is less than or equal to a value
 * @flower {number}
 * @param {number} cmpValue
 * @returns {boolean}
 */
const lte = new Pattern(1, (flower, args) => {
  const [cmpValue] = args;
  assert.type(flower, 'number');
  assert.type(cmpValue, 'number');
  return flower <= cmpValue;
});

/**
 * return the highest number in a flower
 * @flower {number[]}
 * @returns {number}
 */
const maximum = new Pattern(0, (flower) => {
  assert.type(flower, 'number[]');
  return new (flower[0].constructor)(Math.max(...flower.map(x => x.valueOf())));
});

/**
 * return the lowest number in a flower
 * @flower {number[]}
 * @returns {number}
 */
const minimum = new Pattern(0, (flower) => {
  assert.type(flower, 'number[]');
  return new (flower[0].constructor)(Math.min(...flower.map(x => x.valueOf())));
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
  return flower.minus(subtrahend);
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
  if (argument.eq(0)) {
    throw new CloverError('cannot divide by 0');
  }
  return flower.mod(argument);
});

/**
 * return whether a flower is odd
 * @flower {number}
 * @returns {boolean}
 */
const odd = new Pattern(0, (flower) => {
  assert.type(flower, 'number');
  return flower.mod(2).eq(1);
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
  if (divisor.eq(0)) {
    throw new CloverError('cannot divide by 0');
  }
  return flower.div(divisor);
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
    return command.run(leaf.flower) === false;
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
  return flower.plus(addend);
});

/**
 * prepend a value to a flower
 * @flower {list}
 * @param {any} prependValue
 * @returns {list}
 */
const prepend = new Pattern(1, (flower, args) => {
  const [prependValue] = args;
  assert.type(flower, 'list');
  if (
    typeOf(prependValue) !== typeOf(flower) &&
    typeOf(prependValue) !== typeOf(flower.at(0))
  ) {
    throw new CloverError(
      'cannot prepend %s to %s',
      typeOf(prependValue),
      typeOf(flower)
    );
  }
  flower.splice(0, 0, prependValue);
  return flower;
});

/**
 * return if a flower is prime
 * @flower {number}
 * @returns {boolean}
 */
const prime = new Pattern(0, (flower) => {
  assert.type(flower, 'integer');
  if (flower.eq(Infinity)) {
    throw new CloverError('cannot check against infinity');
  }
  if (flower.eq(1)) {
    return false;
  }
  for (let i = 2; i <= flower.sqrt().valueOf(); i++) {
    if (flower.mod(i).eq(0)) {
      return false;
    }
  }
  return true;
});

/**
 * return the product of a flower
 * @flower {number[]}
 * @returns {number}
 */
const product = new Pattern(0, (flower) => {
  assert.type(flower, 'number[]');
  return flower.reduce((a, c) => a.times(c), new (flower[0].constructor)(1));
});

/**
 * if a flower matches one value, replace it with another
 * @flower {any}
 * @param {any} matchValue
 * @param {any} replacementValue
 * @returns {any}
 */
// TODO: weird
const replace = new Pattern(2, (flower, args) => {
  const [matchValue, replacementValue] = args;
  if (equal(flower, matchValue)) {
    return replacementValue;
  }
  return flower;
});

/**
 * run-length decode a string
 * @flower {string}
 * @returns {string}
 */
const rld = new Pattern(0, (flower) => {
  assert.type(flower, 'string');
  if (!flower.match(/^(\d+.)+$/g)) {
    throw new CloverError('invalid value');
  }

  for (const run of flower.match(/\d+./g)) {
    const number = Number(run.slice(0, -1));
    const value = run.slice(-1);
    flower = flower.replace(run, value.repeat(number));
  }

  return flower;
});

/**
 * sort a flower
 * @flower {list}
 * @returns {list}
 */
// TODO: overload
const sort = new Pattern(0, (flower) => {
  assert.type(flower, 'list');
  return flower.sort((a, b) => a - b);
});

/**
 * string split a flower
 * @flower {string}
 * @param {char|string} splitter
 * @returns {string[]}
 */
const split = new Pattern(1, (flower, args) => {
  const [splitter] = args;
  assert.type(flower, 'string');
  assert.type(splitter, 'char|string');
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
 * return the sum of a flower
 * @flower {number[]}
 * @returns {number}
 */
const sum = new Pattern(0, (flower) => {
  assert.type(flower, 'number[]');
  return flower.reduce((a, c) => a.plus(c), new (flower[0].constructor)(0));
});

/**
 * yield the first n terms of a lazy plant.
 * skips known terms and uses the plant's command to generate unknown terms.
 * performs arg substitution
 * @param {integer} n
 */
// TODO:
const take = new PlantPattern(1, (plant, args) => {
  const [n] = args;
  assert.type(n, 'integer');
  if (!(plant instanceof LazyPlant)) {
    throw new CloverError("'take' command run on non-lazy plant");
  }
  for (let i = 1; i <= n; i++) {
    if (plant.getLeaf(i - 1) !== undefined) {
      continue;
    }
    plant.addLeaf(plant.command.run(new Num(i), new Num(i)));
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
  return flower.times(multiplier);
});

/**
 * return a range between a flower and another number.
 * if applicable, the range will count down
 * @flower {integer}
 * @param {integer} end
 * @returns {integer[]}
 */
const to = new Pattern(1, (flower, args) => {
  const [end] = args;
  assert.type(flower, 'integer');
  assert.type(end, 'integer');
  if (flower.gt(end)) {
    return Array(flower.minus(end).plus(1).valueOf())
      .fill(0)
      .map((x, i) => flower.minus(i));
  }
  return Array(end.minus(flower).plus(1).valueOf())
    .fill(0)
    .map((x, i) => flower.plus(i));
});

/**
 * return the highest *n* numbers in a flower
 * @flower {number[]}
 * @param {integer} n
 * @returns {number}
 */
const top = new Pattern(1, (flower, args) => {
  const [n] = args;
  assert.type(flower, 'number[]');
  assert.type(n, 'integer');
  return flower.sort((a, b) => b.cmp(a))
    .slice(0, n);
});

/**
 * return unique elements of a flower
 * @flower {list}
 * @returns {list}
 */
const unique = new Pattern(0, (flower, args) => {
  assert.type(flower, 'list');
  return flower.filter((x, i, r) => r.indexOf(x) === i);
});

/**
 * repeatedly run one command on a flower until another command returns true
 * @flower {any}
 * @param {command} conditionCommand
 * @param {command} command
 * @returns {any}
 */
const until = new Pattern(2, (flower, args) => {
  const [conditionCommand, command] = args;
  assert.type(conditionCommand, 'command');
  assert.type(command, 'command');
  for (let i = 0; i < 1000000; i++) {
    flower = command.run(flower);
    if (conditionCommand.run(flower) === true) {
      return flower;
    }
  }
  throw new CloverError('did not return true within a million iterations');
});

/**
 * uppercase a flower
 * @flower {char|string}
 * @returns {char|string}
 */
const upper = new Pattern(0, (flower) => {
  assert.type(flower, 'char|string');
  return flower.toUpperCase();
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
  return command.run(otherValue);
});

/**
 * zip two arrays together
 * @flower {list}
 * @param {list} seconds
 * @returns {list}
 */
const zip = new Pattern(1, (flower, args) => {
  const firsts = flower;
  const [seconds] = args;
  assert.type(firsts, 'list');
  assert.type(seconds, 'list');
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
  aeiou,
  aeiouy,
  all,
  any,
  append,
  apply,
  applyto,
  ascending,
  blocks,
  bottom,
  cast,
  count,
  crush,
  descending,
  divisible,
  eq,
  even,
  filter,
  flatten,
  floor,
  focus,
  foreach,
  groups,
  gt,
  gte,
  itemize,
  last,
  lazy,
  lines,
  lower,
  lt,
  lte,
  maximum,
  minimum,
  minus,
  mod,
  odd,
  over,
  pluck,
  plus,
  prepend,
  prime,
  product,
  replace,
  rld,
  sort,
  split,
  stop,
  sum,
  take,
  times,
  to,
  top,
  unique,
  until,
  upper,
  using,
  zip,
  // syntactic sugar
  max,
  min
};

export const reservedWords = Object.values(patterns)
  .map(pattern => pattern.head)
  .sort();

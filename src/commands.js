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
    if (rhsIndex === -1) {
      this.lhs = tokens;
      this.rhs = undefined;
    } else {
      this.lhs = tokens.slice(0, rhsIndex);
      this.rhs = tokens.slice(rhsIndex + 1)[0];
    }
    this.pattern = getPattern(this.lhs);
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
    const [args, source] = getArgs(this.pattern, this.lhs);
    this.args = args;
    this.source = source; // TODO: || ??
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
  const head = tokens[0].value;
  const pattern = patterns[head];
  if (pattern === undefined) {
    throw new CloverError(
      'no pattern found for head token %t',
      head
    );
  }
  return pattern;
}

/**
 * get the arguments being passed to a command,
 * given that command and the tokens that match its pattern
 * @param {Command} command
 * @param {Token[]} tokens
 */
export function getArgs (pattern, tokens) {
  tokens = [...tokens].slice(1);
  const minArgs = pattern.args;
  const maxArgs = pattern.args + 1;
  // there must be at least as many arguments as the pattern requires...
  if (tokens.length < minArgs) {
    throw new CloverError(
      'expected at least %s args, got %s',
      pattern.args,
      tokens.length
    );
  }
  // and at most one more (the source argument).
  if (tokens.length > maxArgs) {
    throw new CloverError(
      'expected at most %s args, got %s',
      pattern.args + 1,
      tokens.length
    );
  }
  // fill the source argument if it was given
  let source;
  if (tokens.length === maxArgs) {
    source = cast(tokens.pop());
  }
  return [tokens.map(token => cast(token)), source];
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
      leaf.flower = command.run(command.source || leaf.flower, command.args);
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
 * run a command on each element of a flower
 * @flower {*[]}
 * @param {command} command
 * @returns {*[]}
 */
const apply = new Pattern(1, (value, args) => {
  const [command] = args;
  assert.type(value, 'array');
  assert.type(command, 'command');
  return value.map(x => command.run(x, command.args));
});

// TODO: comp used to be here - replace with destructuring bind

/**
 * count occurrences of a value in a flower
 * @flower {*[]|string}
 * @param {*} searchValue
 * @returns {number}
 */
const count = new Pattern(1, (value, args) => {
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
const even = new Pattern(0, (value) => {
  assert.type(value, 'number');
  return value % 2 === 0;
});

/**
 * remove occurrences of a value from a flower
 * @flower {*[]}
 * @param {*} filterValue
 * @returns {*[]}
 */
const filter = new Pattern(1, (value, args) => {
  const [filterValue] = args;
  assert.type(value, 'array');
  return value.filter(x => x.flower !== filterValue);
});

/**
 * flatten a flower
 * @flower {*[]}
 * @returns {*[]}
 */
const flatten = new Pattern(0, (value) => {
  assert.type(value, 'array');
  return value.flat();
});

/**
 * replace a plant's flowers with the values in a given list
 * @param {*[]} list
 */
const flowers = new PlantPattern(1, (plant, args) => {
  const [list] = args;
  assert.type(list, 'array');
  return new Plant(list);
});

/**
 * set a flower equal to another value
 * mutables accepted
 * @param {*} focusValue
 */
const focus = new Pattern(1, (value, args) => {
  const [focusValue] = args;
  return focusValue;
});

/**
 * run a command on a flower multiple times,
 * and replace the flower with an array of the results
 * performs arg substitution
 * @example
 * flowers [5]
 * foreach [1 2 3] (add *) -- { flower = [6, 7, 8] }
 * @param {*[]} list
 * @param {command} command
 */
const foreach = new Pattern(2, (value, args) => {
  const [list, command] = args;
  assert.type(list, 'array');
  assert.type(command, 'command');
  const arr = [];
  for (const item of list) {
    command.calculateArgs();
    arr.push(command.run(value, command.substituteArg(item)));
  }
  return arr;
});

// TODO: best thing to do with this command
// /**
//  * set a plant equal to a different plant
//  * @param {Plant} focusValue
//  */
// const focusPlant = new PlantPattern('focus %P', (plant, args) => {
//   const [focusValue] = args;
//   return focusValue.clone();
// });

/**
 * split a flower into groups of up to n values
 * @example
 * focus [1 2 3 4 5]
 * groups 2 -- { flower = [[1, 2], [3, 4], [5]] }
 * @flower {*[]}
 * @param {number} size
 * @returns {*[]}
 */
const groups = new Pattern(1, (value, args) => {
  const [size] = args;
  assert.type(value, 'array');
  assert.type(size, 'number');
  if (size === 0) {
    throw new CloverError('cannot split into groups of 0');
  }
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
 * return the last element of a flower
 * returns the flower itself if it is not an array
 * @flower {*}
 * @returns {*}
 */
const last = new Pattern(0, (value) => {
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
const lazy = new PlantPattern(1, (plant, args) => {
  const [command] = args;
  assert.type(command, 'command');
  const lazyPlant = new LazyPlant(plant.leaves, command);
  return lazyPlant;
});

/**
 * return the highest number which is an element of a flower
 * @flower {*[]}
 * @returns {number}
 */
const maximum = new Pattern(0, (value) => {
  assert.type(value, 'array');
  return Math.max(...value.filter(Number));
});

/**
 * return the lowest number which is an element of a flower
 * @flower {*[]}
 * @returns {number}
 */
const minimum = new Pattern(0, (value) => {
  assert.type(value, 'array');
  return Math.min(...value.filter(Number));
});

/**
 * subtract from a flower (-)
 * mutables accepted
 * @flower {number}
 * @param {number} subtrahend
 * @returns {number}
 */
const minus = new Pattern(1, (value, args) => {
  const [subtrahend] = args;
  assert.type(value, 'number');
  assert.type(subtrahend, 'number');
  return value - subtrahend;
});

/**
 * return a flower mod n (%)
 * mutables accepted
 * @flower {number}
 * @param {number} argument
 * @returns {number}
 */
const mod = new Pattern(1, (value, args) => {
  const [argument] = args;
  assert.type(value, 'number');
  assert.type(argument, 'number');
  if (argument === 0) {
    throw new CloverError('cannot divide by 0');
  }
  return value % argument;
});

/**
 * return whether a flower is odd
 * @flower {number}
 * @returns {boolean}
 */
const odd = new Pattern(0, (value) => {
  assert.type(value, 'number');
  return value % 2 === 1;
});

/**
 * divide a flower (/)
 * mutables accepted
 * @flower {number}
 * @param {number} divisor
 * @returns {number}
 */
const over = new Pattern(1, (value, args) => {
  const [divisor] = args;
  assert.type(value, 'number');
  assert.type(divisor, 'number');
  if (divisor === 0) {
    throw new CloverError('cannot divide by 0');
  }
  return value / divisor;
});

/**
 * remove leaves from a plant for which a command is false
 * @example
 * flowers [1 2 3 4 5]
 * pluck (odd) -- { flower = 2 }, { flower = 4 }
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
 * add to a flower (+)
 * mutables accepted
 * @flower {number}
 * @param {number} addend
 * @returns {number}
 */
const plus = new Pattern(1, (value, args) => {
  const [addend] = args;
  assert.type(value, 'number');
  assert.type(addend, 'number');
  return value + addend;
});

/**
 * return the product of all numbers in a flower
 * @flower {*[]}
 * @returns {number}
 */
const product = new Pattern(0, (value) => {
  assert.type(value, 'array');
  // TODO: should it throw if it finds non-numbers instead?
  return value.filter(v => typeOf(v) === 'number')
    .reduce((a, c) => a * c, 1);
});

/**
 * array run-length decode
 * @flower {*[][]}
 * @returns {*[]}
 */
const rld = new Pattern(0, (value) => {
  assert.type(value, 'array');

  const result = [];
  for (const run of value) {
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
 * @flower {*[]}
 * @returns {*[]}
 */
const sort = new Pattern(0, (value) => {
  assert.type(value, 'array');
  return [...value].sort((a, b) => a - b);
});

/**
 * string split a flower
 * accepts some special keywords
 * @flower {string}
 * @param {*} splitter
 * @returns {string[]}
 */
const split = new Pattern(1, (value, args) => {
  const [splitter] = args;

  assert.type(value, 'string');
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
const stop = new PlantPattern(0, (plant) => {
  Clover.stop = true;
  return plant;
});

/**
 * return the sum of all numbers in a flower
 * @flower {*[]}
 * @returns {number}
 */
const sum = new Pattern(0, (value) => {
  assert.type(value, 'array');
  // TODO: should it throw if it finds non-numbers instead?
  return value.filter(v => typeOf(v) === 'number')
    .reduce((a, c) => a + c, 0);
});

/**
 * yield the first n terms of a lazy plant
 * skips known terms and uses the plant's command to generate unknown terms
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
    plant.command.calculateArgs();
    plant.addLeaf(
      plant.command.run(i, plant.command.substituteArg(i))
    );
  }
  return plant;
});

/**
 * multiply a flower (*)
 * mutables accepted
 * @flower {number}
 * @param {number} multiplier
 * @returns {number}
 */
const times = new Pattern(1, (value, args) => {
  const [multiplier] = args;
  assert.type(value, 'number');
  assert.type(multiplier, 'number');
  return value * multiplier;
});

/**
 * zip two arrays together
 * mutables accepted
 * @flower {array}
 * @param {array} seconds
 * @returns {array}
 */
const zip = new Pattern(1, (value, args) => {
  const firsts = value;
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
  flowers,
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
  rld,
  sort,
  split,
  stop,
  sum,
  take,
  times,
  zip,
  // syntactic sugar
  max,
  min
};

export const reservedWords = Object.values(patterns)
  .map(pattern => pattern.head)
  .sort();

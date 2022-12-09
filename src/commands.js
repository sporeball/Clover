import Token, { cast } from './token.js';
import { output } from './util.js';

/**
 * each command written in a clover program consists of a list of tokens.
 * if this list begins with a valid token, the interpreter will call a
 * corresponding function, which runs code for that command if the list
 * follows a valid pattern.
 * all such functions take the entire list, and consume it one token at a time
 * through callbacks.
 */

/**
 * class representing a valid command
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

  /**
   * run the command
   */
  run (args) {
    this.body(args);
  }
}

/**
 * execute a command given the tokens
 * @param {string[]} tokens
 */
// TODO: some would probably call this function overloaded
export function evaluate (tokens) {
  // the list of commands that the current token stream might match
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
}

/**
 * assert that the working value is of a certain type
 * @param {string[]} T type
 */
// TODO: this literally ended up exactly the same as Token.assertType
// could it be consolidated?
function worksWith (T) {
  const type = typeof Clover.working;
  if (type !== T) {
    throw new CloverError(
      'expected working value of type %s, got %s instead',
      T, type
    );
  }
}

/**
 * commands below
 */

const add = new Command('add %n', args => {
  worksWith('number');
  const [value] = args;
  Clover.working += cast(value);
});

const count = new Command('count %a', args => {
  // TODO: update type checking to make this work with arrays as well
  worksWith('string');
  const [value] = args;
  Clover.working = (Clover.working.match(
    new RegExp(cast(value), 'g')
  ) || [])
    .length;
});

const divide = new Command('divide by %n', args => {
  worksWith('number');
  const [value] = args;
  Clover.working /= cast(value);
});

const focus = new Command('focus %a', args => {
  const [value] = args;
  if (value === 'input') {
    Clover.focus = Clover.input;
  } else {
    Clover.focus = cast(value);
  }
  Clover.working = Clover.focus;
});

const multiply = new Command('multiply by %n', args => {
  worksWith('number');
  const [value] = args;
  Clover.working *= cast(value);
});

const refocus = new Command('refocus', () => {
  Clover.working = Clover.focus;
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
    default:
      value = cast(splitter);
  }

  Clover.working = Clover.focus.split(value);
  // TODO: giving
});

const subtract = new Command('subtract %n', args => {
  worksWith('number');
  const [value] = args;
  Clover.working -= cast(value);
});

export const commands = {
  add,
  count,
  divide,
  focus,
  multiply,
  refocus,
  show,
  showMonadic,
  split,
  subtract
};

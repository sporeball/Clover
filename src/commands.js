import Token, { cast, typeOf } from './token.js';
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
    this.body = function () {
      // Token.drop();
      body();
      Token.drop();
    };
  }

  /**
   * run the command
   */
  run () {
    this.body();
  }
}

/**
 * execute a command given the tokens
 * @param {string[]} tokens
 */
export function evaluate (tokens) {
  Token.stream = tokens;

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
      throw new CloverError(
        'no matching command pattern was found (offending token: %t)',
        tokens[i].value
      );
    }
    if (possible.length === 1) {
      break;
    }
  }
  const [name, command] = possible[0];
  if (tokens.length < command.pattern.split(' ').length) {
    throw new CloverError(
      'no matching command pattern was found (ran out of tokens)'
    );
  }
  // look for a command pattern that starts with the head
  commands[name].run(); // run the command

  // at this point the command should be over
  // throw if there is still something left
  if (!Token.empty) {
    throw new CloverError('found token %t after end of pattern', Token.head);
  }
}

/**
 * used in commands to assert that the working value is of a certain type
 * throws otherwise
 * @param {string[]} T type
 */
// TODO: this literally ended up exactly the same as Token.assertType
// could it be consolidated?
function worksWith (T) {
  const type = typeOf(Clover.working);
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

// TODO: many of the assertions are now not necessary
// figure out what to do

const add = new Command('add %n', () => {
  worksWith('number');
  Token.drop();
  Clover.working += cast(Token.head.value);
});

const count = new Command('count %a', () => {
  // TODO: update type checking to make this work with arrays as well
  worksWith('string');
  Token.drop();
  Clover.working = (Clover.working.match(
    new RegExp(cast(Token.head.value), 'g')
  ) || [])
    .length;
});

const divide = new Command('divide by %n', () => {
  worksWith('number');
  Token.drop(2);
  Clover.working /= cast(Token.head.value);
});

const focus = new Command('focus %a', () => {
  Token.drop();
  if (Token.head === 'input') {
    Clover.focus = Clover.input;
  } else {
    Clover.focus = cast(Token.head.value);
  }
  Clover.working = Clover.focus;
});

const multiply = new Command('multiply by %n', () => {
  worksWith('number');
  Token.drop(2);
  Clover.working *= cast(Token.head.value);
});

const refocus = new Command('refocus', () => {
  Clover.working = Clover.focus;
});

const show = new Command('show', () => {
  output(Clover.working);
});

const showMonadic = new Command('show %a', () => {
  Token.drop();
  output(cast(Token.head.value));
});

const split = new Command('split %a %a', () => {
  worksWith('string');
  Token.drop();
  Token.assertAny(['by', 'on'])
    .drop();
  let value;
  switch (Token.head.value) {
    case 'nl':
      value = '\n';
      break;
    case 'block':
      value = '\n\n';
      break;
    case 'spaces':
      value = ' ';
      break;
    default:
      value = cast(Token.head.value);
  }
  Clover.working = Clover.focus.split(value);
  // TODO: giving
});

const subtract = new Command('subtract %n', () => {
  worksWith('number');
  Token.drop();
  Clover.working -= cast(Token.head.value);
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

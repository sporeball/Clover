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

class Command {
  constructor (pattern, body) {
    this.pattern = pattern;
    this.body = function () {
      Token.drop();
      body();
      Token.drop();
    };
  }

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

  // TODO: what a deal! also, what in god's name!
  let possible = Object.entries(commands);
  for (let i = 0; i < tokens.length; i++) {
    possible = possible.filter(item => {
      const instance = item[1];
      const next = instance.pattern.split(' ')[i];
      return tokens[i].value === next ||
        tokens[i].specifier === next ||
        next === '%a';
    });
    if (possible.length === 0) {
      throw new CloverError(
        'no matching command pattern was found (offending token: %t)',
        tokens[i].value
      );
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

const add = new Command('add %n', () => {
  worksWith('number');
  Token.assertType('number');
  Clover.working += cast(Token.head.value);
});

const count = new Command('count %a', () => {
  // TODO: update type checking to make this work with arrays as well
  worksWith('string');
  Clover.working = (Clover.working.match(
    new RegExp(cast(Token.head.value), 'g')
  ) || [])
    .length;
});

const divide = new Command('divide by %n', () => {
  worksWith('number');
  Token.assertEquals('by')
    .then()
    .assertType('number');
  Clover.working /= cast(Token.head.value);
});

const focus = new Command('focus %a', () => {
  Token.assertDefined();
  if (Token.head === 'input') {
    Clover.focus = Clover.input;
  } else {
    Clover.focus = cast(Token.head.value);
  }
  Clover.working = Clover.focus;
});

const multiply = new Command('multiply by %n', () => {
  worksWith('number');
  Token.assertEquals('by')
    .then()
    .assertType('number');
  Clover.working *= cast(Token.head.value);
});

const refocus = new Command('refocus', () => {
  Clover.working = Clover.focus;
});

const show = new Command('show', () => {
  output(Clover.working);
});

const showMonadic = new Command('show %a', () => {
  output(cast(Token.head.value));
});

const split = new Command('split %a %a', () => {
  worksWith('string');
  Token.assertAny(['by', 'on'])
    .then()
    .assertDefined();
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
  Token.assertType('number');
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

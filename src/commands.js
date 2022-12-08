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
 * execute a command given the tokens
 * @param {string[]} tokens
 */
export function evaluate (tokens) {
  Token.stream = tokens;
  // look for a command pattern that starts with the head
  if (!(Token.head in commands)) {
    throw new CloverError('no pattern for head token %t', Token.head);
  }
  commands[Token.head](); // run the command

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
function worksWith (T) {
  const type = typeOf(Clover.working);
  if (type !== T) {
    throw new CloverError(
      'expected working value of type %s, got %s instead',
      T, type
    );
  }
}

function createCommand (body) {
  const code = function () {
    Token.drop(); // remove head
    body();
    Token.drop(); // remove the last
  };
  return code.bind({});
}

/**
 * commands below
 */

const add = createCommand(() => {
  worksWith('number');
  Token.assertType('number');
  Clover.working += cast(Token.head);
});

const count = createCommand(() => {
  // TODO: update type checking to make this work with arrays as well
  worksWith('string');
  Clover.working = (Clover.working.match(
    new RegExp(cast(Token.head), 'g')
  ) || [])
    .length;
});

const divide = createCommand(() => {
  worksWith('number');
  Token.assertEquals('by')
    .then()
    .assertType('number');
  Clover.working /= cast(Token.head);
});

const focus = createCommand(() => {
  Token.assertDefined();
  if (Token.head === 'input') {
    Clover.focus = Clover.input;
  } else {
    Clover.focus = cast(Token.head);
  }
  Clover.working = Clover.focus;
});

const multiply = createCommand(() => {
  worksWith('number');
  Token.assertEquals('by')
    .then()
    .assertType('number');
  Clover.working *= cast(Token.head);
});

const refocus = createCommand(() => {
  Clover.working = Clover.focus;
});

const show = createCommand(() => {
  if (Token.empty) {
    output(Clover.working);
  } else {
    output(cast(Token.head));
  }
});

const split = createCommand(() => {
  worksWith('string');
  Token.assertAny(['by', 'on'])
    .then()
    .assertDefined();
  let value;
  switch (Token.head) {
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
      value = cast(Token.head);
  }
  Clover.working = Clover.focus.split(value);
  // TODO: giving
});

const subtract = createCommand(() => {
  worksWith('number');
  Token.assertType('number');
  Clover.working -= cast(Token.head);
});

export const commands = {
  add,
  count,
  divide,
  focus,
  multiply,
  refocus,
  show,
  split,
  subtract
};

import Token, { any, cast, defined, equals, type } from './token.js';
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
  const typecheck = type(T, Clover.working);
  if (!typecheck.success) {
    throw new CloverError(
      'expected working value of type %s, got %s instead',
      T, typecheck.returned
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
  Token.assert(type('number'));
  Clover.working += cast(Token.head);
});

const divide = createCommand(() => {
  worksWith('number');
  Token.assert(equals('by'))
    .then()
    .assert(type('number'));
  Clover.working /= cast(Token.head);
});

const focus = createCommand(() => {
  Token.assert(defined());
  if (Token.head === 'input') {
    Clover.focus = Clover.input;
  } else {
    Clover.focus = cast(Token.head);
  }
  Clover.working = Clover.focus;
});

const multiply = createCommand(() => {
  worksWith('number');
  Token.assert(equals('by'))
    .then()
    .assert(type('number'));
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
  Token.assert(any(['by', 'on']))
    .then()
    .assert(defined());
  switch (Token.head) {
    case 'nl':
      Clover.working = Clover.focus.split('\n');
      break;
    case 'block':
      Clover.working = Clover.focus.split('\n\n');
      break;
    default:
      Clover.working = Clover.focus.split(cast(Token.head));
  }
  // TODO: giving
});

const subtract = createCommand(() => {
  worksWith('number');
  Token.assert(type('number'));
  Clover.working -= cast(Token.head);
});

export const commands = {
  add,
  divide,
  focus,
  multiply,
  refocus,
  show,
  split,
  subtract
};

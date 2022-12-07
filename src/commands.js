import Token, { any, cast, defined, equals, matches, type } from './token.js';
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
  Token.next(); // remove head
  commands[Token.prev](); // run the command

  // at this point the command should be over
  Token.drop(); // drop the last token
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

/**
 * commands below
 */

function add () {
  worksWith('number');
  Token.assert(type('number'));
  Clover.working += cast(Token.head);
}

function divide () {
  worksWith('number');
  Token.assert(equals('by'))
    .then()
    .assert(type('number'));
  Clover.working /= cast(Token.head);
}

function focus () {
  Token.assert(defined());
  if (Token.head === 'input') {
    Clover.focus = Clover.input;
  } else {
    Clover.focus = cast(Token.head);
  }
  Clover.working = Clover.focus;
}

function multiply () {
  worksWith('number');
  Token.assert(equals('by'))
    .then()
    .assert(type('number'));
  Clover.working *= cast(Token.head);
}

function refocus () {
  Clover.working = Clover.focus;
}

function show () {
  output(Clover.working);
  // TODO: make monadic
}

function split () {
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
}

function subtract () {
  worksWith('number');
  Token.assert(type('number'));
  Clover.working -= cast(Token.head);
}

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

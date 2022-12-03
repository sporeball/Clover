import Token, { any, equals, matches } from './token.js';

// TODO: check if there are extraneous tokens on the end of a command

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
  Token.setStream(tokens);
  // look for a command pattern that starts with the head
  if (!(Clover.head in commands)) {
    throw new Error(`no pattern for head token '${Clover.head}'`);
  }
  Token.next(); // remove head
  commands[Clover.prev](); // run
}

function add () {
  if (Token.type() === 'number') {
    Clover.working += Token.cast();
  }
  Token.drop();
}

function divide () {
  Token.assert(equals('by')())
  .then();
  if (Token.type() === 'number') {
    Clover.working /= Token.cast();
  }
  Token.drop();
}

function focus () {
  if (Clover.head === 'input') {
    Clover.focus = Clover.input;
  } else {
    Clover.focus = Token.cast();
  }
  Clover.working = Clover.focus;
  Token.drop();
}

function multiply () {
  Token.assert(equals('by')())
    .then();
  if (Token.type() === 'number') {
    Clover.working *= Token.cast();
  }
  Token.drop();
}

function subtract () {
  if (Token.type() === 'number') {
    Clover.working -= Token.cast();
  }
  Token.drop();
}

// TODO: turn back on
// function split () {
  // Token.assert(equals('by')());
  // Token.assert(any('by', 'on')());
  // option(tk, {
  //   nl: () => { Clover.focus = Clover.focus.split('\n'); },
  //   block: () => { Clover.focus = Clover.focus.split('\n\n'); }
  // });
// }

export const commands = {
  add,
  divide,
  focus,
  multiply,
  subtract
};

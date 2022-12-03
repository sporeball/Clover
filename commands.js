import Token, { equals } from './token.js';

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
    throw new Error(`no pattern for head token ${Clover.head}`);
  }
  Token.next(); // remove head
  commands[Clover.prev](); // run
}

function split () {
  Token.assert(equals('by'));
  // option(tk, {
  //   nl: () => { Clover.focus = Clover.focus.split('\n'); },
  //   block: () => { Clover.focus = Clover.focus.split('\n\n'); }
  // });
}

const commands = {
  split
};

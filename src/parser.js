import { tokenize } from './tokenizer.js';

function parsePrimitive (tokens) {
  const primitive = tokens.shift();
  return {
    type: 'primitive',
    value: primitive
  };
}

function parseList (tokens) {
  // skip the open bracket
  tokens.shift();
  const list = [];
  while (true) {
    // if the next token is a newline, the closing bracket is missing
    if (tokens[0]?.type === 'newline') {
      throw new Error('unmatched bracket');
    }
    // while there are still tokens,
    // and the next token is not a closing bracket,
    // eat
    if (tokens[0] && tokens[0].type !== 'closeBracket') {
      list.push(eat(tokens));
    } else {
      break;
    }
  }
  // if there are no more tokens,
  // or the next token is not a closing bracket,
  // it's missing
  if (tokens.shift()?.type !== 'closeBracket') {
    throw new Error('unmatched bracket');
  }
  return {
    type: 'list',
    items: list
  };
}

function parseLeaf (tokens) {
  tokens.shift(); // skip the angle bracket
  const index = tokens.shift();
  if (index.type !== 'number') {
    throw new Error('invalid leaf index');
  }
  return {
    type: 'leaf',
    index: Number(index.value)
  };
}

function parsePlant (tokens) {
  tokens.shift(); // skip the @
  const identifier = tokens.shift();
  if (identifier.type !== 'identifier') {
    throw new Error('invalid plant identifier');
  }
  return {
    type: 'plant',
    identifier
  };
}

function parseCommand (tokens) {
  const head = tokens.shift();
  const args = [];
  while (true) {
    if (tokens[0] === undefined) {
      break;
    }
    if (
      tokens[0].type === 'newline' ||
      tokens[0].type === 'closeParen' // for parenthesized commands
    ) {
      break;
    }
    args.push(eat(tokens));
  }
  return {
    type: 'command',
    head: head.value,
    args
  };
}

function parseParenCommand (tokens) {
  // skip the parenthesis
  tokens.shift();
  let command;
  while (true) {
    // if the next token is a newline, the closing parenthesis is missing
    if (tokens[0]?.type === 'newline') {
      throw new Error('unmatched parenthesis');
    }
    // while there are still tokens,
    // and the next token is not a closing parenthesis,
    // eat
    if (tokens[0] && tokens[0].type !== 'closeParen') {
      command = eat(tokens);
    } else {
      break;
    }
  }
  // if there are no more tokens,
  // or the next token is not a closing parenthesis,
  // it's missing
  if (tokens.shift()?.type !== 'closeParen') {
    throw new Error('unmatched parenthesis');
  }
  // if (command.type !== 'command') {
  //   throw new Error('invalid parenthesized value');
  // }
  return {
    type: 'parenCommand',
    value: command
  };
}

/**
 * parse a flat list of tokens
 */
export function parse (tokens) {
  let tree = [];
  while (tokens.length > 0) {
    tree.push(eat(tokens));
  }
  return tree;
}

/**
 * take a flat list of tokens
 * do something based on the first one
 */
function eat (tokens) {
  switch (tokens[0].type) {
    case 'number':
    case 'string':
    case 'boolean':
      return parsePrimitive(tokens);
    case 'openParen':
      return parseParenCommand(tokens);
    case 'closeParen': // bare
      throw new Error('unmatched parenthesis');
    case 'openBracket':
      return parseList(tokens);
    case 'closeBracket': // bare
      throw new Error('unmatched bracket');
    case 'openAngle':
      return parseLeaf(tokens);
    case 'at':
      return parsePlant(tokens);
    case 'identifier':
      return parseCommand(tokens);
    case 'newline':
      return tokens.shift();
  }
  throw new Error(`no matching rule found: ${tokens[0].type}`);
}

const tokens = tokenize(
  `using <-1 (until (prime) (plus 1))`
);
console.dir(parse(tokens), { depth: null });

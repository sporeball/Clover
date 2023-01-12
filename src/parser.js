function parseNumber (tokens) {
  const number = tokens.shift();
  return {
    type: 'number',
    value: Number(number.value)
  };
}

function parseString (tokens) {
  const string = tokens.shift();
  return {
    type: 'string',
    value: string.value.slice(1, -1) // remove the single quotes
  };
}

function parseBoolean (tokens) {
  const boolean = tokens.shift();
  return {
    type: 'boolean',
    value: (boolean.value === 'true') // haha
  };
}

function parseList (tokens) {
  // skip the open bracket
  tokens.shift();
  const list = [];
  while (true) {
    // if the next token is a newline, the closing bracket is missing
    if (tokens[0]?.type === 'newline') {
      throw new CloverError('unmatched bracket');
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
    throw new CloverError('unmatched bracket');
  }
  return {
    type: 'list',
    items: list
  };
}

function parseLeaf (tokens) {
  tokens.shift(); // skip the angle bracket
  const index = tokens.shift();
  if (index?.type !== 'number') {
    throw new CloverError('invalid leaf index');
  }
  return {
    type: 'leaf',
    index: Number(index.value)
  };
}

function parsePlant (tokens) {
  tokens.shift(); // skip the @
  const identifier = tokens.shift();
  if (identifier?.type !== 'identifier') {
    throw new CloverError('invalid plant identifier');
  }
  return {
    type: 'plant',
    identifier: identifier.value
  };
}

function parseMutable (tokens) {
  tokens.shift(); // skip the colon
  const identifier = tokens.shift();
  if (identifier?.type !== 'identifier') {
    throw new CloverError('invalid mutable identifier');
  }
  return {
    type: 'mutable',
    identifier: identifier.value
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
      tokens[0].type === 'closeParen' || // for parenthesized commands
      tokens[0].type === 'equals' // for assignment
    ) {
      break;
    }
    args.push(eat(tokens));
  }
  if (tokens[0]?.type !== 'equals') {
    return {
      type: 'command',
      head: head.value,
      args
    };
  }
  tokens.shift(); // skip the equals sign
  if (tokens[0] === undefined || tokens[0].type === 'newline') {
    throw new CloverError('empty right-hand side');
  }
  const rhs = eat(tokens);
  return {
    type: 'command',
    head: head.value,
    args,
    rhs
  };
}

function parseParenCommand (tokens) {
  // skip the parenthesis
  tokens.shift();
  let command;
  while (true) {
    // if the next token is a newline, the closing parenthesis is missing
    if (tokens[0]?.type === 'newline') {
      throw new CloverError('unmatched parenthesis');
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
    throw new CloverError('unmatched parenthesis');
  }
  if (command.type !== 'command') {
    throw new CloverError('invalid parenthesized value');
  }
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
  tree = tree.filter(node => node.type !== 'newline');
  return tree;
}

/**
 * take a flat list of tokens
 * do something based on the first one
 */
function eat (tokens) {
  switch (tokens[0].type) {
    case 'number':
      return parseNumber(tokens);
    case 'string':
      return parseString(tokens);
    case 'boolean':
      return parseBoolean(tokens);
    case 'openParen':
      return parseParenCommand(tokens);
    case 'closeParen': // bare
      throw new CloverError('unmatched parenthesis');
    case 'openBracket':
      return parseList(tokens);
    case 'closeBracket': // bare
      throw new CloverError('unmatched bracket');
    case 'openAngle':
      return parseLeaf(tokens);
    case 'at':
      return parsePlant(tokens);
    case 'colon':
      return parseMutable(tokens);
    case 'equals': // bare
      throw new CloverError('invalid assignment');
    case 'star':
      return tokens.shift();
    case 'identifier':
      return parseCommand(tokens);
    case 'newline':
      return tokens.shift();
  }
  throw new CloverError(`parser: no matching rule found: ${tokens[0].type}`);
}

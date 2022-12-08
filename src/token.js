// import { specifier } from './util.js';
import reserved from '../util/reserved.js';

let _stream = [];
let _prev;

/**
 * return the format specifier that matches a value (typically a token value)
 * supported specifiers include:
 *   %n  number
 *   %s  string
 *   %r  reserved word
 *   %m  mutable
 *       (understood to be some other unqualified word)
 *   %a  any
 * @param {*} value
 */
function specifier (value) {
  const T = typeOf(value);
  if (T === 'number') {
    return '%n';
  }
  if (T === 'string') {
    return '%s';
  }
  if (T === 'reserved') {
    return '%r';
  }
  if (T === 'mutable') {
    return '%m';
  }
  return '%a';
}

/**
 * return whether a token is equal to one of multiple passed values
 * @param {*[]} values
 * @param {string} [token]
 */
export function any (values, token) {
  return values.includes(token);
}

export function defined (token) {
  return token !== undefined;
}

/**
 * return whether a token is equal to a value
 * @param {string} value
 * @param {string} [token]
 */
export function equals (value, token) {
  return token === value;
}

/**
 * return whether a token matches a regular expression
 * @param {RegExp} regexp
 * @param {string} [token]
 */
export function matches (regexp, token) {
  return typeof token === 'string' && token.match(regexp) !== null;
}

/**
 * return whether a token is of a certain type
 * @param {string} [token]
 */
export function typeOf (token) {
  if (token === undefined) {
    return 'none';
  } else if (reserved.includes(token)) {
    return 'reserved';
  } else if (typeof token === 'number' ||
    (typeof token === 'string' && token !== '' && !isNaN(Number(token)))
  ) {
    return 'number';
  } else if (matches(/^'.*'$/, token)) {
    return 'string';
  } else if (typeof token === 'string') {
    return 'string';
  } else {
    return 'other';
  }
}

/**
 * cast a value from a Clover type to a primitive JavaScript type
 * does not mutate the original value
 * @param {*} value
 * @returns {number|string}
 */
// TODO: automatic and manual
export function cast (value) {
  const T = typeOf(value);
  if (T === 'number') {
    return Number(value);
  }
  if (T === 'string') {
    value = value.replace(/\\n/g, '\n');
    if (value.startsWith("'") && value.endsWith("'")) {
      return value.slice(1, -1); // remove
    }
  }
  return value;
}

// default object
// import with the name Token
const Token = {
  /**
   * class representing a token
   */
  Token: class Token {
    /**
     * @param {*} value
     */
    constructor (value) {
      this.value = value;
      this.specifier = specifier(value);
    }
  },
  assertAny (values) {
    if (!any(values, this.head.value)) {
      throw new CloverError(
        'expected one of %t, got %t instead', values, this.head.value
      );
    }
    return this;
  },
  assertDefined () {
    if (!defined(this.head.value)) {
      throw new CloverError("expected a token, but didn't get one");
    }
  },
  assertEquals (value) {
    if (!equals(value, this.head.value)) {
      throw new CloverError(
        'expected token %t, got %t instead', value, this.head.value
      );
    }
    return this;
  },
  assertMatches (regexp) {
    if (!matches(regexp, this.head.value)) {
      throw new CloverError('token %t does not match regex', this.head.value);
    }
    return this;
  },
  assertType (T) {
    const t = typeOf(this.head.value);
    if (t !== T) {
      throw new CloverError(
        'expected token of type %s, got %s instead', T, t
      );
    }
    return this;
  },
  /**
   * syntactic sugar for `next()`
   * chainable
   */
  drop (count = 1) {
    for (let i = 0; i < count; i++) {
      this.next();
    }
    return this;
  },
  /**
   * return whether the current token stream is empty
   * getter
   */
  get empty () {
    return this.stream.length === 0;
  },
  /**
   * return the first remaining element of the current token stream
   * getter
   */
  get head () {
    return this.stream[0];
  },
  /**
   * move on to the next token of the current token stream
   * chainable
   */
  next () {
    _prev = this.stream.shift();
    return this;
  },
  get prev () {
    return _prev;
  },
  /**
   * return what remains of the current token stream
   * getter
   */
  get stream () {
    return _stream;
  },
  /**
   * set the current token stream
   * setter
   * @param {*[]} s
   */
  set stream (s) {
    _stream = s;
  },
  /**
   * syntactic sugar for `next()`
   * chainable
   */
  then () {
    this.next();
    return this;
  }
};

export default Token;

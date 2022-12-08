// import { format } from './util.js';

let _stream = [];
let _prev;

/**
 * return whether a token is equal to one of multiple passed values
 * assertable
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
 * assertable
 * @param {string} value
 * @param {string} [token]
 */
export function equals (value, token) {
  return token === value;
}

/**
 * return whether a token matches a regular expression
 * assertable
 * @param {RegExp} regexp
 * @param {string} [token]
 */
export function matches (regexp, token) {
  return typeof token === 'string' && token.match(regexp) !== null;
}

/**
 * return whether a token is of a certain type
 * assertable
 * @param {string} [token]
 */
export function typeOf (token) {
  if (token === undefined) {
    return 'none';
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
  assertAny (values) {
    if (!any(values, this.head)) {
      throw new CloverError(
        'expected one of %t, got %t instead', values, this.head
      );
    }
    return this;
  },
  assertDefined () {
    if (!defined(this.head)) {
      throw new CloverError("expected a token, but didn't get one");
    }
  },
  assertEquals (value) {
    if (!equals(value, this.head)) {
      throw new CloverError(
        'expected token %t, got %t instead', value, this.head
      );
    }
    return this;
  },
  assertMatches (regexp) {
    if (!matches(regexp, this.head)) {
      throw new CloverError('token %t does not match regex', this.head);
    }
    return this;
  },
  assertType (T) {
    const t = typeOf(this.head);
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
  drop () {
    this.next();
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

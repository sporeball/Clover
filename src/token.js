import { format } from './util.js';

let _stream = [];
let _prev;

/**
 * return whether a token is equal to one of multiple passed values
 * assertable
 * @param {*[]} values
 * @param {string} [token]
 */
export function any (values, token = _stream[0]) {
  const success = values.includes(token);
  return {
    success,
    self_emsg: format('expected one of %t, got %t instead', values, token)
  };
}

export function defined (token = _stream[0]) {
  const success = token !== undefined;
  return {
    success,
    self_emsg: format("expected a token, but didn't get one")
  };
}

/**
 * return whether a token is equal to a value
 * assertable
 * @param {string} value
 * @param {string} [token]
 */
export function equals (value, token = _stream[0]) {
  const success = token === value;
  return {
    success,
    self_emsg: format('expected token %t, got %t instead', value, token)
  };
}

/**
 * return whether a token matches a regular expression
 * assertable
 * @param {RegExp} regexp
 * @param {string} [token]
 */
export function matches (regexp, token = _stream[0]) {
  const success = typeof token === 'string' && token.match(regexp) !== null;
  return {
    success,
    self_emsg: format('token %t does not match regex', token)
  };
}

/**
 * return whether a token is of a certain type
 * assertable
 * @param {string} type
 * @param {string} [token]
 */
export function type (t, token = _stream[0]) {
  let returned;
  if (equals(undefined, token).success) {
    returned = 'none';
  } else if (
    matches(/^0$|^-?[1-9][0-9]*$/, token).success
    || typeof token === 'number'
  ) {
    returned = 'number';
  } else if (matches(/^'.*'$/, token).success || typeof token === 'string') {
    returned = 'string';
  } else {
    returned = 'other';
  }
  const success = t === returned;
  return {
    success,
    returned,
    self_emsg: format('expected token of type %s, got %s instead', t, returned)
  };
}

/**
 * cast a value from some sort of raw string into something else
 * does not mutate the original value
 * @returns {number|string}
 */
export function cast (value) {
  const T = type('', value).returned;
  // number
  if (T === 'number') {
    return Number(value);
  }
  if (T === 'string') {
    if (value.startsWith("'") && value.endsWith("'")) {
      return value.slice(1, -1); // remove
    }
    // otherwise it just happens to be any other string
    // fall through
  }
  return value;
}

// default object
// import with the name Token
export default {
  /**
   * verify that something is true
   * requires an assertable function
   * throws the associated error message if the assertion returns false
   * chainable
   * @param {*} cb a call to an assertable function
   */
  assert (cb) {
    if (cb.success === false) {
      throw new CloverError(cb.self_emsg);
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
  iff (assertable, cb) {
    if (assertable.success === true) {
      cb();
    }
    return this;
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
  },
};

import { format } from './util.js';

let _stream;
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
  const success = token.match(regexp) !== null;
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
  if (equals(undefined).success) {
    returned = 'none';
  } else if (matches(/^0$|^-?[1-9][0-9]*$/).success) {
    returned = 'number';
  } else if (matches(/^'.*'$/).success) {
    returned = 'string';
  } else {
    returned = 'other';
  }
  const success = t === returned;
  return {
    success,
    self_emsg: format('expected token of type %s, got %s instead', t, returned)
  };
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
   * cast the current token from a raw string to something else
   * does not mutate the current token
   * @returns {number|string}
   */
  cast () {
    // number
    if (type('number').success) {
      return Number(this.head);
    }
    if (type('string').success) {
      return this.head.slice(1, -1); // remove the extra single quotes
    }
    return this.head;
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

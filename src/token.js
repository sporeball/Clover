import { format } from './util.js';

let _stream;

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
    if (matches(/^0$|^-?[1-9][0-9]*$/).success) {
      return Number(Clover.head);
    }
    return Clover.head;
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
   * return the first remaining element of the current token stream
   * getter
   */
  get head () {
    return _stream[0];
  },
  /**
   * move on to the next token of the current token stream
   * chainable
   */
  next () {
    Clover.prev = this.stream.shift();
    Clover.head = this.stream[0];
    return this;
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
    Clover.head = s[0];
  },
  /**
   * syntactic sugar for `next()`
   * chainable
   */
  then () {
    this.next();
    return this;
  },
  type () {
    // TODO: any others
    if (matches(/^0$|^-?[1-9][0-9]*$/).success) {
      return 'number';
    } else {
      return 'other';
    }
  }
};

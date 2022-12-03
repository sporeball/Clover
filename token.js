/**
 * return whether a token is equal to a value
 * use with `assert()`
 * @param {string} value
 */
export function equals (value) {
  return function (token = Clover.head) {
    const success = token === value;
    return {
      success,
      self_emsg: `expected token '${value}', got '${token}' instead`
    };
  };
}

export function matches (regexp) {
  return function (token = Clover.head) {
    const success = token.match(regexp) !== null;
    return {
      success,
      self_emsg: `token '${token}' does not match regex`
    };
  };
}

// default object
// import with the name Token
export default {
  /**
   * set the current token stream
   * updates relevant values in Clover object
   * @param {string[]} tkstream
   */
  setStream(tkstream) {
    Clover.tkstream = tkstream;
    Clover.head = tkstream[0];
  },
  /**
   * verify that something is true about the current token
   * chainable
   * @param {Function} cb condition to test
   */
  assert(cb) {
    if (cb.success === false) {
      throw new Error(cb.self_emsg);
    }
    return this;
  },
  /**
   * move on to the next token of the current token stream
   * chainable
   */
  next() {
    Clover.prev = Clover.tkstream.shift();
    Clover.head = Clover.tkstream[0];
    return this;
  },
  /**
   * syntactic sugar
   * chainable
   */
  then() {
    this.next();
    return this;
  },
};

/**
 * return whether a token is equal to a value
 * use with `assert()`
 * @param {string} value
 */
export function equals (value) {
  return (token) => {
    if (token !== value) {
      throw new Error(`expected token '${value}', got '${token}' instead`);
    }
    return true;
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
    cb(Clover.head);
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

/**
 * run code based on a list of options for a token
 * removes the token afterwards
 * @param {string[]} tk entire token stream
 * @param {object} obj options object
 */
// export function option (tk, obj) {
//   tk = tk.shift();
//   if (!(tk in obj)) {
//     throw new Error(`token '${tk}' is invalid here`);
//   }
//   obj[tk]();
// }

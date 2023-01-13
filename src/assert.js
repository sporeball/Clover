import { any, defined, equal, matches, typeOf } from './util.js';

const assert = {
  any (value, values) {
    if (!any(value, values)) {
      throw new CloverError(
        'expected one of %t, got %t instead', values, value
      );
    }
  },
  defined (value) {
    if (!defined(value)) {
      throw new CloverError("expected a token, but didn't get one");
    }
  },
  equal (name, v1, v2) {
    if (!equal(v1, v2)) {
      throw new CloverError(
        'expected %s to equal %t, got %t instead', name, v2, v1
      );
    }
  },
  matches (value, regexp) {
    if (!matches(value, regexp)) {
      throw new CloverError('token %t does not match regex', value);
    }
    return this;
  },
  tokenEqual (t1, t2) {
    if (!equal(t1.value, t2.value)) {
      throw new CloverError(
        'expected token %t, got %t instead', t1, t2
      );
    }
  },
  type (value, T) {
    const t = typeOf(value);
    if (t !== T) {
      throw new CloverError(
        'expected token of type %s, got %s instead', T, t
      );
    }
  }
};

export default assert;

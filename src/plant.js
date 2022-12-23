import { Leaf } from './leaf.js';

/**
 * class representing the plant
 */
export class Plant {
  constructor (leaves) {
    this.leaves = leaves.map(leaf => new Leaf(leaf));
    return this;
  }

  addLeaf (value) {
    this.leaves.push(new Leaf(value));
    return this;
  }

  removeLeaf (index) {
    this.leaves.splice(index, 1);
    return this;
  }

  getLeaf (index) {
    return this.leaves.at(index);
  }

  kill () {
    this.leaves = [];
    return this;
  }

  clone () {
    return new Plant([...this.leaves]);
  }
}

export class LazyPlant extends Plant {
  constructor (leaves, cstr) {
    super([...leaves]);
    this.cstr = cstr;
    return this;
  }

  clone () {
    return new LazyPlant(this.leaves, this.cstr);
  }
}

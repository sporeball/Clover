import { Leaf } from './leaf.js';

/**
 * class representing the plant
 */
export class Plant {
  constructor (leaves) {
    this.leaves = leaves.map(leaf => {
      if (leaf instanceof Leaf) {
        return leaf;
      }
      return new Leaf(leaf);
    });
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
  constructor (leaves, command) {
    super(leaves);
    this.command = command;
    return this;
  }

  clone () {
    return new LazyPlant(this.leaves, this.command);
  }
}

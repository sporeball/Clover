import { Leaf } from './leaf.js';

/**
 * class representing the plant
 */
export class Plant {
  constructor () {
    this.leaves = [];
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
    return this.leaves[index];
  }

  kill () {
    this.leaves = [];
    return this;
  }
}

export class LazyPlant extends Plant {
  constructor (plant, cstr) {
    super();
    this.leaves = plant.leaves;
    this.cstr = cstr;
    return this;
  }

  getLeaf (index) {
    return this.leaves[index - 1];
  }
}

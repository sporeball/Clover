import { Leaf } from './leaf.js';
import { tokenize, getCommand, getArgs } from './commands.js';

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
    this.cstrs = [cstr];
    return this;
  }

  getLeaf (index) {
    if (this.leaves[index - 1] === undefined) {
      this.cstrs.forEach((cstr, i) => {
        const tokens = tokenize(cstr.replace('::', index))
        const command = getCommand(tokens);
        const commandArgs = getArgs(command, tokens);
        if (i === 0) {
          this.leaves[index - 1] = new Leaf(command.run(index, commandArgs));
        } else {
          this.leaves[index - 1].working = command.run(
            this.leaves[index - 1].working,
            commandArgs
          );
        }
      });
    }
    return this.leaves[index - 1];
  }
}

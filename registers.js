class Registers {
  constructor() {
    this.clear();
  }

  clear() {
    for (let register of ["ax", "bx", "cx", "dx", "si", "di"]) {
      this[register] = 0;
    }

    this["sp"] = 0xFFFF;
    this.compare_flag = 0;
  }
}

module.exports = Registers;

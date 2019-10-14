class Registers {
  constructor(max_memory) {
    this.reset(max_memory);
  }

  reset(max_memory) {
    for (let register of ["eax", "ebx", "ecx", "edx", "esi", "edi"]) {
      this[register] = 0;
    }

    this["esp"] = max_memory;
    this.compare_flag = 0;
    this.carry_flag = 0;
  }

  getFirstParamRegister() {
    return this["eax"];
  }
  setFirstParamRegister(value) {
    this["eax"] = value;
  }

  getStackPointer() {
    return this["esp"];
  }
  setStackRegister(value) {
    this["esp"] = value;
  }

  getFirstStringIndex() {
    return this["esi"];
  }

  setSecondParamRegister(value) {
    this["edx"] = value;
  }
}

module.exports = Registers;

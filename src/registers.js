class Registers {
  constructor(max_memory) {
    this.reset(max_memory);
  }

  reset(max_memory) {
    for (let register of ["eax", "ebx", "ecx", "edx", "esi", "edi", "ebp"]) {
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

  getSecondParamRegister() {
    return this["edx"];
  }
  setSecondParamRegister(value) {
    this["edx"] = value;
  }

  getStackPointer() {
    return this["esp"];
  }
  setStackPointer(value) {
    this["esp"] = value;
  }

  getFirstStringIndex() {
    return this["esi"];
  }
}

module.exports = Registers;

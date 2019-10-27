class Registers {
  constructor(max_memory, max_size) {
    this.reset(max_memory);

    this.max_size = max_size;
  }

  reset(max_memory) {
    for (let register of ["eax", "ebx", "ecx", "edx", "esi", "edi", "ebp"]) {
      this[register] = 0;
    }

    this["esp"] = max_memory;
    this["eip"] = (max_memory + 1)/2;
    this.compare_flag = 0;
    this.carry_flag = 0;
  }

  getIP() {
    return this["eip"];
  }
  incIP() {
    this["eip"] += this.max_size;
  }
  setIP(address) {
    this["eip"] = address;
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

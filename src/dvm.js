const MemoryController = require('./memory-controller');
const Registers = require('./registers');

class DVM {
  constructor(code) {
    this.code = code;
  }

  initialize() {
    this.reset();

    for (let index = 0; index < this.code.length; ++index) {
      this.memory.writeMemory((this.max_memory+1)/2+index, this.code[index]);
    }
  }

  reset() {
    this.max_memory = 0xFFFFFFFF;
    this.max_type = "dwrd";
    this.max_type_size = 4;
    this.memory = new MemoryController(this.max_memory);
    
    this.registers = new Registers(this.max_memory, this.max_type_size);
  }

  getOpcode(bytes) {
    let opcode = "";
    opcode += String.fromCharCode((bytes & 0xFF000000) >>> 24);
    opcode += String.fromCharCode((bytes & 0xFF0000) >>> 16);
    opcode += String.fromCharCode((bytes & 0xFF00) >>> 8);
    opcode += String.fromCharCode((bytes & 0xFF) >>> 0);
    return opcode.trim();
  }

  readOpcode() {
    return this.getOpcode(this.readValue());
  }

  readValue() {
    let value = this.memory.readAddress(this.registers.getIP(), this.max_type);
    this.registers.incIP();
    return value;
  }

  runBytes() {
    this.running = true;
    while (this.running) {
      let opcode = this.readOpcode();
      let register;
      let value;
      let size;
      let pointer;
      let comparand;
      switch (opcode) {
        case "jmp":
        case "jg":
        case "jge":
        case "jl":
        case "jle":
        case "je":
        case "jne":
          if (this.canJump(opcode)) {
            let address = this.readValue();
            this.registers.setIP(address);
          }
          break;
        case "mrv":
          register = this.readOpcode();
          value = this.readValue();
          this.registers[register] = value;
          break;
        case "mrvr":
          register = this.readOpcode();
          value = this.readOpcode();
          this.registers[register] = this.registers[value];
          break;
        case "mrva":
          register = this.readOpcode();
          size = this.readOpcode();
          pointer = this.readOpcode();
          this.registers[register] = this.memory.readAddress(this.registers[pointer], size);
          break;
        case "mav":
          size = this.readOpcode();
          pointer = this.readOpcode();
          value = this.readValue();
          this.memory.writeAddress(this.registers[pointer], value, size);
          break;
        case "mavr":
          size = this.readOpcode();
          pointer = this.readOpcode();
          register = this.readOpcode();
          this.memory.writeAddress(this.registers[pointer], this.registers[register], size);
          break;
        case "add":
          register = this.readOpcode();
          value = this.readValue();
          this.registers[register] = this.registers[register] + value;
          if (this.registers[register] > this.max_memory) {
            this.registers[register] = (this.registers[register] & this.max_memory) >>> 0;
            this.registers.carry_flag = 1;
          } else {
            this.registers.carry_flag = 0;
          }
          break;
        case "addr":
          register = this.readOpcode();
          value = this.registers[this.readOpcode()];
          this.registers[register] = this.registers[register] + value;
          if (this.registers[register] > this.max_memory) {
            this.registers[register] = (this.registers[register] & this.max_memory) >>> 0;
            this.registers.carry_flag = 1;
          } else {
            this.registers.carry_flag = 0;
          }
          break;
        case "sub":
          register = this.readOpcode();
          value = this.readValue();
          this.registers[register] = (this.registers[register] - value) >>> 0;
          if (this.registers[register] < 0) this.registers[register] = 0;
          break;
        case "subr":
          register = this.readOpcode();
          value = this.registers[this.readOpcode()];
          this.registers[register] = (this.registers[register] - value) >>> 0;
          if (this.registers[register] < 0) this.registers[register] = 0;
          break;
        case "mul":
          value = this.readValue();
          this.registers.setFirstParamRegister(this.registers.getFirstParamRegister() * value);
          if (this.registers.getFirstParamRegister() > this.max_memory) {
            this.registers.setFirstParamRegister((this.registers.getFirstParamRegister() & this.max_memory) >>> 0);
            this.registers.carry_flag = 1;
          } else {
            this.registers.carry_flag = 0;
          }
          break;
        case "mulr":
          value = this.registers[this.readOpcode()];
          this.registers.setFirstParamRegister(this.registers.getFirstParamRegister() * value);
          if (this.registers.getFirstParamRegister() > this.max_memory) {
            this.registers.setFirstParamRegister((this.registers.getFirstParamRegister() & this.max_memory) >>> 0);
            this.registers.carry_flag = 1;
          } else {
            this.registers.carry_flag = 0;
          }
          break;
        case "div":
          value = this.readValue();
          this.registers.setFirstParamRegister((this.registers.getFirstParamRegister() / value) >>> 0);
          this.registers.setSecondParamRegister((this.registers.getFirstParamRegister() % value) >>> 0);
          break;
        case "divr":
          value = this.registers[this.readOpcode()];
          this.registers.setFirstParamRegister((this.registers.getFirstParamRegister() / value) >>> 0);
          this.registers.setSecondParamRegister((this.registers.getFirstParamRegister() % value) >>> 0);
          break;
        case "and":
          register = this.readOpcode();
          value = this.readValue();
          this.registers[register] = (this.registers[register] & value) >>> 0;
          break;
        case "andr":
          register = this.readOpcode();
          value = this.registers[this.readOpcode()];
          this.registers[register] = (this.registers[register] & value) >>> 0;
          break;
        case "or":
          register = this.readOpcode();
          value = this.readValue();
          this.registers[register] = (this.registers[register] | value) >>> 0;
          break;
        case "orr":
          register = this.readOpcode();
          value = this.registers[this.readOpcode()];
          this.registers[register] = (this.registers[register] | value) >>> 0;
          break;
        case "xor":
          register = this.readOpcode();
          value = this.readValue();
          this.registers[register] = (this.registers[register] ^ value) >>> 0;
          break;
        case "xorr":
          register = this.readOpcode();
          value = this.registers[this.readOpcode()];
          this.registers[register] = (this.registers[register] ^ value) >>> 0;
          break;
        case "neg":
          register = this.readOpcode();
          this.registers[register] = this.max_memory - this.registers[register];
          break;
        case "psh":
          value = this.readValue();
          this.registers.decSP();
          if (this.registers.getSP() < 0) throw new Error("Stack overflow");
          this.memory.writeAddress(this.registers.getSP(), value, this.max_type);
          break;
        case "pshr":
          register = this.readOpcode();
          this.registers.decSP();
          if (this.registers.getSP() < 0) throw new Error("Stack overflow");
          this.memory.writeAddress(this.registers.getSP(), this.registers[register], this.max_type);
          break;
        case "pop":
          register = this.readOpcode();
          if (this.registers.getSP() > this.max_memory - this.max_type_size) throw new Error("Nothing to pop");
          this.registers[register] = this.memory.readAddress(this.registers.getSP(), this.max_type);
          this.registers.incSP();
          break;
        case "call":
          address = this.readValue();
          this.registers.decSP();
          if (this.registers.getSP() < 0) throw new Error("Stack overflow");
          this.memory.writeAddress(this.registers.getSP(), this.registers.getIP(), this.max_type);
          this.registers.setIP(address);
          break;
        case "ret":
          if (this.registers.getSP() > this.max_memory - this.max_type_size) throw new Error("Nothing to pop");
          address = this.memory.readAddress(this.registers.getSP(), this.max_type);
          this.registers.incSP();
          this.registers.setIP(address);
          break;
        case "cmp":
          register = this.readOpcode();
          comparand = this.readValue();
          if (this.registers[register] > comparand) {
            this.registers.compare_flag = 1;
          } else if (this.registers[register] < comparand) {
            this.registers.compare_flag = -1;
          } else {
            this.registers.compare_flag = 0;
          }
          break;
        case "cmpr":
          register = this.readOpcode();
          comparand = this.readOpcode();
          if (this.registers[register] > this.registers[comparand]) {
            this.registers.compare_flag = 1;
          } else if (this.registers[register] < this.registers[comparand]) {
            this.registers.compare_flag = -1;
          } else {
            this.registers.compare_flag = 0;
          }
          break;
        case "cmpa":
          register = this.readOpcode();
          size = this.readOpcode();
          address = this.readOpcode();
          comparand = this.memory.readAddress(this.registers[address], size);
          if (this.registers[register] > comparand) {
            this.registers.compare_flag = 1;
          } else if (this.registers[register] < comparand) {
            this.registers.compare_flag = -1;
          } else {
            this.registers.compare_flag = 0;
          }
          break;
        case "shr":
          register = this.readOpcode();
          value = this.readValue();
          this.registers[register] = (this.registers[register] >>> value) & this.max_memory;
          break;
        case "shrr":
          register = this.readOpcode();
          value = this.registers[this.readOpcode()];
          this.registers[register] = (this.registers[register] >>> value) & this.max_memory;
          break;
        case "shl":
          register = this.readOpcode();
          value = this.readValue();
          this.registers[register] = ((this.registers[register] << value) & this.max_memory) >>> 0;
          break;
        case "shlr":
          register = this.readOpcode();
          value = this.registers[this.readOpcode()];
          this.registers[register] = ((this.registers[register] << value) & this.max_memory) >>> 0;
          break;
        case "int":
          value = this.readValue();
          let start;
          let length;
          let type;
          let data;
          switch (value) {
            case 0:
              console.log(this.registers);
              break;
            case 1:
              start = this.registers.getFirstStringIndex();
              length = this.registers.getFirstParamRegister();
              type = this.registers.getSecondParamRegister();
              data = [];
              for (let i = 0; i < length*(2**type); i += 2**type) {
                data.push(this.memory.readAddress(start + i, ['byte', 'word', 'dwrd'][type]));
              }
              console.log(data.join(' '));
              break;
            case 2:
              start = this.registers.getFirstStringIndex();

              data = '';
              let char = this.memory.readMemory(start);
              while (char != 0) {
                data += String.fromCharCode(char);
                start++;
                char = this.memory.readMemory(start);
              }

              console.log(data);
              break;
            default:
              throw new Error(`Unknown interrupt ${value}`);
          }
          break;
        case "hlt":
          this.running = false;
          break;
        default:
          break;
      }
    }
  }

  canJump(jump_type) {
    switch (jump_type) {
      case "jmp":
        return true;
      case "jg":
        return this.registers.compare_flag > 0;
      case "jge":
        return this.registers.compare_flag >= 0;
      case "jl":
        return this.registers.compare_flag < 0;
      case "jle":
        return this.registers.compare_flag <= 0;
      case "je":
        return this.registers.compare_flag == 0;
      case "jne":
        return this.registers.compare_flag != 0;
    }
  }
}

module.exports = DVM;

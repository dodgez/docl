const MemoryController = require('./memory-controller');
const Registers = require('./registers');

class DVM {
  constructor(code) {
    this.code = code;
  }

  initialize() {
    this.reset();

    console.log("VM initialized");
  }

  reset() {
    this.labels = {};
    this.call_index = 0;
    this.max_memory = 0xFFFFFFFF;
    this.max_type = "dword";
    this.memory = new MemoryController(this.max_memory);
    
    this.registers = new Registers(this.max_memory);
  }

  run_and_stop() {
    this.initialize();
    this.createLabels();
    this.run();
    this.stop();
  }

  createLabels() {
    for (let i = 0; i < this.code.length; ++i) {
      if (!this.code[i].children.length) { continue; }

      switch (this.code[i].children[0].type) {
        case "label":
          this.labels[this.code[i].children[0].children[1].token] = i;
          break;
      }
    }
  }

  run(start_index = 0) {
    for (let i = start_index; i < this.code.length; ++i) {
      if (!this.code[i].children.length) { continue; }

      let line = this.code[i].children[0];
      let type = line.children[0];
      let value;

      switch (line.type) {
        case "label":
          this.labels[this.code[i].children[0].children[1].token] = i;
          break;
        case "jump":
          if (this.canJump(type.token)) {
            i = this.labels[line.children[1].token];
          }
          break;
        case "move":
          this.handleMove(line);
          break;
        case "summation":
          let dest = line.children[1];
          let other = line.children[3];
          switch (type.token) {
            case "add":
              if (this.getValue(dest) + this.getValue(other) > this.max_memory) {
                this.registers.carry_flag = 1;
              } else {
                this.registers.carry_flag = 0;
              }
              this.registers[dest.token] = ((this.getValue(dest) + this.getValue(other)) & this.max_memory) >>> 0;
              break;
            case "sub":
              this.registers[dest.token] = this.getValue(dest) - this.getValue(other);
              if (this.registers[dest.token] < 0) {
                this.registers[dest.token] = 0;
              }
              break;
          }
          break;
        case "multiply":
          value = this.getValue(line.children[1]);
          switch (type.token) {
            case "mul":
              if (this.registers.getFirstParamRegister() * value > this.max_memory) {
                this.registers.carry_flag = 1;
              } else {
                this.registers.carry_flag = 0;
              }
              this.registers.setFirstParamRegister(((this.registers.getFirstParamRegister() * value) & this.max_memory) >>> 0);
              break;
            case "div":
              this.registers.setSecondParamRegister(this.registers.getFirstParamRegister() % value);
              this.registers.setFirstParamRegister(Math.floor(this.registers.getFirstParamRegister() / value));
              break;
          }
          break;
        case "bitwise":
          value = this.getValue(line.children[3]);
          switch (type.token) {
            case "and":
              this.registers[line.children[1].token] = (this.getValue(line.children[1]) & value) >>> 0;
              break;
            case "or":
              this.registers[line.children[1].token] = (this.getValue(line.children[1]) | value) >>> 0;
              break;
            case "xor":
              this.registers[line.children[1].token] = (this.getValue(line.children[1]) ^ value) >>> 0;
              break;
          }
          break;
        case "negate":
          this.registers[line.children[1].token] = this.max_memory - this.registers[line.children[1].token];
          break;
        case "push":
          value = this.getValue(line.children[1]);
          this.registers.setStackPointer(this.registers.getStackPointer() - 4);
          if (this.registers.getStackPointer() < 0) throw new Error("Ran out of memory");
          this.memory.writeAddress(this.registers.getStackPointer(), value, this.max_type);
          break;
        case "pop":
          if (this.registers.getStackPointer() > this.max_memory - 1) throw new Error("Nothing to pop");
          this.registers[line.children[1].token] = this.memory.readAddress(this.registers.getStackPointer(), this.max_type);
          this.registers.setStackPointer(this.registers.getStackPointer() + 4);
          break;
        case "call":
          this.call_index = i;
          i = this.labels[line.children[1].token];
          break;
        case "RET":
          i = this.call_index;
          break;
        case "compare":
          let value1 = this.getValue(line.children[1]);
          let value2 = this.getValue(line.children[3]);
          if (value1 > value2) {
            this.registers.compare_flag = 1;
          } else if (value1 < value2) {
            this.registers.compare_flag = -1;
          } else {
            this.registers.compare_flag = 0;
          }
          break;
        case "shift":
          value = this.getValue(line.children[1]);
          let shift = this.getValue(line.children[3]);
          if (line.children[0].token == "shr") {
            value = (value >>> shift) & this.max_memory;
          } else {
            value = ((value << shift) & this.max_memory) >>> 0;
          }
          this.registers[line.children[1].token] = value;
          break;
        case "interrupt":
          let data;
          let start;
          let length;
          value = this.getValue(line.children[1]);
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
                data.push(this.memory.readAddress(start + i, ['byte', 'word', 'dword'][type]));
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
        case "NOP":
          break;
        default:
          throw new Error("Unknown statement: ${line}");
      }
    }
  }

  stop() {
    console.log("VM stopped");
  }

  handleMove(line) {
    let dest = line.children[1];
    let source = line.children[3];
    let read_size;
    let value;
    switch (source.type) {
      case "REGISTER":
        let register = source.token;
        value = this.registers[register];
        break;
      case "number":
        value = this.parseNumber(source);
        break;
      case "address":
        read_size = source.children[0].token;
        value = this.memory.readAddress(this.getBaseAddress(source), read_size);
        break;
    }
    switch (dest.type) {
      case "REGISTER":
        let register = dest.token;
        this.registers[register] = value;
        break;
      case "address":
        let write_size = dest.children[0].token;
        if (read_size && read_size != write_size) { console.log(`Incompatible sizes detected, source: ${read_size} dest: ${write_size}`); }
        this.memory.writeAddress(this.getBaseAddress(dest), value, write_size);
        break;
    }
  }

  getBaseAddress(address) {
    let register = address.children[2].token;
    let base_address = this.registers[register];
    if (address.children[3].type == "sum_address") {
      base_address += this.parseNumber(address.children[3].children[1]);
    }
    return base_address;
  }

  getValue(node) {
    switch (node.type) {
      case "REGISTER":
        return this.registers[node.token];
      case "number":
        return this.parseNumber(node);
    }
  }

  parseNumber(number) {
    let value;

    if (number.type == "number") {
      if (number.children[0].type == "HEXNUM") {
        value = parseInt(number.children[0].token);
      } else {
        value = this.parseNumber(number.children[0]);
      }
    } else {
      value = parseInt(number.token);
    }

    if (value > this.max_memory) throw new Error(`Value too large: ${value}`);
    return value;
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
    }
  }
}

module.exports = DVM;

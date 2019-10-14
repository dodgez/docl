const Registers = require('./registers');

class VM {
  constructor(code) {
    this.code = code;
  }

  initialize() {
    this.labels = {};
    this.call_index = 0;
    this.memory = [];
    this.max_memory = 0xFFFFFFFF;
    this.max_type = "dword";
    this.registers = new Registers(this.max_memory);

    console.log("VM initialized");
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
          switch(type.token) {
            case "and":
              this.registers[line.children[1].token] = this.getValue(line.children[1]) & value;
              break;
            case "or":
              this.registers[line.children[1].token] = this.getValue(line.children[1]) | value;
              break;
            case "xor":
              this.registers[line.children[1].token] = this.getValue(line.children[1]) ^ value;
              break;
          }
          break;
        case "negate":
          this.registers[line.children[1].token] = this.max_memory - this.registers[line.children[1].token];
          break;
        case "push":
          value = this.getValue(line.children[1]);
          this.registers.setStackRegister(this.registers.getStackRegister() - 2);
          if (this.registers.getStackRegister() < 0) throw new Error("Ran out of memory");
          this.writeAddress(this.registers.getStackRegister(), value, this.max_type);
          break;
        case "pop":
          if (this.registers.getStackRegister() > this.max_memory-1) throw new Error("Nothing to pop");
          this.registers[line.children[1].token] = this.readAddress(this.registers.getStackRegister(), this.max_type);
          this.registers.setStackRegister(this.registers.getStackRegister() + 2);
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
              console.log(`${this.memory.slice(start, start + length).join(' ')}`);
              break;
            case 2:
              start = this.registers.getFirstStringIndex();

              let data = '';
              let char = this.readMemory(start);
              while (char != 0) {
                data += String.fromCharCode(char);
                start++;
                char = this.readMemory(start);
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
        value = this.readAddress(this.getBaseAddress(source), read_size);
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
        this.writeAddress(this.getBaseAddress(dest), value, write_size);
        break;
    }
  }

  readAddress(address, size) {
    switch (size) {
      case "byte":
        return this.readMemory(address);
      case "word":
        return this.readMemory(address) * 0x100 + this.readMemory(address + 1);
      case "dword":
        return this.readMemory(address) * 0x1000000 + this.readMemory(address + 1) * 0x10000 + this.readAddress(address + 2, "word");
    }
  }

  writeAddress(address, value, size) {
    switch (size) {
      case "byte":
        this.writeMemory(address, value & 0xFF);
        break;
      case "word":
        this.writeMemory(address, (value & 0xFF00) >> 8);
        this.writeMemory(address + 1, value & 0xFF);
        break;
      case "dword":
          this.writeMemory(address, (value >>> 24) & 0xFF);
          this.writeMemory(address + 1, (value >>> 16) & 0xFF);
          this.writeAddress(address + 2, value & 0xFFFF, "word");
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
  
  readMemory(address) {
    for (let chunk of this.memory) {
      if (chunk.address <= address && chunk.address + chunk.data.length >= address) {
        let diff = address - chunk.address;
        return chunk.data[diff];
      }
    }
    return 0;
  }

  writeMemory(address, byte) {
    for (let chunk of this.memory) {
      if (chunk.address <= address && chunk.address + chunk.data.length >= address) {
        let diff = address - chunk.address;
        chunk.data[diff] = byte;
        return;
      }
      if (address >= chunk.address - 0xFF && address < chunk.address) {
        let diff = chunk.address - address;
        let new_memory  = [byte];
        while (new_memory.length < diff) { new_memory.push(0); }
        chunk.data = new_memory.concat(chunk.data);
        chunk.address = address;
        return;
      }
    }
    this.memory.push({address, data: [byte]})
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

    if (value > this.max_memory) throw new Error("Value too large: ${value}");
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

module.exports = VM;

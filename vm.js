const Registers = require('./registers');

class VM {
  constructor(code) {
    this.code = code;
  }

  initialize() {
    this.labels = {};
    this.registers = new Registers();
    this.call_index = 0;
    this.memory = [];

    while(this.memory.length < 0x10000) {
      this.memory.push(0);
    }

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
      switch (this.code[i].children[0].type) {
        case "label":
          this.labels[this.code[i].children[0].children[1].token] = i;
          break;
      }
    }
  }

  run(start_index = 0) {
    let lines = this.code;

    for (let i = start_index; i < lines.length; ++i) {
      let line = lines[i].children[0];
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
              this.registers[dest.token] = this.getValue(dest) + this.getValue(other);
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
              this.registers["ax"] = (this.registers["ax"] * value) & 0xFFFF;
              break;
            case "div":
              this.registers["dx"] = this.registers["ax"] % value;
              this.registers["ax"] = Math.floor(this.registers["ax"] / value);
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
          this.registers[line.children[1].token] = 0xFFFF - this.registers[line.children[1].token];
          break;
        case "push":
          value = this.getValue(line.children[1]);
          this.registers["sp"] -= 2;
          if (this.registers["sp"] < 0) throw new Error("Ran out of memory");
          this.writeAddress(this.registers["sp"], value, "word");
          break;
        case "pop":
          if (this.registers["sp"] > 0x10000-2) throw new Error("Nothing to pop");
          this.registers[line.children[1].token] = this.readAddress(this.registers["sp"], "word");
          this.registers["sp"] += 2;
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
          value = (value * 2 ** shift) & 0xFFFF;
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
              start = this.registers["si"];
              length = this.registers["ax"];
              console.log(`${this.memory.slice(start, start + length).join(' ')}`);
              break;
            case 2:
              start = this.registers["si"];

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
    }
  }

  writeAddress(address, value, size) {
    switch (size) {
      case "byte":
        this.writeMemory(address, value & 0xFF);
        break;
      case "word":
        this.writeMemory(address, value & 0xFF00);
        this.writeMemory(address + 1, value & 0xFF);
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
    return this.memory[address];
  }

  writeMemory(address, value) {
    this.memory[address] = value;
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

    if (value > 0xFFFF) throw new Error("Value too large: ${value}");
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

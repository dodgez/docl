class MemoryController {
  constructor(max_memory) {
    this.max_memory = max_memory;
    this.memory = [];
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
        let new_memory = [byte];
        while (new_memory.length < diff) { new_memory.push(0); }
        chunk.data = new_memory.concat(chunk.data);
        chunk.address = address;
        return;
      }
    }
    this.memory.push({ address, data: [byte] })
  }
}

module.exports = MemoryController;

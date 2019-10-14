const expect = require('chai').expect;

const MemoryController = require('./../src/memory-controller');

describe('Memory Controller', function () {
  let memory_controller;

  beforeEach(function () {
    memory_controller = new MemoryController(0xFFFFFFFF);
  });

  it('can read uninitialized memory', function () {
    expect(memory_controller.readAddress(0, "byte")).to.equal(0);
  });

  it('can write to uninitialized memory', function () {
    memory_controller.writeAddress(0, 0xFC, "byte");

    expect(memory_controller.memory[0]).to.deep.equal({ address: 0, data: [0xFC] });
  });

  it('can read a word', function () {
    memory_controller.memory = [{ address: 0xFF, data: [0xDE, 0xAD] }];

    expect(memory_controller.readAddress(0xFF, "word")).to.equal(0xDEAD);
  });

  it('can write a word', function () {
    memory_controller.writeAddress(0xFF, 0xDEAD, "word");

    expect(memory_controller.memory[0]).to.deep.equal({ address: 0xFF, data: [0xDE, 0xAD] });
  });

  it('can read a dword', function () {
    memory_controller.memory = [{ address: 0xFF, data: [0xDE, 0xAD, 0xBE, 0xEF] }];

    expect(memory_controller.readAddress(0xFF, "dword")).to.equal(0xDEADBEEF);
  });

  it('can write a dword', function () {
    memory_controller.writeAddress(0xFF, 0xDEADBEEF, "dword");

    expect(memory_controller.memory[0]).to.deep.equal({ address: 0xFF, data: [0xDE, 0xAD, 0xBE, 0xEF] });
  });

  it('can absorb a write within 0xFF bytes', function () {
    memory_controller.memory = [{ address: 0x100, data: [0xDE, 0xAD, 0xBE, 0xEF] }];
    memory_controller.writeAddress(0xFC, 0xDEADBEEF, "dword");

    expect(memory_controller.memory[0]).to.deep.equal({ address: 0xFC, data: [0xDE, 0xAD, 0xBE, 0xEF, 0xDE, 0xAD, 0xBE, 0xEF] });
  });

  it('will not absorb a write outside 0xFF bytes', function () {
    memory_controller.memory = [{ address: 0x100, data: [0xDE, 0xAD, 0xBE, 0xEF] }];
    memory_controller.writeAddress(0x0, 0xFC, "byte");

    expect(memory_controller.memory).to.deep.equal([
      { address: 0x100, data: [0xDE, 0xAD, 0xBE, 0xEF] },
      { address: 0x00, data: [0xFC] },
    ]);
  });

  it('will partially absorb a write on the boundary of 0xFF bytes', function () {
    memory_controller.memory = [{ address: 0x100, data: [0xDE, 0xAD, 0xBE, 0xEF] }];
    memory_controller.writeAddress(0x0, 0xDEAD, "word");

    let expected_memory = [0xAD];
    while (expected_memory.length < 0xFF) { expected_memory.push(0); }

    expected_memory = expected_memory.concat([0xDE, 0xAD, 0xBE, 0xEF]);

    expect(memory_controller.memory).to.deep.equal([
      { address: 0x01, data: expected_memory },
      { address: 0x00, data: [0xDE] }
    ]);
  });
});

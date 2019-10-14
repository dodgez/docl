const expect = require('chai').expect;

const Registers = require('./../src/registers');

describe('Registers', function () {
  let registers;

  before(function () {
    registers = new Registers(0xFFFFFFFF);
  });

  it('initializes the registers to zero', function () {
    Object.keys(registers).forEach(function (key) {
      if (key != "esp") {
        expect(registers[key]).to.equal(0);
      }
    });
  });

  it('sets the stack pointer correctly', function () {
    expect(registers.getStackPointer()).to.equal(0xFFFFFFFF);
  });
});

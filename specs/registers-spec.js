const expect = require('chai').expect;

const Registers = require('./../src/registers');

describe('Registers', function () {
  let registers;

  before(function () {
    registers = new Registers(0xFFFFFFFF, 4);
  });

  it('initializes the registers to zero', function () {
    Object.keys(registers).forEach(function (key) {
      if (key != "esp" && key != "eip" && key != "max_size") {
        expect(registers[key]).to.equal(0);
      }
    });
  });

  it('sets the stack pointer correctly', function () {
    expect(registers.getSP()).to.equal(0xFFFFFFFF);
  });

  it('changes stack pointer accordingly', function () {
    registers["esp"] -= 4;

    expect(registers.getSP()).to.equal(0xFFFFFFFF - 4);
  });

  it('sets the instruction pointer correctly', function () {
    expect(registers.getIP()).to.equal(0x80000000);
  });

  it('changes stack pointer accordingly', function () {
    registers.incIP();

    expect(registers.getIP()).to.equal(0x80000000 + 4);
  });
});

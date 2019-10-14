const expect = require('chai').expect;
const fs = require('fs');
const lngr = require('lngr');

const DVM = require('./../src/dvm');
const Interpreter = require('./../src/interpreter');

describe('DVM', function () {
  describe('machine', function () {
    let interpreter;

    before(function () {
      let grammar = JSON.parse(fs.readFileSync('./grammar.json', 'utf8'));
      let lexemes = lngr.lexer.formatTokens(grammar.tokens);
      let rules = lngr.parser.formatRules(grammar.rules);

      interpreter = new Interpreter([], lexemes, rules);
    });

    beforeEach(function () {
      interpreter.reset();
    });

    it('creates labels', function () {
      interpreter.runLine('label func:');

      expect(interpreter.dvm.labels).to.deep.equal({ 'func': interpreter.dvm.code.length - 1 });
    });

    it('jumps to labels', function () {
      interpreter.runLine('mov eax, 0');
      interpreter.runLine('int 255');
      interpreter.runLine('jmp start');
      interpreter.runLine('label move:');
      interpreter.runLine('mov eax, 5');
      expect(interpreter.dvm.registers['eax']).to.equal(0);

      interpreter.runLine('jmp end');
      interpreter.runLine('label start:');
      interpreter.runLine('jmp move');
      interpreter.runLine('label end:');
      interpreter.runLine('int 255');
      expect(interpreter.dvm.registers['eax']).to.equal(5);
    });

    it('moves values around', function () {
      interpreter.runLine('mov eax, 0xF0');

      expect(interpreter.dvm.registers['eax']).to.equal(0xF0);

      interpreter.runLine('mov byte [eax + 0x0F], 0xFC');

      expect(interpreter.dvm.memory.memory).to.deep.equal([{ address: 0xFF, data: [0xFC] }]);
    });

    it('adds and subtracts values', function () {
      interpreter.runLine('mov eax, 0');
      interpreter.runLine('add eax, 1');

      expect(interpreter.dvm.registers['eax']).to.equal(1);

      interpreter.runLine('add eax, eax');

      expect(interpreter.dvm.registers['eax']).to.equal(2);

      interpreter.runLine('mov ebx, 1');
      interpreter.runLine('sub eax, ebx');

      expect(interpreter.dvm.registers['eax']).to.equal(1);

      interpreter.runLine('mov ebx, 3');
      interpreter.runLine('sub eax, ebx');

      expect(interpreter.dvm.registers['eax']).to.equal(0);
    });

    it('multiplies and divides values', function () {
      interpreter.runLine('mov eax, 5');
      interpreter.runLine('mul 6');

      expect(interpreter.dvm.registers['eax']).to.equal(30);

      interpreter.runLine('mov eax, 5');
      interpreter.runLine('mov ebx, 6');
      interpreter.runLine('mul ebx');

      expect(interpreter.dvm.registers['eax']).to.equal(30);

      interpreter.runLine('mov eax, 30');
      interpreter.runLine('div 5');

      expect(interpreter.dvm.registers['eax']).to.equal(6);
      expect(interpreter.dvm.registers['edx']).to.equal(0);

      interpreter.runLine('mov eax, 30');
      interpreter.runLine('div 4');

      expect(interpreter.dvm.registers['eax']).to.equal(7);
      expect(interpreter.dvm.registers['edx']).to.equal(2);
    });

    it('performs bitwise operations', function () {
      interpreter.runLine('mov eax, 0xDEADBEEF');
      interpreter.runLine('mov ebx, 0xFF00FF00');
      interpreter.runLine('and eax, ebx');

      expect(interpreter.dvm.registers['eax']).to.equal(0xDE00BE00);

      interpreter.runLine('mov eax, 0xDEADBEEF');
      interpreter.runLine('mov ebx, 0xFF00FF00');
      interpreter.runLine('or eax, ebx');

      expect(interpreter.dvm.registers['eax']).to.equal(0xFFADFFEF);

      interpreter.runLine('mov eax, 0x7EADBEEF');
      interpreter.runLine('mov ebx, 0xFF00FF00');
      interpreter.runLine('xor eax, ebx');

      expect(interpreter.dvm.registers['eax']).to.equal(0x81AD41EF);
    });

    it('negates registers', function () {
      interpreter.runLine('mov eax, 0xDEADBEEF');
      interpreter.runLine('neg eax');

      expect(interpreter.dvm.registers['eax']).to.equal(559038736);
    });

    it('pushes and pops', function () {
      interpreter.runLine('mov eax, 0xDEADBEEF');
      interpreter.runLine('push eax');

      expect(interpreter.dvm.memory.memory).to.deep.equal([{ address: 0xFFFFFFFF - 4, data: [0xDE, 0xAD, 0xBE, 0xEF] }]);

      interpreter.runLine('pop ebx');

      expect(interpreter.dvm.registers['ebx']).to.equal(0xDEADBEEF);
    });

    it('calls labels', function () {
      interpreter.runLine('mov eax, 0');
      interpreter.runLine('int 255');
      interpreter.runLine('call start');
      interpreter.runLine('mov eax, 6');
      expect(interpreter.dvm.registers['eax']).to.equal(0);

      interpreter.runLine('label move:');
      interpreter.runLine('mov eax, 5');
      interpreter.runLine('call end');
      interpreter.runLine('label start:');
      interpreter.runLine('call move');
      interpreter.runLine('label end:');
      interpreter.runLine('int 255');
      expect(interpreter.dvm.registers['eax']).to.equal(5);
    });

    it('returns from labels', function () {
      interpreter.runLine('mov eax, 0');
      interpreter.runLine('mov ebx, 0');
      interpreter.runLine('mov ecx, 0');
      interpreter.runLine('int 255');
      interpreter.runLine('jmp start');
      interpreter.runLine('label move:');
      interpreter.runLine('mov eax, 5');
      expect(interpreter.dvm.registers['eax']).to.equal(0);

      interpreter.runLine('ret');
      interpreter.runLine('label start:');
      interpreter.runLine('call move');
      interpreter.runLine('mov ebx, 6');
      expect(interpreter.dvm.registers['ebx']).to.equal(0);

      interpreter.runLine('mov ecx, 7');
      expect(interpreter.dvm.registers['ecx']).to.equal(0);

      interpreter.runLine('int 255');
      expect(interpreter.dvm.registers['eax']).to.equal(5);
      expect(interpreter.dvm.registers['ebx']).to.equal(6);
      expect(interpreter.dvm.registers['ecx']).to.equal(7);
    });

    it('compares values', function () {
      interpreter.runLine('mov eax, 1');
      interpreter.runLine('cmp eax, 0');

      expect(interpreter.dvm.registers.compare_flag).to.equal(1);

      interpreter.runLine('mov eax, 1');
      interpreter.runLine('cmp eax, 2');

      expect(interpreter.dvm.registers.compare_flag).to.equal(-1);

      interpreter.runLine('mov eax, 0');
      interpreter.runLine('cmp eax, 0');

      expect(interpreter.dvm.registers.compare_flag).to.equal(0);

      interpreter.runLine('mov eax, 1');
      interpreter.runLine('mov ebx, 0');
      interpreter.runLine('cmp eax, ebx');

      expect(interpreter.dvm.registers.compare_flag).to.equal(1);

      interpreter.runLine('mov eax, 0');
      interpreter.runLine('mov ebx, 1');
      interpreter.runLine('cmp eax, ebx');

      expect(interpreter.dvm.registers.compare_flag).to.equal(-1);

      interpreter.runLine('mov eax, 0');
      interpreter.runLine('mov ebx, 0');
      interpreter.runLine('cmp eax, ebx');

      expect(interpreter.dvm.registers.compare_flag).to.equal(0);
    });

    it('shifts values', function () {
      interpreter.runLine('mov eax, 0xDEAD');
      interpreter.runLine('shl eax, 0x10');

      expect(interpreter.dvm.registers['eax']).to.equal(0xDEAD0000);

      interpreter.runLine('mov eax, 0xDEAD');
      interpreter.runLine('shr eax, 0x08');

      expect(interpreter.dvm.registers['eax']).to.equal(0xDE);
    });

    it('performs interrupts', function () {
      interpreter.runLine('mov eax, 0xDEAD');
      expect(interpreter.dvm.registers['eax']).to.equal(0xDEAD);

      interpreter.runLine('int 255');
      interpreter.runLine('and eax, 0xFF00');
      expect(interpreter.dvm.registers['eax']).to.equal(0xDEAD);

      interpreter.runLine('int 255');
      expect(interpreter.dvm.registers['eax']).to.equal(0xDE00);

      interpreter.runLine('add eax, 0xAD');
      expect(interpreter.dvm.registers['eax']).to.equal(0xDEAD);
    });

    after(function () {
      interpreter.dvm.stop();
    });
  });

  describe('utility', function () {
    let dvm;

    before(function () {
      dvm = new DVM([]);
      dvm.initialize();
    });

    it('handles jump cases', function () {
      dvm.registers.compare_flag = 0;

      expect(dvm.canJump('jmp')).to.equal(true);
      expect(dvm.canJump('je')).to.equal(true);
      expect(dvm.canJump('jg')).to.equal(false);
      expect(dvm.canJump('jge')).to.equal(true);
      expect(dvm.canJump('jl')).to.equal(false);
      expect(dvm.canJump('jle')).to.equal(true);

      dvm.registers.compare_flag = 1;

      expect(dvm.canJump('jmp')).to.equal(true);
      expect(dvm.canJump('je')).to.equal(false);
      expect(dvm.canJump('jg')).to.equal(true);
      expect(dvm.canJump('jge')).to.equal(true);
      expect(dvm.canJump('jl')).to.equal(false);
      expect(dvm.canJump('jle')).to.equal(false);

      dvm.registers.compare_flag = -1;

      expect(dvm.canJump('jmp')).to.equal(true);
      expect(dvm.canJump('je')).to.equal(false);
      expect(dvm.canJump('jg')).to.equal(false);
      expect(dvm.canJump('jge')).to.equal(false);
      expect(dvm.canJump('jl')).to.equal(true);
      expect(dvm.canJump('jle')).to.equal(true);
    });

    it('handles jump cases', function () {
      dvm.registers.compare_flag = 0;

      expect(dvm.canJump('jmp')).to.equal(true);
      expect(dvm.canJump('je')).to.equal(true);
      expect(dvm.canJump('jg')).to.equal(false);
      expect(dvm.canJump('jge')).to.equal(true);
      expect(dvm.canJump('jl')).to.equal(false);
      expect(dvm.canJump('jle')).to.equal(true);

      dvm.registers.compare_flag = 1;

      expect(dvm.canJump('jmp')).to.equal(true);
      expect(dvm.canJump('je')).to.equal(false);
      expect(dvm.canJump('jg')).to.equal(true);
      expect(dvm.canJump('jge')).to.equal(true);
      expect(dvm.canJump('jl')).to.equal(false);
      expect(dvm.canJump('jle')).to.equal(false);

      dvm.registers.compare_flag = -1;

      expect(dvm.canJump('jmp')).to.equal(true);
      expect(dvm.canJump('je')).to.equal(false);
      expect(dvm.canJump('jg')).to.equal(false);
      expect(dvm.canJump('jge')).to.equal(false);
      expect(dvm.canJump('jl')).to.equal(true);
      expect(dvm.canJump('jle')).to.equal(true);
    });

    it('parses numbers', function () {
      expect(dvm.parseNumber({
        type: 'number',
        children: [{ type: 'HEXNUM', token: '0xFFFFFFFF' }]
      })).to.equal(0xFFFFFFFF);

      expect(dvm.parseNumber({
        type: 'number',
        children: [{ type: 'NUMBER', token: '123' }]
      })).to.equal(123);

      expect(dvm.parseNumber({ type: 'NUMBER', token: '123' })).to.equal(123);

      expect(dvm.parseNumber.bind(dvm, {
        type: 'number',
        children: [{ type: 'HEXNUM', token: '0xFFFFFFFFF' }]
      })).to.throw(`Value too large: ${0xFFFFFFFFF}`);
    });

    it('parses a number of register value', function () {
      expect(dvm.getValue({ type: 'REGISTER', token: 'eax' })).to.equal(0);

      expect(dvm.getValue({
        type: 'number',
        children: [{ type: 'HEXNUM', children: [], token: '0xFF' }],
        token: null
      })).to.equal(0xFF);
    });

    it('parses addresses', function () {
      dvm.registers['eax'] = 0xFF;

      expect(dvm.getBaseAddress({
        type: 'address',
        children: [
          {type: 'TYPE', children: [], token: 'dword'},
          {type: 'LSQUARE', children: [], token: '['},
          {type: 'REGISTER', children: [], token: 'eax'},
          {type: 'RSQUARE', children: [], token: ']'}
        ]
      })).to.equal(0xFF);

      dvm.registers['eax'] = 0xF0;
      expect(dvm.getBaseAddress({
        type: 'address',
        children: [
          {type: 'TYPE', children: [], token: 'dword'},
          {type: 'LSQUARE', children: [], token: '['},
          {type: 'REGISTER', children: [], token: 'eax'},
          {type: 'sum_address', children: [
            {type: 'SUM', children: [], token: '+'},
            {
              type: 'number',
              children: [{ type: 'HEXNUM', children: [], token: '0x0F' }],
              token: null
            }
          ], token: null},
          {type: 'RSQUARE', children: [], token: ']'}
        ]
      })).to.equal(0xFF);
    });

    after(function () {
      dvm.stop();
    });
  });
});

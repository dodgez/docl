const expect = require('chai').expect;
const fs = require('fs');
const lngr = require('lngr');

const DVM = require('./../src/dvm');
const Assemble = require('./../src/assembler');

describe('DVM', function () {
  describe('machine', function () {
    function createDVM(code) {
      let grammar = JSON.parse(fs.readFileSync('./grammar.json', 'utf8'));
      let lexemes = lngr.lexer.formatTokens(grammar.tokens);
      let tokens = lngr.lexer.lex(lexemes, lngr.utils.getStringStream(code));
      let rules = lngr.parser.formatRules(grammar.rules);
      let parsed = lngr.parser.parse(rules, lngr.utils.getTokenStream(tokens));

      let dvm = new DVM(Assemble(parsed.children));
      dvm.initialize();
      return dvm;
    }

    it('stops', function () {
      let dvm = createDVM("hlt\n");
      dvm.runBytes();
    });

    it('jumps', function () {
      let dvm = createDVM(`
      jmp $+0x0C
      hlt
      mov eax, 3
      jmp $-0x10
      mov eax, 2
      hlt\n`);

      dvm.runBytes();
      expect(dvm.registers["eax"]).to.equal(3);

      dvm = createDVM(`
      jmp 0x8000000C
      hlt
      mov eax, 3
      jmp 0x80000008
      mov eax, 2
      hlt\n`);

      dvm.runBytes();
      expect(dvm.registers["eax"]).to.equal(3);

      dvm = createDVM(`
      jmp afterHalt
      lbl beforeHalt:
      hlt
      lbl afterHalt:
      mov eax, 3
      jmp beforeHalt
      mov eax, 2
      hlt\n`);

      dvm.runBytes();
      expect(dvm.registers["eax"]).to.equal(3);
    });

    it('moves numbers', function () {
      let dvm = createDVM(`
      mov eax, 0x01
      mov ebx, eax
      mov dword [eax], eax
      mov ecx, dword [eax]
      hlt\n`);
      dvm.runBytes();

      expect(dvm.registers["eax"]).to.equal(1);
      expect(dvm.registers["ebx"]).to.equal(1);
      expect(dvm.memory.memory[1]).to.deep.equal({ address: 1, data: [0, 0, 0, 1] });
      expect(dvm.registers["ecx"]).to.equal(1);
    });

    it('adds and subtracts numbers', function () {
      let dvm = createDVM(`
      mov eax, 0x01
      add eax, 0x02
      mov ebx, 0x02
      mov ecx, 0x03
      add ebx, ecx
      mov ecx, 0x01
      mov edx, 0xFFFFFFFE
      add ecx, edx
      mov edx, ecx
      add edx, edx
      hlt\n`);
      dvm.runBytes();

      expect(dvm.registers["eax"]).to.equal(3);
      expect(dvm.registers["ebx"]).to.equal(5);
      expect(dvm.registers["ecx"]).to.equal(0xFFFFFFFF);
      expect(dvm.registers["edx"]).to.equal(0xFFFFFFFE);
      expect(dvm.registers.carry_flag).to.equal(1);

      dvm = createDVM(`
      mov eax, 0x02
      sub eax, 0x01
      mov ebx, 0x04
      mov ecx, 0x02
      sub ebx, ecx
      mov edx, 0x02
      sub ecx, edx
      hlt\n`);
      dvm.runBytes();

      expect(dvm.registers["eax"]).to.equal(1);
      expect(dvm.registers["ebx"]).to.equal(2);
      expect(dvm.registers["ecx"]).to.equal(0);
    });

    it('multiplies and divides numbers', function () {
      let dvm = createDVM(`
      mov eax, 0x02
      mul 0x06
      hlt\n`);
      dvm.runBytes();

      expect(dvm.registers["eax"]).to.equal(12);

      dvm = createDVM(`
      mov eax, 0x02
      mov ebx, 0x06
      mul ebx
      hlt\n`);
      dvm.runBytes();

      expect(dvm.registers["eax"]).to.equal(12);

      dvm = createDVM(`
      mov eax, 0xFFFFFFFF
      mov ebx, 0x02
      mul ebx
      hlt\n`);
      dvm.runBytes();

      expect(dvm.registers["eax"]).to.equal(0xFFFFFFFE);
      expect(dvm.registers.carry_flag).to.equal(1);

      dvm = createDVM(`
      mov eax, 0x1F
      div 0x05
      hlt\n`);
      dvm.runBytes();

      expect(dvm.registers["eax"]).to.equal(6);
      expect(dvm.registers["edx"]).to.equal(1);

      dvm = createDVM(`
      mov eax, 0x1F
      mov ebx, 0x05
      div ebx
      hlt\n`);
      dvm.runBytes();

      expect(dvm.registers["eax"]).to.equal(6);
      expect(dvm.registers["edx"]).to.equal(1);
    });

    it('bitwise manipulates', function () {
      let dvm = createDVM(`
      mov eax, 0xFE
      mov ebx, 0x01
      and eax, ebx
      and ebx, 0x21
      hlt\n`);
      dvm.runBytes();

      expect(dvm.registers["eax"]).to.equal(0);
      expect(dvm.registers["ebx"]).to.equal(1);

      dvm = createDVM(`
      mov eax, 0xFE
      mov ebx, 0x01
      or eax, ebx
      or ebx, 0x20
      hlt\n`);
      dvm.runBytes();

      expect(dvm.registers["eax"]).to.equal(0xFF);
      expect(dvm.registers["ebx"]).to.equal(0x21);

      dvm = createDVM(`
      mov eax, 0x3
      mov ebx, 0x2
      xor eax, ebx
      xor ebx, 0x4
      hlt\n`);
      dvm.runBytes();

      expect(dvm.registers["eax"]).to.equal(1);
      expect(dvm.registers["ebx"]).to.equal(6);
    });

    it('negates registers', function () {
      let dvm = createDVM(`
      mov eax, 0xFE
      neg eax
      hlt\n`);
      dvm.runBytes();

      expect(dvm.registers["eax"]).to.equal(0xFFFFFF01);
    });

    it('pushes values', function () {
      let dvm = createDVM(`
      mov eax, 0xDEADBEEF
      push eax
      push 0xDEADBEEF
      hlt\n`);
      dvm.runBytes();

      expect(dvm.registers.getSP()).to.equal(0xFFFFFFFF - 8);
      expect(dvm.memory.memory[1].data).to.deep.equal([0xDE, 0xAD, 0xBE, 0xEF, 0xDE, 0xAD, 0xBE, 0xEF]);
    });

    it('pops values', function () {
      let dvm = createDVM(`
      push 0xDEADBEEF
      pop eax
      hlt\n`);
      dvm.runBytes();

      expect(dvm.registers.getSP()).to.equal(0xFFFFFFFF);
      expect(dvm.registers["eax"]).to.equal(0xDEADBEEF);
    });

    it('calls', function () {
      let dvm = createDVM(`
      mov eax, 0x03
      call $ + 20
      mov eax, 0x02
      hlt\n`);
      dvm.runBytes();

      expect(dvm.registers.getSP()).to.equal(0xFFFFFFFF - 4);
      expect(dvm.registers["eax"]).to.equal(3);
      expect(dvm.memory.readAddress(dvm.registers.getSP(), 'dwrd')).to.equal(0x80000014);
    });

    it('returns', function () {
      let dvm = createDVM(`
      push 0x04
      call double
      pop eax
      mul 2
      jmp done
      lbl double:
        pop ebx
        pop eax
        mul 2
        push eax
        push ebx
        ret
      lbl done:
      hlt\n`);
      dvm.runBytes();

      expect(dvm.registers["eax"]).to.equal(16);

      dvm = createDVM(`
      push 0x04
      call double
      pop eax
      mul 2
      jmp done
      lbl double:
        push ebp
        mov ebp, esp
        mov eax, dword [ebp + 8]
        mul 2
        mov dword [ebp + 8], eax
        pop ebp
        ret
      lbl done:
      hlt\n`);
      dvm.runBytes();

      expect(dvm.registers["eax"]).to.equal(16);
    });

    it('compares values', function () {
      let dvm = createDVM(`
      mov eax, 0x01
      cmp eax, 0x00
      hlt\n`);
      dvm.runBytes();

      expect(dvm.registers.compare_flag).to.equal(1);

      dvm = createDVM(`
      mov eax, 0x01
      cmp eax, 0x02
      hlt\n`);
      dvm.runBytes();

      expect(dvm.registers.compare_flag).to.equal(-1);

      dvm = createDVM(`
      mov eax, 0x01
      cmp eax, 0x01
      hlt\n`);
      dvm.runBytes();

      expect(dvm.registers.compare_flag).to.equal(0);

      dvm = createDVM(`
      mov eax, 0x01
      mov ebx, 0x00
      cmp eax, ebx
      hlt\n`);
      dvm.runBytes();

      expect(dvm.registers.compare_flag).to.equal(1);

      dvm = createDVM(`
      mov eax, 0x01
      mov ebx, 0x02
      cmp eax, ebx
      hlt\n`);
      dvm.runBytes();

      expect(dvm.registers.compare_flag).to.equal(-1);

      dvm = createDVM(`
      mov eax, 0x01
      mov ebx, 0x01
      cmp eax, ebx
      hlt\n`);
      dvm.runBytes();

      expect(dvm.registers.compare_flag).to.equal(0);

      dvm = createDVM(`
      mov eax, 0x01
      mov dword [eax], 0x00
      cmp eax, dword [eax]
      hlt\n`);
      dvm.runBytes();

      expect(dvm.registers.compare_flag).to.equal(1);

      dvm = createDVM(`
      mov eax, 0x01
      mov dword [eax], 0x02
      cmp eax, dword [eax]
      hlt\n`);
      dvm.runBytes();

      expect(dvm.registers.compare_flag).to.equal(-1);

      dvm = createDVM(`
      mov eax, 0x01
      mov dword [eax], 0x01
      cmp eax, dword [eax]
      hlt\n`);
      dvm.runBytes();

      expect(dvm.registers.compare_flag).to.equal(0);
    });

    it('shifts', function () {
      let dvm = createDVM(`
      mov eax, 0x02
      shr eax, 0x01
      hlt\n`);
      dvm.runBytes();

      expect(dvm.registers["eax"]).to.equal(1);

      dvm = createDVM(`
      mov eax, 0x02
      mov ebx, 0x01
      shr eax, ebx
      hlt\n`);
      dvm.runBytes();

      expect(dvm.registers["eax"]).to.equal(1);

      dvm = createDVM(`
      mov eax, 0x02
      shl eax, 0x01
      hlt\n`);
      dvm.runBytes();

      expect(dvm.registers["eax"]).to.equal(4);

      dvm = createDVM(`
      mov eax, 0x02
      mov ebx, 0x01
      shl eax, ebx
      hlt\n`);
      dvm.runBytes();

      expect(dvm.registers["eax"]).to.equal(4);
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
  });
});

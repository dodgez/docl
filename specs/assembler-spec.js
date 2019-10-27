const expect = require('chai').expect;
const fs = require('fs');
const lngr = require('lngr');

const Assemble = require('./../src/assembler');

describe('Assembler', function () {
  describe('assembles', function () {
    let lexemes;
    let rules;

    before(function () {
      let grammar = JSON.parse(fs.readFileSync('./grammar.json', 'utf8'));
      lexemes = lngr.lexer.formatTokens(grammar.tokens);
      rules = lngr.parser.formatRules(grammar.rules);
    })

    function parseCode(code) {
      let tokens = lngr.lexer.lex(lexemes, lngr.utils.getStringStream(code));
      return lngr.parser.parse(rules, lngr.utils.getTokenStream(tokens)).children;
    }

    it('jumps', function () {
      let code = parseCode(`
        jmp $
      `);

      expect(Assemble(code, false)).to.deep.equal([`jmp ${0x80000000}`]);

      code = parseCode(`
        jmp $-1
      `);

      expect(Assemble(code, false)).to.deep.equal([`jmp ${0x7FFFFFFF}`]);

      code = parseCode(`
        jmp 0x80000000
      `);

      expect(Assemble(code, false)).to.deep.equal([`jmp ${0x80000000}`]);
    });

    it('labels and jumps', function () {
      let code = parseCode(`
        jmp test
        lbl test:
      `);

      expect(Assemble(code, false)).to.deep.equal([`jmp ${0x80000008}`]);
    });

    it('moves', function () {
      let code = parseCode(`
        mov eax, 0x00
        mov eax, ebx
        mov eax, dword [eax]
        mov dword [eax], 0x00
        mov dword [eax], eax
      `);

      expect(Assemble(code, false)).to.deep.equal([
        'mrv eax 0',
        'mrvr eax ebx',
        'mrva eax dwrd eax',
        'mav dwrd eax 0',
        'mavr dwrd eax eax',
      ]);
    });

    it('summations', function () {
      let code = parseCode(`
        add eax, 0x00
        add eax, ebx
        sub eax, 0x00
        sub eax, ebx
      `);

      expect(Assemble(code, false)).to.deep.equal([
        'add eax 0',
        'addr eax ebx',
        'sub eax 0',
        'subr eax ebx'
      ]);
    });

    it('multiplications', function () {
      let code = parseCode(`
        mul 0x00
        mul ebx
        div 0x00
        div ebx
      `);

      expect(Assemble(code, false)).to.deep.equal([
        'mul 0',
        'mulr ebx',
        'div 0',
        'divr ebx'
      ]);
    });

    it('bitwise', function () {
      let code = parseCode(`
        and eax, 0
        and eax, ebx
        or eax, 0
        or eax, ebx
        xor eax, 0
        xor eax, ebx
      `);

      expect(Assemble(code, false)).to.deep.equal([
        'and eax 0',
        'andr eax ebx',
        'or eax 0',
        'orr eax ebx',
        'xor eax 0',
        'xorr eax ebx',
      ]);
    });

    it('negate', function () {
      let code = parseCode(`
        neg eax
      `);

      expect(Assemble(code, false)).to.deep.equal([
        'neg eax'
      ]);
    });

    it('pushes', function () {
      let code = parseCode(`
        push 0
        push eax
      `);

      expect(Assemble(code, false)).to.deep.equal([
        'psh 0',
        'pshr eax'
      ]);
    });

    it('pops', function () {
      let code = parseCode(`
        pop eax
      `);

      expect(Assemble(code, false)).to.deep.equal([
        'pop eax'
      ]);
    });

    it('calls', function () {
      let code = parseCode(`
        call $
      `);

      expect(Assemble(code, false)).to.deep.equal([`call ${0x80000000}`]);

      code = parseCode(`
        call $-1
      `);

      expect(Assemble(code, false)).to.deep.equal([`call ${0x7FFFFFFF}`]);

      code = parseCode(`
        call 0x80000000
      `);

      expect(Assemble(code, false)).to.deep.equal([`call ${0x80000000}`]);
    });

    it('labels and calls', function () {
      let code = parseCode(`
        call test
        lbl test:
      `);

      expect(Assemble(code, false)).to.deep.equal([`call ${0x80000008}`]);
    });

    it('returns', function () {
      let code = parseCode(`
        ret
      `);

      expect(Assemble(code, false)).to.deep.equal([
        'ret'
      ]);
    });

    it('compares', function () {
      let code = parseCode(`
        cmp eax, 0
        cmp eax, ebx
        cmp eax, dword [eax]
      `);

      expect(Assemble(code, false)).to.deep.equal([
        'cmp eax 0',
        'cmpr eax ebx',
        'cmpa eax dwrd eax'
      ]);
    });

    it('shifts', function () {
      let code = parseCode(`
        shr eax, 0
        shr eax, ebx
        shl eax, 0
        shl eax, ebx
      `);

      expect(Assemble(code, false)).to.deep.equal([
        'shr eax 0',
        'shrr eax ebx',
        'shl eax 0',
        'shlr eax ebx'
      ]);
    });

    it('interrupts', function () {
      let code = parseCode(`
        int 0
      `);

      expect(Assemble(code, false)).to.deep.equal([
        'int 0'
      ]);
    });

    it('nops', function () {
      let code = parseCode(`
        nop
      `);

      expect(Assemble(code, false)).to.deep.equal([
        'nop'
      ]);
    });

    it('hlts', function () {
      let code = parseCode(`
        hlt
      `);

      expect(Assemble(code, false)).to.deep.equal([
        'hlt'
      ]);
    });

    it('complicated moves', function () {
      let code = parseCode(`
        mov eax, dword [eax + 8]
        mov dword [eax + 8], 0
        mov dword [eax + 8], eax
      `);

      expect(Assemble(code, false)).to.deep.equal([
        'pshr eax',
        'add eax 8',
        'mrva eax dwrd eax',
        'pop eax',
        'pshr eax',
        'add eax 8',
        'mav dwrd eax 0',
        'pop eax',
        'pshr eax',
        'add eax 8',
        'mavr dwrd eax eax',
        'pop eax'
      ]);
    });
  });
});

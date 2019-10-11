const lngr = require('lngr');
const readline = require('readline');

const VM = require('./vm');

class Interpreter {
  constructor(initial_code, lexemes, rules) {
    this.vm = new VM(initial_code);
    this.lexemes = lexemes;
    this.rules = rules;
    this.running = true;
    this.last_run_line = 0;
  }

  start() {
    this.vm.initialize();
    this.vm.createLabels();
    this.vm.run();
    this.last_run_line = this.vm.code.length;

    let rl = readline.createInterface({
      input: process.stdin,
      output: process.stdout
    });

    rl.prompt();

    let tokens;
    let parsed;
    let run_line;
    rl.on('line', line => {
      line += '\n';
      run_line = true;
      try {
        tokens = lngr.lexer.lex(this.lexemes, lngr.utils.getStringStream(line));
        parsed = this.rules[1].parse(lngr.utils.getTokenStream(tokens));

        if (parsed.children[0].type == 'interrupt') {
          switch (this.vm.parseNumber(parsed.children[0].children[1])) {
            case 255:
              this.running = !this.running;
              run_line = false;
              if (this.running) {
                this.vm.run(this.last_run_line);
              }
              this.last_run_line = this.vm.code.length;
          }
        }
      } catch (e) {
        console.error(e);
        run_line = false;
      }
      if (run_line) {
        this.vm.code.push(parsed);

        if (this.running) {
          this.vm.run(this.last_run_line);
          this.last_run_line++;
        }
      }
      rl.prompt();
    }).on('SIGINT', () => {
      console.log("^C");
      this.vm.stop();
      process.exit(0)
    });
  }
}

module.exports = Interpreter;

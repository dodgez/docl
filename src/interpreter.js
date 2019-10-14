const lngr = require('lngr');
const readline = require('readline');

const DVM = require('./dvm');

class Interpreter {
  constructor(initial_code, lexemes, rules) {
    this.dvm = new DVM(initial_code);
    this.lexemes = lexemes;
    this.rules = rules;
  }

  reset() {
    this.dvm.reset();
    this.running = true;
    this.last_run_line = this.dvm.code.length;
  }

  runLine(line) {
    let parsed;
    let run_line = true;

    line += '\n';
    try {
      let tokens = lngr.lexer.lex(this.lexemes, lngr.utils.getStringStream(line));
      parsed = this.rules[1].parse(lngr.utils.getTokenStream(tokens));

      if (parsed.children[0].type == 'interrupt') {
        switch (this.dvm.parseNumber(parsed.children[0].children[1])) {
          case 255:
            this.running = !this.running;
            run_line = false;
            if (this.running) {
              this.dvm.run(this.last_run_line);
            }
            this.last_run_line = this.dvm.code.length;
        }
      }
    } catch (e) {
      console.error(e);
      run_line = false;
    }

    if (run_line) {
      this.dvm.code.push(parsed);

      if (this.running) {
        this.dvm.run(this.last_run_line);
        this.last_run_line++;
      }
    }
  }

  startDVM() {
    this.dvm.initialize();
    this.dvm.createLabels();
    this.dvm.run();
    this.last_run_line = this.dvm.code.length;
    this.running = true;
  }

  startListening() {
    let rl = readline.createInterface({
      input: process.stdin,
      output: process.stdout
    });

    rl.prompt();

    rl.on('line', line => {
      this.runLine(line);
      rl.prompt();
    }).on('SIGINT', () => {
      console.log("^C");
      this.dvm.stop();
      process.exit(0)
    });
  }
}

module.exports = Interpreter;

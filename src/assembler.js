function assemble(nodes) {
  let start_address = 0x80000000;
  let labels = {};

  for (let index = 0; index < nodes.length; ++index) {
    let line = nodes[index];
    if (line.type == "EOL") continue;
    let node = line.children[0];
    if (node.type == "label") {
      labels[node.children[1].token] = start_address + index;
    }
  }

  let code = [];
  for (let index = 0; index < nodes.length; ++index) {
    let line = nodes[index];
    if (line.type == "EOL") continue;
    let node = line.children[0];
    let op;
    let address;
    switch (node.type) {
      case "label":
        break;
      case "jump":
        switch (node.children[1].type) {
          case "ID":
            address = labels[node.children[1].token];
            break;
          case "number":
            address = parseNumber(node.children[1]);
            break;
          case "relative_jump":
            let jump = node.children[1];
            let rel = 0;
            if (jump.children.length > 1) {
              let sum_address = jump.children[1];
              rel = parseNumber(sum_address.children[1]);
              if (sum_address.children[0].token == "-") rel = -rel;
            }
            address = start_address + index + rel;
            break;
        }
        code.push([node.children[0].token, address]);
        break;
      case "move":
        let dest = node.children[1];
        let source = node.children[3];
        let source_val;

        switch (source.type) {
          case "REGISTER":
            source_val = source.token;
            break;
          case "number":
            source_val = parseNumber(source);
            break;
          case "address":
            let source_register = source.children[2].token;
            if (source.children.length > 4) {
              code.push(["push", source_register]);
              let add = source.children[3].children[0].token == "+";
              let num = parseNumber(source.children[3].children[1]);

              if (add) {
                code.push(["add", source_register, num]);
              } else {
                code.push(["sub", source_register, num]);
              }

              source_val = [source.children[0].token, source_register];
            }
            break;
        }
        switch (dest.type) {
          case "REGISTER":
            if (source.type == "address") {
              code.push(["mrva", dest.token, source_val[0], source_val[1]]);
            } else if (source.type == "number") {
              code.push(["mrv", dest.token, source_val]);
            } else if (source.type == "REGISTER") {
              code.push(["mrvr", dest.token, source_val]);
            }
            break;
          case "address":
            let dest_register = dest.children[2].token;
            if (dest.children.length > 4) {
              code.push(["push", dest_register]);
              let add = dest.children[3].children[0].token == "+";
              let num = parseNumber(dest.children[3].children[1]);

              if (add) {
                code.push(["add", dest_register, num]);
              } else {
                code.push(["sub", dest_register, num]);
              }
            }

            if (source.type == "addressa") {
              throw new Error("Cannot move address to address");
            } else if (source.type == "number") {
              code.push(["mav", dest.children[0].token, dest_register, source_val])
            } else if (source.type == "REGISTER") {
              code.push(["mavr", dest.children[0].token, dest_register, source_val])
            }

            if (dest.children.length > 4) code.push(["pop", dest_register]);
            break;
        }
        if (source.type == "address" && source.children.length > 4) { code.push(["pop", source.children[2].token]); }
        break;
      case "summation":
        op = node.children[0];
        if (node.children[3].type == "REGISTER") {
          code.push([`${op.token}r`, node.children[1].token, node.children[3].token]);
        } else {
          code.push([op.token, node.children[1].token, parseNumber(node.children[3])]);
        }
        break;
      case "multiply":
        op = node.children[0];
        if (node.children[1].type == "REGISTER") {
          code.push([`${op.token}r`, node.children[1].token]);
        } else {
          code.push([op.token, parseNumber(node.children[1])]);
        }
        break;
      case "bitwise":
        op = node.children[0];
        if (node.children[3].type == "REGISTER") {
          code.push([`${op.token}r`, node.children[1].token, node.children[3].token]);
        } else {
          code.push([op.token, node.children[1].token, parseNumber(node.children[3])]);
        }
        break;
      case "negate":
        code.push([node.children[0].token, node.children[1].token]);
        break;
      case "push":
        if (node.children[1].type == "REGISTER") {
          code.push(["pshr", node.children[1].token]);
        } else {
          code.push(["pshn", parseNumber(node.children[1])]);
        }
        break;
      case "pop":
        code.push([node.children[0].token, node.children[1].token]);
        break;
      case "call":
        switch (node.children[1].type) {
          case "ID":
            address = labels[node.children[1].token];
            break;
          case "number":
            address = parseNumber(node.children[1]);
            break;
          case "relative_jump":
            let jump = node.children[1];
            let rel = 0;
            if (jump.children.length > 1) {
              let sum_address = jump.children[1];
              rel = parseNumber(sum_address.children[1]);
              if (sum_address.children[0].token == "-") rel = -rel;
            }
            address = start_address + index + rel;
            break;
        }
        code.push([node.children[0].token, address]);
        break;
      case "RET":
        code.push([node.token]);
        break;
      case "compare":
        switch (node.children[3].type) {
          case "REGISTER":
            code.push([`${node.children[0].token}r`, node.children[1].token, node.children[3].token]);
            break;
          case "number":
            code.push([`${node.children[0].token}`, node.children[1].token, parseNumber(node.children[3])]);
            break;
          case "address":
            let address_part = node.children[3];
            let register = address_part.children[2].token;
            if (address_part.children.length > 4) {
              code.push(["pshr", register]);
              let add = address_part.children[3].children[0].token == "+";
              let num = parseNumber(address_part.children[3].children[1]);

              if (add) {
                code.push(["add", register, num]);
              } else {
                code.push(["sub", register, num]);
              }
            }

            code.push([`${node.children[0].token}a`, node.children[1].token, address_part.children[0].token, register])

            if (address_part.children.length > 4) code.push(["pop", register]);
            break;
        }
        break;
      case "shift":
        op = node.children[0];
        if (node.children[3].type == "REGISTER") {
          code.push([`${op.token}r`, node.children[1].token, node.children[3].token]);
        } else {
          code.push([op.token, node.children[1].token, parseNumber(node.children[3])]);
        }
        break;
      case "interrupt":
        code.push([node.children[0].token, parseNumber(node.children[1])]);
        break;
      case "NOP":
        code.push([node.children[0].token]);
        break;
      default:
        throw new Error(`Unknown statement: ${node}`);
    }
  }

  return getCodeBytes(code);
}

function getCodeBytes(code) {
  let bytes = [];

  for (let line of code) {
    for (let piece of line) {
      switch (typeof (piece)) {
        case "string":
          bytes.push(piece.charCodeAt(0));
          bytes.push(piece.charCodeAt(1));
          bytes.push(piece.charCodeAt(2));
          bytes.push(piece.charCodeAt(3) ? piece.charCodeAt(3) : 0);
          break;
        case "number":
          bytes.push((piece & 0xFF000000) >>> 24);
          bytes.push((piece & 0xFF0000) >>> 16);
          bytes.push((piece & 0xFF00) >>> 8);
          bytes.push((piece & 0xFF) >>> 0);
          break;
      }
    }
  }

  return bytes;
}

function parseNumber(number) {
  let value;

  if (number.type == "number") {
    if (number.children[0].type == "HEXNUM") {
      value = parseInt(number.children[0].token);
    } else {
      value = parseNumber(number.children[0]);
    }
  } else {
    value = parseInt(number.token);
  }

  if (value > 0xFFFFFFFF) throw new Error(`Value too large: ${value}`);
  return value;
}

module.exports = assemble;

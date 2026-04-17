/**
 * components/blocks.js
 * Define os blocos customizados do Bloquin para ESP32
 * e o gerador de código Arduino/C++.
 *
 * NOTA: Este arquivo define um conjunto representativo de blocos.
 * Para migrar blocos do Bloquin desktop, adicione as definições
 * Blockly.Blocks['nome'] e BloquinGenerator['nome'] seguindo
 * o mesmo padrão abaixo.
 */

/* global Blockly */

// ── Gerador base ────────────────────────────────────────────────────────────
// Estende o gerador JavaScript apenas para ter infraestrutura pronta.
// No futuro pode-se criar um gerador dedicado (ArduinoGenerator).
export const BloquinGenerator = new Blockly.Generator('Arduino');

BloquinGenerator.INDENT = '  ';

// Precedências
BloquinGenerator.ORDER_ATOMIC       = 0;
BloquinGenerator.ORDER_NONE         = 99;

// Caracteres reservados (evita conflitos com variáveis)
BloquinGenerator.addReservedWords(
  'setup,loop,void,int,float,bool,String,HIGH,LOW,INPUT,OUTPUT,INPUT_PULLUP,' +
  'pinMode,digitalWrite,digitalRead,analogWrite,analogRead,delay,millis,' +
  'Serial,true,false'
);

/**
 * Gera o código completo do sketch Arduino a partir do workspace.
 * Insere automaticamente os headers necessários e a estrutura setup/loop.
 */
BloquinGenerator.workspaceToCode = function(workspace) {
  this.init(workspace);

  const allBlocks = workspace.getTopBlocks(true);
  let setupCode = '';
  let loopCode  = '';
  let globalCode = '';

  for (const block of allBlocks) {
    if (block.type === 'blq_setup_loop') {
      setupCode  = this.statementToCode(block, 'SETUP')  || '';
      loopCode   = this.statementToCode(block, 'LOOP')   || '';
    } else {
      // Blocos soltos fora do setup/loop — ignorar com aviso
      console.warn('[Bloquin] Bloco fora do setup/loop ignorado:', block.type);
    }
  }

  // Headers — determinados pelos blocos presentes
  const headers = ['#include <Arduino.h>'];
  if (this._needsSerial) headers.push('// Serial já incluído no Arduino.h');

  return [
    headers.join('\n'),
    '',
    globalCode,
    'void setup() {',
    setupCode || '  // setup vazio',
    '}',
    '',
    'void loop() {',
    loopCode  || '  // loop vazio',
    '}',
  ].join('\n');
};

BloquinGenerator.init = function(workspace) {
  this._needsSerial = false;
  if (!this.nameDB_) {
    this.nameDB_ = new Blockly.Names(this.RESERVED_WORDS_);
  }
  this.nameDB_.reset();
  this.nameDB_.setVariableMap(workspace.getVariableMap());
};

BloquinGenerator.finish = function(code) { return code; };

BloquinGenerator.scrubNakedValue = function(line) {
  return line + ';\n';
};

BloquinGenerator.scrub_ = function(block, code) {
  const next = block.nextConnection && block.nextConnection.targetBlock();
  return code + (next ? BloquinGenerator.blockToCode(next) : '');
};

// ── Bloco: setup + loop ─────────────────────────────────────────────────────
Blockly.Blocks['blq_setup_loop'] = {
  init() {
    this.appendStatementInput('SETUP')
      .setCheck(null)
      .appendField('⚙ Setup');
    this.appendStatementInput('LOOP')
      .setCheck(null)
      .appendField('🔁 Loop');
    this.setColour(60);
    this.setTooltip('Bloco principal do programa. Setup executa uma vez; Loop repete indefinidamente.');
    this.setDeletable(false);
    this.setMovable(true);
  }
};
BloquinGenerator['blq_setup_loop'] = function(block) {
  // Tratado especialmente no workspaceToCode — não gera código diretamente
  return '';
};

// ── Bloco: delay ────────────────────────────────────────────────────────────
Blockly.Blocks['blq_delay'] = {
  init() {
    this.appendValueInput('MS')
      .setCheck('Number')
      .appendField('aguardar');
    this.appendDummyInput().appendField('ms');
    this.setInputsInline(true);
    this.setPreviousStatement(true, null);
    this.setNextStatement(true, null);
    this.setColour(260);
    this.setTooltip('Pausa a execução pelo número de milissegundos indicado.');
  }
};
BloquinGenerator['blq_delay'] = function(block) {
  const ms = BloquinGenerator.valueToCode(block, 'MS', BloquinGenerator.ORDER_NONE) || '0';
  return `delay(${ms});\n`;
};

// ── Bloco: pinMode ──────────────────────────────────────────────────────────
Blockly.Blocks['blq_pin_mode'] = {
  init() {
    this.appendDummyInput()
      .appendField('pino')
      .appendField(new Blockly.FieldNumber(2, 0, 39), 'PIN')
      .appendField('modo')
      .appendField(new Blockly.FieldDropdown([
        ['Saída',  'OUTPUT'],
        ['Entrada', 'INPUT'],
        ['Entrada Pull-up', 'INPUT_PULLUP'],
      ]), 'MODE');
    this.setPreviousStatement(true, null);
    this.setNextStatement(true, null);
    this.setColour(210);
    this.setTooltip('Configura o modo de um pino GPIO.');
  }
};
BloquinGenerator['blq_pin_mode'] = function(block) {
  const pin  = block.getFieldValue('PIN');
  const mode = block.getFieldValue('MODE');
  return `pinMode(${pin}, ${mode});\n`;
};

// ── Bloco: digitalWrite ─────────────────────────────────────────────────────
Blockly.Blocks['blq_digital_write'] = {
  init() {
    this.appendDummyInput()
      .appendField('escrever no pino')
      .appendField(new Blockly.FieldNumber(2, 0, 39), 'PIN')
      .appendField(new Blockly.FieldDropdown([
        ['HIGH (1)', 'HIGH'],
        ['LOW (0)',  'LOW'],
      ]), 'VALUE');
    this.setPreviousStatement(true, null);
    this.setNextStatement(true, null);
    this.setColour(210);
    this.setTooltip('Escreve HIGH ou LOW em um pino digital.');
  }
};
BloquinGenerator['blq_digital_write'] = function(block) {
  const pin = block.getFieldValue('PIN');
  const val = block.getFieldValue('VALUE');
  return `digitalWrite(${pin}, ${val});\n`;
};

// ── Bloco: digitalRead ──────────────────────────────────────────────────────
Blockly.Blocks['blq_digital_read'] = {
  init() {
    this.appendDummyInput()
      .appendField('ler pino digital')
      .appendField(new Blockly.FieldNumber(2, 0, 39), 'PIN');
    this.setOutput(true, 'Number');
    this.setColour(210);
    this.setTooltip('Lê o valor (0 ou 1) de um pino digital.');
  }
};
BloquinGenerator['blq_digital_read'] = function(block) {
  const pin = block.getFieldValue('PIN');
  return [`digitalRead(${pin})`, BloquinGenerator.ORDER_ATOMIC];
};

// ── Bloco: Serial.begin ─────────────────────────────────────────────────────
Blockly.Blocks['blq_serial_begin'] = {
  init() {
    this.appendDummyInput()
      .appendField('iniciar Serial')
      .appendField(new Blockly.FieldDropdown([
        ['9600',   '9600'],
        ['115200', '115200'],
      ]), 'BAUD');
    this.setPreviousStatement(true, null);
    this.setNextStatement(true, null);
    this.setColour(120);
    this.setTooltip('Inicializa a comunicação serial.');
  }
};
BloquinGenerator['blq_serial_begin'] = function(block) {
  BloquinGenerator._needsSerial = true;
  return `Serial.begin(${block.getFieldValue('BAUD')});\n`;
};

// ── Bloco: Serial.print ─────────────────────────────────────────────────────
Blockly.Blocks['blq_serial_print'] = {
  init() {
    this.appendValueInput('TEXT')
      .setCheck(null)
      .appendField('imprimir no Serial');
    this.appendDummyInput()
      .appendField(new Blockly.FieldDropdown([
        ['com quebra de linha', 'println'],
        ['sem quebra de linha', 'print'],
      ]), 'MODE');
    this.setPreviousStatement(true, null);
    this.setNextStatement(true, null);
    this.setColour(120);
    this.setTooltip('Envia texto pela porta serial.');
  }
};
BloquinGenerator['blq_serial_print'] = function(block) {
  BloquinGenerator._needsSerial = true;
  const text = BloquinGenerator.valueToCode(block, 'TEXT', BloquinGenerator.ORDER_NONE) || '""';
  const mode = block.getFieldValue('MODE');
  return `Serial.${mode}(${text});\n`;
};

// ── Blocos padrão Blockly usados na toolbox ──────────────────────────────────
// math_number
BloquinGenerator['math_number'] = function(block) {
  const num = parseFloat(block.getFieldValue('NUM')) || 0;
  return [String(num), BloquinGenerator.ORDER_ATOMIC];
};

// math_arithmetic
BloquinGenerator['math_arithmetic'] = function(block) {
  const ops = { ADD: [' + ', 6], MINUS: [' - ', 6], MULTIPLY: [' * ', 5], DIVIDE: [' / ', 5] };
  const [op, order] = ops[block.getFieldValue('OP')] || [' + ', 6];
  const a = BloquinGenerator.valueToCode(block, 'A', order) || '0';
  const b = BloquinGenerator.valueToCode(block, 'B', order) || '0';
  return [`${a}${op}${b}`, order];
};

// logic_compare
BloquinGenerator['logic_compare'] = function(block) {
  const ops = { EQ: '==', NEQ: '!=', LT: '<', LTE: '<=', GT: '>', GTE: '>=' };
  const op = ops[block.getFieldValue('OP')] || '==';
  const a  = BloquinGenerator.valueToCode(block, 'A', BloquinGenerator.ORDER_NONE) || '0';
  const b  = BloquinGenerator.valueToCode(block, 'B', BloquinGenerator.ORDER_NONE) || '0';
  return [`${a} ${op} ${b}`, BloquinGenerator.ORDER_NONE];
};

// logic_boolean
BloquinGenerator['logic_boolean'] = function(block) {
  return [block.getFieldValue('BOOL') === 'TRUE' ? 'true' : 'false', BloquinGenerator.ORDER_ATOMIC];
};

// controls_if
BloquinGenerator['controls_if'] = function(block) {
  let code = '';
  for (let i = 0; block.getInput('IF' + i); i++) {
    const cond = BloquinGenerator.valueToCode(block, 'IF' + i, BloquinGenerator.ORDER_NONE) || 'false';
    const body = BloquinGenerator.statementToCode(block, 'DO' + i) || '';
    code += (i === 0 ? 'if' : ' else if') + ` (${cond}) {\n${body}}`;
  }
  if (block.getInput('ELSE')) {
    code += ` else {\n${BloquinGenerator.statementToCode(block, 'ELSE') || ''}}`;
  }
  return code + '\n';
};

// controls_repeat_ext
BloquinGenerator['controls_repeat_ext'] = function(block) {
  const times = BloquinGenerator.valueToCode(block, 'TIMES', BloquinGenerator.ORDER_NONE) || '0';
  const body  = BloquinGenerator.statementToCode(block, 'DO') || '';
  return `for (int _i = 0; _i < ${times}; _i++) {\n${body}}\n`;
};

// controls_whileUntil
BloquinGenerator['controls_whileUntil'] = function(block) {
  const cond  = BloquinGenerator.valueToCode(block, 'BOOL', BloquinGenerator.ORDER_NONE) || 'false';
  const body  = BloquinGenerator.statementToCode(block, 'DO') || '';
  const invert = block.getFieldValue('MODE') === 'UNTIL';
  return `while (${invert ? '!' : ''}(${cond})) {\n${body}}\n`;
};

// text
BloquinGenerator['text'] = function(block) {
  const txt = block.getFieldValue('TEXT').replace(/\\/g, '\\\\').replace(/"/g, '\\"');
  return [`"${txt}"`, BloquinGenerator.ORDER_ATOMIC];
};

// text_join
BloquinGenerator['text_join'] = function(block) {
  const parts = [];
  for (let i = 0; i < block.itemCount_; i++) {
    parts.push(BloquinGenerator.valueToCode(block, 'ADD' + i, BloquinGenerator.ORDER_NONE) || '""');
  }
  return [parts.join(' + '), BloquinGenerator.ORDER_NONE];
};

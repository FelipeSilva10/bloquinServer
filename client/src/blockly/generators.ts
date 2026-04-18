import * as Blockly from 'blockly/core';

export const cppGenerator = new Blockly.Generator('CPP');

export function initGenerators() {
  cppGenerator.scrub_ = function(block, code, opt_thisOnly) {
    const nextBlock = block.nextConnection && block.nextConnection.targetBlock();
    const nextCode = opt_thisOnly ? '' : cppGenerator.blockToCode(nextBlock);
    return code + nextCode;
  };

  // Estrutura
  cppGenerator.forBlock['bloco_setup'] = (b: Blockly.Block) => `void setup() {\n  Serial.begin(115200);\n${cppGenerator.statementToCode(b,'DO')||'  // setup...\n'}}\n\n`;
  cppGenerator.forBlock['bloco_loop']  = (b: Blockly.Block) => `void loop() {\n${cppGenerator.statementToCode(b,'DO')||'  // loop...\n'}}\n\n`;

  // Pinos
  cppGenerator.forBlock['configurar_pino']   = (b: Blockly.Block) => `  pinMode(${b.getFieldValue('PIN')}, ${b.getFieldValue('MODE')});\n`;
  cppGenerator.forBlock['escrever_pino']     = (b: Blockly.Block) => `  digitalWrite(${b.getFieldValue('PIN')}, ${b.getFieldValue('STATE')});\n`;
  cppGenerator.forBlock['ler_pino_digital']  = (b: Blockly.Block) => [`digitalRead(${b.getFieldValue('PIN')})`, 0];
  cppGenerator.forBlock['escrever_pino_pwm'] = (b: Blockly.Block) => `  analogWrite(${b.getFieldValue('PIN')}, ${cppGenerator.valueToCode(b,'VALOR',99)||'0'});\n`;
  cppGenerator.forBlock['ler_pino_analogico']= (b: Blockly.Block) => [`analogRead(${b.getFieldValue('PIN')})`, 0];

  // Controle
  cppGenerator.forBlock['esperar']        = (b: Blockly.Block) => `  delay(${b.getFieldValue('TIME')});\n`;
  cppGenerator.forBlock['parar_repeticao']= (_b: Blockly.Block) => `  break;\n`;
  cppGenerator.forBlock['repetir_vezes']  = (b: Blockly.Block) => {
    if (!cppGenerator.nameDB_) cppGenerator.nameDB_ = new Blockly.Names((cppGenerator as unknown as {RESERVED_WORDS_: string}).RESERVED_WORDS_);
    const v = cppGenerator.nameDB_.getDistinctName('i', Blockly.Names.NameType.VARIABLE);
    return `  for (int ${v} = 0; ${v} < ${b.getFieldValue('TIMES')}; ${v}++) {\n${cppGenerator.statementToCode(b,'DO')||''}  }\n`;
  };
  cppGenerator.forBlock['a_cada_x_ms'] = (b: Blockly.Block) => {
    if (!cppGenerator.nameDB_) cppGenerator.nameDB_ = new Blockly.Names((cppGenerator as unknown as {RESERVED_WORDS_: string}).RESERVED_WORDS_);
    const t = cppGenerator.nameDB_.getDistinctName('timer', Blockly.Names.NameType.VARIABLE);
    return `  static unsigned long ${t} = 0;\n  if (millis() - ${t} >= ${b.getFieldValue('MS')}) {\n    ${t} = millis();\n${cppGenerator.statementToCode(b,'DO')||''}  }\n`;
  };
  cppGenerator.forBlock['enquanto_verdadeiro'] = (b: Blockly.Block) => `  while (${cppGenerator.valueToCode(b,'CONDICAO',0)||'false'}) {\n${cppGenerator.statementToCode(b,'DO')||''}  }\n`;

  // Condições
  cppGenerator.forBlock['se_entao']       = (b: Blockly.Block) => `  if (${cppGenerator.valueToCode(b,'CONDICAO',0)||'false'}) {\n${cppGenerator.statementToCode(b,'ENTAO')||''}  }\n`;
  cppGenerator.forBlock['se_entao_senao'] = (b: Blockly.Block) => `  if (${cppGenerator.valueToCode(b,'CONDICAO',0)||'false'}) {\n${cppGenerator.statementToCode(b,'ENTAO')||''}  } else {\n${cppGenerator.statementToCode(b,'SENAO')||''}  }\n`;
  cppGenerator.forBlock['comparar_valores']    = (b: Blockly.Block) => [`(${cppGenerator.valueToCode(b,'A',0)||'0'} ${b.getFieldValue('OP')} ${cppGenerator.valueToCode(b,'B',0)||'0'})`, 0];
  cppGenerator.forBlock['e_ou_logico']         = (b: Blockly.Block) => [`(${cppGenerator.valueToCode(b,'A',0)||'false'} ${b.getFieldValue('OP')} ${cppGenerator.valueToCode(b,'B',0)||'false'})`, 0];
  cppGenerator.forBlock['nao_logico']          = (b: Blockly.Block) => [`!(${cppGenerator.valueToCode(b,'VALOR',0)||'false'})`, 0];
  cppGenerator.forBlock['valor_booleano_fixo'] = (b: Blockly.Block) => [b.getFieldValue('VALOR'), 0];

  // Matemática
  cppGenerator.forBlock['numero_fixo']         = (b: Blockly.Block) => [b.getFieldValue('VALOR'), 0];
  cppGenerator.forBlock['operacao_matematica'] = (b: Blockly.Block) => [`(${cppGenerator.valueToCode(b,'A',99)||'0'} ${b.getFieldValue('OP')} ${cppGenerator.valueToCode(b,'B',99)||'0'})`, 0];
  cppGenerator.forBlock['mapear_valor']        = (b: Blockly.Block) => [`map(${cppGenerator.valueToCode(b,'VALOR',99)||'0'}, ${b.getFieldValue('DE_MIN')}, ${b.getFieldValue('DE_MAX')}, ${b.getFieldValue('PARA_MIN')}, ${b.getFieldValue('PARA_MAX')})`, 0];
  cppGenerator.forBlock['constrain_valor']     = (b: Blockly.Block) => [`constrain(${cppGenerator.valueToCode(b,'VALOR',99)||'0'}, ${b.getFieldValue('MIN')}, ${b.getFieldValue('MAX')})`, 0];
  cppGenerator.forBlock['random_valor']        = (b: Blockly.Block) => [`random(${b.getFieldValue('MIN')}, ${b.getFieldValue('MAX')})`, 0];
  cppGenerator.forBlock['millis_atual']        = (_b: Blockly.Block) => [`millis()`, 0];

  // Variáveis
  cppGenerator.forBlock['declarar_variavel_global'] = (b: Blockly.Block) => `${b.getFieldValue('TIPO')} ${(b.getFieldValue('NOME')||'minha_var').replace(/\s+/g,'_')} = ${cppGenerator.valueToCode(b,'VALOR',99)||'0'};\n`;
  cppGenerator.forBlock['atribuir_variavel']        = (b: Blockly.Block) => `  ${(b.getFieldValue('NOME')||'minha_var').replace(/\s+/g,'_')} = ${cppGenerator.valueToCode(b,'VALOR',99)||'0'};\n`;
  cppGenerator.forBlock['ler_variavel']             = (b: Blockly.Block) => [(b.getFieldValue('NOME')||'minha_var').replace(/\s+/g,'_'), 0];
  cppGenerator.forBlock['incrementar_variavel']     = (b: Blockly.Block) => `  ${(b.getFieldValue('NOME')||'contador').replace(/\s+/g,'_')} += ${cppGenerator.valueToCode(b,'VALOR',99)||'1'};\n`;

  // Funções
  cppGenerator.forBlock['definir_funcao'] = (b: Blockly.Block) => `void ${(b.getFieldValue('NOME')||'minhaFuncao').replace(/\s+/g,'_')}() {\n${cppGenerator.statementToCode(b,'DO')||''}}\n\n`;
  cppGenerator.forBlock['chamar_funcao']  = (b: Blockly.Block) => `  ${(b.getFieldValue('NOME')||'minhaFuncao').replace(/\s+/g,'_')}();\n`;

  // Comunicação
  cppGenerator.forBlock['escrever_serial']       = (b: Blockly.Block) => `  Serial.println("${b.getFieldValue('TEXT')}");\n`;
  cppGenerator.forBlock['escrever_serial_valor'] = (b: Blockly.Block) => `  Serial.println(${cppGenerator.valueToCode(b,'VALOR',99)||'0'});\n`;

  // Ultrassônico
  cppGenerator.forBlock['configurar_ultrassonico'] = (b: Blockly.Block) => `  pinMode(${b.getFieldValue('TRIG')}, OUTPUT);\n  pinMode(${b.getFieldValue('ECHO')}, INPUT);\n`;
  cppGenerator.forBlock['ler_distancia_cm']        = (b: Blockly.Block) => [`_lerDistancia(${b.getFieldValue('TRIG')}, ${b.getFieldValue('ECHO')})`, 0];
  cppGenerator.forBlock['objeto_esta_perto']       = (b: Blockly.Block) => [`(_lerDistancia(${b.getFieldValue('TRIG')}, ${b.getFieldValue('ECHO')}) < ${b.getFieldValue('CM')})`, 0];

  // Servo
  cppGenerator.forBlock['servo_configurar'] = (b: Blockly.Block) => `  _servoObj_${b.getFieldValue('PIN')}.attach(${b.getFieldValue('PIN')});\n`;
  cppGenerator.forBlock['servo_mover']      = (b: Blockly.Block) => `  _servoObj_${b.getFieldValue('PIN')}.write(${cppGenerator.valueToCode(b,'ANGULO',99)||'90'});\n`;

  // Buzzer
  cppGenerator.forBlock['buzzer_tocar']      = (b: Blockly.Block) => `  tone(${b.getFieldValue('PIN')}, ${b.getFieldValue('FREQ')});\n`;
  cppGenerator.forBlock['buzzer_tocar_tempo']= (b: Blockly.Block) => `  tone(${b.getFieldValue('PIN')}, ${b.getFieldValue('FREQ')}, ${b.getFieldValue('DUR')});\n`;
  cppGenerator.forBlock['buzzer_parar']      = (b: Blockly.Block) => `  noTone(${b.getFieldValue('PIN')});\n`;

  // MPU-6050
  cppGenerator.forBlock['mpu_iniciar']   = (b: Blockly.Block) => `  Wire.begin(${b.getFieldValue('SDA')}, ${b.getFieldValue('SCL')});\n  Wire.beginTransmission(0x68);\n  Wire.write(0x6B); Wire.write(0);\n  Wire.endTransmission(true);\n`;
  cppGenerator.forBlock['mpu_ler_pitch'] = (_b: Blockly.Block) => [`_bloquin_lerPitch()`, 0];
  cppGenerator.forBlock['mpu_ler_roll']  = (_b: Blockly.Block) => [`_bloquin_lerRoll()`, 0];

  // Ponte H
  cppGenerator.forBlock['l298n_configurar_simples'] = (b: Blockly.Block) => {
    const {ENA,IN1,IN2,ENB,IN3,IN4} = {ENA:b.getFieldValue('ENA'),IN1:b.getFieldValue('IN1'),IN2:b.getFieldValue('IN2'),ENB:b.getFieldValue('ENB'),IN3:b.getFieldValue('IN3'),IN4:b.getFieldValue('IN4')};
    return `  _l298n_ENA=${ENA}; _l298n_IN1=${IN1}; _l298n_IN2=${IN2};\n  _l298n_ENB=${ENB}; _l298n_IN3=${IN3}; _l298n_IN4=${IN4};\n  pinMode(${ENA},OUTPUT); pinMode(${ENB},OUTPUT);\n  pinMode(${IN1},OUTPUT); pinMode(${IN2},OUTPUT); pinMode(${IN3},OUTPUT); pinMode(${IN4},OUTPUT);\n  ledcAttach(${ENA},1000,8); ledcAttach(${ENB},1000,8);\n`;
  };
  cppGenerator.forBlock['l298n_mover_robo'] = (b: Blockly.Block) => {
    const dir = b.getFieldValue('DIRECAO'), f = cppGenerator.valueToCode(b,'FORCA',99)||'0';
    if (dir==='FRENTE')   return `  _bloquin_motorE(${f});\n  _bloquin_motorD(${f});\n`;
    if (dir==='TRAS')     return `  _bloquin_motorE(-(${f}));\n  _bloquin_motorD(-(${f}));\n`;
    if (dir==='ESQUERDA') return `  _bloquin_motorE(-(${f}));\n  _bloquin_motorD(${f});\n`;
    if (dir==='DIREITA')  return `  _bloquin_motorE(${f});\n  _bloquin_motorD(-(${f}));\n`;
    return `  _bloquin_motorE(0);\n  _bloquin_motorD(0);\n`;
  };
  cppGenerator.forBlock['l298n_parar']  = (_b: Blockly.Block) => `  _bloquin_motorE(0);\n  _bloquin_motorD(0);\n`;
  cppGenerator.forBlock['l298n_velocidade_por_pitch_roll'] = (b: Blockly.Block) => `  _bloquin_aplicarControle((float)(${cppGenerator.valueToCode(b,'PITCH',99)||'0.0f'}), (float)(${cppGenerator.valueToCode(b,'ROLL',99)||'0.0f'}), 10.0f, 8.0f);\n`;
}

export const generateCode = (ws: Blockly.WorkspaceSvg): string => {
  const topBlocks = ws.getTopBlocks(true);
  const globalVarLines: string[] = [];
  const funcDefLines: string[]   = [];
  let setupCode = '', loopCode = '';

  for (const block of topBlocks) {
    if      (block.type === 'bloco_setup')   setupCode = cppGenerator.blockToCode(block) as string;
    else if (block.type === 'bloco_loop')    loopCode  = cppGenerator.blockToCode(block) as string;
    else if (block.type === 'declarar_variavel_global') globalVarLines.push(cppGenerator.blockToCode(block) as string);
    else if (block.type === 'definir_funcao')            funcDefLines.push(cppGenerator.blockToCode(block) as string);
  }

  const mainCode = [
    ...globalVarLines, globalVarLines.length > 0 ? '\n' : '',
    ...funcDefLines,
    setupCode || 'void setup() {\n  Serial.begin(115200);\n}\n\n',
    loopCode  || 'void loop() {\n}\n\n',
  ].filter(Boolean).join('');

  // Headers automáticos
  const needsServo   = mainCode.includes('_servoObj_');
  const needsUltrass = mainCode.includes('_lerDistancia(');
  const needsMPU     = mainCode.includes('_bloquin_lerPitch') || mainCode.includes('_bloquin_lerRoll');
  const needsL298N   = mainCode.includes('_bloquin_motorE') || mainCode.includes('_l298n_');

  let prefix = '';
  if (needsServo)   prefix += '#include <Servo.h>\n' + [...new Set([...mainCode.matchAll(/_servoObj_(\w+)/g)].map(m=>m[1]))].map(p=>`Servo _servoObj_${p};`).join('\n') + '\n\n';
  if (needsUltrass) prefix += 'float _lerDistancia(int trig, int echo) {\n  digitalWrite(trig,LOW); delayMicroseconds(2);\n  digitalWrite(trig,HIGH); delayMicroseconds(10); digitalWrite(trig,LOW);\n  long dur = pulseIn(echo,HIGH,38000);\n  return dur > 0 ? dur*0.034f/2.0f : 0.0f;\n}\n\n';
  if (needsMPU)     prefix += '#include <Wire.h>\nstatic float _mpu_pitchCache=0,_mpu_rollCache=0;\nstatic unsigned long _mpu_lastRead=0;\nstatic void _bloquin_lerAngulos(){if(millis()-_mpu_lastRead<10)return;_mpu_lastRead=millis();Wire.beginTransmission(0x68);Wire.write(0x3B);Wire.endTransmission(false);Wire.requestFrom(0x68,6,true);int16_t ax=Wire.read()<<8|Wire.read(),ay=Wire.read()<<8|Wire.read(),az=Wire.read()<<8|Wire.read();float x=ax/16384.0f,y=ay/16384.0f,z=az/16384.0f;float sp=atan2f(-x,sqrtf(y*y+z*z))*180.0f/PI,sr=atan2f(y,z)*180.0f/PI;_mpu_pitchCache=sr;_mpu_rollCache=-sp;}\nfloat _bloquin_lerPitch(){_bloquin_lerAngulos();return _mpu_pitchCache;}\nfloat _bloquin_lerRoll(){_bloquin_lerAngulos();return _mpu_rollCache;}\n\n';
  if (needsL298N)   prefix += 'int _l298n_ENA=0,_l298n_IN1=0,_l298n_IN2=0,_l298n_ENB=0,_l298n_IN3=0,_l298n_IN4=0;\nvoid _bloquin_motorE(int v){v=constrain(v,-255,255);digitalWrite(_l298n_IN1,v>0?HIGH:LOW);digitalWrite(_l298n_IN2,v<0?HIGH:LOW);ledcWrite(_l298n_ENA,abs(v));}\nvoid _bloquin_motorD(int v){v=constrain(v,-255,255);digitalWrite(_l298n_IN3,v>0?HIGH:LOW);digitalWrite(_l298n_IN4,v<0?HIGH:LOW);ledcWrite(_l298n_ENB,abs(v));}\nvoid _bloquin_aplicarControle(float pitch,float roll,float zonaP,float zonaR){float ap=fabsf(pitch),ar=fabsf(roll);int vb=ap>zonaP?(int)((ap-zonaP)/(45.0f-zonaP)*105+150):0;int dlt=ar>zonaR&&vb>0?(int)((ar-zonaR)/(35.0f-zonaR)*vb*0.8f):0;int sn=pitch>=0?1:-1;_bloquin_motorE(sn*constrain(roll>zonaR?vb+dlt:roll<-zonaR?vb-dlt:vb,0,255));_bloquin_motorD(sn*constrain(roll>zonaR?vb-dlt:roll<-zonaR?vb+dlt:vb,0,255));}\n\n';

  return prefix + mainCode;
};

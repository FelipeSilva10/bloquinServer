import{G as $,N as u}from"./index-Z_Cq6zrN.js";const o=new $("CPP");function v(){o.scrub_=function(e,l,a){const t=e.nextConnection&&e.nextConnection.targetBlock(),n=a?"":o.blockToCode(t);return l+n},o.forBlock.bloco_setup=e=>`void setup() {
  Serial.begin(115200);
${o.statementToCode(e,"DO")||`  // setup...
`}}

`,o.forBlock.bloco_loop=e=>`void loop() {
${o.statementToCode(e,"DO")||`  // loop...
`}}

`,o.forBlock.configurar_pino=e=>`  pinMode(${e.getFieldValue("PIN")}, ${e.getFieldValue("MODE")});
`,o.forBlock.escrever_pino=e=>`  digitalWrite(${e.getFieldValue("PIN")}, ${e.getFieldValue("STATE")});
`,o.forBlock.ler_pino_digital=e=>[`digitalRead(${e.getFieldValue("PIN")})`,0],o.forBlock.escrever_pino_pwm=e=>`  analogWrite(${e.getFieldValue("PIN")}, ${o.valueToCode(e,"VALOR",99)||"0"});
`,o.forBlock.ler_pino_analogico=e=>[`analogRead(${e.getFieldValue("PIN")})`,0],o.forBlock.esperar=e=>`  delay(${e.getFieldValue("TIME")});
`,o.forBlock.parar_repeticao=e=>`  break;
`,o.forBlock.repetir_vezes=e=>{o.nameDB_||(o.nameDB_=new u(o.RESERVED_WORDS_));const l=o.nameDB_.getDistinctName("i",u.NameType.VARIABLE);return`  for (int ${l} = 0; ${l} < ${e.getFieldValue("TIMES")}; ${l}++) {
${o.statementToCode(e,"DO")||""}  }
`},o.forBlock.a_cada_x_ms=e=>{o.nameDB_||(o.nameDB_=new u(o.RESERVED_WORDS_));const l=o.nameDB_.getDistinctName("timer",u.NameType.VARIABLE);return`  static unsigned long ${l} = 0;
  if (millis() - ${l} >= ${e.getFieldValue("MS")}) {
    ${l} = millis();
${o.statementToCode(e,"DO")||""}  }
`},o.forBlock.enquanto_verdadeiro=e=>`  while (${o.valueToCode(e,"CONDICAO",0)||"false"}) {
${o.statementToCode(e,"DO")||""}  }
`,o.forBlock.se_entao=e=>`  if (${o.valueToCode(e,"CONDICAO",0)||"false"}) {
${o.statementToCode(e,"ENTAO")||""}  }
`,o.forBlock.se_entao_senao=e=>`  if (${o.valueToCode(e,"CONDICAO",0)||"false"}) {
${o.statementToCode(e,"ENTAO")||""}  } else {
${o.statementToCode(e,"SENAO")||""}  }
`,o.forBlock.comparar_valores=e=>[`(${o.valueToCode(e,"A",0)||"0"} ${e.getFieldValue("OP")} ${o.valueToCode(e,"B",0)||"0"})`,0],o.forBlock.e_ou_logico=e=>[`(${o.valueToCode(e,"A",0)||"false"} ${e.getFieldValue("OP")} ${o.valueToCode(e,"B",0)||"false"})`,0],o.forBlock.nao_logico=e=>[`!(${o.valueToCode(e,"VALOR",0)||"false"})`,0],o.forBlock.valor_booleano_fixo=e=>[e.getFieldValue("VALOR"),0],o.forBlock.numero_fixo=e=>[e.getFieldValue("VALOR"),0],o.forBlock.operacao_matematica=e=>[`(${o.valueToCode(e,"A",99)||"0"} ${e.getFieldValue("OP")} ${o.valueToCode(e,"B",99)||"0"})`,0],o.forBlock.mapear_valor=e=>[`map(${o.valueToCode(e,"VALOR",99)||"0"}, ${e.getFieldValue("DE_MIN")}, ${e.getFieldValue("DE_MAX")}, ${e.getFieldValue("PARA_MIN")}, ${e.getFieldValue("PARA_MAX")})`,0],o.forBlock.constrain_valor=e=>[`constrain(${o.valueToCode(e,"VALOR",99)||"0"}, ${e.getFieldValue("MIN")}, ${e.getFieldValue("MAX")})`,0],o.forBlock.random_valor=e=>[`random(${e.getFieldValue("MIN")}, ${e.getFieldValue("MAX")})`,0],o.forBlock.millis_atual=e=>["millis()",0],o.forBlock.declarar_variavel_global=e=>`${e.getFieldValue("TIPO")} ${(e.getFieldValue("NOME")||"minha_var").replace(/\s+/g,"_")} = ${o.valueToCode(e,"VALOR",99)||"0"};
`,o.forBlock.atribuir_variavel=e=>`  ${(e.getFieldValue("NOME")||"minha_var").replace(/\s+/g,"_")} = ${o.valueToCode(e,"VALOR",99)||"0"};
`,o.forBlock.ler_variavel=e=>[(e.getFieldValue("NOME")||"minha_var").replace(/\s+/g,"_"),0],o.forBlock.incrementar_variavel=e=>`  ${(e.getFieldValue("NOME")||"contador").replace(/\s+/g,"_")} += ${o.valueToCode(e,"VALOR",99)||"1"};
`,o.forBlock.definir_funcao=e=>`void ${(e.getFieldValue("NOME")||"minhaFuncao").replace(/\s+/g,"_")}() {
${o.statementToCode(e,"DO")||""}}

`,o.forBlock.chamar_funcao=e=>`  ${(e.getFieldValue("NOME")||"minhaFuncao").replace(/\s+/g,"_")}();
`,o.forBlock.escrever_serial=e=>`  Serial.println("${e.getFieldValue("TEXT")}");
`,o.forBlock.escrever_serial_valor=e=>`  Serial.println(${o.valueToCode(e,"VALOR",99)||"0"});
`,o.forBlock.configurar_ultrassonico=e=>`  pinMode(${e.getFieldValue("TRIG")}, OUTPUT);
  pinMode(${e.getFieldValue("ECHO")}, INPUT);
`,o.forBlock.ler_distancia_cm=e=>[`_lerDistancia(${e.getFieldValue("TRIG")}, ${e.getFieldValue("ECHO")})`,0],o.forBlock.objeto_esta_perto=e=>[`(_lerDistancia(${e.getFieldValue("TRIG")}, ${e.getFieldValue("ECHO")}) < ${e.getFieldValue("CM")})`,0],o.forBlock.servo_configurar=e=>`  _servoObj_${e.getFieldValue("PIN")}.attach(${e.getFieldValue("PIN")});
`,o.forBlock.servo_mover=e=>`  _servoObj_${e.getFieldValue("PIN")}.write(${o.valueToCode(e,"ANGULO",99)||"90"});
`,o.forBlock.buzzer_tocar=e=>`  tone(${e.getFieldValue("PIN")}, ${e.getFieldValue("FREQ")});
`,o.forBlock.buzzer_tocar_tempo=e=>`  tone(${e.getFieldValue("PIN")}, ${e.getFieldValue("FREQ")}, ${e.getFieldValue("DUR")});
`,o.forBlock.buzzer_parar=e=>`  noTone(${e.getFieldValue("PIN")});
`,o.forBlock.mpu_iniciar=e=>`  Wire.begin(${e.getFieldValue("SDA")}, ${e.getFieldValue("SCL")});
  Wire.beginTransmission(0x68);
  Wire.write(0x6B); Wire.write(0);
  Wire.endTransmission(true);
`,o.forBlock.mpu_ler_pitch=e=>["_bloquin_lerPitch()",0],o.forBlock.mpu_ler_roll=e=>["_bloquin_lerRoll()",0],o.forBlock.l298n_configurar_simples=e=>{const{ENA:l,IN1:a,IN2:t,ENB:n,IN3:_,IN4:r}={ENA:e.getFieldValue("ENA"),IN1:e.getFieldValue("IN1"),IN2:e.getFieldValue("IN2"),ENB:e.getFieldValue("ENB"),IN3:e.getFieldValue("IN3"),IN4:e.getFieldValue("IN4")};return`  _l298n_ENA=${l}; _l298n_IN1=${a}; _l298n_IN2=${t};
  _l298n_ENB=${n}; _l298n_IN3=${_}; _l298n_IN4=${r};
  pinMode(${l},OUTPUT); pinMode(${n},OUTPUT);
  pinMode(${a},OUTPUT); pinMode(${t},OUTPUT); pinMode(${_},OUTPUT); pinMode(${r},OUTPUT);
  ledcAttach(${l},1000,8); ledcAttach(${n},1000,8);
`},o.forBlock.l298n_mover_robo=e=>{const l=e.getFieldValue("DIRECAO"),a=o.valueToCode(e,"FORCA",99)||"0";return l==="FRENTE"?`  _bloquin_motorE(${a});
  _bloquin_motorD(${a});
`:l==="TRAS"?`  _bloquin_motorE(-(${a}));
  _bloquin_motorD(-(${a}));
`:l==="ESQUERDA"?`  _bloquin_motorE(-(${a}));
  _bloquin_motorD(${a});
`:l==="DIREITA"?`  _bloquin_motorE(${a});
  _bloquin_motorD(-(${a}));
`:`  _bloquin_motorE(0);
  _bloquin_motorD(0);
`},o.forBlock.l298n_parar=e=>`  _bloquin_motorE(0);
  _bloquin_motorD(0);
`,o.forBlock.l298n_velocidade_por_pitch_roll=e=>`  _bloquin_aplicarControle((float)(${o.valueToCode(e,"PITCH",99)||"0.0f"}), (float)(${o.valueToCode(e,"ROLL",99)||"0.0f"}), 10.0f, 8.0f);
`}const m=e=>{const l=e.getTopBlocks(!0),a=[],t=[];let n="",_="";for(const i of l)i.type==="bloco_setup"?n=o.blockToCode(i):i.type==="bloco_loop"?_=o.blockToCode(i):i.type==="declarar_variavel_global"?a.push(o.blockToCode(i)):i.type==="definir_funcao"&&t.push(o.blockToCode(i));const r=[...a,a.length>0?`
`:"",...t,n||`void setup() {
  Serial.begin(115200);
}

`,_||`void loop() {
}

`].filter(Boolean).join(""),c=r.includes("_servoObj_"),s=r.includes("_lerDistancia("),f=r.includes("_bloquin_lerPitch")||r.includes("_bloquin_lerRoll"),g=r.includes("_bloquin_motorE")||r.includes("_l298n_");let d="";return c&&(d+=`#include <Servo.h>
`+[...new Set([...r.matchAll(/_servoObj_(\w+)/g)].map(i=>i[1]))].map(i=>`Servo _servoObj_${i};`).join(`
`)+`

`),s&&(d+=`float _lerDistancia(int trig, int echo) {
  digitalWrite(trig,LOW); delayMicroseconds(2);
  digitalWrite(trig,HIGH); delayMicroseconds(10); digitalWrite(trig,LOW);
  long dur = pulseIn(echo,HIGH,38000);
  return dur > 0 ? dur*0.034f/2.0f : 0.0f;
}

`),f&&(d+=`#include <Wire.h>
static float _mpu_pitchCache=0,_mpu_rollCache=0;
static unsigned long _mpu_lastRead=0;
static void _bloquin_lerAngulos(){if(millis()-_mpu_lastRead<10)return;_mpu_lastRead=millis();Wire.beginTransmission(0x68);Wire.write(0x3B);Wire.endTransmission(false);Wire.requestFrom(0x68,6,true);int16_t ax=Wire.read()<<8|Wire.read(),ay=Wire.read()<<8|Wire.read(),az=Wire.read()<<8|Wire.read();float x=ax/16384.0f,y=ay/16384.0f,z=az/16384.0f;float sp=atan2f(-x,sqrtf(y*y+z*z))*180.0f/PI,sr=atan2f(y,z)*180.0f/PI;_mpu_pitchCache=sr;_mpu_rollCache=-sp;}
float _bloquin_lerPitch(){_bloquin_lerAngulos();return _mpu_pitchCache;}
float _bloquin_lerRoll(){_bloquin_lerAngulos();return _mpu_rollCache;}

`),g&&(d+=`int _l298n_ENA=0,_l298n_IN1=0,_l298n_IN2=0,_l298n_ENB=0,_l298n_IN3=0,_l298n_IN4=0;
void _bloquin_motorE(int v){v=constrain(v,-255,255);digitalWrite(_l298n_IN1,v>0?HIGH:LOW);digitalWrite(_l298n_IN2,v<0?HIGH:LOW);ledcWrite(_l298n_ENA,abs(v));}
void _bloquin_motorD(int v){v=constrain(v,-255,255);digitalWrite(_l298n_IN3,v>0?HIGH:LOW);digitalWrite(_l298n_IN4,v<0?HIGH:LOW);ledcWrite(_l298n_ENB,abs(v));}
void _bloquin_aplicarControle(float pitch,float roll,float zonaP,float zonaR){float ap=fabsf(pitch),ar=fabsf(roll);int vb=ap>zonaP?(int)((ap-zonaP)/(45.0f-zonaP)*105+150):0;int dlt=ar>zonaR&&vb>0?(int)((ar-zonaR)/(35.0f-zonaR)*vb*0.8f):0;int sn=pitch>=0?1:-1;_bloquin_motorE(sn*constrain(roll>zonaR?vb+dlt:roll<-zonaR?vb-dlt:vb,0,255));_bloquin_motorD(sn*constrain(roll>zonaR?vb-dlt:roll<-zonaR?vb+dlt:vb,0,255));}

`),d+r};export{o as cppGenerator,m as generateCode,v as initGenerators};

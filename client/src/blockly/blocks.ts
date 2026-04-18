import * as Blockly from 'blockly/core';

export const BOARDS = {
  uno:  { name: 'Arduino Uno',      pins: [['D2','2'],['D3 (PWM)','3'],['D4','4'],['D5 (PWM)','5'],['D6 (PWM)','6'],['D7','7'],['D8','8'],['D9 (PWM)','9'],['D10 (PWM)','10'],['D11 (PWM)','11'],['D12','12'],['D13 (LED Interno)','13'],['A0','A0'],['A1','A1'],['A2','A2'],['A3','A3'],['A4','A4'],['A5','A5']] },
  nano: { name: 'Arduino Nano',     pins: [['D2','2'],['D3 (PWM)','3'],['D4','4'],['D5 (PWM)','5'],['D6 (PWM)','6'],['D7','7'],['D8','8'],['D9 (PWM)','9'],['D10 (PWM)','10'],['D11 (PWM)','11'],['D12','12'],['D13 (LED Interno)','13'],['A0','A0'],['A1','A1'],['A2','A2'],['A3','A3'],['A4','A4'],['A5','A5']] },
  esp32:{ name: 'ESP32 DevKit V1',  pins: [['GPIO 2  (LED)','2'],['GPIO 4','4'],['GPIO 13','13'],['GPIO 14','14'],['GPIO 16','16'],['GPIO 17','17'],['GPIO 18','18'],['GPIO 19','19'],['GPIO 21','21'],['GPIO 22','22'],['GPIO 23','23'],['GPIO 25','25'],['GPIO 26','26'],['GPIO 27','27'],['GPIO 32','32'],['GPIO 33','33'],['GPIO 34 (leitura)','34'],['GPIO 35 (leitura)','35'],['GPIO 36 (leitura)','36'],['GPIO 39 (leitura)','39']] },
} as const;

export type BoardKey = keyof typeof BOARDS;
export const BOARD_UNSET = 'unset';

let currentBoardPins: [string, string][] = [...BOARDS.esp32.pins] as [string, string][];

export function syncBoardPins(boardKey: BoardKey) {
  currentBoardPins = [...BOARDS[boardKey].pins] as [string, string][];
}

export function initBlocks() {
  // Extensão: validação de contexto setup
  if (!Blockly.Extensions.isRegistered('validacao_setup_ext')) {
    Blockly.Extensions.register('validacao_setup_ext', function(this: Blockly.Block) {
      this.setOnChange(function(this: Blockly.Block, _e: unknown) {
        if (!this.workspace || this.isInFlyout) return;
        let parent = this.getSurroundParent();
        let valid = false;
        while (parent) {
          if (parent.type === 'bloco_setup') { valid = true; break; }
          parent = parent.getSurroundParent();
        }
        this.setWarningText(valid ? null : 'Este bloco deve ficar dentro de PREPARAR.');
      });
    });
  }

  const customBlocks = [
    // ESTRUTURA
    { type:'bloco_setup', colour:290, message0:'PREPARAR (Roda 1 vez) %1', args0:[{type:'input_statement',name:'DO'}], tooltip:'Código inicial.' },
    { type:'bloco_loop',  colour:260, message0:'AGIR (Roda para sempre) %1', args0:[{type:'input_statement',name:'DO'}], tooltip:'Repetição principal.' },

    // PINOS
    { type:'configurar_pino', colour:165, message0:'⚡ Configurar pino %1 como %2', args0:[{type:'field_dropdown',name:'PIN',options:()=>currentBoardPins},{type:'field_dropdown',name:'MODE',options:[['Saída (Enviar sinal)','OUTPUT'],['Entrada (Ler sensor)','INPUT'],['Entrada com redutor de energia','INPUT_PULLUP']]}], previousStatement:null, nextStatement:null, extensions:['validacao_setup_ext'] },
    { type:'escrever_pino', colour:165, message0:'Colocar pino %1 em estado %2', args0:[{type:'field_dropdown',name:'PIN',options:()=>currentBoardPins},{type:'field_dropdown',name:'STATE',options:[['Ligado (HIGH)','HIGH'],['Desligado (LOW)','LOW']]}], previousStatement:null, nextStatement:null },
    { type:'ler_pino_digital', colour:165, message0:'Ler pino digital %1', args0:[{type:'field_dropdown',name:'PIN',options:()=>currentBoardPins}], output:'Number' },
    { type:'escrever_pino_pwm', colour:165, message0:'Força do pino %1 → %2 (0 a 255)', args0:[{type:'field_dropdown',name:'PIN',options:()=>currentBoardPins},{type:'input_value',name:'VALOR',check:'Number'}], inputsInline:true, previousStatement:null, nextStatement:null },
    { type:'ler_pino_analogico', colour:165, message0:'Ler sensor analógico no pino %1', args0:[{type:'field_dropdown',name:'PIN',options:()=>currentBoardPins}], output:'Number' },

    // CONTROLE
    { type:'esperar', colour:120, message0:'Esperar %1 milissegundos', args0:[{type:'field_number',name:'TIME',value:1000,min:0}], previousStatement:null, nextStatement:null },
    { type:'repetir_vezes', colour:120, message0:'Repetir %1 vezes %2 %3', args0:[{type:'field_number',name:'TIMES',value:5,min:1},{type:'input_dummy'},{type:'input_statement',name:'DO'}], previousStatement:null, nextStatement:null },
    { type:'a_cada_x_ms', colour:120, message0:'⏳ A cada %1 ms fazer %2 %3', args0:[{type:'field_number',name:'MS',value:1000,min:1},{type:'input_dummy'},{type:'input_statement',name:'DO'}], previousStatement:null, nextStatement:null },
    { type:'enquanto_verdadeiro', colour:120, message0:'Enquanto %1 fizer %2 %3', args0:[{type:'input_value',name:'CONDICAO',check:'Boolean'},{type:'input_dummy'},{type:'input_statement',name:'DO'}], previousStatement:null, nextStatement:null },
    { type:'parar_repeticao', colour:120, message0:'⛔ Parar repetição', previousStatement:null, nextStatement:null },

    // CONDIÇÕES
    { type:'se_entao', colour:210, message0:'SE %1 ENTÃO %2 %3', args0:[{type:'input_value',name:'CONDICAO',check:'Boolean'},{type:'input_dummy'},{type:'input_statement',name:'ENTAO'}], previousStatement:null, nextStatement:null },
    { type:'se_entao_senao', colour:210, message0:'SE %1 ENTÃO %2 %3 SENÃO %4 %5', args0:[{type:'input_value',name:'CONDICAO',check:'Boolean'},{type:'input_dummy'},{type:'input_statement',name:'ENTAO'},{type:'input_dummy'},{type:'input_statement',name:'SENAO'}], previousStatement:null, nextStatement:null },
    { type:'comparar_valores', colour:210, message0:'%1 %2 %3', args0:[{type:'input_value',name:'A',check:'Number'},{type:'field_dropdown',name:'OP',options:[['é maior que','>'],[' é menor que','<'],['é igual a','=='],['é diferente de','!=']]},{type:'input_value',name:'B',check:'Number'}], inputsInline:true, output:'Boolean' },
    { type:'e_ou_logico', colour:210, message0:'%1 %2 %3', args0:[{type:'input_value',name:'A',check:'Boolean'},{type:'field_dropdown',name:'OP',options:[['E','&&'],['OU','||']]},{type:'input_value',name:'B',check:'Boolean'}], inputsInline:true, output:'Boolean' },
    { type:'nao_logico', colour:210, message0:'NÃO %1', args0:[{type:'input_value',name:'VALOR',check:'Boolean'}], inputsInline:true, output:'Boolean' },
    { type:'valor_booleano_fixo', colour:210, message0:'%1', args0:[{type:'field_dropdown',name:'VALOR',options:[['verdadeiro','true'],['falso','false']]}], output:'Boolean' },

    // MATEMÁTICA
    { type:'numero_fixo', colour:255, message0:'%1', args0:[{type:'field_number',name:'VALOR',value:10}], output:'Number' },
    { type:'operacao_matematica', colour:255, message0:'%1 %2 %3', args0:[{type:'input_value',name:'A',check:'Number'},{type:'field_dropdown',name:'OP',options:[['+ soma','+'],[' − subtração','-'],['× multiplicação','*'],['÷ divisão','/'],['% resto','%']]},{type:'input_value',name:'B',check:'Number'}], inputsInline:true, output:'Number' },
    { type:'mapear_valor', colour:255, message0:'Converter %1 de %2-%3 para %4-%5', args0:[{type:'input_value',name:'VALOR',check:'Number'},{type:'field_number',name:'DE_MIN',value:0},{type:'field_number',name:'DE_MAX',value:1023},{type:'field_number',name:'PARA_MIN',value:0},{type:'field_number',name:'PARA_MAX',value:255}], inputsInline:true, output:'Number' },
    { type:'constrain_valor', colour:255, message0:'Limitar %1 entre %2 e %3', args0:[{type:'input_value',name:'VALOR',check:'Number'},{type:'field_number',name:'MIN',value:0},{type:'field_number',name:'MAX',value:255}], inputsInline:true, output:'Number' },
    { type:'random_valor', colour:255, message0:'Número aleatório de %1 a %2', args0:[{type:'field_number',name:'MIN',value:0},{type:'field_number',name:'MAX',value:100}], output:'Number' },
    { type:'millis_atual', colour:255, message0:'Tempo ligado (ms)', output:'Number' },

    // VARIÁVEIS
    { type:'declarar_variavel_global', colour:330, message0:'📦 Variável %1 %2 = %3', args0:[{type:'field_dropdown',name:'TIPO',options:[['Número Inteiro','int'],['Número Decimal','float'],['Verdadeiro/Falso','bool']]},{type:'field_input',name:'NOME',text:'minha_var'},{type:'input_value',name:'VALOR'}] },
    { type:'atribuir_variavel', colour:330, message0:'Guardar em %1 o valor %2', args0:[{type:'field_input',name:'NOME',text:'minha_var'},{type:'input_value',name:'VALOR'}], inputsInline:true, previousStatement:null, nextStatement:null },
    { type:'ler_variavel', colour:330, message0:'variável %1', args0:[{type:'field_input',name:'NOME',text:'minha_var'}], output:null },
    { type:'incrementar_variavel', colour:330, message0:'Aumentar %1 em %2', args0:[{type:'field_input',name:'NOME',text:'contador'},{type:'input_value',name:'VALOR',check:'Number'}], inputsInline:true, previousStatement:null, nextStatement:null },

    // FUNÇÕES
    { type:'definir_funcao', colour:270, message0:'⚡ Função %1 %2 %3', args0:[{type:'field_input',name:'NOME',text:'minhaFuncao'},{type:'input_dummy'},{type:'input_statement',name:'DO'}] },
    { type:'chamar_funcao', colour:270, message0:'Executar função %1', args0:[{type:'field_input',name:'NOME',text:'minhaFuncao'}], previousStatement:null, nextStatement:null },

    // COMUNICAÇÃO
    { type:'escrever_serial', colour:160, message0:'O robô diz o texto: %1', args0:[{type:'field_input',name:'TEXT',text:'Olá!'}], previousStatement:null, nextStatement:null },
    { type:'escrever_serial_valor', colour:160, message0:'O robô diz o valor: %1', args0:[{type:'input_value',name:'VALOR'}], previousStatement:null, nextStatement:null },

    // SERVO
    { type:'servo_configurar', colour:170, message0:'Conectar servo no pino %1', args0:[{type:'field_dropdown',name:'PIN',options:()=>currentBoardPins}], previousStatement:null, nextStatement:null, extensions:['validacao_setup_ext'] },
    { type:'servo_mover', colour:170, message0:'Mover servo (pino %1) para %2 °', args0:[{type:'field_dropdown',name:'PIN',options:()=>currentBoardPins},{type:'input_value',name:'ANGULO',check:'Number'}], inputsInline:true, previousStatement:null, nextStatement:null },

    // ULTRASSÔNICO
    { type:'configurar_ultrassonico', colour:30, message0:'📏 Configurar sensor de distância: Trigger %1 Echo %2', args0:[{type:'field_dropdown',name:'TRIG',options:()=>currentBoardPins},{type:'field_dropdown',name:'ECHO',options:()=>currentBoardPins}], previousStatement:null, nextStatement:null, extensions:['validacao_setup_ext'] },
    { type:'ler_distancia_cm', colour:30, message0:'Distância em cm (Trigger %1 Echo %2)', args0:[{type:'field_dropdown',name:'TRIG',options:()=>currentBoardPins},{type:'field_dropdown',name:'ECHO',options:()=>currentBoardPins}], output:'Number' },
    { type:'objeto_esta_perto', colour:30, message0:'Tem objeto a menos de %1 cm? (Trigger %2 Echo %3)', args0:[{type:'field_number',name:'CM',value:20,min:1},{type:'field_dropdown',name:'TRIG',options:()=>currentBoardPins},{type:'field_dropdown',name:'ECHO',options:()=>currentBoardPins}], output:'Boolean' },

    // BUZZER
    { type:'buzzer_tocar', colour:75, message0:'🔊 Tocar som: pino %1 frequência %2 Hz', args0:[{type:'field_dropdown',name:'PIN',options:()=>currentBoardPins},{type:'field_number',name:'FREQ',value:440,min:31}], previousStatement:null, nextStatement:null },
    { type:'buzzer_tocar_tempo', colour:75, message0:'🔊 Tocar som: pino %1 frequência %2 Hz por %3 ms', args0:[{type:'field_dropdown',name:'PIN',options:()=>currentBoardPins},{type:'field_number',name:'FREQ',value:440,min:31},{type:'field_number',name:'DUR',value:500,min:1}], previousStatement:null, nextStatement:null },
    { type:'buzzer_parar', colour:75, message0:'🔇 Parar som no pino %1', args0:[{type:'field_dropdown',name:'PIN',options:()=>currentBoardPins}], previousStatement:null, nextStatement:null },

    // PONTE H
    { type:'l298n_configurar_simples', colour:120, message0:'⚙️ Configurar Motores do Robô%1Motor Esquerdo (Força %2 IN1 %3 IN2 %4)%5Motor Direito (Força %6 IN3 %7 IN4 %8)', args0:[{type:'input_dummy'},{type:'field_dropdown',name:'ENA',options:()=>currentBoardPins},{type:'field_dropdown',name:'IN1',options:()=>currentBoardPins},{type:'field_dropdown',name:'IN2',options:()=>currentBoardPins},{type:'input_dummy'},{type:'field_dropdown',name:'ENB',options:()=>currentBoardPins},{type:'field_dropdown',name:'IN3',options:()=>currentBoardPins},{type:'field_dropdown',name:'IN4',options:()=>currentBoardPins}], previousStatement:null, nextStatement:null, extensions:['validacao_setup_ext'] },
    { type:'l298n_mover_robo', colour:120, message0:'🚗 Mover robô para %1 com força %2', args0:[{type:'field_dropdown',name:'DIRECAO',options:[['Frente','FRENTE'],['Trás','TRAS'],['Esquerda','ESQUERDA'],['Direita','DIREITA'],['Parar','PARAR']]},{type:'input_value',name:'FORCA',check:'Number'}], inputsInline:true, previousStatement:null, nextStatement:null },
    { type:'l298n_velocidade_por_pitch_roll', colour:120, message0:'🚗 Mover por inclinação (Frente/Trás %1 Esq/Dir %2)', args0:[{type:'input_value',name:'PITCH',check:'Number'},{type:'input_value',name:'ROLL',check:'Number'}], inputsInline:true, previousStatement:null, nextStatement:null },

    // MPU-6050
    { type:'mpu_iniciar', colour:310, message0:'🧭 Iniciar Acelerômetro (SDA %1 SCL %2)', args0:[{type:'field_dropdown',name:'SDA',options:()=>currentBoardPins},{type:'field_dropdown',name:'SCL',options:()=>currentBoardPins}], previousStatement:null, nextStatement:null, extensions:['validacao_setup_ext'] },
    { type:'mpu_ler_pitch', colour:310, message0:'🧭 Inclinação frente/trás (graus)', output:'Number' },
    { type:'mpu_ler_roll',  colour:310, message0:'🧭 Inclinação esquerda/direita (graus)', output:'Number' },
  ];

  // Bloco l298n_parar (sintaxe diferente)
  Blockly.Blocks['l298n_parar'] = {
    init(this: Blockly.Block) {
      this.appendDummyInput().appendField('🛑 Parar Robô');
      this.setPreviousStatement(true, null);
      this.setNextStatement(true, null);
      this.setColour(120);
    },
  };

  Blockly.defineBlocksWithJsonArray(customBlocks);
}

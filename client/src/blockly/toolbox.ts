/**
 * toolbox.ts — Configuração completa da toolbox Blockly do Bloquin
 * Todas as categorias e blocos do desktop estão presentes aqui.
 */

export const toolboxConfig = {
  kind: 'categoryToolbox',
  contents: [

    // ── ESTRUTURA ──────────────────────────────────────────────────────────
    {
      kind: 'category',
      name: '🧱 Estrutura',
      colour: '290',
      contents: [
        { kind: 'block', type: 'bloco_setup' },
        { kind: 'block', type: 'bloco_loop' },
      ],
    },

    // ── PINOS ──────────────────────────────────────────────────────────────
    {
      kind: 'category',
      name: '⚡ Pinos',
      colour: '165',
      contents: [
        { kind: 'block', type: 'configurar_pino' },
        { kind: 'block', type: 'escrever_pino' },
        { kind: 'block', type: 'ler_pino_digital' },
        {
          kind: 'block', type: 'escrever_pino_pwm',
          inputs: { VALOR: { block: { type: 'numero_fixo', fields: { VALOR: 128 } } } },
        },
        { kind: 'block', type: 'ler_pino_analogico' },
      ],
    },

    // ── CONTROLE ───────────────────────────────────────────────────────────
    {
      kind: 'category',
      name: '🔁 Controle',
      colour: '120',
      contents: [
        {
          kind: 'block', type: 'esperar',
          fields: { TIME: 1000 },
        },
        {
          kind: 'block', type: 'repetir_vezes',
          fields: { TIMES: 5 },
        },
        {
          kind: 'block', type: 'a_cada_x_ms',
          fields: { MS: 1000 },
        },
        { kind: 'block', type: 'enquanto_verdadeiro' },
        { kind: 'block', type: 'parar_repeticao' },
      ],
    },

    // ── CONDIÇÕES ──────────────────────────────────────────────────────────
    {
      kind: 'category',
      name: '❓ Condições',
      colour: '210',
      contents: [
        { kind: 'block', type: 'se_entao' },
        { kind: 'block', type: 'se_entao_senao' },
        {
          kind: 'block', type: 'comparar_valores',
          inputs: {
            A: { block: { type: 'numero_fixo', fields: { VALOR: 0 } } },
            B: { block: { type: 'numero_fixo', fields: { VALOR: 10 } } },
          },
        },
        { kind: 'block', type: 'e_ou_logico' },
        { kind: 'block', type: 'nao_logico' },
        { kind: 'block', type: 'valor_booleano_fixo' },
      ],
    },

    // ── MATEMÁTICA ─────────────────────────────────────────────────────────
    {
      kind: 'category',
      name: '🔢 Matemática',
      colour: '255',
      contents: [
        { kind: 'block', type: 'numero_fixo', fields: { VALOR: 10 } },
        {
          kind: 'block', type: 'operacao_matematica',
          inputs: {
            A: { block: { type: 'numero_fixo', fields: { VALOR: 0 } } },
            B: { block: { type: 'numero_fixo', fields: { VALOR: 0 } } },
          },
        },
        {
          kind: 'block', type: 'mapear_valor',
          inputs: { VALOR: { block: { type: 'numero_fixo', fields: { VALOR: 0 } } } },
        },
        {
          kind: 'block', type: 'constrain_valor',
          inputs: { VALOR: { block: { type: 'numero_fixo', fields: { VALOR: 0 } } } },
        },
        { kind: 'block', type: 'random_valor' },
        { kind: 'block', type: 'millis_atual' },
      ],
    },

    // ── VARIÁVEIS ──────────────────────────────────────────────────────────
    {
      kind: 'category',
      name: '📦 Variáveis',
      colour: '330',
      contents: [
        {
          kind: 'block', type: 'declarar_variavel_global',
          inputs: { VALOR: { block: { type: 'numero_fixo', fields: { VALOR: 0 } } } },
        },
        {
          kind: 'block', type: 'atribuir_variavel',
          inputs: { VALOR: { block: { type: 'numero_fixo', fields: { VALOR: 0 } } } },
        },
        { kind: 'block', type: 'ler_variavel' },
        {
          kind: 'block', type: 'incrementar_variavel',
          inputs: { VALOR: { block: { type: 'numero_fixo', fields: { VALOR: 1 } } } },
        },
      ],
    },

    // ── FUNÇÕES ────────────────────────────────────────────────────────────
    {
      kind: 'category',
      name: '⚙️ Funções',
      colour: '270',
      contents: [
        { kind: 'block', type: 'definir_funcao' },
        { kind: 'block', type: 'chamar_funcao' },
      ],
    },

    // ── COMUNICAÇÃO SERIAL ─────────────────────────────────────────────────
    {
      kind: 'category',
      name: '💬 Comunicação',
      colour: '160',
      contents: [
        { kind: 'block', type: 'escrever_serial', fields: { TEXT: 'Olá!' } },
        {
          kind: 'block', type: 'escrever_serial_valor',
          inputs: { VALOR: { block: { type: 'numero_fixo', fields: { VALOR: 0 } } } },
        },
      ],
    },

    // ── SERVO MOTOR ────────────────────────────────────────────────────────
    {
      kind: 'category',
      name: '🔄 Servo Motor',
      colour: '170',
      contents: [
        { kind: 'block', type: 'servo_configurar' },
        {
          kind: 'block', type: 'servo_mover',
          inputs: { ANGULO: { block: { type: 'numero_fixo', fields: { VALOR: 90 } } } },
        },
      ],
    },

    // ── SENSOR ULTRASSÔNICO ────────────────────────────────────────────────
    {
      kind: 'category',
      name: '📏 Ultrassônico',
      colour: '30',
      contents: [
        { kind: 'block', type: 'configurar_ultrassonico' },
        { kind: 'block', type: 'ler_distancia_cm' },
        {
          kind: 'block', type: 'objeto_esta_perto',
          fields: { CM: 20 },
        },
      ],
    },

    // ── BUZZER ─────────────────────────────────────────────────────────────
    {
      kind: 'category',
      name: '🔊 Buzzer',
      colour: '75',
      contents: [
        { kind: 'block', type: 'buzzer_tocar', fields: { FREQ: 440 } },
        { kind: 'block', type: 'buzzer_tocar_tempo', fields: { FREQ: 440, DUR: 500 } },
        { kind: 'block', type: 'buzzer_parar' },
      ],
    },

    // ── MOTORES DO ROBÔ (L298N) ────────────────────────────────────────────
    {
      kind: 'category',
      name: '🚗 Motores do Robô',
      colour: '120',
      contents: [
        { kind: 'block', type: 'l298n_configurar_simples' },
        {
          kind: 'block', type: 'l298n_mover_robo',
          inputs: { FORCA: { block: { type: 'numero_fixo', fields: { VALOR: 200 } } } },
        },
        { kind: 'block', type: 'l298n_parar' },
        {
          kind: 'block', type: 'l298n_velocidade_por_pitch_roll',
          inputs: {
            PITCH: { block: { type: 'numero_fixo', fields: { VALOR: 0 } } },
            ROLL:  { block: { type: 'numero_fixo', fields: { VALOR: 0 } } },
          },
        },
      ],
    },

    // ── ACELERÔMETRO (MPU-6050) ────────────────────────────────────────────
    {
      kind: 'category',
      name: '🧭 Acelerômetro',
      colour: '310',
      contents: [
        { kind: 'block', type: 'mpu_iniciar' },
        { kind: 'block', type: 'mpu_ler_pitch' },
        { kind: 'block', type: 'mpu_ler_roll' },
      ],
    },

  ],
};

// Mapa de nomes amigáveis para mensagens de aviso de blocos soltos
export const BLOCK_NAMES: Record<string, string> = {
  bloco_setup:                   'PREPARAR',
  bloco_loop:                    'AGIR',
  configurar_pino:               'Configurar Pino',
  escrever_pino:                 'Ligar/Desligar Pino',
  ler_pino_digital:              'Ler Pino Digital',
  escrever_pino_pwm:             'Força do Pino (PWM)',
  ler_pino_analogico:            'Ler Sensor Analógico',
  esperar:                       'Esperar',
  repetir_vezes:                 'Repetir Vezes',
  a_cada_x_ms:                   'A cada X ms',
  enquanto_verdadeiro:           'Enquanto... Fizer',
  parar_repeticao:               'Parar Repetição',
  se_entao:                      'Se... Então',
  se_entao_senao:                'Se... Então... Senão',
  comparar_valores:              'Comparar Valores',
  e_ou_logico:                   'E / Ou',
  nao_logico:                    'NÃO',
  valor_booleano_fixo:           'Verdadeiro / Falso',
  numero_fixo:                   'Número',
  operacao_matematica:           'Operação Matemática',
  mapear_valor:                  'Converter Escala',
  constrain_valor:               'Limitar Valor',
  random_valor:                  'Número Aleatório',
  millis_atual:                  'Tempo Ligado',
  declarar_variavel_global:      'Variável',
  atribuir_variavel:             'Guardar em Variável',
  ler_variavel:                  'Ler Variável',
  incrementar_variavel:          'Aumentar Variável',
  definir_funcao:                'Definir Função',
  chamar_funcao:                 'Executar Função',
  escrever_serial:               'O Robô Diz (texto)',
  escrever_serial_valor:         'O Robô Diz (valor)',
  servo_configurar:              'Conectar Servo',
  servo_mover:                   'Mover Servo',
  configurar_ultrassonico:       'Configurar Sensor de Distância',
  ler_distancia_cm:              'Ler Distância (cm)',
  objeto_esta_perto:             'Tem Objeto Perto?',
  buzzer_tocar:                  'Tocar Som',
  buzzer_tocar_tempo:            'Tocar Som por Tempo',
  buzzer_parar:                  'Parar Som',
  l298n_configurar_simples:      'Configurar Motores',
  l298n_mover_robo:              'Mover Robô',
  l298n_parar:                   'Parar Robô',
  l298n_velocidade_por_pitch_roll: 'Mover por Inclinação',
  mpu_iniciar:                   'Iniciar Acelerômetro',
  mpu_ler_pitch:                 'Inclinação Frente/Trás',
  mpu_ler_roll:                  'Inclinação Esq/Dir',
};

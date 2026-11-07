import { HistoricalValuesResponse } from '@utils/historicalValues';

/** Um ponto do TSQMI de demonstração; o id é sempre nulo porque nada é gravado. */
export interface DemoTsqmiPoint {
  id: null;
  value: number;
  created_at: string;
}

/**
 * Resposta de GET .../repositories/<id>/demo-data/: dados fictícios, calculados na hora pelo Service para um
 * repositório sem coleta real e nunca gravados. `is_demo` é sempre true; a tela só os mostra com o aviso.
 */
export interface DemoData {
  is_demo: true;
  notice: string;
  generated_at: string;
  latest_tsqmi: DemoTsqmiPoint;
  tsqmi_history: DemoTsqmiPoint[];
  historical_characteristics: HistoricalValuesResponse & { count: number };
}

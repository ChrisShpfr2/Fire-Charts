import {
  calculateATR,
  calculateAutoFibonacci,
  calculateBollingerBands,
  calculateEMA,
  calculateMACD,
  calculateOscillatorDivergences,
  calculateRSI,
  calculateStochRSI,
  calculateTradersRealityMain,
  calculateVuManChuMoneyFlow,
  calculateVuManChuWaveTrend,
  calculateVWAP,
} from './indicators';

export {
  calculateATR,
  calculateAutoFibonacci,
  calculateBollingerBands,
  calculateEMA,
  calculateMACD,
  calculateOscillatorDivergences,
  calculateRSI,
  calculateStochRSI,
  calculateTradersRealityMain,
  calculateVWAP,
};

export const calculateVMCMoneyFlowSafe = {
  waveTrend: calculateVuManChuWaveTrend,
  moneyFlow: calculateVuManChuMoneyFlow,
};

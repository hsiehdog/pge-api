import Decimal from "decimal.js";

export interface CalcParams {
  operation: "sum" | "avg" | "min" | "max" | "percent_change";
  values: number[];
}

export interface CalcResult {
  operation: string;
  result: number;
  inputCount: number;
  calculationDetails?: {
    firstValue?: number;
    lastValue?: number;
    change?: number;
  };
}

export function calc(params: CalcParams): CalcResult {
  const { operation, values } = params;

  if (!values || values.length === 0) {
    throw new Error("Values array cannot be empty");
  }

  // Convert all values to Decimal for stable math
  const decimalValues = values.map(v => new Decimal(v));

  let result: number;
  let calculationDetails: any = {};

  switch (operation) {
    case "sum":
      result = decimalValues.reduce((acc, val) => acc.add(val), new Decimal(0)).toNumber();
      break;

    case "avg":
      const sum = decimalValues.reduce((acc, val) => acc.add(val), new Decimal(0));
      result = sum.div(decimalValues.length).toNumber();
      break;

    case "min":
      result = Math.min(...values);
      break;

    case "max":
      result = Math.max(...values);
      break;

    case "percent_change":
      if (values.length < 2) {
        throw new Error("Percent change requires at least 2 values");
      }
      
      const firstValue = decimalValues[0];
      const lastValue = decimalValues[decimalValues.length - 1];
      
      if (firstValue.eq(0)) {
        result = lastValue.gt(0) ? 100 : 0;
      } else {
        const change = lastValue.sub(firstValue);
        result = change.div(firstValue).mul(100).toNumber();
      }
      
      calculationDetails = {
        firstValue: firstValue.toNumber(),
        lastValue: lastValue.toNumber(),
        change: lastValue.sub(firstValue).toNumber()
      };
      break;

    default:
      throw new Error(`Invalid operation: ${operation}`);
  }

  return {
    operation,
    result,
    inputCount: values.length,
    calculationDetails: Object.keys(calculationDetails).length > 0 ? calculationDetails : undefined
  };
}

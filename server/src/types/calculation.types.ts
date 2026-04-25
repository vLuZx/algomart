export type Dimensions = { 
  l: number; 
  w: number; 
  h: number;
};

export type Zone = 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9;

export type BoxOption = {
  name: string;
  dimensions: Dimensions;
};

export type BoxSelection = {
  box: BoxOption;
  actualUnitsFit: number;
  packingEfficiency: number;
};

export type ShippingInput = {
  product: Dimensions;
  productWeightLbs: number;
  targetUnits: number;
  zone: Zone;
  packingEfficiency?: number;
};

export type ShippingEstimate = {
  selectedBox: BoxOption;
  unitsInBox: number;
  totalWeightLbs: number;
  billableWeight: number;
  usedDimWeight: boolean;
  shippingCost: number;
  costPerUnit: number;
};
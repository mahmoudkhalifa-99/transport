
export enum OperationStatus {
  DONE = 'تمت',
  IN_PROGRESS = 'جاري التنفيذ',
  STOPPED = 'متوقفة'
}

export type UserRole = 'admin' | 'editor' | 'viewer';

export interface AppUser {
  name: string;
  pin: string;
  role: UserRole;
  allowedMaterials: string; // 'صويا' | 'ذرة' | 'الكل'
}

export interface Stats {
  totalWeight: number;
  totalTrips: number;
  carStats: Record<string, number>;
  driverStats: Record<string, number>;
}

export interface TransportRecord {
  autoId: string;
  date: string;
  departureTime: string;
  statementNo?: string;
  customerCode?: string;
  customerName?: string;
  itemCode?: string;
  itemName?: string;
  quantityBulk?: number;
  quantityPacked?: number;
  expenditureType?: string;
  shift?: string;
  transportMethod?: string;
  carType?: string;
  carNumber: string;
  driverName: string;
  driverPhone: string;
  goodsType: string;
  weight: number;
  status: OperationStatus;
  orderNo: string;
  unloadingSite: string;
  notes: string;
  contractorName: string;
  waybillNo: string;
  loadingSite: string;
  tripsCount?: number;
  customerAddress?: string;
  certificateNo?: string;
  pieces?: number;
  fourteenOnTon?: string;
  operationEmployee?: string;
  warehouseKeeper?: string;
  supplier?: string;
  shipName?: string;
  newContract?: string;
  salesType?: string;
  itemCategory?: string;
  trustees?: string;
  loader?: string;
  port?: string;
}

export interface Release {
  id?: string;
  releaseNo: string;
  orderNo: string;
  date: string;
  siteName: string;
  goodsType: string;
  totalQuantity: number;
  notes: string;
}

export interface FactoryBalance {
  id?: string;
  siteName: string;
  goodsType: string;
  openingBalance: number;
  manualConsumption: number;
}

export interface MasterData {
  drivers: string[];
  cars: string[];
  loadingSites: string[];
  unloadingSites: string[];
  goodsTypes: string[];
  orderNumbers: string[];
  contractors: string[];
  users: AppUser[];
  items?: string[];
}

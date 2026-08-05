import mongoose, { Schema, models, Model } from 'mongoose';

export interface IUser {
    _id?: string;
    email: string;
    password: string;
    name: string;
    role: 'admin' | 'user' | 'workshop';
    createdAt?: Date;
    updatedAt?: Date;
}

const UserSchema = new Schema<IUser>({
    email: { type: String, required: true, unique: true },
    password: { type: String, required: true },
    name: { type: String, required: true },
    role: { type: String, enum: ['admin', 'user', 'workshop'], default: 'user' },
}, {
    timestamps: true
});

export const User: Model<IUser> = models.User || mongoose.model<IUser>('User', UserSchema);

export interface IDeliveryOrder {
    _id?: string;
    doNumber: string;
    date: Date;
    dealerName: string;
    dealerAddress: string;
    createdAt?: Date;
    updatedAt?: Date;
}

const DeliveryOrderSchema = new Schema<IDeliveryOrder>({
    doNumber: { type: String, required: true, unique: true },
    date: { type: Date, required: true },
    dealerName: { type: String, required: true },
    dealerAddress: { type: String, required: true },
}, {
    timestamps: true
});

export const DeliveryOrder: Model<IDeliveryOrder> = models.DeliveryOrder || mongoose.model<IDeliveryOrder>('DeliveryOrder', DeliveryOrderSchema);

export interface IBike {
    _id?: string;
    model: string;
    color: string;
    engineNumber: string;
    chassisNumber: string;
    purchasePrice?: number;
    status: 'AVAILABLE' | 'SOLD';
    deliveryOrderId: mongoose.Types.ObjectId | string;
    createdAt?: Date;
    updatedAt?: Date;
}

const BikeSchema = new Schema<IBike>({
    model: { type: String, required: true },
    color: { type: String, required: true },
    engineNumber: { type: String, required: true, unique: true },
    chassisNumber: { type: String, required: true, unique: true },
    purchasePrice: { type: Number, default: 0 },
    status: { type: String, enum: ['AVAILABLE', 'SOLD'], default: 'AVAILABLE' },
    deliveryOrderId: { type: Schema.Types.ObjectId, ref: 'DeliveryOrder', required: true },
}, {
    timestamps: true
});

export const Bike: Model<IBike> = models.Bike || mongoose.model<IBike>('Bike', BikeSchema);

export interface ICustomer {
    _id?: string;
    cnic: string;
    name: string;
    fatherName?: string;
    address?: string;
    mobile?: string;
    createdAt?: Date;
    updatedAt?: Date;
}

const CustomerSchema = new Schema<ICustomer>({
    cnic: { type: String, required: true, unique: true },
    name: { type: String, required: true },
    fatherName: { type: String },
    address: { type: String },
    mobile: { type: String },
}, {
    timestamps: true
});

export const Customer: Model<ICustomer> = models.Customer || mongoose.model<ICustomer>('Customer', CustomerSchema);

export interface IPayment {
    amount: number;
    date: Date;
    note?: string;
    paymentMode?: 'CASH' | 'BANK_TRANSFER';
}

export interface ISale {
    _id?: string;
    bikeId: mongoose.Types.ObjectId | string;
    customerId: mongoose.Types.ObjectId | string;
    saleDate: Date;
    price: number;
    advanceAmount?: string;
    receivedCash?: number;
    balance?: number;
    registrationCost?: number;
    taxAmount?: number;
    paymentMode: string;
    bankTransferAmount?: number;
    receiptNumber?: string;
    receiptColour?: string;
    payments?: IPayment[];
    createdAt?: Date;
    updatedAt?: Date;
}

const PaymentSchema = new Schema<IPayment>({
    amount: { type: Number, required: true },
    date: { type: Date, default: Date.now },
    note: { type: String },
    paymentMode: { type: String, enum: ['CASH', 'BANK_TRANSFER'], default: 'CASH' },
}, { _id: false });

const SaleSchema = new Schema<ISale>({
    bikeId: { type: Schema.Types.ObjectId, ref: 'Bike', required: true, unique: true },
    customerId: { type: Schema.Types.ObjectId, ref: 'Customer', required: true },
    saleDate: { type: Date, default: Date.now },
    price: { type: Number, required: true },
    advanceAmount: { type: String, default: '' },
    receivedCash: { type: Number, default: 0 },
    balance: { type: Number, default: 0 },
    registrationCost: { type: Number },
    taxAmount: { type: Number, default: 0 },
    paymentMode: { type: String, default: 'CASH' },
    bankTransferAmount: { type: Number, default: 0 },
    receiptNumber: { type: String },
    receiptColour: { type: String },
    payments: { type: [PaymentSchema], default: [] },
}, {
    timestamps: true
});

export const Sale: Model<ISale> = models.Sale || mongoose.model<ISale>('Sale', SaleSchema);

// ── Workshop Stock ────────────────────────────────────────────────────────────
export interface IWorkshopStock {
    _id?: string;
    name: string;
    productCode?: string;
    category: string;
    retailPrice: number;
    customerPrice: number;
    quantity: number;
    createdAt?: Date;
    updatedAt?: Date;
}

const WorkshopStockSchema = new Schema<IWorkshopStock>({
    name: { type: String, required: true },
    productCode: { type: String, default: '' },
    category: { type: String, default: 'Other' },
    retailPrice: { type: Number, required: true },
    customerPrice: { type: Number, required: true },
    quantity: { type: Number, required: true, default: 0 },
}, {
    timestamps: true
});

export const WorkshopStock: Model<IWorkshopStock> = models.WorkshopStock || mongoose.model<IWorkshopStock>('WorkshopStock', WorkshopStockSchema);

// ── Service Sale ──────────────────────────────────────────────────────────────
export interface IServiceSaleItem {
    stockId: mongoose.Types.ObjectId | string;
    name: string;
    quantity: number;
    retailPrice: number;
    customerPrice: number;
}

export interface IServiceSale {
    _id?: string;
    customerName: string;
    customerMobile?: string;
    bikeNumber?: string;
    serviceType: string;
    description?: string;
    serviceCharges: number;
    items: IServiceSaleItem[];
    totalAmount: number;
    totalCost: number;
    margin: number;
    date: Date;
    createdAt?: Date;
    updatedAt?: Date;
}

const ServiceSaleItemSchema = new Schema<IServiceSaleItem>({
    stockId: { type: Schema.Types.ObjectId, ref: 'WorkshopStock' },
    name: { type: String, required: true },
    quantity: { type: Number, required: true },
    retailPrice: { type: Number, required: true },
    customerPrice: { type: Number, required: true },
}, { _id: false });

const ServiceSaleSchema = new Schema<IServiceSale>({
    customerName: { type: String, required: true },
    customerMobile: { type: String },
    bikeNumber: { type: String },
    serviceType: { type: String, required: true },
    description: { type: String },
    serviceCharges: { type: Number, default: 0 },
    items: { type: [ServiceSaleItemSchema], default: [] },
    totalAmount: { type: Number, default: 0 },
    totalCost: { type: Number, default: 0 },
    margin: { type: Number, default: 0 },
    date: { type: Date, default: Date.now },
}, {
    timestamps: true
});

export const ServiceSale: Model<IServiceSale> = models.ServiceSale || mongoose.model<IServiceSale>('ServiceSale', ServiceSaleSchema);

// ── Advance Booking ───────────────────────────────────────────────────────────
export interface IAdvanceBooking {
    _id?: string;
    customerName: string;
    customerMobile?: string;
    cnic?: string;
    bikeModel?: string;
    bikeColor?: string;
    advancePaid: number;
    totalPrice?: number;
    registrationFee?: number;
    margin?: number;
    notes?: string;
    expectedDeliveryDate?: Date;
    status: 'PENDING' | 'DELIVERED';
    date: Date;
    createdAt?: Date;
    updatedAt?: Date;
}

const AdvanceBookingSchema = new Schema<IAdvanceBooking>({
    customerName: { type: String, required: true },
    customerMobile: { type: String },
    cnic: { type: String },
    bikeModel: { type: String },
    bikeColor: { type: String },
    advancePaid: { type: Number, required: true, default: 0 },
    totalPrice: { type: Number },
    registrationFee: { type: Number, default: 0 },
    margin: { type: Number, default: 0 },
    notes: { type: String },
    expectedDeliveryDate: { type: Date },
    status: { type: String, enum: ['PENDING', 'DELIVERED'], default: 'PENDING' },
    date: { type: Date, default: Date.now },
}, { timestamps: true });

export const AdvanceBooking: Model<IAdvanceBooking> = models.AdvanceBooking || mongoose.model<IAdvanceBooking>('AdvanceBooking', AdvanceBookingSchema);

// ── Auto-increment counter ────────────────────────────────────────────────────
interface ICounter {
    _id: string;
    seq: number;
}

const CounterSchema = new Schema<ICounter>({
    _id: { type: String, required: true },
    seq: { type: Number, default: 0 },
});

export const Counter: Model<ICounter> = models.Counter || mongoose.model<ICounter>('Counter', CounterSchema);

// ── Expense ───────────────────────────────────────────────────────────────────
export interface IExpense {
    _id?: string;
    amount: number;
    description: string;
    category: string;
    deductFrom: 'MARGIN' | 'CASH' | 'WORKSHOP';
    date: Date;
    createdAt?: Date;
}

const ExpenseSchema = new Schema<IExpense>({
    amount: { type: Number, required: true },
    description: { type: String, required: true },
    category: { type: String, default: 'Other' },
    deductFrom: { type: String, enum: ['MARGIN', 'CASH', 'WORKSHOP'], required: true },
    date: { type: Date, default: Date.now },
}, { timestamps: true });

export const Expense: Model<IExpense> = models.Expense || mongoose.model<IExpense>('Expense', ExpenseSchema);

// ── Margin Collection ─────────────────────────────────────────────────────────
export interface IMarginCollection {
    _id?: string;
    amount: number;
    collectedAt: Date;
    note?: string;
}

const MarginCollectionSchema = new Schema<IMarginCollection>({
    amount: { type: Number, required: true },
    collectedAt: { type: Date, default: Date.now },
    note: { type: String },
}, { timestamps: true });

export const MarginCollection: Model<IMarginCollection> = models.MarginCollection || mongoose.model<IMarginCollection>('MarginCollection', MarginCollectionSchema);

// ── Cash Collection ───────────────────────────────────────────────────────────
export interface ICashCollection {
    _id?: string;
    amount: number;
    collectedAt: Date;
    note?: string;
}

const CashCollectionSchema = new Schema<ICashCollection>({
    amount: { type: Number, required: true },
    collectedAt: { type: Date, default: Date.now },
    note: { type: String },
}, { timestamps: true });

export const CashCollection: Model<ICashCollection> = models.CashCollection || mongoose.model<ICashCollection>('CashCollection', CashCollectionSchema);

// ── Monthly Plan ───────────────────────────────────────────────────────────────
export interface IMonthlyPlan {
    _id?: string;
    month: string; // 'YYYY-MM'
    targets: Record<string, number>; // keyed by full model name from HONDA_BIKE_MODELS
}

const MonthlyPlanSchema = new Schema<IMonthlyPlan>({
    month: { type: String, required: true, unique: true },
    targets: { type: Schema.Types.Mixed, default: {} },
}, { timestamps: true });

export const MonthlyPlan: Model<IMonthlyPlan> = models.MonthlyPlan || mongoose.model<IMonthlyPlan>('MonthlyPlan', MonthlyPlanSchema);

// ── Workshop Deposit ──────────────────────────────────────────────────────────
export interface IWorkshopDeposit {
    _id?: string;
    amount: number;
    note?: string;
    date: Date;
    createdAt?: Date;
}

const WorkshopDepositSchema = new Schema<IWorkshopDeposit>({
    amount: { type: Number, required: true },
    note: { type: String },
    date: { type: Date, default: Date.now },
}, { timestamps: true });

export const WorkshopDeposit: Model<IWorkshopDeposit> = models.WorkshopDeposit || mongoose.model<IWorkshopDeposit>('WorkshopDeposit', WorkshopDepositSchema);

// ── Khata Party ──────────────────────────────────────────────────────────────
export interface IKhataItem {
    model: string;
    quantity: number;
    pricePerUnit: number;
    standardPrice: number;
    baseMargin: number;
    totalMargin: number;
    bikeId?: mongoose.Types.ObjectId | string;
    engineNumber?: string;
    chassisNumber?: string;
}

export interface IKhataTransaction {
    _id?: string;
    date: Date;
    type: 'STOCK_GIVEN' | 'PAYMENT';
    description: string;
    amount: number;
    margin?: number;
    items?: IKhataItem[];
    paymentMode?: 'CASH' | 'BANK_TRANSFER' | 'CREDIT';
    note?: string;
}

export interface IKhataParty {
    _id?: string;
    name: string;
    mobile?: string;
    address?: string;
    notes?: string;
    transactions: IKhataTransaction[];
    createdAt?: Date;
    updatedAt?: Date;
}

const KhataTransactionSchema = new Schema<IKhataTransaction>({
    date: { type: Date, default: Date.now },
    type: { type: String, enum: ['STOCK_GIVEN', 'PAYMENT'], required: true },
    description: { type: String, required: true },
    amount: { type: Number, required: true },
    margin: { type: Number, default: 0 },
    items: [{
        model: { type: String },
        quantity: { type: Number },
        pricePerUnit: { type: Number },
        standardPrice: { type: Number },
        baseMargin: { type: Number },
        totalMargin: { type: Number },
        bikeId: { type: Schema.Types.ObjectId, ref: 'Bike' },
        engineNumber: { type: String },
        chassisNumber: { type: String },
    }],
    paymentMode: { type: String, enum: ['CASH', 'BANK_TRANSFER', 'CREDIT'] },
    note: { type: String },
});

const KhataPartySchema = new Schema<IKhataParty>({
    name: { type: String, required: true },
    mobile: { type: String },
    address: { type: String },
    notes: { type: String },
    transactions: [KhataTransactionSchema],
}, { timestamps: true });

export const KhataParty: Model<IKhataParty> = models.KhataParty || mongoose.model<IKhataParty>('KhataParty', KhataPartySchema);

// ── Used Bikes (buyback / trade-in) ─────────────────────────────────────────────
// A customer sells a previously-purchased bike back to the dealership; it's later resold.
// Purchase cost is deducted from cash or margin (same choice as an Expense); resale profit
// (soldPrice - purchasePrice) is added back into margin, and the resale amount into cash received.
export interface IUsedBike {
    _id?: string;
    model: string;
    color?: string;
    engineNumber?: string;
    chassisNumber?: string;
    sourceName?: string;
    sourceMobile?: string;
    purchasePrice: number;
    purchaseDate: Date;
    purchaseDeductFrom: 'CASH' | 'MARGIN';
    purchaseExpenseId?: mongoose.Types.ObjectId | string;
    status: 'IN_STOCK' | 'SOLD';
    soldPrice?: number;
    soldDate?: Date;
    buyerName?: string;
    notes?: string;
    createdAt?: Date;
    updatedAt?: Date;
}

const UsedBikeSchema = new Schema<IUsedBike>({
    model: { type: String, required: true },
    color: { type: String },
    engineNumber: { type: String },
    chassisNumber: { type: String },
    sourceName: { type: String },
    sourceMobile: { type: String },
    purchasePrice: { type: Number, required: true },
    purchaseDate: { type: Date, default: Date.now },
    purchaseDeductFrom: { type: String, enum: ['CASH', 'MARGIN'], required: true },
    purchaseExpenseId: { type: Schema.Types.ObjectId, ref: 'Expense' },
    status: { type: String, enum: ['IN_STOCK', 'SOLD'], default: 'IN_STOCK' },
    soldPrice: { type: Number },
    soldDate: { type: Date },
    buyerName: { type: String },
    notes: { type: String },
}, { timestamps: true });

export const UsedBike: Model<IUsedBike> = models.UsedBike || mongoose.model<IUsedBike>('UsedBike', UsedBikeSchema);

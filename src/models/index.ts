import mongoose, { Schema, models, Model } from 'mongoose';

export interface IUser {
    _id?: string;
    email: string;
    password: string;
    name: string;
    role: 'admin' | 'user';
    createdAt?: Date;
    updatedAt?: Date;
}

const UserSchema = new Schema<IUser>({
    email: { type: String, required: true, unique: true },
    password: { type: String, required: true },
    name: { type: String, required: true },
    role: { type: String, enum: ['admin', 'user'], default: 'user' },
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
    receiptNumber?: string;
    createdAt?: Date;
    updatedAt?: Date;
}

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
    receiptNumber: { type: String },
}, {
    timestamps: true
});

export const Sale: Model<ISale> = models.Sale || mongoose.model<ISale>('Sale', SaleSchema);

export interface IServiceSale {
    _id?: string;
    customerName: string;
    customerMobile?: string;
    bikeNumber?: string;
    serviceType: string;
    description?: string;
    amount: number;
    date: Date;
    createdAt?: Date;
    updatedAt?: Date;
}

const ServiceSaleSchema = new Schema<IServiceSale>({
    customerName: { type: String, required: true },
    customerMobile: { type: String },
    bikeNumber: { type: String },
    serviceType: { type: String, required: true }, // e.g., Tuning, Oil Change
    description: { type: String },
    amount: { type: Number, required: true },
    date: { type: Date, default: Date.now },
}, {
    timestamps: true
});

export const ServiceSale: Model<IServiceSale> = models.ServiceSale || mongoose.model<IServiceSale>('ServiceSale', ServiceSaleSchema);

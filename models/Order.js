import mongoose from "mongoose";

const orderSchema = new mongoose.Schema({
    userId: { type: String, required: true, ref: 'user' },
    items: [{
        product: { type: String, required: true, ref: 'product' },
        quantity: { type: Number, required: true }
    }],
    amount: { type: Number, required: true },
    address: { type: String, ref: 'address', required: true },
    status: { type: String, required: true, default: 'Order Placed' },
    date: { type: Number, required: true },
    paymentType: { type: String, required: true },
    isPaid: { type: Boolean, required: true, default: false },
})

const Order = mongoose.models.order || mongoose.model('order', orderSchema)

export default Order


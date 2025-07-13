import connectDB from "@/config/db"
import Order from "@/models/Order"
import User from "@/models/User"
import { err } from "inngest/types"
import { NextResponse } from "next/server"
import Stripe from "stripe"

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY)

export async function POST(request) {
    try {
        
        const body = await request.text()
        const sig = request.headers.get('stripe-signature')

        const event = stripe.webhooks.constructEvent(body,sig,process.env.STRIPE_WEBHOOK_SECRET)


        const handlePaymentIntent = async (paymentIntentId,isPaid) => {
            const session = await stripe.checkout.sessions.list({
                payment_intent:paymentIntentId
            })

            const { orderId, userId } = session.data[0].metadata

            await connectDB()

            if (isPaid) {
                await Order.findByIdAndUpdate(orderId,{isPaid:true})
                await User.findByIdAndUpdate(userId, {cartItems:{}})
            } else {
                await Order.findByIdAndDelete(orderId)
            }
        }


        switch (event.type) {
            case 'payment_intent.succeeded':{
                await handlePaymentIntent(event.data.object.id, true)
                break;
            }
            case 'payment_intent.canceled':{
                await handlePaymentIntent(event.data.object.id, false)
                break;
            }
            default:
                console.error(event.type)
                break;
        }

        return NextResponse.json({ received:true})

    } catch (error) {
        console.error(error)
        return NextResponse.json({message:error.message})
    }
}

export const config = {
    api: { bodyparser: false }
}
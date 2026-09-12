import { Schema, model } from "mongoose";

const subscriptionSchema = new Schema({
  subsriber: {
    type: Schema.Types.ObjectId,
    ref: "User"
  },
  channel: {
    type: Schema.Types.ObjectId,
    ref: "Video"
  }
}, { timestamps: true })

export const Subscription = model("Subscription", subscriptionSchema);
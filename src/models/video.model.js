import { Schema, model } from 'mongoose';
import mongooseAggregatePaginate from "mongoose-paginate-v2";

const videoScheema = new Schema(
  {
    videoFile: {
      type: String, //Cloudinary
      required: true
    },
    thumbnail: {
      type: String, //Cloudinary
      required: true
    },
    title: {
      type: String,
      required: true
    },
    description: {
      type: String,
      required: true
    },
    duration: {
      type: Number, //Cloudinary 
      required: true
    },
    views: {
      type: Number, 
      default: 0
    },
    isPublished: {
      type: Boolean,  
      default: true
    },
    owner: {
      type: Schema.Types.ObjectId,
      ref: "User"
    }
  },
  {
    timestamps: true
  }
)

videoScheema.plugin(mongooseAggregatePaginate)

export const Video = model("Video", videoScheema);
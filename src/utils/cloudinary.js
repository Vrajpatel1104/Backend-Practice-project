import { v2 as cloudinary } from 'cloudinary';
import fs from 'fs';


cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KRY,
  api_secret: process.env.CLOUDINARY_API_SECRET
})

export const uploadOnCloudinary = async (localFilePath) => {
  try {
    if (!localFilePath) return null;
    //Upload file on cloudinary
    const response = await cloudinary.uploader.upload(localFilePath, {
      resource_type: "auto"
    })
    //After successfuly uploading file
    fs.unlinkSync(localFilePath); // This will remove/delete files from local server. It is for cleaning purpose
    return response;
  } catch (error) {
    fs.unlinkSync(localFilePath); // This will remove/delete failed files from local server. It is for cleaning purpose 
    return null;
  }
}
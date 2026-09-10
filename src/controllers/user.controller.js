import { asyncHandler } from "../utils/asyncHandler.js";
import { ApiError } from "../utils/ApiError.js";
import { User } from "../models/user.model.js";
import { uploadOnCloudinary } from "../utils/cloudinary.js";
import { ApiResponse } from "../utils/ApiResponse.js"

export const registerUser = asyncHandler(async (req, res) => {
  //1. Get user details:
  const { fullName, email, password, username } = req.body;

  //2. Validate not empty:
  if (
    [fullName, email, password, username].some((field) => field?.trim() === "")
  ) {
    throw new ApiError(400, "All fields are required");
  }

  //3. Check if user is already exist:
  const alreadyPresent = await User.findOne({
    $or: [{username}, {email}]
  })
  if (alreadyPresent) throw new ApiError(409, "Email or Username already exist");

  //4. Check for images, check for avatar:
  const avatarLocalPath = req.files?.avatar[0]?.path;
  const coverImageLocalPath = req.files?.coverImage[0]?.path;

  if(!avatarLocalPath) throw new ApiError(400, "Avatar File is Required")

  const avatar = await uploadOnCloudinary(avatarLocalPath);
  const coverImage = await uploadOnCloudinary(coverImageLocalPath);

  if (!avatar) throw new ApiError(500, "Failed to upload Avatar due to server error")
  
  const user = await User.create({
    email: email,
    username: username.toLowerCase(),
    password: password,
    avatar: avatar?.url,
    coverImage: coverImage?.url || "",
    fullName: fullName
  })

  const createdUser = await User.findById(user._id).select(
    "-password -refreshToken" //Here we have to declare the fields which we don't want to send in response, so we are excluding password and refreshToken from the response
  )

  if (!createdUser) throw new ApiError(500, "Faild to register user");

  return res.status(201).json(
    new ApiResponse(200, createdUser, "User registered Successfully")
  )
})
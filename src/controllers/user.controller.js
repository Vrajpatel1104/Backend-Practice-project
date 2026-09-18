import { asyncHandler } from "../utils/asyncHandler.js";
import { ApiError } from "../utils/ApiError.js";
import { User } from "../models/user.model.js";
import { uploadOnCloudinary } from "../utils/cloudinary.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import jwt from "jsonwebtoken";
import mongoose from "mongoose";

export const registerUser = asyncHandler(async (req, res) => {
  //1. Get user details:
  const { fullName, email, password, username } = req.body;

  //2. Validate not empty:
  if (
    [fullName, email, password, username].some(field => field?.trim() === "")
  ) {
    throw new ApiError(400, "All fields are required");
  }

  //3. Check if user is already exist:
  const alreadyPresent = await User.findOne({
    $or: [{ username }, { email }],
  });
  if (alreadyPresent)
    throw new ApiError(409, "Email or Username already exist");

  //4. Check for images, check for avatar:
  const avatarLocalPath = req.files?.avatar[0]?.path;

  let coverImageLocalPath;
  if (
    req.files &&
    Array.isArray(req.files.coverImage) &&
    req.files.coverImage.lenght > 0
  ) {
    coverImageLocalPath = req.files?.coverImage[0]?.path;
  }

  if (!avatarLocalPath) throw new ApiError(400, "Avatar File is Required");

  const avatar = await uploadOnCloudinary(avatarLocalPath);
  const coverImage = await uploadOnCloudinary(coverImageLocalPath);

  if (!avatar)
    throw new ApiError(500, "Failed to upload Avatar due to server error");

  const user = await User.create({
    email: email,
    username: username.toLowerCase(),
    password: password,
    avatar: avatar?.url,
    coverImage: coverImage?.url || "",
    fullName: fullName,
  });

  const createdUser = await User.findById(user._id).select(
    "-password -refreshToken" //Here we have to declare the fields which we don't want to send in response, so we are excluding password and refreshToken from the response
  );

  if (!createdUser) throw new ApiError(500, "Faild to register user");

  return res
    .status(201)
    .json(new ApiResponse(200, createdUser, "User registered Successfully"));
});

// private helper function
const generateAccessAndRefreshToken = async userId => {
  const user = await User.findById(userId);
  const accessToken = await user.generateAccessToken();
  const refreshToken = await user.generateRefreshToken();

  user.refreshToken = refreshToken;
  user.save({ validateBeforeSave: false });

  return { accessToken, refreshToken };
};

export const loginUser = asyncHandler(async (req, res) => {
  //Get data from User,
  const { username, email, password } = req.body;

  if (!(username || email))
    throw new ApiError(401, "Username or Email is required");
  if (!password) throw new ApiError(401, "Password is required");

  //Find that user is exist or not
  const user = await User.findOne({
    $or: [{ username }, { email }],
  });

  //check credentials are correct
  const isPasswordCorrect = await user.isPasswordCorrect(password);
  if (
    !(user.username === username || user.email === email) ||
    !isPasswordCorrect
  )
    throw new ApiError(401, "Incorrect credentials");

  //Generate access and refresh tokens
  const { accessToken, refreshToken } = await generateAccessAndRefreshToken(
    user._id
  );

  const loggedInUser = await User.findById(user._id).select(
    "-password -refreshToken"
  );

  const options = {
    httpOnly: true,
    secure: true,
  };

  return res
    .status(200)
    .cookie("accessToken", accessToken, options)
    .cookie("refreshToken", refreshToken, options)
    .json(
      new ApiResponse(200, "Logged in successfully", {
        user: loggedInUser,
        accessToken,
        refreshToken,
      })
    );
});

export const logout = asyncHandler(async (req, res) => {
  await User.findByIdAndUpdate(
    req.user._id,
    {
      $set: {
        refreshToken: undefined,
      },
    },
    {
      new: true,
    }
  );

  const options = {
    httpOnly: true,
    secure: true,
  };

  return res
    .status(200)
    .clearCookie("accessToken", options)
    .clearCookie("refreshToken", options)
    .json(new ApiResponse(200, "User loggedout successfully"));
});

export const refreshAccessToken = asyncHandler(async (req, res) => {
  const token =
    req.cookies?.refreshToken !== "undefined"
      ? req.cookies?.refreshToken
      : req.body.refreshToken;

  if (!token) throw new ApiError(401, "Refresh token is invalid");

  const decodedToken = jwt.verify(token, process.env.REFRESH_TOKEN_SECRET);

  const user = await User.findById(decodedToken._id);

  if (!user) throw new ApiError(401, "Invalid Refresh token");

  if (user?.refreshToken !== token)
    throw new ApiError(401, "Invalid refresh token");

  const { accessToken, refreshToken } = await generateAccessAndRefreshToken(
    user._id
  );

  console.log("New Access token: ", accessToken);
  console.log("New Refresh token: ", refreshToken);

  const options = {
    httpOnly: true,
    secure: true,
  };

  return res
    .status(200)
    .cookie("accessToken", accessToken, options)
    .cookie("refreshToken", refreshToken, options)
    .json(
      new ApiResponse(200, "New tokens generated successfuly", {
        accessToken,
        refreshToken,
      })
    );
});

export const changePassword = asyncHandler(async (req, res) => {
  const { oldPassword, newPassword } = req.body;

  if (oldPassword.trim() === "" || newPassword.trim() === "")
    throw new ApiError(400, "All fields are required");

  const user = await User.findById(req.user._id);

  const isOldPasswordIsCorrect = await user.isPasswordCorrect(oldPassword);

  if (!isOldPasswordIsCorrect)
    throw new ApiError(400, "Enter valid old password");
  user.password = newPassword;
  await user.save({ validateBeforeSave: false });

  return res
    .status(200)
    .json(new ApiResponse(200, "password changed successfully"));
});

export const getUser = asyncHandler(async (req, res) => {
  return res
    .status(200)
    .json(new ApiResponse(200, "User fetched successfully", req.user));
});

export const updateUser = asyncHandler(async (req, res) => {
  const { fullName, email } = req.body;

  if (!fullName || !email) throw new ApiError(400, "All fields are required");

  const user = await User.findByIdAndUpdate(
    req.user?._id,
    {
      $set: {
        fullName,
        email,
      },
    },
    {
      new: true,
    }
  ).select("-password");

  return res
    .status(200)
    .json(new ApiResponse(200, "User updated successfully", user));
});


export const updateAvatar = asyncHandler(async (req, res) => {
  const avatarLocalFile = req.file?.path;

  if (!avatarLocalFile) throw new ApiError(400, "Avatar file is required")
  
  const avatar = await uploadOnCloudinary(avatarLocalFile);

  if (!avatar) throw new ApiError(500, "Error durring uploading avatar");

  const user = User.findByIdAndUpdate(
    req.user ?._id,
    {
      $set: {
        avatar: avatar.url,
      }
    },
    {
      new: true
    }
  ).select("-password")

  return res
    .status(200)
    .json(
      new ApiResponse(200, "Avatar updated successfully", user)
    )
})


export const updateCoverImage = asyncHandler(async (req, res) => {
  const coverImageLocalFile = req.file?.path;

  if (!coverImageLocalFile) throw new ApiError(400, "coverImage file is required")
  
  const coverImage = await uploadOnCloudinary(coverImageLocalFile);

  if (!coverImage) throw new ApiError(500, "Error durring uploading coverImage");

  const user = User.findByIdAndUpdate(
    req.user ?._id,
    {
      $set: {
        coverImage: coverImage.url,
      }
    },
    {
      new: true
    }
  ).select("-password")

  return res
    .status(200)
    .json(
      new ApiResponse(200, "coverImage updated successfully", user)
    )
})


export const getUserChannelProfile = asyncHandler(async (req, res) => {
  const { username } = req.params;

  if (!username?.trim()) throw new ApiError(400, "Username is missing");

  const channel = await User.aggregate([
    {
      $match: {
        username: username?.toLowerCase()
      }
    },
    {
      $lookup: {
        from: "subscriptions",
        localField: "_id",
        foreignField: "channel",
        as: "subscribers"
      }
    },
    {
      $lookup: {
        from: "subscriptions",
        localField: "_id",
        foreignField: "subsriber",
        as: "subscribedTo"
      }
    },
    {
      $addFields: {
        subscribersCount: {
          $size: "$subscribers"
        },
        subscribedToCount: {
          $size: "$subscribedTo"
        },
        isSubscribed: {
          $cond: {
            if: {
              $in: [req.user?._id, "$subscribers.subsriber"]
            },
            then: true,
            else: false,
          }
        }
      }
    },
    {
      $project: {
        fullName: 1,
        username: 1,
        email: 1,
        subscribersCount: 1,
        subscribedToCount: 1,
        isSubscribed: 1,
        avatar: 1,
        coverImage: 1
      }
    }
  ])

  if (!channel?.length) throw new ApiError(404, "Channel does not exist");

  return res
    .status(200)
    .json(
      new ApiResponse(200, "User's Channel Profile fetched successfuly", channel[0])
    )
})

export const getWatchHistory = asyncHandler(async (req, res) => {
  const user = await User.aggregate([
    {
      $match: {
        _id: new mongoose.Types.ObjectId(req.user._id)
      }
    },
    {
      $lookup: {
        from: "videos",
        localField: "watchHistory",
        foreignField: "_id",
        as: "watchHistory",
        pipeline: [
          {
            $lookup: {
              from: "users",
              localField: "owner",
              foreignField: "_id",
              as: "owner",
              pipeline: [
                {
                  $project: {
                    fullName: 1,
                    username: 1,
                    avatar: 1
                  }
                },
                {
                  $addFields: {
                    owner: {
                      first: "$owner"
                    }
                  }
                }
              ]
            }
          }
        ]
      }
    }
  ])

  return res
    .status(200)
    .json(
      new ApiResponse(200, "User's watch history fetched successfuly", user[0]?.watchHistory)
    )
})
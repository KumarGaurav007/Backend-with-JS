import { asyncHandler } from "../utils/asyncHandler.js";
import { ApiError } from "../utils/ApiError.js"
import { User } from "../models/user.model.js"
import { uploadOnCloudinary } from "../utils/cloudinary.js"
import { ApiResponse } from "../utils/ApiResponse.js";

const registerUser = asyncHandler(async (req, res) => {

    
    // get user details from frontend
    const { fullName, email, username, password } = req.body
    // console.log("email: ", email);
    
    // validation - not empty
    if (
        [fullName, email, username, password].some((field) =>
            field?.trim() === "")
    ) {
        throw new ApiError(400, "All fields are required")
    }
    if (!email.includes("@")) {
        throw new ApiError(400, "Invalid email")
    }
    
    // check if user already exists: username & email.
    const existedUser = await User.findOne({
        $or: [{ username }, { email }]
    })
    // console.log("existedUser : ", existedUser);
    
    if (existedUser) {
        throw new ApiError(409, "User with username or email already exists")
    }
    
    // check for images - avatar
    const avatarLocalPath = req.files?.avatar?.[0]?.path;
    // console.log("avatarLocalPath: ", avatarLocalPath)
    const coverImageLocalPath = req.files?.coverImage?.[0]?.path;
    // console.log("coverImageLocalPath: ", coverImageLocalPath)
    
    if (!avatarLocalPath) {
        throw new ApiError(400, "Avatar file is required")
    }
    
    // upload them to cloudinary, avatar 
    const avatar = await uploadOnCloudinary(avatarLocalPath)
    const coverImage = await uploadOnCloudinary(coverImageLocalPath)
    
    if (!avatar) {
        throw new ApiError(400, "Avatar file is required")
    }
    
    // create user object - create entry in db 
    const user = await User.create({
        fullName,
        avatar: avatar.url,
        coverImage: coverImage?.url || "",
        email,
        password,
        username: username.toLowerCase()
    })
    
    // remove password and refresh token feild from response
    const createUser = await User.findById(user._id).select(
        "-password -refreshtoken"
    )
    // console.log("createUser: ", createUser);
    
    // check for user creation 
    if(!createUser){
        throw new ApiError(500,"Something went wrong while registering user")
    }
    
    // return response or error 
    return res.status(201).json(
        new ApiResponse(201, createUser, "User registered sucessfully")
    )

})

export { registerUser };
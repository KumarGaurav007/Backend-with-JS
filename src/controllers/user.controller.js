import { asyncHandler } from "../utils/asyncHandler.js";
import { ApiError } from "../utils/ApiError.js"
import { User } from "../models/user.model.js"
import { uploadOnCloudinary } from "../utils/cloudinary.js"
import { ApiResponse } from "../utils/ApiResponse.js";
import jwt from "jsonwebtoken"

const generateAccessAndRefreshToken = async (userId) => {
    try {
        const user = await User.findById(userId)
        const accesToken = user.generateAccessToken()
        const refreshToken = user.generateRefreshToken()

        user.refreshtoken = refreshToken;
        await user.save({ validateBeforeSave: false })

        return { accesToken, refreshToken };

    } catch (error) {
        throw new ApiError(500, "Something went wrong while generating access & referesh tokens ")
    }
}

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
    if (!createUser) {
        throw new ApiError(500, "Something went wrong while registering user")
    }

    // return response or error 
    return res.status(201).json(
        new ApiResponse(201, createUser, "User registered sucessfully")
    )

})

const loginUser = asyncHandler(async (req, res) => {
    // reqbody - fetch data

    const { email, username, password } = req.body

    if ((!username && !email) || !password?.trim()) {
        throw new ApiError(400, "username or email and password are required")
    }

    const user = await User.findOne({
        $or: [{ username }, { email }]
    })

    if (!user) {
        throw new ApiError(404, "User does not exixt")
    }

    const ispasswordValid = await user.isPasswordCorrect(password)

    if (!ispasswordValid) {
        throw new ApiError(401, "Invalid user credentials")
    }

    const { accesToken, refreshToken } = await generateAccessAndRefreshToken(user._id)

    const loggedInUser = await User.findById(user._id).select("-password -refreshToken")

    const options = {
        httpOnly: true,
        secure: true
    }

    return res.status(200)
        .cookie("accessToken",accesToken, options)
        .cookie("refreshToken",refreshToken, options)
        .json(
            new ApiResponse(200, {
                user: loggedInUser, accesToken, refreshToken
            }, "User logged In sucessfuly")
        )


    // username or email
    // find user
    // check password
    // access & refresh token 
    // send cookie 
})

const logoutUser = asyncHandler(async (req, res) => {
    await User.findByIdAndUpdate(
        req.user._id,
        {
            $set: {
                refreshToken: undefined
            }
        },
        {
            new: true
        }

    )
    const options = {
        httpOnly: true,
        secure: true
    }

    return res
        .status(200)
        .clearCookie("accessToken", options)
        .clearCookie("refreshToken", options)
        .json(new ApiResponse(200, {}, "user logged out"))
})

const refreshAccessToken = asyncHandler(async(req,res) => {
    const incomingRefreshToken = req.cookies.refreshToken || req.body.refreshToken

    if (!incomingRefreshToken) {
        throw new ApiError(401, "Unauthorize request")
    }

    try {
        const decodedToken = jwt.verify(
            incomingRefreshToken,
            process.env.REFRESH_TOKEN_SECRET
        )
    
        const user = await User.findById(decodedToken?._id)
    
        if (!user) {
            throw new ApiError(401,"Invalid refresh token")
        }
    
        if(incomingRefreshToken !== user?.refreshToken){
            throw new ApiError(401, "Refresh token is expired or used")
        }
    
        const options = {
            httpOnly: true,
            secure: true
        }
    
        const {accesToken, refreshToken} = await generateAccessAndRefreshToken(user._id)
    
        return res.status(200)
        .cookie("accessToken", accesToken, options)
        .cookie("refreshToken", refreshToken, options)
        .json(
            new ApiResponse(
                200,
                {accessToken: accesToken, refreshToken},
                "Access token refreshed"
            )
        )
    } catch (error) {
        throw new ApiError(401, error?.message || "Invalid refresh token")
    }
})

export { registerUser, loginUser, logoutUser, refreshAccessToken };
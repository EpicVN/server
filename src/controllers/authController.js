const UserModel = require('../models/userModel');
const bcryp = require('bcrypt');
const asyncHandle = require('express-async-handler');
const jwt = require('jsonwebtoken');
const nodemailer = require('nodemailer');
require('dotenv').config();

const transporter = nodemailer.createTransport({
    host: "smtp.gmail.com",
    port: 587,
    auth: {
      user: process.env.USERNAME_EMAIL,
      pass: process.env.PASSWORD_EMAIL,
    },
});

const getJsonWebToken = async (email, id) => {
    const payload = {
        email, 
        id,
    };
    
    const token = jwt.sign(payload, process.env.SECRET_KEY, {
        expiresIn: '7d',
    });

    return token;
};

const handleSendMail = async (val) => {
    try {
        await transporter.sendMail(val);

        return "OK!";
    } catch (error) {
        return error;
    }
};

const verification = asyncHandle(async (req, res) => {
    const { email } = req.body;
    const verificationCode = Math.round(1000 + Math.random() * 9000);

    try {
        const data = {
            from: `"EventHub Application Admin" <${process.env.USERNAME_EMAIL}>`,
            to: email, 
            subject: 'Verification email code',
            html: `<h1>${verificationCode}</h1>`,
        };

        await handleSendMail(data);

        res.status(200).json({
            message: "Send verification code successfully !",
            data: {
                code: verificationCode,
            },
        })
    } catch (error) {
        res.status(401);
        throw new Error('Can not send verification email');
    }
});

const register = asyncHandle(async (req, res) => {
    const {email, name, password} = req.body;

    const existingUser = await UserModel.findOne({ email });

    if (existingUser) {
        res.status(401);
        throw new Error(`The user already exists`);
    }

    const salt = await bcryp.genSalt(10);
    const hashedPassword = await bcryp.hash(password, salt);

    const newUser = new UserModel({
        email,
        name: name ?? '',
        password: hashedPassword
    })

    await newUser.save();

    res.status(200).json({
        message: 'Your account has been successfully created',
        data: {
            email: newUser.email,
            id: newUser.id,
            accesstoken: await getJsonWebToken(email, newUser.id),
        },
    })
});

const login = asyncHandle(async (req, res) => {
    const { email, password } = req.body;

    const existingUser = await UserModel.findOne({ email });

    if (!existingUser) {
        res.status(403);
        throw new Error("user not found !");
    }

    const isMatchPassword = await bcryp.compare(password, existingUser.password);

    if (!isMatchPassword) {
        res.status(401);
        throw new Error("Email or passowrd is not correct !");
    }

    res.status(200).json({
        message: "Login successfully !",
        data: {
            id: existingUser.id,
            email: existingUser.email,
            accesstoken: await getJsonWebToken(email, existingUser.id),
        }
    });
});

const forgotPassword = asyncHandle(async(req, res) => {
    const { email } = req.body;

    const randomPassword = Math.round(100000 + Math.random() * 99000);

    const user = await UserModel.findOne({email});

    const data = {
        from: `"EventHub Application Admin" <${process.env.USERNAME_EMAIL}>`,
        to: email, 
        subject: 'New password',
        html: `<h1>${randomPassword}</h1>`,
    };

    if (user) {
        const salt = await bcryp.genSalt(10);
        const hashedPassword = await bcryp.hash(`${randomPassword}`, salt);

        await UserModel.findByIdAndUpdate(user._id, {
            password: hashedPassword,
            isChangePassword: true,
        }).then(() => {
            console.log('Reset password successfully !')
        }).catch((error) => {
            console.log(error)
        })

        await handleSendMail(data).then(() => {
            res.status(200).json({
                message: 'Send email successfully !',
                data: [],
            });
        }).catch((error) => {
            res.status(401);
            throw new Error('Can not send email !');
        })
        
    } else {
        res.status(401);
        throw new Error("Can not send email !")
    }
});

const handleLoginWithGoogle = asyncHandle(async(req, res) => {
    const userInfo = req.body;

    const existingUser = await UserModel.findOne({ email: userInfo.email });

    let user = {...userInfo};
    
    if (existingUser) {
        await UserModel.findByIdAndUpdate(existingUser.id, {
            ...userInfo,
            updatedAt: Date.now(),
        });

        user.accesstoken = await getJsonWebToken(userInfo.email, userInfo.id);

    } else {
        const newUser = new UserModel({
            email: userInfo.email,
            fullname: userInfo.name,
            ...userInfo,
        });

        await newUser.save();

        user.accesstoken = await getJsonWebToken(userInfo.email, newUser.id);
    }

    res.status(200).json({
        message: 'Login with google successfuly !',
        data: user,
    });
});

module.exports = {
    register,
    login,
    verification,
    forgotPassword,
    handleLoginWithGoogle,
}
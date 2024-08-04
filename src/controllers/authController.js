const UserModel = require('../models/userModel');
const bcryp = require('bcrypt');
const asyncHandle = require('express-async-handler');
const jwt = require('jsonwebtoken');

const getJsonWebToken = async (email, id) => {
    const payload = {
        email, 
        id,
    };
    
    const token = jwt.sign(payload, process.env.SECRET_KEY, {
        expiresIn: '7d',
    });

    return token;
}

const register = asyncHandle(async (req, res) => {
    const {email, fullname, password} = req.body;

    const existingUser = await UserModel.findOne({ email });

    if (existingUser) {
        res.status(401);
        throw new Error(`The user already exists`);
    }

    const salt = await bcryp.genSalt(10);
    const hashedPassword = await bcryp.hash(password, salt);

    const newUser = new UserModel({
        email,
        fullname: fullname ?? '',
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

module.exports = {
    register,
}
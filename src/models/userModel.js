const { mongoose, get } = require("mongoose");

const UserSchema = new mongoose.Schema({
    name: {
        type: String,
    },
    givenName: {
        type: String,
    },
    familyName: {
        type: String,
    },
    email: {
        type: String,
        require: true,
    },
    password: {
        type: String,
        require: true,
    },
    photo: {
        type: String,
    },
    createdAt: {
        type: Date,
        default: Date.now(),
        immutable: true,
    },
    updatedAt: {
        type: Date,
        default: Date.now(),
    }
});

const UserModel = mongoose.model('user', UserSchema);
module.exports = UserModel;
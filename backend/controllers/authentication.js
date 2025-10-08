const Users = require("../models/Users");
const jwt = require("jsonwebtoken")
const bcrypt = require('bcrypt');

async function createToken(id) {
    const token = await jwt.sign({ id }, process.env.SECRET_KEY, {
        expiresIn: (Number.parseInt(process.env.JWT_EXPIRE) || 2) + "d"
    })
    return token;
}

const controller = {
    async login(req, res, next) {
        console.log(req.body);
        try {
            const user = await Users.login(req.body.username, req.body.password, res)
            if (typeof user == "string") {
                return res.status(404).json({ message: user })
            }
            try {
                const token = await createToken(user._id);

                res.cookie("jwt", token, {
                    maxAge: 1000 * 60 * 60 * 24 * (Number.parseInt(process.env.JWT_EXPIRE) || 2), // default 2 days
                })

                // console.log(token);
                return res.status(200).send(token);
            } catch (error) {
                console.log(error)
                return res.status(404).json({ message: "problem to create tokens" })
            }

        } catch (error) {
            return res.status(404).json({ message: "problem to get user details", error })
        }
    },

    async checkVerify(req, res, next) {
        res.status(200).json({ message: "OK" })
    }
    ,
    async signup(req, res, next) {
        try {
            const { username, password } = req.body;
            if (!username || !password) return res.status(400).json({ message: 'username and password required' });

            // check existing user
            const existing = await Users.findOne({ username });
            if (existing) return res.status(409).json({ message: 'username already exists' });

            const salt = await bcrypt.genSalt(10);
            const hash = await bcrypt.hash(password, salt);

            const user = await Users.create({ username, password: hash });
            // don't return password
            const userObj = user.toObject();
            delete userObj.password;

            return res.status(201).json({ message: 'user created', user: userObj });
        } catch (error) {
            console.log(error);
            return res.status(500).json({ message: 'problem creating user', error: error.message });
        }
    }
}

module.exports = controller;
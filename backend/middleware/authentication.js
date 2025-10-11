const User = require('../models/Users');
const jwt = require('jsonwebtoken')


const authenticate = async (req, res, next) => {
    try {
        // Support multiple header names and cookie jwt
        const authHeader = req.headers.authorization || req.headers.authentication || null;
        let token = null;

        if (authHeader) {
            // header can be: 'Bearer <token>' or just '<token>'
            const parts = String(authHeader).trim().split(/\s+/);
            token = parts.length > 1 ? parts[parts.length - 1] : parts[0];
        } else if (req.cookies && req.cookies.jwt) {
            token = req.cookies.jwt;
        }

        if (!token) {
            return res.status(404).json({ status: 404, message: "token is not valid" });
        }

        let payload;
        try {
            payload = jwt.verify(token, process.env.SECRET_KEY);
        } catch (err) {
            return res.status(404).json({ status: 404, message: "token is not valid" });
        }

        req.user = await User.findById(payload.id);
        if (!req.user) return res.status(404).json({ status: 404, message: "user not found" });

        next();
    } catch (error) {
        console.log("error at authentication.js: ", error);
        return res.status(502).send({ message: "unexpected error at server" });
    }
}

module.exports = authenticate;
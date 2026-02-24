const { expressjwt: jwt } = require("express-jwt");
const Token = require("../models/tokenModel");

function authJwt() {
  const secret = process.env.JWT_SECRET;
  const api = process.env.API_URL;

  return jwt({
    secret,
    algorithms: ["HS256"],
    isRevoked: isRevoked,
  }).unless({
    path: [
      { url: new RegExp(`${api}/user/login/buyer(.*)`), methods: ["POST"] },
      { url: new RegExp(`${api}/user/login/seller(.*)`), methods: ["POST"] },
      { url: new RegExp(`${api}/user/register/buyer(.*)`), methods: ["POST"] },
      { url: new RegExp(`${api}/user/register/seller(.*)`), methods: ["POST"] },
      { url: /\/api-docs(.*)/, methods: ["GET"] },
      { url: /\/public\/uploads(.*)/, methods: ["GET"] },
    ],
  });
}

async function isRevoked(req, token) {
  const currentToken = req.headers.authorization?.split(" ")[1];
  if (!currentToken) return true; // no token -> block

  const savedToken = await Token.findOne({
    token: currentToken,
    status: "revoked",
  });
  if (savedToken && savedToken.status === "revoked") {
    console.log("Blocked revoked token:", currentToken);
    return true;
  }

  return false; // token is valid
}

module.exports = authJwt;

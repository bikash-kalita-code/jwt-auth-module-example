const mysql = require("mysql2/promise");
const nodemailer = require("nodemailer");

function getRndInteger(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

let connection;

async function createConnection() {
  connection = await mysql.createConnection({
    host: process.env.SQL_HOST,
    user: process.env.SQL_USER,
    database: process.env.SQL_DATABASE,
    password: process.env.SQL_PASSWORD,
  });
}
createConnection();

async function sendMail(receiver, subject, text) {
  const transporter = nodemailer.createTransport({
    service: process.env.MAIL_SERVICE,
    auth: {
      user: process.env.NODEMAIL_USER,
      pass: process.env.NODEMAIL_PASS,
    },
  });

  const option = {
    from: process.env.NODEMAIL_USER,
    to: receiver,
    subject: subject,
    text: text,
  };

  transporter.sendMail(option, function (error, info) {
    if (error) {
      console.log(error);
    } else {
      console.log("Message sent successfully");
      console.log(info);
    }
  });
}

module.exports = async function (fastify, opts) {
  fastify.get("/:email_id_or_username", async function (req, reply) {
    try {
      const { email_id_or_username } = req.params;
      const [rows, fields] = await connection.execute(
        "SELECT username, email_id FROM users WHERE username = ? OR email_id = ?",
        [email_id_or_username, email_id_or_username]
      );
      if (rows.length != 1) {
        return reply
          .code(400)
          .send({ message: "username or email does not exists" });
      } else {
        const OTP = getRndInteger(1000, 9999);
        await connection.execute(
          "UPDATE otp_table SET otp = ? WHERE username = ?",
          [OTP, rows[0].username]
        );
        await sendMail(
          rows[0].email_id,
          "Password reset OTP",
          `OTP for reseting your password is : ${OTP}`
        );
        return reply.code(200).send({ message: "OTP sent to email" });
      }
    } catch (error) {
      console.log(error);
      return reply.code(400).send({ error: error.message });
    }
  });

  fastify.post("/", async function (req, reply) {
    try {
      const { username, otp, new_password } = req.body;
      const [rows, fields] = await connection.execute(
        "SELECT username, otp FROM otp_table WHERE otp = ? AND username = ?",
        [otp, username]
      );
      console.log(rows);
      if (rows.length === 1) {
        await connection.execute(
          "UPDATE users SET password = ? WHERE username = ?",
          [new_password, username]
        );
        return reply.code(200).send({ message: "password updated" });
      }
    } catch (error) {
      return reply.code(400).send({ error: error.message });
    }
  });
};

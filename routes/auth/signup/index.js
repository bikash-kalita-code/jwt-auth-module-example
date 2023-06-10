const mysql = require("mysql2/promise");
const nodemailer = require('nodemailer');

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

async function validation(username, email_id) {
  const [rows, fields] = await connection.execute(
    "SELECT username FROM users WHERE username = ? OR email_id = ?",
    [username, email_id]
  );
}

async function insertion(username, password, email_id) {
  const [rows, fields] = await connection.execute(
    "INSERT INTO users VALUES (?, ?, ?)",
    [username, password, email_id]
  );

  await connection.execute("INSERT INTO otp_table VALUES ( ?, ? );", [
    username,
    null,
  ]);

  await sendMail(email_id, 'Account created', `Dear, ${username}, you have successfully created your account`)
}

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
  fastify.post("/", async (req, reply) => {
    try {
      const { username, password, email_id } = req.body;

      // Validation
      await validation(username, email_id);

      // Insertion
      await insertion(username, password, email_id);

      reply.code(200).send({ message: "successful" });
    } catch (error) {
      console.log(error);
      return reply.code(400).send({ error: error.message });
    }
  });
};

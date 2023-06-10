const mysql = require("mysql2/promise");

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

module.exports = async function (fastify, opts) {
  fastify.post("/", async function (req, reply) {
    try {
      const { username, password} = req.body;
      const [rows, fields] = await connection.execute(
        "SELECT * FROM users WHERE username = ? AND password = ?",
        [username, password]
      );
      console.log(rows);

      const token = fastify.jwt.sign({ username });

      return reply.code(200).send({ message: "success", token: token });
    } catch (error) {
      console.log(error);
      return reply.code(400).send({ error: error.message });
    }
  });
};

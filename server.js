const express = require('express');
const mysql = require('mysql2/promise');
const { execSync } = require('child_process');

const app = express();
app.use(express.urlencoded({ extended: true }));
app.use(express.json());

// Fetch DB credentials from SSM Parameter Store at startup
function getParam(name) {
  const cmd = `aws ssm get-parameter --name "${name}" --with-decryption --query "Parameter.Value" --output text --region ap-south-1`;
  return execSync(cmd).toString().trim();
}

let pool;

async function initDb() {
  const dbHost = getParam('/production-app/db-host');
  const dbUser = getParam('/production-app/db-user');
  const dbPassword = getParam('/production-app/db-password');
  const dbName = getParam('/production-app/db-name');

  pool = mysql.createPool({
    host: dbHost,
    user: dbUser,
    password: dbPassword,
    database: dbName,
    waitForConnections: true,
    connectionLimit: 5
  });

  // Create the notes table if it doesn't exist yet
  await pool.query(`
    CREATE TABLE IF NOT EXISTS notes (
      id INT AUTO_INCREMENT PRIMARY KEY,
      content VARCHAR(255) NOT NULL,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )
  `);
  console.log('Database connected and notes table ready.');
}

// Health check endpoint - used by the ALB target group
app.get('/health', (req, res) => res.status(200).send('OK'));

// Home page - list notes + form to add one
app.get('/', async (req, res) => {
  const [rows] = await pool.query('SELECT * FROM notes ORDER BY created_at DESC');
  const notesHtml = rows.map(n => `<li>${n.content} <small>(${n.created_at})</small></li>`).join('');
  res.send(`
    <!DOCTYPE html>
    <html>
    <head><title>Production App - Notes</title></head>
    <body>
      <h1>Notes App (EC2 + RDS + CodePipeline)</h1>
      <form method="POST" action="/notes">
        <input type="text" name="content" placeholder="Write a note..." required />
        <button type="submit">Add Note</button>
      </form>
      <ul>${notesHtml}</ul>
      <p><small>Served by instance: ${require('os').hostname()}</small></p>
    </body>
    </html>
  `);
});

// Add a note
app.post('/notes', async (req, res) => {
  await pool.query('INSERT INTO notes (content) VALUES (?)', [req.body.content]);
  res.redirect('/');
});

const PORT = 80;
initDb().then(() => {
  app.listen(PORT, () => console.log(`App running on port ${PORT}`));
}).catch(err => {
  console.error('Failed to connect to DB:', err);
  process.exit(1);
});
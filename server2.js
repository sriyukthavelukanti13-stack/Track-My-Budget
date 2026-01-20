
const express = require("express");
const multer = require("multer");
const pdfParse = require("pdf-parse");
const cors = require("cors");
const db = require("./db"); // Your MySQL connection (promise based)

const app = express();
const port = 5000;

app.use(cors());
app.use(express.json());

// Multer for in-memory PDF uploads
const storage = multer.memoryStorage();
const upload = multer({ storage: storage });

// Extract PhonePe transactions from PDF text
function extractPhonePeTransactions(text) {
  const transactions = [];
  const regex = /^([A-Za-z]{3} \d{1,2}, \d{4})\s*\r?\n\s*(\d{1,2}:\d{2}\s*[ap]m)\s*\r?\n\s*(CREDIT|DEBIT)₹([\d,]+)(.*)$/gim;
  let match;
  while ((match = regex.exec(text)) !== null) {
    transactions.push({
      date: match[1].trim(),
      time: match[2].trim(),
      type: match[3].trim(),
      amount: match[4].replace(/,/g, '').trim(),
      description: match[5].trim(),
      category: ""  // to be selected by the user
    });
  }
  return transactions;
}

// PDF upload & parsing endpoint
app.post("/upload", upload.single("pdf"), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ success: false, message: "No file uploaded." });
    }
    const pdfData = await pdfParse(req.file.buffer);
    console.log("PDF parsed, text length:", pdfData.text.length);
    console.log("Text sample:", pdfData.text.substring(0, 500));

    const transactions = extractPhonePeTransactions(pdfData.text);
    console.log(`Extracted ${transactions.length} transactions`);
    return res.json({ success: true, transactions });
  } catch (err) {
    console.error("Error processing PDF:", err);
    return res.status(500).json({ success: false, message: "Error processing PDF." });
  }
});

// Helper to convert "Feb 19, 2025 01:48 pm" → "2025-02-19"
function formatDate(dateString) {
  const dateObj = new Date(dateString);
  if (isNaN(dateObj.getTime())) {
    console.error("Invalid Date:", dateString);
    return null;
  }
  return dateObj.toISOString().split('T')[0];
}

// Bulk-insert parsed/manual transactions into MySQL using async/await
app.post("/api/transactions/save", async (req, res) => {
  try {
    const { user_id, transactions } = req.body;
    if (!user_id || !Array.isArray(transactions)) {
      return res.status(400).json({ success: false, message: "Missing user_id or transactions." });
    }

    // Map to [user_id, transaction_date, category, type, amount]
    const values = transactions.map(txn => [
      user_id,
      formatDate(txn.date),
      txn.category || "Uncategorized",
      txn.type,
      txn.amount
    ]);

    console.log("Preparing to insert:", values);

    const query = `
      INSERT INTO transactions (user_id, transaction_date, category, type, amount)
      VALUES ?
    `;
    // Use await on the promise-based query
    const [result] = await db.query(query, [values]);

    return res.json({
      success: true,
      message: "Transactions saved successfully!",
      insertedRows: result.affectedRows
    });
  } catch (err) {
    console.error("Error saving transactions:", err);
    return res.status(500).json({ success: false, message: "Error saving transactions." });
  }
});

// GET route to fetch all transactions for a user
app.get("/api/transactions/:user_id", async (req, res) => {
  const { user_id } = req.params;
  try {
    const [transactions] = await db.query("SELECT * FROM transactions WHERE user_id = ?", [user_id]);
    return res.json({ success: true, transactions });
  } catch (err) {
    console.error("Error fetching transactions:", err);
    return res.status(500).json({ success: false });
  }
});

app.listen(port, () => {
  console.log(`Transaction server running on http://localhost:${port}`);
});


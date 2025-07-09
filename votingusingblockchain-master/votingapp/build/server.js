import dotenv from 'dotenv';
import express from 'express';
import cors from 'cors';
import { ethers } from 'ethers';
import admin from 'firebase-admin';
import fs from 'fs';
import nodemailer from 'nodemailer';
import path from 'path';
import { fileURLToPath } from 'url';

dotenv.config(); // ✅ Load env vars

// Debug logs to ensure .env is working
console.log("✅ PRIVATE_KEY loaded:", process.env.PRIVATE_KEY?.slice(0, 5), "...");
console.log("✅ CONTRACT_ADDRESS:", process.env.CONTRACT_ADDRESS);
console.log("✅ BLAST_API_KEY:", process.env.BLAST_API_KEY?.slice(0, 40), "...");

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const serviceAccount = JSON.parse(fs.readFileSync('./votinginblockchain.json', 'utf8'));

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, 'dist')));
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'dist/index.html'));
});

// Firebase setup
admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
  databaseURL: process.env.DATA_URL
});
const db = admin.firestore();

// Contract ABI (shortened for demo)
const contractABI = [
  {
    "inputs": [{ "internalType": "uint256", "name": "_candidateId", "type": "uint256" }],
    "name": "vote",
    "outputs": [],
    "stateMutability": "nonpayable",
    "type": "function"
  },
  {
    "inputs": [{ "internalType": "uint256", "name": "", "type": "uint256" }],
    "name": "candidates",
    "outputs": [
      { "internalType": "uint256", "name": "id", "type": "uint256" },
      { "internalType": "string", "name": "name", "type": "string" },
      { "internalType": "uint256", "name": "voteCount", "type": "uint256" }
    ],
    "stateMutability": "view",
    "type": "function"
  }
];

// Ethereum setup
const provider = new ethers.providers.JsonRpcProvider(process.env.BLAST_API_KEY);
const signer = new ethers.Wallet(process.env.PRIVATE_KEY, provider);
const contract = new ethers.Contract(process.env.CONTRACT_ADDRESS, contractABI, signer);

// Email setup
const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS
  }
});

// Vote confirmation email
function sendVoteConfirmationEmail(toEmail, transactionHash) {
  const mailOptions = {
    from: process.env.EMAIL_USER,
    to: toEmail,
    subject: 'THANK YOU FOR YOUR VOTE 🗳️',
    html: `
      <h3>Vote Confirmation</h3>
      <p>Your vote has been recorded on the blockchain ✅</p>
      <p><b>Tx Hash:</b> ${transactionHash}</p>
      <a href="https://sepolia.etherscan.io/tx/${transactionHash}" target="_blank">View on Etherscan</a>
      <br><br><p>- Team ECI</p>
    `
  };

  transporter.sendMail(mailOptions, (error, info) => {
    if (error) console.log('❌ Email error:', error);
    else console.log('📬 Email sent:', info.response);
  });
}

// API Routes

app.get('/', (req, res) => {
  res.send('✅ Voting Backend is running');
});

app.get('/health', async (req, res) => {
  try {
    const network = await provider.getNetwork();
    const blockNumber = await provider.getBlockNumber();
    const balance = await provider.getBalance(signer.address);
    res.json({
      status: 'ok',
      chainId: network.chainId,
      network: network.name,
      address: signer.address,
      balance: ethers.utils.formatEther(balance)
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/vote', async (req, res) => {
  const { candidateId, userEmail } = req.body;
  if (!candidateId || !userEmail) return res.status(400).json({ error: "Missing fields" });

  try {
    const balance = await provider.getBalance(signer.address);
    if (balance.eq(0)) return res.status(400).json({ error: 'Insufficient ETH' });

    const gasEstimate = await contract.estimateGas.vote(candidateId);
    const tx = await contract.vote(candidateId, { gasLimit: gasEstimate.mul(120).div(100) });
    const receipt = await tx.wait();

    const istTime = new Date(Date.now() + (5.5 * 60 * 60 * 1000));
    const voteDoc = {
      userEmail,
      transactionHash: tx.hash,
      timestamp: istTime,
      blockNumber: receipt.blockNumber,
      gasUsed: receipt.gasUsed.toString()
    };

    await db.collection('votes').doc(tx.hash).set(voteDoc);
    sendVoteConfirmationEmail(userEmail, tx.hash);

    res.json({ success: true, ...voteDoc });

  } catch (err) {
    console.error('Vote Error:', err.message);
    res.status(500).json({ error: err.message });
  }
});

app.get('/votes', async (req, res) => {
  const snapshot = await db.collection('votes').get();
  const votes = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
  res.json({ success: true, votes, count: votes.length });
});

app.get('/results', async (req, res) => {
  const snapshot = await db.collection('votes').get();
  const result = {};
  snapshot.forEach(doc => {
    const id = doc.data().candidateId;
    result[id] = (result[id] || 0) + 1;
  });
  res.json({ success: true, result });
});

app.get('/vote/:txHash', async (req, res) => {
  const doc = await db.collection('votes').doc(req.params.txHash).get();
  if (!doc.exists) return res.status(404).json({ error: "Vote not found" });
  res.json({ success: true, vote: doc.data() });
});

// Start Server
app.listen(PORT, () => {
  console.log(`🚀 Server listening at http://localhost:${PORT}`);
});

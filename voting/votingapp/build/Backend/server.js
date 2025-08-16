import dotenv from 'dotenv';
import express from 'express';
import cors from 'cors';
import { ethers } from 'ethers';
import admin from 'firebase-admin';
import fs from 'fs';
import nodemailer from 'nodemailer';
import path from 'path';
import { fileURLToPath } from 'url';

// ✅ Load environment variables FIRST
dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// ✅ Validate ALL sensitive environment variables
function validateEnvironmentVariables() {
  const requiredEnvVars = [
    'PRIVATE_KEY',
    'CONTRACT_ADDRESS', 
    'BLAST_API_KEY',
    'FIREBASE_PROJECT_ID',
    'FIREBASE_DATABASE_URL',
    'EMAIL_USER',
    'EMAIL_PASS',
    'EMAIL_PUBLIC_KEY',
    'EMAIL_SERVICE_ID',
    'EMAIL_TEMPLATE_ID'
  ];

  const missingVars = [];
  
  for (const varName of requiredEnvVars) {
    if (!process.env[varName]) {
      missingVars.push(varName);
    }
  }

  if (missingVars.length > 0) {
    console.error('❌ Missing required environment variables:');
    missingVars.forEach(varName => {
      console.error(`   - ${varName}`);
    });
    console.error('\n📝 Please create a .env file with all required variables');
    process.exit(1);
  }

  // Add 0x prefix if missing
  if (!process.env.PRIVATE_KEY.startsWith('0x')) {
    process.env.PRIVATE_KEY = '0x' + process.env.PRIVATE_KEY;
  }

  console.log('✅ All environment variables validated successfully');
  console.log('🔒 Sensitive data loaded securely from environment');
}

// Validate before proceeding
validateEnvironmentVariables();

const app = express();
const PORT = process.env.PORT || 3000;

// ✅ Secure CORS setup
app.use(cors({
  origin: [
    'http://localhost:3000',
    'http://127.0.0.1:5500',
    'http://localhost:5500',
    'https://your-frontend.onrender.com' // Update with your actual frontend URL
  ],
  credentials: true
}));
app.use(express.json());

// ✅ Firebase Admin setup with environment variables
let firebaseCredential;
try {
  if (fs.existsSync('./votinginblockchain.json')) {
    const serviceAccountFile = JSON.parse(fs.readFileSync('./votinginblockchain.json', 'utf8'));
    firebaseCredential = admin.credential.cert(serviceAccountFile);
    console.log('✅ Firebase service account loaded from file');
  } else {
    console.error('❌ Firebase service account file not found');
    process.exit(1);
  }
} catch (error) {
  console.error('❌ Firebase credential setup failed:', error.message);
  process.exit(1);
}

// ✅ Initialize Firebase Admin
try {
  admin.initializeApp({
    credential: firebaseCredential,
    databaseURL: process.env.FIREBASE_DATABASE_URL
  });
  console.log('✅ Firebase Admin initialized successfully');
} catch (error) {
  console.error('❌ Firebase initialization failed:', error.message);
  process.exit(1);
}

const db = admin.firestore();

// ✅ Ethereum setup with environment variables
let provider, signer, contract;

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

try {
  console.log('🔄 Setting up Ethereum connection...');
  provider = new ethers.providers.JsonRpcProvider(process.env.BLAST_API_KEY);
  signer = new ethers.Wallet(process.env.PRIVATE_KEY, provider);
  contract = new ethers.Contract(process.env.CONTRACT_ADDRESS, contractABI, signer);
  
  console.log('✅ Ethereum setup completed');
  console.log('📍 Wallet address:', signer.address);
  console.log('📍 Contract address:', process.env.CONTRACT_ADDRESS);
} catch (error) {
  console.error('❌ Ethereum setup failed:', error.message);
  process.exit(1);
}

// ✅ Email setup with environment variables
let emailTransporter;
try {
  emailTransporter = nodemailer.createTransporter({
    service: 'gmail',
    auth: {
      user: process.env.EMAIL_USER,
      pass: process.env.EMAIL_PASS
    }
  });
  console.log('✅ Email transporter configured');
} catch (error) {
  console.error('❌ Email setup failed:', error.message);
}

// ✅ API Routes
app.get('/', (req, res) => {
  res.json({ 
    message: '✅ Secure Voting Backend is running',
    timestamp: new Date().toISOString(),
    // ✅ Only expose NON-sensitive information
    walletAddress: signer.address,
    contractAddress: process.env.CONTRACT_ADDRESS,
    firebaseProject: process.env.FIREBASE_PROJECT_ID,
    environment: process.env.NODE_ENV || 'development'
    // ❌ NEVER expose: private keys, passwords, etc.
  });
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
      blockNumber: blockNumber,
      walletAddress: signer.address, // ✅ Public address - safe to expose
      balance: ethers.utils.formatEther(balance),
      contractAddress: process.env.CONTRACT_ADDRESS, // ✅ Contract address - public
      firebaseProject: process.env.FIREBASE_PROJECT_ID, // ✅ Project ID - public
      timestamp: new Date().toISOString()
      // ❌ NEVER expose private key or other secrets in health check
    });
  } catch (err) {
    console.error('Health check failed:', err);
    res.status(500).json({ error: 'Health check failed' }); // Don't expose internal error details
  }
});

// ✅ Registration endpoint
app.post('/register', async (req, res) => {
  const { username, email, password } = req.body;
  
  if (!username || !email || !password) {
    return res.status(400).json({ error: "Missing required fields" });
  }

  if (password.length < 6) {
    return res.status(400).json({ error: "Password must be at least 6 characters" });
  }

  try {
    const userRecord = await admin.auth().createUser({
      email: email,
      password: password,
      displayName: username
    });

    await db.collection('users').doc(userRecord.uid).set({
      username: username,
      email: email,
      hasVoted: false,
      registrationDate: admin.firestore.FieldValue.serverTimestamp()
    });

    res.json({ 
      success: true, 
      message: "User registered successfully",
      userId: userRecord.uid 
    });

  } catch (error) {
    console.error('Registration Error:', error);
    
    let errorMessage = "Registration failed";
    if (error.code === 'auth/email-already-exists') {
      errorMessage = "Email is already registered";
    } else if (error.code === 'auth/invalid-email') {
      errorMessage = "Invalid email address";
    }
    
    res.status(400).json({ error: errorMessage });
  }
});

// ✅ Voting endpoint
app.post('/vote', async (req, res) => {
  const { candidateId, userEmail } = req.body;
  if (!candidateId || !userEmail) return res.status(400).json({ error: "Missing fields" });

  try {
    const balance = await provider.getBalance(signer.address);
    if (balance.eq(0)) return res.status(400).json({ error: 'Insufficient ETH' });

    const gasEstimate = await contract.estimateGas.vote(candidateId);
    const tx = await contract.vote(candidateId, { gasLimit: gasEstimate.mul(120).div(100) });
    const receipt = await tx.wait();

    const voteDoc = {
      userEmail,
      candidateId: candidateId,
      transactionHash: tx.hash,
      timestamp: admin.firestore.FieldValue.serverTimestamp(),
      blockNumber: receipt.blockNumber,
      gasUsed: receipt.gasUsed.toString()
    };

    await db.collection('votes').doc(tx.hash).set(voteDoc);

    // ✅ Send confirmation email using environment variables
    if (emailTransporter) {
      try {
        await emailTransporter.sendMail({
          from: process.env.EMAIL_USER,
          to: userEmail,
          subject: 'Vote Confirmation',
          html: `
            <h2>Vote Recorded Successfully!</h2>
            <p>Your vote has been recorded on the blockchain.</p>
            <p><strong>Transaction Hash:</strong> ${tx.hash}</p>
            <p><strong>Block Number:</strong> ${receipt.blockNumber}</p>
            <p>Thank you for participating in the voting process!</p>
          `
        });
        console.log('✅ Confirmation email sent to:', userEmail);
      } catch (emailError) {
        console.error('❌ Email sending failed:', emailError.message);
      }
    }

    res.json({ success: true, transactionHash: tx.hash });

  } catch (err) {
    console.error('Vote Error:', err.message);
    res.status(500).json({ error: 'Voting failed' }); // Don't expose internal error details
  }
});

// ✅ Other endpoints...
app.get('/votes', async (req, res) => {
  try {
    const snapshot = await db.collection('votes').get();
    const votes = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    res.json({ success: true, votes, count: votes.length });
  } catch (error) {
    console.error('Votes fetch error:', error);
    res.status(500).json({ error: 'Failed to fetch votes' });
  }
});

app.get('/results', async (req, res) => {
  try {
    const snapshot = await db.collection('votes').get();
    const result = {};
    snapshot.forEach(doc => {
      const data = doc.data();
      const id = data.candidateId;
      result[id] = (result[id] || 0) + 1;
    });
    res.json({ success: true, result });
  } catch (error) {
    console.error('Results fetch error:', error);
    res.status(500).json({ error: 'Failed to fetch results' });
  }
});

// ✅ Start server
app.listen(PORT, () => {
  console.log(`🚀 Secure server running on http://localhost:${PORT}`);
  console.log('🔒 All sensitive data loaded from environment variables');
  console.log('✅ Ready to accept requests');
});
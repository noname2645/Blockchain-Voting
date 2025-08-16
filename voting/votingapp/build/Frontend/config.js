// Frontend/config.js - SECURE VERSION (No sensitive data exposed)

// Environment detection
const getEnvironment = () => {
  const hostname = window.location.hostname;
  
  if (hostname === 'localhost' || hostname === '127.0.0.1') {
    return 'development';
  } else if (hostname.includes('onrender.com') || hostname.includes('netlify.app')) {
    return 'production';
  }
  return 'development';
};

const ENV = getEnvironment();

// ✅ ONLY PUBLIC/SAFE INFORMATION - Firebase config is safe for frontend
export const firebaseConfig = {
  apiKey: "AIzaSyBpmXMXEjYHPFFSCioOXSR5XXy1IEBWAiE", // ✅ Public - safe to expose
  authDomain: "votinginblockchain3.firebaseapp.com", // ✅ Public - safe to expose
  databaseURL: "https://votinginblockchain3-default-rtdb.asia-southeast1.firebasedatabase.app", // ✅ Public - safe to expose
  projectId: "votinginblockchain3", // ✅ Public - safe to expose
  storageBucket: "votinginblockchain3.firebasestorage.app", // ✅ Public - safe to expose
  messagingSenderId: "202093298016", // ✅ Public - safe to expose
  appId: "1:202093298016:web:527682a2d21cb4886a1e05" // ✅ Public - safe to expose
};

// ✅ CORRECTED EmailJS CONFIG - structured object
export const emailConfig = {
  publicKey: "2WrHLY6v5_920Xkwu", // ✅ Public key - safe to expose
  serviceId: "service_n4o0qlc", // ✅ Service ID - safe to expose
  templateId: "template_pcue3bk" // ✅ Template ID - safe to expose
};

// ✅ LEGACY EXPORTS for backward compatibility (if needed)
export const public_key = emailConfig.publicKey;
export const service_id = emailConfig.serviceId;
export const template_id = emailConfig.templateId;

// ✅ PUBLIC BLOCKCHAIN INFO (contract address and RPC endpoint are public)
export const CONTRACT_ADDRESS = "0xa849913cb472e0342cbB5893f9444827F36e434F"; // ✅ Contract address - public
export const BLAST_API_KEY = "https://eth-sepolia.blastapi.io/2ce6555f-b97d-49d3-8168-9d8017670e65"; // ✅ RPC endpoint - public

// ✅ BACKEND URL (no sensitive info)
export const BACKEND_URL = ENV === 'production' 
  ? 'https://blockchain-voting-6no5.onrender.com' 
  : 'http://localhost:3000';

// ❌ SENSITIVE DATA REMOVED:
// - PRIVATE_KEY (stays on backend only)
// - EMAIL_PASS (stays on backend only) 
// - Any private keys or passwords

console.log('🔧 Environment:', ENV);
console.log('🔧 Backend URL:', BACKEND_URL);
console.log('✅ Config loaded securely - no sensitive data exposed');
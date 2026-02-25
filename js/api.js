// ─── API CONFIGURATION ────────────────────────────────
// IMPORTANT: Replace this URL with your published Google Apps Script Web App URL
const API_URL = "https://script.google.com/macros/s/AKfycbzT3NBRT8atMvhoISQxdMLrtAO5ctpzVmhq5uQTXsg3llqluBl2hPYneW-I047Iaesq_w/exec";

// ─── PAYLOAD ENCRYPTION ─────────────────────────────────
function encryptPayload(data) {
  const str = JSON.stringify(data);
  const uriEncoded = encodeURIComponent(str);
  const b64 = btoa(uriEncoded);
  // Reverse string for simple obfuscation
  return b64.split('').reverse().join('');
}

function decryptResponse(str) {
  try {
    const b64 = str.split('').reverse().join('');
    const uriEncoded = atob(b64);
    const jsonStr = decodeURIComponent(uriEncoded);
    return JSON.parse(jsonStr);
  } catch(e) {
    console.error("Decryption error", e);
    return null;
  }
}

// ─── CORE API FETCHER ─────────────────────────────────
async function fetchAPI(action, payload = {}) {
  try {
    // Inject current user into payload for logging
    try {
        const u = localStorage.getItem("so_currentUser") || sessionStorage.getItem("so_currentUser");
        if(u) payload.currentUser = JSON.parse(u);
    } catch(e) {}

    const reqData = { action: action, payload: payload };
    const encryptedBody = encryptPayload(reqData);

    const response = await fetch(API_URL, {
      method: "POST",
      headers: {
        "Content-Type": "text/plain;charset=utf-8", 
      },
      body: encryptedBody,
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const textResponse = await response.text();
    let result;
    if (textResponse.trim().startsWith('{') || textResponse.trim().startsWith('[')) {
      result = JSON.parse(textResponse);
    } else {
      result = decryptResponse(textResponse);
    }
    return result;
  } catch (error) {
    console.error(`API Error (${action}):`, error);
    throw error;
  }
}

// ─── WRAPPER FUNCTIONS ────────────────────────────────
const API = {
  getSalespersons: async () => {
    return await fetchAPI("getSalespersons");
  },
  
  getProducts: async () => {
    return await fetchAPI("getProducts");
  },
  
  getThaiAddressDB: async () => {
    return await fetchAPI("getThaiAddressDB");
  },

  generateSONumber: async () => {
    return await fetchAPI("generateSONumber");
  },

  saveSaleOrder: async (payload) => {
    return await fetchAPI("saveSaleOrder", payload);
  },

  getSaleOrders: () => fetchAPI("getSaleOrders"),
  getSaleOrderForPrint: async (soNumber) => {
    return await fetchAPI("getSaleOrderForPrint", { soNumber: soNumber });
  },

  updateSaleOrderStatus: async (soNumber, status) => {
    return await fetchAPI("updateSaleOrderStatus", { soNumber: soNumber, status: status });
  },

  getSyncToken: async () => {
    return await fetchAPI("getSyncToken");
  },

  saveSalesperson: async (payload) => {
    return await fetchAPI("saveSalesperson", payload);
  },

  deleteSalesperson: async (salesId) => {
    return await fetchAPI("deleteSalesperson", { salesId: salesId });
  },

  saveProduct: async (payload) => {
    return await fetchAPI("saveProduct", payload);
  },

  deleteProduct: async (productCode) => {
    return await fetchAPI("deleteProduct", { productCode: productCode });
  }
};

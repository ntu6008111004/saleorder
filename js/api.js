// ─── API CONFIGURATION ────────────────────────────────
// IMPORTANT: Replace this URL with your published Google Apps Script Web App URL
const API_URL = "https://script.google.com/macros/s/AKfycbwH5HPC_haBUFCHAmLUKphQqRhi8Vq6vJMwGDlDQ-gEMEb0D-B8KlyflV0Yr2sjpkR1-g/exec";

// ─── CORE API FETCHER ─────────────────────────────────
async function fetchAPI(action, payload = {}) {
  try {
    const response = await fetch(API_URL, {
      method: "POST",
      headers: {
        "Content-Type": "text/plain;charset=utf-8", // text/plain to avoid CORS preflight issues
      },
      body: JSON.stringify({ action: action, payload: payload }),
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const result = await response.json();
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

  getSaleOrderForPrint: async (soNumber) => {
    return await fetchAPI("getSaleOrderForPrint", { soNumber: soNumber });
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

/**
 * Infor SyteLine ERP Connector
 * Authenticates via OAuth 2.0 (client_credentials) against the Infor ION API gateway
 * and provides helpers for procurement / invoicing / supplier data.
 */

import axios from "axios";

// Obtain an OAuth 2.0 access token from the Infor ION token endpoint.
export async function getAccessToken(config) {
  const { tokenUrl, clientId, clientSecret, scope } = config;
  if (!tokenUrl || !clientId || !clientSecret) {
    throw new Error("Infor SyteLine: tokenUrl, clientId, and clientSecret are required.");
  }

  const params = new URLSearchParams({
    grant_type: "client_credentials",
    client_id: clientId,
    client_secret: clientSecret,
    ...(scope ? { scope } : {})
  });

  const response = await axios.post(tokenUrl, params.toString(), {
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    timeout: 15000
  });

  return {
    accessToken: response.data.access_token,
    expiresIn: response.data.expires_in ?? 3600
  };
}

// Generic authenticated GET helper for the Infor ION REST API.
async function ionGet(tenantUrl, path, accessToken, params = {}) {
  const url = `${tenantUrl.replace(/\/$/, "")}${path}`;
  const response = await axios.get(url, {
    headers: { Authorization: `Bearer ${accessToken}`, Accept: "application/json" },
    params,
    timeout: 20000
  });
  return response.data;
}

// Generic authenticated POST helper.
async function ionPost(tenantUrl, path, accessToken, body) {
  const url = `${tenantUrl.replace(/\/$/, "")}${path}`;
  const response = await axios.post(url, body, {
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
      Accept: "application/json"
    },
    timeout: 20000
  });
  return response.data;
}

// Fetch open purchase orders from SyteLine.
export async function getPurchaseOrders(tenantUrl, accessToken, options = {}) {
  const { page = 1, pageSize = 50, status } = options;
  return ionGet(tenantUrl, "/api/v1/procurement/purchase-orders", accessToken, {
    page,
    pageSize,
    ...(status ? { status } : {})
  });
}

// Create a purchase order in SyteLine.
export async function createPurchaseOrder(tenantUrl, accessToken, orderData) {
  return ionPost(tenantUrl, "/api/v1/procurement/purchase-orders", accessToken, orderData);
}

// Fetch supplier list from SyteLine.
export async function getSuppliers(tenantUrl, accessToken, options = {}) {
  const { page = 1, pageSize = 50, search } = options;
  return ionGet(tenantUrl, "/api/v1/procurement/suppliers", accessToken, {
    page,
    pageSize,
    ...(search ? { search } : {})
  });
}

// Fetch invoices from SyteLine.
export async function getInvoices(tenantUrl, accessToken, options = {}) {
  const { page = 1, pageSize = 50, status, fromDate, toDate } = options;
  return ionGet(tenantUrl, "/api/v1/financials/invoices", accessToken, {
    page,
    pageSize,
    ...(status ? { status } : {}),
    ...(fromDate ? { fromDate } : {}),
    ...(toDate ? { toDate } : {})
  });
}

// Simple connectivity ping – returns true if the token endpoint and tenant are reachable.
export async function testConnection(config) {
  const tokenData = await getAccessToken(config);
  return { ok: true, expiresIn: tokenData.expiresIn };
}

/**
 * Oracle ERP Cloud Connector
 * Authenticates via OAuth 2.0 (client_credentials) against Oracle Identity Cloud Service (IDCS)
 * and provides helpers for supply chain, procurement, and financials.
 */

import axios from "axios";

// Obtain an OAuth 2.0 access token from Oracle IDCS.
export async function getAccessToken(config) {
  const { tokenUrl, clientId, clientSecret, scope } = config;
  if (!tokenUrl || !clientId || !clientSecret) {
    throw new Error("Oracle ERP: tokenUrl, clientId, and clientSecret are required.");
  }

  const credentials = Buffer.from(`${clientId}:${clientSecret}`).toString("base64");
  const params = new URLSearchParams({
    grant_type: "client_credentials",
    ...(scope ? { scope } : {})
  });

  const response = await axios.post(tokenUrl, params.toString(), {
    headers: {
      Authorization: `Basic ${credentials}`,
      "Content-Type": "application/x-www-form-urlencoded"
    },
    timeout: 15000
  });

  return {
    accessToken: response.data.access_token,
    expiresIn: response.data.expires_in ?? 3600
  };
}

// Generic authenticated GET helper for Oracle ERP Cloud REST APIs.
async function erpGet(tenantUrl, path, accessToken, params = {}) {
  const url = `${tenantUrl.replace(/\/$/, "")}${path}`;
  const response = await axios.get(url, {
    headers: {
      Authorization: `Bearer ${accessToken}`,
      Accept: "application/json"
    },
    params,
    timeout: 20000
  });
  return response.data;
}

// Generic authenticated POST helper.
async function erpPost(tenantUrl, path, accessToken, body) {
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

// Sanitize a string value for inclusion in Oracle FIQL/OData query strings.
function sanitizeQueryValue(val) {
  return String(val).replace(/['";<>\\]/g, "");
}

// Fetch purchase orders from Oracle Procurement Cloud.
export async function getPurchaseOrders(tenantUrl, accessToken, options = {}) {
  const { offset = 0, limit = 50, status, supplierName } = options;
  const queryParts = [];
  if (status) queryParts.push(`Status=${sanitizeQueryValue(status)}`);
  if (supplierName) queryParts.push(`SupplierName=${sanitizeQueryValue(supplierName)}`);
  return erpGet(
    tenantUrl,
    "/fscmRestApi/resources/11.13.18.05/purchaseOrders",
    accessToken,
    {
      offset,
      limit,
      ...(queryParts.length > 0 ? { q: queryParts.join(";") } : {})
    }
  );
}

// Create a purchase order in Oracle Procurement Cloud.
export async function createPurchaseOrder(tenantUrl, accessToken, orderData) {
  return erpPost(
    tenantUrl,
    "/fscmRestApi/resources/11.13.18.05/purchaseOrders",
    accessToken,
    orderData
  );
}

// Fetch suppliers from Oracle Supplier Model.
export async function getSuppliers(tenantUrl, accessToken, options = {}) {
  const { offset = 0, limit = 50, search } = options;
  return erpGet(tenantUrl, "/fscmRestApi/resources/11.13.18.05/suppliers", accessToken, {
    offset,
    limit,
    ...(search ? { q: `SupplierName=*${sanitizeQueryValue(search)}*` } : {})
  });
}

// Fetch invoices from Oracle Financials.
export async function getInvoices(tenantUrl, accessToken, options = {}) {
  const { offset = 0, limit = 50, status, invoiceDateFrom, invoiceDateTo } = options;
  const queryParts = [];
  if (status) queryParts.push(`InvoiceStatus=${sanitizeQueryValue(status)}`);
  if (invoiceDateFrom) queryParts.push(`InvoiceDate>=${sanitizeQueryValue(invoiceDateFrom)}`);
  if (invoiceDateTo) queryParts.push(`InvoiceDate<=${sanitizeQueryValue(invoiceDateTo)}`);
  return erpGet(
    tenantUrl,
    "/fscmRestApi/resources/11.13.18.05/invoices",
    accessToken,
    {
      offset,
      limit,
      ...(queryParts.length > 0 ? { q: queryParts.join(";") } : {})
    }
  );
}

// Fetch supply chain inventory positions.
export async function getInventoryPositions(tenantUrl, accessToken, options = {}) {
  const { offset = 0, limit = 50 } = options;
  return erpGet(
    tenantUrl,
    "/fscmRestApi/resources/11.13.18.05/inventoryBalances",
    accessToken,
    { offset, limit }
  );
}

// Simple connectivity ping.
export async function testConnection(config) {
  const tokenData = await getAccessToken(config);
  return { ok: true, expiresIn: tokenData.expiresIn };
}

/**
 * SAP ERP Connector
 * Authenticates via OAuth 2.0 (client_credentials) against the SAP Cloud Platform
 * and provides helpers for procurement, finance, and HR via OData / REST APIs.
 */

import axios from "axios";

// Obtain an OAuth 2.0 access token from SAP's token endpoint.
export async function getAccessToken(config) {
  const { tokenUrl, clientId, clientSecret, scope } = config;
  if (!tokenUrl || !clientId || !clientSecret) {
    throw new Error("SAP ERP: tokenUrl, clientId, and clientSecret are required.");
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

// Generic authenticated OData GET helper.
async function odataGet(tenantUrl, path, accessToken, params = {}) {
  const url = `${tenantUrl.replace(/\/$/, "")}${path}`;
  const response = await axios.get(url, {
    headers: {
      Authorization: `Bearer ${accessToken}`,
      Accept: "application/json"
    },
    params: { $format: "json", ...params },
    timeout: 20000
  });
  return response.data;
}

// Generic authenticated POST helper for SAP REST/OData.
async function odataPost(tenantUrl, path, accessToken, body) {
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

// Fetch purchase orders from SAP S/4HANA Procurement (OData v4).
export async function getPurchaseOrders(tenantUrl, accessToken, options = {}) {
  const { top = 50, skip = 0, filter } = options;
  return odataGet(
    tenantUrl,
    "/sap/opu/odata4/sap/api_purchase_order_2/srvd_a2x/sap/purchase_order/0001/PurchaseOrder",
    accessToken,
    {
      $top: top,
      $skip: skip,
      ...(filter ? { $filter: filter } : {})
    }
  );
}

// Create a purchase order in SAP S/4HANA.
export async function createPurchaseOrder(tenantUrl, accessToken, orderData) {
  return odataPost(
    tenantUrl,
    "/sap/opu/odata4/sap/api_purchase_order_2/srvd_a2x/sap/purchase_order/0001/PurchaseOrder",
    accessToken,
    orderData
  );
}

// Sanitize a string for safe inclusion in OData $filter expressions.
// Escapes single-quotes per the OData string literal spec.
function sanitizeODataString(val) {
  return String(val).replace(/'/g, "''");
}

// Fetch supplier master data from SAP Business Partner API.
export async function getSuppliers(tenantUrl, accessToken, options = {}) {
  const { top = 50, skip = 0, search } = options;
  return odataGet(
    tenantUrl,
    "/sap/opu/odata/sap/API_BUSINESS_PARTNER/A_Supplier",
    accessToken,
    {
      $top: top,
      $skip: skip,
      ...(search
        ? { $filter: `contains(Supplier,'${sanitizeODataString(search)}')` }
        : {})
    }
  );
}

// Fetch supplier invoices from SAP Finance.
export async function getInvoices(tenantUrl, accessToken, options = {}) {
  const { top = 50, skip = 0, filter } = options;
  return odataGet(
    tenantUrl,
    "/sap/opu/odata/sap/API_SUPPLIERINVOICE_PROCESS_SRV/A_SupplierInvoice",
    accessToken,
    {
      $top: top,
      $skip: skip,
      ...(filter ? { $filter: sanitizeODataString(filter) } : {})
    }
  );
}

// Fetch profit centers and margin data from SAP COPA / Controlling.
export async function getProfitCenters(tenantUrl, accessToken, options = {}) {
  const { top = 50, skip = 0 } = options;
  return odataGet(
    tenantUrl,
    "/sap/opu/odata/sap/API_PROFITCENTER_SRV/A_ProfitCenter",
    accessToken,
    { $top: top, $skip: skip }
  );
}

// Simple connectivity ping.
export async function testConnection(config) {
  const tokenData = await getAccessToken(config);
  return { ok: true, expiresIn: tokenData.expiresIn };
}

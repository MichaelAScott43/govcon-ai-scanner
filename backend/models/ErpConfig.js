import mongoose from "mongoose";
import crypto from "crypto";

const ALGORITHM = "aes-256-gcm";

function encrypt(text, key) {
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv(ALGORITHM, Buffer.from(key, "hex"), iv);
  const encrypted = Buffer.concat([cipher.update(text, "utf8"), cipher.final()]);
  const tag = cipher.getAuthTag();
  return iv.toString("hex") + ":" + tag.toString("hex") + ":" + encrypted.toString("hex");
}

function decrypt(payload, key) {
  const [ivHex, tagHex, encHex] = payload.split(":");
  const decipher = crypto.createDecipheriv(
    ALGORITHM,
    Buffer.from(key, "hex"),
    Buffer.from(ivHex, "hex")
  );
  decipher.setAuthTag(Buffer.from(tagHex, "hex"));
  const decrypted = Buffer.concat([
    decipher.update(Buffer.from(encHex, "hex")),
    decipher.final()
  ]);
  return decrypted.toString("utf8");
}

const erpConfigSchema = new mongoose.Schema(
  {
    system: {
      type: String,
      enum: ["infor_syteline", "oracle", "sap"],
      required: true
    },
    label: { type: String, trim: true, default: "" },
    tenantUrl: { type: String, trim: true, required: true },
    // OAuth 2.0 / API key fields stored encrypted
    clientIdEnc: { type: String, default: "" },
    clientSecretEnc: { type: String, default: "" },
    tokenUrl: { type: String, trim: true, default: "" },
    scope: { type: String, trim: true, default: "" },
    // Cached access token (short-lived)
    accessToken: { type: String, default: null },
    tokenExpiresAt: { type: Date, default: null },
    isActive: { type: Boolean, default: true },
    lastTestAt: { type: Date, default: null },
    lastTestStatus: { type: String, enum: ["ok", "error", ""], default: "" },
    lastTestMessage: { type: String, default: "" },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true }
  },
  { timestamps: true }
);

erpConfigSchema.methods.setClientId = function (plain) {
  const key = process.env.ERP_ENCRYPTION_KEY;
  if (!key) throw new Error("ERP_ENCRYPTION_KEY not configured");
  this.clientIdEnc = encrypt(plain, key);
};

erpConfigSchema.methods.getClientId = function () {
  if (!this.clientIdEnc) return "";
  const key = process.env.ERP_ENCRYPTION_KEY;
  if (!key) throw new Error("ERP_ENCRYPTION_KEY not configured");
  return decrypt(this.clientIdEnc, key);
};

erpConfigSchema.methods.setClientSecret = function (plain) {
  const key = process.env.ERP_ENCRYPTION_KEY;
  if (!key) throw new Error("ERP_ENCRYPTION_KEY not configured");
  this.clientSecretEnc = encrypt(plain, key);
};

erpConfigSchema.methods.getClientSecret = function () {
  if (!this.clientSecretEnc) return "";
  const key = process.env.ERP_ENCRYPTION_KEY;
  if (!key) throw new Error("ERP_ENCRYPTION_KEY not configured");
  return decrypt(this.clientSecretEnc, key);
};

erpConfigSchema.methods.toPublic = function () {
  return {
    id: this._id,
    system: this.system,
    label: this.label,
    tenantUrl: this.tenantUrl,
    tokenUrl: this.tokenUrl,
    scope: this.scope,
    isActive: this.isActive,
    lastTestAt: this.lastTestAt,
    lastTestStatus: this.lastTestStatus,
    lastTestMessage: this.lastTestMessage,
    createdAt: this.createdAt
  };
};

erpConfigSchema.index({ system: 1, createdBy: 1 });

const ErpConfig = mongoose.model("ErpConfig", erpConfigSchema);
export default ErpConfig;

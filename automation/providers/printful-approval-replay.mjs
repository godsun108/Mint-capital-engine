import fs from "node:fs";
import path from "node:path";
import { verifySignedApproval } from "./printful-signed-approval.mjs";

// Durable local replay ledger for an eventual trusted, single-writer service.
// Not connected to supplier submission. Never place ledger on ephemeral CI storage.
export function claimApprovalOnce({selection,approval,action,signature,verificationKey,ledgerDirectory}) {
  const decision = verifySignedApproval({selection,approval,action,signature,verificationKey});
  if (typeof ledgerDirectory !== "string" || !path.isAbsolute(ledgerDirectory))
    throw Error("absolute durable ledger directory required");
  const dir = path.resolve(ledgerDirectory);
  if (!fs.existsSync(dir) || !fs.statSync(dir).isDirectory()) throw Error("pre-provisioned ledger directory required");
  const filename = path.join(dir, approval.approvalId + ".claim");
  let fd;
  try {
    // Atomic exclusive create rejects a duplicate claim, even between processes on one filesystem.
    fd = fs.openSync(filename, "wx", 0o600);
  } catch (error) {
    if (error.code === "EEXIST") throw Error("approval replay blocked");
    throw error;
  }
  try {
    fs.writeFileSync(fd, JSON.stringify({approvalId:approval.approvalId,brand:selection.brand,
      productId:selection.productId,action,claimedAt:new Date().toISOString()}) + "\n");
    fs.fsyncSync(fd);
  } finally {
    fs.closeSync(fd);
  }
  // Crash-safe failure policy: a claim is never automatically rolled back.
  return Object.freeze({...decision,replayClaimed:true,supplierWriteEnabled:false});
}

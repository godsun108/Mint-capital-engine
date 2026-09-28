export const CONSEQUENTIAL = new Set([
  "spend_money","transfer_money","borrow","open_financial_account",
  "execute_trade","submit_certification","sign_contract","send_outbound_message",
  "publish_publicly","deploy_production","change_permissions"
]);

export function needsHumanApproval(action) {
  return CONSEQUENTIAL.has(action);
}

export function authorize({ action, approved = false, estimatedCost = 0, budgetRemaining = 0 }) {
  if (!Number.isFinite(estimatedCost) || estimatedCost < 0) return { ok:false, reason:"invalid_cost" };
  if (estimatedCost > budgetRemaining) return { ok:false, reason:"budget_exceeded" };
  if (needsHumanApproval(action) && !approved) return { ok:false, reason:"human_approval_required" };
  return { ok:true };
}

export function makeWorkOrder({ id, agent, objective, inputs = {}, actions = [], budget = 0 }) {
  if (!id || !agent || !objective) throw new Error("id, agent and objective are required");
  return {
    id, agent, objective, inputs, actions, budget,
    status:"PROPOSED", evidence:[], outputs:[], costs:[], approvals:[],
    createdAt:new Date().toISOString()
  };
}

export function economics({ settledRevenue = 0, directCost = 0, computeCost = 0, humanCost = 0 }) {
  const totalCost = directCost + computeCost + humanCost;
  return { settledRevenue, totalCost, contribution:settledRevenue-totalCost };
}

export function forgeScore({ accuracy = 0, contribution = 0, cost = 0, latencyMs = 0 }) {
  const safeLatency = Math.max(0, latencyMs) / 1000;
  return (accuracy * 100) + contribution - cost - Math.log1p(safeLatency);
}

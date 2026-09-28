export function event({id,type,producer,subject,payload={},evidence=[],requiresHumanApproval=false}){
 if(!id||!type||!producer)throw new Error("event id, type and producer required");
 return {event_id:id,type,producer,subject:subject||null,occurred_at:new Date().toISOString(),evidence,payload,requires_human_approval:requiresHumanApproval};
}
export const TYPES=Object.freeze({
 OPPORTUNITY_DISCOVERED:"opportunity.discovered",
 RESEARCH_VERIFIED:"research.verified",
 EXPERIMENT_PROPOSED:"experiment.proposed",
 ARTIFACT_BUILT:"artifact.built",
 OFFER_DRAFTED:"offer.drafted",
 APPROVAL_REQUESTED:"approval.requested",
 SETTLEMENT_VERIFIED:"settlement.verified",
 WORKFLOW_HALTED:"workflow.halted"
});

// PRESS Printful order-contract builder. Pure function: no network, no order, no spend.
export function buildPrintfulOrderContract({session,fulfillment}={}){
  if(!session?.id) throw new Error("Stripe session id required");
  if(session.payment_status!=="paid"||session.status!=="complete") throw new Error("Verified paid/complete Stripe session required");
  if(fulfillment?.kind!=="PRINTFUL_POD") throw new Error("PRINTFUL_POD fulfillment required");
  const d=session.customer_details||{}, a=d.address||{};
  const recipient={name:d.name||"",email:d.email||"",address1:a.line1||"",address2:a.line2||"",city:a.city||"",state_code:a.state||"",zip:a.postal_code||"",country_code:a.country||""};
  const missing=Object.entries(recipient).filter(([k,v])=>k!=="address2"&&!v).map(([k])=>k);
  if(missing.length) throw new Error("Missing shipping fields: "+missing.join(","));
  if(recipient.country_code!=="US") throw new Error("Current controlled launch is US-only");
  if(Number(fulfillment.catalog_product_id)!==274||Number(fulfillment.catalog_variant_id)!==9039) throw new Error("Orbital Garden pilot is pinned to Printful 274/9039");
  return Object.freeze({
    external_id:"mint-"+session.id,
    recipient,
    items:[{variant_id:9039,quantity:1,files:[{type:fulfillment.placement||"default",url:fulfillment.artwork?.url}]}],
    metadata:{mint_offer_id:session.metadata?.mint_offer_id||null,stripe_session_id:session.id,artwork_sha256:fulfillment.artwork?.sha256||null},
    safety:{create_order:false,confirm_order:false,spend:false}
  });
}

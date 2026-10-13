// Pure, side-effect-free authorization check shared by fulfillment and tests.
// Stripe payment verification is still required separately.
export function isApprovedLivePurchase(session,offer){
  return Boolean(
    session?.livemode===true &&
    session?.status==='complete' &&
    session?.payment_status==='paid' &&
    offer?.status==='ACTIVE' &&
    offer?.type==='DIGITAL_DOWNLOAD' &&
    offer?.fulfillment?.kind==='FILE' &&
    session?.metadata?.mint_offer_id===offer?.id &&
    session?.metadata?.mint_mandate_id===offer?.mandate_id &&
    Number.isSafeInteger(session?.amount_total) &&
    session.amount_total===offer?.price?.unit_amount &&
    session?.currency===offer?.price?.currency
  );
}

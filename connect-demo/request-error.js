// Isolated request-boundary error handling; deliberately has no Stripe SDK dependency.
export function handleRequestError(e,res,send){
  const missingStripeResource=e?.type==='StripeInvalidRequestError'&&e?.code==='resource_missing';
  const status=missingStripeResource?404:500;
  console.error('MINT_REQUEST_ERROR',JSON.stringify({type:e?.type||'unknown',code:e?.code||'unknown',status}));
  if(res.headersSent){res.end();return;}
  send(res,status,{error:missingStripeResource?'Stripe resource not found for the configured account and mode.':'Unexpected server error.'});
}

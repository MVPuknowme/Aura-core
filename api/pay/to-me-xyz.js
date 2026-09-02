import quoteHandler from "./quote.js";

const INVOCATION = "pay.to.me.xyz";
const DEFAULT_OPERATOR = "MVPuknowme";

export default function handler(req, res) {
  const originalJson = res.json.bind(res);

  res.json = (payload) => originalJson({
    ...payload,
    invocation: INVOCATION,
    operator: String(process.env.SKYGRID_OPERATOR || DEFAULT_OPERATOR).trim(),
    aliasFor: "/api/pay/quote",
    paymentExecution: false,
    noPaymentExecuted: true
  });

  return quoteHandler(req, res);
}

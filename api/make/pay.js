import quoteHandler from "../pay/quote.js";

const INVOCATION = "/make.pay";
const DEFAULT_OPERATOR = "MVPuknowme";

export default function handler(req, res) {
  const originalJson = res.json.bind(res);

  res.json = (payload) => originalJson({
    ...payload,
    invocation: INVOCATION,
    self: true,
    pay: true,
    operator: String(process.env.SKYGRID_OPERATOR || DEFAULT_OPERATOR).trim(),
    aliasFor: "/api/pay/quote",
    paymentExecution: false,
    noPaymentExecuted: true
  });

  return quoteHandler(req, res);
}

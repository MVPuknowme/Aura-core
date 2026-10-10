"use strict";
const { evaluateSurvivorship } = require("./policy.cjs");
const fs = require("node:fs");
const path = require("node:path");
function runPolicyTests(evaluate) {
  const base = {
    simulation:true, tenantId:"mvp-survivorship-demo", event:"death", now:1000, expiresAt:2000,
    locationConfirmed:true, jurisdiction:"US-OR", successor:"Demo successor",
    eventEvidence:true, authorityEvidence:true, recipientVerified:true, scopeConsent:true, disputeClear:true,
    approvals:["demo-reviewer-a","demo-reviewer-b"], requestedScope:"service_metadata", backupAvailable:true, revoked:false
  };
  const cases = [
    ["complete simulation", base, "eligible"],
    ["missing input", null, "hold"],
    ["non-simulation", {...base,simulation:false}, "hold"],
    ["tenant isolation", {...base,tenantId:"other"}, "hold"],
    ["revocation", {...base,revoked:true}, "revoked"],
    ["expired authority", {...base,expiresAt:1000}, "expired"],
    ["invalid time", {...base,now:NaN}, "expired"],
    ["unverified location", {...base,locationConfirmed:false}, "hold"],
    ["unknown jurisdiction", {...base,jurisdiction:"TW"}, "hold"],
    ["heartbeat is not a death event", {...base,event:"missed_heartbeat"}, "hold"],
    ["missing successor", {...base,successor:" "}, "hold"],
    ["missing event evidence", {...base,eventEvidence:false}, "hold"],
    ["missing authority", {...base,authorityEvidence:false}, "hold"],
    ["unverified recipient", {...base,recipientVerified:false}, "hold"],
    ["missing consent", {...base,scopeConsent:false}, "hold"],
    ["dispute", {...base,disputeClear:false}, "hold"],
    ["duplicate approver", {...base,approvals:["demo-reviewer-a","demo-reviewer-a"]}, "hold"],
    ["invented approvers", {...base,approvals:["x","y"]}, "hold"],
    ["overbroad scope", {...base,requestedScope:"wallet_sign"}, "hold"],
    ["incapacity", {...base,event:"incapacity"}, "eligible"],
    ["outage no succession evidence needed", {...base,event:"outage",successor:"",eventEvidence:false,approvals:[]}, "continuity"],
    ["no backup", {...base,event:"outage",backupAvailable:false}, "hold"],
    ["revoked outage", {...base,event:"outage",revoked:true}, "revoked"]
  ];
  const results=cases.map(([name,input,expected])=>{
    const actual=evaluate(input);
    if(actual.decision!==expected || actual.execution_authorized!==false || actual.legal_effect!=="none" || actual.authority_verified!==false)
      throw new Error("Failed: "+name);
    return {name,passed:true};
  });
  return {suite:"survivorship-policy",runtime:"JavaScript V8 tool isolate",total:results.length,passed:results.length,results};
}
const report = runPolicyTests(evaluateSurvivorship);
const html = fs.readFileSync(path.join(__dirname, "index.html"), "utf8");
if (!html.includes(evaluateSurvivorship.toString())) throw new Error("HTML policy differs from tested source");
console.log(JSON.stringify({...report, runtime: process.version, html_policy_parity: true}, null, 2));

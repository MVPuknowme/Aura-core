export function routePartitionDecision(envelope, pnpk) {
  const partitions = pnpk.partitions || {};
  const routeMap = {
    emergency: 'emergency',
    diagnostic: 'diagnostic',
    web3_quote: 'web3_quote',
    autodrill: 'autodrill'
  };

  const selected_partition = routeMap[envelope.route_type];

  if (!selected_partition || !partitions[selected_partition]) {
    return {
      ok: false,
      route_type: envelope.route_type,
      selected_partition: null,
      selected_ramp: null,
      selected_node_group: null,
      mode: pnpk.mode,
      sentinel: pnpk.sentinel,
      guardrails: ['fail_closed'],
      reason: 'unknown_route_type'
    };
  }

  const partition = partitions[selected_partition];

  if (!partition.allowed_ramps?.includes(envelope.requested_ramp)) {
    return {
      ok: false,
      route_type: envelope.route_type,
      selected_partition,
      selected_ramp: null,
      selected_node_group: null,
      mode: partition.mode,
      sentinel: partition.sentinel,
      guardrails: ['fail_closed'],
      reason: 'unapproved_ramp'
    };
  }

  if (!partition.allowed_nodes?.includes(envelope.requested_node)) {
    return {
      ok: false,
      route_type: envelope.route_type,
      selected_partition,
      selected_ramp: envelope.requested_ramp,
      selected_node_group: null,
      mode: partition.mode,
      sentinel: partition.sentinel,
      guardrails: ['fail_closed'],
      reason: 'unapproved_node'
    };
  }

  if (
    envelope.wallet_signing_requested ||
    envelope.transaction_broadcast_requested ||
    envelope.payment_execution_requested ||
    envelope.production_failover_requested
  ) {
    return {
      ok: false,
      route_type: envelope.route_type,
      selected_partition,
      selected_ramp: envelope.requested_ramp,
      selected_node_group: envelope.requested_node,
      mode: partition.mode,
      sentinel: partition.sentinel,
      guardrails: ['fail_closed'],
      reason: 'unsafe_action_requested'
    };
  }

  return {
    ok: true,
    route_type: envelope.route_type,
    selected_partition,
    selected_ramp: envelope.requested_ramp,
    selected_node_group: envelope.requested_node,
    mode: partition.mode,
    sentinel: partition.sentinel,
    guardrails: [
      'no_wallet_signing',
      'no_transaction_broadcast',
      'no_payment_execution',
      'fail_closed'
    ],
    reason: 'partition_route_approved'
  };
}

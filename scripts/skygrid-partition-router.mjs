export function routePartitionDecision(envelope, pnpk) {
  const partitions = pnpk.partitions || {};
  const routeMap = {
    emergency: 'emergency',
    diagnostic: 'diagnostic',
    web3_quote: 'web3_quote',
    autodrill: 'autodrill',
    capacity_lease: 'capacity_lease',
    bridge_preflight: 'bridge_preflight',
    solana_playground: 'solana_playground'
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
    partition.allowed_transports &&
    !partition.allowed_transports.includes(envelope.requested_transport)
  ) {
    return {
      ok: false,
      route_type: envelope.route_type,
      selected_partition,
      selected_ramp: envelope.requested_ramp,
      selected_node_group: envelope.requested_node,
      selected_transport: null,
      mode: partition.mode,
      sentinel: partition.sentinel,
      guardrails: ['fail_closed'],
      reason: 'unapproved_transport'
    };
  }

  if (
    envelope.wallet_signing_requested ||
    envelope.transaction_broadcast_requested ||
    envelope.payment_execution_requested ||
    envelope.production_failover_requested ||
    envelope.device_activation_requested ||
    envelope.private_data_movement_requested ||
    envelope.disk_partition_requested ||
    envelope.volume_shrink_requested ||
    envelope.partition_delete_requested ||
    envelope.system_or_boot_disk_requested ||
    envelope.gpu_enrollment_requested ||
    envelope.bridge_execution_requested ||
    envelope.program_deployment_requested ||
    envelope.os_network_switching_requested ||
    envelope.interface_reconfiguration_requested
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
    selected_transport: envelope.requested_transport || null,
    mode: partition.mode,
    sentinel: partition.sentinel,
    guardrails: [
      'no_wallet_signing',
      'no_transaction_broadcast',
      'no_payment_execution',
      'no_disk_partition_execution',
      'no_bridge_execution',
      'no_program_deployment',
      'no_os_network_switching',
      'fail_closed'
    ],
    reason: 'partition_route_approved'
  };
}

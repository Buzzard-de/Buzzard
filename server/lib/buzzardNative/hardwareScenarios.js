/**
 * Hardware scenarios. Prices UNKNOWN until quoted. No purchase.
 */
const UNKNOWN = "UNKNOWN";

function scenario(name, extra) {
  return {
    name,
    hardwareCost: UNKNOWN,
    operatingCost: UNKNOWN,
    electricityCost: UNKNOWN,
    trainingCapacity: extra.trainingCapacity,
    modelSize: extra.modelSize,
    concurrentUsers: extra.concurrentUsers,
    developmentHorizon: extra.developmentHorizon,
    purchased: false,
    quoted: false,
    ...extra,
  };
}

function hardwareScenarios() {
  return {
    live: false,
    quoted: false,
    A_current: scenario("current_hardware", {
      cpu: "host_cpu_unmeasured",
      ram: "host_ram_unmeasured",
      gpu: "none_assumed",
      vram: "none_assumed",
      ssd: "workspace_disk",
      trainingCapacity: "rule_prototypes_only",
      modelSize: "no_trained_weights",
      concurrentUsers: "in_process_dev",
      developmentHorizon: "now",
    }),
    B_local_lab: scenario("mid_local_lab", {
      cpu: "workstation_class_TBD",
      ram: "64GB+_TBD",
      gpu: "single_consumer_or_pro_TBD",
      vram: "12-24GB_TBD",
      trainingCapacity: "tiny_from_scratch_experiments",
      modelSize: "millions_of_params_TBD",
      concurrentUsers: "single_digit_local",
      developmentHorizon: "after_hardware_quote",
    }),
    C_long_term: scenario("buzzard_owned_cluster", {
      cpu: "multi_node_TBD",
      ram: "cluster_TBD",
      gpu: "multi_gpu_TBD",
      vram: "multi_TBD",
      cooling: "required",
      backupHardware: "offline_plus_immutable_TBD",
      trainingCapacity: "still_not_general_ai",
      modelSize: "not_claimed",
      concurrentUsers: "UNKNOWN",
      developmentHorizon: "multi_phase_research",
    }),
  };
}

module.exports = { hardwareScenarios };

/**
 * AES-GCM key handling. Keys never belong in git or chat.
 */
function keyRecoveryProcedure() {
  return {
    algorithm: "AES-256-GCM",
    envVar: "BUZZARD_SINAN_MEMORY_KEY",
    inGit: false,
    inChat: false,
    lossWithoutBackup: "CIPHERTEXT_UNRECOVERABLE",
    recommended: [
      "store_key_offline_sealed",
      "second_copy_in_buzzard_controlled_safe",
      "never_commit_env",
      "rotate_with_reencrypt_job_WAITING_APPROVAL",
    ],
    restoreTested: false,
    status: "CODE_READY",
  };
}

module.exports = { keyRecoveryProcedure };

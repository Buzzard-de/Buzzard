const CHANNELS = Object.freeze(["EMAIL", "ACCOUNT_PAGE", "MOBILE_TRACKING_PAGE", "SMS_FUTURE"]);

function notifyCustomer({ channel = "EMAIL", event = "UNKNOWN", verified = false } = {}) {
  const ch = CHANNELS.includes(channel) ? channel : "UNKNOWN";
  if (!verified) {
    return {
      sent: false,
      live: false,
      channel: ch,
      event,
      reason: "UNVERIFIED_TRACKING_NOT_SHOWN",
    };
  }
  return {
    sent: false,
    live: false,
    channel: ch,
    event,
    reason: "MC14_NO_LIVE_CUSTOMER_NOTIFY",
  };
}

module.exports = { CHANNELS, notifyCustomer };

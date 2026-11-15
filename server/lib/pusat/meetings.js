/**
 * Daily AI Kurmay Heyeti meeting — identity, reports, tasks, minutes, carry-over.
 */
const crypto = require("crypto");
const { getMember, createTask, CLASSIFICATION } = require("./council");

function createMeetingService() {
  const meetings = [];

  function openDaily({ chairId = "pusat", participantIds = [], date = new Date().toISOString().slice(0, 10) } = {}) {
    const participants = participantIds
      .map((id) => getMember(id))
      .filter(Boolean)
      .map((m) => ({ id: m.id, name: m.name, role: m.role }));
    if (!participants.length) {
      return { ok: false, code: "NO_PARTICIPANTS" };
    }
    const meeting = {
      id: `meet_${crypto.randomBytes(6).toString("hex")}`,
      date,
      chairId,
      participants,
      reports: [],
      decisions: [],
      tasks: [],
      carryOver: [],
      minutes: null,
      attendance: participants.map((p) => ({ id: p.id, present: true })),
      status: "OPEN",
      openedAt: new Date().toISOString(),
    };
    meetings.push(meeting);
    return { ok: true, meeting };
  }

  function report({ meetingId, speakerId, area, previousStatus, summary }) {
    const meeting = meetings.find((m) => m.id === meetingId);
    if (!meeting || meeting.status !== "OPEN") return { ok: false, code: "MEETING_CLOSED" };
    if (!meeting.participants.some((p) => p.id === speakerId)) return { ok: false, code: "NOT_A_PARTICIPANT" };
    const member = getMember(speakerId);
    meeting.reports.push({
      speakerId,
      role: member?.role,
      area: area || member?.role,
      previousStatus: previousStatus || "UNKNOWN",
      summary,
      at: new Date().toISOString(),
    });
    return { ok: true };
  }

  function decide({ meetingId, text, recordedBy = "pusat" }) {
    const meeting = meetings.find((m) => m.id === meetingId);
    if (!meeting || meeting.status !== "OPEN") return { ok: false, code: "MEETING_CLOSED" };
    meeting.decisions.push({ text, recordedBy, at: new Date().toISOString() });
    return { ok: true };
  }

  function assign({ meetingId, fromId, title, assigneeId, dueAt }) {
    const meeting = meetings.find((m) => m.id === meetingId);
    if (!meeting || meeting.status !== "OPEN") return { ok: false, code: "MEETING_CLOSED" };
    const created = createTask({
      fromId: fromId || "pusat",
      title,
      assigneeId,
      dueAt,
      classification: CLASSIFICATION.SHARED,
    });
    if (!created.ok) return created;
    meeting.tasks.push(created.task);
    return created;
  }

  function close({ meetingId }) {
    const meeting = meetings.find((m) => m.id === meetingId);
    if (!meeting) return { ok: false, code: "NOT_FOUND" };
    const openTasks = meeting.tasks.filter((t) => t.status !== "DONE");
    meeting.carryOver = openTasks.map((t) => ({ taskId: t.id, title: t.title, assigneeId: t.assigneeId }));
    meeting.minutes = {
      date: meeting.date,
      participants: meeting.participants,
      reports: meeting.reports,
      decisions: meeting.decisions,
      tasks: meeting.tasks,
      carryOver: meeting.carryOver,
      closedAt: new Date().toISOString(),
    };
    meeting.status = "CLOSED";
    return { ok: true, minutes: meeting.minutes };
  }

  function carryIntoNext(previousId, nextIds) {
    const previous = meetings.find((m) => m.id === previousId);
    const next = openDaily({ participantIds: nextIds, date: new Date().toISOString().slice(0, 10) });
    if (!next.ok) return next;
    next.meeting.carryOver = previous?.carryOver || [];
    return next;
  }

  return {
    openDaily,
    report,
    decide,
    assign,
    close,
    carryIntoNext,
    list: () => meetings.map((m) => ({ id: m.id, date: m.date, status: m.status })),
    get: (id) => meetings.find((m) => m.id === id) || null,
  };
}

module.exports = { createMeetingService };

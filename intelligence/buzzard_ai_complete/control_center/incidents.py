class IncidentManager:
    def __init__(self):
        self.incidents = []

    def open(self, severity, title, details=None):
        incident = {
            "id": len(self.incidents) + 1,
            "severity": severity,
            "title": title,
            "details": details or {},
            "status": "OPEN",
        }
        self.incidents.append(incident)
        return incident

    def close(self, incident_id):
        for incident in self.incidents:
            if incident["id"] == incident_id:
                incident["status"] = "CLOSED"
                return incident
        return None

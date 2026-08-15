import json


class SnapshotStore:
    def dump(self, state):
        return json.dumps(state, sort_keys=True, ensure_ascii=False)

    def load(self, payload):
        return json.loads(payload)

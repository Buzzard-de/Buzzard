import json


def to_json(snapshot):
    return json.dumps(snapshot, ensure_ascii=False, sort_keys=True)


def to_dict(snapshot):
    return dict(snapshot)

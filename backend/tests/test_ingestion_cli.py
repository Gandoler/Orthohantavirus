from services.data_ingestion.__main__ import to_jsonl


def test_to_jsonl() -> None:
    payload = to_jsonl([{"a": 1}, {"b": "two"}])

    assert payload == b'{"a":1}\n{"b":"two"}\n'

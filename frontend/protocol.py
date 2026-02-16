import json

def parse(raw: str) -> dict:
    msg = json.loads(raw)
    if "type" not in msg or "data" not in msg:
        raise ValueError("Formato inválido. Usa {type, data}")
    return msg

def make(type_: str, data: dict) -> str:
    return json.dumps({"type": type_, "data": data}, ensure_ascii=False)

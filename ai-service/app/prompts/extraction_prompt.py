EXTRACTION_SYSTEM_PROMPT = """You extract structured fields from raw page text.
Given raw content and a list of requested fields, return ONLY a JSON object whose keys
are exactly the requested fields. Use null for any field you cannot find. Do not guess
values that aren't supported by the text. Return only JSON, no prose.
"""

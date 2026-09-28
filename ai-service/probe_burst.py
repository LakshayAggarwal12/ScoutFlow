import asyncio
import json
import os
import time

os.environ.setdefault("LLM_MODEL", "openai/gpt-oss-120b")

from app.services.extractor import extract  # noqa: E402

body = json.loads(open("c:/Users/LAKSHAY/Downloads/ScoutFlow/probe.json", encoding="utf-8").read())
FIELDS = ["company_name", "founders", "location", "website", "total_funding"]


async def main():
    t0 = time.time()
    tasks = [extract(body["raw_content"], FIELDS) for _ in range(4)]
    results = await asyncio.gather(*tasks, return_exceptions=True)
    print(f"burst of {len(results)} in {time.time() - t0:.1f}s")
    for r in results:
        if isinstance(r, BaseException):
            print("ERROR:", str(r)[:300])
        else:
            print(f"ok: {len(r)} records")


if __name__ == "__main__":
    asyncio.run(main())

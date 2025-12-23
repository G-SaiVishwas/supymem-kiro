import asyncio
from src.integrations.slack.bot import start_slack_bot

if __name__ == "__main__":
    asyncio.run(start_slack_bot())

from typing import Dict, Any, List, Optional
import re

from src.agents.knowledge_agent import query_agent
from src.vectors.embeddings import embedding_service
from src.vectors.qdrant_client import vector_store
from src.config.logging import get_logger

logger = get_logger(__name__)


async def handle_query(
    text: str,
    user_id: str,
    team_id: str,
    thread_id: Optional[str] = None,
) -> str:
    """Handle a knowledge query from Slack."""
    try:
        response = await query_agent(
            message=text,
            user_id=user_id,
            team_id=team_id,
            thread_id=thread_id or "default",
        )
        return response
    except Exception as e:
        logger.error("Query handling failed", error=str(e))
        return "Sorry, I encountered an error processing your query."


async def handle_remember(
    text: str,
    user_id: str,
    team_id: str,
    source: str = "slack",
) -> str:
    """Store knowledge from Slack."""
    try:
        embeddings = await embedding_service.embed(text)
        await vector_store.insert(
            vectors=embeddings,
            payloads=[{
                "content": text,
                "source": source,
                "team_id": team_id,
                "user_id": user_id,
            }]
        )
        return f"Got it! I'll remember: _{text}_"
    except Exception as e:
        logger.error("Remember handling failed", error=str(e))
        return "Sorry, I couldn't store that information."


async def handle_search(
    query: str,
    team_id: str,
    limit: int = 5,
) -> List[Dict[str, Any]]:
    """Search knowledge from Slack."""
    try:
        embeddings = await embedding_service.embed(query)
        results = await vector_store.search(
            query_vector=embeddings[0],
            limit=limit,
            filters={"team_id": team_id},
        )
        return results
    except Exception as e:
        logger.error("Search handling failed", error=str(e))
        return []


def format_search_results(results: List[Dict[str, Any]]) -> str:
    """Format search results for Slack display."""
    if not results:
        return "No results found."

    formatted = []
    for i, r in enumerate(results, 1):
        content = r.get("payload", {}).get("content", "")
        source = r.get("payload", {}).get("source", "unknown")
        score = r.get("score", 0)
        formatted.append(f"{i}. [{source}] {content[:200]}... (score: {score:.2f})")

    return "\n".join(formatted)


def extract_code_blocks(text: str) -> List[str]:
    """Extract code blocks from message text."""
    pattern = r"```(?:\w+)?\n(.*?)```"
    return re.findall(pattern, text, re.DOTALL)


def extract_mentions(text: str) -> List[str]:
    """Extract user mentions from message text."""
    pattern = r"<@([A-Z0-9]+)>"
    return re.findall(pattern, text)


def extract_channels(text: str) -> List[str]:
    """Extract channel mentions from message text."""
    pattern = r"<#([A-Z0-9]+)\|[^>]+>"
    return re.findall(pattern, text)


def extract_urls(text: str) -> List[str]:
    """Extract URLs from message text."""
    pattern = r"<(https?://[^|>]+)(?:\|[^>]+)?>"
    return re.findall(pattern, text)


def clean_slack_text(text: str) -> str:
    """Clean Slack formatting from text."""
    # Remove user mentions
    text = re.sub(r"<@[A-Z0-9]+>", "", text)
    # Remove channel mentions but keep channel name
    text = re.sub(r"<#[A-Z0-9]+\|([^>]+)>", r"#\1", text)
    # Extract URL text
    text = re.sub(r"<(https?://[^|>]+)(?:\|([^>]+))?>", r"\2" if r"\2" else r"\1", text)
    # Remove extra whitespace
    text = " ".join(text.split())
    return text.strip()


async def handle_help() -> str:
    """Return help message."""
    return """*Supymem Commands:*

*Queries:*
- `@supymem [question]` - Ask me anything about your team's knowledge
- `/supymem [question]` - Same as above, but ephemeral

*Knowledge Management:*
- `/remember [information]` - Store new knowledge
- `/search [query]` - Search the knowledge base

*Examples:*
- `@supymem What's our deployment process?`
- `/remember Our API rate limit is 100 requests per minute`
- `/search authentication flow`

I learn from your conversations and can help answer questions based on stored knowledge."""

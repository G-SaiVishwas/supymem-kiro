"""
Extractors for decisions, action items, and other structured data from content.
"""

from typing import Dict, List, Optional, Any
from dataclasses import dataclass
import json

from src.llm.client import llm_client
from src.config.logging import get_logger

logger = get_logger(__name__)


@dataclass
class ExtractedDecision:
    """Extracted decision from content."""
    title: str
    summary: str
    reasoning: str  # The "why" behind the decision
    alternatives_considered: List[Dict[str, Any]]  # [{option, pros, cons, rejected_reason}]
    context: str
    impact: str
    decided_by: Optional[str]
    participants: List[str]
    affected_files: List[str]
    affected_components: List[str]
    category: str  # architecture, process, tooling, feature
    importance: str  # low, medium, high, critical
    confidence: float


@dataclass
class ExtractedActionItem:
    """Extracted action item from content."""
    title: str
    description: str
    assigned_to: Optional[str]
    priority: str  # low, medium, high, urgent
    due_date: Optional[str]
    depends_on: List[str]
    context: str
    confidence: float


DECISION_EXTRACTION_PROMPT = """You are an expert at extracting decisions from software development discussions.

A DECISION is when someone makes a choice about HOW to do something, with reasoning. 
Look for:
- "We decided to...", "We're going with...", "The solution is..."
- Choices between alternatives
- Architecture decisions
- Process changes
- Tool selections

Analyze this content and extract any decisions made:

SOURCE: {source}
CONTENT:
---
{content}
---

If a decision is found, respond with JSON:
{{
    "has_decision": true,
    "decision": {{
        "title": "Brief title of the decision",
        "summary": "One paragraph summary",
        "reasoning": "Why this decision was made - the key reasons",
        "alternatives_considered": [
            {{
                "option": "Alternative option",
                "pros": ["pro1", "pro2"],
                "cons": ["con1"],
                "rejected_reason": "Why not chosen"
            }}
        ],
        "context": "Background context that led to this decision",
        "impact": "Expected impact of this decision",
        "decided_by": "Person who made/announced the decision or null",
        "participants": ["People involved in discussion"],
        "affected_files": ["Affected file paths if mentioned"],
        "affected_components": ["Affected systems/components"],
        "category": "architecture|process|tooling|feature|infrastructure|security|other",
        "importance": "low|medium|high|critical"
    }},
    "confidence": 0.0-1.0
}}

If NO decision is found:
{{
    "has_decision": false,
    "reason": "Why no decision was found"
}}

Respond ONLY with JSON."""


ACTION_EXTRACTION_PROMPT = """You are an expert at extracting action items from software development discussions.

An ACTION ITEM is something that needs to be done by someone. Look for:
- "TODO", "Need to...", "Should...", "Will..."
- Assignments: "@person please...", "Can you..."
- Follow-ups mentioned
- Tasks discussed

Analyze this content and extract action items:

SOURCE: {source}
CONTENT:
---
{content}
---

Respond with JSON:
{{
    "action_items": [
        {{
            "title": "Brief action title",
            "description": "Detailed description",
            "assigned_to": "Person assigned or null",
            "priority": "low|medium|high|urgent",
            "due_date": "Mentioned due date or null",
            "depends_on": ["Dependencies if mentioned"],
            "context": "Context from the discussion"
        }}
    ],
    "has_action_items": true/false
}}

If no action items found, return {{"action_items": [], "has_action_items": false}}

Respond ONLY with JSON."""


class DecisionExtractor:
    """Extracts decisions from content."""

    def __init__(self):
        self.llm = llm_client

    async def extract(
        self,
        content: str,
        source: str = "unknown",
        context: Optional[Dict[str, Any]] = None
    ) -> Optional[ExtractedDecision]:
        """
        Extract a decision from content.
        
        Returns:
            ExtractedDecision if found, None otherwise
        """
        try:
            prompt = DECISION_EXTRACTION_PROMPT.format(
                source=source,
                content=content[:5000]
            )

            response = await self.llm.complete(
                messages=[
                    {"role": "system", "content": "You extract decisions accurately. Always respond with valid JSON."},
                    {"role": "user", "content": prompt}
                ],
                temperature=0.1,
                max_tokens=1500
            )

            data = self._parse_json(response)
            
            if not data.get("has_decision"):
                return None

            decision_data = data.get("decision", {})
            
            result = ExtractedDecision(
                title=decision_data.get("title", ""),
                summary=decision_data.get("summary", ""),
                reasoning=decision_data.get("reasoning", ""),
                alternatives_considered=decision_data.get("alternatives_considered", []),
                context=decision_data.get("context", ""),
                impact=decision_data.get("impact", ""),
                decided_by=decision_data.get("decided_by"),
                participants=decision_data.get("participants", []),
                affected_files=decision_data.get("affected_files", []),
                affected_components=decision_data.get("affected_components", []),
                category=decision_data.get("category", "other"),
                importance=decision_data.get("importance", "medium"),
                confidence=float(data.get("confidence", 0.5))
            )

            logger.info(
                "Decision extracted",
                title=result.title[:50],
                category=result.category,
                importance=result.importance
            )

            return result

        except Exception as e:
            logger.error("Decision extraction failed", error=str(e))
            return None

    async def extract_from_pr(
        self,
        pr_title: str,
        pr_body: str,
        pr_author: str,
        pr_comments: Optional[List[str]] = None
    ) -> Optional[ExtractedDecision]:
        """
        Extract decision from a PR with enhanced context.
        """
        content = f"""
Pull Request: {pr_title}
Author: {pr_author}

Description:
{pr_body}
"""
        if pr_comments:
            content += "\n\nDiscussion:\n" + "\n---\n".join(pr_comments[:5])

        result = await self.extract(content, source="github_pr")
        
        if result and not result.decided_by:
            result.decided_by = pr_author
            
        return result

    def _parse_json(self, response: str) -> Dict:
        """Parse JSON from LLM response."""
        response = response.strip()
        if response.startswith("```"):
            lines = response.split("\n")
            response = "\n".join(lines[1:-1] if lines[-1] == "```" else lines[1:])
        
        try:
            return json.loads(response)
        except json.JSONDecodeError:
            import re
            json_match = re.search(r'\{.*\}', response, re.DOTALL)
            if json_match:
                return json.loads(json_match.group())
            return {"has_decision": False}


class ActionItemExtractor:
    """Extracts action items from content."""

    def __init__(self):
        self.llm = llm_client

    async def extract(
        self,
        content: str,
        source: str = "unknown",
        context: Optional[Dict[str, Any]] = None
    ) -> List[ExtractedActionItem]:
        """
        Extract action items from content.
        
        Returns:
            List of ExtractedActionItem
        """
        try:
            prompt = ACTION_EXTRACTION_PROMPT.format(
                source=source,
                content=content[:5000]
            )

            response = await self.llm.complete(
                messages=[
                    {"role": "system", "content": "You extract action items accurately. Always respond with valid JSON."},
                    {"role": "user", "content": prompt}
                ],
                temperature=0.1,
                max_tokens=1500
            )

            data = self._parse_json(response)
            
            if not data.get("has_action_items"):
                return []

            results = []
            for item_data in data.get("action_items", []):
                item = ExtractedActionItem(
                    title=item_data.get("title", ""),
                    description=item_data.get("description", ""),
                    assigned_to=item_data.get("assigned_to"),
                    priority=item_data.get("priority", "medium"),
                    due_date=item_data.get("due_date"),
                    depends_on=item_data.get("depends_on", []),
                    context=item_data.get("context", ""),
                    confidence=0.7
                )
                results.append(item)

            logger.info("Action items extracted", count=len(results))
            return results

        except Exception as e:
            logger.error("Action item extraction failed", error=str(e))
            return []

    def _parse_json(self, response: str) -> Dict:
        """Parse JSON from LLM response."""
        response = response.strip()
        if response.startswith("```"):
            lines = response.split("\n")
            response = "\n".join(lines[1:-1] if lines[-1] == "```" else lines[1:])
        
        try:
            return json.loads(response)
        except json.JSONDecodeError:
            import re
            json_match = re.search(r'\{.*\}', response, re.DOTALL)
            if json_match:
                return json.loads(json_match.group())
            return {"has_action_items": False, "action_items": []}


# Singleton instances
decision_extractor = DecisionExtractor()
action_extractor = ActionItemExtractor()


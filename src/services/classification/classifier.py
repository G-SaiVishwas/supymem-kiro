"""
Content Classification Engine

Classifies incoming content into categories:
- task: Action items, to-dos, assignments
- decision: Choices made with reasoning
- instruction: Guidelines, how-tos, processes
- note: General information, observations
- dependency: External dependencies, blockers
- prospect: Future ideas, proposals
- discussion: Conversations, debates
- announcement: News, updates, releases
- question: Queries needing answers
"""

from typing import Dict, List, Optional, Any
from dataclasses import dataclass
from enum import Enum
import json

from src.llm.client import llm_client
from src.config.logging import get_logger

logger = get_logger(__name__)


class ContentCategory(str, Enum):
    TASK = "task"
    DECISION = "decision"
    INSTRUCTION = "instruction"
    NOTE = "note"
    DEPENDENCY = "dependency"
    PROSPECT = "prospect"
    DISCUSSION = "discussion"
    ANNOUNCEMENT = "announcement"
    QUESTION = "question"
    OTHER = "other"


@dataclass
class ClassificationResult:
    """Result of content classification."""
    category: ContentCategory
    subcategory: Optional[str]
    confidence: float
    importance_score: float  # 0-1
    is_actionable: bool
    extracted_entities: Dict[str, List[str]]  # {people: [], files: [], concepts: []}
    summary: str
    reasoning: str


CLASSIFICATION_PROMPT = """You are a content classification expert for a software development team's knowledge system.

Analyze the following content and classify it according to these categories:

CATEGORIES:
- task: Action items, to-dos, work assignments, things that need to be done
- decision: Choices that have been made, with reasoning or justification
- instruction: Guidelines, how-tos, processes, documentation
- note: General information, observations, context
- dependency: External dependencies, blockers, waiting on something
- prospect: Future ideas, proposals, things to consider later
- discussion: Ongoing conversations, debates, back-and-forth
- announcement: News, updates, releases, important notices
- question: Queries needing answers, clarification requests
- other: Doesn't fit other categories

Respond with a JSON object containing:
{{
    "category": "<category from list above>",
    "subcategory": "<more specific subcategory or null>",
    "confidence": <0.0-1.0>,
    "importance_score": <0.0-1.0, how important is this>,
    "is_actionable": <true/false, does this require someone to take action>,
    "entities": {{
        "people": ["<mentioned people/usernames>"],
        "files": ["<mentioned file paths>"],
        "concepts": ["<key technical concepts>"],
        "projects": ["<mentioned projects/repos>"]
    }},
    "summary": "<one sentence summary>",
    "reasoning": "<brief explanation of classification>"
}}

CONTENT SOURCE: {source}
CONTENT:
---
{content}
---

Respond ONLY with the JSON object, no other text."""


class ContentClassifier:
    """Classifies content into categories using LLM."""

    def __init__(self):
        self.llm = llm_client

    async def classify(
        self,
        content: str,
        source: str = "unknown",
        context: Optional[Dict[str, Any]] = None
    ) -> ClassificationResult:
        """
        Classify content into a category.
        
        Args:
            content: The text content to classify
            source: Source of the content (github_pr, slack, api, etc.)
            context: Additional context (author, channel, repo, etc.)
        
        Returns:
            ClassificationResult with category and metadata
        """
        try:
            prompt = CLASSIFICATION_PROMPT.format(
                source=source,
                content=content[:4000]  # Limit content length
            )

            response = await self.llm.complete(
                messages=[
                    {"role": "system", "content": "You are a precise content classifier. Always respond with valid JSON."},
                    {"role": "user", "content": prompt}
                ],
                temperature=0.1,  # Low temperature for consistency
                max_tokens=1000
            )

            # Parse JSON response
            result = self._parse_response(response)
            
            logger.info(
                "Content classified",
                category=result.category.value,
                confidence=result.confidence,
                is_actionable=result.is_actionable
            )
            
            return result

        except Exception as e:
            logger.error("Classification failed", error=str(e))
            # Return default classification on error
            return ClassificationResult(
                category=ContentCategory.OTHER,
                subcategory=None,
                confidence=0.0,
                importance_score=0.5,
                is_actionable=False,
                extracted_entities={"people": [], "files": [], "concepts": [], "projects": []},
                summary="Classification failed",
                reasoning=f"Error: {str(e)}"
            )

    def _parse_response(self, response: str) -> ClassificationResult:
        """Parse LLM response into ClassificationResult."""
        # Clean response - remove markdown code blocks if present
        response = response.strip()
        if response.startswith("```"):
            lines = response.split("\n")
            response = "\n".join(lines[1:-1] if lines[-1] == "```" else lines[1:])
        
        try:
            data = json.loads(response)
        except json.JSONDecodeError:
            # Try to extract JSON from response
            import re
            json_match = re.search(r'\{.*\}', response, re.DOTALL)
            if json_match:
                data = json.loads(json_match.group())
            else:
                raise ValueError(f"Could not parse JSON from response: {response[:200]}")

        # Map category string to enum
        category_str = data.get("category", "other").lower()
        try:
            category = ContentCategory(category_str)
        except ValueError:
            category = ContentCategory.OTHER

        return ClassificationResult(
            category=category,
            subcategory=data.get("subcategory"),
            confidence=float(data.get("confidence", 0.5)),
            importance_score=float(data.get("importance_score", 0.5)),
            is_actionable=bool(data.get("is_actionable", False)),
            extracted_entities=data.get("entities", {
                "people": [],
                "files": [],
                "concepts": [],
                "projects": []
            }),
            summary=data.get("summary", ""),
            reasoning=data.get("reasoning", "")
        )

    async def classify_batch(
        self,
        items: List[Dict[str, Any]]
    ) -> List[ClassificationResult]:
        """
        Classify multiple items.
        
        Args:
            items: List of dicts with 'content' and 'source' keys
        
        Returns:
            List of ClassificationResults
        """
        results = []
        for item in items:
            result = await self.classify(
                content=item.get("content", ""),
                source=item.get("source", "unknown"),
                context=item.get("context")
            )
            results.append(result)
        return results

    async def is_breaking_change(self, content: str, source: str = "github") -> Dict[str, Any]:
        """
        Determine if content indicates a breaking change.
        
        Returns:
            Dict with 'is_breaking': bool, 'reason': str, 'affected_areas': list
        """
        prompt = """Analyze this content and determine if it describes a BREAKING CHANGE 
(a change that could break existing functionality or require updates from other team members).

CONTENT:
---
{content}
---

Look for:
- API changes (endpoint modifications, response format changes)
- Database schema changes
- Configuration changes
- Dependency updates
- Interface/contract changes
- Removal of features

Respond with JSON:
{{
    "is_breaking": true/false,
    "confidence": 0.0-1.0,
    "reason": "explanation",
    "affected_areas": ["list of affected areas/files/systems"],
    "severity": "low/medium/high/critical"
}}

Respond ONLY with JSON.""".format(content=content[:3000])

        try:
            response = await self.llm.complete(
                messages=[{"role": "user", "content": prompt}],
                temperature=0.1,
                max_tokens=500
            )
            
            # Parse response
            response = response.strip()
            if response.startswith("```"):
                lines = response.split("\n")
                response = "\n".join(lines[1:-1] if lines[-1] == "```" else lines[1:])
            
            return json.loads(response)
            
        except Exception as e:
            logger.error("Breaking change detection failed", error=str(e))
            return {
                "is_breaking": False,
                "confidence": 0.0,
                "reason": "Detection failed",
                "affected_areas": [],
                "severity": "low"
            }


# Singleton instance
classifier = ContentClassifier()


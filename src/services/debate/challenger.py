"""
Challenge & Debate Service

Allows users to challenge decisions by:
1. Finding the original decision and its context
2. Retrieving related discussions
3. Providing AI analysis of the decision
4. Suggesting alternatives if applicable
"""

from typing import Dict, List, Optional
from dataclasses import dataclass
import uuid
import json

from sqlalchemy import select

from src.database.session import get_session
from src.database.models import Decision, DecisionChallenge
from src.vectors.embeddings import embedding_service
from src.vectors.qdrant_client import vector_store
from src.llm.client import llm_client
from src.config.logging import get_logger

logger = get_logger(__name__)


@dataclass
class ChallengeResult:
    """Result of challenging a decision."""
    challenge_id: str
    decision_found: bool
    decision: Optional[Dict]
    original_reasoning: str
    related_discussions: List[Dict]
    ai_analysis: str
    alternatives_considered: List[Dict]
    suggested_alternatives: List[str]
    confidence: float


CHALLENGE_ANALYSIS_PROMPT = """You are helping a software team understand and potentially challenge a past decision.

A team member is asking: "{question}"

ORIGINAL DECISION:
Title: {decision_title}
Summary: {decision_summary}
Reasoning: {decision_reasoning}
Decided by: {decided_by}
Date: {decision_date}

ALTERNATIVES THAT WERE CONSIDERED:
{alternatives}

RELATED DISCUSSIONS AND CONTEXT:
{related_context}

Please provide:
1. A clear explanation of WHY this decision was made
2. The trade-offs that were considered
3. Whether the decision still makes sense given current context
4. If the challenger has valid points, acknowledge them
5. Potential alternatives if the original decision should be reconsidered

Be balanced and constructive. If the original decision was sound, explain why. If there are valid concerns, acknowledge them.

Format your response as:
## Why This Decision Was Made
[explanation]

## Trade-offs Considered
[trade-offs]

## Current Relevance
[is it still valid?]

## Response to Challenge
[address their specific concern]

## Recommendations
[what to do next, if anything]"""


class ChallengeService:
    """
    Service for challenging and debating decisions.
    """

    def __init__(self):
        self.llm = llm_client

    async def challenge(
        self,
        question: str,
        team_id: str,
        challenger_id: str,
        decision_id: Optional[str] = None
    ) -> ChallengeResult:
        """
        Challenge a decision or ask about past reasoning.
        
        Args:
            question: The challenge or question (e.g., "Why did we use Redis?")
            team_id: Team ID
            challenger_id: User ID of challenger
            decision_id: Optional specific decision ID
        
        Returns:
            ChallengeResult with analysis
        """
        challenge_id = str(uuid.uuid4())
        
        # 1. Find relevant decision(s)
        if decision_id:
            decision = await self._get_decision_by_id(decision_id)
            decisions = [decision] if decision else []
        else:
            decisions = await self._search_decisions(question, team_id)
        
        if not decisions:
            # No specific decision found, search knowledge base
            related = await self._search_knowledge(question, team_id)
            return ChallengeResult(
                challenge_id=challenge_id,
                decision_found=False,
                decision=None,
                original_reasoning="No specific decision found for this topic.",
                related_discussions=related,
                ai_analysis=await self._generate_no_decision_response(question, related),
                alternatives_considered=[],
                suggested_alternatives=[],
                confidence=0.3
            )
        
        # Use the most relevant decision
        decision = decisions[0]
        
        # 2. Get related discussions
        related = await self._get_related_context(decision, team_id)
        
        # 3. Generate AI analysis
        analysis = await self._generate_challenge_analysis(
            question=question,
            decision=decision,
            related_context=related
        )
        
        # 4. Store the challenge
        await self._store_challenge(
            challenge_id=challenge_id,
            decision_id=decision.get("id"),
            challenger_id=challenger_id,
            question=question,
            analysis=analysis,
            related_ids=[r.get("id") for r in related]
        )
        
        return ChallengeResult(
            challenge_id=challenge_id,
            decision_found=True,
            decision=decision,
            original_reasoning=decision.get("reasoning", "No reasoning recorded"),
            related_discussions=related,
            ai_analysis=analysis,
            alternatives_considered=decision.get("alternatives_considered", []),
            suggested_alternatives=await self._suggest_alternatives(question, decision),
            confidence=0.8
        )

    async def _search_decisions(
        self,
        query: str,
        team_id: str,
        limit: int = 3
    ) -> List[Dict]:
        """Search for decisions matching the query."""
        # Embed query
        embeddings = await embedding_service.embed(query)
        
        # Search in Qdrant
        _vector_results = await vector_store.search(
            query_vector=embeddings[0],
            filters={"team_id": team_id, "source": "decision"},
            limit=limit,
            score_threshold=0.5
        )  # Used for vector-based search fallback
        
        # Also search database directly
        async with get_session() as session:
            stmt = select(Decision).where(
                Decision.team_id == team_id
            ).order_by(Decision.created_at.desc()).limit(20)
            
            result = await session.execute(stmt)
            db_decisions = result.scalars().all()
            
            # Filter by relevance (simple keyword match)
            query_lower = query.lower()
            keywords = [w for w in query_lower.split() if len(w) > 3]
            
            matched = []
            for d in db_decisions:
                score = 0
                text = f"{d.title} {d.summary or ''} {d.reasoning or ''}".lower()
                for kw in keywords:
                    if kw in text:
                        score += 1
                if score > 0:
                    matched.append((d, score))
            
            matched.sort(key=lambda x: x[1], reverse=True)
            
            return [
                {
                    "id": d.id,
                    "title": d.title,
                    "summary": d.summary,
                    "reasoning": d.reasoning,
                    "alternatives_considered": d.alternatives_considered or [],
                    "decided_by": d.decided_by,
                    "created_at": d.created_at.isoformat(),
                    "source_type": d.source_type,
                    "source_url": d.source_url,
                    "category": d.category,
                    "importance": d.importance
                }
                for d, _ in matched[:limit]
            ]

    async def _get_decision_by_id(self, decision_id: str) -> Optional[Dict]:
        """Get a specific decision by ID."""
        async with get_session() as session:
            result = await session.execute(
                select(Decision).where(Decision.id == decision_id)
            )
            d = result.scalar_one_or_none()
            
            if not d:
                return None
            
            return {
                "id": d.id,
                "title": d.title,
                "summary": d.summary,
                "reasoning": d.reasoning,
                "alternatives_considered": d.alternatives_considered or [],
                "decided_by": d.decided_by,
                "created_at": d.created_at.isoformat(),
                "source_type": d.source_type,
                "source_url": d.source_url,
                "category": d.category,
                "importance": d.importance
            }

    async def _get_related_context(
        self,
        decision: Dict,
        team_id: str,
        limit: int = 5
    ) -> List[Dict]:
        """Get related discussions and context for a decision."""
        # Search for related knowledge entries
        search_text = f"{decision.get('title', '')} {decision.get('summary', '')}"
        embeddings = await embedding_service.embed(search_text)
        
        results = await vector_store.search(
            query_vector=embeddings[0],
            filters={"team_id": team_id},
            limit=limit,
            score_threshold=0.5
        )
        
        return [
            {
                "id": r.get("id"),
                "content": r.get("payload", {}).get("content", "")[:500],
                "source": r.get("payload", {}).get("source"),
                "score": r.get("score")
            }
            for r in results
        ]

    async def _search_knowledge(
        self,
        query: str,
        team_id: str,
        limit: int = 5
    ) -> List[Dict]:
        """Search general knowledge base."""
        embeddings = await embedding_service.embed(query)
        
        results = await vector_store.search(
            query_vector=embeddings[0],
            filters={"team_id": team_id},
            limit=limit,
            score_threshold=0.4
        )
        
        return [
            {
                "id": r.get("id"),
                "content": r.get("payload", {}).get("content", "")[:500],
                "source": r.get("payload", {}).get("source"),
                "score": r.get("score")
            }
            for r in results
        ]

    async def _generate_challenge_analysis(
        self,
        question: str,
        decision: Dict,
        related_context: List[Dict]
    ) -> str:
        """Generate AI analysis for the challenge."""
        # Format alternatives
        alternatives = decision.get("alternatives_considered", [])
        alt_text = "None recorded"
        if alternatives:
            alt_text = "\n".join([
                f"- {a.get('option', 'Unknown')}: {a.get('rejected_reason', 'No reason given')}"
                for a in alternatives
            ])
        
        # Format related context
        context_text = "\n\n".join([
            f"[{r.get('source', 'unknown')}]: {r.get('content', '')}"
            for r in related_context
        ]) or "No related discussions found."
        
        prompt = CHALLENGE_ANALYSIS_PROMPT.format(
            question=question,
            decision_title=decision.get("title", "Unknown"),
            decision_summary=decision.get("summary", "No summary"),
            decision_reasoning=decision.get("reasoning", "No reasoning recorded"),
            decided_by=decision.get("decided_by", "Unknown"),
            decision_date=decision.get("created_at", "Unknown"),
            alternatives=alt_text,
            related_context=context_text
        )
        
        response = await self.llm.complete(
            messages=[
                {"role": "system", "content": "You help teams understand and constructively challenge past decisions."},
                {"role": "user", "content": prompt}
            ],
            temperature=0.3,
            max_tokens=1500
        )
        
        return response

    async def _generate_no_decision_response(
        self,
        question: str,
        related: List[Dict]
    ) -> str:
        """Generate response when no specific decision is found."""
        context = "\n".join([
            f"- {r.get('content', '')[:200]}"
            for r in related
        ]) or "No related information found."
        
        prompt = f"""A team member is asking: "{question}"

I couldn't find a specific recorded decision about this topic, but here's related information from the knowledge base:

{context}

Please provide a helpful response that:
1. Acknowledges we don't have a specific recorded decision
2. Summarizes any relevant context found
3. Suggests how to find more information or who to ask
4. Recommends recording this decision if one needs to be made"""

        response = await self.llm.complete(
            messages=[{"role": "user", "content": prompt}],
            temperature=0.3,
            max_tokens=800
        )
        
        return response

    async def _suggest_alternatives(
        self,
        question: str,
        decision: Dict
    ) -> List[str]:
        """Suggest potential alternatives to consider."""
        prompt = f"""Given this past decision and challenge, suggest 2-3 alternative approaches that could be considered now.

Decision: {decision.get('title', '')}
Reasoning: {decision.get('reasoning', '')}
Challenge: {question}

Provide concise alternatives (one line each). Only suggest if there are genuinely better options now.
If the original decision is solid, say "No alternatives recommended - original decision is sound."

Respond with a JSON list of strings: ["alternative 1", "alternative 2"] or ["No alternatives recommended - original decision is sound."]"""

        try:
            response = await self.llm.complete(
                messages=[{"role": "user", "content": prompt}],
                temperature=0.3,
                max_tokens=300
            )
            
            # Parse JSON
            response = response.strip()
            if response.startswith("```"):
                lines = response.split("\n")
                response = "\n".join(lines[1:-1])
            
            return json.loads(response)
        except (json.JSONDecodeError, ValueError):
            return []

    async def _store_challenge(
        self,
        challenge_id: str,
        decision_id: str,
        challenger_id: str,
        question: str,
        analysis: str,
        related_ids: List[str]
    ) -> None:
        """Store the challenge in database."""
        try:
            async with get_session() as session:
                challenge = DecisionChallenge(
                    id=challenge_id,
                    decision_id=decision_id,
                    challenger_id=challenger_id,
                    challenge_reason=question,
                    ai_analysis=analysis,
                    retrieved_context=related_ids,
                    status="open"
                )
                session.add(challenge)
                
        except Exception as e:
            logger.error("Failed to store challenge", error=str(e))

    async def get_decision_history(
        self,
        team_id: str,
        file_path: Optional[str] = None,
        category: Optional[str] = None,
        limit: int = 20
    ) -> List[Dict]:
        """
        Get decision history with optional filters.
        
        Args:
            team_id: Team ID
            file_path: Filter by affected file
            category: Filter by category
            limit: Max results
        """
        async with get_session() as session:
            query = select(Decision).where(Decision.team_id == team_id)
            
            if category:
                query = query.where(Decision.category == category)
            
            query = query.order_by(Decision.created_at.desc()).limit(limit)
            
            result = await session.execute(query)
            decisions = result.scalars().all()
            
            # Filter by file if specified
            if file_path:
                decisions = [
                    d for d in decisions
                    if file_path in (d.affected_files or [])
                ]
            
            return [
                {
                    "id": d.id,
                    "title": d.title,
                    "summary": d.summary,
                    "category": d.category,
                    "importance": d.importance,
                    "decided_by": d.decided_by,
                    "created_at": d.created_at.isoformat(),
                    "source_url": d.source_url
                }
                for d in decisions
            ]


# Singleton instance
challenge_service = ChallengeService()


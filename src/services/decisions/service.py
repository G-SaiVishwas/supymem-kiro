"""
Decision Service - Handles all decision CRUD operations and challenge workflows.
"""
from typing import Optional, List, Dict, Any
from datetime import datetime
from sqlalchemy import select, update, delete, and_, or_
from sqlalchemy.ext.asyncio import AsyncSession

from src.database.models import Decision, KnowledgeEntry
from src.database.session import get_session
from src.vectors.embeddings import embedding_service
from src.vectors.qdrant_client import vector_store
from src.llm.client import llm_client
from src.config.logging import get_logger

logger = get_logger(__name__)


class DecisionService:
    """Service for managing decisions in the knowledge base."""
    
    # ========================================================================
    # DECISIONS - CRUD
    # ========================================================================
    
    @staticmethod
    async def list_decisions(
        team_id: str,
        category: Optional[str] = None,
        status: Optional[str] = None,
        importance: Optional[str] = None,
        affected_file: Optional[str] = None,
        limit: int = 50,
        offset: int = 0
    ) -> List[Dict[str, Any]]:
        """List decisions with filtering."""
        async for session in get_session():
            query = select(Decision).where(Decision.team_id == team_id)
            
            if category:
                query = query.where(Decision.category == category)
            if status:
                query = query.where(Decision.status == status)
            if importance:
                query = query.where(Decision.importance == importance)
            
            query = query.order_by(Decision.created_at.desc())
            query = query.limit(limit).offset(offset)
            
            result = await session.execute(query)
            decisions = result.scalars().all()
            
            # Filter by affected file if specified
            if affected_file:
                decisions = [
                    d for d in decisions 
                    if affected_file in (d.affected_files or [])
                ]
            
            return [DecisionService._decision_to_dict(d) for d in decisions]
    
    @staticmethod
    async def get_decision(decision_id: str) -> Optional[Dict[str, Any]]:
        """Get a single decision by ID."""
        async for session in get_session():
            result = await session.execute(
                select(Decision).where(Decision.id == decision_id)
            )
            decision = result.scalar_one_or_none()
            if decision:
                return DecisionService._decision_to_dict(decision)
            return None
    
    @staticmethod
    async def create_decision(
        team_id: str,
        title: str,
        summary: Optional[str] = None,
        reasoning: Optional[str] = None,
        context: Optional[str] = None,
        impact: Optional[str] = None,
        decided_by: Optional[str] = None,
        participants: Optional[List[str]] = None,
        affected_files: Optional[List[str]] = None,
        affected_components: Optional[List[str]] = None,
        category: Optional[str] = None,
        importance: str = "medium",
        source_type: str = "manual",
        source_url: Optional[str] = None,
        alternatives_considered: Optional[List[Dict]] = None,
        tags: Optional[List[str]] = None
    ) -> Dict[str, Any]:
        """Create a new decision."""
        async for session in get_session():
            # Generate embedding from title + summary + reasoning
            embed_text = f"{title}\n{summary or ''}\n{reasoning or ''}"
            embeddings = await embedding_service.embed(embed_text)
            
            decision = Decision(
                team_id=team_id,
                title=title,
                summary=summary,
                reasoning=reasoning,
                context=context,
                impact=impact,
                decided_by=decided_by,
                participants=participants or [],
                affected_files=affected_files or [],
                affected_components=affected_components or [],
                category=category,
                importance=importance,
                source_type=source_type,
                source_url=source_url,
                alternatives_considered=alternatives_considered or [],
                tags=tags or [],
                embedding=embeddings[0] if embeddings else None,
                status="active"
            )
            
            session.add(decision)
            await session.commit()
            await session.refresh(decision)
            
            logger.info(f"Created decision {decision.id}: {title}")
            return DecisionService._decision_to_dict(decision)
    
    @staticmethod
    async def update_decision(
        decision_id: str,
        title: Optional[str] = None,
        summary: Optional[str] = None,
        reasoning: Optional[str] = None,
        context: Optional[str] = None,
        impact: Optional[str] = None,
        status: Optional[str] = None,
        importance: Optional[str] = None,
        affected_files: Optional[List[str]] = None,
        affected_components: Optional[List[str]] = None,
        tags: Optional[List[str]] = None
    ) -> Optional[Dict[str, Any]]:
        """Update an existing decision."""
        async for session in get_session():
            result = await session.execute(
                select(Decision).where(Decision.id == decision_id)
            )
            decision = result.scalar_one_or_none()
            
            if not decision:
                return None
            
            # Update fields
            if title is not None:
                decision.title = title
            if summary is not None:
                decision.summary = summary
            if reasoning is not None:
                decision.reasoning = reasoning
            if context is not None:
                decision.context = context
            if impact is not None:
                decision.impact = impact
            if status is not None:
                decision.status = status
            if importance is not None:
                decision.importance = importance
            if affected_files is not None:
                decision.affected_files = affected_files
            if affected_components is not None:
                decision.affected_components = affected_components
            if tags is not None:
                decision.tags = tags
            
            # Regenerate embedding if content changed
            if any([title, summary, reasoning]):
                embed_text = f"{decision.title}\n{decision.summary or ''}\n{decision.reasoning or ''}"
                embeddings = await embedding_service.embed(embed_text)
                decision.embedding = embeddings[0] if embeddings else None
            
            decision.updated_at = datetime.utcnow()
            
            await session.commit()
            await session.refresh(decision)
            
            logger.info(f"Updated decision {decision_id}")
            return DecisionService._decision_to_dict(decision)
    
    @staticmethod
    async def delete_decision(decision_id: str) -> bool:
        """Delete a decision."""
        async for session in get_session():
            result = await session.execute(
                delete(Decision).where(Decision.id == decision_id)
            )
            await session.commit()
            logger.info(f"Deleted decision {decision_id}")
            return result.rowcount > 0
    
    @staticmethod
    async def supersede_decision(
        decision_id: str,
        new_decision_id: str
    ) -> bool:
        """Mark a decision as superseded by another."""
        async for session in get_session():
            result = await session.execute(
                update(Decision)
                .where(Decision.id == decision_id)
                .values(
                    status="superseded",
                    superseded_by=new_decision_id,
                    updated_at=datetime.utcnow()
                )
            )
            await session.commit()
            return result.rowcount > 0
    
    # ========================================================================
    # CHALLENGE WORKFLOW
    # ========================================================================
    
    @staticmethod
    async def challenge_decision(
        decision_id: str,
        question: str,
        challenger_id: str,
        team_id: str
    ) -> Dict[str, Any]:
        """Challenge a decision with a question and get AI analysis."""
        # Get the decision
        decision = await DecisionService.get_decision(decision_id)
        if not decision:
            return {
                "error": "Decision not found",
                "decision_found": False
            }
        
        # Search for related knowledge
        from src.services.knowledge import KnowledgeService
        related_knowledge = await KnowledgeService.semantic_search(
            query=question,
            team_id=team_id,
            limit=5
        )
        
        # Build context for AI analysis
        context = f"""
Decision being challenged:
Title: {decision['title']}
Summary: {decision.get('summary', 'N/A')}
Reasoning: {decision.get('reasoning', 'N/A')}
Context: {decision.get('context', 'N/A')}
Decided by: {decision.get('decided_by', 'Unknown')}
Created: {decision.get('created_at', 'Unknown')}

Challenge Question: {question}

Related Knowledge:
{chr(10).join([f"- {k['content'][:200]}..." for k in related_knowledge])}
"""
        
        # Get AI analysis
        try:
            analysis = await llm_client.complete(
                messages=[
                    {
                        "role": "system",
                        "content": """You are a decision analysis assistant. Analyze the challenge to this decision.
                        
Provide:
1. Whether the challenge is valid (yes/partially/no)
2. Reasoning for your assessment
3. What areas might be affected if the decision is reconsidered
4. Suggested actions to address the challenge

Be concise but thorough."""
                    },
                    {"role": "user", "content": context}
                ]
            )
        except Exception as e:
            logger.error(f"LLM analysis failed: {e}")
            analysis = "Unable to generate AI analysis. Please review the decision manually."
        
        return {
            "decision_found": True,
            "decision": decision,
            "challenge_question": question,
            "challenger": challenger_id,
            "ai_analysis": analysis,
            "related_knowledge": related_knowledge,
            "suggested_actions": [
                "Schedule a review meeting with stakeholders",
                "Document the challenge in the decision record",
                "Gather additional data to support or refute the challenge",
                "Consider alternatives that address the concern"
            ]
        }
    
    @staticmethod
    async def find_related_decisions(
        query: str,
        team_id: str,
        limit: int = 5
    ) -> List[Dict[str, Any]]:
        """Find decisions related to a query using semantic search."""
        try:
            embeddings = await embedding_service.embed(query)
            
            results = await vector_store.search(
                query_vector=embeddings[0],
                filters={"team_id": team_id, "type": "decision"},
                limit=limit
            )
            
            decision_ids = [r.get("payload", {}).get("id") for r in results]
            
            decisions = []
            for did in decision_ids:
                d = await DecisionService.get_decision(did)
                if d:
                    decisions.append(d)
            
            return decisions
        except Exception as e:
            logger.error(f"Failed to find related decisions: {e}")
            return []
    
    @staticmethod
    async def get_decisions_for_file(
        file_path: str,
        team_id: str
    ) -> List[Dict[str, Any]]:
        """Get all decisions that affect a specific file."""
        async for session in get_session():
            # SQLAlchemy JSON contains query
            result = await session.execute(
                select(Decision).where(
                    and_(
                        Decision.team_id == team_id,
                        Decision.status == "active"
                    )
                )
            )
            decisions = result.scalars().all()
            
            # Filter by file path
            matching = [
                DecisionService._decision_to_dict(d)
                for d in decisions
                if file_path in (d.affected_files or [])
            ]
            
            return matching
    
    # ========================================================================
    # HELPERS
    # ========================================================================
    
    @staticmethod
    def _decision_to_dict(decision: Decision) -> Dict[str, Any]:
        """Convert a Decision to a dictionary."""
        return {
            "id": decision.id,
            "team_id": decision.team_id,
            "title": decision.title,
            "summary": decision.summary,
            "reasoning": decision.reasoning,
            "context": decision.context,
            "impact": decision.impact,
            "source_type": decision.source_type,
            "source_id": decision.source_id,
            "source_url": decision.source_url,
            "decided_by": decision.decided_by,
            "participants": decision.participants or [],
            "affected_files": decision.affected_files or [],
            "affected_components": decision.affected_components or [],
            "category": decision.category,
            "tags": decision.tags or [],
            "importance": decision.importance,
            "status": decision.status,
            "superseded_by": decision.superseded_by,
            "alternatives_considered": decision.alternatives_considered or [],
            "created_at": decision.created_at.isoformat() if decision.created_at else None,
            "updated_at": decision.updated_at.isoformat() if decision.updated_at else None
        }


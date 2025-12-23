from typing import TypedDict, Annotated, Sequence
from langgraph.graph import StateGraph, START, END
from langgraph.checkpoint.memory import MemorySaver
from langchain_core.messages import HumanMessage, AIMessage, BaseMessage
from langchain_core.tools import tool
import operator

from src.vectors.qdrant_client import vector_store
from src.vectors.embeddings import embedding_service
from src.agents.memory import memory_manager
from src.llm.client import llm_client
from src.config.logging import get_logger

logger = get_logger(__name__)


# State Schema
class AgentState(TypedDict):
    messages: Annotated[Sequence[BaseMessage], operator.add]
    context: str
    user_id: str
    team_id: str
    current_action: str


# Tools
@tool
async def search_knowledge(query: str, team_id: str) -> str:
    """Search the team knowledge base for relevant information."""
    embeddings = await embedding_service.embed(query)
    results = await vector_store.search(
        query_vector=embeddings[0],
        limit=5,
        filters={"team_id": team_id}
    )

    if not results:
        return "No relevant knowledge found."

    context = "\n\n".join([
        f"[{r['payload'].get('source', 'unknown')}]: {r['payload'].get('content', '')}"
        for r in results
    ])
    return context


@tool
async def store_knowledge(content: str, source: str, team_id: str) -> str:
    """Store new knowledge in the team knowledge base."""
    embeddings = await embedding_service.embed(content)
    await vector_store.insert(
        vectors=embeddings,
        payloads=[{
            "content": content,
            "source": source,
            "team_id": team_id
        }]
    )
    return f"Knowledge stored successfully from {source}"


@tool
def get_user_memories(query: str, user_id: str) -> str:
    """Retrieve relevant memories for the current user."""
    try:
        memories = memory_manager.search_memories(query, user_id, limit=3)
        if not memories:
            return "No relevant memories found."
        return "\n".join([m.get("memory", "") for m in memories])
    except Exception as e:
        logger.warning("Failed to get user memories", error=str(e))
        return "No relevant memories found."


@tool
def remember_for_user(content: str, user_id: str) -> str:
    """Store a memory for the current user."""
    try:
        memory_manager.add_memory(content, user_id)
        return "Memory stored successfully"
    except Exception as e:
        logger.warning("Failed to store memory", error=str(e))
        return "Failed to store memory"


# Agent Nodes
async def knowledge_retrieval_node(state: AgentState) -> dict:
    """Retrieve relevant knowledge for the query."""
    last_message = state["messages"][-1].content
    team_id = state.get("team_id", "default")

    # Search knowledge base
    knowledge = await search_knowledge.ainvoke({
        "query": last_message,
        "team_id": team_id
    })

    # Get user memories
    user_id = state.get("user_id", "anonymous")
    memories = get_user_memories.invoke({
        "query": last_message,
        "user_id": user_id
    })

    context = f"Knowledge Base:\n{knowledge}\n\nUser Context:\n{memories}"

    return {"context": context, "current_action": "retrieved"}


async def response_generation_node(state: AgentState) -> dict:
    """Generate response using LLM with context."""
    last_message = state["messages"][-1].content
    context = state.get("context", "")
    
    # Check if we have any actual knowledge
    has_knowledge = (
        context and 
        "No relevant knowledge found" not in context and
        "No relevant memories found" not in context.replace("User Context:\nNo relevant memories found.", "")
    )
    
    # Check if context only contains "no results" messages
    context_lines = context.strip().split('\n')
    meaningful_content = [
        line for line in context_lines 
        if line.strip() and 
        "No relevant" not in line and 
        "Knowledge Base:" not in line and 
        "User Context:" not in line
    ]
    
    if not meaningful_content:
        # No relevant knowledge found - return a clear message
        return {
            "messages": [AIMessage(content="I don't have any information about that in your team's knowledge base. This question doesn't seem to be related to your codebase, decisions, or team knowledge.\n\nTry asking about:\n• Past decisions and their reasoning\n• Codebase architecture\n• Team processes and workflows\n• Specific tasks or projects\n\nOr use `/remember` in Slack to add relevant knowledge first!")],
            "current_action": "responded"
        }

    system_prompt = f"""You are Supymem, a collaborative knowledge agent for a software team.

IMPORTANT RULES:
1. You can ONLY answer questions using the provided context from the team's knowledge base.
2. If the context doesn't contain relevant information to answer the question, say "I don't have information about that in your team's knowledge base."
3. NEVER use your general knowledge to answer questions. Only use the context provided.
4. If the question is unrelated to software development, team processes, or the codebase, politely redirect the user.

Context from knowledge base:
{context}

Answer the user's question ONLY using the above context. If the context doesn't help, say you don't have that information."""

    response = await llm_client.complete(
        messages=[
            {"role": "system", "content": system_prompt},
            {"role": "user", "content": last_message}
        ]
    )

    return {
        "messages": [AIMessage(content=response)],
        "current_action": "responded"
    }


# Build Graph
def build_knowledge_agent():
    workflow = StateGraph(AgentState)

    workflow.add_node("retrieve", knowledge_retrieval_node)
    workflow.add_node("respond", response_generation_node)

    # Simple linear flow: START -> retrieve -> respond -> END
    workflow.add_edge(START, "retrieve")
    workflow.add_edge("retrieve", "respond")
    workflow.add_edge("respond", END)

    checkpointer = MemorySaver()
    return workflow.compile(checkpointer=checkpointer)


knowledge_agent = build_knowledge_agent()


# Convenience function
async def query_agent(
    message: str,
    user_id: str = "anonymous",
    team_id: str = "default",
    thread_id: str = "default"
) -> str:
    """Query the knowledge agent."""
    config = {"configurable": {"thread_id": thread_id}}

    result = await knowledge_agent.ainvoke(
        {
            "messages": [HumanMessage(content=message)],
            "context": "",
            "user_id": user_id,
            "team_id": team_id,
            "current_action": ""
        },
        config
    )

    return result["messages"][-1].content

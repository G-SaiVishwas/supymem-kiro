"""
Slack Bot Integration

Handles:
- @mentions → AI agent queries
- /supymem → Query knowledge base
- /remember → Store knowledge
- /automate → Create automation rules
- /my-tasks → View assigned tasks
- /challenge → Challenge a decision
"""

import re
from slack_bolt.async_app import AsyncApp
from slack_bolt.adapter.socket_mode.async_handler import AsyncSocketModeHandler

from src.agents.knowledge_agent import query_agent
from src.vectors.embeddings import embedding_service
from src.vectors.qdrant_client import vector_store
from src.services.automation import nl_parser, rule_manager
from src.config.settings import get_settings
from src.config.logging import get_logger

logger = get_logger(__name__)
settings = get_settings()

app = AsyncApp(
    token=settings.slack_bot_token,
    signing_secret=settings.slack_signing_secret
)


# ============================================================================
# @MENTIONS - AI Agent Queries
# ============================================================================

@app.event("app_mention")
async def handle_mention(event, say, client):
    """Handle @mentions - route to AI agent."""
    user = event.get("user")
    text = event.get("text", "")
    channel = event.get("channel")
    thread_ts = event.get("thread_ts") or event.get("ts")

    # Clean the mention from text
    clean_text = re.sub(r'<@[A-Z0-9]+>', '', text).strip()

    if not clean_text:
        await say("How can I help you?", thread_ts=thread_ts)
        return

    try:
        # Check if this looks like an automation command
        automation_keywords = ["when", "after", "once", "if", "remind", "notify when"]
        if any(kw in clean_text.lower() for kw in automation_keywords):
            # Try to parse as automation
            result = await nl_parser.parse_and_confirm(
                instruction=clean_text,
                context={"team_id": channel, "user": user}
            )
            
            if result.get("success") and result.get("confidence", 0) > 0.7:
                # Store pending automation for confirmation
                confirmation = result.get("confirmation_message", "")
                await say(
                    text=f"🤖 **Automation Request**\n\n{confirmation}",
                    thread_ts=thread_ts,
                    blocks=[
                        {
                            "type": "section",
                            "text": {"type": "mrkdwn", "text": f"🤖 *Automation Request*\n\n{confirmation}"}
                        },
                        {
                            "type": "actions",
                            "elements": [
                                {
                                    "type": "button",
                                    "text": {"type": "plain_text", "text": "✓ Yes, create this rule"},
                                    "style": "primary",
                                    "action_id": "confirm_automation",
                                    "value": clean_text
                                },
                                {
                                    "type": "button",
                                    "text": {"type": "plain_text", "text": "✗ No, cancel"},
                                    "style": "danger",
                                    "action_id": "cancel_automation"
                                }
                            ]
                        }
                    ]
                )
                return

        # Get thread context if in a thread (for future context-aware responses)
        if event.get("thread_ts"):
            await client.conversations_replies(
                channel=channel,
                ts=event.get("thread_ts")
            )

        # Query the agent
        response = await query_agent(
            message=clean_text,
            user_id=user,
            team_id=channel,
            thread_id=f"{channel}-{thread_ts}"
        )

        await say(text=response, thread_ts=thread_ts)

    except Exception as e:
        logger.error("Error handling mention", error=str(e))
        await say(
            text="Sorry, I encountered an error. Please try again.",
            thread_ts=thread_ts
        )


# ============================================================================
# SLASH COMMANDS
# ============================================================================

@app.command("/supymem")
async def handle_supymem_command(ack, respond, command):
    """Handle /supymem [query] - Query the knowledge base."""
    await ack()

    text = command.get("text", "").strip()
    user_id = command.get("user_id")
    channel_id = command.get("channel_id")

    if not text:
        await respond(
            text="*Usage:*\n• `/supymem [your question]` - Ask the knowledge agent\n• `/supymem help` - Show all commands",
            response_type="ephemeral"
        )
        return

    if text.lower() == "help":
        help_text = """*Supymem Commands:*
• `/supymem [question]` - Ask the knowledge agent
• `/remember [info]` - Store information in the knowledge base
• `/automate [instruction]` - Create an automation rule
• `/my-tasks` - View your assigned tasks
• `/challenge [topic]` - Challenge a decision

*Automation Examples:*
• "After John finishes the CSS tasks, notify him about API work"
• "When PR #123 is merged, create a task for Sarah to update docs"
"""
        await respond(text=help_text, response_type="ephemeral")
        return

    try:
        response = await query_agent(
            message=text,
            user_id=user_id,
            team_id=channel_id
        )

        await respond(
            text=response,
            response_type="in_channel"
        )
    except Exception as e:
        logger.error("Command error", error=str(e))
        await respond(
            text="Sorry, I encountered an error.",
            response_type="ephemeral"
        )


@app.command("/remember")
async def handle_remember_command(ack, respond, command):
    """Handle /remember [info] - Store knowledge."""
    await ack()

    text = command.get("text", "").strip()
    user_id = command.get("user_id")
    channel_id = command.get("channel_id")

    if not text:
        await respond(
            text="Usage: `/remember [information to store]`",
            response_type="ephemeral"
        )
        return

    try:
        # Store in knowledge base
        embeddings = await embedding_service.embed(text)
        await vector_store.insert(
            vectors=embeddings,
            payloads=[{
                "content": text,
                "source": "slack",
                "team_id": channel_id,
                "user_id": user_id
            }]
        )

        await respond(
            text=f"✅ Got it! I'll remember: _{text}_",
            response_type="ephemeral"
        )
    except Exception as e:
        logger.error("Remember command error", error=str(e))
        await respond(
            text="Sorry, I couldn't store that information.",
            response_type="ephemeral"
        )


@app.command("/automate")
async def handle_automate_command(ack, respond, command):
    """Handle /automate [instruction] - Create automation rule."""
    await ack()

    text = command.get("text", "").strip()
    user_id = command.get("user_id")
    channel_id = command.get("channel_id")

    if not text:
        examples = """*Usage:* `/automate [natural language instruction]`

*Examples:*
• `/automate After Rahul finishes CSS tasks, notify him that API integration is next`
• `/automate When PR #123 is merged, create a task for Sarah to update the docs`
• `/automate Remind John about the standup every day at 9am`

I'll confirm my understanding before creating the rule."""
        await respond(text=examples, response_type="ephemeral")
        return

    try:
        # Parse the instruction
        result = await nl_parser.parse_and_confirm(
            instruction=text,
            context={"team_id": channel_id, "user": user_id}
        )

        if not result.get("success"):
            await respond(
                text=f"❌ I couldn't understand that instruction.\n\n{result.get('error', 'Please try rephrasing.')}",
                response_type="ephemeral"
            )
            return

        confirmation = result.get("confirmation_message", "")
        
        # Store the parsed command temporarily (in a real app, use Redis/database)
        # For now, we'll create the rule directly with a confirmation message
        
        await respond(
            text=f"🤖 *Automation Request*\n\n{confirmation}",
            response_type="ephemeral",
            blocks=[
                {
                    "type": "section",
                    "text": {"type": "mrkdwn", "text": f"🤖 *Automation Request*\n\n{confirmation}"}
                },
                {
                    "type": "context",
                    "elements": [
                        {"type": "mrkdwn", "text": f"Confidence: {result.get('confidence', 0):.0%}"}
                    ]
                },
                {
                    "type": "actions",
                    "elements": [
                        {
                            "type": "button",
                            "text": {"type": "plain_text", "text": "✓ Create Rule"},
                            "style": "primary",
                            "action_id": "confirm_automation",
                            "value": text
                        },
                        {
                            "type": "button",
                            "text": {"type": "plain_text", "text": "✗ Cancel"},
                            "style": "danger",
                            "action_id": "cancel_automation"
                        }
                    ]
                }
            ]
        )

    except Exception as e:
        logger.error("Automate command error", error=str(e))
        await respond(
            text="Sorry, I couldn't process that instruction.",
            response_type="ephemeral"
        )


@app.command("/my-tasks")
async def handle_my_tasks_command(ack, respond, command):
    """Handle /my-tasks - View assigned tasks."""
    await ack()

    user_id = command.get("user_id")
    # channel_id available for future team-scoped queries

    try:
        from sqlalchemy import select
        from src.database.session import get_session
        from src.database.models import Task

        async with get_session() as session:
            result = await session.execute(
                select(Task).where(
                    Task.assigned_to == user_id,
                    Task.status.in_(["pending", "in_progress"])
                ).order_by(Task.priority.desc(), Task.created_at.desc()).limit(10)
            )
            tasks = result.scalars().all()

        if not tasks:
            await respond(
                text="✨ You have no pending tasks!",
                response_type="ephemeral"
            )
            return

        blocks = [
            {
                "type": "header",
                "text": {"type": "plain_text", "text": "📋 Your Tasks"}
            }
        ]

        priority_emoji = {"urgent": "🔴", "high": "🟠", "medium": "🟡", "low": "🟢"}
        status_emoji = {"pending": "⏳", "in_progress": "🔄"}

        for task in tasks:
            emoji = priority_emoji.get(task.priority, "⚪")
            status = status_emoji.get(task.status, "")
            blocks.append({
                "type": "section",
                "text": {
                    "type": "mrkdwn",
                    "text": f"{emoji} {status} *{task.title}*\n_{task.status}_ | Priority: {task.priority}"
                }
            })

        await respond(blocks=blocks, response_type="ephemeral")

    except Exception as e:
        logger.error("My tasks error", error=str(e))
        await respond(text="Couldn't fetch your tasks.", response_type="ephemeral")


# ============================================================================
# BUTTON ACTIONS
# ============================================================================

@app.action("confirm_automation")
async def handle_confirm_automation(ack, body, respond):
    """Handle automation confirmation button."""
    await ack()

    user_id = body.get("user", {}).get("id")
    channel_id = body.get("channel", {}).get("id") or body.get("container", {}).get("channel_id")
    instruction = body.get("actions", [{}])[0].get("value", "")

    try:
        # Parse again and create the rule
        command, error = await nl_parser.parse(
            instruction=instruction,
            context={"team_id": channel_id, "user": user_id}
        )

        if error or not command:
            await respond(
                text=f"❌ Failed to create rule: {error}",
                response_type="ephemeral",
                replace_original=True
            )
            return

        # Create the automation rule
        rule_id = await rule_manager.create_rule(
            team_id=channel_id,
            created_by=user_id,
            command=command
        )

        await respond(
            text=f"✅ *Automation Created!*\n\nRule ID: `{rule_id}`\n\n{command.description}\n\nI'll execute this when the conditions are met.",
            response_type="ephemeral",
            replace_original=True
        )

    except Exception as e:
        logger.error("Confirm automation error", error=str(e))
        await respond(
            text=f"❌ Failed to create rule: {str(e)}",
            response_type="ephemeral",
            replace_original=True
        )


@app.action("cancel_automation")
async def handle_cancel_automation(ack, respond):
    """Handle automation cancel button."""
    await ack()
    await respond(
        text="❌ Automation cancelled.",
        response_type="ephemeral",
        replace_original=True
    )


@app.action("notification_read_*")
async def handle_notification_read(ack, body, respond):
    """Handle notification mark as read button."""
    await ack()
    # Mark notification as read
    await respond(
        text="✓ Marked as read",
        response_type="ephemeral",
        replace_original=False
    )


# ============================================================================
# MESSAGE HANDLING
# ============================================================================

@app.event("message")
async def handle_message(event, client):
    """Handle messages - capture for knowledge if in monitored channels."""
    # Skip bot messages
    if event.get("subtype") == "bot_message":
        return
    if event.get("bot_id"):
        return

    # Only capture from designated knowledge channels (configurable)
    # For now, skip to avoid noise
    pass


# ============================================================================
# STARTUP
# ============================================================================

async def start_slack_bot():
    """Start the Slack bot in Socket Mode."""
    if not settings.slack_bot_token or not settings.slack_app_token:
        logger.warning("Slack tokens not configured, bot will not start")
        return
    
    handler = AsyncSocketModeHandler(app, settings.slack_app_token)
    logger.info("Starting Slack bot in Socket Mode...")
    await handler.start_async()

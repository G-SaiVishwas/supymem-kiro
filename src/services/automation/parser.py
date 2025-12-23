"""
Natural Language Command Parser

Parses instructions like:
- "After Rahul finishes the CSS tasks, notify him that API integration is next"
- "When PR #123 is merged, create a task for Sarah to update docs"
- "Remind John about the meeting tomorrow at 3pm"
"""

from typing import Dict, Optional, Any, Tuple
from dataclasses import dataclass
import json
import re

from src.llm.client import llm_client
from src.config.logging import get_logger

logger = get_logger(__name__)


@dataclass
class ParsedTrigger:
    """Parsed trigger condition."""
    trigger_type: str  # task_completed, pr_merged, time_based, file_changed, keyword_detected
    conditions: Dict[str, Any]
    # Examples:
    # - {"user": "rahul", "task_type": "CSS"}
    # - {"pr_number": 123}
    # - {"time": "2024-12-22T15:00:00"}
    # - {"files": ["*.css"]}


@dataclass
class ParsedAction:
    """Parsed action to perform."""
    action_type: str  # notify_user, create_task, assign_task, send_message
    params: Dict[str, Any]
    # Examples:
    # - {"user": "rahul", "message": "API integration is next priority"}
    # - {"title": "Update docs", "assignee": "sarah"}


@dataclass
class ParsedCommand:
    """Complete parsed command."""
    original_text: str
    description: str
    trigger: ParsedTrigger
    action: ParsedAction
    is_one_time: bool
    confidence: float
    parsing_notes: str


NL_PARSER_PROMPT = """You are an expert at parsing natural language automation commands for a software team.

Parse the following instruction into a structured automation rule.

TRIGGER TYPES:
- task_completed: When a user completes a task (conditions: user, task_type, task_keywords)
- pr_merged: When a PR is merged (conditions: pr_number, repo, author)
- pr_opened: When a PR is opened (conditions: repo, author)
- file_changed: When specific files change (conditions: files, repo)
- time_based: At a specific time (conditions: datetime, cron)
- keyword_detected: When keywords appear (conditions: keywords, source)

ACTION TYPES:
- notify_user: Send a notification (params: user, message, priority)
- create_task: Create a new task (params: title, description, assignee, priority)
- assign_task: Assign existing task (params: task_id, assignee)
- send_message: Send message to channel (params: channel, message)
- update_task: Update task status (params: task_id, status)

INSTRUCTION:
"{instruction}"

CONTEXT (if provided):
{context}

Respond with JSON:
{{
    "success": true/false,
    "description": "Human-readable description of the rule",
    "trigger": {{
        "type": "<trigger_type>",
        "conditions": {{
            // relevant conditions
        }}
    }},
    "action": {{
        "type": "<action_type>",
        "params": {{
            // relevant params
        }}
    }},
    "is_one_time": true/false,
    "confidence": 0.0-1.0,
    "notes": "Any parsing notes or ambiguities"
}}

If you cannot parse the instruction, return:
{{
    "success": false,
    "error": "explanation of what's unclear",
    "suggestions": ["possible clarification questions"]
}}

Respond ONLY with JSON."""


class NLCommandParser:
    """
    Parses natural language automation commands.
    """

    def __init__(self):
        self.llm = llm_client
        self._user_cache = {}  # Cache for user name resolution

    async def parse(
        self,
        instruction: str,
        context: Optional[Dict[str, Any]] = None
    ) -> Tuple[Optional[ParsedCommand], Optional[str]]:
        """
        Parse a natural language instruction.
        
        Args:
            instruction: The natural language command
            context: Optional context (team_id, channel, known users, etc.)
        
        Returns:
            Tuple of (ParsedCommand or None, error_message or None)
        """
        try:
            context_str = json.dumps(context) if context else "None"
            
            prompt = NL_PARSER_PROMPT.format(
                instruction=instruction,
                context=context_str
            )

            response = await self.llm.complete(
                messages=[
                    {"role": "system", "content": "You parse natural language into structured automation rules. Always respond with valid JSON."},
                    {"role": "user", "content": prompt}
                ],
                temperature=0.1,
                max_tokens=1000
            )

            data = self._parse_json(response)
            
            if not data.get("success"):
                error = data.get("error", "Failed to parse instruction")
                suggestions = data.get("suggestions", [])
                return None, f"{error}. Suggestions: {', '.join(suggestions)}" if suggestions else error

            # Build ParsedCommand
            trigger = ParsedTrigger(
                trigger_type=data["trigger"]["type"],
                conditions=data["trigger"].get("conditions", {})
            )
            
            action = ParsedAction(
                action_type=data["action"]["type"],
                params=data["action"].get("params", {})
            )
            
            command = ParsedCommand(
                original_text=instruction,
                description=data.get("description", ""),
                trigger=trigger,
                action=action,
                is_one_time=data.get("is_one_time", False),
                confidence=float(data.get("confidence", 0.5)),
                parsing_notes=data.get("notes", "")
            )

            logger.info(
                "Command parsed",
                trigger_type=trigger.trigger_type,
                action_type=action.action_type,
                confidence=command.confidence
            )

            return command, None

        except Exception as e:
            logger.error("Command parsing failed", error=str(e))
            return None, f"Parsing error: {str(e)}"

    async def parse_and_confirm(
        self,
        instruction: str,
        context: Optional[Dict[str, Any]] = None
    ) -> Dict[str, Any]:
        """
        Parse and return a confirmation message for the user.
        
        Returns:
            Dict with 'success', 'confirmation_message', 'parsed_command', or 'error'
        """
        command, error = await self.parse(instruction, context)
        
        if error:
            return {
                "success": False,
                "error": error,
                "needs_clarification": True
            }
        
        # Generate confirmation message
        confirmation = self._generate_confirmation(command)
        
        return {
            "success": True,
            "confirmation_message": confirmation,
            "parsed_command": {
                "trigger_type": command.trigger.trigger_type,
                "trigger_conditions": command.trigger.conditions,
                "action_type": command.action.action_type,
                "action_params": command.action.params,
                "is_one_time": command.is_one_time,
                "description": command.description
            },
            "confidence": command.confidence
        }

    def _generate_confirmation(self, command: ParsedCommand) -> str:
        """Generate a human-readable confirmation message."""
        trigger_desc = self._describe_trigger(command.trigger)
        action_desc = self._describe_action(command.action)
        
        msg = "I understand you want me to:\n"
        msg += f"• **When:** {trigger_desc}\n"
        msg += f"• **Then:** {action_desc}\n"
        
        if command.is_one_time:
            msg += "\nThis will trigger once and then deactivate."
        else:
            msg += "\nThis will remain active until you disable it."
        
        msg += "\n\nIs this correct?"
        
        return msg

    def _describe_trigger(self, trigger: ParsedTrigger) -> str:
        """Generate human-readable trigger description."""
        conditions = trigger.conditions
        
        if trigger.trigger_type == "task_completed":
            user = conditions.get("user", "someone")
            task_type = conditions.get("task_type") or conditions.get("task_keywords")
            if task_type:
                return f"{user} completes {task_type} tasks"
            return f"{user} completes any task"
        
        elif trigger.trigger_type == "pr_merged":
            pr = conditions.get("pr_number")
            if pr:
                return f"PR #{pr} is merged"
            author = conditions.get("author")
            if author:
                return f"Any PR by {author} is merged"
            return "Any PR is merged"
        
        elif trigger.trigger_type == "time_based":
            time = conditions.get("datetime") or conditions.get("cron")
            return f"At {time}"
        
        elif trigger.trigger_type == "file_changed":
            files = conditions.get("files", [])
            return f"Files matching {files} are changed"
        
        return f"{trigger.trigger_type} with {conditions}"

    def _describe_action(self, action: ParsedAction) -> str:
        """Generate human-readable action description."""
        params = action.params
        
        if action.action_type == "notify_user":
            user = params.get("user", "the user")
            message = params.get("message", "a notification")
            return f"Notify {user}: \"{message[:50]}...\""
        
        elif action.action_type == "create_task":
            title = params.get("title", "a task")
            assignee = params.get("assignee")
            if assignee:
                return f"Create task \"{title}\" for {assignee}"
            return f"Create task \"{title}\""
        
        elif action.action_type == "send_message":
            channel = params.get("channel", "the channel")
            return f"Send message to {channel}"
        
        return f"{action.action_type} with {params}"

    def _parse_json(self, response: str) -> Dict:
        """Parse JSON from LLM response."""
        response = response.strip()
        if response.startswith("```"):
            lines = response.split("\n")
            response = "\n".join(lines[1:-1] if lines[-1] == "```" else lines[1:])
        
        try:
            return json.loads(response)
        except json.JSONDecodeError:
            json_match = re.search(r'\{.*\}', response, re.DOTALL)
            if json_match:
                return json.loads(json_match.group())
            return {"success": False, "error": "Invalid JSON response"}

    async def resolve_user(
        self,
        user_reference: str,
        team_id: str
    ) -> Optional[str]:
        """
        Resolve a user reference to a user identifier.
        
        Handles:
        - Direct usernames: "rahul", "sarah"
        - Slack mentions: "<@U1234>"
        - Pronouns: "him", "her", "them" (needs context)
        """
        # Direct username
        if re.match(r'^[a-zA-Z][a-zA-Z0-9_-]*$', user_reference):
            return user_reference.lower()
        
        # Slack mention
        slack_match = re.match(r'<@([A-Z0-9]+)>', user_reference)
        if slack_match:
            return slack_match.group(1)
        
        return user_reference.lower()


# Singleton instance
nl_parser = NLCommandParser()


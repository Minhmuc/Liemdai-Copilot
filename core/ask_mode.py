"""
Ask Mode - Chatbot with task intent detection
"""
from typing import Tuple, Optional
from core.llm import LLMProvider

class AskMode:
    def __init__(self, llm: LLMProvider):
        self.llm = llm
        self.conversation_history = []
        
        # Task intent keywords (Vietnamese)
        self.task_keywords = [
            'tạo', 'làm', 'mở', 'viết', 'gõ', 'vẽ', 'search', 
            'tìm', 'copy', 'paste', 'download', 'upload', 
            'tắt', 'bật', 'install', 'cài đặt', 'xóa', 'di chuyển'
        ]
    
    def chat(self, user_input: str) -> Tuple[str, bool]:
        """
        Chat with user and detect task intent
        
        Returns:
            (response, should_switch_to_agent)
        """
        # Add to history
        self.conversation_history.append({"role": "user", "content": user_input})
        
        # Detect task intent
        has_task_intent = self._detect_task_intent(user_input)
        
        # Build prompt
        system_prompt = self._build_system_prompt(has_task_intent)
        chat_prompt = self._build_chat_prompt(user_input)
        
        # Get LLM response
        response = self.llm.chat(chat_prompt, system_prompt)
        
        # Add to history
        self.conversation_history.append({"role": "assistant", "content": response})
        
        return response, has_task_intent
    
    def _detect_task_intent(self, text: str) -> bool:
        """Detect if user wants to execute a task"""
        text_lower = text.lower()
        
        # Check for task keywords
        for keyword in self.task_keywords:
            if keyword in text_lower:
                return True
        
        # Check for imperative patterns
        imperative_patterns = ['giúp tôi', 'hãy', 'giúp mình', 'cho tôi', 'làm ơn']
        for pattern in imperative_patterns:
            if pattern in text_lower:
                return True
        
        return False
    
    def _build_system_prompt(self, has_task_intent: bool) -> str:
        """Build system prompt based on intent"""
        base_prompt = """Bạn là một trợ lý AI thân thiện và hữu ích. Hãy trả lời câu hỏi một cách tự nhiên, ngắn gọn và chính xác.

Chỉ khi được hỏi trực tiếp về danh tính (ai tạo ra bạn, bạn là ai...), hãy trả lời: "Tôi là Liemdai Copilot, được phát triển bởi Liemdai Team."

Không tự giới thiệu hoặc nhắc đến chế độ hoạt động nếu không được hỏi."""
        
        if has_task_intent:
            base_prompt += """

Lưu ý: User có vẻ muốn thực hiện một tác vụ cụ thể. Sau khi trả lời, hãy gợi ý ngắn gọn: "Tôi có thể tự động thực hiện việc này cho bạn nếu muốn." (không giải thích dài dòng về chế độ Agent)"""
        
        return base_prompt
    
    def _build_chat_prompt(self, user_input: str) -> str:
        """Build chat prompt with conversation history"""
        # Limit history to last 10 messages
        recent_history = self.conversation_history[-10:]
        
        prompt = ""
        for msg in recent_history:
            role = msg['role']
            content = msg['content']
            prompt += f"{role.capitalize()}: {content}\n"
        
        return prompt.strip()
    
    def clear_history(self):
        """Clear conversation history"""
        self.conversation_history = []

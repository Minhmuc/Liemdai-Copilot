"""
Ask Mode - Chatbot with task intent detection
"""
from typing import Tuple, Optional
from datetime import datetime
from core.llm import LLMProvider
from core.memory import Memory

class AskMode:
    def __init__(self, llm: LLMProvider, memory: Optional[Memory] = None):
        self.llm = llm
        self.memory = memory
        self.conversation_history = []
        self.current_session_id = None
        
        # Task intent keywords (Vietnamese)
        self.task_keywords = [
            'tạo', 'làm', 'mở', 'viết', 'gõ', 'vẽ', 'search', 
            'tìm', 'copy', 'paste', 'download', 'upload', 
            'tắt', 'bật', 'install', 'cài đặt', 'xóa', 'di chuyển'
        ]
    
    def set_session(self, session_id: str):
        """Set current session and load history from memory"""
        self.current_session_id = session_id
        
        if self.memory:
            # Load latest 10 messages from session
            history = self.memory.get_latest_messages(session_id, limit=10)
            self.conversation_history = [
                {"role": msg['role'], "content": msg['text']}
                for msg in history
            ]
            print(f"✅ Loaded {len(self.conversation_history)} messages from session {session_id}")
    
    def chat(self, user_input: str) -> Tuple[str, bool]:
        """
        Chat with user and detect task intent
        
        Returns:
            (response, should_switch_to_agent)
        """
        # Add to history
        self.conversation_history.append({"role": "user", "content": user_input})
        
        # Save to memory if available
        if self.memory and self.current_session_id:
            self.memory.add_message(user_input, "user", self.current_session_id)
        
        # Detect task intent
        has_task_intent = self._detect_task_intent(user_input)
        
        # Build prompt
        system_prompt = self._build_system_prompt(has_task_intent)
        chat_prompt = self._build_chat_prompt(user_input)
        
        # Get LLM response
        response = self.llm.chat(chat_prompt, system_prompt)
        
        # Add to history
        self.conversation_history.append({"role": "assistant", "content": response})
        
        # Save to memory if available
        if self.memory and self.current_session_id:
            self.memory.add_message(response, "assistant", self.current_session_id)
        
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
        now = datetime.now().astimezone()
        current_time_context = now.strftime('%Y-%m-%d %H:%M:%S %Z (UTC%z)')

        base_prompt = """Bạn là một trợ lý AI hữu ích và chuyên nghiệp.
    Hãy trả lời tự nhiên, rõ ý, súc tích và chính xác.
    Luôn xưng "tôi" khi trả lời người dùng.
    Có thể dùng emoji khi phù hợp (0-2 emoji mỗi câu trả lời), không lạm dụng.
    Giữ giọng điệu nhã nhặn, tránh sến/cringe hoặc cường điệu.

Thông tin thời gian hệ thống hiện tại: {current_time_context}
Khi người dùng hỏi về ngày/giờ hiện tại, hãy ưu tiên dùng chính thông tin thời gian này để trả lời, không suy đoán từ dữ liệu huấn luyện.

Chỉ khi được hỏi trực tiếp về danh tính (ai tạo ra bạn, bạn là ai...), hãy trả lời: "Tôi là Liemdai Copilot, được phát triển bởi Liemdai Team."

Không tự giới thiệu hoặc nhắc đến chế độ hoạt động nếu không được hỏi.""".format(
            current_time_context=current_time_context
        )
        
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

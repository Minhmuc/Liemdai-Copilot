"""
Liemdai Copilot - CLI Interface
Simple command-line interface for Ask & Agent modes
"""
import os
from dotenv import load_dotenv
from core.llm import LLMProvider
from core.ask_mode import AskMode
from core.agent_mode import AgentMode

load_dotenv()

class LiemdaiCopilot:
    def __init__(self):
        print("\n" + "="*60)
        print("🤖 Liemdai Copilot - AI Desktop Automation Agent")
        print("="*60 + "\n")
        
        # Initialize LLM
        print("⏳ Initializing LLM...")
        self.llm = LLMProvider()
        
        # Initialize modes
        self.ask_mode = AskMode(self.llm)
        self.agent_mode = AgentMode(self.llm)
        
        self.current_mode = 'ask'  # 'ask' or 'agent'
        
        print("\n✅ Liemdai Copilot ready!\n")
    
    def run(self):
        """Main interaction loop"""
        self._print_help()
        
        while True:
            try:
                # Show current mode
                mode_emoji = "💬" if self.current_mode == 'ask' else "🤖"
                user_input = input(f"\n{mode_emoji} [{self.current_mode.upper()}] You: ").strip()
                
                if not user_input:
                    continue
                
                # Handle special commands
                if user_input.lower() in ['/exit', '/quit', 'exit', 'quit']:
                    print("\n👋 Goodbye!")
                    break
                
                if user_input.lower() == '/help':
                    self._print_help()
                    continue
                
                if user_input.lower() == '/mode':
                    self._switch_mode()
                    continue
                
                if user_input.lower() == '/clear':
                    os.system('cls' if os.name == 'nt' else 'clear')
                    self._print_help()
                    continue
                
                # Execute based on mode
                if self.current_mode == 'ask':
                    self._handle_ask_mode(user_input)
                else:
                    self._handle_agent_mode(user_input)
            
            except KeyboardInterrupt:
                print("\n\n👋 Interrupted. Goodbye!")
                break
            except Exception as e:
                print(f"\n❌ Error: {e}")
    
    def _handle_ask_mode(self, user_input: str):
        """Handle Ask mode interaction"""
        response, has_task_intent = self.ask_mode.chat(user_input)
        
        print(f"\n💬 Assistant: {response}")
        
        # If task intent detected, ask to switch mode
        if has_task_intent:
            switch = input("\n❓ Switch to Agent mode? (y/n): ").strip().lower()
            if switch == 'y':
                self.current_mode = 'agent'
                print("\n✅ Switched to AGENT mode. Repeat your task to execute.")
    
    def _handle_agent_mode(self, user_input: str):
        """Handle Agent mode interaction"""
        result = self.agent_mode.execute_task(user_input)
        
        print(f"\n{result['final_message']}")
        print(f"📊 Iterations: {result['iterations']}")
        
        # Ask if want to return to Ask mode
        switch = input("\n❓ Return to Ask mode? (y/n): ").strip().lower()
        if switch == 'y':
            self.current_mode = 'ask'
            print("\n✅ Switched to ASK mode.")
    
    def _switch_mode(self):
        """Switch between Ask and Agent modes"""
        if self.current_mode == 'ask':
            self.current_mode = 'agent'
            print("\n✅ Switched to AGENT mode")
        else:
            self.current_mode = 'ask'
            print("\n✅ Switched to ASK mode")
    
    def _print_help(self):
        """Print help message"""
        print("""
╔════════════════════════════════════════════════════════════╗
║                    LIEMDAI COPILOT                         ║
╠════════════════════════════════════════════════════════════╣
║ 2 MODES:                                                   ║
║                                                            ║
║ 💬 ASK MODE     - Chatbot (như ChatGPT/Gemini)           ║
║                  - Trò chuyện, tư vấn                     ║
║                  - Tự động phát hiện task intent          ║
║                                                            ║
║ 🤖 AGENT MODE   - Code Interpreter Agent                  ║
║                  - Tự động thực hiện tasks                ║
║                  - Sinh Python code + execute             ║
║                  - Support: Office, Social Media, Email   ║
║                                                            ║
╠════════════════════════════════════════════════════════════╣
║ COMMANDS:                                                  ║
║   /mode   - Switch giữa Ask ↔️ Agent                      ║
║   /help   - Show help                                     ║
║   /clear  - Clear screen                                  ║
║   /exit   - Exit program                                  ║
╚════════════════════════════════════════════════════════════╝
""")


def main():
    copilot = LiemdaiCopilot()
    copilot.run()


if __name__ == "__main__":
    main()

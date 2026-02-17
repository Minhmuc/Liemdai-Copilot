"""
LLM Provider - Support Gemini and Local models
"""
import os
from typing import Optional
from dotenv import load_dotenv

load_dotenv()

class LLMProvider:
    def __init__(self):
        self.provider = os.getenv('LLM_PROVIDER', 'gemini')  # 'gemini' or 'local'
        self.model_name = os.getenv('MODEL_NAME', 'gemini-2.0-flash-exp')
        
        if self.provider == 'gemini':
            self._init_gemini()
        else:
            self._init_local()
    
    def _init_gemini(self):
        """Initialize Gemini API"""
        import google.generativeai as genai
        api_key = os.getenv('GEMINI_API_KEY')
        if not api_key:
            raise ValueError("GEMINI_API_KEY not found in .env")
        genai.configure(api_key=api_key)
        self.model = genai.GenerativeModel(self.model_name)
        print(f"✅ Gemini API initialized: {self.model_name}")
    
    def _init_local(self):
        """Initialize local model (Qwen)"""
        from transformers import AutoModelForCausalLM, AutoTokenizer
        import torch
        
        model_path = os.getenv('MODEL_PATH', 'Qwen/Qwen2.5-7B-Instruct')
        print(f"⏳ Loading local model: {model_path}...")
        
        self.tokenizer = AutoTokenizer.from_pretrained(model_path)
        self.model = AutoModelForCausalLM.from_pretrained(
            model_path,
            torch_dtype=torch.float16,
            device_map="auto",
            load_in_4bit=True if os.getenv('LOAD_IN_4BIT') == 'true' else False
        )
        print(f"✅ Local model loaded: {model_path}")
    
    def chat(self, prompt: str, system_prompt: Optional[str] = None) -> str:
        """Send prompt to LLM and get response"""
        if self.provider == 'gemini':
            return self._chat_gemini(prompt, system_prompt)
        else:
            return self._chat_local(prompt, system_prompt)
    
    def _chat_gemini(self, prompt: str, system_prompt: Optional[str]) -> str:
        """Chat with Gemini"""
        full_prompt = f"{system_prompt}\n\n{prompt}" if system_prompt else prompt
        response = self.model.generate_content(full_prompt)
        return response.text
    
    def _chat_local(self, prompt: str, system_prompt: Optional[str]) -> str:
        """Chat with local model"""
        messages = []
        if system_prompt:
            messages.append({"role": "system", "content": system_prompt})
        messages.append({"role": "user", "content": prompt})
        
        text = self.tokenizer.apply_chat_template(messages, tokenize=False, add_generation_prompt=True)
        inputs = self.tokenizer([text], return_tensors="pt").to(self.model.device)
        
        outputs = self.model.generate(**inputs, max_new_tokens=2048, temperature=0.7)
        response = self.tokenizer.decode(outputs[0], skip_special_tokens=True)
        
        # Extract assistant's response
        if "<|im_start|>assistant" in response:
            response = response.split("<|im_start|>assistant")[-1].strip()
        
        return response

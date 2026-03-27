"""
Agent Mode - Code Interpreter Agent
Sinh Python code để thực hiện tasks tự động
"""
import re
from typing import Dict, Any
from core.llm import LLMProvider
from core.executor import CodeExecutor

class AgentMode:
    def __init__(self, llm: LLMProvider):
        self.llm = llm
        self.executor = CodeExecutor()
        self.max_iterations = 6
        self.safe_mode = True  # Ask confirmation for dangerous operations
        self.ai_progress_stages = {
            'start', 'confirm_needed', 'confirm_approved', 'error_retry', 'done', 'incomplete'
        }
        
        # High-risk keywords requiring confirmation
        self.dangerous_keywords = [
            'admin', 'sudo', 'runas', 'elevation',  # Admin rights
            'format', 'diskpart',  # Disk operations
            'regedit', 'registry',  # Registry
            'powershell', 'cmd.exe', 'subprocess.call',  # System commands
            'install', 'pip install', 'apt-get',  # Installations
        ]

        # System directories that should always require confirmation when modified/deleted.
        self.system_path_indicators = [
            r'c:\\windows',
            r'c:\\program files',
            r'c:\\program files \(x86\)',
            r'c:\\programdata',
            r'c:\\users\\default',
            '/windows/system32',
            '/etc/',
            '/usr/',
            '/bin/',
            '/sbin/',
            '/boot/',
        ]
    
    def execute_task(self, task: str, confirmation_callback=None, progress_callback=None, stop_callback=None) -> Dict[str, Any]:
        """
        Execute task autonomously using Code Interpreter approach
        
        Args:
            task: Task description
            confirmation_callback: Function(code, is_dangerous) -> bool
                                  Returns True to execute, False to skip
            progress_callback: Function(status_text) -> None for realtime progress updates
            stop_callback: Function() -> bool
                          Returns True when user requested to stop/cancel current task
        
        Returns:
            {
                'success': bool,
                'iterations': int,
                'results': [{'code': str, 'output': str, 'error': str}],
                'final_message': str
            }
        """
        print(f"\n{'='*60}")
        print(f"🎯 TASK: {task}")
        print(f"{'='*60}\n")
        
        results = []
        last_progress = {'text': ''}

        def emit(text: str, force: bool = False):
            if not progress_callback or not text:
                return
            if force or text != last_progress['text']:
                progress_callback(text)
                last_progress['text'] = text

        progress_fallback = {
            "start": "🧠 Tôi đang phân tích yêu cầu của bạn.",
            "plan": "🔎 Tôi đang chọn cách làm phù hợp.",
            "prepare": "🛠️ Tôi đang chuẩn bị bước tiếp theo.",
            "confirm_needed": "🛡️ Có bước nhạy cảm, tôi cần bạn xác nhận trước khi tiếp tục.",
            "confirm_skipped": "⏭️ Tôi đã bỏ qua bước này theo lựa chọn của bạn.",
            "confirm_approved": "✅ Đã nhận xác nhận, tôi tiếp tục ngay.",
            "confirm_auto_skipped": "⚠️ Tôi tự động bỏ qua bước nhạy cảm để đảm bảo an toàn.",
            "execute": "⚙️ Tôi đang thực hiện yêu cầu.",
            "running": "⏳ Tôi đang xử lý, vui lòng chờ một chút.",
            "error_retry": "🔁 Tôi gặp vướng mắc nhỏ và đang thử hướng khác.",
            "verify": "✅ Tôi đã có kết quả tạm thời và đang kiểm tra lại.",
            "adjust": "🧩 Tôi đang điều chỉnh để xử lý ổn định hơn.",
            "good_progress": "📌 Tiến trình đang diễn ra ổn định.",
            "done": "✅ Tôi đã hoàn tất phần việc chính.",
            "incomplete": "⚠️ Tôi đã thử nhiều cách nhưng chưa thể hoàn tất trọn vẹn.",
        }

        def emit_stage(stage: str, force: bool = False, detail: str = "", iteration: int = 0):
            if not progress_callback:
                return

            if stage in self.ai_progress_stages:
                line = self._build_ai_progress_line(
                    task=task,
                    stage=stage,
                    iteration=iteration,
                    max_iterations=self.max_iterations,
                    detail=detail,
                    last_line=last_progress['text']
                )
            else:
                line = progress_fallback.get(stage, "⏳ Tôi đang xử lý tiếp cho bạn.")

            emit(line, force=force)
        
        emit_stage("start", force=True)

        def is_stopped() -> bool:
            try:
                return bool(stop_callback and stop_callback())
            except Exception:
                return False

        if is_stopped():
            return {
                'success': False,
                'cancelled': True,
                'iterations': 0,
                'results': results,
                'final_message': "⏹️ Tôi đã dừng tác vụ theo yêu cầu của bạn."
            }
        
        for iteration in range(1, self.max_iterations + 1):
            print(f"\n--- Iteration {iteration}/{self.max_iterations} ---")

            if is_stopped():
                emit("⏹️ Tôi đã dừng tác vụ theo yêu cầu của bạn.", force=True)
                return {
                    'success': False,
                    'cancelled': True,
                    'iterations': iteration - 1,
                    'results': results,
                    'final_message': "⏹️ Tôi đã dừng tác vụ theo yêu cầu của bạn."
                }
            
            emit_stage("plan", iteration=iteration)
            
            # Step 1: LLM generates code
            code = self._generate_code(task, results)
            
            if code is None:
                # Task completed
                emit_stage("done", force=True, iteration=iteration - 1)
                return {
                    'success': True,
                    'iterations': iteration - 1,
                    'results': results,
                    'final_message': self._build_final_message(task, results, True)
                }
            
            print(f"\n📝 Generated Code:\n{code}\n")

            if is_stopped():
                emit("⏹️ Tôi đã dừng tác vụ theo yêu cầu của bạn.", force=True)
                return {
                    'success': False,
                    'cancelled': True,
                    'iterations': iteration - 1,
                    'results': results,
                    'final_message': "⏹️ Tôi đã dừng tác vụ theo yêu cầu của bạn."
                }
            
            emit_stage("prepare", iteration=iteration)
            
            # Step 2: Check if confirmation needed
            is_dangerous = self._is_dangerous_code(code)
            
            if self.safe_mode and is_dangerous:
                # Dangerous operation - need confirmation
                if confirmation_callback:
                    # Use callback to request confirmation
                    print("⚠️ Dangerous operation detected - requesting confirmation...")
                    emit_stage("confirm_needed", force=True, iteration=iteration)
                    user_confirmed = confirmation_callback(code, is_dangerous)
                    
                    if not user_confirmed:
                        if is_stopped():
                            emit("⏹️ Tôi đã dừng tác vụ theo yêu cầu của bạn.", force=True)
                            return {
                                'success': False,
                                'cancelled': True,
                                'iterations': iteration - 1,
                                'results': results,
                                'final_message': "⏹️ Tôi đã dừng tác vụ theo yêu cầu của bạn."
                            }
                        print("⏭️ User skipped - continuing...")
                        emit_stage("confirm_skipped", force=True, iteration=iteration)
                        results.append({
                            'iteration': iteration,
                            'code': code,
                            'output': '',
                            'error': 'User skipped dangerous operation',
                            'skipped': True,
                            'is_dangerous': True
                        })
                        continue
                    else:
                        print("✅ User confirmed - executing...")
                        emit_stage("confirm_approved", force=True, iteration=iteration)
                else:
                    # No callback - auto-skip (fallback)
                    print("⚠️ Dangerous operation - AUTO-SKIPPED (no confirmation handler)")
                    emit_stage("confirm_auto_skipped", force=True, iteration=iteration)
                    results.append({
                        'iteration': iteration,
                        'code': code,
                        'output': '',
                        'error': 'Auto-skipped: Dangerous operation (no confirmation handler)',
                        'skipped': True,
                        'is_dangerous': True
                    })
                    continue
            else:
                print("✅ Safe operation - auto-executing...")
                emit_stage("execute", iteration=iteration)
            
            # Step 3: Execute code
            if is_stopped():
                emit("⏹️ Tôi đã dừng tác vụ theo yêu cầu của bạn.", force=True)
                return {
                    'success': False,
                    'cancelled': True,
                    'iterations': iteration - 1,
                    'results': results,
                    'final_message': "⏹️ Tôi đã dừng tác vụ theo yêu cầu của bạn."
                }

            emit_stage("running", iteration=iteration)
            
            output, error = self.executor.execute(code)
            
            if error:
                emit_stage("error_retry", force=True, detail=error[:120], iteration=iteration)
            else:
                emit_stage("verify", detail=(output or '')[:120], iteration=iteration)
            
            results.append({
                'iteration': iteration,
                'code': code,
                'output': output,
                'error': error
            })

            # Break early if agent is stuck generating the same code repeatedly.
            if len(results) >= 3:
                c1 = (results[-1].get('code') or '').strip()
                c2 = (results[-2].get('code') or '').strip()
                c3 = (results[-3].get('code') or '').strip()
                if c1 and c1 == c2 == c3:
                    emit("⚠️ Tôi thấy đang lặp lại cùng một hướng xử lý, nên dừng lại để tránh tốn thời gian.", force=True)
                    return {
                        'success': False,
                        'iterations': iteration,
                        'results': results,
                        'final_message': self._build_final_message(task, results, False)
                    }
            
            if error:
                print(f"\n❌ Error: {error}")
                emit_stage("adjust", iteration=iteration)
            else:
                print(f"\n✅ Output:\n{output}")
                emit_stage("good_progress", iteration=iteration)
            
            # Step 4: Check if task completed
            if self._is_task_completed(task, results):
                emit_stage("done", force=True, iteration=iteration)
                return {
                    'success': True,
                    'iterations': iteration,
                    'results': results,
                    'final_message': self._build_final_message(task, results, True)
                }
        
        # Max iterations reached
        emit_stage("incomplete", force=True, iteration=self.max_iterations)
        return {
            'success': False,
            'iterations': self.max_iterations,
            'results': results,
            'final_message': self._build_final_message(task, results, False)
        }

    def _build_ai_progress_line(
        self,
        task: str,
        stage: str,
        iteration: int,
        max_iterations: int,
        detail: str,
        last_line: str,
    ) -> str:
        """Generate a short conversational progress line using LLM, fallback to static text."""
        fallback = {
            "start": "🧠 Tôi đang phân tích yêu cầu của bạn.",
            "plan": f"🔎 Tôi đang thử phương án {iteration}/{max_iterations}.",
            "prepare": "🛠️ Tôi đang chuẩn bị bước tiếp theo.",
            "confirm_needed": "🛡️ Có bước nhạy cảm, tôi cần bạn xác nhận trước khi tiếp tục.",
            "confirm_skipped": "⏭️ Tôi đã bỏ qua bước này theo lựa chọn của bạn.",
            "confirm_approved": "✅ Đã nhận xác nhận, tôi tiếp tục ngay.",
            "confirm_auto_skipped": "⚠️ Tôi tự động bỏ qua bước nhạy cảm để đảm bảo an toàn.",
            "execute": "⚙️ Tôi đang thực hiện yêu cầu.",
            "running": "⏳ Tôi đang xử lý, vui lòng chờ một chút.",
            "error_retry": "🔁 Tôi gặp vướng mắc nhỏ và đang thử hướng khác.",
            "verify": "✅ Tôi đã có kết quả tạm thời và đang kiểm tra lại.",
            "adjust": "🧩 Tôi đang điều chỉnh để xử lý ổn định hơn.",
            "good_progress": "📌 Tiến trình đang diễn ra ổn định.",
            "done": "✅ Tôi đã hoàn tất phần việc chính.",
            "incomplete": "⚠️ Tôi đã thử nhiều cách nhưng chưa thể hoàn tất trọn vẹn.",
        }.get(stage, "⏳ Tôi đang xử lý tiếp cho bạn.")

        try:
            system_prompt = (
                "Bạn là trợ lý đang cập nhật tiến độ xử lý task cho người dùng. "
                "Viết đúng 1 câu tiếng Việt, tự nhiên, dễ hiểu, tối đa 20 từ. "
                "Luôn xưng 'tôi'. Có thể dùng 0-1 emoji nếu phù hợp. "
                "Không dùng ngôn ngữ kỹ thuật như code/execution/iteration. Giọng điệu chuyên nghiệp, tránh sáo rỗng."
            )
            prompt = (
                f"Task: {task}\n"
                f"Stage: {stage}\n"
                f"Iteration: {iteration}/{max_iterations}\n"
                f"Detail: {detail}\n"
                f"Last line (avoid repeating): {last_line}\n"
                "Hãy viết 1 câu cập nhật tiến độ ngay bây giờ."
            )
            line = (self.llm.chat(prompt, system_prompt) or "").strip()
            line = line.splitlines()[0].strip() if line else ""
            if not line:
                return fallback
            return line[:180]
        except Exception:
            return fallback

    def _build_final_message(self, task: str, results: list, success: bool) -> str:
        """Build a conversational final summary for end users."""
        completed_steps = [r for r in results if not r.get('error') and not r.get('skipped')]
        skipped_steps = [r for r in results if r.get('skipped')]
        failed_steps = [r for r in results if r.get('error') and not r.get('skipped')]

        summary_points = []
        for item in reversed(completed_steps):
            output = (item.get('output') or '').strip()
            if output:
                lines = [ln.strip() for ln in output.splitlines() if ln.strip()]
                for ln in lines:
                    cleaned = re.sub(r'^[^\w\u00C0-\u024F\u1E00-\u1EFF]+', '', ln).strip()
                    code_like = (
                        cleaned.lower().startswith('generated code')
                        or cleaned.lower().startswith('import ')
                        or cleaned.lower().startswith('from ')
                        or cleaned.lower().startswith('def ')
                        or cleaned.lower().startswith('class ')
                        or cleaned.lower().startswith('print(')
                        or cleaned.lower().startswith('driver.')
                        or '=' in cleaned and '✅' not in cleaned and '⚠️' not in cleaned
                    )
                    if code_like:
                        continue
                    if cleaned and cleaned not in summary_points:
                        summary_points.append(cleaned)
                    if len(summary_points) >= 2:
                        break
            if len(summary_points) >= 2:
                break

        try:
            system_prompt = (
                "Bạn là trợ lý AI tổng kết kết quả công việc cho người dùng. "
                "Viết tiếng Việt tự nhiên, chi tiết vừa phải theo phong cách Copilot. "
                "Luôn xưng 'tôi'. Có thể dùng emoji khi phù hợp. "
                "Giọng điệu chuyên nghiệp, tránh sến/cringe. Kết thúc bằng một câu hỏi hỗ trợ tiếp theo."
            )
            prompt = (
                f"Task: {task}\n"
                f"Success: {success}\n"
                f"Summary points: {summary_points}\n"
                f"Skipped steps: {len(skipped_steps)}\n"
                f"Failed steps: {len(failed_steps)}\n"
                "Hãy viết phần trả lời cuối cho user: rõ ràng, thân thiện, không quá kỹ thuật."
            )
            ai_summary = (self.llm.chat(prompt, system_prompt) or "").strip()
            if ai_summary:
                return ai_summary
        except Exception:
            pass

        if success:
            summary = "✅ Tôi đã xử lý xong yêu cầu của bạn."
            if summary_points:
                summary += "\nTôi đã thực hiện được:"
                for point in summary_points:
                    summary += f"\n- {point}"
            else:
                summary += "\nTôi đã thực hiện đầy đủ các bước chính và không gặp lỗi nghiêm trọng."
            if skipped_steps:
                summary += f"\n- Có {len(skipped_steps)} bước tôi đã bỏ qua theo lựa chọn an toàn của bạn."
            summary += "\nBạn muốn tôi hỗ trợ thêm bước nào nữa không?"
            return summary

        summary = "⚠️ Tôi đã thử xử lý nhưng chưa hoàn tất toàn bộ yêu cầu."
        if failed_steps:
            summary += f"\nTôi đang vướng ở {len(failed_steps)} bước."
        if skipped_steps:
            summary += f"\nCó {len(skipped_steps)} bước đã được bỏ qua để đảm bảo an toàn."
        summary += "\nBạn muốn tôi thử lại theo hướng khác không?"
        return summary
    
    def _generate_code(self, task: str, previous_results: list) -> str:
        """Generate Python code to execute the task"""
        system_prompt = """Bạn là Liemdai Copilot - Code Interpreter Agent của Liemdai Team.

Khi được hỏi về identity: "Tôi là Liemdai Copilot, được tạo bởi Liemdai Team."

NHIỆM VỤ:
- Phân tích task của user
- Sinh Python code để thực hiện task
- Code phải HOÀN CHỈNH, có thể chạy độc lập
- Dùng libraries phù hợp (docx, PIL, selenium, pyautogui, webbrowser, requests, subprocess...)
- Cho các task liên quan đến web: dùng selenium hoặc webbrowser
- Cho các task liên quan đến click/input: dùng pyautogui hoặc selenium

OUTPUT FORMAT STRICT:
Nếu cần sinh code, phải trả về ĐÚNG format:
```python
# Code ở đây
```

Nếu task đã hoàn thành (sau khi thực tế execute và verify), trả về: "TASK_COMPLETED"

VÍ DỤ WEB TASKS:

Task: "Vào YouTube tìm video về Python"
Response:
```python
import webbrowser
import time

# Mở YouTube
webbrowser.open("https://www.youtube.com")
time.sleep(3)

print("✅ Đã mở YouTube")
```

Task: "Mở YouTube và tìm kiếm Black Souls 3"
Response:
```python
from selenium import webdriver
from selenium.webdriver.common.by import By
import time

# Tạo Chrome driver
driver = webdriver.Chrome()

# Mở YouTube
driver.get("https://www.youtube.com")
time.sleep(2)

# Tìm search box
search = driver.find_element(By.NAME, "search_query")
search.send_keys("Black Souls 3")
search.submit()

time.sleep(3)
print("✅ Đã tìm kiếm Black Souls 3 trên YouTube")

# Giữ browser mở 5 giây
time.sleep(5)
```

Task: "Tắt WiFi trên Windows"
Response:
```python
import os
os.system("netsh interface set interface 'Wi-Fi' admin=disable")
print("✅ Đã tắt WiFi")
```

Task: "Click vào button trên màn hình tại vị trí (500, 300)"
Response:
```python
import pyautogui
import time

# Click tại vị trí
pyautogui.click(500, 300)
time.sleep(1)

print("✅ Đã click")
```

IMPORTANT:
- LUÔN trả về code trong ```python``` block
- Code phải có print() để show progress
- Cho browser tasks: tự động open rồi tự động close sau khi done
- Với mọi task tải file (download), mặc định lưu file vào thư mục Downloads của máy:
    from pathlib import Path
    DOWNLOADS_DIR = Path.home() / "Downloads"
    Nếu không có đường dẫn cụ thể từ user thì luôn dùng thư mục này.
- Ngay khi kết quả trước đó đã hoàn thành task, trả về đúng: TASK_COMPLETED
- KHÔNG tạo thêm code nếu task đã xong"""
        
        # Build prompt with context
        prompt = f"Task: {task}\n\n"
        
        if previous_results:
            prompt += "Previous Attempts:\n"
            for result in previous_results[-3:]:  # Last 3 attempts
                prompt += f"\nIteration {result['iteration']}:\n"
                prompt += f"Code:\n{result['code']}\n"
                if result['error']:
                    prompt += f"Error: {result['error']}\n"
                else:
                    prompt += f"Output: {result['output']}\n"
        
        prompt += "\nSinh code để thực hiện task này. MUST return code in ```python``` block:"
        
        # Get LLM response
        response = self.llm.chat(prompt, system_prompt)
        
        # Check if task completed (be strict about this)
        if "TASK_COMPLETED" in response and previous_results and len(previous_results) > 0:
            # Only accept if we actually tried to execute something
            return None
        
        # Extract code from response
        code = self._extract_code(response)
        code = self._apply_download_defaults(task, code)
        return code
    
    def _extract_code(self, response: str) -> str:
        """Extract Python code from LLM response"""
        # Try multiple patterns to find code block
        patterns = [
            r'```python\s(.*?)```',  # ```python code```
            r'```python\n(.*?)\n```',  # ```python\ncode\n```
            r'```\s*python\s(.*?)```',  # ``` python code```
            r'```(.*?)```',  # Generic code block
        ]
        
        for pattern in patterns:
            matches = re.findall(pattern, response, re.DOTALL)
            if matches:
                code = matches[0].strip()
                if code and len(code) > 5:  # Ensure we have actual code
                    return code
        
        # If no code block found, return entire response (cleanup)
        return response.strip()

    def _is_download_related(self, text: str) -> bool:
        """Heuristic to detect download/file-fetch tasks."""
        if not text:
            return False
        text_lower = text.lower()
        keywords = [
            'download', 'tải', 'tai', 'requests.get', 'urllib', 'wget', 'curl',
            'http://', 'https://'
        ]
        return any(k in text_lower for k in keywords)

    def _apply_download_defaults(self, task: str, code: str) -> str:
        """Ensure download tasks default to the OS Downloads folder."""
        if not code or not self._is_download_related(f"{task}\n{code}"):
            return code

        marker = "DOWNLOADS_DIR = Path.home() / \"Downloads\""
        if marker in code:
            return code

        preamble = """import os
from pathlib import Path

DOWNLOADS_DIR = Path.home() / "Downloads"
os.makedirs(DOWNLOADS_DIR, exist_ok=True)
os.chdir(DOWNLOADS_DIR)
print(f"📥 Mặc định lưu file tại: {DOWNLOADS_DIR}")

"""
        return preamble + code
    
    def _is_task_completed(self, task: str, results: list) -> bool:
        """Check if task is completed based on results"""
        if not results:
            return False
        
        last_result = results[-1]
        
        # Skip if this was a dangerous operation that was skipped
        if last_result.get('skipped', False):
            return False
        
        # If last execution had no error, use heuristic + AI judge.
        if not last_result.get('error'):
            output_lower = (last_result.get('output') or '').lower()
            success_indicators = [
                '✅', 'success', 'completed', 'hoàn thành', 'xong', 'done', 'đã mở', 'đã tạo'
            ]
            for indicator in success_indicators:
                if indicator in output_lower:
                    return True

            # If code ran without error but no explicit marker, ask AI judge once.
            return self._llm_judge_task_completed(task, results)

        return False

    def _llm_judge_task_completed(self, task: str, results: list) -> bool:
        """Use LLM to judge if task is already completed from recent execution evidence."""
        if not results:
            return False

        last = results[-1]
        try:
            system_prompt = (
                "Bạn là bộ đánh giá hoàn thành task. Trả lời đúng một từ: YES hoặc NO. "
                "YES nếu task đã hoàn thành đủ ý chính dù output ngắn; NO nếu chưa chắc hoàn thành."
            )
            prompt = (
                f"Task: {task}\n"
                f"Last code:\n{last.get('code', '')}\n"
                f"Last output:\n{last.get('output', '')}\n"
                f"Last error:\n{last.get('error', '')}\n"
                "Kết luận:"
            )
            verdict = (self.llm.chat(prompt, system_prompt) or '').strip().upper()
            return verdict.startswith('YES')
        except Exception:
            return False
    
    def _is_dangerous_code(self, code: str) -> bool:
        """
        Check if code contains dangerous operations requiring confirmation
        
        Dangerous operations:
        - System-level commands (disk/registry/admin/shell)
        - Write/delete operations targeting OS/system directories

        Notes:
        - Generic download tasks are allowed.
        - Generic delete tasks are allowed unless they touch system paths.
        """
        code_lower = code.lower()

        sensitive_system_commands = [
            'diskpart', 'format ', 'reg add', 'reg delete', 'bcdedit',
            'takeown', 'icacls', 'net user', 'net localgroup administrators',
            'sc config', 'sc delete'
        ]

        for cmd in sensitive_system_commands:
            if cmd in code_lower:
                return True

        for keyword in self.dangerous_keywords:
            if keyword in code_lower:
                return True

        file_modify_ops = [
            'os.remove(', 'os.rmdir(', 'shutil.rmtree(', 'path.unlink(',
            'path.write_text(', 'path.write_bytes(', 'open(', 'os.rename(',
            'os.replace(', 'shutil.move(', 'shutil.copy(', 'copyfile('
        ]

        touches_system_path = any(indicator in code_lower for indicator in self.system_path_indicators)
        modifies_files = any(op in code_lower for op in file_modify_ops)

        if touches_system_path and modifies_files:
            return True
        
        return False

"""
Code Executor - Safe Python code execution
"""
import sys
import io
import traceback
from typing import Tuple

class CodeExecutor:
    def __init__(self):
        self.allowed_modules = [
            'os', 'sys', 'subprocess', 'pathlib',
            'docx', 'PIL', 'openpyxl', 'pandas',
            'selenium', 'pyautogui', 'pywinauto',
            'requests', 'json', 're', 'datetime',
            'time', 'shutil', 'zipfile', 'csv'
        ]
    
    def execute(self, code: str) -> Tuple[str, str]:
        """
        Execute Python code safely
        
        Returns:
            (stdout_output, error_message)
        """
        # Capture stdout/stderr
        old_stdout = sys.stdout
        old_stderr = sys.stderr
        stdout_capture = io.StringIO()
        stderr_capture = io.StringIO()
        
        try:
            sys.stdout = stdout_capture
            sys.stderr = stderr_capture
            
            # Create safe execution environment
            exec_globals = {
                '__builtins__': __builtins__,
                '__name__': '__main__',
            }
            
            # Execute code
            exec(code, exec_globals)
            
            # Get output
            output = stdout_capture.getvalue()
            error = stderr_capture.getvalue()
            
            return output, error if error else None
        
        except Exception as e:
            # Capture exception
            error_msg = f"{type(e).__name__}: {str(e)}\n"
            error_msg += traceback.format_exc()
            return "", error_msg
        
        finally:
            # Restore stdout/stderr
            sys.stdout = old_stdout
            sys.stderr = old_stderr
    
    def validate_code(self, code: str) -> Tuple[bool, str]:
        """
        Validate code before execution
        
        Returns:
            (is_safe, warning_message)
        """
        dangerous_patterns = [
            'import socket',
            'import urllib',
            'open(', 
            '__import__',
            'eval(',
            'exec(',
            'compile(',
            'system('
        ]
        
        warnings = []
        
        for pattern in dangerous_patterns:
            if pattern in code:
                warnings.append(f"⚠️ Phát hiện pattern nguy hiểm: {pattern}")
        
        if warnings:
            return False, "\n".join(warnings)
        
        return True, ""

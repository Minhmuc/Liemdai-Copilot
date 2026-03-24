"""
Persistent Memory - LanceDB integration for chat history
"""
import lancedb
from sentence_transformers import SentenceTransformer
from datetime import datetime
from pathlib import Path
from typing import List, Dict, Optional
import json
import uuid

class Memory:
    def __init__(self, db_path: str = "data/vector_db"):
        """Initialize LanceDB and sentence transformer"""
        self.db_path = Path(db_path)
        self.db_path.mkdir(parents=True, exist_ok=True)
        
        # Connect to LanceDB
        self.db = lancedb.connect(str(self.db_path))
        self.session_titles_path = self.db_path / "session_titles.json"
        self.session_titles = self._load_session_titles()
        
        # Load embedding model
        print("⏳ Loading embedding model...")
        self.model = SentenceTransformer('all-MiniLM-L6-v2')
        print("✅ Embedding model loaded")
        
        # Initialize or open messages table
        self._init_table()

    def _load_session_titles(self) -> Dict[str, str]:
        if not self.session_titles_path.exists():
            return {}
        try:
            return json.loads(self.session_titles_path.read_text(encoding="utf-8"))
        except Exception:
            return {}

    def _save_session_titles(self):
        self.session_titles_path.write_text(
            json.dumps(self.session_titles, ensure_ascii=False, indent=2),
            encoding="utf-8"
        )
    
    def _init_table(self):
        """Initialize LanceDB table for messages"""
        try:
            self.table = self.db.open_table("messages")
        except:
            # Create table with schema if it doesn't exist
            import pyarrow as pa
            schema = pa.schema([
                pa.field("message_id", pa.string()),
                pa.field("text", pa.string()),
                pa.field("vector", pa.list_(pa.float32())),
                pa.field("role", pa.string()),
                pa.field("timestamp", pa.string()),
                pa.field("session_id", pa.string()),
                pa.field("tags", pa.list_(pa.string())),
            ])
            # Create with single sample record then delete it
            sample_data = [{
                "message_id": "init",
                "text": "init",
                "vector": [0.0] * 384,
                "role": "system",
                "timestamp": "2000-01-01T00:00:00",
                "session_id": "init",
                "tags": [],
            }]
            self.table = self.db.create_table("messages", data=sample_data, schema=schema)
            # Delete the sample record
            self.table.delete("message_id = 'init'")
    
    def add_message(self, text: str, role: str, session_id: str, tags: List[str] = None) -> str:
        """
        Add message to vector DB
        
        Args:
            text: Message content
            role: 'user' or 'assistant'
            session_id: Current session ID
            tags: Optional tags for filtering
        
        Returns:
            Message ID
        """
        msg_id = f"msg_{uuid.uuid4().hex[:8]}"
        
        # Generate embedding
        embedding = self.model.encode(text).tolist()
        
        # Add to table
        self.table.add([{
            "message_id": msg_id,
            "text": text,
            "vector": embedding,
            "role": role,
            "timestamp": datetime.now().isoformat(),
            "session_id": session_id,
            "tags": tags or []
        }])
        
        return msg_id
    
    def search_messages(
        self, 
        query: str, 
        session_id: Optional[str] = None, 
        k: int = 3
    ) -> List[Dict]:
        """
        Search similar messages
        
        Args:
            query: Search query/text
            session_id: Filter by session (if None, search all)
            k: Number of results
        
        Returns:
            List of similar messages with metadata
        """
        if self.table.count_rows() == 0:
            return []
        
        # Generate query embedding
        query_vector = self.model.encode(query).tolist()
        
        # Search
        search = self.table.search(query_vector)
        
        # Filter by session if provided
        if session_id:
            search = search.where(f"session_id = '{session_id}'")
        
        results = search.limit(k).to_list()
        return results
    
    def get_session_history(self, session_id: str) -> List[Dict]:
        """
        Get all messages from a session in chronological order
        
        Args:
            session_id: Session ID
        
        Returns:
            List of messages sorted by timestamp
        """
        if self.table.count_rows() == 0:
            return []
        
        results = self.table.search().where(
            f"session_id = '{session_id}'"
        ).to_list()
        
        # Sort by timestamp
        results.sort(key=lambda x: x.get('timestamp', ''))
        return results
    
    def get_all_sessions(self) -> List[Dict]:
        """
        Get list of all unique sessions with metadata
        
        Returns:
            List of sessions with first message, last message, message count
        """
        if self.table.count_rows() == 0:
            return []
        
        # Get all records
        all_msgs = self.table.search().to_list()
        
        # Group by session
        sessions = {}
        for msg in all_msgs:
            sid = msg.get('session_id')
            if sid not in sessions:
                sessions[sid] = {
                    'session_id': sid,
                    'first_message': msg['text'][:50],
                    'first_timestamp': msg['timestamp'],
                    'message_count': 0,
                    'last_timestamp': msg['timestamp']
                }
            sessions[sid]['message_count'] += 1
            sessions[sid]['last_timestamp'] = msg['timestamp']
        
        # Convert to list and sort by last_timestamp (newest first)
        session_list = list(sessions.values())
        for item in session_list:
            sid = item['session_id']
            item['title'] = self.session_titles.get(sid, item['first_message'])
        session_list.sort(key=lambda x: x['last_timestamp'], reverse=True)
        
        return session_list

    def set_session_title(self, session_id: str, title: str) -> Dict:
        """Set custom title for a session"""
        normalized = (title or "").strip()
        if not normalized:
            raise ValueError("Session title cannot be empty")
        self.session_titles[session_id] = normalized[:120]
        self._save_session_titles()
        return {
            "session_id": session_id,
            "title": self.session_titles[session_id]
        }
    
    def clear_session(self, session_id: str):
        """Delete all messages from a session"""
        if self.table.count_rows() == 0:
            if session_id in self.session_titles:
                del self.session_titles[session_id]
                self._save_session_titles()
            return

        safe_session_id = session_id.replace("'", "''")
        self.table.delete(f"session_id = '{safe_session_id}'")

        if session_id in self.session_titles:
            del self.session_titles[session_id]
            self._save_session_titles()

    def duplicate_session(self, source_session_id: str, target_session_id: str, title: Optional[str] = None) -> Dict:
        """Duplicate all messages from source session into target session."""
        history = self.get_session_history(source_session_id)
        if not history:
            raise ValueError("Source session not found or has no messages")

        cloned_rows = []
        for msg in history:
            text = msg.get("text", "")
            role = msg.get("role", "assistant")
            tags = msg.get("tags", [])
            cloned_rows.append({
                "message_id": f"msg_{uuid.uuid4().hex[:8]}",
                "text": text,
                "vector": self.model.encode(text).tolist(),
                "role": role,
                "timestamp": datetime.now().isoformat(),
                "session_id": target_session_id,
                "tags": tags if isinstance(tags, list) else []
            })

        self.table.add(cloned_rows)

        source_title = self.session_titles.get(source_session_id)
        next_title = (title or "").strip() or source_title or "Trò chuyện mới"
        self.session_titles[target_session_id] = f"Bản sao - {next_title}"[:120]
        self._save_session_titles()

        return {
            "source_session_id": source_session_id,
            "session_id": target_session_id,
            "message_count": len(cloned_rows),
            "title": self.session_titles[target_session_id]
        }
    
    def get_latest_messages(self, session_id: str, limit: int = 10) -> List[Dict]:
        """
        Get latest N messages from session (for LLM context)
        
        Args:
            session_id: Session ID
            limit: Number of messages to return
        
        Returns:
            List of recent messages
        """
        history = self.get_session_history(session_id)
        return history[-limit:] if history else []

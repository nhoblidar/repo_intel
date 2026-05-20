"""
Custom AST Parser - Parse code into abstract syntax tree
Supports multiple languages using tree-sitter
"""
from typing import Dict, List, Any, Optional


class CustomASTParser:
    """Parse code into AST for analysis"""
    
    LANGUAGE_EXTENSIONS = {
        'python': ['.py'],
        'javascript': ['.js', '.jsx', '.ts', '.tsx'],
        'java': ['.java'],
        'cpp': ['.cpp', '.cc', '.h'],
        'csharp': ['.cs'],
        'go': ['.go'],
        'rust': ['.rs'],
        'typescript': ['.ts', '.tsx'],
    }
    
    def __init__(self):
        """Initialize parser"""
        try:
            import tree_sitter
            self.tree_sitter_available = True
        except:
            self.tree_sitter_available = False
    
    
    def parse(self, content: str, language: str = "python") -> Dict[str, Any]:
        """
        Parse code content into AST
        
        Args:
            content: Source code string
            language: Programming language
        
        Returns:
            Parsed AST structure
        """
        try:
            # If tree-sitter is available, use it
            if self.tree_sitter_available:
                return self._parse_with_tree_sitter(content, language)
        except:
            pass
        
        # Fallback: basic parsing
        return self._basic_parse(content, language)
    
    
    def _parse_with_tree_sitter(self, content: str, language: str) -> Dict[str, Any]:
        """Parse using tree-sitter"""
        try:
            import tree_sitter
            from tree_sitter import Language, Parser
            
            # Load language grammar
            try:
                lang = Language(f"build/languages-{language}.so", language)
                parser = Parser()
                parser.set_language(lang)
                tree = parser.parse(content.encode())
                
                return {
                    "type": "ast",
                    "language": language,
                    "tree": str(tree),
                    "root_node": self._node_to_dict(tree.root_node),
                    "error_count": tree.root_node.child_count
                }
            except:
                return self._basic_parse(content, language)
        except:
            return self._basic_parse(content, language)
    
    
    def _basic_parse(self, content: str, language: str) -> Dict[str, Any]:
        """Basic parsing without tree-sitter"""
        
        # Extract functions, classes, imports
        functions = []
        classes = []
        imports = []
        
        lines = content.split('\n')
        
        for i, line in enumerate(lines):
            stripped = line.strip()
            
            # Extract imports
            if stripped.startswith('import ') or stripped.startswith('from '):
                imports.append(stripped)
            
            # Extract function definitions
            if stripped.startswith('def ') or stripped.startswith('function '):
                func_name = stripped.split('(')[0].replace('def ', '').replace('function ', '').strip()
                functions.append({
                    "name": func_name,
                    "line": i,
                    "type": "function"
                })
            
            # Extract class definitions
            if stripped.startswith('class '):
                class_name = stripped.split('(')[0].split(':')[0].replace('class ', '').strip()
                classes.append({
                    "name": class_name,
                    "line": i,
                    "type": "class"
                })
        
        return {
            "type": "ast",
            "language": language,
            "functions": functions,
            "classes": classes,
            "imports": imports,
            "line_count": len(lines)
        }
    
    
    def _node_to_dict(self, node) -> Dict[str, Any]:
        """Convert tree-sitter node to dict"""
        return {
            "type": node.type,
            "start_point": node.start_point,
            "end_point": node.end_point,
            "child_count": node.child_count
        }
    
    
    def extract_symbols(self, content: str, language: str = "python") -> Dict[str, List[str]]:
        """Extract all symbols (functions, classes, variables)"""
        ast = self.parse(content, language)
        
        return {
            "functions": [f.get("name") for f in ast.get("functions", [])],
            "classes": [c.get("name") for c in ast.get("classes", [])],
            "imports": ast.get("imports", [])
        }
    
    
    def extract_dependencies(self, content: str, language: str = "python") -> List[str]:
        """Extract all dependencies/imports"""
        ast = self.parse(content, language)
        return ast.get("imports", [])

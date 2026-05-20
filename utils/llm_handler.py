"""
LLM Handler - Unified interface for multiple LLM providers
Supports OpenAI, Anthropic, Gemini, and Groq
"""
import os
from typing import Optional, Dict, Any
import json
from dotenv import load_dotenv

load_dotenv()


class LLMHandler:
    \"\"\"Unified handler for multiple LLM providers\"\"\"
    
    def __init__(self):
        self.openai_key = os.getenv("OPENAI_API_KEY")
        self.anthropic_key = os.getenv("ANTHROPIC_API_KEY")
        self.gemini_key = os.getenv("GEMINI_API_KEY")
        self.groq_key = os.getenv("GROQ_API_KEY")
        
        # Determine default provider
        if self.openai_key:
            self.default_provider = "openai"
        elif self.anthropic_key:
            self.default_provider = "anthropic"
        elif self.gemini_key:
            self.default_provider = "gemini"
        elif self.groq_key:
            self.default_provider = "groq"
        else:
            self.default_provider = None
    
    
    async def generate_response(
        self,
        system_prompt: str,
        user_prompt: str,
        temperature: float = 0.7,
        max_tokens: int = 2000,
        provider: Optional[str] = None,
        model: Optional[str] = None
    ) -> str:
        \"\"\"
        Generate a response from an LLM
        
        Args:
            system_prompt: System context/instructions
            user_prompt: User's question/request
            temperature: Creativity level (0-1)
            max_tokens: Maximum response length
            provider: LLM provider (auto-selects if None)
            model: Specific model to use
        
        Returns:
            Generated response text
        \"\"\"
        
        provider = provider or self.default_provider
        
        if not provider:
            raise ValueError("No LLM provider configured")
        
        if provider == "openai":
            return await self._openai_request(
                system_prompt, user_prompt, temperature, max_tokens, model
            )
        elif provider == "anthropic":
            return await self._anthropic_request(
                system_prompt, user_prompt, temperature, max_tokens, model
            )
        elif provider == "gemini":
            return await self._gemini_request(
                system_prompt, user_prompt, temperature, max_tokens, model
            )
        elif provider == "groq":
            return await self._groq_request(
                system_prompt, user_prompt, temperature, max_tokens, model
            )
        else:
            raise ValueError(f"Unknown provider: {provider}")
    
    
    async def _openai_request(
        self,
        system_prompt: str,
        user_prompt: str,
        temperature: float,
        max_tokens: int,
        model: Optional[str] = None
    ) -> str:
        \"\"\"OpenAI API request\"\"\"
        try:
            from openai import AsyncOpenAI
            
            client = AsyncOpenAI(api_key=self.openai_key)
            
            response = await client.chat.completions.create(
                model=model or "gpt-4o-mini",
                temperature=temperature,
                max_tokens=max_tokens,
                messages=[
                    {"role": "system", "content": system_prompt},
                    {"role": "user", "content": user_prompt}
                ]
            )
            
            return response.choices[0].message.content
        
        except Exception as e:
            raise Exception(f"OpenAI error: {str(e)}")
    
    
    async def _anthropic_request(
        self,
        system_prompt: str,
        user_prompt: str,
        temperature: float,
        max_tokens: int,
        model: Optional[str] = None
    ) -> str:
        \"\"\"Anthropic Claude API request\"\"\"
        try:
            from anthropic import AsyncAnthropic
            
            client = AsyncAnthropic(api_key=self.anthropic_key)
            
            response = await client.messages.create(
                model=model or "claude-3-5-sonnet-20241022",
                temperature=temperature,
                max_tokens=max_tokens,
                system=system_prompt,
                messages=[
                    {"role": "user", "content": user_prompt}
                ]
            )
            
            return response.content[0].text
        
        except Exception as e:
            raise Exception(f"Anthropic error: {str(e)}")
    
    
    async def _gemini_request(
        self,
        system_prompt: str,
        user_prompt: str,
        temperature: float,
        max_tokens: int,
        model: Optional[str] = None
    ) -> str:
        \"\"\"Google Gemini API request\"\"\"
        try:
            import google.generativeai as genai
            
            genai.configure(api_key=self.gemini_key)
            
            model_obj = genai.GenerativeModel(
                model_name=model or "gemini-1.5-pro",
                system_instruction=system_prompt
            )
            
            response = await model_obj.generate_content_async(
                user_prompt,
                generation_config=genai.types.GenerationConfig(
                    temperature=temperature,
                    max_output_tokens=max_tokens
                )
            )
            
            return response.text
        
        except Exception as e:
            raise Exception(f"Gemini error: {str(e)}")
    
    
    async def _groq_request(
        self,
        system_prompt: str,
        user_prompt: str,
        temperature: float,
        max_tokens: int,
        model: Optional[str] = None
    ) -> str:
        \"\"\"Groq API request\"\"\"
        try:
            from groq import AsyncGroq
            
            client = AsyncGroq(api_key=self.groq_key)
            
            response = await client.chat.completions.create(
                model=model or "mixtral-8x7b-32768",
                temperature=temperature,
                max_tokens=max_tokens,
                messages=[
                    {"role": "system", "content": system_prompt},
                    {"role": "user", "content": user_prompt}
                ]
            )
            
            return response.choices[0].message.content
        
        except Exception as e:
            raise Exception(f"Groq error: {str(e)}")
    
    
    async def get_providers(self) -> Dict[str, bool]:
        \"\"\"Get list of available providers\"\"\"
        return {
            "openai": bool(self.openai_key),
            "anthropic": bool(self.anthropic_key),
            "gemini": bool(self.gemini_key),
            "groq": bool(self.groq_key),
            "default": self.default_provider
        }
    
    
    async def estimate_cost(
        self,
        provider: str,
        input_tokens: int,
        output_tokens: int
    ) -> Dict[str, Any]:
        \"\"\"Estimate cost of an LLM request\"\"\"
        
        # Pricing as of May 2024 (update as needed)
        pricing = {
            "openai": {
                "gpt-4o-mini": {
                    "input": 0.15 / 1_000_000,
                    "output": 0.60 / 1_000_000
                },
                "gpt-4-turbo": {
                    "input": 10 / 1_000_000,
                    "output": 30 / 1_000_000
                }
            },
            "anthropic": {
                "claude-3-5-sonnet": {
                    "input": 3 / 1_000_000,
                    "output": 15 / 1_000_000
                },
                "claude-3-opus": {
                    "input": 15 / 1_000_000,
                    "output": 75 / 1_000_000
                }
            },
            "gemini": {
                "gemini-1.5-pro": {
                    "input": 7.5 / 1_000_000,
                    "output": 30 / 1_000_000
                }
            },
            "groq": {
                "mixtral-8x7b": {
                    "input": 0,
                    "output": 0
                }
            }
        }
        
        provider_pricing = pricing.get(provider, {})
        model_pricing = list(provider_pricing.values())[0] if provider_pricing else {}
        
        if not model_pricing:
            return {
                "provider": provider,
                "input_tokens": input_tokens,
                "output_tokens": output_tokens,
                "estimated_cost_usd": None,
                "note": "Pricing not available"
            }
        
        input_cost = input_tokens * model_pricing.get("input", 0)
        output_cost = output_tokens * model_pricing.get("output", 0)
        total_cost = input_cost + output_cost
        
        return {
            "provider": provider,
            "input_tokens": input_tokens,
            "output_tokens": output_tokens,
            "input_cost_usd": round(input_cost, 6),
            "output_cost_usd": round(output_cost, 6),
            "estimated_cost_usd": round(total_cost, 6)
        }

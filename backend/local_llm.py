r"""
Local LLM Manager — WelfareIntel
Provides a shared singleton instance of the locally loaded GGUF model
using `llama-cpp-python` directly in Python, without requiring Ollama or LM Studio.

Model:
- Default path: C:\Users\blue0\.lmstudio\models\lmstudio-community\Qwen2.5-VL-3B-Instruct-GGUF\Qwen2.5-VL-3B-Instruct-Q4_K_M.gguf
- Can be overridden via `GGUF_MODEL_PATH` environment variable.
- Loads into memory once (singleton pattern) to conserve system RAM/VRAM across
  document scanning, scheme alignment, chat, and form auto-fill.
"""

import os
import time
import asyncio
from typing import List, Dict, Any, Tuple, Optional
from logger import logger

DEFAULT_MODEL_PATH = r"C:\Users\blue0\.lmstudio\models\lmstudio-community\Qwen2.5-VL-3B-Instruct-GGUF\Qwen2.5-VL-3B-Instruct-Q4_K_M.gguf"
MODEL_PATH = os.environ.get("GGUF_MODEL_PATH", DEFAULT_MODEL_PATH)
N_GPU_LAYERS = int(os.environ.get("N_GPU_LAYERS", "0"))
N_CTX = int(os.environ.get("N_CTX", "4096"))

_llm_instance = None
_lock = asyncio.Lock()


def get_model_name() -> str:
    """Return the filename of the currently configured GGUF model."""
    return os.path.basename(MODEL_PATH)


def _load_model_sync():
    """Synchronously load the Llama model from disk."""
    global _llm_instance
    if _llm_instance is not None:
        return _llm_instance

    if not os.path.exists(MODEL_PATH):
        raise FileNotFoundError(
            f"GGUF model file not found at: {MODEL_PATH}. "
            "Please check the path or set the GGUF_MODEL_PATH environment variable."
        )

    logger.info(
        f"[local_llm] Loading GGUF model from disk: {MODEL_PATH} "
        f"(n_ctx={N_CTX}, n_gpu_layers={N_GPU_LAYERS})…"
    )
    t0 = time.time()
    
    try:
        from llama_cpp import Llama
    except ImportError:
        raise RuntimeError(
            "llama-cpp-python is not installed. Please install it using: "
            "pip install llama-cpp-python"
        )

    # Initialize Llama model
    # Note: For Llama 3.2 Vision (mllama architecture), recent versions of
    # llama-cpp-python handle multimodal chat completions natively when image_url
    # is passed in messages.
    try:
        _llm_instance = Llama(
            model_path=MODEL_PATH,
            n_ctx=N_CTX,
            n_gpu_layers=N_GPU_LAYERS,
            verbose=False,
        )
        elapsed = time.time() - t0
        logger.info(f"[local_llm] Successfully loaded model in {elapsed:.1f}s!")
        return _llm_instance
    except Exception as exc:
        err_str = str(exc)
        logger.error(f"[local_llm] Failed to load model: {err_str}", exc_info=True)
        if "mllama" in err_str.lower() or "unknown model architecture" in err_str.lower() or "vision" in MODEL_PATH.lower():
            raise ValueError(
                f"Failed to load Llama 3.2 Vision / multimodal model in llama-cpp-python: {err_str}\n\n"
                "[DIAGNOSTIC & FIX]\n"
                f"1. The GGUF file '{MODEL_PATH}' uses Meta's multimodal Llama (mllama) architecture.\n"
                "2. In llama-cpp-python, loading GGUF vision models directly requires the accompanying "
                "multimodal projector clip file (e.g., `mmproj-model-f16.gguf` or `mmproj-Llama-3.2-11B-Vision-Instruct-f16.gguf`) "
                "to be present in the same directory alongside the text model GGUF file.\n"
                "3. RECOMMENDED SOLUTION: Keep LM Studio (http://localhost:1234) running with your model loaded! "
                "WelfareIntel is configured to automatically detect and route all vision and chat inference "
                "directly to LM Studio over HTTP, completely avoiding Python memory limits and model architecture errors!"
            ) from exc
        raise


async def get_llm():
    """Asynchronously get or initialize the singleton Llama instance."""
    global _llm_instance
    if _llm_instance is not None:
        return _llm_instance

    async with _lock:
        if _llm_instance is not None:
            return _llm_instance
        # Run loading in a thread pool so we don't block the asyncio event loop
        return await asyncio.to_thread(_load_model_sync)


_INFERENCE_SEMAPHORE = asyncio.Semaphore(2)


async def chat_completion(
    messages: List[Dict[str, Any]],
    temperature: float = 0.2,
    max_tokens: int = 2048,
    top_p: float = 0.9,
    require_vlm: bool = False,
) -> Tuple[str, str]:
    """Run a chat completion using local AI server (LM Studio / Ollama) or direct GGUF model."""
    is_vision = require_vlm or any(
        isinstance(m.get("content"), list) and any(item.get("type") == "image_url" for item in m["content"])
        for m in messages
    )
    async with _INFERENCE_SEMAPHORE:
        try:
            import httpx
            async with httpx.AsyncClient(timeout=900.0) as client:
                # ----------------------------------------------------------------------
                # PRIORITY 0: Cloud VLM / LLM API (Google Gemini API / Groq / OpenRouter)
                # Perfect for FREE cloud deployments (Render backend, Vercel frontend)
                # ----------------------------------------------------------------------
                gemini_api_key = os.environ.get("GEMINI_API_KEY") or os.environ.get("GOOGLE_API_KEY")
                if gemini_api_key:
                    try:
                        gemini_model = os.environ.get("GEMINI_MODEL", "gemini-2.0-flash")
                        logger.info(f"[local_llm] Routing inference to Google Gemini API ({gemini_model})…")
                        
                        contents = []
                        for m in messages:
                            role = "model" if m.get("role") == "assistant" else "user"
                            parts = []
                            content_data = m.get("content", "")
                            if isinstance(content_data, str):
                                if content_data.strip():
                                    parts.append({"text": content_data})
                            elif isinstance(content_data, list):
                                for item in content_data:
                                    if item.get("type") == "text" and item.get("text", "").strip():
                                        parts.append({"text": item.get("text")})
                                    elif item.get("type") == "image_url":
                                        url_str = item.get("image_url", {}).get("url", "")
                                        if url_str.startswith("data:"):
                                            header, b64_data = url_str.split(",", 1)
                                            mime_type = "image/jpeg"
                                            if ";" in header and ":" in header:
                                                mime_type = header.split(":")[1].split(";")[0]
                                            parts.append({
                                                "inline_data": {
                                                    "mime_type": mime_type,
                                                    "data": b64_data
                                                }
                                            })
                            if parts:
                                contents.append({"role": role, "parts": parts})
                        
                        gemini_payload = {
                            "contents": contents,
                            "generationConfig": {
                                "temperature": temperature,
                                "maxOutputTokens": min(max_tokens, 2048),
                                "topP": top_p,
                            }
                        }
                        
                        gemini_headers = {"x-goog-api-key": gemini_api_key}
                        if not gemini_api_key.startswith("AIzaSy"):
                            gemini_headers["Authorization"] = f"Bearer {gemini_api_key}"

                        gemini_url = f"https://generativelanguage.googleapis.com/v1beta/models/{gemini_model}:generateContent?key={gemini_api_key}"
                        resp = await client.post(gemini_url, headers=gemini_headers, json=gemini_payload, timeout=120.0)
                        if resp.status_code == 200:
                            candidates = resp.json().get("candidates", [])
                            if candidates:
                                text = candidates[0].get("content", {}).get("parts", [{}])[0].get("text", "")
                                if text:
                                    logger.info(f"[local_llm] Successfully completed inference via Google Gemini ({gemini_model})!")
                                    return text, f"Google Gemini ({gemini_model})"
                        elif resp.status_code == 404 and gemini_model != "gemini-1.5-flash":
                            logger.warning(f"[local_llm] Gemini model {gemini_model} returned 404. Retrying with gemini-1.5-flash...")
                            gemini_url_fb = f"https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key={gemini_api_key}"
                            resp_fb = await client.post(gemini_url_fb, headers=gemini_headers, json=gemini_payload, timeout=120.0)
                            if resp_fb.status_code == 200:
                                candidates = resp_fb.json().get("candidates", [])
                                if candidates:
                                    text = candidates[0].get("content", {}).get("parts", [{}])[0].get("text", "")
                                    if text:
                                        logger.info("[local_llm] Successfully completed inference via Google Gemini (gemini-1.5-flash)!")
                                        return text, "Google Gemini (gemini-1.5-flash)"
                        
                        logger.warning(f"[local_llm] Google Gemini API returned status {resp.status_code}: {resp.text[:300]}")
                    except Exception as gem_err:
                        logger.error(f"[local_llm] Error calling Google Gemini API: {gem_err}")

                cloud_api_key = os.environ.get("VLM_API_KEY") or os.environ.get("GROQ_API_KEY") or os.environ.get("OPENROUTER_API_KEY")
                cloud_api_base = os.environ.get("VLM_API_BASE_URL")
                if not cloud_api_base and os.environ.get("GROQ_API_KEY"):
                    cloud_api_base = "https://api.groq.com/openai/v1/chat/completions"
                elif not cloud_api_base and os.environ.get("OPENROUTER_API_KEY"):
                    cloud_api_base = "https://openrouter.ai/api/v1/chat/completions"
                
                if cloud_api_key and cloud_api_base:
                    try:
                        cloud_model = os.environ.get("VLM_MODEL") or ("llama-3.2-11b-vision-preview" if "groq" in cloud_api_base else "meta-llama/llama-3.2-11b-vision-instruct:free")
                        logger.info(f"[local_llm] Routing inference to Cloud OpenAI-compatible VLM ({cloud_model}) at {cloud_api_base}…")
                        payload = {
                            "model": cloud_model,
                            "messages": messages,
                            "temperature": temperature,
                            "max_tokens": min(max_tokens, 1024),
                            "top_p": top_p,
                            "stream": False,
                        }
                        resp = await client.post(
                            cloud_api_base,
                            headers={"Authorization": f"Bearer {cloud_api_key}", "Content-Type": "application/json"},
                            json=payload,
                            timeout=120.0
                        )
                        if resp.status_code == 200:
                            text = resp.json().get("choices", [{}])[0].get("message", {}).get("content", "")
                            if text:
                                logger.info(f"[local_llm] Successfully completed inference via Cloud VLM ({cloud_model})!")
                                return text, f"Cloud VLM ({cloud_model})"
                        logger.warning(f"[local_llm] Cloud VLM endpoint returned status {resp.status_code}: {resp.text[:300]}")
                    except Exception as cloud_err:
                        logger.error(f"[local_llm] Error calling Cloud VLM endpoint: {cloud_err}")

                # 1. Single VLM model routing (Local LM Studio fallback when running on local machine without API keys):
                if is_vision:
                    try:
                        models_resp = await client.get("http://localhost:1234/v1/models", timeout=3.0)
                        if models_resp.status_code == 200:
                            models_data = models_resp.json().get("data", [])
                            active_model = "default"
                            for md in models_data:
                                if "qwen" in md.get("id", "").lower() or "vl" in md.get("id", "").lower() or "vision" in md.get("id", "").lower():
                                    active_model = md["id"]
                                    break
                            if active_model == "default" and models_data:
                                active_model = models_data[0]["id"]
                            
                            logger.info(f"[local_llm] Routing direct VLM scan to single vision model: LM Studio ({active_model})…")
                            effective_max_tokens = min(max_tokens, 1024)
                            payload = {
                                "model": active_model,
                                "messages": messages,
                                "temperature": temperature,
                                "max_tokens": effective_max_tokens,
                                "top_p": top_p,
                                "stream": False,
                            }
                            resp = await client.post("http://localhost:1234/v1/chat/completions", json=payload, timeout=900.0)
                            if resp.status_code == 400 and "Context size has been exceeded" in resp.text:
                                logger.warning(f"[local_llm] LM Studio context size exceeded. Retrying with reduced max_tokens (400) and truncated prompt...")
                                shortened_messages = []
                                for m in messages:
                                    content = m.get("content", "")
                                    if isinstance(content, str) and len(content) > 2500:
                                        content = content[:2500] + "\n...[truncated to fit context budget]"
                                    shortened_messages.append({"role": m.get("role", "user"), "content": content})
                                payload["messages"] = shortened_messages
                                payload["max_tokens"] = min(effective_max_tokens, 400)
                                resp = await client.post("http://localhost:1234/v1/chat/completions", json=payload, timeout=900.0)

                            if resp.status_code == 200:
                                text = resp.json().get("choices", [{}])[0].get("message", {}).get("content", "")
                                if text:
                                    logger.info("[local_llm] Successfully completed VLM inference via single model: LM Studio!")
                                    return text, f"LM Studio ({active_model})"
                            raise RuntimeError(f"LM Studio returned HTTP status {resp.status_code}: {resp.text}")
                    except (httpx.ConnectError, httpx.TimeoutException, Exception) as lms_err:
                        logger.error(f"[local_llm] Single VLM model error on port 1234: {lms_err}")
                        raise RuntimeError(
                            f"Vision inference failed: No Cloud VLM API Key configured (GEMINI_API_KEY / GROQ_API_KEY) and LM Studio is not reachable at localhost:1234 ({lms_err}).\n\n"
                            "[FREE CLOUD VLM DEPLOYMENT RECOMMENDATION]\n"
                            "1. Get a 100% FREE Google Gemini API Key from Google AI Studio: https://aistudio.google.com/app/apikey\n"
                            "2. In your Render Dashboard (or local .env), add the environment variable:\n"
                            "   GEMINI_API_KEY=AIzaSy...\n"
                            "3. Your WelfareIntel backend will automatically perform lightning-fast OCR & VLM document scanning for FREE!"
                        ) from lms_err

                # 2. For pure text requests without images (e.g. general chat or schema post-processing), check Ollama on port 11434 first:
                try:
                    tags_resp = await client.get("http://localhost:11434/api/tags", timeout=3.0)
                    if tags_resp.status_code == 200:
                        models_list = tags_resp.json().get("models", [])
                        if models_list:
                            active_model = models_list[0]["name"]
                            logger.info(f"[local_llm] Routing text-only inference to Ollama (model: {active_model})…")
                            payload = {
                                "model": active_model,
                                "messages": messages,
                                "options": {"temperature": temperature, "num_predict": max_tokens, "top_p": top_p},
                                "stream": False,
                            }
                            resp = await client.post("http://localhost:11434/api/chat", json=payload, timeout=900.0)
                            if resp.status_code == 200:
                                text = resp.json().get("message", {}).get("content", "")
                                if text:
                                    logger.info("[local_llm] Successfully completed text inference via Ollama!")
                                    return text, f"Ollama ({active_model})"
                except (httpx.ConnectError, httpx.TimeoutException, Exception) as ollama_err:
                    logger.debug(f"[local_llm] Ollama not reachable or busy on port 11434: {ollama_err}")

                # 3. Check LM Studio for pure text completion if Ollama not available
                lm_studio_active = False
                try:
                    models_resp = await client.get("http://localhost:1234/v1/models", timeout=3.0)
                    if models_resp.status_code == 200:
                        lm_studio_active = True
                        models_data = models_resp.json().get("data", [])
                        active_model = models_data[0]["id"] if models_data else "default"
                        
                        logger.info(f"[local_llm] Routing text inference to LM Studio (model: {active_model})…")
                        effective_max_tokens = min(max_tokens, 1024)
                        payload = {
                            "model": active_model,
                            "messages": messages,
                            "temperature": temperature,
                            "max_tokens": effective_max_tokens,
                            "top_p": top_p,
                            "stream": False,
                        }
                        resp = await client.post("http://localhost:1234/v1/chat/completions", json=payload, timeout=900.0)
                        if resp.status_code == 400 and "Context size has been exceeded" in resp.text:
                            logger.warning(f"[local_llm] LM Studio context size exceeded. Retrying with reduced max_tokens (400) and truncated prompt...")
                            shortened_messages = []
                            for m in messages:
                                content = m.get("content", "")
                                if isinstance(content, str) and len(content) > 2500:
                                    content = content[:2500] + "\n...[truncated to fit context budget]"
                                shortened_messages.append({"role": m.get("role", "user"), "content": content})
                            payload["messages"] = shortened_messages
                            payload["max_tokens"] = min(effective_max_tokens, 400)
                            resp = await client.post("http://localhost:1234/v1/chat/completions", json=payload, timeout=900.0)

                        if resp.status_code == 200:
                            text = resp.json().get("choices", [{}])[0].get("message", {}).get("content", "")
                            if text:
                                logger.info("[local_llm] Successfully completed text inference via LM Studio!")
                                return text, f"LM Studio ({active_model})"
                        raise RuntimeError(f"LM Studio returned HTTP status {resp.status_code}: {resp.text}")
                except (httpx.ConnectError, httpx.TimeoutException, Exception) as lms_err:
                    if lm_studio_active:
                        logger.error(f"[local_llm] LM Studio error during inference: {lms_err}")
                        raise RuntimeError(
                            f"LM Studio encountered an error or timed out: {lms_err}.\n"
                            "Please check your LM Studio desktop window to make sure the model is loaded and not stuck."
                        ) from lms_err
        except ImportError:
            pass

    # 2. Fallback to in-process llama-cpp-python GGUF loading
    llm = await get_llm()
    model_name = get_model_name()

    logger.info(
        f"[local_llm] Running inference on {model_name} "
        f"(temp={temperature}, max_tokens={max_tokens})…"
    )
    t0 = time.time()

    def _run_inference():
        return llm.create_chat_completion(
            messages=messages,
            temperature=temperature,
            max_tokens=max_tokens,
            top_p=top_p,
            stream=False,
        )

    try:
        resp = await asyncio.to_thread(_run_inference)
    except Exception as exc:
        err_str = str(exc)
        logger.error(f"[local_llm] Inference failed: {err_str}", exc_info=True)
        if "llama_decode returned -1" in err_str or "decode" in err_str or "mmproj" in err_str.lower():
            raise RuntimeError(
                "Local in-process vision model execution failed (`llama_decode returned -1`).\n\n"
                "[Why this happened]\n"
                "Qwen2.5-VL is a multimodal vision model that requires an active vision adapter (`mmproj`) "
                "when executed inside `llama-cpp-python` directly.\n\n"
                "[How to fix instantly]\n"
                "Please keep LM Studio open on port 1234 (`http://localhost:1234`) with `Qwen2.5-VL-3B-Instruct` loaded! "
                "WelfareIntel is configured to automatically route all scans to LM Studio over HTTP cleanly without memory or decoding errors!"
            ) from exc
        raise

    elapsed = time.time() - t0

    text = (
        resp.get("choices", [{}])[0]
        .get("message", {})
        .get("content", "")
    )
    if not text:
        raise ValueError("Local GGUF model returned empty response")

    logger.info(f"[local_llm] Inference completed in {elapsed:.1f}s")
    return text, model_name

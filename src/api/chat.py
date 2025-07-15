from fastapi import APIRouter, Depends, HTTPException, status, Query
from fastapi.responses import StreamingResponse
from typing import List, Optional
import json
import asyncio
from src.models.chat import ChatMessage, ChatResponse, ChatHistory
from src.services.chat_service import ChatService
from src.middleware.auth_middleware import get_current_user
from src.utils.logger import logger

router = APIRouter()


@router.post("/query", response_model=dict)
async def send_chat_message(
    chat_data: ChatMessage,
    current_user: str = Depends(get_current_user)
):
    """Send message to AI assistant"""
    try:
        chat_service = ChatService()
        response = await chat_service.process_message(
            user_id=current_user,
            message=chat_data.message,
            context=chat_data.context
        )
        
        return {
            "success": True,
            "response": response
        }
    
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error processing chat message: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to process chat message"
        )


@router.post("/query/stream")
async def send_chat_message_stream(
    chat_data: ChatMessage,
    current_user: str = Depends(get_current_user)
):
    """Send message to AI assistant with streaming response"""
    try:
        chat_service = ChatService()
        
        chunk_queue = asyncio.Queue()
        
        async def generate_stream():
            try:
                full_response = ""
                
                # Send initial connection message
                yield f"data: {json.dumps({'type': 'connected'})}\n\n"
                
                # Send initial status
                yield f"data: {json.dumps({'type': 'status', 'message': 'Thinking...'})}\n\n"
                await asyncio.sleep(0.5)
                
                def on_chunk(chunk: str):
                    nonlocal full_response
                    
                    # Check if this is a structured response
                    if chunk.startswith('{"__structured__":'):
                        try:
                            structured_data = json.loads(chunk)
                            structured_response = structured_data["__structured__"]
                            logger.info(f"Received structured response: {structured_response.get('type')}")
                            # Store structured response as JSON string for chat history
                            full_response = json.dumps(structured_response)
                            chunk_queue.put_nowait(('structured', structured_response))
                            return
                        except json.JSONDecodeError:
                            logger.error(f"Failed to parse structured response: {chunk}")
                    
                    # Check if this is a status message (starts with emoji indicators)
                    if chunk.startswith('🔍') or chunk.startswith('✅') or chunk.startswith('📊'):
                        # This is a status message
                        status_message = chunk.strip()
                        logger.info(f"Status message: {repr(status_message)}")
                        chunk_queue.put_nowait(('status', status_message))
                    else:
                        # This is content
                        full_response += chunk
                        logger.info(f"Streaming chunk: {repr(chunk[:50])}...")
                        chunk_queue.put_nowait(('chunk', chunk))
                
                # Start processing in background
                async def process_message():
                    try:
                        await chat_service.process_message_stream(
                            user_id=current_user,
                            message=chat_data.message,
                            on_chunk=on_chunk,
                            context=chat_data.context
                        )
                        
                        # Store chat history with complete response
                        if full_response.strip():
                            await chat_service._store_chat_history(
                                user_id=current_user,
                                message=chat_data.message,
                                response=full_response
                            )
                        
                        # Signal completion
                        chunk_queue.put_nowait(('complete', full_response))
                    except Exception as e:
                        logger.error(f"Error in message processing: {e}")
                        chunk_queue.put_nowait(('error', str(e)))
                
                # Start processing task
                process_task = asyncio.create_task(process_message())
                
                # Stream chunks as they arrive with artificial delays for better UX
                while True:
                    try:
                        msg_type, content = await asyncio.wait_for(chunk_queue.get(), timeout=30.0)
                        
                        if msg_type == 'status':
                            # Send status message immediately
                            yield f"data: {json.dumps({'type': 'status', 'message': content})}\n\n"
                        elif msg_type == 'structured':
                            # Send structured response immediately
                            logger.info(f"Sending structured response: {content.get('type')}")
                            yield f"data: {json.dumps({'type': 'structured', 'data': content})}\n\n"
                            break
                        elif msg_type == 'chunk':
                            # For better streaming UX, split large chunks and add small delays
                            if len(content) > 30:
                                # Split chunk into smaller pieces for streaming effect
                                words = content.split()
                                for i in range(0, len(words), 2):  # 2 words at a time
                                    word_chunk = " ".join(words[i:i+2]) + " "
                                    yield f"data: {json.dumps({'type': 'chunk', 'content': word_chunk})}\n\n"
                                    await asyncio.sleep(0.05)  # Small delay for streaming effect
                            else:
                                yield f"data: {json.dumps({'type': 'chunk', 'content': content})}\n\n"
                                await asyncio.sleep(0.03)  # Small delay
                        elif msg_type == 'complete':
                            logger.info(f"Complete response length: {len(content)}")
                            yield f"data: {json.dumps({'type': 'complete', 'fullResponse': content})}\n\n"
                            break
                        elif msg_type == 'error':
                            yield f"data: {json.dumps({'type': 'error', 'message': content})}\n\n"
                            break
                            
                    except asyncio.TimeoutError:
                        logger.warning("Stream timeout - no chunks received")
                        yield f"data: {json.dumps({'type': 'error', 'message': 'Request timeout'})}\n\n"
                        break
                
                # Cleanup
                if not process_task.done():
                    process_task.cancel()
                
            except Exception as e:
                logger.error(f"Error in stream generation: {e}")
                yield f"data: {json.dumps({'type': 'error', 'message': str(e)})}\n\n"
        
        return StreamingResponse(
            generate_stream(),
            media_type="text/event-stream",
            headers={
                "Cache-Control": "no-cache",
                "Connection": "keep-alive",
                "Access-Control-Allow-Origin": "*",
                "Access-Control-Allow-Headers": "*",
                "Access-Control-Allow-Methods": "*"
            }
        )
    
    except Exception as e:
        logger.error(f"Error setting up chat stream: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to setup chat stream"
        )


@router.get("/history")
async def get_chat_history(
    limit: int = Query(50, ge=1, le=100),
    offset: int = Query(0, ge=0),
    current_user: str = Depends(get_current_user)
):
    """Get chat history"""
    try:
        chat_service = ChatService()
        history = await chat_service.get_chat_history(
            user_id=current_user,
            limit=limit,
            offset=offset
        )
        
        return {
            "success": True,
            "data": history,
            "total_count": len(history)
        }
    
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error getting chat history: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to get chat history"
        )


@router.delete("/history")
async def clear_chat_history(
    current_user: str = Depends(get_current_user)
):
    """Clear all chat history for user"""
    try:
        chat_service = ChatService()
        success = await chat_service.clear_chat_history(user_id=current_user)
        
        if not success:
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="Failed to clear chat history"
            )
        
        return {
            "success": True,
            "message": "Chat history cleared successfully"
        }
    
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error clearing chat history: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to clear chat history"
        )
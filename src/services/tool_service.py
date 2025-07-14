"""Legacy tool service - deprecated in favor of src.tools.tool_service."""

import warnings
from src.tools.tool_service import ToolService

# Issue deprecation warning
warnings.warn(
    "src.services.tool_service is deprecated. Use src.tools.tool_service instead.",
    DeprecationWarning,
    stacklevel=2
)

# Re-export the new service for backward compatibility
__all__ = ['ToolService']

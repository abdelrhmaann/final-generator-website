"""
DIALux-to-Revit UI Module
=========================

Provides a Tkinter-based GUI for the DIALux-to-Revit fixture distributor.
The UI guides users through the workflow:
1. Select DIALux report file (PDF/CSV/XML)
2. Select Revit room data file (JSON)
3. Configure matching parameters
4. Preview room mappings
5. Generate output scripts
"""

from .main_window import DialuxRevitApp

__all__ = ["DialuxRevitApp"]

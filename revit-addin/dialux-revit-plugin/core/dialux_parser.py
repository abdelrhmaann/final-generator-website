"""
DIALux Report Parser - PDF, CSV, and XML formats.

Extracts room data, luminaire types, quantities, and placement coordinates
from DIALux evo output reports. Supports both PDF (via text extraction) and
structured CSV/XML exports from DIALux Pro Feature Export.
"""

import re
import csv
import json
import pdfplumber
from pathlib import Path
from typing import Dict, List, Optional, Tuple, Any
from dataclasses import dataclass, field
from xml.etree import ElementTree as ET


@dataclass
class RoomData:
    """Parsed room information from a DIALux report."""
    name: str
    level: str = ""
    area: float = 0.0  # square meters
    length: float = 0.0  # meters
    width: float = 0.0  # meters
    height: float = 0.0  # meters
    luminaires: List["LuminaireEntry"] = field(default_factory=list)
    illuminance_avg: float = 0.0  # lux
    illuminance_min: float = 0.0  # lux
    illuminance_max: float = 0.0  # lux
    uniformity: float = 0.0
    page_number: int = 0


@dataclass
class LuminaireEntry:
    """A single luminaire/fixture entry from a room."""
    name: str
    manufacturer: str = ""
    model: str = ""
    quantity: int = 0
    luminous_flux: float = 0.0  # lumens
    wattage: float = 0.0  # watts
    mounting_height: float = 0.0  # meters
    coordinates: List[Tuple[float, float]] = field(default_factory=list)
    # Relative positions within the room (x, y) in meters from room origin
    relative_positions: List[Tuple[float, float]] = field(default_factory=list)


@dataclass
class ProjectInfo:
    """Top-level project metadata from the DIALux report."""
    project_name: str = ""
    client: str = ""
    designer: str = ""
    date: str = ""
    building: str = ""
    location: str = ""
    total_rooms: int = 0
    total_luminaires: int = 0
    luminaire_types: List[str] = field(default_factory=list)


class DialuxPDFParser:
    """
    Parses DIALux evo PDF reports to extract room and luminaire data.
    
    DIALux PDF reports follow a semi-structured format with:
    - Project overview page
    - Room-by-room summary tables
    - Luminaire data sheets
    - Calculation results (illuminance grids)
    - Luminaire layout plans (drawings with positions)
    """

    # Patterns for identifying DIALux report sections
    ROOM_SECTION_PATTERN = re.compile(
        r'(Room|Raum|Sala|Pièce)\s+[:\-]?\s*(.+?)(?:\n|$)',
        re.IGNORECASE
    )
    
    ROOM_TABLE_PATTERN = re.compile(
        r'(Average|Moyenne|Promedio)\s+(Illuminance|Beleuchtungsstärke)\s*'
        r'[:\-]?\s*([\d.]+)\s*(?:lux|lx)',
        re.IGNORECASE
    )

    LUMINAIRE_LINE_PATTERN = re.compile(
        r'(\d+)\s*x\s*(.+?)\s*(?:\d+\s*[Ww])',
        re.IGNORECASE
    )

    LUMINAIRE_QUANTITY_PATTERN = re.compile(
        r'^(\d+)\s*$',
        re.MULTILINE
    )

    AREA_PATTERN = re.compile(
        r'(Area|Fläche|Superficie|Surface)\s*[:\-]?\s*([\d.,]+)\s*(?:m²|sqm|m2)',
        re.IGNORECASE
    )

    DIMENSION_PATTERN = re.compile(
        r'([\d.]+)\s*[x×]\s*([\d.]+)\s*[x×]\s*([\d.]+)\s*m',
        re.IGNORECASE
    )

    PAGE_HEADER_PATTERN = re.compile(
        r'Page\s+(\d+)',
        re.IGNORECASE
    )

    def __init__(self):
        self.project_info = ProjectInfo()
        self.rooms: List[RoomData] = []
        self._current_room: Optional[RoomData] = None
        self._extracted_tables: List[List[str]] = []

    def parse(self, pdf_path: str) -> Dict[str, Any]:
        """
        Parse a DIALux PDF report and return structured data.
        
        Args:
            pdf_path: Path to the DIALux PDF report file.
            
        Returns:
            Dictionary containing project_info, rooms, and parsing_metadata.
        """
        pdf_path = Path(pdf_path)
        if not pdf_path.exists():
            raise FileNotFoundError(f"DIALux PDF report not found: {pdf_path}")

        with pdfplumber.open(pdf_path) as pdf:
            self._extract_project_info(pdf)
            self._extract_room_tables(pdf)
            self._extract_luminaire_data(pdf)
            self._extract_layout_coordinates(pdf)

        self._post_process()
        return self._build_result()

    def _extract_project_info(self, pdf):
        """Extract project-level metadata from the first pages."""
        # Read first 3 pages for project info
        for page_num, page in enumerate(pdf.pages[:3]):
            text = page.extract_text() or ""
            lines = text.strip().split("\n")
            for line in lines:
                line = line.strip()
                # Project name
                if re.match(r'^Project\s*[:\-]', line, re.IGNORECASE):
                    self.project_info.project_name = line.split(":", 1)[-1].strip()
                # Client
                if re.match(r'^(Client|Customer|Auftraggeber)\s*[:\-]', line, re.IGNORECASE):
                    self.project_info.client = line.split(":", 1)[-1].strip()
                # Designer
                if re.match(r'^(Designer|Author|Planer)\s*[:\-]', line, re.IGNORECASE):
                    self.project_info.designer = line.split(":", 1)[-1].strip()
                # Date
                if re.match(r'^(Date|Datum|Fecha)\s*[:\-]', line, re.IGNORECASE):
                    self.project_info.date = line.split(":", 1)[-1].strip()
                # Building
                if re.match(r'^(Building|Building Name|Gebäude)\s*[:\-]', line, re.IGNORECASE):
                    self.project_info.building = line.split(":", 1)[-1].strip()

    def _extract_room_tables(self, pdf):
        """Extract room summary tables from the PDF."""
        for page_num, page in enumerate(pdf.pages):
            tables = page.extract_tables()
            if not tables:
                continue

            for table in tables:
                if not table or len(table) < 2:
                    continue
                # Identify room summary tables
                if self._is_room_table(table):
                    self._parse_room_table(table, page_num)

    def _is_room_table(self, table: List[List]) -> bool:
        """Determine if a table contains room data."""
        if not table or not table[0]:
            return False
        header_text = " ".join(str(cell) for cell in table[0] if cell)
        keywords = ["room", "name", "area", "illuminance", "average", "lux"]
        return any(kw in header_text.lower() for kw in keywords)

    def _parse_room_table(self, table: List[List], page_num: int):
        """Parse a room summary table into RoomData objects."""
        headers = [str(cell).strip().lower() if cell else "" for cell in table[0]]
        
        for row in table[1:]:
            if not row or not any(row):
                continue
            row_dict = {}
            for i, cell in enumerate(row):
                if i < len(headers) and cell is not None:
                    row_dict[headers[i]] = str(cell).strip()

            room_name = self._find_room_name(row_dict)
            if room_name:
                room = RoomData(name=room_name, page_number=page_num)
                room.area = self._parse_float(row_dict.get("area", "0"))
                room.length = self._parse_float(row_dict.get("length", "0"))
                room.width = self._parse_float(row_dict.get("width", "0"))
                room.height = self._parse_float(row_dict.get("height", "0"))
                room.illuminance_avg = self._parse_float(
                    row_dict.get("average", row_dict.get("illuminance average", "0"))
                )
                room.illuminance_min = self._parse_float(
                    row_dict.get("minimum", "0")
                )
                room.illuminance_max = self._parse_float(
                    row_dict.get("maximum", "0")
                )
                room.uniformity = self._parse_float(
                    row_dict.get("uniformity", "0")
                )
                self.rooms.append(room)

    def _find_room_name(self, row_dict: Dict[str, str]) -> Optional[str]:
        """Find the room name from a table row."""
        name_keys = ["room", "name", "room name", "sala", "raum"]
        for key in name_keys:
            if key in row_dict and row_dict[key]:
                return row_dict[key]
        # Fallback: first non-numeric cell
        for key, value in row_dict.items():
            if value and not re.match(r'^[\d.,]+$', value.strip()):
                return value
        return None

    def _extract_luminaire_data(self, pdf):
        """Extract luminaire type information and quantities per room."""
        for page_num, page in enumerate(pdf.pages):
            text = page.extract_text() or ""
            lines = text.strip().split("\n")
            
            for i, line in enumerate(lines):
                line = line.strip()
                
                # Check for room header to associate luminaires with rooms
                room_match = self.ROOM_SECTION_PATTERN.match(line)
                if room_match:
                    self._set_current_room(room_match.group(2), page_num)
                
                # Check for luminaire quantity line: "N x Luminaire Name"
                lum_match = self.LUMINAIRE_LINE_PATTERN.match(line)
                if lum_match and self._current_room:
                    qty = int(lum_match.group(1))
                    name = lum_match.group(2).strip()
                    entry = LuminaireEntry(
                        name=name,
                        quantity=qty,
                        manufacturer=self._extract_manufacturer(name)
                    )
                    self._current_room.luminaires.append(entry)

    def _extract_layout_coordinates(self, pdf):
        """
        Extract fixture coordinates from DIALux layout pages.
        
        DIALux reports include luminaire layout drawings with coordinate grids.
        We extract positions from table data and dimension annotations.
        """
        for page_num, page in enumerate(pdf.pages):
            # Look for coordinate tables in layout pages
            tables = page.extract_tables()
            for table in tables:
                if self._is_coordinate_table(table):
                    self._parse_coordinate_table(table, page_num)

    def _is_coordinate_table(self, table: List[List]) -> bool:
        """Check if a table contains coordinate data."""
        if not table or len(table) < 3:
            return False
        header_text = " ".join(str(c) for c in table[0] if c).lower()
        coord_keywords = ["x", "y", "coord", "position", "distance", "spacing"]
        return any(kw in header_text for kw in coord_keywords)

    def _parse_coordinate_table(self, table: List[List], page_num: int):
        """Parse coordinate data from a table."""
        headers = [str(cell).strip().lower() if cell else "" for cell in table[0]]
        x_col = None
        y_col = None
        for i, h in enumerate(headers):
            if h in ("x", "x-pos", "x coordinate"):
                x_col = i
            elif h in ("y", "y-pos", "y coordinate"):
                y_col = i
        
        if x_col is None or y_col is None:
            return

        for row in table[1:]:
            if len(row) > max(x_col, y_col):
                x = self._parse_float(row[x_col] or "0")
                y = self._parse_float(row[y_col] or "0")
                if x > 0 or y > 0:
                    if self._current_room and self._current_room.luminaires:
                        self._current_room.luminaires[-1].relative_positions.append((x, y))

    def _set_current_room(self, name: str, page_num: int):
        """Set the current room context."""
        name = name.strip().rstrip(":")
        # Check if room already exists
        for room in self.rooms:
            if room.name.lower() == name.lower():
                self._current_room = room
                return
        # Create new room
        room = RoomData(name=name, page_number=page_num)
        self.rooms.append(room)
        self._current_room = room

    def _extract_manufacturer(self, luminaire_name: str) -> str:
        """Extract manufacturer name from luminaire string."""
        parts = luminaire_name.split()
        known_mfgs = [
            "Philips", "Osram", "Schneider", "Thorn", "Zumtobel",
            "Erco", "iGuzzini", "Trilux", "Ledvance", "Helvar",
            "Fagerhult", "Lighting", "Glamox", "RZB", "Bega"
        ]
        for part in parts:
            if part in known_mfgs:
                return part
        # Try extracting from pattern like "Manufacturer - Model"
        if " - " in luminaire_name:
            return luminaire_name.split(" - ")[0].strip()
        return ""

    def _post_process(self):
        """Post-process parsed data for consistency."""
        self.project_info.total_rooms = len(self.rooms)
        total_lum = 0
        all_types = set()
        for room in self.rooms:
            for lum in room.luminaires:
                total_lum += lum.quantity
                all_types.add(lum.name)
        self.project_info.total_luminaires = total_lum
        self.project_info.luminaire_types = sorted(list(all_types))

    def _parse_float(self, value: str) -> float:
        """Parse a float value, handling European decimal commas."""
        if not value:
            return 0.0
        value = value.replace(",", ".").strip()
        try:
            return float(value)
        except ValueError:
            return 0.0

    def _build_result(self) -> Dict[str, Any]:
        """Build the final structured result."""
        return {
            "project_info": {
                "project_name": self.project_info.project_name,
                "client": self.project_info.client,
                "designer": self.project_info.designer,
                "date": self.project_info.date,
                "building": self.project_info.building,
                "total_rooms": self.project_info.total_rooms,
                "total_luminaires": self.project_info.total_luminaires,
                "luminaire_types": self.project_info.luminaire_types,
            },
            "rooms": [
                {
                    "name": r.name,
                    "level": r.level,
                    "area": r.area,
                    "length": r.length,
                    "width": r.width,
                    "height": r.height,
                    "illuminance_avg": r.illuminance_avg,
                    "illuminance_min": r.illuminance_min,
                    "illuminance_max": r.illuminance_max,
                    "uniformity": r.uniformity,
                    "page_number": r.page_number,
                    "luminaires": [
                        {
                            "name": l.name,
                            "manufacturer": l.manufacturer,
                            "model": l.model,
                            "quantity": l.quantity,
                            "luminous_flux": l.luminous_flux,
                            "wattage": l.wattage,
                            "mounting_height": l.mounting_height,
                            "relative_positions": l.relative_positions,
                        }
                        for l in r.luminaires
                    ],
                }
                for r in self.rooms
            ],
        }


class DialuxCSVParser:
    """
    Parses DIALux CSV exports from the Pro Feature Export add-on.
    
    DIALux CSV exports contain structured room and luminaire data
    in a tabular format that is easier to parse than PDF.
    """

    def __init__(self):
        self.rooms: List[RoomData] = []
        self.project_info = ProjectInfo()

    def parse(self, csv_path: str) -> Dict[str, Any]:
        """Parse a DIALux CSV export file."""
        csv_path = Path(csv_path)
        if not csv_path.exists():
            raise FileNotFoundError(f"DIALux CSV export not found: {csv_path}")

        with open(csv_path, "r", encoding="utf-8-sig") as f:
            reader = csv.DictReader(f)
            fieldnames = reader.fieldnames or []
            fieldnames_lower = {fn.lower().strip(): fn for fn in fieldnames}

            for row in reader:
                # Normalize keys
                row_lower = {}
                for key, value in row.items():
                    if key:
                        row_lower[key.lower().strip()] = value

                room = self._csv_row_to_room(row_lower)
                if room:
                    self.rooms.append(room)

        self._post_process()
        return self._build_result()

    def _csv_row_to_room(self, row: Dict[str, str]) -> Optional[RoomData]:
        """Convert a CSV row to a RoomData object."""
        name = None
        for key in ["room", "room name", "name", "sala", "raum"]:
            if key in row and row[key]:
                name = row[key].strip()
                break
        
        if not name:
            return None

        room = RoomData(name=name)
        room.area = self._parse_float(row.get("area", "0"))
        room.length = self._parse_float(row.get("length", row.get("x-size", "0")))
        room.width = self._parse_float(row.get("width", row.get("y-size", "0")))
        room.height = self._parse_float(row.get("height", "0"))
        room.level = row.get("level", row.get("storey", ""))
        room.illuminance_avg = self._parse_float(
            row.get("average illuminance", row.get("avg illuminance", "0"))
        )
        room.illuminance_min = self._parse_float(row.get("minimum", "0"))
        room.illuminance_max = self._parse_float(row.get("maximum", "0"))
        room.uniformity = self._parse_float(row.get("uniformity", "0"))

        # Extract luminaire info from CSV columns
        lum_keys = [k for k in row if "luminaire" in k or "fixture" in k or "lighting" in k]
        for key in lum_keys:
            value = row[key]
            if value and not value.startswith("0"):
                qty = self._parse_int(value)
                if qty > 0:
                    lum_entry = LuminaireEntry(name=key, quantity=qty)
                    room.luminaires.append(lum_entry)

        return room

    def _parse_int(self, value: str) -> int:
        try:
            return int(float(value))
        except (ValueError, TypeError):
            return 0

    def _parse_float(self, value: str) -> float:
        if not value:
            return 0.0
        value = value.replace(",", ".").strip()
        try:
            return float(value)
        except ValueError:
            return 0.0

    def _post_process(self):
        self.project_info.total_rooms = len(self.rooms)
        total_lum = 0
        all_types = set()
        for room in self.rooms:
            for lum in room.luminaires:
                total_lum += lum.quantity
                all_types.add(lum.name)
        self.project_info.total_luminaires = total_lum
        self.project_info.luminaire_types = sorted(list(all_types))

    def _build_result(self) -> Dict[str, Any]:
        return {
            "project_info": {
                "project_name": self.project_info.project_name,
                "client": self.project_info.client,
                "designer": self.project_info.designer,
                "date": self.project_info.date,
                "building": self.project_info.building,
                "total_rooms": self.project_info.total_rooms,
                "total_luminaires": self.project_info.total_luminaires,
                "luminaire_types": self.project_info.luminaire_types,
            },
            "rooms": [
                {
                    "name": r.name,
                    "level": r.level,
                    "area": r.area,
                    "length": r.length,
                    "width": r.width,
                    "height": r.height,
                    "illuminance_avg": r.illuminance_avg,
                    "illuminance_min": r.illuminance_min,
                    "illuminance_max": r.illuminance_max,
                    "uniformity": r.uniformity,
                    "luminaires": [
                        {
                            "name": l.name,
                            "manufacturer": l.manufacturer,
                            "model": l.model,
                            "quantity": l.quantity,
                            "luminous_flux": l.luminous_flux,
                            "wattage": l.wattage,
                            "mounting_height": l.mounting_height,
                            "relative_positions": l.relative_positions,
                        }
                        for l in r.luminaires
                    ],
                }
                for r in self.rooms
            ],
        }


class DialuxXMLParser:
    """
    Parses DIALux XML exports from the Pro Feature Export add-on.
    
    DIALux XML exports provide structured room and luminaire data
    with full hierarchy and coordinates.
    """

    def __init__(self):
        self.rooms: List[RoomData] = []
        self.project_info = ProjectInfo()

    def parse(self, xml_path: str) -> Dict[str, Any]:
        """Parse a DIALux XML export file."""
        xml_path = Path(xml_path)
        if not xml_path.exists():
            raise FileNotFoundError(f"DIALux XML export not found: {xml_path}")

        tree = ET.parse(xml_path)
        root = tree.getroot()

        # Extract project info
        self._extract_project_info_xml(root)
        # Extract rooms
        self._extract_rooms_xml(root)
        self._post_process()

        return self._build_result()

    def _extract_project_info_xml(self, root):
        """Extract project-level metadata from XML root."""
        for elem in root.iter():
            tag = elem.tag.split("}")[-1].lower() if "}" in elem.tag else elem.tag.lower()
            if tag == "projectname":
                self.project_info.project_name = elem.text or ""
            elif tag == "client":
                self.project_info.client = elem.text or ""
            elif tag == "designer":
                self.project_info.designer = elem.text or ""
            elif tag == "date":
                self.project_info.date = elem.text or ""

    def _extract_rooms_xml(self, root):
        """Extract room data from XML structure."""
        # Look for room elements in various possible XML structures
        for elem in root.iter():
            tag = elem.tag.split("}")[-1].lower() if "}" in elem.tag else elem.tag.lower()
            if tag in ("room", "roomdata", "raumpara"):
                room = self._parse_room_xml(elem)
                if room:
                    self.rooms.append(room)

    def _parse_room_xml(self, elem) -> Optional[RoomData]:
        """Parse a room element from XML."""
        name = None
        for child in elem:
            tag = child.tag.split("}")[-1].lower() if "}" in child.tag else child.tag.lower()
            if tag == "name":
                name = child.text
                break
        
        if not name:
            return None

        room = RoomData(name=name)
        for child in elem:
            tag = child.tag.split("}")[-1].lower() if "}" in child.tag else child.tag.lower()
            if tag == "area":
                room.area = float(child.text or 0)
            elif tag == "length":
                room.length = float(child.text or 0)
            elif tag == "width":
                room.width = float(child.text or 0)
            elif tag == "height":
                room.height = float(child.text or 0)
            elif tag in ("illuminance", "illuminanceavg", "average"):
                room.illuminance_avg = float(child.text or 0)
            elif tag in ("luminaire", "luminaireentry"):
                lum = self._parse_luminaire_xml(child)
                if lum:
                    room.luminaires.append(lum)

        return room

    def _parse_luminaire_xml(self, elem) -> Optional[LuminaireEntry]:
        """Parse a luminaire element from XML."""
        name = None
        qty = 0
        for child in elem:
            tag = child.tag.split("}")[-1].lower() if "}" in child.tag else child.tag.lower()
            if tag == "name":
                name = child.text
            elif tag in ("quantity", "count", "number"):
                qty = int(child.text or 0)
        
        if not name:
            return None
        
        return LuminaireEntry(name=name, quantity=qty)

    def _post_process(self):
        self.project_info.total_rooms = len(self.rooms)
        total_lum = 0
        all_types = set()
        for room in self.rooms:
            for lum in room.luminaires:
                total_lum += lum.quantity
                all_types.add(lum.name)
        self.project_info.total_luminaires = total_lum
        self.project_info.luminaire_types = sorted(list(all_types))

    def _build_result(self) -> Dict[str, Any]:
        return {
            "project_info": {
                "project_name": self.project_info.project_name,
                "client": self.project_info.client,
                "designer": self.project_info.designer,
                "date": self.project_info.date,
                "building": self.project_info.building,
                "total_rooms": self.project_info.total_rooms,
                "total_luminaires": self.project_info.total_luminaires,
                "luminaire_types": self.project_info.luminaire_types,
            },
            "rooms": [
                {
                    "name": r.name,
                    "level": r.level,
                    "area": r.area,
                    "length": r.length,
                    "width": r.width,
                    "height": r.height,
                    "illuminance_avg": r.illuminance_avg,
                    "illuminance_min": r.illuminance_min,
                    "illuminance_max": r.illuminance_max,
                    "uniformity": r.uniformity,
                    "luminaires": [
                        {
                            "name": l.name,
                            "manufacturer": l.manufacturer,
                            "model": l.model,
                            "quantity": l.quantity,
                            "luminous_flux": l.luminous_flux,
                            "wattage": l.wattage,
                            "mounting_height": l.mounting_height,
                            "relative_positions": l.relative_positions,
                        }
                        for l in r.luminaires
                    ],
                }
                for r in self.rooms
            ],
        }

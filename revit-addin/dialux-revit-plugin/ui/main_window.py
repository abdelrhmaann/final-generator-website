"""
Main Application Window for DIALux-to-Revit Fixture Distributor.
"""

import tkinter as tk
from tkinter import ttk, filedialog, messagebox, scrolledtext
from pathlib import Path
import json
import threading
from typing import Optional, Dict, List

from ..core.dialux_parser import DialuxPDFParser, DialuxCSVParser, DialuxXMLParser
from ..core.fixture_extractor import FixtureExtractor
from ..core.room_matcher import RoomMatcher
from ..core.revit_exporter import RevitScriptExporter


class DialuxRevitApp:
    """
    Main application window for the DIALux-to-Revit workflow.
    
    Workflow:
    1. Import DIALux report (PDF, CSV, or XML)
    2. Import Revit room data (JSON exported from Revit)
    3. Configure matching parameters
    4. Match rooms and preview results
    5. Generate Revit placement scripts
    """

    def __init__(self):
        self.root = tk.Tk()
        self.root.title("DIALux to Revit - Fixture Distributor")
        self.root.geometry("1000x750")
        self.root.minsize(800, 600)

        # State
        self._parsed_data: Optional[Dict] = None
        self._revit_rooms: Optional[List[Dict]] = None
        self._fixtures: List = []
        self._room_mappings: List = []
        self._match_result: Optional = None

        # Styles
        self._setup_styles()
        self._build_ui()

    def _setup_styles(self):
        """Configure ttk styles for professional look."""
        style = ttk.Style(self.root)
        style.theme_use("clam")
        
        style.configure("Title.TLabel", font=("Segoe UI", 16, "bold"))
        style.configure("Header.TLabel", font=("Segoe UI", 11, "bold"))
        style.configure("Accent.TButton", font=("Segoe UI", 10))
        style.configure("Success.TLabelframe.Label", foreground="green")
        style.configure("Warning.TLabelframe.Label", foreground="orange")

    def _build_ui(self):
        """Build the complete UI layout."""
        # Main container
        main_frame = ttk.Frame(self.root, padding="10")
        main_frame.grid(row=0, column=0, sticky="nsew")
        self.root.columnconfigure(0, weight=1)
        self.root.rowconfigure(0, weight=1)

        # Title
        title_frame = ttk.Frame(main_frame)
        title_frame.grid(row=0, column=0, columnspan=2, sticky="ew", pady=(0, 10))
        ttk.Label(
            title_frame,
            text="DIALux to Revit Fixture Distributor",
            style="Title.TLabel",
        ).pack(side="left")
        ttk.Label(
            title_frame,
            text="v1.0 | Manus AI",
            style="Header.TLabel",
        ).pack(side="right")

        # Left panel - Input
        left_frame = ttk.Frame(main_frame)
        left_frame.grid(row=1, column=0, sticky="nsew", padx=(0, 5))
        main_frame.columnconfigure(0, weight=1)

        # Right panel - Output
        right_frame = ttk.Frame(main_frame)
        right_frame.grid(row=1, column=1, sticky="nsew", padx=(5, 0))
        main_frame.columnconfigure(1, weight=1)

        # ---- Left Panel ----
        self._build_input_panel(left_frame)

        # ---- Right Panel ----
        self._build_output_panel(right_frame)

        # Status bar
        self.status_var = tk.StringVar(value="Ready")
        status_bar = ttk.Label(
            main_frame, textvariable=self.status_var, relief="sunken", padding=5
        )
        status_bar.grid(row=2, column=0, columnspan=2, sticky="ew", pady=(5, 0))

    def _build_input_panel(self, parent):
        """Build the input configuration panel."""
        # Step 1: DIALux Report
        step1 = ttk.LabelFrame(parent, text="Step 1: Import DIALux Report", padding="8")
        step1.grid(row=0, column=0, sticky="ew", pady=(0, 8))
        parent.columnconfigure(0, weight=1)

        file_frame = ttk.Frame(step1)
        file_frame.grid(row=0, column=0, sticky="ew")

        self.dialux_path_var = tk.StringVar()
        ttk.Entry(file_frame, textvariable=self.dialux_path_var, width=50).pack(
            side="left", fill="x", expand=True, padx=(0, 5)
        )
        ttk.Button(file_frame, text="Browse...", command=self._browse_dialux).pack(
            side="right"
        )

        format_frame = ttk.Frame(step1)
        format_frame.grid(row=1, column=0, sticky="ew", pady=(5, 0))
        ttk.Label(format_frame, text="Format:").pack(side="left")
        self.format_var = tk.StringVar(value="auto")
        ttk.Combobox(
            format_frame,
            textvariable=self.format_var,
            values=["auto", "PDF", "CSV", "XML"],
            state="readonly",
            width=10,
        ).pack(side="left", padx=5)

        ttk.Button(step1, text="Parse Report", command=self._parse_report).grid(
            row=2, column=0, pady=(8, 0), sticky="w"
        )

        # Step 2: Revit Room Data
        step2 = ttk.LabelFrame(parent, text="Step 2: Import Revit Room Data", padding="8")
        step2.grid(row=1, column=0, sticky="ew", pady=(0, 8))

        rev_file_frame = ttk.Frame(step2)
        rev_file_frame.grid(row=0, column=0, sticky="ew")

        self.revit_path_var = tk.StringVar()
        ttk.Entry(rev_file_frame, textvariable=self.revit_path_var, width=50).pack(
            side="left", fill="x", expand=True, padx=(0, 5)
        )
        ttk.Button(rev_file_frame, text="Browse...", command=self._browse_revit).pack(
            side="right"
        )

        ttk.Label(step2, text="(JSON file exported from Revit with room data)").grid(
            row=1, column=0, sticky="w", pady=(5, 0)
        )

        # Step 3: Configuration
        step3 = ttk.LabelFrame(parent, text="Step 3: Matching Configuration", padding="8")
        step3.grid(row=2, column=0, sticky="ew", pady=(0, 8))

        ttk.Label(step3, text="Fuzzy Match Threshold:").grid(row=0, column=0, sticky="w")
        self.fuzzy_var = tk.DoubleVar(value=0.60)
        ttk.Scale(
            step3, from_=0.3, to=0.95, variable=self.fuzzy_var, orient="horizontal"
        ).grid(row=0, column=1, sticky="ew", padx=5)
        self.fuzzy_label = ttk.Label(step3, text="0.60")
        self.fuzzy_label.grid(row=0, column=2)
        self.fuzzy_var.trace("w", lambda *_: self.fuzzy_label.configure(
            text=f"{self.fuzzy_var.get():.2f}"
        ))

        ttk.Label(step3, text="Area Tolerance (%):").grid(row=1, column=0, sticky="w", pady=(5, 0))
        self.area_var = tk.DoubleVar(value=15)
        ttk.Spinbox(
            step3, from_=5, to=50, textvariable=self.area_var, width=8
        ).grid(row=1, column=1, sticky="w", padx=5, pady=(5, 0))

        ttk.Label(step3, text="Mounting Height (m):").grid(row=2, column=0, sticky="w", pady=(5, 0))
        self.height_var = tk.DoubleVar(value=2.5)
        ttk.Spinbox(
            step3, from_=1.0, to=10.0, increment=0.1,
            textvariable=self.height_var, width=8
        ).grid(row=2, column=1, sticky="w", padx=5, pady=(5, 0))

        # Step 4: Match
        step4 = ttk.LabelFrame(parent, text="Step 4: Match & Export", padding="8")
        step4.grid(row=3, column=0, sticky="ew")

        ttk.Button(step4, text="Match Rooms", command=self._match_rooms).grid(
            row=0, column=0, padx=(0, 5), pady=(0, 5), sticky="w"
        )
        ttk.Button(
            step4, text="Generate Scripts", command=self._generate_scripts
        ).grid(row=1, column=0, padx=(0, 5), pady=(0, 5), sticky="w")

    def _build_output_panel(self, parent):
        """Build the output and results panel."""
        # Tabs
        notebook = ttk.Notebook(parent)
        notebook.grid(row=0, column=0, sticky="nsew")
        parent.rowconfigure(0, weight=1)
        parent.columnconfigure(0, weight=1)

        # Tab 1: Parsed Data
        self.parsed_tab = ttk.Frame(notebook, padding="5")
        notebook.add(self.parsed_tab, text="DIALux Data")
        self.parsed_text = scrolledtext.ScrolledText(
            self.parsed_tab, wrap="word", font=("Consolas", 9)
        )
        self.parsed_text.grid(row=0, column=0, sticky="nsew")

        # Tab 2: Match Results
        self.match_tab = ttk.Frame(notebook, padding="5")
        notebook.add(self.match_tab, text="Room Matches")
        
        match_frame = ttk.Frame(self.match_tab)
        match_frame.grid(row=0, column=0, sticky="nsew")
        match_frame.columnconfigure(0, weight=1)
        match_frame.rowconfigure(1, weight=1)

        # Summary labels
        self.match_summary = ttk.Label(match_frame, text="No match results yet")
        self.match_summary.grid(row=0, column=0, sticky="w", pady=(0, 5))

        self.match_tree = ttk.Treeview(
            match_frame,
            columns=("dialux", "revit", "score", "fixtures"),
            show="headings",
            height=15,
        )
        self.match_tree.heading("dialux", text="DIALux Room")
        self.match_tree.heading("revit", text="Revit Room")
        self.match_tree.heading("score", text="Score")
        self.match_tree.heading("fixtures", text="Fixtures")
        self.match_tree.column("dialux", width=200)
        self.match_tree.column("revit", width=200)
        self.match_tree.column("score", width=80)
        self.match_tree.column("fixtures", width=80)

        scrollbar = ttk.Scrollbar(match_frame, orient="vertical", command=self.match_tree.yview)
        self.match_tree.configure(yscrollcommand=scrollbar.set)
        self.match_tree.grid(row=1, column=0, sticky="nsew")
        scrollbar.grid(row=1, column=1, sticky="ns")

        # Tab 3: Fixtures
        self.fixtures_tab = ttk.Frame(notebook, padding="5")
        notebook.add(self.fixtures_tab, text="Fixtures")
        self.fixtures_text = scrolledtext.ScrolledText(
            self.fixtures_tab, wrap="word", font=("Consolas", 9)
        )
        self.fixtures_text.grid(row=0, column=0, sticky="nsew")

        # Tab 4: Log
        self.log_tab = ttk.Frame(notebook, padding="5")
        notebook.add(self.log_tab, text="Log")
        self.log_text = scrolledtext.ScrolledText(
            self.log_tab, wrap="word", font=("Consolas", 9)
        )
        self.log_text.grid(row=0, column=0, sticky="nsew")

    # ---- Event Handlers ----

    def _browse_dialux(self):
        """Open file dialog for DIALux report."""
        path = filedialog.askopenfilename(
            title="Select DIALux Report",
            filetypes=[
                ("All Supported", "*.pdf *.csv *.xml"),
                ("PDF Files", "*.pdf"),
                ("CSV Files", "*.csv"),
                ("XML Files", "*.xml"),
            ],
        )
        if path:
            self.dialux_path_var.set(path)

    def _browse_revit(self):
        """Open file dialog for Revit room data."""
        path = filedialog.askopenfilename(
            title="Select Revit Room Data (JSON)",
            filetypes=[("JSON Files", "*.json"), ("All Files", "*.*")],
        )
        if path:
            self.revit_path_var.set(path)

    def _parse_report(self):
        """Parse the DIALux report file."""
        path = self.dialux_path_var.get()
        if not path:
            messagebox.showwarning("Warning", "Please select a DIALux report file.")
            return

        format_type = self.format_var.get().lower()
        ext = Path(path).suffix.lower()

        try:
            self.status_var.set("Parsing DIALux report...")
            self.root.update_idletasks()

            if format_type == "csv" or (format_type == "auto" and ext == ".csv"):
                parser = DialuxCSVParser()
            elif format_type == "xml" or (format_type == "auto" and ext == ".xml"):
                parser = DialuxXMLParser()
            else:
                parser = DialuxPDFParser()

            self._parsed_data = parser.parse(path)
            self.status_var.set(f"Parsed: {len(self._parsed_data['rooms'])} rooms found")

            # Update parsed data tab
            self.parsed_text.delete("1.0", tk.END)
            self.parsed_text.insert("1.0", json.dumps(self._parsed_data, indent=2))

            # Extract fixtures
            extractor = FixtureExtractor()
            self._fixtures = extractor.extract_from_parsed_data(self._parsed_data)

            # Update fixtures tab
            summary = extractor.get_summary()
            self.fixtures_text.delete("1.0", tk.END)
            self.fixtures_text.insert("1.0", json.dumps(summary, indent=2))
            self.fixtures_text.insert(tk.END, "\n\n--- Fixture Details ---\n\n")
            for f in self._fixtures:
                self.fixtures_text.insert(tk.END,
                    f"  {f.dialux_name} | Qty: {f.quantity} | Type: {f.fixture_type} "
                    f"| Room: {f.room_name} | Conf: {f.confidence:.1%}\n"
                )

            self._log(f"Parsed {len(self._parsed_data['rooms'])} rooms, "
                     f"{len(self._fixtures)} fixture entries extracted")

        except Exception as e:
            messagebox.showerror("Error", f"Failed to parse report:\n{e}")
            self.status_var.set("Error parsing report")

    def _match_rooms(self):
        """Match DIALux rooms to Revit rooms."""
        if not self._parsed_data:
            messagebox.showwarning("Warning", "Please parse a DIALux report first.")
            return

        revit_path = self.revit_path_var.get()
        if not revit_path:
            messagebox.showwarning("Warning", "Please select a Revit room data file.")
            return

        try:
            # Load Revit room data
            with open(revit_path, "r") as f:
                revit_data = json.load(f)
            self._revit_rooms = revit_data.get("rooms", revit_data)

            # Match
            matcher = RoomMatcher(
                fuzzy_threshold=self.fuzzy_var.get(),
                area_tolerance=self.area_var.get() / 100,
            )
            matcher.load_revit_rooms(self._revit_rooms)
            matcher.load_dialux_rooms(self._parsed_data["rooms"])
            self._match_result = matcher.match_rooms()

            # Update UI
            self._update_match_display(matcher)
            self._log(f"Room matching complete: "
                     f"{len(self._match_result.matched)} matched, "
                     f"{len(self._match_result.unmatched_dialux)} unmatched DIALux, "
                     f"{len(self._match_result.unmatched_revit)} unmatched Revit")

        except Exception as e:
            messagebox.showerror("Error", f"Matching failed:\n{e}")

    def _update_match_display(self, matcher: RoomMatcher):
        """Update the match results display."""
        report = matcher.get_match_report(self._match_result)
        summary = report["summary"]

        self.match_summary.configure(
            text=f"Match Rate: {summary['match_rate']} | "
                 f"Matched: {summary['matched_rooms']} | "
                 f"Total Fixtures: {summary['total_fixtures']}"
        )

        # Clear tree
        for item in self.match_tree.get_children():
            self.match_tree.delete(item)

        # Add matches
        for m in self._match_result.matched:
            fixture_count = sum(f.get("quantity", 1) for f in m.fixtures)
            self.match_tree.insert("", "end", values=(
                m.dialux_room_name,
                m.revit_room_name,
                f"{m.match_score:.1%}",
                str(fixture_count),
            ))

    def _generate_scripts(self):
        """Generate Revit placement scripts."""
        if not self._match_result or not self._fixtures:
            messagebox.showwarning("Warning", "Please match rooms first.")
            return

        # Ask for output directory
        out_dir = filedialog.askdirectory(title="Select Output Directory")
        if not out_dir:
            return

        try:
            self.status_var.set("Generating scripts...")
            self.root.update_idletasks()

            exporter = RevitScriptExporter()
            exporter.load_data(
                self._fixture_data_for_export(),
                self._mappings_for_export(),
            )

            # Generate pyRevit script
            py_path = exporter.generate_pyrevit_script(
                str(Path(out_dir) / "dialux_fixture_import.py")
            )
            self._log(f"Generated pyRevit script: {py_path}")

            # Generate Dynamo script
            dyn_path = exporter.generate_dynamo_python(
                str(Path(out_dir) / "dialux_dynamo_node.py")
            )
            self._log(f"Generated Dynamo script: {dyn_path}")

            # Generate C# add-in
            cs_path = exporter.generate_csaddin(
                str(Path(out_dir) / "DialuxFixtureImportCommand.cs")
            )
            self._log(f"Generated C# add-in: {cs_path}")

            # Generate report
            rpt_path = exporter.generate_report(
                str(Path(out_dir) / "placement_report.md")
            )
            self._log(f"Generated report: {rpt_path}")

            self.status_var.set("Scripts generated successfully!")
            messagebox.showinfo(
                "Success",
                f"Generated {len(exporter._generated_scripts)} output files:\n\n"
                + "\n".join(Path(p).name for p in exporter._generated_scripts),
            )

        except Exception as e:
            messagebox.showerror("Error", f"Script generation failed:\n{e}")

    # ---- Helpers ----

    def _fixture_data_for_export(self) -> Dict:
        """Prepare fixture data for export."""
        return {
            "fixtures": [
                {
                    "dialux_name": f.dialux_name,
                    "manufacturer": f.manufacturer,
                    "quantity": f.quantity,
                    "revit_family_name": f.revit_family_name,
                    "fixture_type": f.fixture_type,
                    "room_name": f.room_name,
                    "relative_positions": f.relative_positions,
                }
                for f in self._fixtures
            ],
            "summary": {
                "total_fixtures": len(self._fixtures),
                "total_quantity": sum(f.quantity for f in self._fixtures),
            },
        }

    def _mappings_for_export(self) -> List[Dict]:
        """Prepare room mappings for export."""
        return [
            {
                "dialux_room_name": m.dialux_room_name,
                "revit_room_name": m.revit_room_name,
                "revit_element_id": m.revit_element_id,
                "match_score": m.match_score,
                "fixtures": m.fixtures,
                "room_area": m.room_area,
                "room_center": list(m.room_center),
                "origin": list(m.origin),
            }
            for m in self._match_result.matched
        ]

    def _log(self, message: str):
        """Add a message to the log tab."""
        from datetime import datetime
        timestamp = datetime.now().strftime("%H:%M:%S")
        self.log_text.insert(tk.END, f"[{timestamp}] {message}\n")
        self.log_text.see(tk.END)

    def run(self):
        """Start the application."""
        self.root.mainloop()


if __name__ == "__main__":
    app = DialuxRevitApp()
    app.run()

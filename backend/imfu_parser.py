import pandas as pd
import openpyxl
import io

def parse_imfu_file(file_content, filename):
    """
    Parse an IMFU excel file content bytes.
    Detects the header row dynamically, maps columns to a standard format,
    and returns a list of dictionaries representing the items.
    """
    wb = openpyxl.load_workbook(io.BytesIO(file_content), data_only=True)
    ws = wb[wb.sheetnames[0]]
    
    max_f = 0
    header_row = 1
    for r in range(1, min(25, ws.max_row+1)):
        f = sum(1 for c in range(1, ws.max_column+1) if ws.cell(r, c).value is not None)
        if f > max_f:
            max_f = f
            header_row = r
            
    df = pd.read_excel(io.BytesIO(file_content), sheet_name=0, header=header_row-1)
    
    cols = df.columns
    def get_col(candidates):
        # Pass 1: Exact match (case-insensitive)
        for cand in candidates:
            for c in cols:
                c_str = str(c).lower().replace('\n', ' ').strip()
                if str(cand).lower().strip() == c_str:
                    return c
        # Pass 2: Substring match (case-insensitive)
        for cand in candidates:
            for c in cols:
                c_str = str(c).lower().replace('\n', ' ')
                if str(cand).lower() in c_str:
                    return c
        return None
        
    col_item = get_col(["item / sequence", "sequence", "item #", "n° ph"])
    col_scope = get_col(["scope", "périmètre"])
    col_status = get_col(["overall status", "status", "statut", "état"])
    col_priority = get_col(["complexity / priority", "priority", "complexity", "high/medium/low"])
    col_name = get_col(["name / description", "name", "description", "titre", "task"])
    
    # New columns (Owner, Action Plan, Schedule)
    col_owner = get_col(["responsible / pilote", "responsible", "owner", "responsable", "function", "métier", "pilote"])
    col_action = get_col(["next action", "action"])
    col_issue = get_col(["blocker / issue", "blocker", "issue", "comment", "problème", "remarque"])
    col_date = get_col(["planned end date", "planned date", "target date", "need date", "date cible", "échéance"])
    
    col_progress = get_col(["overall progress", "progress"])
    
    items = []
    
    for idx, row in df.iterrows():
        # Handle cases where name/description is missing
        name_val = str(row.get(col_name)).strip() if col_name and not pd.isna(row.get(col_name)) else ""
        
        # If the description is empty, "nan", or "none", we completely skip the row
        if not name_val or name_val.lower() in ['nan', 'none', '']:
            continue
            
        item_id = str(row.get(col_item)).strip() if col_item and not pd.isna(row.get(col_item)) else f"Row-{idx+header_row}"
        if item_id.lower() in ['nan', 'none', '']:
            item_id = f"Row-{idx+header_row}"
            
        name = name_val
        
        item = {
            "source_file": filename,
            "item_id": item_id,
            "scope": str(row.get(col_scope)) if col_scope and not pd.isna(row.get(col_scope)) else "Unknown",
            "name": name,
            "status": "Not Started",
            "priority": "Medium",
            "owner": str(row.get(col_owner)) if col_owner and not pd.isna(row.get(col_owner)) else "Unassigned",
            "next_action": str(row.get(col_action)) if col_action and not pd.isna(row.get(col_action)) else "-",
            "issue": str(row.get(col_issue)) if col_issue and not pd.isna(row.get(col_issue)) else "-",
            "target_date": ""
        }
        
        # Format date properly if it's a pandas Timestamp
        if col_date and not pd.isna(row.get(col_date)):
            val = row.get(col_date)
            if isinstance(val, pd.Timestamp):
                item["target_date"] = val.strftime('%Y-%m-%d')
            else:
                item["target_date"] = str(val)[:10]
        
        # Clean status (either from string or inferred from progress)
        if col_status and not pd.isna(row.get(col_status)) and str(row.get(col_status)).strip() != "":
            s = str(row.get(col_status)).strip().lower()
            if "ok" in s or "complet" in s or "termin" in s: item["status"] = "Completed"
            elif "progress" in s or "cours" in s: item["status"] = "In Progress"
            elif "risk" in s or "risque" in s: item["status"] = "At Risk"
            elif "block" in s or "bloqu" in s: item["status"] = "Blocked"
            elif "track" in s: item["status"] = "On Track"
            elif "cancel" in s or "annul" in s: item["status"] = "Cancelled"
        elif col_progress and not pd.isna(row.get(col_progress)):
            try:
                prog_val = float(row.get(col_progress))
                if prog_val >= 1.0:
                    item["status"] = "Completed"
                elif prog_val > 0.0:
                    item["status"] = "In Progress"
                else:
                    item["status"] = "Not Started"
            except (ValueError, TypeError):
                pass
            
        # Clean priority
        if col_priority and not pd.isna(row.get(col_priority)):
            p = str(row.get(col_priority)).strip().lower()
            if "high" in p or "haute" in p or "crit" in p: item["priority"] = "High"
            elif "low" in p or "basse" in p: item["priority"] = "Low"
            
        items.append(item)
        
    return items

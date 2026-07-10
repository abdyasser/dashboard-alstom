import os

filepath = 'frontend/src/Dashboard.jsx'
with open(filepath, 'r', encoding='utf-8') as f:
    content = f.read()

replacements = {
    "'Items par statut'": "'Items by status'",
    "'Items par priorité'": "'Items by priority'",
    "'Terminés'": "'Completed'",
    "'En Cours'": "'In Progress'",
    "'Bloqués / Risque'": "'Blocked / At Risk'",
    "Nouvelle analyse": "New Analysis",
    "Consolidé (Portefeuille)": "Consolidated (Portfolio)",
    "<label>Projet</label>": "<label>Project</label>",
    "'Tous les projets'": "'All Projects'",
    "Périmètre (Scope)": "Scope",
    "'Tous les périmètres'": "'All Scopes'",
    "<label>Statut</label>": "<label>Status</label>",
    "'Tous les statuts'": "'All Statuses'",
    "<label>Priorité</label>": "<label>Priority</label>",
    "'Toutes les priorités'": "'All Priorities'",
    "Avancement Global": "Overall Progress",
    "Items Terminés": "Completed Items",
    "Bloqués / À Risque": "Blocked / At Risk",
    "RÉPARTITION PAR STATUT": "STATUS DISTRIBUTION",
    "SANTÉ PAR RESPONSABLE (CHARGE VS BLOCAGE)": "HEALTH BY OWNER (LOAD VS BLOCKED)",
    "RÉPARTITION PAR PRIORITÉ": "PRIORITY DISTRIBUTION",
    "MATRICE PRIORITÉ vs STATUT": "PRIORITY vs STATUS MATRIX",
    "<th>Complétés</th>": "<th>Completed</th>",
    "<th>En Cours</th>": "<th>In Progress</th>",
    "RÉSUMÉ PAR PÉRIMÈTRE (TOP 7)": "SCOPE SUMMARY (TOP 7)",
    "<th>Périmètre</th>": "<th>Scope</th>",
    "<th>Avancement</th>": "<th>Progress</th>",
    "<th>Bloqués</th>": "<th>Blocked</th>",
    "DÉLAIS ET ÉCHÉANCES (ITEMS OUVERTS)": "DEADLINES & TIMELINES (OPEN ITEMS)",
    "BLOCAGES PAR RESPONSABLE": "BLOCKERS BY OWNER",
    "<th>Responsable</th>": "<th>Owner</th>",
    "TOP ITEMS BLOQUÉS OU À RISQUE": "TOP BLOCKED OR AT RISK ITEMS",
    "Problème / Blocker": "Issue / Blocker",
    "Date Cible": "Target Date",
    "'Non renseigné'": "'Not provided'",
    "'Aucune action'": "'No action'",
    "Aucun item bloqué ou à risque.": "No blocked or at risk items.",
    "'En Retard'": "'Overdue'",
    "'Imminent (< 7j)'": "'Due Soon (< 7d)'",
    "'Dans les temps'": "'On Track'",
    "'Sans Date'": "'No Date'",
    "'Items (Non Terminés)'": "'Items (Not Completed)'",
    "'Non Assigné'": "'Unassigned'",
    "<th>Total</th>": "<th>Total</th>"
}

for k, v in replacements.items():
    content = content.replace(k, v)

with open(filepath, 'w', encoding='utf-8') as f:
    f.write(content)

print("Translation applied.")

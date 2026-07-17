#!/usr/bin/env bash
# =============================================================
#  build_linux.sh — Build local de l'app Alstom IMFU Dashboard
#  Usage : ./build_linux.sh
#  Prérequis : Python 3.11+, Node.js 20+, Ubuntu 22.04+
# =============================================================
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
BACKEND_DIR="$SCRIPT_DIR/backend"
FRONTEND_DIR="$SCRIPT_DIR/frontend"

echo "========================================"
echo "  Alstom IMFU Dashboard — Build Linux"
echo "========================================"
echo ""

# ── 1. Vérifier les dépendances système ────────────────────────
echo "📦 [1/5] Vérification des dépendances système..."

MISSING_PKGS=()
for pkg in libwebkit2gtk-4.1-dev libgtk-3-dev libgirepository1.0-dev pkg-config; do
    if ! dpkg -s "$pkg" &>/dev/null; then
        MISSING_PKGS+=("$pkg")
    fi
done

if [ ${#MISSING_PKGS[@]} -ne 0 ]; then
    echo "⚠️  Paquets manquants : ${MISSING_PKGS[*]}"
    echo "   Installation automatique..."
    sudo apt-get update
    sudo apt-get install -y \
        libwebkit2gtk-4.1-dev \
        libgtk-3-dev \
        libayatana-appindicator3-dev \
        gir1.2-webkit2-4.1 \
        gir1.2-ayatanaappindicator3-0.1 \
        libgirepository1.0-dev \
        gobject-introspection \
        pkg-config \
        python3-gi \
        python3-gi-cairo
    echo "✅ Dépendances système installées."
else
    echo "✅ Dépendances système déjà présentes."
fi

# ── 2. Build du Frontend ───────────────────────────────────────
echo ""
echo "🌐 [2/5] Build du frontend React..."
cd "$FRONTEND_DIR"

if [ ! -d "node_modules" ]; then
    npm install
fi

npm run build
echo "✅ Frontend compilé dans frontend/dist/"

# ── 3. Environnement Python ───────────────────────────────────
echo ""
echo "🐍 [3/5] Préparation de l'environnement Python..."
cd "$BACKEND_DIR"

if [ ! -d "venv_linux" ]; then
    python3 -m venv venv_linux
fi

source venv_linux/bin/activate
pip install --upgrade pip -q
pip install -r requirements.txt -q
pip install pyinstaller pygobject -q
echo "✅ Environnement Python prêt."

# ── 4. Build PyInstaller ──────────────────────────────────────
echo ""
echo "🔨 [4/5] Build de l'exécutable avec PyInstaller..."
pyinstaller "Dashboard Alstom Linux.spec" --clean --noconfirm

chmod +x dist/"Dashboard Alstom"
echo "✅ Exécutable créé : backend/dist/Dashboard Alstom"

# ── 5. Packaging ──────────────────────────────────────────────
echo ""
echo "📦 [5/5] Création de l'archive de distribution..."

RELEASE_DIR="$SCRIPT_DIR/release-linux"
rm -rf "$RELEASE_DIR"
mkdir -p "$RELEASE_DIR"

cp dist/"Dashboard Alstom" "$RELEASE_DIR/"
cp alstom.png "$RELEASE_DIR/"

# Créer le fichier .desktop
cat > "$RELEASE_DIR/alstom-imfu-dashboard.desktop" << 'EOF'
[Desktop Entry]
Name=Alstom IMFU Dashboard
Comment=Dashboard de suivi des items IMFU Alstom
Exec=./Dashboard\ Alstom
Icon=alstom
Terminal=false
Type=Application
Categories=Office;Utility;
EOF

# Créer le README
cat > "$RELEASE_DIR/README.txt" << 'READMEEOF'
============================================
  Alstom IMFU Dashboard — Linux Ubuntu
============================================

PRÉREQUIS:
Avant de lancer l'application, installez les dépendances système :

  sudo apt install -y libwebkit2gtk-4.1-0 libgtk-3-0 libayatana-appindicator3-1 gir1.2-webkit2-4.1

LANCEMENT:
  chmod +x "Dashboard Alstom"
  ./"Dashboard Alstom"

INSTALLATION DU RACCOURCI (optionnel):
  cp alstom-imfu-dashboard.desktop ~/.local/share/applications/
  cp alstom.png ~/.local/share/icons/alstom.png

============================================
READMEEOF

cd "$RELEASE_DIR"
tar -czf "$SCRIPT_DIR/Alstom-IMFU-Dashboard-Linux.tar.gz" *

deactivate 2>/dev/null || true

echo ""
echo "========================================"
echo "  ✅ BUILD TERMINÉ AVEC SUCCÈS !"
echo "========================================"
echo ""
echo "  Archive : $SCRIPT_DIR/Alstom-IMFU-Dashboard-Linux.tar.gz"
echo ""
echo "  Pour distribuer à votre collègue :"
echo "    1. Envoyez-lui le fichier .tar.gz"
echo "    2. Il extrait : tar -xzf Alstom-IMFU-Dashboard-Linux.tar.gz"
echo "    3. Il installe les dépendances (voir README.txt)"
echo "    4. Il lance : ./Dashboard\ Alstom"
echo ""

@echo off
TITLE Neural Nexus Master Node
echo ========================================================
echo  NEURAL NEXUS AGI SWARM (Windows Edition)
echo  Met Persistent Memory, WebSockets, & Circadian Manager
echo ========================================================
echo.
echo Installing Node dependencies if missing...
call npm install express ws
echo.
echo Starting Neural Nexus Node Server (incl. WebSockets) on Port 3000...
start cmd /k "node server.js"
echo.
echo Starting QA Agents...
start cmd /k "node omni_qa_agents.js"
echo.
echo Starting Python Agent Dashboard (Poort 5000)...
start cmd /k "python serve_dashboard.py"
echo.
echo Starting Circadian Rhythm Manager...
start cmd /k "python circadian_manager.py"
echo.
echo Alle Neural Nexus subsystemen zijn opgestart!
pause

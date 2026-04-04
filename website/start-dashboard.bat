@echo off
title Command Center - Lokaler Server
cd /d "C:\Users\PC\website_n8n_handwerk"
echo.
echo  Command Center startet...
echo  Browser oeffnet sich gleich automatisch.
echo  Dieses Fenster NICHT schliessen!
echo.
start http://localhost:8000/command-center.html
python server.py
